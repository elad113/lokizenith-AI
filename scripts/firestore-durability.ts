import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { wipeServerCollections } from '../src/server/firestoreIo.ts';

const mode = process.argv[2] || 'parent';
const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..');

async function runChild(childMode: string, extraEnv: Record<string, string>) {
  const child = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), childMode], {
    cwd: repoRoot,
    env: { ...process.env, ...extraEnv },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += String(chunk);
  });
  child.stderr.on('data', (chunk) => {
    stderr += String(chunk);
  });
  const code: number = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('exit', (exitCode) => resolve(exitCode ?? 1));
  });
  if (code !== 0) {
    throw new Error(`durability child "${childMode}" exited ${code}\n${stdout}\n${stderr}`);
  }
  return { stdout, stderr };
}

if (mode === 'write-alice') {
  const { initDurableStore, registerAccount, persistStore, closeDurableStore, store } = await import('../src/server/store.ts');
  await initDurableStore();
  const created = registerAccount('alice_durable', 'test-pass-1234');
  if (!created.ok) throw new Error(created.error);
  const big = 'x'.repeat(750_000);
  store.userData[created.user.id] = {
    convs: [{ id: 'conv_big', title: 'kept', messages: [{ role: 'user', content: big }] }],
    settings: {},
    updatedAt: Date.now(),
  };
  persistStore({ immediate: true });
  fs.writeFileSync(
    process.env.LZ_ALICE_RESULT || '',
    JSON.stringify({ token: created.token, username: created.user.username, id: created.user.id, chars: big.length })
  );
  await closeDurableStore();
  process.exit(0);
}

if (mode === 'hold') {
  const { initDurableStore, findUserByUsername, persistStore, closeDurableStore, store } = await import('../src/server/store.ts');
  await initDurableStore();
  fs.writeFileSync(process.env.LZ_HOLD_READY || '', 'ready');
  const release = process.env.LZ_HOLD_RELEASE || '';
  const started = Date.now();
  while (!fs.existsSync(release)) {
    if (Date.now() - started > 60_000) throw new Error('hold timed out waiting for bob');
    await new Promise((resolve) => setTimeout(resolve, 40));
  }
  const alice = JSON.parse(fs.readFileSync(process.env.LZ_ALICE_RESULT || '', 'utf8'));
  const user = findUserByUsername(alice.username);
  if (!user) throw new Error(`hold process cannot see ${alice.username}; users=${Object.keys(store.users).join(',')}`);
  user.bonusTokens = 12345;
  persistStore({ immediate: true });
  console.error(`[hold] flushed alice; memory users=${Object.keys(store.users).join(',')}`);
  await closeDurableStore();
  process.exit(0);
}

if (mode === 'write-bob') {
  const { initDurableStore, registerAccount, closeDurableStore } = await import('../src/server/store.ts');
  await initDurableStore();
  const created = registerAccount('bob_durable', 'test-pass-1234');
  if (!created.ok) throw new Error(created.error);
  await closeDurableStore();
  process.exit(0);
}

if (mode === 'import-boot') {
  const { initDurableStore, findUserByUsername, closeDurableStore, store } = await import('../src/server/store.ts');
  await initDurableStore();
  const names = Object.values(store.users).map((user) => user.username);
  const imported = findUserByUsername('imported_user');
  fs.writeFileSync(
    process.env.LZ_IMPORT_RESULT || '',
    JSON.stringify({ names, tokens: imported?.tokensRemaining ?? null })
  );
  await closeDurableStore();
  if (!imported || imported.tokensRemaining !== 4242) process.exit(2);
  if (names.includes('should_not_import')) process.exit(3);
  process.exit(0);
}

if (mode === 'read') {
  const { initDurableStore, findUserByUsername, getUserByToken, closeDurableStore, store } = await import('../src/server/store.ts');
  await initDurableStore();
  const alice = JSON.parse(fs.readFileSync(process.env.LZ_ALICE_RESULT || '', 'utf8'));
  const names = Object.values(store.users).map((user) => user.username);
  const aliceUser = findUserByUsername(alice.username);
  const bobUser = findUserByUsername('bob_durable');
  const admin = findUserByUsername('EladBenczel');
  const byToken = getUserByToken(alice.token);
  delete store.sessions[alice.token];
  const afterMiss = getUserByToken(alice.token);
  const content = store.userData[alice.id]?.convs?.[0]?.messages?.[0]?.content || '';
  const report = {
    names,
    aliceBonus: aliceUser?.bonusTokens,
    bob: bobUser?.username || null,
    admin: admin?.username || null,
    adminAuth: admin?.authProvider || null,
    adminEmail: admin?.googleEmail || null,
    adminHasPassword: Boolean(admin?.passwordHash),
    byToken: byToken?.username || null,
    afterMiss: afterMiss?.username || null,
    chars: content.length,
  };
  fs.writeFileSync(process.env.LZ_READ_RESULT || '', JSON.stringify(report));
  console.error(JSON.stringify(report));
  await closeDurableStore();
  if (!aliceUser || !bobUser || !admin) process.exit(2);
  if (admin.authProvider !== 'google' || admin.googleEmail !== 'benczelelad@gmail.com' || admin.passwordHash) {
    process.exit(6);
  }
  if (aliceUser.bonusTokens !== 12345) process.exit(3);
  if (byToken?.username !== alice.username || afterMiss?.username !== alice.username) process.exit(4);
  if (content.length !== alice.chars) process.exit(5);
  process.exit(0);
}

