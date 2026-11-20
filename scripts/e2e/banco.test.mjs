import assert from 'node:assert/strict';
import { test } from 'node:test';
import { urlDoBanco } from './banco.mjs';

test('aceita apenas URL libsql do vec-dev na Turso', () => {
  assert.equal(urlDoBanco('libsql://vec-dev-org.aws-us-east-1.turso.io\n'), true);
  for (const url of [
    'libsql://vec-prod-org.aws-us-east-1.turso.io',
    'libsql://vec-dev2-org.aws-us-east-1.turso.io',
    'libsql://vec-dev.aws-us-east-1.turso.io',
    'libsql://vec-dev-org.evil.test',
    'https://vec-dev-org.aws-us-east-1.turso.io',
    'libsql://vec-dev-org.turso.io.evil.test',
    '',
  ]) assert.equal(urlDoBanco(url), false, url);
});
