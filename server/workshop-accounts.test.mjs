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
const claim = (requestId, email = `participant-${requestId}@example.net`) => ({ code: VALID_ENV.WORKSHOP_CODE, requestId, email });

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
  assert.equal(result.email, claim(requestId).email);
  assert.match(sent.username, /^traff-[0-9a-f]{16}$/);
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

test('a definite Eneo refusal permits an explicit corrected-email retry without disclosing its body', async t => {
  let attempts = 0;
  const f = fixture(t, { request: (url, options) => ++attempts === 1
    ? new Response('private diagnostic secret', { status: 403 })
    : Response.json({ id: randomUUID(), email: JSON.parse(options.body).email }, { status: 201 }) });
  const requestId = randomUUID();
  await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), error => error.status === 502 && !error.message.includes('private diagnostic'));
  assert.equal(f.inspect(db => db.prepare('SELECT state FROM accounts').get().state), 'failed');
  const corrected = await f.accounts.claim(claim(requestId, 'corrected@another.example'), '127.0.0.1');
  assert.equal(corrected.email, 'corrected@another.example');
  assert.equal(f.calls.length, 2);
  assert.equal(f.inspect(db => db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count), 1);
});

test('invalid request IDs are rejected before contacting Eneo', async t => {
  const f = fixture(t);
  await assert.rejects(f.accounts.claim(claim('../../secret'), '127.0.0.1'), { status: 400 });
  assert.equal(f.calls.length, 0);
});

test('new accounts require a valid own email without reserving a quota slot on validation failure', async t => {
  const f = fixture(t, { maxAccounts: 1 });
  const requestId = randomUUID();
  for (const email of [undefined, null, '', 'plain text', 'missing-domain@', 'person@not-a-domain', 'a@@example.net', `${'a'.repeat(255)}@example.net`]) {
    await assert.rejects(f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId, email }, '127.0.0.1'), { status: 400 });
  }
  assert.equal(f.calls.length, 0);
  assert.equal(f.inspect(db => db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count), 0);
  const result = await f.accounts.claim(claim(requestId, '  Own.Name+Workshop@Organisation.SE  '), '127.0.0.1');
  assert.equal(result.email, 'own.name+workshop@organisation.se');
});

test('participant domains are unrestricted and addresses are trimmed and lowercased', async t => {
  const f = fixture(t);
  for (const email of ['Someone@personal.example', 'Worker@kommun.se', 'Me+tag@custom.example.org']) {
    const result = await f.accounts.claim(claim(randomUUID(), ` ${email} `), '127.0.0.1');
    assert.equal(result.email, email.toLowerCase());
  }
  assert.equal(f.calls.length, 3);
});

test('Unicode and punycode domains identify the same address across Eneo responses and duplicate checks', async t => {
  const f = fixture(t, { request: () => Response.json({ id: randomUUID(), email: 'éva@bücher.de' }, { status: 201 }) });
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId, ' E\u0301va@XN--BCHER-KVA.DE '), '127.0.0.1');
  assert.equal(result.email, 'éva@xn--bcher-kva.de');
  assert.equal(JSON.parse(f.calls[0].options.body).email, result.email);
  assert.deepEqual(await f.accounts.claim(claim(requestId, 'ÉVA@bücher.de'), '127.0.0.1'), result);
  await assert.rejects(f.accounts.claim(claim(randomUUID(), 'éva@bücher.de'), '127.0.0.1'), { status: 409 });
  assert.equal(f.calls.length, 1);
});

test('another request ID cannot claim or read credentials for an already reserved email', async t => {
  let finish;
  const response = new Promise(resolve => { finish = resolve; });
  const f = fixture(t, { request: () => response });
  const requestId = randomUUID();
  const email = 'participant@example.net';
  const first = f.accounts.claim(claim(requestId, email), 'first-browser');
  await assert.rejects(f.accounts.claim(claim(randomUUID(), email.toUpperCase()), 'another-browser'), error => error.status === 409 && !error.message.includes('password'));
  assert.equal(f.calls.length, 1);
  finish(Response.json({ id: randomUUID(), email }, { status: 201 }));
  await first;
  await assert.rejects(f.accounts.claim(claim(randomUUID(), email), 'another-browser'), { status: 409 });
  assert.equal(f.calls.length, 1);
});

