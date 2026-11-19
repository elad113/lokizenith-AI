import { buildMatlabSystemPrompt } from './matlabSpecialist.ts';
import {
  formatLslDiagnostics,
  lintLslScript,
  stableLslPrefix,
  estimateMonoBytes,
} from './lslChecker.ts';

export interface LslAuditStats {
  lines: number;
  states: number;
  events: number;
  functions: number;
  llCalls: number;
  globals: number;
  estimatedMonoBytes: number;
  hasListen: boolean;
  hasListenRemove: boolean;
  hasOwnerChangeReset: boolean;
}

export interface LslAuditResult {
  code: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
  stats: LslAuditStats;
}

export interface LslSimulationResult {
  status: number;
  stdout: string;
  stderr: string;
  compilerName: string;
  compileStage: string;
  stats: LslAuditStats;
}

const CANONICAL_LSL_EVENTS: Record<string, { minArgs: number; signature: string }> = {
  state_entry: { minArgs: 0, signature: 'state_entry()' },
  state_exit: { minArgs: 0, signature: 'state_exit()' },
  touch_start: { minArgs: 1, signature: 'touch_start(integer total_number)' },
  touch: { minArgs: 1, signature: 'touch(integer total_number)' },
  touch_end: { minArgs: 1, signature: 'touch_end(integer total_number)' },
  listen: { minArgs: 4, signature: 'listen(integer channel, string name, key id, string message)' },
  timer: { minArgs: 0, signature: 'timer()' },
  sensor: { minArgs: 1, signature: 'sensor(integer num_detected)' },
  no_sensor: { minArgs: 0, signature: 'no_sensor()' },
  on_rez: { minArgs: 1, signature: 'on_rez(integer start_param)' },
  changed: { minArgs: 1, signature: 'changed(integer change)' },
  attach: { minArgs: 1, signature: 'attach(key id)' },
  control: { minArgs: 3, signature: 'control(key id, integer level, integer edge)' },
  run_time_permissions: { minArgs: 1, signature: 'run_time_permissions(integer perm)' },
  dataserver: { minArgs: 2, signature: 'dataserver(key queryid, string data)' },
  http_response: { minArgs: 4, signature: 'http_response(key request_id, integer status, list metadata, string body)' },
  http_request: { minArgs: 3, signature: 'http_request(key id, string method, string body)' },
  money: { minArgs: 2, signature: 'money(key id, integer amount)' },
  collision_start: { minArgs: 1, signature: 'collision_start(integer total_number)' },
  collision: { minArgs: 1, signature: 'collision(integer total_number)' },
  collision_end: { minArgs: 1, signature: 'collision_end(integer total_number)' },
  land_collision_start: { minArgs: 1, signature: 'land_collision_start(vector pos)' },
  link_message: { minArgs: 4, signature: 'link_message(integer sender_num, integer num, string str, key id)' },
  object_rez: { minArgs: 1, signature: 'object_rez(key id)' },
  transaction_result: { minArgs: 3, signature: 'transaction_result(key id, integer success, string data)' },
  experience_permissions: { minArgs: 1, signature: 'experience_permissions(key agent)' },
  experience_permissions_denied: { minArgs: 2, signature: 'experience_permissions_denied(key agent, integer reason)' },
  at_target: { minArgs: 3, signature: 'at_target(integer tnum, vector targetpos, vector ourpos)' },
  not_at_target: { minArgs: 0, signature: 'not_at_target()' },
  email: { minArgs: 5, signature: 'email(string time, string address, string subj, string message, integer num_left)' },
};

export function buildLslSystemPrompt(opts: { mode?: 'new' | 'edit'; comments?: boolean; hasImages?: boolean } = {}): string {
  const isEdit = opts.mode === 'edit';
  const wantComments = opts.comments !== false;
  const visionRule = opts.hasImages
    ? '\n- IMAGE ANALYSIS: Carefully read any attached screenshot (Second Life LSL compiler/syntax error dialog, debug console, UI HUD, or code example) and fix/implement every detail accurately.'
    : '';

  if (isEdit) {
    return `Principal Second Life LSL2/Mono Scripter editing an existing LSL script.
Order: globals -> helpers (NO "void") -> default {} -> states. Valid types: integer, float, string, key, vector, rotation, list. vector is <x,y,z>, rotation is <x,y,z,s>, list is [ ].
Every statement ends with ;. Declare every variable. No switch, ternary ?:, ===, class, const, var, let, break, continue. No global function-call initialisers. No state changes inside user functions. Events cannot return a value. Mono limit 64KB.
Use exact ll* arity: llSay(integer,string), llListen(integer,string,key,string), llListenRemove(integer), llSetTimerEvent(float), llRegionSayTo(key,integer,string), llSetLinkPrimitiveParamsFast(integer,list).${visionRule}
${wantComments ? 'Brief comments on changes.' : 'Minimal comments.'}
Start line 1 with \`\`\`lsl and output ONLY the updated code block.`;
  }

  return `Principal Second Life LSL2/Mono Scripter. Write complete, compile-clean LSL immediately (as long as the request needs — do not truncate features).
Order: typed globals -> concise helpers (NO "void" keyword) -> default { events } -> named states.
Types: integer, float, string, key, vector, rotation, list. key accepts a string UUID. vector is <x,y,z> (3 components). rotation is <x,y,z,s> (4). list is [a, b]. Constants: TRUE, FALSE, NULL_KEY, ZERO_VECTOR, ZERO_ROTATION.
Events: state_entry(), touch_start(integer n), listen(integer channel, string name, key id, string message), timer(), sensor(integer n), changed(integer change), on_rez(integer start), attach(key id), money(key id, integer amount), dataserver(key query, string data), http_response(key id, integer status, list meta, string body), link_message(integer sender, integer num, string str, key id).
Rules: semicolon after every statement; declare every variable before use; no undeclared names; no switch, ternary ?:, ===, class, const, var, let, break, continue, or function keyword; user functions sit above all states; no state changes inside user functions; no value returned from events; globals initialise with constants only (no ll* calls). Mono memory limit is 64KB.
ll* signatures: llSay(integer,string), llOwnerSay(string), llListen(integer,string,key,string), llListenRemove(integer), llSetTimerEvent(float) and later llSetTimerEvent(0.0), llRegionSayTo(key,integer,string), llDialog(key,string,list,integer), llSetLinkPrimitiveParamsFast(integer,list), llHTTPRequest(string,list,string) paired with http_response.
Best practices: llListenRemove before llListen, avoid channel 0, CHANGED_OWNER/on_rez reset, llSetLinkPrimitiveParamsFast, llRegionSayTo.${visionRule}
${wantComments ? 'Short 1-line block comments.' : 'Minimal comments.'}
Start line 1 IMMEDIATELY with \`\`\`lsl and end with \`\`\`. No text outside the fence.`;
}

