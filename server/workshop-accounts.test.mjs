import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { readWorkshopConfig, WorkshopAccounts } from './workshop-accounts.mjs';

const VALID_ENV = {
  WORKSHOP_CODE: 'workshop-test-code',
  WORKSHOP_ENCRYPTION_KEY: Buffer.alloc(32, 5).toString('base64'),
  WORKSHOP_CLOSES_AT: '2026-11-18T00:00:00Z',
  ENEO_API_KEY: 'test-key-not-a-real-credential',
  ENEO_API_KEY_HEADER: 'X-API-Key',
  ENEO_ROLE_ID: '11111111-1111-4111-8111-111111111111',
};
const START = Date.parse('2026-11-17T12:00:00Z');
const claim = requestId => ({ code: VALID_ENV.WORKSHOP_CODE, requestId });

function fixture(t, { request, maxAccounts = 150 } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'eneo-meeting-accounts-'));
  const config = readWorkshopConfig({ ...VALID_ENV, WORKSHOP_DATABASE_PATH: join(directory, 'accounts.sqlite'), WORKSHOP_MAX_ACCOUNTS: String(maxAccounts) });
  const calls = [];
  let clock = START;
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (request) return request(url, options);
    return Response.json({ id: randomUUID(), email: JSON.parse(options.body).email }, { status: 201 });
  };
  let accounts = new WorkshopAccounts(config, { fetch, now: () => clock });
  t.after(() => { accounts.close(); rmSync(directory, { recursive: true, force: true }); });
  return {
    config, calls,
    get accounts() { return accounts; },
    setTime(value) { clock = value; },
    reopen() { accounts.close(); accounts = new WorkshopAccounts(config, { fetch, now: () => clock }); },
    inspect(callback) {
      const database = new DatabaseSync(config.databasePath);
      try { return callback(database); } finally { database.close(); }
    },
  };
}

test('absent configuration disables signup; partial or unsafe configuration fails startup', () => {
  assert.equal(readWorkshopConfig({}), null);
  assert.throws(() => readWorkshopConfig({ WORKSHOP_CODE: 'abcdefgh' }), /Missing workshop configuration/);
  assert.throws(() => readWorkshopConfig({ ...VALID_ENV, WORKSHOP_ENCRYPTION_KEY: 'invalid' }), /32-byte key/);
  assert.throws(() => readWorkshopConfig({ ...VALID_ENV, ENEO_BASE_URL: 'https://another.example' }), /workshop Eneo origin/);
  assert.throws(() => readWorkshopConfig({ ...VALID_ENV, WORKSHOP_MAX_ACCOUNTS: '10000' }), /integer from 1 to 1000/);
});

test('one request provisions exactly one account with the fixed role and server-side key', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId), '127.0.0.1');
  assert.deepEqual(await f.accounts.claim(claim(requestId), '127.0.0.1'), result);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].url, 'https://eneo-modules.sundsvall.dev/api/v1/admin/users/');
  assert.equal(f.calls[0].options.headers['X-API-Key'], VALID_ENV.ENEO_API_KEY);
  assert.equal(f.calls[0].options.redirect, 'error');
  const sent = JSON.parse(f.calls[0].options.body);
  assert.deepEqual(sent.roles, [{ id: VALID_ENV.ENEO_ROLE_ID }]);
  assert.equal(sent.quota_limit, 50_000_000);
  assert.equal(sent.email, result.email);
  assert.match(result.email, /^traff-[0-9a-f]{16}@test\.eneo-modules\.sundsvall\.dev$/);
  assert.ok(result.password.length >= 24 && result.password.length <= 72);
  assert.equal(result.loginUrl, 'https://eneo-modules.sundsvall.dev/login');
  assert.deepEqual(Object.keys(result).sort(), ['email', 'loginUrl', 'password']);
});

test('credentials survive restart and are encrypted in SQLite', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId), '127.0.0.1');
  const encrypted = f.inspect(db => db.prepare('SELECT credentials FROM accounts').get().credentials);
  assert.ok(!encrypted.includes(result.password));
  assert.ok(!encrypted.includes(result.email));
  f.reopen();
  assert.deepEqual(await f.accounts.claim(claim(requestId), '127.0.0.1'), result);
  assert.equal(f.calls.length, 1);
  assert.ok(!readFileSync(f.config.databasePath).includes(Buffer.from(result.password)));
});

