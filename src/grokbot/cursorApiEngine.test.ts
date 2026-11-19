import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluateVaultPurchaseRule,
  parseGrokSlashCommand,
  synthesizeGenerativeCardFromPrompt,
  buildPersistentContextPrompt,
} from './cursorApiEngine';
import { SEED_BOTS, SEED_VAULT_CARDS, SEED_SHOPPING_LIST } from './seedData';

test('evaluateVaultPurchaseRule completes automatically when order is within $80 limit and merchant is approved', () => {
  const card = SEED_VAULT_CARDS[0]; // Personal Everyday •••• 4829 ($80 maxSinglePurchase)
  const items = [
    { name: 'Lavazza Espresso Beans', qty: 1, price: 22.5 },
    { name: 'Oatly Barista 6-Pack', qty: 1, price: 24.0 },
  ];
  const res = evaluateVaultPurchaseRule(card, items, 'Amazon Fresh');
  assert.equal(res.status, 'completed');
  assert.equal(res.total, 46.5);
});

test('evaluateVaultPurchaseRule pauses for 1-click approval when total exceeds $80 limit', () => {
  const card = SEED_VAULT_CARDS[0];
  const items = [{ name: 'BenQ ScreenBar Halo', qty: 1, price: 109.0 }];
  const res = evaluateVaultPurchaseRule(card, items, 'Amazon');
  assert.equal(res.status, 'needs_approval');
  assert.equal(res.total, 109.0);
  assert.ok(res.reason.includes('exceeds pre-agreed $80.00'));
});

test('parseGrokSlashCommand parses /card, /shop, /code, and @bot mentions accurately', () => {
  const c1 = parseGrokSlashCommand('/shop organic espresso deals @scout');
  assert.equal(c1.command, 'shop');
  assert.ok(c1.mentionedHandles.includes('scout'));

  const c2 = parseGrokSlashCommand('/card sprint velocity tracker');
  assert.equal(c2.command, 'card');
  assert.equal(c2.cleanPrompt, 'sprint velocity tracker');

  const c3 = parseGrokSlashCommand('/code run python benchmark @builder');
  assert.equal(c3.command, 'code');
  assert.ok(c3.mentionedHandles.includes('builder'));
});

test('synthesizeGenerativeCardFromPrompt creates shopping, tracker, and mini-app cards', () => {
  const scout = SEED_BOTS.find((b) => b.handle === 'scout')!;
  const shopCard = synthesizeGenerativeCardFromPrompt(
    'Compare prices for coffee and milk',
    scout,
    SEED_SHOPPING_LIST,
    SEED_VAULT_CARDS
  );
  assert.equal(shopCard.category, 'shopping');
  assert.ok(Array.isArray(shopCard.shoppingRows) && shopCard.shoppingRows.length > 0);

  const trackerCard = synthesizeGenerativeCardFromPrompt(
    'Build a weekly budget and habit tracker',
    scout,
    SEED_SHOPPING_LIST,
    SEED_VAULT_CARDS
  );
  assert.equal(trackerCard.category, 'tracker');
  assert.ok(Array.isArray(trackerCard.trackerRows) && trackerCard.trackerRows.length > 0);
});

test('buildPersistentContextPrompt injects MEMORY.md, SKILL.md, Vault rules, and shopping list', () => {
  const ops = SEED_BOTS.find((b) => b.handle === 'ops')!;
  const prompt = buildPersistentContextPrompt(
    ops,
    SEED_VAULT_CARDS,
    SEED_SHOPPING_LIST,
    SEED_BOTS
  );
  assert.ok(prompt.includes('MEMORY.md'));
  assert.ok(prompt.includes('SKILL'));
  assert.ok(prompt.includes('Personal Everyday'));
  assert.ok(prompt.includes('4829'));
});
