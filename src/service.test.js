const request = require('supertest');
const app = require('./service');

test('default get', async () => {
    const getRes = await request(app).get('/').send()

    expect(getRes.status).toBe(200)
    expect(getRes.body.message).toBe('welcome to JWT Pizza')
});

test('invalidWebAddress', async () =>{
    const badRes = await request(app).get(`/${Math.random().toString(36).substring(2, 12)}`)

    expect(badRes.status).toBe(404)
});