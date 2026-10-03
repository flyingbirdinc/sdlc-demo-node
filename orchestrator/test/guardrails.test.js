import test from 'node:test';
import assert from 'node:assert/strict';
import { parseImplementation, sensitivePath, validateEdits, validateRelativePath } from '../src/guardrails.js';

test('rejects traversal and absolute paths', () => {
  assert.throws(() => validateRelativePath('/repo', '../secret'));
  assert.throws(() => validateRelativePath('/repo', '/etc/passwd'));
});

test('allows safe repository edits and flags sensitive paths', () => {
  const result = validateEdits('/repo', [{ path: 'src/server.js', content: 'ok' }]);
  assert.equal(result.sensitive, false);
  assert.equal(sensitivePath('.github/workflows/ai.yml'), true);
});

test('rejects malformed implementation output', () => {
  assert.throws(() => parseImplementation('{"summary":"missing edits"}'));
});
