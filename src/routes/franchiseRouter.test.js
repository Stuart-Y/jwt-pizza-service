const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testFranchiseData;
let authTestFranchiseData;
let franchiseName;
let testStoreData;
let storeName;
let testAdmin;
let adminAuth;
let adminId;



beforeAll(async () => {
    testAdmin = await createAdminUser();
    franchiseName = randomName();
    storeName = randomName();
    const loginRes = await request(app)
    .put('/api/auth').set('Content-Type', 'application/json')
    .send(testAdmin);
    expect(loginRes.status).toBe(200);

    const testFranchise = {name: `${franchiseName}`, admins: [{email: `${testAdmin.email}`}]};

    adminAuth = loginRes.body.token;
    adminId = loginRes.body.user.id
    testAdmin = loginRes.body.user
    delete testAdmin.roles

    const createFranchiseRes = await request(app)
    .post('/api/franchise') 
    .set('Authorization', `Bearer ${adminAuth}`)
    .send(testFranchise);

    expect(createFranchiseRes.status).toBe(200);
    expect(createFranchiseRes.body.name).toBe(franchiseName)
    const franchiseData = createFranchiseRes.body
    delete franchiseData.admins
    

    const testStore = {franchiseId: `${franchiseData.id}`, name: `${storeName}`}
    const createStoreRes = await request(app)
    .post(`/api/franchise/${franchiseData.id}/store`)
    .set('Authorization', `Bearer ${adminAuth}`)
    .send(testStore)

    expect(createStoreRes.status).toBe(200)
    expect(createStoreRes.body.name).toBe(storeName)
    testStoreData = createStoreRes.body
    delete testStoreData.franchiseId
    testFranchiseData = {...franchiseData, stores: [testStoreData]}
    authTestFranchiseData = {...franchiseData, stores: [{...testStoreData, totalRevenue: 0}]}
});

test('getAllFranchises', async () => {
    const francRes = await request(app)
    .get(`/api/franchise`).send();

    expect(francRes.status).toBe(200);
    expect(francRes.body).toContainEqual(testFranchiseData)
});

test('getUserFranchises', async () => {
  const francRes = await request(app)
  .get(`/api/franchise/${adminId}`)
  .set('Authorization', `Bearer ${adminAuth}`)
  .send()

  expect(francRes.status).toBe(200);
  expectedList = {admins: [testAdmin], ...authTestFranchiseData}
  expect(francRes.body).toContainEqual(expectedList)
});

test('deleteStore', async () => {
  const deleteRes = await request(app)
  .delete(`/api/franchise/${testFranchiseData.id}/store/${testStoreData.id}`)
  .set('Authorization', `Bearer ${adminAuth}`)
  expect(deleteRes.status).toBe(200)
  expect(deleteRes.body.message).toBe('store deleted')

  const francRes = await request(app)
  .get(`/api/franchise`).send();

  expect(francRes.status).toBe(200);
  expect(francRes.body).not.toContainEqual(testFranchiseData)
});

test('deleteFranchise', async () => {
  const deleteRes = await request(app)
  .delete(`/api/franchise/${testFranchiseData.id}`)
  .set('Authorization', `Bearer ${adminAuth}`)
  expect(deleteRes.status).toBe(200)
  expect(deleteRes.body.message).toBe('franchise deleted')

  const francRes = await request(app)
  .get(`/api/franchise`).send();

  expect(francRes.status).toBe(200);
  expect(francRes.body).not.toContainEqual(testFranchiseData)
})

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