test('created accounts are immutable when the same browser supplies a different own email', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const created = await f.accounts.claim(claim(requestId, 'first@example.net'), '127.0.0.1');
  await assert.rejects(f.accounts.claim(claim(requestId, 'second@example.net'), '127.0.0.1'), error => error.status === 409 && error.message.includes('annan e-postadress'));
  assert.deepEqual(await f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId }, '127.0.0.1'), created);
  assert.equal(f.calls.length, 1);
  assert.equal(f.inspect(db => db.prepare('SELECT email FROM accounts').get().email), 'first@example.net');
});

test('persisted synthetic-email accounts recover without supplying an email, including after closure', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const legacyEmail = 'traff-0123456789abcdef@test.eneo-modules.sundsvall.dev';
  const created = await f.accounts.claim(claim(requestId, legacyEmail), '127.0.0.1');
  f.reopen();
  f.setTime(f.config.closesAt);
  const recovered = await f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId }, '127.0.0.1');
  assert.deepEqual(recovered, created);
  assert.equal(recovered.email, legacyEmail);
  assert.equal(f.calls.length, 1);
});

for (const [upstreamStatus, publicStatus] of [[409, 409], [422, 422]]) {
  test(`Eneo ${upstreamStatus} lets the participant correct the address without resetting an existing account`, async t => {
    let attempts = 0;
    const f = fixture(t, { request: (url, options) => ++attempts === 1
      ? new Response('private validation diagnostic', { status: upstreamStatus })
      : Response.json({ id: randomUUID(), email: JSON.parse(options.body).email }, { status: 201 }) });
    const requestId = randomUUID();
    await assert.rejects(f.accounts.claim(claim(requestId, 'already-used@example.net'), '127.0.0.1'), error => error.status === publicStatus && !error.message.includes('private validation'));
    const result = await f.accounts.claim(claim(requestId, 'corrected@example.net'), '127.0.0.1');
    assert.equal(result.email, 'corrected@example.net');
    assert.equal(f.calls.length, 2);
    assert.ok(f.calls.every(call => call.options.method === 'POST' && call.url.endsWith('/admin/users/')));
    assert.equal(f.inspect(db => db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count), 1);
  });
}

test('a changed email never retries an uncertain reservation', async t => {
  const f = fixture(t, { request: () => { throw new DOMException('Timeout', 'TimeoutError'); } });
  const requestId = randomUUID();
  await assert.rejects(f.accounts.claim(claim(requestId, 'first@example.net'), '127.0.0.1'), { status: 502 });
  await assert.rejects(f.accounts.claim(claim(requestId, 'corrected@example.net'), '127.0.0.1'), { status: 409 });
  await assert.rejects(f.accounts.claim(claim(randomUUID(), 'first@example.net'), 'another-browser'), { status: 409 });
  assert.equal(f.calls.length, 1);
  assert.equal(f.inspect(db => db.prepare('SELECT email FROM accounts').get().email), 'first@example.net');
});

test('a fresh browser may reserve an email definitively refused earlier without releasing any created credentials', async t => {
  let attempts = 0;
  const f = fixture(t, { request: (url, options) => ++attempts === 1
    ? new Response('configuration refused', { status: 403 })
    : Response.json({ id: randomUUID(), email: JSON.parse(options.body).email }, { status: 201 }) });
  const rejectedId = randomUUID();
  const replacementId = randomUUID();
  const email = 'participant@example.net';
  await assert.rejects(f.accounts.claim(claim(rejectedId, email), 'first-browser'), { status: 502 });
  const created = await f.accounts.claim(claim(replacementId, email), 'fresh-browser');
  assert.equal(created.email, email);
  assert.equal(f.calls.length, 2);
  assert.equal(f.inspect(db => db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count), 1);
  await assert.rejects(f.accounts.claim(claim(rejectedId, email), 'first-browser'), { status: 409 });
  assert.deepEqual(await f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId: replacementId }, 'fresh-browser'), created);
  assert.equal(f.calls.length, 2);
});
