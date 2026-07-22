const request = require('supertest');
const app = require('../index');
const db = require('./db');

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

jest.mock('../middleware/auth', () => ({
  protect: (req, res, next) => {
    // Inject a fake user object so the backend thinks we are logged in
    req.user = { 
        userId: '112233445566778899aabbcc',
        username: 'TestUser' 
    };
    next();
  }
}));

describe('Workspace API Integration Tests', () => {
  const testRoomId = 'test-team-alpha';

  describe('GET /api/workspace/:roomId', () => {
    it('should return a 404 if the workspace does not exist', async () => {
      const res = await request(app).get(`/api/workspace/${testRoomId}`);

      expect(res.statusCode).toEqual(404);
      expect(res.body).toHaveProperty('message', 'Workspace does not exist');
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