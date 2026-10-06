import path from 'node:path';
import crypto from 'node:crypto';

export const sensitivePath = (filePath) => [
  /^\.github\/workflows\//,
  /^\.github\/ai-sdlc\//,
  /^orchestrator\//,
  /^deploy\//,
  /^scripts\/(deploy|rollback)\.sh$/
].some((pattern) => pattern.test(filePath));

export const validateRelativePath = (root, filePath) => {
  if (typeof filePath !== 'string' || !filePath || filePath.includes('\0') || path.posix.isAbsolute(filePath)) {
    throw new Error(`unsafe edit path: ${filePath}`);
  }
  const normalized = path.posix.normalize(filePath);
  if (normalized === '..' || normalized.startsWith('../') || normalized !== filePath) {
    throw new Error(`unsafe edit path: ${filePath}`);
  }
  const resolved = path.resolve(root, normalized);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error(`edit escapes repository: ${filePath}`);
  }
  return resolved;
};

export const validateEdits = (root, edits, limits = {}) => {
  const maxFiles = limits.maxFiles || 8;
  const maxLines = limits.maxLines || 800;
  if (!Array.isArray(edits) || edits.length === 0 || edits.length > maxFiles) {
    throw new Error(`edit count must be between 1 and ${maxFiles}`);
  }
  let lines = 0;
  const paths = [];
  for (const edit of edits) {
    if (!edit || typeof edit.path !== 'string' || typeof edit.content !== 'string') throw new Error('invalid edit shape');
    validateRelativePath(root, edit.path);
    if (Buffer.byteLength(edit.content, 'utf8') > 100_000) throw new Error(`edit too large: ${edit.path}`);
    lines += edit.content.split('\n').length;
    paths.push(edit.path);
  }
  if (lines > maxLines) throw new Error(`edit line limit exceeded: ${lines}`);
  return { paths, sensitive: paths.some(sensitivePath), lines };
};

export const contentHash = (issue) => crypto.createHash('sha256').update(JSON.stringify({
  id: issue.id,
  key: issue.key,
  fields: issue.fields,
  comments: issue.comments || []
})).digest('hex');

export const parseImplementation = (raw) => {
  const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  if (!parsed || typeof parsed.summary !== 'string' || !Array.isArray(parsed.edits)) throw new Error('invalid implementation response');
  return parsed;
};
