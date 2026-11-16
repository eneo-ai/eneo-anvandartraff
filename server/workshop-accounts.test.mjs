import assert from 'node:assert/strict';
import { createCipheriv, randomUUID } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { test } from 'node:test';
import { createWorkshopPassphrase, readWorkshopConfig, WorkshopAccounts, WORKSHOP_PASSPHRASE_WORDS } from './workshop-accounts.mjs';

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

function fixture(t, { request, stageRequest, maxAccounts = 150 } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'eneo-meeting-accounts-'));
  const config = readWorkshopConfig({ ...VALID_ENV, WORKSHOP_DATABASE_PATH: join(directory, 'accounts.sqlite'), WORKSHOP_MAX_ACCOUNTS: String(maxAccounts) });
  const calls = [];
  let clock = START;
  const fetch = async (url, options) => {
    calls.push({ url, options });
    if (url.endsWith('/admin/users/')) {
      if (request) return request(url, options);
      return Response.json({ id: randomUUID(), email: JSON.parse(options.body).email }, { status: 201 });
    }
    if (stageRequest) {
      const overridden = await stageRequest(url, options);
      if (overridden !== undefined) return overridden;
    }
    if (url.endsWith('/users/login/token/')) return Response.json({ access_token: 'participant-test-token' });
    if (url.endsWith('/users/me/password/')) return new Response(null, { status: 204 });
    throw new Error('Unexpected Eneo endpoint in account provisioning');
  };
  let accounts = new WorkshopAccounts(config, { fetch, now: () => clock });
  t.after(() => { accounts.close(); rmSync(directory, { recursive: true, force: true }); });
  return {
    config, calls,
    get creations() { return calls.filter(call => call.url.endsWith('/admin/users/')); },
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

test('the memorable password dictionary has exactly 256 unique common-word slots with bounded ASCII length', () => {
  assert.equal(WORKSHOP_PASSPHRASE_WORDS.length, 256);
  assert.equal(new Set(WORKSHOP_PASSPHRASE_WORDS).size, 256);
  assert.ok(Object.isFrozen(WORKSHOP_PASSPHRASE_WORDS));
  assert.ok(WORKSHOP_PASSPHRASE_WORDS.every(word => /^[a-z]{2,10}$/.test(word)));
});

test('final passphrases use five dictionary words and four digits within Eneo password bounds', () => {
  const samples = Array.from({ length: 24 }, createWorkshopPassphrase);
  const dictionary = new Set(WORKSHOP_PASSPHRASE_WORDS);
  for (const password of samples) {
    const parts = password.split('-');
    assert.equal(parts.length, 6);
    assert.ok(parts.slice(0, 5).every(word => dictionary.has(word)));
    assert.match(parts[5], /^\d{4}$/);
    assert.ok(Buffer.byteLength(password, 'utf8') >= 12);
    assert.ok(Buffer.byteLength(password, 'utf8') <= 59);
  }
  assert.equal(new Set(samples).size, samples.length);
  assert.ok(new Set(samples.map(password => password.split('-')[0])).size > 1);
});

test('one request provisions exactly one account with the fixed role and server-side key', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId), '127.0.0.1');
  assert.deepEqual(await f.accounts.claim(claim(requestId), '127.0.0.1'), result);
  assert.equal(f.creations.length, 1);
  assert.equal(f.creations[0].url, 'https://eneo-modules.sundsvall.dev/api/v1/admin/users/');
  assert.equal(f.creations[0].options.headers['X-API-Key'], VALID_ENV.ENEO_API_KEY);
  assert.equal(f.creations[0].options.redirect, 'error');
  const sent = JSON.parse(f.creations[0].options.body);
  assert.deepEqual(sent.roles, [{ id: VALID_ENV.ENEO_ROLE_ID }]);
  assert.equal(sent.quota_limit, 50_000_000);
  assert.equal(sent.email, result.email);
  assert.equal(result.email, claim(requestId).email);
  assert.match(sent.username, /^traff-[0-9a-f]{16}$/);
  assert.match(result.password, /^(?:[a-z]{2,10}-){5}\d{4}$/);
  assert.ok(result.password.split('-').slice(0, 5).every(word => WORKSHOP_PASSPHRASE_WORDS.includes(word)));
  assert.ok(result.password.length >= 12 && result.password.length <= 72);
  assert.equal(result.loginUrl, 'https://eneo-modules.sundsvall.dev/login');
  assert.equal(result.passwordReady, true);
  assert.deepEqual(Object.keys(result).sort(), ['email', 'loginUrl', 'password', 'passwordReady']);
  assert.equal(f.calls.length, 3);
  const [creation, login, change] = f.calls;
  assert.notEqual(sent.password, result.password);
  assert.ok(sent.password.length >= 24 && sent.password.length <= 72);
  assert.ok(!('passwordReady' in sent));
  assert.equal(login.url, 'https://eneo-modules.sundsvall.dev/api/v1/users/login/token/');
  assert.deepEqual(login.options.headers, { 'Content-Type': 'application/x-www-form-urlencoded' });
  const loginForm = new URLSearchParams(login.options.body);
  assert.equal(loginForm.get('username'), result.email);
  assert.equal(loginForm.get('password'), sent.password);
  assert.equal(change.url, 'https://eneo-modules.sundsvall.dev/api/v1/users/me/password/');
  assert.deepEqual(change.options.headers, { 'Content-Type': 'application/json', Authorization: 'Bearer participant-test-token' });
  assert.deepEqual(JSON.parse(change.options.body), { current_password: sent.password, new_password: result.password });
  assert.equal(creation.options.signal, login.options.signal);
  assert.equal(creation.options.signal, change.options.signal);
  assert.equal(login.options.redirect, 'error');
  assert.equal(change.options.redirect, 'error');
});

