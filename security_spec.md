# Security Specification (`security_spec.md`) — Lokizen Multi-User AI API Platform

## 1. Data Invariants & Master Sources of Truth
1. **Identity & Email Verification**: All standard write operations require an authenticated, email-verified user (`request.auth != null && request.auth.token.email_verified == true`).
2. **Bootstrapped & Registry Admin**: Administrator privileges (`isAdmin()`) are granted ONLY if `isVerifiedUser()` AND (`request.auth.token.email == 'benczelelad@gmail.com'` OR `exists(/databases/$(database)/documents/admins/$(request.auth.uid))`).
3. **PII Isolation**: User email addresses are strictly isolated inside `/users/{userId}/private/{docId}`, readable and writable ONLY by the owner (`request.auth.uid == userId`) or `isAdmin()`.
4. **Privilege Escalation Prevention**: Users creating `/users/{userId}` can only set `role == 'user'` (unless `isAdmin()`). Users updating `/users/{userId}` can only update `displayName` and `updatedAt`; they can never self-modify `role`, `quotaTokens`, or `rateLimitRpm`.
5. **Hashed API Keys Only**: `/apiKeys/{keyId}` documents MUST belong to an existing `/users/$(incoming().ownerId)` document, store ONLY a 64-character lowercase hex SHA-256 `keyHash` (`^[a-f0-9]{64}$`), and once `status == 'revoked'` (terminal state), non-admins cannot reactivate or mutate the key.
6. **Central Provider Protection**: `/providers/{providerId}` documents can ONLY be created, updated, or deleted by `isAdmin()`. Provider secret keys are never stored in Firestore.
7. **Immutable Request Logs**: `/requestLogs/{logId}` documents are append-only (`allow update: if false;`), require an existing user profile, and `allow list` enforces `resource.data.ownerId == request.auth.uid || isAdmin()`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Shadow Field Injection on UserProfile**: `{ uid: "u1", displayName: "Alice", role: "user", quotaTokens: 100000, usedTokens: 0, rateLimitRpm: 60, createdAt: SERVER_TIME, updatedAt: SERVER_TIME, isSuperAdmin: true }` -> Rejected by `hasOnly`.
2. **Self-Assigned Admin Role on Registration**: Non-admin user attempts to create `/users/u1` with `role: "admin"` -> Rejected by `incoming().role == 'user' || isAdmin()`.
3. **Unverified Email Spoof Attack**: Attacker with `email: "benczelelad@gmail.com"` but `email_verified: false` attempts admin write on `/providers/p1` -> Rejected by `request.auth.token.email_verified == true`.
4. **PII Cross-User Read**: Authenticated user `u2` attempts `get` on `/users/u1/private/info` -> Rejected by `isOwner(userId) || isAdmin()`.
5. **Plaintext API Key Storage Attempt**: User attempts to create `/apiKeys/k1` with a non-SHA256 `keyHash: "lkz-stark-plaintext-key"` -> Rejected by `keyHash.size() == 64 && keyHash.matches('^[a-f0-9]{64}$')`.
6. **Orphaned API Key Creation**: User `u1` attempts to create `/apiKeys/k1` when `/users/u1` does not exist -> Rejected by `exists(/databases/$(database)/documents/users/$(request.auth.uid))`.
7. **Terminal State Resurrection on Revoked API Key**: User `u1` attempts to update `/apiKeys/k1` from `status: "revoked"` back to `status: "active"` -> Rejected by terminal state lock `existing().status != 'revoked'`.
8. **Quota Tampering via API Key Update**: User `u1` attempts to update `quotaTokens: 999999999` on `/apiKeys/k1` -> Rejected by action-based `affectedKeys().hasOnly(['name', 'status', 'updatedAt'])` and immutable `incoming().quotaTokens == existing().quotaTokens`.
9. **Unauthorized Provider Creation**: Non-admin user `u1` attempts to create `/providers/custom_prov` -> Rejected by `isAdmin()`.
10. **Unbounded Model Array Denial-of-Wallet**: Admin attempts to create `/providers/p1` with `models` array of 500 items or non-string first element -> Rejected by `models.size() >= 1 && models.size() <= 20 && models[0] is string`.
11. **Client-Side Timestamp Forgery**: User attempts to create `/apiKeys/k1` with `createdAt: Timestamp.fromMillis(1000)` instead of `request.time` -> Rejected by `incoming().createdAt == request.time`.
12. **Cross-Tenant List Scraping on `/apiKeys` or `/requestLogs`**: User `u1` attempts an unfiltered `list` query across all users' `/apiKeys` -> Rejected by rule-enforced `resource.data.ownerId == request.auth.uid`.
