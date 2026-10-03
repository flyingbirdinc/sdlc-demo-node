import fs from 'node:fs/promises';
import path from 'node:path';

export const createStateStore = (filePath) => {
  let state = {};
  let chain = Promise.resolve();
  const persist = async () => {
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    const temp = `${filePath}.tmp`;
    await fs.writeFile(temp, JSON.stringify(state, null, 2));
    await fs.rename(temp, filePath);
  };
  const load = async () => {
    try { state = JSON.parse(await fs.readFile(filePath, 'utf8')); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  };
  const serialized = (operation) => {
    chain = chain.then(operation, operation);
    return chain;
  };
  return {
    load,
    async get(key) { return state[key]; },
    async set(key, value) { return serialized(async () => { state[key] = value; await persist(); }); },
    async update(key, update) { return serialized(async () => { state[key] = { ...(state[key] || {}), ...update }; await persist(); return state[key]; }); }
  };
};
