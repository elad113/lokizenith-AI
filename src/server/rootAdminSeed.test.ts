import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { verifyPassword } from '../utils/authQuota.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const storeModuleUrl = pathToFileURL(path.join(repoRoot, 'src/server/store.ts')).href;

function inspectSeed(dataDir: string, extraEnv: Record<string, string>) {
  const script = `
    import { store } from ${JSON.stringify(storeModuleUrl)};
    const users = Object.values(store.users).map((user) => ({
      username: user.username,
      authProvider: user.authProvider || '',
      googleEmail: user.googleEmail || '',
      passwordHash: user.passwordHash || '',
      salt: user.salt || '',
    }));
    console.log('SEED_JSON ' + JSON.stringify(users));
  `;
  const file = path.join(dataDir, `inspect-${process.pid}-${Date.now()}-${Math.random().toString(16).slice(2)}.ts`);
  fs.writeFileSync(file, script);
  const result = spawnSync(process.execPath, ['--import', 'tsx', file], {
    cwd: repoRoot,
    encoding: 'utf8',
    env: {
      ...process.env,
      LZ_STORAGE: 'disk',
      LZ_DATA_DIR: dataDir,
      LZ_VAULT_DIR: path.join(dataDir, 'vault'),
      FIRESTORE_EMULATOR_HOST: '',
      GOOGLE_APPLICATION_CREDENTIALS: '',
      K_SERVICE: '',
      K_REVISION: '',
      ...extraEnv,
    },
  });
  fs.unlinkSync(file);
  if (result.status !== 0) {
    throw new Error(`seed inspect failed (${result.status})\n${result.stdout}\n${result.stderr}`);
  }
  const line = result.stdout.split('\n').map((row) => row.trim()).find((row) => row.startsWith('SEED_JSON '));
  if (!line) throw new Error(`no seed JSON\n${result.stdout}\n${result.stderr}`);
  return JSON.parse(line.slice('SEED_JSON '.length)) as {
    username: string;
    authProvider: string;
    googleEmail: string;
    passwordHash: string;
    salt: string;
  }[];
}

test('empty disk store seeds a Google-only root admin when ROOT_ADMIN_PASSWORD is unset', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lz-seed-google-'));
  const users = inspectSeed(dir, { ROOT_ADMIN_PASSWORD: '' });
  assert.equal(users.length, 1);
  assert.equal(users[0].username, 'EladBenczel');
  assert.equal(users[0].authProvider, 'google');
  assert.equal(users[0].googleEmail, 'benczelelad@gmail.com');
  assert.equal(users[0].passwordHash, '');
  assert.equal(users[0].salt, '');
  assert.equal(verifyPassword('anything', users[0].passwordHash, users[0].salt), false);
});

test('ROOT_ADMIN_PASSWORD is hashed into a new empty store and is not kept in source', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lz-seed-pass-'));
  const password = 'env-only-root-pass';
  const users = inspectSeed(dir, { ROOT_ADMIN_PASSWORD: password });
  assert.equal(users.length, 1);
  assert.equal(users[0].authProvider, 'password');
  assert.equal(users[0].googleEmail, 'benczelelad@gmail.com');
  assert.ok(users[0].passwordHash);
  assert.equal(verifyPassword(password, users[0].passwordHash, users[0].salt), true);
  assert.equal(verifyPassword('LokizenithAdmin2026!', users[0].passwordHash, users[0].salt), false);
  const source = fs.readFileSync(path.join(repoRoot, 'src/server/store.ts'), 'utf8');
  assert.equal(source.includes(password), false);
  assert.equal(source.includes('LokizenithAdmin2026!'), false);
});

test('an existing admin password is not replaced when the store already has users', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lz-seed-keep-'));
  fs.writeFileSync(
    path.join(dir, 'store.json'),
    JSON.stringify({
      schemaVersion: 3,
      users: {
        usr_root: {
          id: 'usr_root',
          username: 'EladBenczel',
          usernameLower: 'eladbenczel',
          passwordHash: 'keep-me',
          salt: 'keep-salt',
          authProvider: 'password',
          googleEmail: 'benczelelad@gmail.com',
          createdAt: 1,
        },
        usr_other: {
          id: 'usr_other',
          username: 'already_here',
          usernameLower: 'already_here',
          passwordHash: 'their-hash',
          salt: 'their-salt',
          createdAt: 1,
        },
      },
    })
  );
  const users = inspectSeed(dir, { ROOT_ADMIN_PASSWORD: 'should-not-overwrite' });
  const admin = users.find((user) => user.username === 'EladBenczel');
  const other = users.find((user) => user.username === 'already_here');
  assert.ok(admin);
  assert.ok(other);
  assert.equal(admin.passwordHash, 'keep-me');
  assert.equal(admin.salt, 'keep-salt');
  assert.equal(other.passwordHash, 'their-hash');
  assert.equal(verifyPassword('should-not-overwrite', admin.passwordHash, admin.salt), false);
});