test('credentials survive restart and are encrypted in SQLite', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId), '127.0.0.1');
  const encrypted = f.inspect(db => db.prepare('SELECT credentials FROM accounts').get().credentials);
  assert.ok(!encrypted.includes(result.password));
  assert.ok(!encrypted.includes(result.email));
  const temporaryPassword = JSON.parse(f.creations[0].options.body).password;
  assert.ok(!encrypted.includes(temporaryPassword));
  f.reopen();
  assert.deepEqual(await f.accounts.claim(claim(requestId), '127.0.0.1'), result);
  assert.equal(f.creations.length, 1);
  assert.ok(!readFileSync(f.config.databasePath).includes(Buffer.from(result.password)));
  assert.ok(!readFileSync(f.config.databasePath).includes(Buffer.from(temporaryPassword)));
});

test('wrong code never creates a reservation and is rate limited without blocking a valid participant', async t => {
  const f = fixture(t);
  for (let attempt = 0; attempt < 10; attempt++) {
    await assert.rejects(f.accounts.claim({ code: 'wrong', requestId: randomUUID() }, 'shared-nat'), { status: 403 });
  }
  await assert.rejects(f.accounts.claim({ code: 'wrong', requestId: randomUUID() }, 'shared-nat'), error => error.status === 429 && error.retryAfter > 0);
  assert.equal(f.creations.length, 0);
  await f.accounts.claim(claim(randomUUID()), 'shared-nat');
  assert.equal(f.creations.length, 1);
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
  assert.equal(f.creations.length, 1);
});

test('the global limit blocks new reservations but preserves existing credentials', async t => {
  const f = fixture(t, { maxAccounts: 1 });
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId), '127.0.0.1');
  await assert.rejects(f.accounts.claim(claim(randomUUID()), 'another-client'), { status: 409 });
  assert.deepEqual(await f.accounts.claim(claim(requestId), '127.0.0.1'), result);
  assert.equal(f.creations.length, 1);
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
  const sent = JSON.parse(f.creations[0].options.body);
  finish(Response.json({ id: randomUUID(), email: sent.email }, { status: 201 }));
  await first;
  assert.equal(f.creations.length, 1);
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
    assert.equal(f.creations.length, 1);
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
  assert.equal(f.creations.length, 1);
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
  assert.equal(f.creations.length, 2);
  assert.equal(f.inspect(db => db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count), 1);
});

test('invalid request IDs are rejected before contacting Eneo', async t => {
  const f = fixture(t);
  await assert.rejects(f.accounts.claim(claim('../../secret'), '127.0.0.1'), { status: 400 });
  assert.equal(f.creations.length, 0);
});

test('new accounts require a valid own email without reserving a quota slot on validation failure', async t => {
  const f = fixture(t, { maxAccounts: 1 });
  const requestId = randomUUID();
  for (const email of [undefined, null, '', 'plain text', 'missing-domain@', 'person@not-a-domain', 'a@@example.net', `${'a'.repeat(255)}@example.net`]) {
    await assert.rejects(f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId, email }, '127.0.0.1'), { status: 400 });
  }
  assert.equal(f.creations.length, 0);
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
  assert.equal(f.creations.length, 3);
});

