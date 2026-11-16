import { createReadStream } from 'node:fs';
import { realpath, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { AccountError } from './workshop-accounts.mjs';

const JSON_LIMIT = 2048;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif',
  '.ico': 'image/x-icon', '.pdf': 'application/pdf', '.json': 'application/json; charset=utf-8',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8', '.zip': 'application/zip',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

function json(response, status, body, retryAfter) {
  response.setHeader('Cache-Control', 'no-store');
  if (retryAfter) response.setHeader('Retry-After', String(retryAfter));
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  if (!/^application\/json(?:\s*;|$)/i.test(request.headers['content-type'] || '')) {
    throw new AccountError(415, 'Formuläret måste skickas som JSON. Ladda om sidan och försök igen.');
  }
  const chunks = [];
  let size = 0;
  await new Promise((accept, reject) => {
    let rejected = false;
    request.on('data', chunk => {
      size += chunk.length;
      if (rejected) return;
      if (size > JSON_LIMIT) {
        rejected = true;
        chunks.length = 0;
        reject(new AccountError(413, 'Formuläret är för stort. Ladda om sidan och försök igen.'));
      } else chunks.push(chunk);
    });
    request.on('end', accept);
    request.on('error', () => reject(new AccountError(400, 'Överföringen avbröts. Försök igen med samma formulär.')));
  });
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); }
  catch { throw new AccountError(400, 'Formuläret kunde inte läsas. Ladda om sidan och försök igen.'); }
}

async function sendStatic(request, response, pathname, staticRoot) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { response.writeHead(400); response.end(); return; }
  const segments = decoded.split('/');
  if (decoded.includes('\0') || decoded.includes('\\') || segments.some(segment => segment.startsWith('.'))) {
    response.writeHead(404); response.end(); return;
  }
  const requested = resolve(staticRoot, `.${decoded === '/' ? '/index.html' : decoded}`);
  try {
    const file = await realpath(requested);
    if (!file.startsWith(`${staticRoot}${sep}`)) { response.writeHead(404); response.end(); return; }
    const info = await stat(file);
    if (!info.isFile()) { response.writeHead(404); response.end(); return; }
    const extension = extname(file).toLowerCase();
    response.writeHead(200, {
      'Content-Type': TYPES[extension] || 'application/octet-stream',
      'Content-Length': info.size,
      'Cache-Control': extension === '.html' ? 'no-cache' : pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
    });
    if (request.method === 'HEAD') { response.end(); return; }
    const stream = createReadStream(file);
    stream.on('error', () => response.destroy());
    response.on('close', () => stream.destroy());
    stream.pipe(response);
  } catch {
    response.writeHead(404);
    response.end();
  }
}

/** Thin adapter: the account owner receives only validated HTTP input and the socket peer. */
export function meetingRequestHandler({ accounts, staticRoot, publicOrigin }) {
  const root = resolve(staticRoot);
  return async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    try {
      const pathname = new URL(request.url, publicOrigin).pathname;
      if (pathname === '/health' && request.method === 'GET') {
        json(response, 200, { status: 'ok' });
      } else if (pathname === '/api/workshop/status' && request.method === 'GET') {
        json(response, 200, accounts?.status() || {
          enabled: false, loginUrl: 'https://eneo-modules.sundsvall.dev/login', closesAt: '1970-01-01T00:00:00.000Z',
        });
      } else if (pathname === '/api/workshop/accounts' && request.method === 'POST') {
        if (request.headers.origin !== publicOrigin) throw new AccountError(403, 'Öppna formuläret från användarträffens webbplats och försök igen.');
        if (!accounts) throw new AccountError(503, 'Testkontona är inte tillgängliga ännu. Be arrangören om hjälp.');
        const input = await readJson(request);
        const result = await accounts.claim(input, request.socket.remoteAddress || 'unknown');
        json(response, 200, result);
      } else if (pathname.startsWith('/api/')) {
        json(response, 404, { error: 'Adressen finns inte.' });
      } else {
        await sendStatic(request, response, pathname, root);
      }
    } catch (error) {
      if (response.headersSent) { response.destroy(); return; }
      if (error instanceof AccountError) json(response, error.status, { error: error.message }, error.retryAfter);
      else {
        // Do not log request bodies, upstream responses, credentials or raw exceptions.
        console.error('Meeting request failed unexpectedly');
        json(response, 500, { error: 'Något gick fel. Försök igen med samma formulär eller kontakta arrangören.' });
      }
    }
  };
}
