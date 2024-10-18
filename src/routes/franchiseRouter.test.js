const request = require('supertest');
const app = require('../service');
const { Role, DB } = require('../database/database.js');
const { login } = require('lint/utils/user.js');

let testFranchise
let testAdmin;
let adminName;
let adminEmail;
let adminAuth;
let adminId;
let franchiseId;

beforeAll(async () => {
    testAdmin = createAdminUser()
    const loginReq = {email: `${adminEmail}`, password: `${testAdmin.password}`} 
    const loginRes = await request(app).put('/api/auth').send(testAdmin);
    expect(loginRes.status).toBe(200);
    testFranchise = {name: "pizzaPocket", admins: [{email: `${adminEmail}`}]};
    adminAuth = loginRes.body.token;
    adminId = loginRes.body.id;
    const createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuth}`)
    .send(testFranchise);

    expect(createFranchiseRes.status).toBe(200);
    franchiseId = createFranchiseRes.body.id
});

test('getUserFranchises', async () => {
    const userFrancRes = await request(app)
    .get(`/api/franchise/${adminId}`)
    .set('Authorization', `Bearer ${adminAuth}`)
    .send();

    expect(userFrancRes.status).toBe(200);
});

async function createAdminUser() {
    let user = { password: 'toomanysecrets', roles: [{ role: Role.Admin }] };
    user.name = randomName();
    user.email = user.name + '@admin.com';
    adminEmail = user.email 

    user = await DB.addUser(user);
    return { ...user, password: 'toomanysecrets' };
  }

  function randomName() {
    return Math.random().toString(36).substring(2, 12);
  }