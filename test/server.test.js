import test from 'node:test';
import assert from 'node:assert/strict';

const healthResponse = (version = '1.0.0', commit = 'test') => ({
  status: 'ok',
  version,
  commit
});

test('health response reports a healthy application', () => {
  assert.deepEqual(healthResponse('1.2.3', 'abc123'), {
    status: 'ok',
    version: '1.2.3',
    commit: 'abc123'
  });
});