if (mode !== 'parent') {
  console.error(`Durability mode "${mode}" returned without exiting.`);
  process.exit(1);
}

if (!process.env.FIRESTORE_EMULATOR_HOST) {
  console.error('Set FIRESTORE_EMULATOR_HOST before running the durability check.');
  process.exit(1);
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'lz-durable-'));
const aliceResult = path.join(tmp, 'alice.json');
const holdReady = path.join(tmp, 'hold.ready');
const holdRelease = path.join(tmp, 'hold.release');
const readResult = path.join(tmp, 'read.json');
const baseEnv = {
  LZ_STORAGE: 'firestore',
  LZ_ALICE_RESULT: aliceResult,
  LZ_HOLD_READY: holdReady,
  LZ_HOLD_RELEASE: holdRelease,
  LZ_READ_RESULT: readResult,
  LZ_FIRESTORE_MIRROR: '0',
  ROOT_ADMIN_PASSWORD: '',
};

await wipeServerCollections();
await runChild('write-alice', baseEnv);
const holdProc = spawn(process.execPath, ['--import', 'tsx', fileURLToPath(import.meta.url), 'hold'], {
  cwd: repoRoot,
  env: { ...process.env, ...baseEnv, LZ_FIRESTORE_MIRROR: '0' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let holdErr = '';
holdProc.stdout.on('data', () => {});
holdProc.stderr.on('data', (chunk) => {
  holdErr += String(chunk);
});
const readyDeadline = Date.now() + 60_000;
while (!fs.existsSync(holdReady)) {
  if (holdProc.exitCode !== null) throw new Error(`hold exited early ${holdProc.exitCode}\n${holdErr}`);
  if (Date.now() > readyDeadline) throw new Error(`hold did not become ready\n${holdErr}`);
  await new Promise((resolve) => setTimeout(resolve, 40));
}
await runChild('write-bob', baseEnv);
fs.writeFileSync(holdRelease, 'go');
const holdCode: number = await new Promise((resolve) => holdProc.on('exit', (code) => resolve(code ?? 1)));
if (holdCode !== 0) throw new Error(`hold flush failed (${holdCode})\n${holdErr}`);
await runChild('read', baseEnv);
const report = JSON.parse(fs.readFileSync(readResult, 'utf8'));
const exportFile = path.join(tmp, 'export.json');
const exportChild = spawn(process.execPath, ['--import', 'tsx', path.join(repoRoot, 'scripts/export-store.ts'), exportFile], {
  cwd: repoRoot,
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
});
let exportLog = '';
exportChild.stdout.on('data', (chunk) => {
  exportLog += String(chunk);
});
exportChild.stderr.on('data', (chunk) => {
  exportLog += String(chunk);
});
const exportCode: number = await new Promise((resolve) => exportChild.on('exit', (code) => resolve(code ?? 1)));
if (exportCode !== 0) throw new Error(`export-store failed (${exportCode})\n${exportLog}`);
const exported = JSON.parse(fs.readFileSync(exportFile, 'utf8'));
const exportedNames = Object.values(exported.users || {}).map((user: any) => user.username);
if (!exportedNames.includes('alice_durable') || !exportedNames.includes('bob_durable') || !exportedNames.includes('EladBenczel')) {
  throw new Error(`export-store missed users: ${exportedNames.join(', ')}`);
}
console.log(JSON.stringify(report, null, 2));
console.log(`export-store wrote ${exportedNames.length} users.`);

await wipeServerCollections();
const importFile = path.join(tmp, 'import.json');
const skippedFile = path.join(tmp, 'skip-import.json');
const importResult = path.join(tmp, 'import-result.json');
fs.writeFileSync(
  importFile,
  JSON.stringify({
    schemaVersion: 3,
    users: {
      usr_import: {
        id: 'usr_import',
        username: 'imported_user',
        usernameLower: 'imported_user',
        passwordHash: 'x',
        salt: 'y',
        tokensRemaining: 4242,
        tokenLimitBase: 25000,
        bonusTokens: 0,
        plan: 'free',
        createdAt: Date.now(),
      },
    },
  })
);
fs.writeFileSync(
  skippedFile,
  JSON.stringify({
    users: {
      usr_skip: { id: 'usr_skip', username: 'should_not_import', usernameLower: 'should_not_import', createdAt: Date.now() },
    },
  })
);
await runChild('import-boot', { ...baseEnv, LZ_IMPORT_FILE: importFile, LZ_IMPORT_RESULT: importResult });
await runChild('import-boot', { ...baseEnv, LZ_IMPORT_FILE: skippedFile, LZ_IMPORT_RESULT: importResult });
const imported = JSON.parse(fs.readFileSync(importResult, 'utf8'));
if (!imported.names.includes('imported_user') || imported.names.includes('should_not_import') || imported.tokens !== 4242) {
  throw new Error(`import boot failed: ${JSON.stringify(imported)}`);
}
console.log(`import boot kept ${imported.names.join(', ')} and skipped a second import.`);
console.log('Firestore durability check passed.');