export function buildFastLokiCodePrompt(
  langId: string,
  opts: { mode?: 'new' | 'edit'; comments?: boolean; hasImages?: boolean } = {}
): string {
  const id = String(langId || 'python').toLowerCase().trim();
  if (id === 'lsl') {
    return buildLslSystemPrompt(opts);
  }
  if (id === 'matlab') {
    return buildMatlabSystemPrompt(opts);
  }

  const isEdit = opts.mode === 'edit';
  const wantComments = opts.comments !== false;
  const visionRule = opts.hasImages
    ? '\n- IMAGE ANALYSIS: Carefully inspect all attached image(s) (error messages, stack traces, compiler line numbers, code screenshots, or visual UI/logic examples) and fix or build the complete code accordingly.'
    : '';
  const rules: Record<string, string> = {
    python: 'Idiomatic Python 3 (stdlib only) with type hints, clean modular functions, edge-case handling, and `if __name__ == "__main__": main()`.',
    java: 'Production-grade Java 22 with `public class Main`, `public static void main(String[] args)`, clean helper methods, and proper edge-case validation.',
    javascript: 'Clean, zero-dependency ES2024 JavaScript with modular functions, strict edge-case handling, and crisp formatted output.',
    typescript: 'Strictly-typed ES2024 TypeScript with explicit interfaces/types, zero `any` leaks, and runnable entry logic.',
    html: 'Single self-contained HTML5 document (`<!DOCTYPE html><html>...</html>`) with polished responsive CSS, smooth interactions, and zero broken dependencies.',
    cpp: 'Modern C++20 with `#include <iostream>` and `int main()`, RAII/STL containers, zero UB/leaks, and clean modular structure.',
    csharp: 'Clean C# (.NET 8 / Mono compatible) with `using System;`, `class Program { static void Main() { ... } }`, and idiomatic structure.',
    matlab: 'Complete runnable MATLAB (.m) script using `disp`, `fprintf`, vectorized matrix ops, and `for`/`end` blocks.',
    rust: 'Idiomatic, zero-warning Rust 2021 (`fn main()`) using stdlib only, clean ownership/borrowing, `Result`/edge-case handling, and clear output.',
    go: 'Idiomatic Go 1.22 (`package main`, `import (...)`, `func main()`) using stdlib only, proper error handling, and zero unused imports/vars.',
  };

  if (isEdit) {
    return `You are LokiCode Principal Engineer in EDIT MODE for ${id}. Apply requested edits cleanly with higher code quality, zero regressions, and optimal complexity.${visionRule} ${
      wantComments ? 'Keep concise comments where modified.' : 'Minimal comments.'
    } Start line 1 IMMEDIATELY with \`\`\`${id} and output ONLY the complete updated fenced code block.`;
  }

  return `You are LokiCode Principal Compiler Engineer for ${id}. Write clean, fast, production-grade code immediately.
- Spec: ${rules[id] || `Complete runnable ${id} code.`}${visionRule}
- Quality: Optimal algorithm, handle edge cases cleanly, zero placeholders/TODOs, zero dead code, compact & crisp.
- ${wantComments ? 'Concise high-signal comments only.' : 'Minimal comments.'}
- Output ONLY a single fenced \`\`\`${id} ... \`\`\` block starting on line 1 with zero prose before or after.`;
}

export function buildImageAwarePromptText(
  userPrompt: string,
  langId: string,
  hasImages: boolean,
  mode: 'new' | 'edit' = 'new'
): string {
  const trimmed = String(userPrompt || '').trim();
  if (trimmed) return trimmed;
  if (!hasImages) return '';
  if (mode === 'edit') {
    return `Inspect the attached image(s) for errors, stack traces, or visual/behavioral improvements and update the ${langId.toUpperCase()} code cleanly.`;
  }
  return `Analyze the attached image(s) (any error screenshot, compiler output, code example, or visual design) and write complete, runnable ${langId.toUpperCase()} code implementing or fixing what is shown.`;
}

/**
 * Masks string literals and comments with spaces (preserving line breaks) so bracket/keyword
 * scanners never false-positive on text inside quotes or // /* *\/ comments.
 */
function maskLslStringsAndComments(src: string): string {
  const chars = src.split('');
  const n = chars.length;
  let i = 0;
  while (i < n) {
    const ch = chars[i];
    const next = chars[i + 1];
    // Line comment //
    if (ch === '/' && next === '/') {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      while (i < n && chars[i] !== '\n') {
        chars[i] = ' ';
        i++;
      }
      continue;
    }
    // Block comment /* ... */
    if (ch === '/' && next === '*') {
      chars[i] = ' ';
      chars[i + 1] = ' ';
      i += 2;
      while (i < n && !(chars[i] === '*' && chars[i + 1] === '/')) {
        if (chars[i] !== '\n') chars[i] = ' ';
        i++;
      }
      if (i < n) {
        chars[i] = ' ';
        chars[i + 1] = ' ';
        i += 2;
      }
      continue;
    }
    // String literal "..."
    if (ch === '"') {
      chars[i] = ' ';
      i++;
      while (i < n) {
        if (chars[i] === '\\' && i + 1 < n) {
          if (chars[i] !== '\n') chars[i] = ' ';
          if (chars[i + 1] !== '\n') chars[i + 1] = ' ';
          i += 2;
          continue;
        }
        const cur = chars[i];
        if (cur !== '\n') chars[i] = ' ';
        i++;
        if (cur === '"') break;
      }
      continue;
    }
    i++;
  }
  return chars.join('');
}

/**
 * Rewrites mechanical code tokens ONLY outside strings and comments.
 */
function transformLslOutsideLiterals(
  src: string,
  replacer: (segment: string) => { text: string; changed: boolean }
): { code: string; changed: boolean } {
  let out = '';
  let buf = '';
  let changed = false;
  const flushBuf = () => {
    if (!buf) return;
    const res = replacer(buf);
    out += res.text;
    if (res.changed) changed = true;
    buf = '';
  };

  let i = 0;
  const n = src.length;
  while (i < n) {
    const ch = src[i];
    const next = src[i + 1];
    if (ch === '/' && next === '/') {
      flushBuf();
      const start = i;
      while (i < n && src[i] !== '\n') i++;
      out += src.slice(start, i);
      continue;
    }
    if (ch === '/' && next === '*') {
      flushBuf();
      const start = i;
      i += 2;
      while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i++;
      i = Math.min(n, i + 2);
      out += src.slice(start, i);
      continue;
    }
    if (ch === '"') {
      flushBuf();
      const start = i;
      i++;
      while (i < n) {
        if (src[i] === '\\' && i + 1 < n) {
          i += 2;
          continue;
        }
        i++;
        if (src[i - 1] === '"') break;
      }
      out += src.slice(start, i);
      continue;
    }
    buf += ch;
    i++;
  }
  flushBuf();
  return { code: out, changed };
}

