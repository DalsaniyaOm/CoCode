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

  describe('PUT /api/workspace/:roomId/files/:fileId', () => {
    it('should update the code content of a specific file in the workspace', async () => {
      const getRes = await request(app)
        .get(`/api/workspace/${testRoomId}/files`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.statusCode).toEqual(200);
      const targetFileId = getRes.body.files[0].fileId;
      const updatedCode = '// This is the new multi-file test content';

      const updateRes = await request(app)
        .put(`/api/workspace/${testRoomId}/files/${targetFileId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ content: updatedCode });

      expect(updateRes.statusCode).toEqual(200);
      expect(updateRes.body.file).toHaveProperty('content', updatedCode);
    });

    it('should fetch the updated file content correctly after a PUT request', async () => {
      const getRes = await request(app)
        .get(`/api/workspace/${testRoomId}/files`)
        .set('Authorization', `Bearer ${token}`);

      expect(getRes.statusCode).toEqual(200);
      expect(getRes.body.files[0]).toHaveProperty('content', '// This is the new multi-file test content');
    });
  });
});