test('wrong code never creates a reservation and is rate limited without blocking a valid participant', async t => {
  const f = fixture(t);
  for (let attempt = 0; attempt < 10; attempt++) {
    await assert.rejects(f.accounts.claim({ code: 'wrong', requestId: randomUUID() }, 'shared-nat'), { status: 403 });
  }
  await assert.rejects(f.accounts.claim({ code: 'wrong', requestId: randomUUID() }, 'shared-nat'), error => error.status === 429 && error.retryAfter > 0);
  assert.equal(f.calls.length, 0);
  await f.accounts.claim(claim(randomUUID()), 'shared-nat');
  assert.equal(f.calls.length, 1);
  f.setTime(START + 15 * 60 * 1000 + 1);
  await assert.rejects(f.accounts.claim({ code: 'wrong', requestId: randomUUID() }, 'shared-nat'), { status: 403 });
});

test('changing the persistent credential encryption key fails explicitly at startup', t => {
  const f = fixture(t);
  assert.throws(() => new WorkshopAccounts({ ...f.config, encryptionKey: Buffer.alloc(32, 9) }), /differs from the persistent database key/);
});

test('created credentials cannot be recovered with the wrong code', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  await f.accounts.claim(claim(requestId), '127.0.0.1');
  await assert.rejects(f.accounts.claim({ code: 'wrong', requestId }, '127.0.0.1'), { status: 403 });
  assert.equal(f.calls.length, 1);
});

test('the global limit blocks new reservations but preserves existing credentials', async t => {
  const f = fixture(t, { maxAccounts: 1 });
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId), '127.0.0.1');
  await assert.rejects(f.accounts.claim(claim(randomUUID()), 'another-client'), { status: 409 });
  assert.deepEqual(await f.accounts.claim(claim(requestId), '127.0.0.1'), result);
  assert.equal(f.calls.length, 1);
});

test('signup closes at the deadline while existing credentials remain recoverable', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId), '127.0.0.1');
  f.setTime(f.config.closesAt);
  assert.equal(f.accounts.status().enabled, false);
  await assert.rejects(f.accounts.claim(claim(randomUUID()), '127.0.0.1'), { status: 403 });
  assert.deepEqual(await f.accounts.claim(claim(requestId), '127.0.0.1'), result);
});

test('a concurrent retry waits instead of creating a second upstream account', async t => {
  let finish;
  const response = new Promise(resolve => { finish = resolve; });
  const f = fixture(t, { request: () => response });
  const requestId = randomUUID();
  const first = f.accounts.claim(claim(requestId), '127.0.0.1');
  await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 409 });
  const sent = JSON.parse(f.calls[0].options.body);
  finish(Response.json({ id: randomUUID(), email: sent.email }, { status: 201 }));
  await first;
  assert.equal(f.calls.length, 1);
});

for (const [name, request] of [
  ['timeout', () => { throw new DOMException('Timeout', 'TimeoutError'); }],
  ['server failure', () => new Response('upstream private failure', { status: 503 })],
  ['malformed success', () => Response.json({ wrong: true }, { status: 201 })],
]) {
  test(`${name} reserves the slot as uncertain and never retries creation automatically`, async t => {
    const f = fixture(t, { request });
    const requestId = randomUUID();
    await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 502 });
    await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 409 });
    f.reopen();
    await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 409 });
    assert.equal(f.calls.length, 1);
    assert.equal(f.inspect(db => db.prepare('SELECT state FROM accounts').get().state), 'uncertain');
  });
}

test('a process interruption becomes uncertain on restart rather than issuing a second request', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  await f.accounts.claim(claim(requestId), '127.0.0.1');
  f.inspect(db => db.prepare("UPDATE accounts SET state='pending' WHERE request_id=?").run(requestId));
  f.reopen();
  await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 409 });
  assert.equal(f.calls.length, 1);
});

test('definite Eneo refusal is terminal and its response body is not disclosed', async t => {
  const f = fixture(t, { request: () => new Response('private diagnostic secret', { status: 403 }) });
  const requestId = randomUUID();
  await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), error => error.status === 502 && !error.message.includes('private diagnostic'));
  await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 502 });
  assert.equal(f.calls.length, 1);
  assert.equal(f.inspect(db => db.prepare('SELECT state FROM accounts').get().state), 'failed');
});

test('invalid request IDs are rejected before contacting Eneo', async t => {
  const f = fixture(t);
  await assert.rejects(f.accounts.claim(claim('../../secret'), '127.0.0.1'), { status: 400 });
  assert.equal(f.calls.length, 0);
});