export function stripMarkdownCodeFence(raw: string): string {
  const text = String(raw || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  const fenceMatch = text.match(/```(?:[\w+#.-]*)\s*\n([\s\S]*?)(?:```|$)/);
  if (fenceMatch && fenceMatch[1]) {
    return fenceMatch[1].replace(/\s+$/, '');
  }
  return text.replace(/^```[^\n]*\n?/, '').replace(/```$/, '').trim();
}

export function analyzeAndFixLslScript(rawCode: string): LslAuditResult {
  let fixed = stripMarkdownCodeFence(String(rawCode || '').replace(/\r\n/g, '\n'));
  const fixes: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  if (String(rawCode || '').trim().startsWith('```')) {
    fixes.push('Stripped markdown code fences');
  }

  // Safe mechanical LSL type & keyword fixes outside strings/comments
  const tokenFix = transformLslOutsideLiterals(fixed, (seg) => {
    let s = seg;
    let changed = false;
    const rules: Array<[RegExp, string]> = [
      [/\bvoid\s+([A-Za-z_]\w*\s*\()/g, '$1'],
      [/\bint\s+([A-Za-z_]\w*)/g, 'integer $1'],
      [/\b(?:boolean|bool)\s+([A-Za-z_]\w*)/g, 'integer $1'],
      [/\btrue\b/g, 'TRUE'],
      [/\bfalse\b/g, 'FALSE'],
      [/\bnull_key\b/g, 'NULL_KEY'],
      [/\bzero_vector\b/g, 'ZERO_VECTOR'],
      [/\bzero_rotation\b/g, 'ZERO_ROTATION'],
    ];
    for (const [re, rep] of rules) {
      const next = s.replace(re, rep);
      if (next !== s) {
        s = next;
        changed = true;
      }
    }
    return { text: s, changed };
  });
  if (tokenFix.changed) {
    fixed = tokenFix.code;
    fixes.push('Normalized LSL types/constants (integer, TRUE/FALSE, NULL_KEY, removed void)');
  }

  // Ensure default state exists
  const preMasked = maskLslStringsAndComments(fixed);
  if (fixed.trim() && !/\bdefault\s*\{/.test(preMasked)) {
    fixed = `// Auto-wrapped in required LSL default state\ndefault\n{\n    state_entry()\n    {\n        ${fixed.replace(/\n/g, '\n        ')}\n    }\n}`;
    fixes.push('Added required LSL `default { state_entry() }` block');
  }

  // Check & repair curly brace balance
  let masked = maskLslStringsAndComments(fixed);
  let braces = 0;
  let parens = 0;
  let brackets = 0;
  for (let i = 0; i < masked.length; i++) {
    const c = masked[i];
    if (c === '{') braces++;
    else if (c === '}') braces--;
    else if (c === '(') parens++;
    else if (c === ')') parens--;
    else if (c === '[') brackets++;
    else if (c === ']') brackets--;
  }
  if (braces > 0) {
    fixed += '\n' + '}'.repeat(braces);
    fixes.push(`Closed ${braces} unclosed curly brace(s)`);
    masked = maskLslStringsAndComments(fixed);
    braces = 0;
  } else if (braces < 0) {
    errors.push(`Extra closing '}' brace(s) detected (${Math.abs(braces)})`);
  }
  if (parens !== 0) {
    errors.push(`Unbalanced parentheses '(' / ')' (${parens > 0 ? 'missing )' : 'extra )'})`);
  }
  if (brackets !== 0) {
    errors.push(`Unbalanced list brackets '[' / ']' (${brackets > 0 ? 'missing ]' : 'extra ]'})`);
  }

  if (!fixed.trim()) {
    errors.push('Script is empty');
  } else if (!/\bdefault\s*\{/.test(masked)) {
    errors.push('Missing mandatory `default` state');
  }

  // Check canonical LSL event signatures inside states
  let eventCount = 0;
  const eventDeclRe = /(?:^|\n|\{)\s*([a-z][a-z0-9_]*)\s*\(([^)]*)\)\s*\{/g;
  let evMatch: RegExpExecArray | null;
  while ((evMatch = eventDeclRe.exec(masked)) !== null) {
    const evName = evMatch[1];
    const params = evMatch[2].trim();
    const spec = CANONICAL_LSL_EVENTS[evName];
    if (spec) {
      eventCount++;
      const actualArgCount = params ? params.split(',').filter((x) => x.trim()).length : 0;
      if (actualArgCount !== spec.minArgs) {
        errors.push(`Event \`${evName}\` expects ${spec.minArgs} parameter(s) (${spec.signature}), found ${actualArgCount}`);
      }
    }
  }

  // Stats inspection
  const stateMatches = masked.match(/\b(?:default|state\s+[A-Za-z_]\w*)\s*\{/g) || [];
  const llCallMatches = masked.match(/\bll[A-Z][A-Za-z0-9_]*\s*\(/g) || [];
  const funcMatches = masked.match(/(?:^|\n)\s*(?:(?:integer|float|string|key|vector|rotation|list)\s+)?([A-Za-z_]\w*)\s*\([^)]*\)\s*\{/g) || [];
  const globalMatches = masked.match(/(?:^|\n)(?:integer|float|string|key|vector|rotation|list)\s+[A-Za-z_]\w*\s*(?:=|;)/g) || [];

  const hasListen = /\bllListen\s*\(/.test(masked);
  const hasListenRemove = /\bllListenRemove\s*\(/.test(masked);
  const hasOwnerChangeReset = /\bCHANGED_OWNER\b|\bon_rez\b/.test(masked);

  if (hasListen && !hasListenRemove) {
    warnings.push('`llListen(...)` used without `llListenRemove(handle)` — consider cleaning handles before re-opening');
  }
  if (/\bllSleep\s*\(/.test(masked)) {
    warnings.push('`llSleep(...)` blocks all LSL events; prefer `llSetTimerEvent(...)` for non-blocking delays');
  }
  if (/\bllGetOwner\s*\(/.test(masked) && !hasOwnerChangeReset) {
    warnings.push('Uses `llGetOwner()` without `changed(CHANGED_OWNER)` or `on_rez` reset');
  }

  const lines = fixed.trim() ? fixed.trim().split('\n').length : 0;
  const estimatedMonoBytes = Math.min(65536, estimateMonoBytes(fixed));
  const lint = lintLslScript(fixed);
  for (const msg of formatLslDiagnostics(lint.errors)) {
    if (!errors.includes(msg)) errors.push(msg);
  }
  for (const msg of formatLslDiagnostics(lint.warnings)) {
    if (!warnings.includes(msg)) warnings.push(msg);
  }

  return {
    code: fixed,
    valid: errors.length === 0,
    errors,
    warnings,
    fixes,
    stats: {
      lines,
      states: stateMatches.length,
      events: eventCount,
      functions: Math.max(0, funcMatches.length - eventCount),
      llCalls: llCallMatches.length,
      globals: globalMatches.length,
      estimatedMonoBytes,
      hasListen,
      hasListenRemove,
      hasOwnerChangeReset,
    },
  };
}

/** Live check of a still-streaming script: only completed statements, no auto-wrap. */
export function checkLslIncremental(rawCode: string): LslAuditResult {
  const prefix = stableLslPrefix(String(rawCode || ''));
  const lint = lintLslScript(prefix, { streaming: true });
  const errors = formatLslDiagnostics(lint.errors);
  const warnings = formatLslDiagnostics(lint.warnings);
  const lines = prefix.trim() ? prefix.trim().split('\n').length : 0;
  return {
    code: prefix,
    valid: errors.length === 0,
    errors,
    warnings,
    fixes: [],
    stats: {
      lines,
      states: (prefix.match(/\b(?:default|state)\b/g) || []).length,
      events: 0,
      functions: 0,
      llCalls: (prefix.match(/\bll[A-Z]/g) || []).length,
      globals: 0,
      estimatedMonoBytes: Math.min(65536, estimateMonoBytes(prefix)),
      hasListen: /\bllListen\s*\(/.test(prefix),
      hasListenRemove: /\bllListenRemove\s*\(/.test(prefix),
      hasOwnerChangeReset: /\bCHANGED_OWNER\b|\bon_rez\b/.test(prefix),
    },
  };
}

export function simulateLslExecution(code: string, stdin = ''): LslSimulationResult {
  const compilerName = 'Second Life LSL2 Mono Compiler & Event Simulator';
  const audit = analyzeAndFixLslScript(code);

  if (!audit.valid) {
    return {
      status: 1,
      stdout: '',
      stderr: audit.errors.map((e) => `LSL Compile Error: ${e}`).join('\n'),
      compilerName,
      compileStage: 'LSL2 Compilation Failed',
      stats: audit.stats,
    };
  }

  const src = audit.code;
  const env: Record<string, string | number> = {
    TRUE: 1,
    FALSE: 0,
    NULL_KEY: '00000000-0000-0000-0000-000000000000',
    ZERO_VECTOR: '<0.0, 0.0, 0.0>',
    ZERO_ROTATION: '<0.0, 0.0, 0.0, 1.0>',
    ALL_SIDES: -1,
    LINK_THIS: -4,
    LINK_SET: -1,
    PI: 3.141593,
    TWO_PI: 6.283185,
    DEG_TO_RAD: 0.017453,
    AGENT: 1,
  };

  // Seed globals
  const globalRe = /^(?:integer|float|string|key|vector|rotation)\s+([A-Za-z_]\w*)\s*(?:=\s*([^;]+))?;/gm;
  let gm: RegExpExecArray | null;
  while ((gm = globalRe.exec(src)) !== null) {
    const varName = gm[1];
    const rhs = (gm[2] || '').trim();
    if (!rhs) {
      env[varName] = '';
    } else if (/^".*"$/.test(rhs)) {
      env[varName] = rhs.slice(1, -1);
    } else if (!Number.isNaN(Number(rhs))) {
      env[varName] = Number(rhs);
    } else if (rhs in env) {
      env[varName] = env[rhs];
    } else {
      env[varName] = rhs;
    }
  }

  const evalLslExpr = (raw: string, ctx: { avatarName: string; avatarKey: string; message?: string; chan?: number }): string => {
    const expr = raw.trim();
    if (!expr) return '';
    // Split on top-level '+' outside quotes/parens/angles
    const parts: string[] = [];
    let cur = '';
    let inQ = false;
    let pDepth = 0;
    let aDepth = 0;
    for (let i = 0; i < expr.length; i++) {
      const ch = expr[i];
      if (ch === '"' && expr[i - 1] !== '\\') {
        inQ = !inQ;
        cur += ch;
        continue;
      }
      if (!inQ) {
        if (ch === '(') pDepth++;
        else if (ch === ')') pDepth = Math.max(0, pDepth - 1);
        else if (ch === '<') aDepth++;
        else if (ch === '>') aDepth = Math.max(0, aDepth - 1);
        else if (ch === '+' && pDepth === 0 && aDepth === 0) {
          parts.push(cur.trim());
          cur = '';
          continue;
        }
      }
      cur += ch;
    }
    if (cur.trim()) parts.push(cur.trim());

    if (parts.length > 1) {
      return parts.map((p) => evalLslExpr(p, ctx)).join('');
    }

    const stripped = expr.replace(/^\((?:string|integer|float|key)\)\s*/, '').trim();
    if (stripped.startsWith('"') && stripped.endsWith('"')) {
      return stripped.slice(1, -1).replace(/\\n/g, '\n');
    }
    if (/^llDetectedName\s*\(/i.test(stripped)) return ctx.avatarName;
    if (/^llKey2Name\s*\(/i.test(stripped)) return ctx.avatarName;
    if (/^llDetectedKey\s*\(/i.test(stripped)) return ctx.avatarKey;
    if (/^llGetOwner\s*\(/i.test(stripped)) return '9b2f8d4e-1001-4a7b-9c22-lokizenith01';
    if (/^llGetObjectName\s*\(/i.test(stripped)) return 'Lokizenith Prim v2';
    if (/^llGetFreeMemory\s*\(/i.test(stripped)) return String(65536 - audit.stats.estimatedMonoBytes);
    if (/^llGetPos\s*\(/i.test(stripped)) return '<128.0, 128.0, 24.5>';
    if (/^llGetRot\s*\(/i.test(stripped)) return '<0.0, 0.0, 0.0, 1.0>';
    if (stripped === 'name' && ctx.avatarName) return ctx.avatarName;
    if (stripped === 'message' && ctx.message !== undefined) return ctx.message;
    if (stripped === 'channel' && ctx.chan !== undefined) return String(ctx.chan);
    if (stripped in env) return String(env[stripped]);
    return stripped;
  };

  const logs: string[] = [];
  logs.push(`[LSL2 Mono] Compiled ${audit.stats.lines} lines OK (${audit.stats.states} state(s), ${audit.stats.events} event(s), ${audit.stats.llCalls} ll* API call(s))`);

  const extractEventBody = (evName: string): string => {
    const idx = src.search(new RegExp(`\\b${evName}\\s*\\([^)]*\\)\\s*\\{`));
    if (idx < 0) return '';
    const openBrace = src.indexOf('{', idx);
    let depth = 0;
    for (let i = openBrace; i < src.length; i++) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') {
        depth--;
        if (depth === 0) return src.slice(openBrace + 1, i);
      }
    }
    return '';
  };

  const splitTopLevelArgs = (argStr: string): string[] => {
    const out: string[] = [];
    let cur = '';
    let inQ = false;
    let pDepth = 0;
    let bDepth = 0;
    let aDepth = 0;
    for (let i = 0; i < argStr.length; i++) {
      const ch = argStr[i];
      if (ch === '"' && argStr[i - 1] !== '\\') {
        inQ = !inQ;
        cur += ch;
        continue;
      }
      if (!inQ) {
        if (ch === '(') pDepth++;
        else if (ch === ')') pDepth = Math.max(0, pDepth - 1);
        else if (ch === '[') bDepth++;
        else if (ch === ']') bDepth = Math.max(0, bDepth - 1);
        else if (ch === '<') aDepth++;
        else if (ch === '>') aDepth = Math.max(0, aDepth - 1);
        else if (ch === ',' && pDepth === 0 && bDepth === 0 && aDepth === 0) {
          out.push(cur.trim());
          cur = '';
          continue;
        }
      }
      cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  };

  const runBodyTrace = (label: string, body: string, ctx: { avatarName: string; avatarKey: string; message?: string; chan?: number }) => {
    if (!body.trim()) return;
    logs.push(`\n--- Event: ${label} ---`);
    const lines = body.split('\n');
    let printed = 0;
    for (const rawLine of lines) {
      const l = rawLine.trim();
      if (!l || l.startsWith('//')) continue;

      const sayMatch = l.match(/\b(llOwnerSay|llSay|llWhisper|llShout|llInstantMessage|llRegionSayTo)\s*\(([\s\S]+?)\)\s*;/);
      if (sayMatch) {
        const fn = sayMatch[1];
        const args = splitTopLevelArgs(sayMatch[2]);
        const msgExpr =
          fn === 'llOwnerSay'
            ? (args[0] || '')
            : fn === 'llRegionSayTo' || fn === 'llInstantMessage'
              ? (args[2] ?? args[args.length - 1] ?? '')
              : (args[1] ?? args[args.length - 1] ?? '');
        const msg = evalLslExpr(msgExpr, ctx);
        logs.push(`[${fn}] ${msg}`);
        printed++;
        continue;
      }

      const textMatch = l.match(/\bllSetText\s*\(([\s\S]+?)\)\s*;/);
      if (textMatch) {
        const args = splitTopLevelArgs(textMatch[1]);
        logs.push(`[llSetText] "${evalLslExpr(args[0] || '', ctx)}"`);
        printed++;
        continue;
      }

      const dlgMatch = l.match(/\bllDialog\s*\(([\s\S]+?)\)\s*;/);
      if (dlgMatch) {
        const args = splitTopLevelArgs(dlgMatch[1]);
        logs.push(`[llDialog -> ${ctx.avatarName}] ${evalLslExpr(args[1] || '', ctx).replace(/\n/g, ' | ')}`);
        printed++;
        continue;
      }

      const listenMatch = l.match(/\bllListen\s*\(\s*([^,]+),/);
      if (listenMatch) {
        logs.push(`[llListen] Listening on channel ${evalLslExpr(listenMatch[1], ctx)}`);
        printed++;
        continue;
      }

      const timerMatch = l.match(/\bllSetTimerEvent\s*\(\s*([^)]+)\s*\)/);
      if (timerMatch) {
        const secs = evalLslExpr(timerMatch[1], ctx);
        if (Number(secs) > 0) logs.push(`[llSetTimerEvent] Armed timer every ${secs}s`);
        printed++;
        continue;
      }

      if (/\bllSet(?:Link)?PrimitiveParamsFast?\s*\(/.test(l)) {
        logs.push(`[PrimParams] Updated object prim visual/transform parameters`);
        printed++;
        continue;
      }
      if (/\bllParticleSystem\s*\(/.test(l)) {
        logs.push(`[Particles] Updated prim particle emitter`);
        printed++;
        continue;
      }
      if (/\bllHTTPRequest\s*\(/.test(l)) {
        logs.push(`[HTTP] Dispatched outbound LSL HTTP request`);
        printed++;
      }
    }
    if (printed === 0) {
      logs.push(`[Executed ${label} cleanly]`);
    }
  };

  const simCtx = {
    avatarName: 'Resident Tester',
    avatarKey: 'a1b2c3d4-e5f6-4789-9012-resident0001',
  };

  runBodyTrace('default::state_entry()', extractEventBody('state_entry'), simCtx);

  const touchBody = extractEventBody('touch_start');
  if (touchBody) {
    runBodyTrace('touch_start(1) [by Resident Tester]', touchBody, simCtx);
  }

  const listenBody = extractEventBody('listen');
  if (listenBody) {
    const cmds = String(stdin || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    const activeCmds = cmds.length ? cmds.slice(0, 3) : ['status'];
    for (const cmd of activeCmds) {
      runBodyTrace(`listen(chan, "Resident Tester", "${cmd}")`, listenBody, { ...simCtx, message: cmd, chan: 0 });
    }
  }

  const timerBody = extractEventBody('timer');
  if (timerBody && /\bllSetTimerEvent\s*\(\s*[1-9]/.test(src)) {
    runBodyTrace('timer()', timerBody, simCtx);
  }

  const kbUsed = (audit.stats.estimatedMonoBytes / 1024).toFixed(1);
  logs.push(`\n[Mono Memory] ~${kbUsed} KB / 64.0 KB allocated (${audit.warnings.length} advisory note(s))`);
  if (audit.warnings.length) {
    for (const w of audit.warnings) logs.push(`  • Note: ${w}`);
  }

  return {
    status: 0,
    stdout: logs.join('\n') + '\n',
    stderr: '',
    compilerName,
    compileStage: `Compiled LSL2 Mono (${audit.stats.states} states, ${audit.stats.events} events) · 0 errors`,
    stats: audit.stats,
  };
}

export function generateOfflineProfessionalLsl(promptRaw: string): string {
  const clean = String(promptRaw || '').trim();
  const title = clean.replace(/[`"'\\]/g, ' ').trim().slice(0, 64) || 'LSL Pro Controller';
  const p = clean.toLowerCase();

  if (/(orb|security|scanner|radar|eject|ban|whitelist)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Security & Radar Orb with Whitelist & Dialog Menu
integer g_channel = -842190;
integer g_listenHandle = 0;
integer g_armed = TRUE;
float g_range = 20.0;
list g_whitelist = [];
key g_owner;

initOrb()
{
    g_owner = llGetOwner();
    llListenRemove(g_listenHandle);
    g_listenHandle = llListen(g_channel, "", g_owner, "");
    llSensorRepeat("", NULL_KEY, AGENT, g_range, PI, 3.0);
    string modeLabel = "STANDBY";
    if (g_armed) modeLabel = "ARMED";
    llSetText("🛡️ Security Orb: " + modeLabel + "\\nRange: " + (string)((integer)g_range) + "m", <0.1, 1.0, 0.55>, 1.0);
}

default
{
    state_entry()
    {
        initOrb();
        llOwnerSay("Security Orb online. Touch for Owner Console.");
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        if (toucher != g_owner)
        {
            llRegionSayTo(toucher, 0, "Restricted parcel security device.");
            return;
        }
        string status = "STANDBY";
        if (g_armed) status = "ARMED";
        llDialog(g_owner, "Security Orb (" + status + ") · Range " + (string)((integer)g_range) + "m", ["Arm", "Standby", "Range 20m", "Range 40m", "Status", "Reset"], g_channel);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (id != g_owner || channel != g_channel) return;
        if (message == "Arm") g_armed = TRUE;
        else if (message == "Standby") g_armed = FALSE;
        else if (message == "Range 20m") g_range = 20.0;
        else if (message == "Range 40m") g_range = 40.0;
        else if (message == "Reset") { llResetScript(); return; }
        else if (message == "Status")
        {
            llOwnerSay("Armed=" + (string)g_armed + " | Range=" + (string)g_range + "m | FreeMem=" + (string)llGetFreeMemory());
            return;
        }
        initOrb();
    }

    sensor(integer num_detected)
    {
        if (!g_armed) return;
        integer i;
        for (i = 0; i < num_detected; ++i)
        {
            key av = llDetectedKey(i);
            if (av != g_owner && llListFindList(g_whitelist, [llDetectedName(i)]) == -1)
            {
                llRegionSayTo(av, 0, "Notice: Private parcel monitored by Security Orb.");
            }
        }
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(vehicle|car|boat|plane|hover|flight|bank|drive)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Physics Hovercraft & Vehicle Controller
key g_pilot = NULL_KEY;
float g_forwardPower = 18.0;
float g_turnRate = 2.4;

setupVehiclePhysics()
{
    llSetVehicleType(VEHICLE_TYPE_AIRPLANE);
    llSetVehicleFloatParam(VEHICLE_HOVER_HEIGHT, 1.5);
    llSetVehicleFloatParam(VEHICLE_HOVER_EFFICIENCY, 0.8);
    llSetVehicleFloatParam(VEHICLE_HOVER_TIMESCALE, 0.4);
    llSetVehicleVectorParam(VEHICLE_LINEAR_FRICTION_TIMESCALE, <1.5, 1.5, 2.0>);
    llSetVehicleVectorParam(VEHICLE_ANGULAR_FRICTION_TIMESCALE, <0.3, 0.3, 0.5>);
    llSitTarget(<0.2, 0.0, 0.5>, ZERO_ROTATION);
}

default
{
    state_entry()
    {
        setupVehiclePhysics();
        llSetText("🏎️ Hovercraft Ready · Sit to Pilot", <0.0, 0.9, 1.0>, 1.0);
    }

    changed(integer change)
    {
        if (change & CHANGED_LINK)
        {
            key sitter = llAvatarOnSitTarget();
            if (sitter != NULL_KEY)
            {
                g_pilot = sitter;
                llRequestPermissions(sitter, PERMISSION_TAKE_CONTROLS);
            }
            else
            {
                g_pilot = NULL_KEY;
                llReleaseControls();
                llSetStatus(STATUS_PHYSICS, FALSE);
            }
        }
    }

    run_time_permissions(integer perm)
    {
        if (perm & PERMISSION_TAKE_CONTROLS)
        {
            llTakeControls(CONTROL_FWD | CONTROL_BACK | CONTROL_ROT_LEFT | CONTROL_ROT_RIGHT | CONTROL_UP | CONTROL_DOWN, TRUE, FALSE);
            llSetStatus(STATUS_PHYSICS, TRUE);
            llRegionSayTo(g_pilot, 0, "Controls active: WASD + E/C.");
        }
    }

    control(key id, integer level, integer edge)
    {
        vector lin = ZERO_VECTOR;
        vector ang = ZERO_VECTOR;
        if (level & CONTROL_FWD) lin.x += g_forwardPower;
        if (level & CONTROL_BACK) lin.x -= g_forwardPower * 0.6;
        if (level & CONTROL_UP) lin.z += 12.0;
        if (level & CONTROL_DOWN) lin.z -= 12.0;
        if (level & CONTROL_ROT_LEFT) ang.z += g_turnRate;
        if (level & CONTROL_ROT_RIGHT) ang.z -= g_turnRate;
        llSetVehicleVectorParam(VEHICLE_LINEAR_MOTOR_DIRECTION, lin);
        llSetVehicleVectorParam(VEHICLE_ANGULAR_MOTOR_DIRECTION, ang);
    }
}
\`\`\``;
  }

  if (/(door|slide|gate|open|close|דלת|שער)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Smart Sliding Door with Sensor & Owner Controls
integer g_isOpen = FALSE;
vector g_closedPos;
vector g_slideOffset = <0.0, 2.2, 0.0>;
integer g_channel = -88412;
integer g_listenHandle = 0;
key g_owner;

initDoor()
{
    g_owner = llGetOwner();
    g_closedPos = llGetPos();
    llListenRemove(g_listenHandle);
    g_listenHandle = llListen(g_channel, "", NULL_KEY, "");
    llSetText("🚪 Smart Door: CLOSED\\nTouch to open", <0.0, 1.0, 0.61>, 1.0);
}

openDoor(string who)
{
    if (g_isOpen) return;
    g_isOpen = TRUE;
    llSetPos(g_closedPos + g_slideOffset);
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.12]);
    llSetText("🚪 Smart Door: OPEN (" + who + ")", <0.3, 1.0, 0.5>, 1.0);
    llSetTimerEvent(6.0);
}

closeDoor()
{
    llSetTimerEvent(0.0);
    g_isOpen = FALSE;
    llSetPos(g_closedPos);
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.0]);
    llSetText("🚪 Smart Door: CLOSED\\nTouch to open", <0.0, 1.0, 0.61>, 1.0);
}

default
{
    state_entry() { initDoor(); }

    touch_start(integer total_number)
    {
        string who = llDetectedName(0);
        if (g_isOpen) closeDoor();
        else openDoor(who);
    }

    timer() { closeDoor(); }
    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(tip|jar|pay|vendor|money|donate|leaderboard)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Tip Jar & Donor Leaderboard with Particle Burst
key g_owner;
integer g_totalLinden = 0;
key g_topDonor = NULL_KEY;
string g_topName = "None";
integer g_topAmount = 0;

emitThanksParticles()
{
    llParticleSystem([
        PSYS_PART_FLAGS, PSYS_PART_INTERP_COLOR_MASK | PSYS_PART_EMISSIVE_MASK,
        PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_ANGLE_CONE,
        PSYS_PART_START_COLOR, <0.0, 1.0, 0.6>,
        PSYS_PART_END_COLOR, <0.2, 0.7, 1.0>,
        PSYS_PART_MAX_AGE, 1.5,
        PSYS_SRC_BURST_RATE, 0.05,
        PSYS_SRC_BURST_PART_COUNT, 12
    ]);
    llSetTimerEvent(2.5);
}

updateHover()
{
    llSetText("💎 Tip Jar\\nTotal: L$" + (string)g_totalLinden + "\\nTop Donor: " + g_topName + " (L$" + (string)g_topAmount + ")", <0.0, 1.0, 0.65>, 1.0);
}

default
{
    state_entry()
    {
        g_owner = llGetOwner();
        llSetPayPrice(PAY_HIDE, [25, 50, 100, 250]);
        updateHover();
    }

    money(key id, integer amount)
    {
        string donor = llKey2Name(id);
        g_totalLinden += amount;
        if (amount > g_topAmount)
        {
            g_topAmount = amount;
            g_topDonor = id;
            g_topName = donor;
        }
        llRegionSayTo(id, 0, "Thank you " + donor + " for tipping L$" + (string)amount + "!");
        updateHover();
        emitThanksParticles();
    }

    timer()
    {
        llSetTimerEvent(0.0);
        llParticleSystem([]);
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(teleport|tp\b|warp|landmark|sit.?tp)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Multi-Destination Sit Teleporter (llSetRegionPos)
vector g_targetPos = <128.0, 128.0, 45.0>;
string g_destName = "Sky Lounge";
integer g_channel = -71409;
integer g_listenHandle = 0;
key g_owner;

updateSign()
{
    llSetText("✨ Teleporter -> " + g_destName + "\\nSit to Teleport", <0.1, 0.95, 0.8>, 1.0);
}

default
{
    state_entry()
    {
        g_owner = llGetOwner();
        llSitTarget(<0.0, 0.0, 0.5>, ZERO_ROTATION);
        llSetClickAction(CLICK_ACTION_SIT);
        updateSign();
        llOwnerSay("Teleporter ready. Target: " + (string)g_targetPos);
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) { llResetScript(); return; }
        if (change & CHANGED_LINK)
        {
            key av = llAvatarOnSitTarget();
            if (av != NULL_KEY)
            {
                vector origin = llGetPos();
                llSetRegionPos(g_targetPos);
                llUnSit(av);
                llRegionSayTo(av, 0, "Arrived at " + g_destName + "!");
                llSetRegionPos(origin);
            }
        }
    }

    on_rez(integer start_param) { llResetScript(); }
}
\`\`\``;
  }

  if (/(hud|menu|dialog|ui|button)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Multi-Page HUD & Dialog Controller
integer g_channel = -55318;
integer g_listenHandle = 0;
integer g_glowOn = FALSE;
key g_owner;

openHudMenu(key target)
{
    llListenRemove(g_listenHandle);
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(45.0);
    llDialog(target, "${title}\\nSelect an action:", ["Glow Toggle", "Color Neon", "Color Gold", "Memory", "Reset", "Close"], g_channel);
}

default
{
    state_entry()
    {
        g_owner = llGetOwner();
        llOwnerSay("HUD Controller initialized (" + (string)llGetFreeMemory() + " bytes free).");
    }

    attach(key id)
    {
        if (id != NULL_KEY)
        {
            g_owner = id;
            llOwnerSay("${title} HUD attached. Touch to open menu.");
        }
    }

    touch_start(integer total_number)
    {
        key av = llDetectedKey(0);
        if (av == g_owner) openHudMenu(av);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (id != g_owner || channel != g_channel) return;
        if (message == "Glow Toggle")
        {
            g_glowOn = !g_glowOn;
            llSetLinkPrimitiveParamsFast(LINK_SET, [PRIM_GLOW, ALL_SIDES, g_glowOn * 0.2]);
        }
        else if (message == "Color Neon") llSetLinkPrimitiveParamsFast(LINK_SET, [PRIM_COLOR, ALL_SIDES, <0.0, 1.0, 0.65>, 1.0]);
        else if (message == "Color Gold") llSetLinkPrimitiveParamsFast(LINK_SET, [PRIM_COLOR, ALL_SIDES, <1.0, 0.82, 0.2>, 1.0]);
        else if (message == "Memory") llOwnerSay("Free Mono memory: " + (string)llGetFreeMemory() + " bytes");
        else if (message == "Reset") llResetScript();
    }

    timer()
    {
        llSetTimerEvent(0.0);
        llListenRemove(g_listenHandle);
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(particle|fire|flame|rain|snow|spark|magic|fx|effect)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Configurable Particle Emitter (Touch Toggle)
integer g_active = TRUE;

startParticles()
{
    llParticleSystem([
        PSYS_PART_FLAGS, PSYS_PART_INTERP_COLOR_MASK | PSYS_PART_INTERP_SCALE_MASK | PSYS_PART_EMISSIVE_MASK | PSYS_PART_WIND_MASK,
        PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_ANGLE_CONE,
        PSYS_PART_START_COLOR, <0.0, 1.0, 0.72>,
        PSYS_PART_END_COLOR, <0.15, 0.45, 1.0>,
        PSYS_PART_START_ALPHA, 0.95,
        PSYS_PART_END_ALPHA, 0.0,
        PSYS_PART_START_SCALE, <0.18, 0.18, 0.0>,
        PSYS_PART_END_SCALE, <0.55, 0.55, 0.0>,
        PSYS_PART_MAX_AGE, 2.2,
        PSYS_SRC_BURST_RATE, 0.08,
        PSYS_SRC_BURST_PART_COUNT, 6,
        PSYS_SRC_BURST_SPEED_MIN, 0.4,
        PSYS_SRC_BURST_SPEED_MAX, 1.2
    ]);
    llSetText("✨ Particle FX: ACTIVE", <0.0, 1.0, 0.72>, 1.0);
}

default
{
    state_entry()
    {
        startParticles();
        llOwnerSay("Particle FX active. Touch prim to toggle.");
    }

    touch_start(integer total_number)
    {
        g_active = !g_active;
        if (g_active) startParticles();
        else
        {
            llParticleSystem([]);
            llSetText("✨ Particle FX: PAUSED", <0.7, 0.7, 0.7>, 1.0);
        }
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(http|webhook|discord|api|rest|server|json)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Secure HTTP JSON Client with Retry & Timeout
string g_endpoint = "https://example.com/api/sl-event";
key g_reqId = NULL_KEY;
key g_owner;

sendPayload(string eventName, string actor)
{
    string body = llList2Json(JSON_OBJECT, [
        "event", eventName,
        "actor", actor,
        "region", llGetRegionName(),
        "object", llGetObjectName()
    ]);
    g_reqId = llHTTPRequest(g_endpoint, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_BODY_MAXLENGTH, 4096
    ], body);
    llSetTimerEvent(15.0);
}

default
{
    state_entry()
    {
        g_owner = llGetOwner();
        llSetText("🌐 HTTP Bridge Ready\\nTouch to send JSON payload", <0.2, 0.85, 1.0>, 1.0);
        llOwnerSay("HTTP JSON client initialized.");
    }

    touch_start(integer total_number)
    {
        string who = llDetectedName(0);
        sendPayload("touch", who);
        llRegionSayTo(llDetectedKey(0), 0, "Dispatching HTTP request…");
    }

    http_response(key request_id, integer status, list metadata, string body)
    {
        if (request_id != g_reqId) return;
        llSetTimerEvent(0.0);
        g_reqId = NULL_KEY;
        llOwnerSay("HTTP " + (string)status + " -> " + llGetSubString(body, 0, 180));
    }

    timer()
    {
        llSetTimerEvent(0.0);
        g_reqId = NULL_KEY;
        llOwnerSay("HTTP request timed out.");
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(greet|visitor|welcome|notecard|counter|landmark)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Visitor Greeter & Unique Counter (Memory-Safe Ring Buffer)
float g_range = 15.0;
integer g_maxStored = 80;
list g_visitors = [];
integer g_totalVisits = 0;
key g_owner;

updateBoard()
{
    llSetText("👋 Welcome!\\nUnique Visitors: " + (string)g_totalVisits, <0.0, 1.0, 0.65>, 1.0);
}

default
{
    state_entry()
    {
        g_owner = llGetOwner();
        updateBoard();
        llSensorRepeat("", NULL_KEY, AGENT, g_range, PI, 5.0);
        llOwnerSay("Visitor Greeter active (" + (string)((integer)g_range) + "m radius).");
    }

    sensor(integer num_detected)
    {
        integer i;
        for (i = 0; i < num_detected; ++i)
        {
            key av = llDetectedKey(i);
            if (llListFindList(g_visitors, [av]) == -1)
            {
                g_visitors += [av];
                if (llGetListLength(g_visitors) > g_maxStored)
                {
                    g_visitors = llDeleteSubList(g_visitors, 0, 0);
                }
                ++g_totalVisits;
                llRegionSayTo(av, 0, "Welcome, " + llDetectedName(i) + "! Enjoy your visit.");
                updateBoard();
            }
        }
    }

    touch_start(integer total_number)
    {
        if (llDetectedKey(0) == g_owner)
        {
            llOwnerSay("Total unique visits: " + (string)g_totalVisits + " | Free memory: " + (string)llGetFreeMemory());
        }
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(light|lamp|glow|neon|color|bulb|dimmer)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Smart Point-Light & Glow Controller
integer g_on = TRUE;
vector g_color = <0.95, 0.9, 0.78>;
float g_intensity = 0.85;
float g_radius = 12.0;

applyLight()
{
    llSetLinkPrimitiveParamsFast(LINK_THIS, [
        PRIM_POINT_LIGHT, g_on, g_color, g_intensity, g_radius, 0.75,
        PRIM_FULLBRIGHT, ALL_SIDES, g_on,
        PRIM_GLOW, ALL_SIDES, g_on * 0.18
    ]);
    string lampLabel = "OFF";
    if (g_on) lampLabel = "ON";
    llSetText("💡 Smart Lamp: " + lampLabel, g_color, 0.9);
}

default
{
    state_entry()
    {
        applyLight();
        llOwnerSay("Smart Light online. Touch to toggle.");
    }

    touch_start(integer total_number)
    {
        g_on = !g_on;
        applyLight();
        string switched = "OFF";
        if (g_on) switched = "ON";
        llRegionSayTo(llDetectedKey(0), 0, "Light switched " + switched + ".");
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  if (/(elevator|lift|platform|move|float|bob|oscillat)/i.test(p)) {
    return `\`\`\`lsl
// ${title}
// Second Life LSL2/Mono Smooth Multi-Floor Keyframed Elevator
vector g_basePos;
integer g_floor = 0;
list g_offsets = [<0.0, 0.0, 0.0>, <0.0, 0.0, 5.0>, <0.0, 0.0, 10.0>];
integer g_channel = -49201;
integer g_listenHandle = 0;

moveToFloor(integer idx)
{
    if (idx < 0 || idx >= llGetListLength(g_offsets)) return;
    g_floor = idx;
    vector target = g_basePos + llList2Vector(g_offsets, idx);
    llSetRegionPos(target);
    llSetText("🛗 Elevator · Floor " + (string)(g_floor + 1) + "\\nTouch to select floor", <0.1, 0.95, 0.75>, 1.0);
}

default
{
    state_entry()
    {
        g_basePos = llGetPos();
        llListenRemove(g_listenHandle);
        g_listenHandle = llListen(g_channel, "", NULL_KEY, "");
        moveToFloor(0);
    }

    touch_start(integer total_number)
    {
        llDialog(llDetectedKey(0), "Select Elevator Floor (Current: " + (string)(g_floor + 1) + ")", ["Floor 1", "Floor 2", "Floor 3"], g_channel);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        if (message == "Floor 1") moveToFloor(0);
        else if (message == "Floor 2") moveToFloor(1);
        else if (message == "Floor 3") moveToFloor(2);
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
  }

  return `\`\`\`lsl
// ${title}
// Complete Second Life LSL2/Mono Interactive Controller
integer g_channel = -64091;
integer g_listenHandle = 0;
integer g_count = 0;
key g_owner;

showMenu(key target, string name)
{
    string body = "${title}\\nUser: " + name + " | Uses: " + (string)g_count;
    llDialog(target, body, ["Activate", "Glow FX", "Status", "Reset"], g_channel);
}

default
{
    state_entry()
    {
        g_owner = llGetOwner();
        llListenRemove(g_listenHandle);
        g_listenHandle = llListen(g_channel, "", NULL_KEY, "");
        llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_COLOR, ALL_SIDES, <0.0, 1.0, 0.61>, 1.0]);
        llSetText("${title}\\nStatus: READY · Touch to interact", <0.0, 1.0, 0.61>, 1.0);
        llOwnerSay("Initialized LSL controller: ${title}");
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        string who = llDetectedName(0);
        ++g_count;
        showMenu(toucher, who);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        if (message == "Activate" || message == "Glow FX")
        {
            llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.25]);
            llSetTimerEvent(3.0);
            llRegionSayTo(id, 0, "Activated " + message + "!");
        }
        else if (message == "Status")
        {
            llRegionSayTo(id, 0, "Free Memory: " + (string)llGetFreeMemory() + " bytes | Uses: " + (string)g_count);
        }
        else if (message == "Reset" && id == g_owner)
        {
            llResetScript();
        }
    }

    timer()
    {
        llSetTimerEvent(0.0);
        llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.0]);
    }

    on_rez(integer start_param) { llResetScript(); }
    changed(integer change) { if (change & CHANGED_OWNER) llResetScript(); }
}
\`\`\``;
}
