const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
let testAdmin;
let adminAuth;
let testItem;
let testItem2;
let testFranchise;
let testStore;
let testUserAuthToken;
let orderTestItem;
let testOrder;

beforeAll(async () => {
    testAdmin = await createAdminUser()

    testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    const registerRes = await request(app).post('/api/auth').send(testUser);
    testUserAuthToken = registerRes.body.token;

    const loginRes = await request(app)
        .put('/api/auth').set('Content-Type', 'application/json')
        .send(testAdmin);

    expect(loginRes.status).toBe(200);

    adminAuth = loginRes.body.token;
    testAdmin = loginRes.body.user

    testItem = {title: randomName(), description: randomName(), image: randomName(), price: Math.trunc(Math.random()*100)}
    testItem2 = {title: randomName(), description: randomName(), image: randomName(), price: Math.trunc(Math.random()*100)}
    orderTestItem = {title: randomName(), description: randomName(), image: randomName(), price: Math.trunc(Math.random()*100)}
    const addRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${adminAuth}`)
    .send(orderTestItem)
    expect(addRes.status).toBe(200)
    orderTestItem = {...testItem, menuId: addRes.body.length}
    delete orderTestItem.title
    delete orderTestItem.image

    await createFranchise()
});

test('addMenuItem', async () => {
    const addRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminAuth}`)
        .send(testItem)

    expect(addRes.status).toBe(200)
    testItem = {...testItem, id: addRes.body.length}
    expect(addRes.body).toContainEqual({...testItem, id: addRes.body.length}) 
});

test('addMenUnauthorized', async () => {
    const addRes = await request(app)
    .put('/api/order/menu')
    .set('Authorization', `Bearer ${testUserAuthToken}`)
    .send(testItem2)

    expect(addRes.status).toBe(403)
})

test('getMenuItem', async () => {
    const menuRes = await request(app)
    .get('/api/order/menu')
    .send()

    expect(menuRes.status).toBe(200)
    expect(menuRes.body).toContainEqual(testItem)
});

test('orderEndpoints', async () => {
    testOrder = {franchiseId: `${testFranchise.id}`, storeId: `${testStore.id}`, items: [{...orderTestItem}] }
    const createRes = await request(app)
    .post('/api/order')
    .set('Authorization', `Bearer ${adminAuth}`)
    .send(testOrder)

    expect(createRes.status).toBe(200)
    expect(createRes.body.order.items).toContainEqual(orderTestItem)

    const ordersRes = await request(app)
    .get('/api/order')
    .set('Authorization', `Bearer ${adminAuth}`)
    .send()

    const expectedOrder = createRes.body.order.items
    delete expectedOrder.jwt

    expect(ordersRes.status).toBe(200)
    expect(ordersRes.body.orders[0].items[0]).toMatchObject(/{...expectedOrder, "id": ".*"}/)
});


async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';

    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }

async function createFranchise() {
    const testF = {name: `${randomName()}`, admins: [{email: `${testAdmin.email}`}]};

    const createFranchiseRes = await request(app)
    .post('/api/franchise') 
    .set('Authorization', `Bearer ${adminAuth}`)
    .send(testF);

    const franchiseData = createFranchiseRes.body
    delete franchiseData.admins

    const testS = {franchiseId: `${franchiseData.id}`, name: `${randomName()}`}
    const createStoreRes = await request(app)
    .post(`/api/franchise/${franchiseData.id}/store`)
    .set('Authorization', `Bearer ${adminAuth}`)
    .send(testS)

    const testStoreData = createStoreRes.body
    delete testStoreData.franchiseId

    testFranchise = franchiseData
    testStore = testStoreData
};


function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }