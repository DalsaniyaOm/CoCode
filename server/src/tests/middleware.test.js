const request = require('supertest');
const express = require('express');
const jwt = require('jsonwebtoken');
const { protect } = require('../middleware/auth');

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret_key_for_jest';

const testApp = express();
testApp.use(express.json());
testApp.get('/protected-ping', protect, (req, res) => {
  res.status(200).json({ message: 'Access granted', userId: req.user.id });
});

describe('JWT Middleware — protect()', () => {
  it('should block requests with no token', async () => {
    const res = await request(testApp).get('/protected-ping');
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/no token/i);
  });

  it('should block requests with an invalid/garbage token', async () => {
    const res = await request(testApp)
      .get('/protected-ping')
      .set('Authorization', 'Bearer garbage.invalid.token');

    expect(res.statusCode).toBe(401);
    expect(res.body.message).toMatch(/failed|expired/i);
  });

  it('should allow access with a valid token', async () => {
    const validToken = jwt.sign({ id: 'fake-user-id-123' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(testApp)
      .get('/protected-ping')
      .set('Authorization', `Bearer ${validToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.userId).toBe('fake-user-id-123');
  });

  it('should block requests with an expired token', async () => {
    const expiredToken = jwt.sign({ id: 'fake-user-id-123' }, process.env.JWT_SECRET, { expiresIn: '-10s' });

    const res = await request(testApp)
      .get('/protected-ping')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(401);
  });
});