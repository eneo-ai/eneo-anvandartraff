import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { readWorkshopConfig, WorkshopAccounts } from './workshop-accounts.mjs';
import { meetingRequestHandler } from './http.mjs';

const config = readWorkshopConfig();
const accounts = config ? new WorkshopAccounts(config) : null;
const server = createServer({ maxHeaderSize: 8192 }, meetingRequestHandler({
  accounts,
  staticRoot: fileURLToPath(new URL('../dist/', import.meta.url)),
  publicOrigin: config?.publicOrigin || 'https://eneo-anvandartraff.sundsvall.dev',
}));
server.requestTimeout = 15_000;
server.headersTimeout = 10_000;
server.keepAliveTimeout = 5_000;
server.maxRequestsPerSocket = 100;
server.listen(8080, '0.0.0.0', () => console.log('Meeting server listening on port 8080'));

function shutdown() {
  server.close(() => {
    accounts?.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.once('SIGTERM', shutdown);
process.once('SIGINT', shutdown);
