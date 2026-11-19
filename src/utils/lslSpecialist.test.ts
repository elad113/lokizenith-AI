import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLslSystemPrompt,
  buildFastLokiCodePrompt,
  buildImageAwarePromptText,
  analyzeAndFixLslScript,
  simulateLslExecution,
  generateOfflineProfessionalLsl,
} from './lslSpecialist.ts';

test('buildLslSystemPrompt enforces LSL2/Mono compiler rules in new and edit modes', () => {
  const newSys = buildLslSystemPrompt({ mode: 'new', comments: true });
  assert.ok(newSys.includes('LSL2/Mono'));
  assert.ok(newSys.includes('NO "void" keyword'));
  assert.ok(newSys.includes('```lsl'));

  const editSys = buildLslSystemPrompt({ mode: 'edit', comments: false, hasImages: true });
  assert.ok(editSys.includes('editing an existing LSL'));
  assert.ok(editSys.includes('llSetLinkPrimitiveParamsFast'));
  assert.ok(editSys.includes('IMAGE ANALYSIS'));

  const pySys = buildFastLokiCodePrompt('python', { mode: 'new', hasImages: true });
  assert.ok(pySys.includes('```python'));
  assert.ok(pySys.includes('IMAGE ANALYSIS'));

  const imgOnlyPrompt = buildImageAwarePromptText('', 'lsl', true, 'edit');
  assert.ok(imgOnlyPrompt.includes('Inspect the attached image(s)'));
  assert.equal(buildImageAwarePromptText('fix line 12', 'lsl', true, 'edit'), 'fix line 12');
});

test('analyzeAndFixLslScript fixes mechanical C/JS slips without corrupting strings or comments', () => {
  const broken = `\`\`\`lsl
// Keep true and int intact in comment!
bool active = true;
int count = 0;
void sayHello()
{
    string label = "true int void stays literal";
    if (active == false || llGetOwner() == null_key) return;
    llOwnerSay(label);
}
default
{
    state_entry()
    {
        sayHello();
    }
`;
  const res = analyzeAndFixLslScript(broken);
  assert.equal(res.valid, true);
  assert.ok(res.fixes.length >= 2);
  assert.ok(res.code.includes('integer active = TRUE;'));
  assert.ok(res.code.includes('integer count = 0;'));
  assert.ok(res.code.includes('sayHello()'));
  assert.ok(!res.code.includes('void sayHello()'));
  // Ensure comments and quoted strings were preserved verbatim
  assert.ok(res.code.includes('// Keep true and int intact in comment!'));
  assert.ok(res.code.includes('"true int void stays literal"'));
  assert.equal(res.stats.states, 1);
  assert.equal(res.stats.events, 1);
  assert.equal(res.stats.functions, 1);
});

test('analyzeAndFixLslScript catches invalid LSL event parameter counts', () => {
  const badEvent = `
default
{
    touch_start()
    {
        llSay(0, "Bad signature");
    }
}
`;
  const res = analyzeAndFixLslScript(badEvent);
  assert.equal(res.valid, false);
  assert.ok(res.errors.some((e) => e.includes('touch_start')));
});

test('simulateLslExecution compiles and executes valid LSL events deterministically in milliseconds', () => {
  const script = `
integer g_chan = -4200;
integer g_handle = 0;

default
{
    state_entry()
    {
        llListenRemove(g_handle);
        g_handle = llListen(g_chan, "", NULL_KEY, "");
        llSetText("Terminal Ready", <0.0, 1.0, 0.5>, 1.0);
        llOwnerSay("Booted OK");
    }

    touch_start(integer total_number)
    {
        llRegionSayTo(llDetectedKey(0), 0, "Hello " + llDetectedName(0));
        llSetTimerEvent(2.0);
    }

    listen(integer channel, string name, key id, string message)
    {
        llSay(0, "Heard: " + message);
    }

    timer()
    {
        llOwnerSay("Timer tick");
    }
}
`;
  const sim = simulateLslExecution(script, 'activate\n');
  assert.equal(sim.status, 0);
  assert.equal(sim.stderr, '');
  assert.ok(sim.stdout.includes('[llOwnerSay] Booted OK'));
  assert.ok(sim.stdout.includes('[llRegionSayTo] Hello Resident Tester'));
  assert.ok(sim.stdout.includes('[llSay] Heard: activate'));
  assert.ok(sim.stdout.includes('[llOwnerSay] Timer tick'));
  assert.ok(sim.stdout.includes('[Mono Memory]'));
});

test('generateOfflineProfessionalLsl emits valid compilable pro scripts across all 12 domains', () => {
  const topics = [
    'parcel security orb with whitelist',
    'hovercraft vehicle physics script',
    'sliding automatic security door',
    'tip jar with particle burst and leaderboard',
    'custom radar HUD controller',
    'sit teleporter pad to skybox',
    'multi-page menu HUD control panel',
    'configurable neon particle fountain emitter',
    'secure HTTP JSON API webhook client',
    'visitor greeter welcome counter with notecard giver',
    'smart point-light glow color lamp dimmer',
    'multi-floor smooth building elevator lift',
  ];
  for (const t of topics) {
    const out = generateOfflineProfessionalLsl(t);
    const audit = analyzeAndFixLslScript(out);
    assert.equal(audit.valid, true, `Expected valid LSL for "${t}", errors: ${audit.errors.join('; ')}`);
    assert.ok(audit.stats.events >= 2);
  }
});
