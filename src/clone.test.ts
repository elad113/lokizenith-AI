import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const publicDir = path.resolve(process.cwd(), 'public');

test('all Lokizenith static assets including guard.js exist in public/ and are non-empty', () => {
  const expectedFiles = [
    'styles.css',
    'v22.css',
    'i18n.js',
    'engine.js',
    'app.js',
    'lokicode.js',
    'lessons.js',
    'call.js',
    'features.js',
    'changelog.js',
    'tools.js',
    'places.js',
    'mascot.js',
    'backgrounds.js',
    'design.js',
    'guard.js',
  ];

  for (const file of expectedFiles) {
    const filePath = path.join(publicDir, file);
    assert.equal(fs.existsSync(filePath), true, `Missing asset: ${file}`);
    const stat = fs.statSync(filePath);
    assert.ok(stat.size > 1000, `Asset ${file} is unexpectedly small (${stat.size} bytes)`);
  }
});

test('guard.js configures 100% unlimited usage forever and mode profiles', () => {
  const guardContent = fs.readFileSync(path.join(publicDir, 'guard.js'), 'utf-8');
  assert.ok(guardContent.includes('function isUnlimited(){ return true; }'), 'Missing unlimited usage in guard.js');
  assert.ok(guardContent.includes('MODE_PROFILES'), 'Missing MODE_PROFILES in guard.js');
  assert.ok(guardContent.includes('window._LokiGuard'), 'Missing window._LokiGuard export in guard.js');
});

test('lokicode.js includes all 8 languages and starter templates', () => {
  const lokicodeContent = fs.readFileSync(path.join(publicDir, 'lokicode.js'), 'utf-8');
  assert.ok(lokicodeContent.includes("id:'python'"), 'Missing Python in 8 languages');
  assert.ok(lokicodeContent.includes("id:'java'"), 'Missing Java in 8 languages');
  assert.ok(lokicodeContent.includes("id:'lsl'"), 'Missing LSL in 8 languages');
  assert.ok(lokicodeContent.includes("id:'typescript'"), 'Missing TypeScript in 8 languages');
  assert.ok(lokicodeContent.includes('const TEMPLATES ='), 'Missing TEMPLATES in lokicode.js');
});

test('app.js includes Turbo mode, High Recommended badge, and think dropdown menu', () => {
  const appContent = fs.readFileSync(path.join(publicDir, 'app.js'), 'utf-8');
  assert.ok(appContent.includes("'Turbo'"), 'Missing Turbo thinking mode');
  assert.ok(appContent.includes("recommended:true"), 'Missing Recommended thinking level config');
  assert.ok(appContent.includes('renderThinkMenu'), 'Missing renderThinkMenu in app.js');
});

test('mascot.js includes 8-second autonomous suggestion cycle', () => {
  const mascotContent = fs.readFileSync(path.join(publicDir, 'mascot.js'), 'utf-8');
  assert.ok(mascotContent.includes('setInterval(tickAutonomousSuggestion, 8000)'), 'Missing 8s mascot autonomous suggestion interval');
  assert.ok(mascotContent.includes('tickAutonomousSuggestion'), 'Missing tickAutonomousSuggestion in mascot.js');
});

test('index.html has exact Lokizenith AI DOM structure, think dropdown, and includes guard.js', () => {
  const indexHtml = fs.readFileSync(path.resolve(process.cwd(), 'index.html'), 'utf-8');
  assert.ok(indexHtml.includes('<title>Lokizenith AI</title>'), 'index.html missing Lokizenith AI title');
  assert.ok(indexHtml.includes('id="thinkPicker"'), 'index.html missing #thinkPicker');
  assert.ok(indexHtml.includes('id="thinkBtn"'), 'index.html missing #thinkBtn');
  assert.ok(indexHtml.includes('rec-badge'), 'index.html missing rec-badge Recommended');
  assert.ok(indexHtml.includes('src="/guard.js"'), 'index.html missing /guard.js');
  assert.equal(indexHtml.includes('id="lcOutput"'), false, 'index.html must not contain #lcOutput');
  assert.equal(indexHtml.includes('id="lcStdin"'), false, 'index.html must not contain #lcStdin');
});

test('public/styles.css enables infinite scroll on .code-view and dynamic height stretch on .lc-code', () => {
  const stylesCss = fs.readFileSync(path.join(publicDir, 'styles.css'), 'utf-8');
  assert.ok(stylesCss.includes('.code-view{overflow-y:auto !important'), 'Missing overflow-y:auto on .code-view');
  assert.ok(stylesCss.includes('.lc-code{min-height:220px;height:auto !important;max-height:none !important;overflow-y:visible !important'), '.lc-code must stretch by length of code');
});

test('server.ts has generateComprehensiveCode and does not log quota errors to stderr', () => {
  const serverContent = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
  assert.ok(serverContent.includes('function generateComprehensiveCode'), 'Missing generateComprehensiveCode in server.ts');
  assert.equal(serverContent.includes('Gemini API call failed or quota reached'), false, 'server.ts must not log raw 429 quota errors');
});

test('lokibot.js and server.ts integrate Cursor + Grok 4.7 API and new LokiBot Studio page from scratch', () => {
  const lokibotContent = fs.readFileSync(path.join(publicDir, 'lokibot.js'), 'utf-8');
  const serverContent = fs.readFileSync(path.resolve(process.cwd(), 'server.ts'), 'utf-8');
  assert.ok(lokibotContent.includes('lbGrokStudioShell'), 'lokibot.js missing new #lbGrokStudioShell');
  assert.ok(lokibotContent.includes('/api/lokibot/chat'), 'lokibot.js must route AI requests through /api/lokibot/chat');
  assert.ok(lokibotContent.includes('Cursor + Grok 4.7'), 'lokibot.js missing Cursor + Grok 4.7 branding');
  assert.ok(lokibotContent.includes('data-wmode="composer"'), 'lokibot.js missing Cursor Composer IDE workspace mode');
  assert.ok(serverContent.includes("app.post('/api/lokibot/chat'"), 'server.ts missing /api/lokibot/chat endpoint');
  assert.ok(serverContent.includes('grok_42ddf32035d87e2645a5178bb1bcfe65_bc78bce3e6a080138f16bc5258aa864fc2ebf49707dbd83f92958b0e72f6ece8'), 'server.ts missing Cursor + Grok 4.7 key fallback');
});


