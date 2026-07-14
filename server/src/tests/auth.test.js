const request = require('supertest');
const app = require('../index');
const db = require('./db');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jest';

beforeAll(async () => await db.connect());
afterEach(async () => await db.clearDatabase());
afterAll(async () => await db.closeDatabase());

describe('Auth API — /api/auth', () => {

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'Archi_Dev',
          email: 'archi@cocode.com',
          password: 'supersecurepassword'
        });

      expect(res.statusCode).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body.email).toBe('archi@cocode.com');
      expect(res.body).not.toHaveProperty('password');
    });

    it('should reject registration with a duplicate email', async () => {
      await request(app).post('/api/auth/register').send({
        username: 'FirstUser',
        email: 'duplicate@cocode.com',
        password: 'password123'
      });

      const res = await request(app).post('/api/auth/register').send({
        username: 'SecondUser',
        email: 'duplicate@cocode.com',
        password: 'differentpassword'
      });

      expect(res.statusCode).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('should reject registration with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'incomplete@cocode.com' });

      expect(res.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await request(app).post('/api/auth/register').send({
        username: 'LoginTestUser',
        email: 'login@cocode.com',
        password: 'correctpassword'
      });
    });

    it('should log in successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@cocode.com', password: 'correctpassword' });

      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.username).toBe('LoginTestUser');
    });

    it('should reject login with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'login@cocode.com', password: 'wrongpassword' });

      expect(res.statusCode).toBe(401);
      expect(res.body.message).toMatch(/invalid/i);
    });

    it('should reject login for a non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'ghost@cocode.com', password: 'whatever' });

      expect(res.statusCode).toBe(401);
    });
  });
});