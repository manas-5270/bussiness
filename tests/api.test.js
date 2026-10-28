const test = require('node:test');
const assert = require('node:assert');
const request = require('supertest');
const { connectDB, disconnectDB } = require('../config/db');
const { seedDatabase } = require('../utils/seeder');
const app = require('../index');

let authToken = '';

test.before(async () => {
  await connectDB();
  await seedDatabase(false);
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@nexora.com', password: 'Admin@123' });
  authToken = res.body.token;
});

test.after(async () => {
  await disconnectDB();
});

test('GET /api/health should return 200 and healthy status', async () => {
  const res = await request(app).get('/api/health');
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.status, 'healthy');
});

test('POST /api/auth/login with invalid password should fail with 401', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@nexora.com', password: 'wrongpassword' });
  assert.strictEqual(res.statusCode, 401);
  assert.strictEqual(res.body.success, false);
});

test('POST /api/auth/login with valid admin credentials should return JWT token', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@nexora.com', password: 'Admin@123' });
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.token);
  assert.strictEqual(res.body.user.role, 'Admin');
  authToken = res.body.token;
});

test('GET /api/dashboard/summary with valid token should return metrics', async () => {
  const res = await request(app)
    .get('/api/dashboard/summary')
    .set('Authorization', `Bearer ${authToken}`);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(res.body.summary);
  assert.ok(typeof res.body.summary.totalBudget === 'number');
  assert.ok(typeof res.body.summary.totalExpenses === 'number');
});

test('GET /api/budgets should return enriched budgets list', async () => {
  const res = await request(app)
    .get('/api/budgets')
    .set('Authorization', `Bearer ${authToken}`);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.budgets));
});

test('GET /api/transactions should return paginated transactions and summary', async () => {
  const res = await request(app)
    .get('/api/transactions?limit=5')
    .set('Authorization', `Bearer ${authToken}`);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.transactions));
  assert.ok(res.body.summary);
});

test('GET /api/optimization/recommendations should return pending optimization insights', async () => {
  const res = await request(app)
    .get('/api/optimization/recommendations')
    .set('Authorization', `Bearer ${authToken}`);
  assert.strictEqual(res.statusCode, 200);
  assert.strictEqual(res.body.success, true);
  assert.ok(Array.isArray(res.body.recommendations));
  assert.ok(res.body.summary);
});
