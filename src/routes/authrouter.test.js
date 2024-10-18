const request = require('supertest');
const app = require('../service');

const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
const testUser2 = { name: 'pizza dineer', email: 'reg@test.com', password: 'a' };
const testUserFail = { name: 'pizza diner', email: 'reg@test.com', password: 'b' };
const testUserIncomplete = { name: 'pizza diner', password: 'b' };
let testUserAuthToken;
let testUserAuthToken2;
let testUserId;
let testUserId2;

beforeAll(async () => {
  testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const registerRes = await request(app).post('/api/auth').send(testUser);
  testUserAuthToken = registerRes.body.token;
  testUserId = registerRes.body.user.id
  expectValidJwt(testUserAuthToken);

  const registerRes2 = await request(app).post('/api/auth').send(testUser2);
  testUserAuthToken2 = registerRes2.body.token;
  testUserId2 = registerRes2.body.user.id
});

test('loginCycle', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  const expectedUser = { ...testUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(loginRes.body.user).toMatchObject(expectedUser);

  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`).send();
  expect(logoutRes.status).toBe(200);
  expect(logoutRes.body.message).toBe('logout successful');
});

test('badLogin', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUserFail);
  expect(loginRes.status).toBe(404);
});

test('incompleteLogin', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUserIncomplete);
  expect(loginRes.status).toBe(500);
});

test('badLogout', async () => {
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${testUserAuthToken}`).send();
  expect(logoutRes.status).toBe(401)
  expect(logoutRes.body.message).toBe('unauthorized')
});

/* tryintg to trip the null user catch on line 52
test('falseToken', async () => {
  const falseToken = jwt.sign('pizza dinner', config.jwtSecret);
  const logoutRes = await request(app).delete('/api/auth').set('Authorization', `Bearer ${falseToken}`).send();
})*/

test('incompleteRegister', async () => {
  const registerRes = await request(app).post('/api/auth').send(testUserIncomplete);
  expect(registerRes.status).toBe(400);
  expect(registerRes.body.message).toBe('name, email, and password are required');
});

test('updateUser', async () => {
  const loginRes = await request(app).put('/api/auth').send(testUser2);
  expect(loginRes.status).toBe(200);
  expectValidJwt(loginRes.body.token);

  testUser2.email = Math.random().toString(36).substring(2, 12) + '@test.com';
  const modTestUser = testUser2;
  delete modTestUser.name;
  const updateRes = await request(app).put(`/api/auth/${testUserId2}`).set('Authorization', `Bearer ${testUserAuthToken2}`).send(modTestUser)
  
  expect(updateRes.status).toBe(200)

  const expectedUser = { ...modTestUser, roles: [{ role: 'diner' }] };
  delete expectedUser.password;
  expect(updateRes.body).toMatchObject(expectedUser);

  const updateResNoAuth = await request(app).put(`/api/auth/${testUserId}`).set('Authorization', `Bearer ${testUserAuthToken2}`).send(modTestUser)
  expect(updateResNoAuth.status).toBe(403)
  expect(updateResNoAuth.body.message).toBe('unauthorized')
});

function expectValidJwt(potentialJwt) {
  expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
}