test('Unicode and punycode domains identify the same address across Eneo responses and duplicate checks', async t => {
  const f = fixture(t, { request: () => Response.json({ id: randomUUID(), email: 'éva@bücher.de' }, { status: 201 }) });
  const requestId = randomUUID();
  const result = await f.accounts.claim(claim(requestId, ' E\u0301va@XN--BCHER-KVA.DE '), '127.0.0.1');
  assert.equal(result.email, 'éva@xn--bcher-kva.de');
  assert.equal(JSON.parse(f.creations[0].options.body).email, result.email);
  assert.deepEqual(await f.accounts.claim(claim(requestId, 'ÉVA@bücher.de'), '127.0.0.1'), result);
  await assert.rejects(f.accounts.claim(claim(randomUUID(), 'éva@bücher.de'), '127.0.0.1'), { status: 409 });
  assert.equal(f.creations.length, 1);
});

test('another request ID cannot claim or read credentials for an already reserved email', async t => {
  let finish;
  const response = new Promise(resolve => { finish = resolve; });
  const f = fixture(t, { request: () => response });
  const requestId = randomUUID();
  const email = 'participant@example.net';
  const first = f.accounts.claim(claim(requestId, email), 'first-browser');
  await assert.rejects(f.accounts.claim(claim(randomUUID(), email.toUpperCase()), 'another-browser'), error => error.status === 409 && !error.message.includes('password'));
  assert.equal(f.creations.length, 1);
  finish(Response.json({ id: randomUUID(), email }, { status: 201 }));
  await first;
  await assert.rejects(f.accounts.claim(claim(randomUUID(), email), 'another-browser'), { status: 409 });
  assert.equal(f.creations.length, 1);
});

test('created accounts are immutable when the same browser supplies a different own email', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const created = await f.accounts.claim(claim(requestId, 'first@example.net'), '127.0.0.1');
  await assert.rejects(f.accounts.claim(claim(requestId, 'second@example.net'), '127.0.0.1'), error => error.status === 409 && error.message.includes('annan e-postadress'));
  assert.deepEqual(await f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId }, '127.0.0.1'), created);
  assert.equal(f.creations.length, 1);
  assert.equal(f.inspect(db => db.prepare('SELECT email FROM accounts').get().email), 'first@example.net');
});

test('persisted synthetic-email accounts recover without supplying an email, including after closure', async t => {
  const f = fixture(t);
  const requestId = randomUUID();
  const legacyEmail = 'traff-0123456789abcdef@test.eneo-modules.sundsvall.dev';
  // Persist the released pre-password-preparation credential format, which has
  // no passwordReady property. Recovery must never modify this Eneo account.
  const legacyPassword = 'LegacyTest!123456789012345';
  const nonce = Buffer.alloc(12, 9);
  const cipher = createCipheriv('aes-256-gcm', f.config.encryptionKey, nonce);
  cipher.setAAD(Buffer.from(requestId));
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify({ email: legacyEmail, password: legacyPassword }), 'utf8'), cipher.final()]);
  const encrypted = Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64');
  f.inspect(db => db.prepare('INSERT INTO accounts(request_id,state,email,credentials,created_at) VALUES (?,?,?,?,?)').run(requestId, 'created', legacyEmail, encrypted, START));
  f.reopen();
  f.setTime(f.config.closesAt);
  const recovered = await f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId }, '127.0.0.1');
  assert.deepEqual(recovered, { email: legacyEmail, password: legacyPassword, passwordReady: false, loginUrl: f.config.loginUrl });
  assert.equal(recovered.email, legacyEmail);
  assert.equal(f.calls.length, 0);
});

for (const [upstreamStatus, publicStatus] of [[409, 409], [422, 422]]) {
  test(`Eneo ${upstreamStatus} lets the participant correct the address without resetting an existing account`, async t => {
    let attempts = 0;
    const f = fixture(t, { request: (url, options) => ++attempts === 1
      ? new Response('private validation diagnostic', { status: upstreamStatus })
      : Response.json({ id: randomUUID(), email: JSON.parse(options.body).email }, { status: 201 }) });
    const requestId = randomUUID();
    await assert.rejects(f.accounts.claim(claim(requestId, 'already-used@example.net'), '127.0.0.1'), error => error.status === publicStatus && !error.message.includes('private validation'));
    assert.equal(f.calls.length, 1);
    const result = await f.accounts.claim(claim(requestId, 'corrected@example.net'), '127.0.0.1');
    assert.equal(result.email, 'corrected@example.net');
    assert.equal(f.creations.length, 2);
    assert.equal(f.calls.length, 4);
    assert.equal(new URLSearchParams(f.calls[2].options.body).get('username'), 'corrected@example.net');
    assert.ok(f.creations.every(call => call.options.method === 'POST' && call.url.endsWith('/admin/users/')));
    assert.equal(f.inspect(db => db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count), 1);
  });
}

