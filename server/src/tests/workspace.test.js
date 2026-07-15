const request = require('supertest');
const app = require('../index');
const db = require('./db');

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

describe('Workspace API Integration Tests', () => {
  const testRoomId = 'test-team-alpha';

  describe('GET /api/workspace/:roomId', () => {
    it('should create and return a new workspace if it does not exist', async () => {
      const res = await request(app).get(`/api/workspace/${testRoomId}`);

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('roomId', testRoomId);
      expect(res.body).toHaveProperty('content');
      
      expect(res.body.content).toContain('Welcome to CoCode');
    });
  });

  describe('PUT /api/workspace/:roomId', () => {
    it('should update the code content of a specific workspace', async () => {
      const updatedCode = 'function sayHello() { console.log("Hello from tests!"); }';

      const res = await request(app)
        .put(`/api/workspace/${testRoomId}`)
        .send({ content: updatedCode });

      expect(res.statusCode).toEqual(200);
      expect(res.body).toHaveProperty('roomId', testRoomId);
      expect(res.body).toHaveProperty('content', updatedCode);
    });

    it('should fetch the updated code correctly after a PUT request', async () => {
      const myCode = 'const isAwesome = true;';

      await request(app)
        .put(`/api/workspace/${testRoomId}`)
        .send({ content: myCode });

      const fetchRes = await request(app).get(`/api/workspace/${testRoomId}`);

      expect(fetchRes.statusCode).toEqual(200);
      expect(fetchRes.body).toHaveProperty('content', myCode);
    });
  });
});