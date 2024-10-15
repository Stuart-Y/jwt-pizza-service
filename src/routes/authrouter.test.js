const request = require('supertest');
const app = require('../service');
//const { logout } = require('lint/utils/user');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const testUserIncomplete = { name: 'pizza diner', password: 'a' };
const testUserFail = { name: 'pizza diner', email: 'reg@test.com', password: 'b' };
let testUserAuthToken;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  expect(testUserAuthToken).toBeDefined()
});

test('login', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.body.token).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);

  const { password, ...user } = { ...testUser, roles: [{ role: 'diner' }] };
  expect(loginRes.body.user).toMatchObject(user);
  expect(password).toBeDefined()
  const logoutRequest = {...testUser, headers: [{ Authorization: loginRes.body.token}]}
  const logoutRes = await request(app).delete('/api/auth').send(logoutRequest);
  expect(logoutRes.body.message).toBe('logout successful')
  expect(logoutRes.status).toBe(200);
});

test('loginFail', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUserFail);
  expect(loginRes.status).not.toBe(200);
});

test('loginIncomlpete', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUserIncomplete);
  expect(loginRes.status).not.toBe(400);
});

test('authToken', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expect(loginRes.user.id).toBeDefined();
  const updateRes = await request(app).put('/api/auth/'.concat(loginRes.user.id)).send(testUser)
  expect(updateRes.status).toBe(200)
});

/*function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}*/