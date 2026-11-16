import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { chmodSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const ENEO_ORIGIN = 'https://eneo-modules.sundsvall.dev';
const PUBLIC_ORIGIN = 'https://eneo-anvandartraff.sundsvall.dev';
const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BAD_CODE_WINDOW = 15 * 60 * 1000;
const UNCERTAIN = 'Vi kunde inte bekräfta att kontot skapades. Försök inte skapa ett nytt konto. Kontakta träffens arrangör för hjälp.';

/**
 * @typedef {object} WorkshopConfig
 * @property {string} code
 * @property {Buffer} encryptionKey
 * @property {number} closesAt Epoch milliseconds.
 * @property {number} maxAccounts
 * @property {string} baseUrl
 * @property {string} publicOrigin
 * @property {string} roleId Fixed, operator-configured participant role.
 * @property {string} apiKeyHeader
 * @property {string} apiKey
 * @property {string} databasePath
 * @property {string} loginUrl
 *
 * @typedef {{ email: string, password: string, loginUrl: string }} AccountCredentials
 */

/** An intentional public failure. Never contains upstream responses or credentials. */
export class AccountError extends Error {
  constructor(status, message, retryAfter) {
    super(message);
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

/**
 * Read once at startup. Missing configuration leaves the original read-only site available.
 * @param {Record<string, string | undefined>} env
 * @returns {WorkshopConfig | null}
 */
export function readWorkshopConfig(env = process.env) {
  const required = ['WORKSHOP_CODE', 'WORKSHOP_ENCRYPTION_KEY', 'WORKSHOP_CLOSES_AT', 'ENEO_API_KEY', 'ENEO_ROLE_ID'];
  if (!required.some(name => env[name])) return null;
  for (const name of required) {
    if (!env[name]?.trim()) throw new Error(`Missing workshop configuration: ${name}`);
  }
  const code = env.WORKSHOP_CODE.trim();
  if (code.length < 8 || code.length > 128) throw new Error('WORKSHOP_CODE must contain 8–128 characters');
  const encodedKey = env.WORKSHOP_ENCRYPTION_KEY.trim();
  const encryptionKey = Buffer.from(encodedKey, 'base64');
  if (encryptionKey.length !== 32 || encryptionKey.toString('base64') !== encodedKey) {
    throw new Error('WORKSHOP_ENCRYPTION_KEY must be a base64-encoded 32-byte key');
  }
  const closesAt = Date.parse(env.WORKSHOP_CLOSES_AT);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(env.WORKSHOP_CLOSES_AT) || !Number.isFinite(closesAt)) {
    throw new Error('WORKSHOP_CLOSES_AT must be an ISO timestamp');
  }
  const maxAccounts = Number(env.WORKSHOP_MAX_ACCOUNTS || 150);
  if (!Number.isSafeInteger(maxAccounts) || maxAccounts < 1 || maxAccounts > 1000) {
    throw new Error('WORKSHOP_MAX_ACCOUNTS must be an integer from 1 to 1000');
  }
  const baseUrl = env.ENEO_BASE_URL || ENEO_ORIGIN;
  const publicOrigin = env.PUBLIC_ORIGIN || PUBLIC_ORIGIN;
  if (baseUrl !== ENEO_ORIGIN) throw new Error('ENEO_BASE_URL must be the workshop Eneo origin');
  if (publicOrigin !== PUBLIC_ORIGIN) throw new Error('PUBLIC_ORIGIN must be the meeting site origin');
  const roleId = env.ENEO_ROLE_ID.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(roleId)) throw new Error('ENEO_ROLE_ID must be a UUID');
  const apiKeyHeader = env.ENEO_API_KEY_HEADER || 'api-key';
  if (!/^[a-z0-9-]+$/i.test(apiKeyHeader)) throw new Error('Invalid ENEO_API_KEY_HEADER');
  return {
    code, encryptionKey, closesAt, maxAccounts, baseUrl, publicOrigin, roleId, apiKeyHeader,
    apiKey: env.ENEO_API_KEY.trim(),
    databasePath: env.WORKSHOP_DATABASE_PATH || '/app/data/workshop.sqlite',
    loginUrl: `${baseUrl}/login`,
  };
}

/**
 * Owns provisioning, reservations and credential recovery. One request ID is one account.
 * `fetch` and `now` are boundary dependencies for focused tests; persistence is real SQLite.
 */
export class WorkshopAccounts {
  #db;
  #config;
  #fetch;
  #now;
  #codeHash;

  /** @param {WorkshopConfig} config */
  constructor(config, { fetch: request = globalThis.fetch, now = Date.now } = {}) {
    this.#config = config;
    this.#fetch = request;
    this.#now = now;
    this.#codeHash = createHash('sha256').update(config.code).digest();
    mkdirSync(dirname(config.databasePath), { recursive: true, mode: 0o700 });
    this.#db = new DatabaseSync(config.databasePath);
    chmodSync(config.databasePath, 0o600);
    this.#db.exec(`
      PRAGMA journal_mode=WAL;
      PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS accounts (
        request_id TEXT PRIMARY KEY,
        state TEXT NOT NULL CHECK (state IN ('pending','created','failed','uncertain')),
        email TEXT NOT NULL UNIQUE,
        credentials TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        eneo_user_id TEXT
      );
      CREATE TABLE IF NOT EXISTS wrong_codes (
        client_hash TEXT PRIMARY KEY,
        started_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL
      );
      CREATE TABLE IF NOT EXISTS metadata (name TEXT PRIMARY KEY, value TEXT NOT NULL);
    `);
    const fingerprint = createHmac('sha256', config.encryptionKey).update('eneo-workshop-credential-key').digest('hex');
    const stored = this.#db.prepare("SELECT value FROM metadata WHERE name='encryption_key'").get();
    if (stored && stored.value !== fingerprint) {
      this.#db.close();
      throw new Error('Workshop encryption key differs from the persistent database key');
    }
    this.#db.prepare("INSERT OR IGNORE INTO metadata(name,value) VALUES ('encryption_key',?)").run(fingerprint);
    this.#db.exec("UPDATE accounts SET state='uncertain' WHERE state='pending'");
  }

  close() { this.#db.close(); }

  status() {
    return {
      enabled: this.#now() < this.#config.closesAt,
      loginUrl: this.#config.loginUrl,
      closesAt: new Date(this.#config.closesAt).toISOString(),
    };
  }

  #authorize(code, clientAddress) {
    if (typeof code !== 'string' || code.length > 128) throw new AccountError(400, 'Ange träffkoden som du får av arrangören.');
    const suppliedHash = createHash('sha256').update(code.trim()).digest();
    if (timingSafeEqual(suppliedHash, this.#codeHash)) return;
    const now = this.#now();
    const clientHash = createHmac('sha256', this.#config.encryptionKey).update(clientAddress).digest('hex');
    this.#db.prepare('DELETE FROM wrong_codes WHERE started_at <= ?').run(now - BAD_CODE_WINDOW);
    this.#db.prepare(`INSERT INTO wrong_codes(client_hash, started_at, attempts) VALUES (?, ?, 1)
      ON CONFLICT(client_hash) DO UPDATE SET attempts=attempts+1`).run(clientHash, now);
    const attempt = this.#db.prepare('SELECT attempts, started_at FROM wrong_codes WHERE client_hash=?').get(clientHash);
    if (attempt.attempts > 10) {
      throw new AccountError(429, 'För många försök med fel träffkod. Vänta en stund eller be arrangören om hjälp.', Math.max(1, Math.ceil((attempt.started_at + BAD_CODE_WINDOW - now) / 1000)));
    }
    throw new AccountError(403, 'Träffkoden stämmer inte. Kontrollera koden med arrangören och försök igen.');
  }

  #encrypt(requestId, credentials) {
    const nonce = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.#config.encryptionKey, nonce);
    cipher.setAAD(Buffer.from(requestId));
    const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), 'utf8'), cipher.final()]);
    return Buffer.concat([nonce, cipher.getAuthTag(), ciphertext]).toString('base64');
  }

  #decrypt(requestId, encoded) {
    const bytes = Buffer.from(encoded, 'base64');
    const decipher = createDecipheriv('aes-256-gcm', this.#config.encryptionKey, bytes.subarray(0, 12));
    decipher.setAAD(Buffer.from(requestId));
    decipher.setAuthTag(bytes.subarray(12, 28));
    const credentials = JSON.parse(Buffer.concat([decipher.update(bytes.subarray(28)), decipher.final()]).toString('utf8'));
    return { email: credentials.email, password: credentials.password, loginUrl: this.#config.loginUrl };
  }

  #existing(row, requestId) {
    if (row.state === 'created') return this.#decrypt(requestId, row.credentials);
    if (row.state === 'pending') throw new AccountError(409, 'Ditt konto håller på att skapas. Vänta en stund och försök sedan igen med samma formulär.', 5);
    if (row.state === 'uncertain') throw new AccountError(409, UNCERTAIN);
    throw new AccountError(502, 'Eneo kunde inte skapa kontot. Be arrangören om hjälp innan du försöker skapa ett nytt.');
  }

  #reserve(requestId) {
    this.#db.exec('BEGIN IMMEDIATE');
    let transactionOpen = true;
    try {
      const existing = this.#db.prepare('SELECT state, credentials FROM accounts WHERE request_id=?').get(requestId);
      if (existing) {
        this.#db.exec('COMMIT');
        transactionOpen = false;
        return { existing };
      }
      if (this.#now() >= this.#config.closesAt) throw new AccountError(403, 'Det går inte längre att skapa nya testkonton. Har du redan ett konto kan du hämta uppgifterna igen med samma formulär.');
      const count = this.#db.prepare("SELECT COUNT(*) AS count FROM accounts WHERE state!='failed'").get().count;
      if (count >= this.#config.maxAccounts) throw new AccountError(409, 'Alla testkonton är upptagna. Be arrangören om hjälp.');
      const username = `traff-${randomBytes(8).toString('hex')}`;
      const credentials = { email: `${username}@test.eneo-modules.sundsvall.dev`, password: `E!a9-${randomBytes(20).toString('base64url')}` };
      this.#db.prepare('INSERT INTO accounts(request_id,state,email,credentials,created_at) VALUES (?, ?, ?, ?, ?)')
        .run(requestId, 'pending', credentials.email, this.#encrypt(requestId, credentials), this.#now());
      this.#db.exec('COMMIT');
      transactionOpen = false;
      return { credentials, username };
    } catch (error) {
      if (transactionOpen) this.#db.exec('ROLLBACK');
      throw error;
    }
  }

  /**
   * @param {{ code?: unknown, requestId?: unknown }} input Untrusted request body.
   * @param {string} clientAddress Direct socket peer; forwarded headers are not trusted.
   * @returns {Promise<AccountCredentials>}
   */
  async claim(input, clientAddress) {
    if (!input || typeof input !== 'object' || Array.isArray(input)) throw new AccountError(400, 'Formuläret kunde inte läsas. Försök igen.');
    this.#authorize(input.code, clientAddress);
    if (typeof input.requestId !== 'string' || !UUID_V4.test(input.requestId)) throw new AccountError(400, 'Formulärets identifierare saknas. Ladda om sidan och försök igen.');
    const requestId = input.requestId.toLowerCase();
    const reservation = this.#reserve(requestId);
    if (reservation.existing) return this.#existing(reservation.existing, requestId);
    const { credentials, username } = reservation;
    let response;
    try {
      response = await this.#fetch(`${this.#config.baseUrl}/api/v1/admin/users/`, {
        method: 'POST', redirect: 'error', signal: AbortSignal.timeout(9000),
        headers: { 'Content-Type': 'application/json', [this.#config.apiKeyHeader]: this.#config.apiKey },
        body: JSON.stringify({ ...credentials, username, quota_limit: 50_000_000, roles: [{ id: this.#config.roleId }] }),
      });
    } catch {
      this.#db.prepare("UPDATE accounts SET state='uncertain' WHERE request_id=?").run(requestId);
      throw new AccountError(502, UNCERTAIN);
    }
    if (!response.ok) {
      await response.body?.cancel().catch(() => {});
      const definiteRefusal = response.status >= 400 && response.status < 500;
      this.#db.prepare('UPDATE accounts SET state=? WHERE request_id=?').run(definiteRefusal ? 'failed' : 'uncertain', requestId);
      throw new AccountError(502, definiteRefusal ? 'Eneo kunde inte skapa kontot. Be arrangören om hjälp innan du försöker skapa ett nytt.' : UNCERTAIN);
    }
    try {
      const created = await response.json();
      if (!created || typeof created.id !== 'string' || created.email?.toLowerCase() !== credentials.email) throw new Error('Unexpected provisioning response');
      this.#db.prepare("UPDATE accounts SET state='created', eneo_user_id=? WHERE request_id=?").run(created.id, requestId);
    } catch {
      this.#db.prepare("UPDATE accounts SET state='uncertain' WHERE request_id=?").run(requestId);
      throw new AccountError(502, UNCERTAIN);
    }
    return { ...credentials, loginUrl: this.#config.loginUrl };
  }
}
