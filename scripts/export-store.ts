import fs from 'fs';
import path from 'path';
import { loadEntireStore } from '../src/server/firestoreIo.ts';

const outPath = path.resolve(process.argv[2] || process.env.LZ_EXPORT_FILE || 'store-export.json');

try {
  const loaded = await loadEntireStore();
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(loaded.store, null, 2));
  const users = Object.keys(loaded.store.users || {}).length;
  const sessions = Object.keys(loaded.store.sessions || {}).length;
  console.log(`Exported Firestore store to ${outPath} (${users} users, ${sessions} sessions).`);
} catch (err) {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
}
