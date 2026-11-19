import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildLslSystemPrompt,
  buildFastLokiCodePrompt,
  buildImageAwarePromptText,
  analyzeAndFixLslScript,
  simulateLslExecution,
  generateOfflineProfessionalLsl,
  checkLslIncremental,
} from './lslSpecialist.ts';
import { LSL_FUNCTION_NAMES } from './lslChecker.ts';

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

test('LSL checker flags the 12 required compile errors and accepts a long script quickly', () => {
  const expectError = (code: string, needle: RegExp) => {
    const res = analyzeAndFixLslScript(code);
    assert.equal(res.valid, false, `expected invalid for ${code}`);
    assert.ok(res.errors.some((e) => needle.test(e)), `errors [${res.errors.join(' | ')}] missing ${needle}`);
  };

  expectError('default{state_entry(){llSay(0,"hi")}}', /missing semicolon/i);
  expectError('default{state_entry(){llSay("hi");}}', /llSay expects 2/i);
  expectError('default{state_entry(){llSayy(0,"hi");}}', /unknown function llSayy/i);
  expectError('default{touch_start(string n){}}', /touch_start parameter must be integer/i);
  expectError('default{} foo(){}', /function declared after state/i);
  expectError('foo(){ state two; } default{}', /state change in function/i);
  expectError('default{state_entry(){ x = 5; }}', /undeclared variable 'x'/i);
  expectError('integer g = llGetUnixTime(); default{}', /non-constant global initialiser/i);
  expectError('default{state_entry(){ integer i = "5"; }}', /type mismatch/i);
  expectError('default{state_entry(){ switch(1){} }}', /switch not in LSL/i);
  expectError('default{state_entry(){ state missing; }}', /unknown state/i);

  expectError('default{ state_entry(){} state_entry(){} }', /declared twice/i);
  expectError('state_entry(){ llOwnerSay("x"); } default{}', /outside any state/i);
  expectError('default{state_entry(){ integer a; integer a; }}', /declared twice/i);
  expectError('default{state_entry(){ vector v = <1.0, 2.0>; }}', /vector built with 2 components/i);
  expectError('default{state_entry(){ return 1; }}', /return with a value inside an event/i);
  expectError('integer foo(){ integer x = 1; } default{}', /missing a return/i);
  expectError('default{state_entry(){ float f = .5f; }}', /float literal/i);
  expectError('default{state_entry(){ if (1 === 1) { } }}', /=== is not valid LSL/i);
  expectError('default{state_entry(){ while (1) { break; } }}', /break not in LSL/i);
  expectError('default{state_entry(){ integer n = 1; n += "nope"; }}', /type mismatch/i);

  const listenWarn = analyzeAndFixLslScript('default{state_entry(){ llListen(0, "", NULL_KEY, ""); }}');
  assert.ok(listenWarn.warnings.some((w) => /channel 0/i.test(w)));

  const timerWarn = analyzeAndFixLslScript('default{state_entry(){ llSetTimerEvent(2.0); }}');
  assert.ok(timerWarn.warnings.some((w) => /llSetTimerEvent/i.test(w)));

  const httpWarn = analyzeAndFixLslScript('default{state_entry(){ llHTTPRequest("https://example.com", [], ""); }}');
  assert.ok(httpWarn.warnings.some((w) => /http_response/i.test(w)));

  const huge = 'default{state_entry(){ llOwnerSay("' + 'x'.repeat(12000) + '"); }}';
  const mem = analyzeAndFixLslScript(huge);
  assert.ok(mem.warnings.some((w) => /55 KB/i.test(w)));

  assert.ok(LSL_FUNCTION_NAMES.includes('llSay'));
  assert.ok(LSL_FUNCTION_NAMES.includes('llSetLinkPrimitiveParamsFast'));
  assert.ok(LSL_FUNCTION_NAMES.length > 150);

  const lines: string[] = [
    '// Vendor HUD — touch menu, listen, timer, dataserver',
    'integer gChan = -88021;',
    'integer gHandle = 0;',
    'integer gPage = 0;',
    'integer gLive = FALSE;',
    'key gOwner = NULL_KEY;',
    'key gQuery = NULL_KEY;',
    'integer gStep = 0;',
    'string gCard = "VendorConfig";',
    'list gNames;',
    '',
    'string productLabel(integer idx)',
    '{',
    '    if (idx < 0) return "none";',
    '    return "Item " + (string)idx;',
    '}',
    '',
    'openPage(key who, integer page)',
    '{',
    '    llListenRemove(gHandle);',
    '    gHandle = llListen(gChan, "", who, "");',
    '    gLive = TRUE;',
    '    gPage = page;',
    '    llSetTimerEvent(30.0);',
    '    llDialog(who, "Vendor page " + (string)page, ["Next", "Back", "Buy", "Info", "Close"], gChan);',
    '}',
    '',
    'default',
    '{',
    '    state_entry()',
    '    {',
    '        gOwner = llGetOwner();',
    '        llSetText("Vendor HUD", <0.2, 1.0, 0.6>, 1.0);',
    '        llOwnerSay("Vendor ready");',
    '    }',
    '',
    '    touch_start(integer total_number)',
    '    {',
    '        key who = llDetectedKey(0);',
    '        if (who != gOwner)',
    '        {',
    '            llRegionSayTo(who, 0, "Owner only");',
    '            return;',
    '        }',
    '        openPage(who, 0);',
    '    }',
    '',
    '    listen(integer channel, string name, key id, string message)',
    '    {',
    '        if (channel != gChan || id != gOwner) return;',
    '        if (message == "Close")',
    '        {',
    '            llSetTimerEvent(0.0);',
    '            llListenRemove(gHandle);',
    '            gLive = FALSE;',
    '            return;',
    '        }',
    '        if (message == "Next")',
    '        {',
    '            openPage(id, gPage + 1);',
    '            return;',
    '        }',
    '        if (message == "Back")',
    '        {',
    '            if (gPage > 0) openPage(id, gPage - 1);',
    '            return;',
    '        }',
    '        if (message == "Info")',
    '        {',
    '            gQuery = llGetNotecardLine(gCard, 0);',
    '            return;',
    '        }',
  ];
  for (let n = 0; n < 28; n++) {
    lines.push(`        if (message == "B${n}")`);
    lines.push('        {');
    lines.push(`            llRegionSayTo(id, 0, productLabel(${n}));`);
    lines.push('            llSetTimerEvent(0.0);');
    lines.push('            return;');
    lines.push('        }');
  }
  lines.push('    }');
  lines.push('');
  lines.push('    timer()');
  lines.push('    {');
  lines.push('        llSetTimerEvent(0.0);');
  lines.push('        llListenRemove(gHandle);');
  lines.push('        gLive = FALSE;');
  lines.push('        llOwnerSay("Menu timed out");');
  lines.push('    }');
  lines.push('');
  lines.push('    dataserver(key queryid, string data)');
  lines.push('    {');
  lines.push('        if (queryid != gQuery) return;');
  lines.push('        if (data == EOF)');
  lines.push('        {');
  lines.push('            gQuery = NULL_KEY;');
  lines.push('            return;');
  lines.push('        }');
  lines.push('        gNames += [data];');
  lines.push('        gStep = gStep + 1;');
  lines.push('        gQuery = llGetNotecardLine(gCard, gStep);');
  lines.push('        llOwnerSay(data);');
  lines.push('    }');
  lines.push('');
  lines.push('    changed(integer change)');
  lines.push('    {');
  lines.push('        if (change & CHANGED_OWNER) llResetScript();');
  lines.push('    }');
  lines.push('');
  lines.push('    on_rez(integer start_param)');
  lines.push('    {');
  lines.push('        llResetScript();');
  lines.push('    }');
  lines.push('}');
  while (lines.length < 220) lines.push('// pad');
  const script = lines.join('\n');
  assert.ok(script.split('\n').length >= 220);
  const t0 = performance.now();
  const audit = analyzeAndFixLslScript(script);
  const dt = performance.now() - t0;
  assert.equal(audit.valid, true, audit.errors.join(' | '));
  assert.equal(audit.errors.length, 0);
  assert.ok(dt < 50, `checker took ${dt.toFixed(1)}ms`);

  const partial = checkLslIncremental('default\n{\nstate_entry()\n{\n    llSay(0, "hi"');
  assert.equal(partial.errors.length, 0);
  const doneLine = checkLslIncremental('default{state_entry(){llSay(0,"hi")}}');
  assert.ok(doneLine.errors.some((e) => /semicolon/i.test(e)));
});
