import assert from 'node:assert/strict';
import { test } from 'node:test';
import { meetingRequestHandler } from './http.mjs';

test('an unconfigured server returns a closed status the frontend can read', async () => {
  const headers = new Map();
  let status;
  let body;
  const response = {
    setHeader(name, value) { headers.set(name.toLowerCase(), value); },
    writeHead(code) { status = code; },
    end(value) { body = value; },
  };
  const handler = meetingRequestHandler({ accounts: null, staticRoot: '/unused', publicOrigin: 'https://eneo-anvandartraff.sundsvall.dev' });
  await handler({ method: 'GET', url: '/api/workshop/status' }, response);
  assert.equal(status, 200);
  assert.equal(headers.get('cache-control'), 'no-store');
  const result = JSON.parse(body);
  assert.equal(result.enabled, false);
  assert.equal(result.loginUrl, 'https://eneo-modules.sundsvall.dev/login');
  assert.equal(Date.parse(result.closesAt), 0);
});
