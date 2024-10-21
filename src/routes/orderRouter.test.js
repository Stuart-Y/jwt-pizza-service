const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');

let testAdmin;
let adminAuth;
let testItem;

beforeAll(async () => {
    testAdmin = await createAdminUser()

    const loginRes = await request(app)
        .put('/api/auth').set('Content-Type', 'application/json')
        .send(testAdmin);

    expect(loginRes.status).toBe(200);

    adminAuth = loginRes.body.token;
    testAdmin = loginRes.body.user

    testItem = {title: randomName(), description: randomName(), image: randomName(), price: Math.random()}
});

test('addMenuItem', async () => {
    const addRes = await request(app)
        .put('/api/order/menu')
        .set('Authorization', `Bearer ${adminAuth}`)
        .send(testItem)

    expect(addRes.status).toBe(200)
    
    expect(addRes.body).toContainEqual({...testItem, id: `${addRes.body.length}`})
});

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