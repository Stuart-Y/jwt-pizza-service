const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let franchiseData;
let storeData;
let testAdmin;
let adminAuth;
let testUserAuth;
let testUser;



beforeAll(async () => {
    testUser = await createUser()
    testUserAuth = testUser.token

    testAdmin = await createAdminUser();

    const loginRes = await request(app).put('/api/auth').set('Content-Type', 'application/json').send(testAdmin);

    expect(loginRes.status).toBe(200);

    adminAuth = loginRes.body.token;
    testAdmin = loginRes.body.user
    delete testAdmin.roles

    const data = await createFranchise(testAdmin, adminAuth)

    storeData = data[1]
    franchiseData = {...data[0], stores: [data[1]]}
});

test('createFranchiseUnauthorized', async () => {
  const testFranchise = {name: randomName(), admins: [{email: `${testUser.email}`}]};

  const createFranchiseRes = await request(app)
  .post('/api/franchise') 
  .set('Authorization', `Bearer ${testUserAuth}`)
  .send(testFranchise);

  expect(createFranchiseRes.status).toBe(403)
});

test('createFranchiseBadEmail', async () => {
  const testFranchise = {name: randomName(), admins: [{email: randomName()}]};
  const createFranchiseRes = await request(app)
  .post('/api/franchise') 
  .set('Authorization', `Bearer ${adminAuth}`)
  .send(testFranchise);

  expect(createFranchiseRes.status).toBe(404)
})

test('createStoreUnnauthorized', async () => {
  const testStore = {franchiseId: `${franchiseData.id}`, name: randomName()}
  const createStoreRes = await request(app)
  .post(`/api/franchise/${franchiseData.id}/store`)
  .set('Authorization', `Bearer ${testUserAuth}`)
  .send(testStore)

  expect(createStoreRes.status).toBe(403)
})

test('getAllFranchises', async () => {
    const francRes = await request(app)
    .get(`/api/franchise`).send();

    const expectedData = franchiseData
    delete expectedData.stores[0].franchiseId
    delete expectedData.admins
    expect(francRes.status).toBe(200);
    expect(francRes.body).toContainEqual(expectedData)
});

test('getUserFranchises', async () => {
  const authTestFranchiseData = {...franchiseData, stores: [{...storeData, totalRevenue: 0}]}
  const francRes = await request(app)
  .get(`/api/franchise/${testAdmin.id}`)
  .set('Authorization', `Bearer ${adminAuth}`)
  .send()

  expect(francRes.status).toBe(200);
  const expectedList = {admins: [testAdmin], ...authTestFranchiseData}
  expect(francRes.body).toContainEqual(expectedList)
});

test('getUserFranchiseNotExist', async () =>{
  const admin = await createAdminUser()
  const loginRes = await request(app).put('/api/auth').set('Content-Type', 'application/json').send(admin);
  expect(loginRes.status).toBe(200)

  const franchiseRes = await request(app)
  .get(`/api/franchise/${loginRes.body.id}`)
  .set('Authorization', `Bearer ${loginRes.body.token}`)
  .send()

  expect(franchiseRes.status).toBe(200)
  expect(franchiseRes.body.length).toBe(0)
});

test('getUserFranchisesUnauthorized', async () => {
  const francRes = await request(app)
  .get(`/api/franchise/${testAdmin.id}`)
  .set('Authorization', `Bearer ${testUserAuth}`)
  .send()

  expect(francRes.status).toBe(200);
  expect(francRes.body.length).toBe(0)
});

test('deleteStore', async () => {
  const deleteResFail = await request(app)
  .delete(`/api/franchise/${franchiseData.id}/store/${storeData.id}`)
  .set('Authorization', `Bearer ${testUserAuth}`)
  expect(deleteResFail.status).toBe(403)

  const deleteRes = await request(app)
  .delete(`/api/franchise/${franchiseData.id}/store/${storeData.id}`)
  .set('Authorization', `Bearer ${adminAuth}`)
  expect(deleteRes.status).toBe(200)
  expect(deleteRes.body.message).toBe('store deleted')

  const francRes = await request(app)
  .get(`/api/franchise`).send();

  expect(francRes.status).toBe(200);
  expect(francRes.body).not.toContainEqual(franchiseData)
});

test('deleteFranchise', async () => {
  const deleteResFail = await request(app)
  .delete(`/api/franchise/${franchiseData.id}`)
  .set('Authorization', `Bearer ${testUserAuth}`)
  .send()
  expect(deleteResFail.status).toBe(403)

  const deleteRes = await request(app)
  .delete(`/api/franchise/${franchiseData.id}`)
  .set('Authorization', `Bearer ${adminAuth}`)
  .send()
  expect(deleteRes.status).toBe(200)
  expect(deleteRes.body.message).toBe('franchise deleted')

  const francRes = await request(app)
  .get(`/api/franchise`).send();

  expect(francRes.status).toBe(200);
  expect(francRes.body).not.toContainEqual(franchiseData)
})

test('addAdminToFranchise', async () => {
  const data = await createFranchise(testAdmin, adminAuth)
  const franchise = data[0]
  const testUser = {name: randomName(), email: randomName(), password: randomName(), 
    roles: [{role: Role.Franchisee, object: `${franchise.name}`}, {role: Role.Admin}]}

  const user = await DB.addUser(testUser);
  delete testUser.password
  expect(user).toMatchObject(/{...testUser, id: ".*"}/)
});

test('addAdminToFranchiseNotExist', async () => {
  const testUser = {name: randomName(), email: randomName(), password: randomName(), 
    roles: [{role: Role.Franchisee, object: 'a'}, {role: Role.Admin}]}

    await expect(async () => {
      await DB.addUser(testUser);
    }).rejects.toThrow();
});

test('deleteFranchiseDropped', async () => {
  DB.query = jest.fn(() => {})
  const deleteResFail = await request(app)
  .delete(`/api/franchise/${franchiseData.id}`)
  .set('Authorization', `Bearer ${testUserAuth}`)
  .send()
  expect(deleteResFail.status).toBe(500)
})

async function createFranchise(admin, auth) {
  const franchise =  {name: randomName(), admins: [{email: `${admin.email}`}]};
  const createFranchiseRes = await request(app)
  .post('/api/franchise') 
  .set('Authorization', `Bearer ${auth}`)
  .send(franchise);

  expect(createFranchiseRes.status).toBe(200);
  expect(createFranchiseRes.body.name).toBe(franchise.name)

  const data = createFranchiseRes.body

  const firstStore = await createStore(data.id, auth)

  return [data, firstStore]
};

async function createStore(franchiseId, auth) {
  const store = {franchiseId: `${franchiseId}`, name: randomName()}

  const createStoreRes = await request(app)
  .post(`/api/franchise/${franchiseId}/store`)
  .set('Authorization', `Bearer ${auth}`)
  .send(store)

  expect(createStoreRes.status).toBe(200)
  expect(createStoreRes.body.name).toBe(store.name)
  return createStoreRes.body
};

async function createUser () {
  const user = { name: randomName(), email: randomName(), password: randomName() };
  user.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(user);
  expect(registerRes.status).toBe(200)
  const loginRes = await request(app).put('/api/auth').set('Content-Type', 'application/json').send(user);
  expect(loginRes.status).toBe(200)
  return loginRes.body
}

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }

function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }