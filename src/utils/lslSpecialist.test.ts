import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLslSystemPrompt,
  buildChatLslDirective,
  detectLslIntent,
  analyzeAndFixLslScript,
  simulateLslExecution,
  generateOfflineProfessionalLsl,
} from './lslSpecialist';

test('buildLslSystemPrompt instructs full production LSL2/Mono scripts without short/compact throttling', () => {
  const newPrompt = buildLslSystemPrompt({ mode: 'new', comments: true });
  assert.doesNotMatch(newPrompt, /\bstay compact\b/i);
  assert.match(newPrompt, /NO ternary operator/i);
  assert.match(newPrompt, /NO switch\/case/i);
  assert.match(newPrompt, /NO inline loop declarations/i);
  assert.match(newPrompt, /NO function calls in global initializers/i);
  assert.match(newPrompt, /130-280\+ lines/i);

  const editPrompt = buildLslSystemPrompt({ mode: 'edit', comments: true });
  assert.match(editPrompt, /NO ternary operator/i);
  assert.match(editPrompt, /without truncating/i);
});

test('detectLslIntent matches Second Life / OpenSim / LSL prompts in English and Hebrew without false positives', () => {
  assert.equal(detectLslIntent('Write a Second Life LSL security orb script'), true);
  assert.equal(detectLslIntent('Fix my llSetLinkPrimitiveParamsFast in OpenSim'), true);
  assert.equal(detectLslIntent('תכתוב לי סקריפט לסקנד לייף לדלת אוטומטית'), true);
  assert.equal(detectLslIntent('Build a Python Flask REST API'), false);
  assert.equal(detectLslIntent('What is the weather in Tokyo?'), false);
  assert.match(buildChatLslDirective(), /NEVER use the ternary operator/i);
});

test('analyzeAndFixLslScript detects illegal LSL2/Mono syntax errors', () => {
  const brokenTernary = `integer g_on = TRUE;
default
{
    state_entry()
    {
        llOwnerSay(g_on ? "ON" : "OFF");
    }
}`;
  const r1 = analyzeAndFixLslScript(brokenTernary);
  assert.equal(r1.valid, false);
  assert.ok(r1.errors.some((e) => /ternary operator/i.test(e)));

  const brokenSwitch = `default
{
    state_entry()
    {
        integer x = 1;
        switch (x)
        {
            case 1:
                llOwnerSay("one");
                break;
        }
    }
}`;
  const r2 = analyzeAndFixLslScript(brokenSwitch);
  assert.equal(r2.valid, false);
  assert.ok(r2.errors.some((e) => /switch\/case/i.test(e)));
  assert.ok(r2.errors.some((e) => /break\/continue/i.test(e)));

  const brokenGlobalCall = `key g_owner = llGetOwner();
default
{
    state_entry()
    {
        llOwnerSay((string)g_owner);
    }
}`;
  const r3 = analyzeAndFixLslScript(brokenGlobalCall);
  assert.equal(r3.valid, false);
  assert.ok(r3.errors.some((e) => /Global variable `g_owner` cannot be initialized with a function call/i.test(e)));

  const brokenIndex = `list g_items = ["a", "b"];
default
{
    state_entry()
    {
        string first = g_items[0];
        llOwnerSay(first);
    }
}`;
  const r4 = analyzeAndFixLslScript(brokenIndex);
  assert.equal(r4.valid, false);
  assert.ok(r4.errors.some((e) => /bracket indexing/i.test(e)));
});

test('analyzeAndFixLslScript auto-repairs void, int/bool/double, hallucinated ll*, and inline for-loop declarations', () => {
  const messy = `\`\`\`lsl
const int g_max = 5;
bool g_ready = true;
double g_rate = 1.5;

void runLoop()
{
    list items = ["a", "b"];
    integer n = llListLength(items);
    integer len = llLength("hello");
    float r = llRand(1.0);
    for (integer i = 0; i < n; ++i)
    {
        llOwnerSay(llList2String(items, i) + (string)len + (string)r);
    }
}

default
{
    state_entry()
    {
        runLoop();
    }
}
\`\`\``;
  const audit = analyzeAndFixLslScript(messy);
  assert.equal(audit.valid, true, `Expected valid after auto-fix, got errors: ${audit.errors.join('; ')}`);
  assert.doesNotMatch(audit.code, /\bvoid\b/);
  assert.doesNotMatch(audit.code, /\bconst\b/);
  assert.doesNotMatch(audit.code, /\bllListLength\b/);
  assert.doesNotMatch(audit.code, /\bllLength\b/);
  assert.doesNotMatch(audit.code, /\bllRand\b/);
  assert.match(audit.code, /integer i;\n\s*for \(i = 0;/);
  assert.ok(audit.fixes.length >= 3);
});

test('analyzeAndFixLslScript does not false-positive on question marks or brackets inside strings/comments', () => {
  const validWithStrings = `// Is this valid? Yes: totally fine! arr[0] in comment
list g_opts = ["Ready?", "Go: Now"];
default
{
    state_entry()
    {
        llOwnerSay("Question? Answer: [ok]");
    }
}`;
  const audit = analyzeAndFixLslScript(validWithStrings);
  assert.equal(audit.valid, true, `Unexpected errors: ${audit.errors.join('; ')}`);
});

test('analyzeAndFixLslScript rejects invented ll* functions, unknown events, illegal types, llRot2Euler list misuse, and raw degrees', () => {
  const hallucinatedScript = `event g_bad = 0;
default
{
    state_entry()
    {
        float a = llAngleClamp(10.0);
        llMagicWarp(1.0);
        list angles = llRot2Euler(llGetRot());
        rotation r = llEuler2Rot(<0.0, 0.0, 90.0>);
        llOwnerSay((string)a + (string)angles + (string)r);
    }

    chat(integer ch, string name, key id, string msg)
    {
        llOwnerSay(msg);
    }
}`;
  const res = analyzeAndFixLslScript(hallucinatedScript);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => /`event`/i.test(e)));
  assert.ok(res.errors.some((e) => /llAngleClamp/i.test(e)));
  assert.ok(res.errors.some((e) => /llMagicWarp/i.test(e)));
  assert.ok(res.errors.some((e) => /llRot2Euler/i.test(e)));
  assert.ok(res.errors.some((e) => /llEuler2Rot.*radians/i.test(e)));
  assert.ok(res.errors.some((e) => /Unknown LSL event `chat/i.test(e)));

  const validRotAndRad = `default
{
    state_entry()
    {
        vector deg = llRot2Euler(llGetRot()) * RAD_TO_DEG;
        rotation r = llEuler2Rot(<0.0, 0.0, 90.0> * DEG_TO_RAD);
        llOwnerSay((string)deg + (string)r);
    }
}`;
  const okRes = analyzeAndFixLslScript(validRotAndRad);
  assert.equal(okRes.valid, true, `Expected valid LSL, got: ${okRes.errors.join('; ')}`);
});

test('every offline LSL template is rich (>= 100 lines), 100% valid LSL2/Mono, and compiles cleanly in simulator', () => {
  const prompts = [
    'parcel security orb with whitelist and radar',
    'physics hovercraft vehicle controller',
    'smart sliding door with sensor',
    'tip jar with donor leaderboard',
    'multi-destination sit teleporter',
    'multi-page HUD menu controller',
    'aurora particle FX emitter',
    'HTTP JSON webhook client bridge',
    'visitor greeter and counter',
    'smart point light dimmer lamp',
    'multi-floor smooth elevator lift',
    'custom interactive prim controller',
  ];

  for (const prompt of prompts) {
    const fenced = generateOfflineProfessionalLsl(prompt);
    assert.ok(fenced.startsWith('```lsl\n'), `Template for "${prompt}" should start with \`\`\`lsl fence`);
    assert.ok(fenced.endsWith('\n```'), `Template for "${prompt}" should end with closing fence`);

    const audit = analyzeAndFixLslScript(fenced);
    assert.equal(
      audit.valid,
      true,
      `Template for "${prompt}" failed LSL compiler audit: ${audit.errors.join(' | ')}`
    );
    assert.equal(
      audit.warnings.length,
      0,
      `Template for "${prompt}" had warnings: ${audit.warnings.join(' | ')}`
    );
    assert.ok(
      audit.stats.lines >= 100,
      `Template for "${prompt}" should be thorough (>= 100 lines), got ${audit.stats.lines}`
    );
    assert.equal(audit.stats.hasOwnerChangeReset, true, `Template for "${prompt}" must reset on owner/rez`);

    const sim = simulateLslExecution(audit.code);
    assert.equal(sim.status, 0, `Simulator failed for "${prompt}": ${sim.stderr}`);
  }
});

test('analyzeAndFixLslScript auto-hoists user helper functions mistakenly placed inside default state block', () => {
  const misplacedHelpers = `integer g_count = 0;
default
{
    ejectIfNotWhitelisted(key id)
    {
        llOwnerSay("Checking " + (string)id);
    }

    integer addOne(integer x)
    {
        return x + 1;
    }

    state_entry()
    {
        g_count = addOne(g_count);
        ejectIfNotWhitelisted(llGetOwner());
    }
}`;
  const res = analyzeAndFixLslScript(misplacedHelpers);
  assert.equal(res.valid, true, `Expected valid after hoisting helper functions, got errors: ${res.errors.join('; ')}`);
  assert.ok(res.fixes.some((f) => /Hoisted 2 user helper function/i.test(f)));
  assert.ok(res.code.indexOf('ejectIfNotWhitelisted') < res.code.indexOf('default'));
});