test('a changed email never retries an uncertain reservation', async t => {
  const f = fixture(t, { request: () => { throw new DOMException('Timeout', 'TimeoutError'); } });
  const requestId = randomUUID();
  await assert.rejects(f.accounts.claim(claim(requestId, 'first@example.net'), '127.0.0.1'), { status: 502 });
  await assert.rejects(f.accounts.claim(claim(requestId, 'corrected@example.net'), '127.0.0.1'), { status: 409 });
  await assert.rejects(f.accounts.claim(claim(randomUUID(), 'first@example.net'), 'another-browser'), { status: 409 });
  assert.equal(f.creations.length, 1);
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
  assert.equal(f.creations.length, 2);
  assert.equal(f.inspect(db => db.prepare('SELECT COUNT(*) AS count FROM accounts').get().count), 1);
  await assert.rejects(f.accounts.claim(claim(rejectedId, email), 'first-browser'), { status: 409 });
  assert.deepEqual(await f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId: replacementId }, 'fresh-browser'), created);
  assert.equal(f.creations.length, 2);
});

test('credentials stay pending until self-service password preparation is confirmed', async t => {
  let enteredChange;
  const entered = new Promise(resolve => { enteredChange = resolve; });
  let finishChange;
  const completed = new Promise(resolve => { finishChange = resolve; });
  const f = fixture(t, { stageRequest: url => {
    if (url.endsWith('/users/me/password/')) { enteredChange(); return completed; }
  } });
  const requestId = randomUUID();
  const pending = f.accounts.claim(claim(requestId), '127.0.0.1');
  await entered;
  assert.equal(f.inspect(db => db.prepare('SELECT state FROM accounts').get().state), 'pending');
  await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 409 });
  finishChange(new Response(null, { status: 204 }));
  const result = await pending;
  assert.equal(result.passwordReady, true);
  assert.equal(f.inspect(db => db.prepare('SELECT state FROM accounts').get().state), 'created');
  assert.equal(f.calls.length, 3);
});

for (const [name, phase, response] of [
  ['participant login refusal', 'login', () => new Response('private login failure', { status: 401 })],
  ['participant login server error', 'login', () => new Response('private login failure', { status: 503 })],
  ['participant login timeout', 'login', () => { throw new DOMException('Timeout', 'TimeoutError'); }],
  ['malformed participant login JSON', 'login', () => new Response('private invalid JSON', { status: 200 })],
  ['missing participant token', 'login', () => Response.json({ wrong: 'private missing token' })],
  ['empty participant token', 'login', () => Response.json({ access_token: ' ' })],
  ['malformed participant token', 'login', () => Response.json({ access_token: 'private\r\ninvalid' })],
  ['password replacement refusal', 'password', () => new Response('private password failure', { status: 403 })],
  ['password replacement validation failure', 'password', () => new Response('private password failure', { status: 422 })],
  ['password replacement server error', 'password', () => new Response('private password failure', { status: 503 })],
  ['password replacement timeout', 'password', () => { throw new DOMException('Timeout', 'TimeoutError'); }],
  ['unconfirmed password replacement response', 'password', () => Response.json({ private: true }, { status: 200 })],
]) {
  test(`${name} leaves a known created Eneo account uncertain and never retries it`, async t => {
    const endpoint = phase === 'login' ? '/users/login/token/' : '/users/me/password/';
    const f = fixture(t, { stageRequest: url => url.endsWith(endpoint) ? response() : undefined });
    const requestId = randomUUID();
    await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), error => error.status === 502 && !error.message.includes('private'));
    const reservation = f.inspect(db => db.prepare('SELECT state, eneo_user_id FROM accounts').get());
    assert.equal(reservation.state, 'uncertain');
    assert.ok(reservation.eneo_user_id);
    const requestCount = f.calls.length;
    assert.equal(requestCount, phase === 'login' ? 2 : 3);
    await assert.rejects(f.accounts.claim(claim(requestId), '127.0.0.1'), { status: 409 });
    await assert.rejects(f.accounts.claim(claim(requestId, 'corrected@example.net'), '127.0.0.1'), { status: 409 });
    await assert.rejects(f.accounts.claim(claim(randomUUID(), claim(requestId).email), 'another-browser'), { status: 409 });
    f.reopen();
    await assert.rejects(f.accounts.claim({ code: VALID_ENV.WORKSHOP_CODE, requestId }, '127.0.0.1'), { status: 409 });
    assert.equal(f.creations.length, 1);
    assert.equal(f.calls.length, requestCount);
  });
}
