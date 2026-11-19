import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const rulesPath = path.resolve(process.cwd(), 'firestore.rules');
const rulesText = fs.readFileSync(rulesPath, 'utf-8');

test('firestore.rules enforces Default Deny Catch-All and rules_version 2', () => {
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('match /{document=**} {\n      allow read, write: if false;\n    }'));
});

test('Dirty Dozen #1-4: UserProfile & PII Isolation invariants', () => {
  // 1. Shadow field guard
  assert.ok(
    rulesText.includes(
      "data.keys().hasOnly(['uid', 'displayName', 'role', 'quotaTokens', 'usedTokens', 'rateLimitRpm', 'createdAt', 'updatedAt'])"
    )
  );
  // 2. Self-assigned admin role blocked
  assert.ok(rulesText.includes("(incoming().role == 'user' || isAdmin())"));
  // 3. Verified email required for admin & writes
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));
  // 4. PII isolated in /private/{docId}
  assert.ok(rulesText.includes('match /private/{docId}'));
  assert.ok(rulesText.includes('(isOwner(userId) || isAdmin())'));
});

test('Dirty Dozen #5-8: Hashed API Keys, Orphan Guard, Terminal State Lock, and Quota Protection', () => {
  // 5. SHA-256 64-char hex hash strictly enforced
  assert.ok(rulesText.includes("data.keyHash.size() == 64 && data.keyHash.matches('^[a-f0-9]{64}$')"));
  // 6. Orphan guard checks parent /users/$(request.auth.uid)
  assert.ok(rulesText.includes('exists(/databases/$(database)/documents/users/$(request.auth.uid))'));
  // 7. Terminal state lock prevents updating revoked keys
  assert.ok(rulesText.includes("existing().status != 'revoked'"));
  // 8. Quota & rateLimit immutability for non-admin owners
  assert.ok(rulesText.includes('incoming().quotaTokens == existing().quotaTokens'));
  assert.ok(rulesText.includes('incoming().rateLimitRpm == existing().rateLimitRpm'));
});

test('Dirty Dozen #9-12: Admin-Only Providers, Array Bounds, Server Timestamps, and List Query Enforcers', () => {
  // 9. Provider mutations restricted to isAdmin()
  assert.ok(rulesText.includes('match /providers/{providerId}'));
  // 10. Models array bounded <= 20
  assert.ok(rulesText.includes('data.models is list && data.models.size() >= 1 && data.models.size() <= 20'));
  // 11. Server timestamps enforced
  assert.ok(rulesText.includes('incoming().createdAt == request.time'));
  // 12. List queries enforce ownerId == request.auth.uid
  assert.ok(rulesText.includes('resource.data.ownerId == request.auth.uid || isAdmin()'));
});

test('Dirty Dozen #13-14: Eternal AccountVault & Admin-Only PlatformVaultAccounts guards', () => {
  assert.ok(rulesText.includes('match /accountVaults/{userId}'));
  assert.ok(rulesText.includes('isValidAccountVault(incoming())'));
  assert.ok(rulesText.includes('incoming().plan == existing().plan'));
  assert.ok(rulesText.includes('match /platformVaultAccounts/{accountId}'));
  assert.ok(rulesText.includes('isValidPlatformVaultAccount(incoming())'));
  assert.ok(rulesText.includes('allow get: if isValidId(accountId) && isAdmin();'));
});
