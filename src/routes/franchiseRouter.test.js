const request = require('supertest');
const app = require('../service');

const testFranchise = {"name": "pizzaPocket", "admins": [{"email": "a@jwt.com"}]};
const testAdmin = { name: '常用名字', email: 'a@jwt.com', password: 'admin' };
let adminAuth;
let adminId;
let franchiseId;

beforeAll(async () => {
    const loginRes = await request(app).put('/api/auth').send(testAdmin);
    adminAuth = loginRes.body.token;
    adminId = loginRes.body.id;
    const createFranchiseRes = await request(app)
    .post('/api/franchise')
    .set('Authorization', `Bearer ${adminAuth}`)
    .set('Content-Type', 'application/json')
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