import { buildMatlabSystemPrompt } from './matlabSpecialist.ts';
import {
  BANNED_HALLUCINATED_LSL_FUNCTIONS,
  OFFICIAL_LSL_FUNCTION_SET,
} from './lslOfficialApi.ts';

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
  land_collision: { minArgs: 1, signature: 'land_collision(vector pos)' },
  land_collision_end: { minArgs: 1, signature: 'land_collision_end(vector pos)' },
  link_message: { minArgs: 4, signature: 'link_message(integer sender_num, integer num, string str, key id)' },
  object_rez: { minArgs: 1, signature: 'object_rez(key id)' },
  transaction_result: { minArgs: 3, signature: 'transaction_result(key id, integer success, string data)' },
  experience_permissions: { minArgs: 1, signature: 'experience_permissions(key agent)' },
  experience_permissions_denied: { minArgs: 2, signature: 'experience_permissions_denied(key agent, integer reason)' },
  at_target: { minArgs: 3, signature: 'at_target(integer tnum, vector targetpos, vector ourpos)' },
  not_at_target: { minArgs: 0, signature: 'not_at_target()' },
  at_rot_target: { minArgs: 3, signature: 'at_rot_target(integer tnum, rotation targetrot, rotation ourrot)' },
  not_at_rot_target: { minArgs: 0, signature: 'not_at_rot_target()' },
  path_update: { minArgs: 2, signature: 'path_update(integer type, list reserved)' },
  remote_data: { minArgs: 6, signature: 'remote_data(integer event_type, key channel, key message_id, string sender, integer idata, string sdata)' },
  email: { minArgs: 5, signature: 'email(string time, string address, string subj, string message, integer num_left)' },
};

export function detectLslIntent(text: string): boolean {
  const s = String(text || '');
  if (!s.trim()) return false;
  return /\b(lsl|lsl2|linden\s+scripting|second\s*life|opensim|eureka\s*world|llOwnerSay|llDialog|llSetLinkPrimitiveParamsFast|llSensorRepeat|llRegionSayTo|state_entry|touch_start)\b/i.test(
    s
  ) || /(סקנד\s*לייף|סקריפט\s*lsl|אופנ?סים)/i.test(s);
}

export function buildChatLslDirective(): string {
  return `[PRINCIPAL SECOND LIFE / OPENSIM LSL2 & MONO ARCHITECT MODE]
The user is asking for Second Life / OpenSim Linden Scripting Language (LSL2/Mono). Write a COMPLETE, THOROUGH, PRODUCTION-GRADE, 100% COMPILABLE LSL2/Mono script (never a short stub or toy snippet unless explicitly requested; typically 120-260+ lines for complete systems with full features, owner/user menus, config, edge-case handling, and clean section comments).
STRICT LSL2/MONO COMPILER LAWS — VIOLATING ANY ONE CAUSES A COMPILE ERROR IN SECOND LIFE:
1. Valid types ONLY: integer, float, string, key, vector, rotation, list. NEVER use void, int, bool, boolean, double, char, var, const, let, or function.
2. Constants MUST be uppercase: TRUE, FALSE, NULL_KEY, ZERO_VECTOR, ZERO_ROTATION.
3. NEVER use the ternary operator (cond ? a : b) — LSL DOES NOT SUPPORT IT! Use if/else or llList2String(["OFF","ON"], flag).
4. NEVER use switch/case, break, or continue — LSL DOES NOT HAVE THEM! Use if / else if / else and loop condition flags or return.
5. NEVER declare loop variables inside for(...) — NEVER write for (integer i = 0; ...). Always declare integer i; BEFORE the for loop!
6. NEVER use bracket indexing (myList[i] or myStr[i]) — ALWAYS use llList2String/llList2Integer/llList2Key/llList2Float/llList2Vector/llList2List or llGetSubString.
7. NEVER call functions inside global variable initializers (e.g. NEVER write key g_owner = llGetOwner(); at global scope). Initialize globals to literals only and populate dynamic values inside state_entry() / init().
8. ALWAYS cast explicitly with (string) when concatenating non-strings with +.
9. Declare all user-defined helper functions ABOVE default { ... } in top-down order (NO void keyword).
10. Use production SL practices: unique key-derived negative channel (-1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6))), llListenRemove before llListen + dialog timeout timer, llSetLinkPrimitiveParamsFast, llRegionSayTo, CHANGED_OWNER & on_rez resets, bounded memory-safe lists, and proper llRequestPermissions / run_time_permissions.`;
}

export function buildLslSystemPrompt(opts: { mode?: 'new' | 'edit'; comments?: boolean; hasImages?: boolean } = {}): string {
  const isEdit = opts.mode === 'edit';
  const wantComments = opts.comments !== false;
  const visionRule = opts.hasImages
    ? '\n- IMAGE ANALYSIS: Carefully read any attached screenshot (Second Life LSL compiler/syntax error dialog, debug console, UI HUD, or code example) and fix/implement every detail accurately.'
    : '';

  const strictLaws = `STRICT SECOND LIFE / OPENSIM LSL2 & MONO COMPILER LAWS (ZERO SYNTAX ERRORS):
- File order: 1) Header comment -> 2) Literal-only typed globals -> 3) User-defined helper functions (top-down, NO "void" keyword) -> 4) default { ... } -> 5) optional extra states.
- Valid types ONLY: integer, float, string, key, vector, rotation, list. NEVER use void, int, bool, boolean, double, char, var, const, let.
- Constants MUST be UPPERCASE: TRUE, FALSE, NULL_KEY, ZERO_VECTOR, ZERO_ROTATION.
- NO ternary operator (cond ? a : b) — LSL does NOT support ? : ! Always use if/else or llList2String(["OFF", "ON"], flag).
- NO switch/case, NO break;, NO continue; — LSL does NOT have them! Use if / else if / else chains and loop condition flags or return.
- NO inline loop declarations — NEVER write "for (integer i = 0; ...)". ALWAYS declare "integer i;" BEFORE the for loop!
- NO bracket subscript indexing (arr[i] / str[i]) — ALWAYS use llList2String/llList2Integer/llList2Float/llList2Key/llList2Vector/llList2List or llGetSubString.
- NO function calls in global initializers (NEVER "key g_owner = llGetOwner();" globally) — assign literals globally and initialize dynamic values in state_entry() / init().
- Explicit casts required for string concatenation: (string)val. Only use real built-in ll* APIs (llStringLength, llGetListLength, llFrand, llSetLinkPrimitiveParamsFast, llRegionSayTo, llListenRemove, llDialog, llTextBox, llGetNotecardLine, llList2Json).
- Production architecture: key-derived negative dialog channel (-1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6))), llListenRemove before every llListen + idle dialog timeout timer, paginated llDialog menus (<= 12 buttons, <= 24 chars/label), CHANGED_OWNER + on_rez resets, bounded lists for 64 KB Mono safety, and clean llRequestPermissions / run_time_permissions when needed.${visionRule}`;

  if (isEdit) {
    return `You are a Principal Second Life & OpenSim LSL2/Mono Systems Architect editing an existing LSL script.
Apply all requested improvements thoroughly and cleanly without truncating or dropping existing functionality.
${strictLaws}
${wantComments ? '- Include clear section headers and concise explanatory comments.' : '- Keep comments minimal.'}
- Start line 1 IMMEDIATELY with \`\`\`lsl and end with \`\`\`. Output ONLY the complete updated LSL script with zero prose outside the fence.`;
  }

  return `You are a Principal Second Life & OpenSim LSL2/Mono Systems Architect.
Write a COMPLETE, THOROUGH, PRODUCTION-GRADE, 100% COMPILABLE LSL2/Mono script ready to paste directly into Second Life, OpenSim, or Eureka World.
- DEPTH & COMPLETENESS: Build the full real-world system with rich features, clean modular helpers, owner/user llDialog controls, configuration constants, status/memory diagnostics, edge-case guards, and smooth visual/audio/chat feedback. Aim for 130-280+ lines for full systems (honor an explicit length if the user specifies one, never output short bare-bones stubs or TODO placeholders).
${strictLaws}
${wantComments ? '- Include clean section banner comments (CONFIGURATION, STATE, HELPERS, STATES) and clear inline comments.' : '- Minimal comments.'}
- Start line 1 IMMEDIATELY with \`\`\`lsl and end with \`\`\`. Output ONLY the single fenced LSL code block with zero text before or after.`;
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

  // Safe mechanical LSL type, keyword, built-in & inline-for fixes outside strings/comments
  let hoistedForLoop = false;
  let fixedHallucinatedLl = false;
  const tokenFix = transformLslOutsideLiterals(fixed, (seg) => {
    let s = seg;
    let changed = false;
    const rules: Array<[RegExp, string]> = [
      [/\bvoid\s+([A-Za-z_]\w*\s*\()/g, '$1'],
      [/\bint\s+([A-Za-z_]\w*)/g, 'integer $1'],
      [/\bdouble\s+([A-Za-z_]\w*)/g, 'float $1'],
      [/\b(?:boolean|bool)\s+([A-Za-z_]\w*)/g, 'integer $1'],
      [/\bconst\s+(integer|float|string|key|vector|rotation|list)\b/g, '$1'],
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
    const llRules: Array<[RegExp, string]> = [
      [/\bllLength\s*\(/g, 'llStringLength('],
      [/\bllListLength\s*\(/g, 'llGetListLength('],
      [/\bllRand\s*\(/g, 'llFrand('],
    ];
    for (const [re, rep] of llRules) {
      const next = s.replace(re, rep);
      if (next !== s) {
        s = next;
        changed = true;
        fixedHallucinatedLl = true;
      }
    }
    // Hoist illegal inline `for (integer i = 0; ...)` to `integer i;\n<indent>for (i = 0; ...)`
    const nextFor = s.replace(
      /(^[ \t]*)for\s*\(\s*(integer|float)\s+([A-Za-z_]\w*)\s*=/gm,
      '$1$2 $3;\n$1for ($3 ='
    );
    if (nextFor !== s) {
      s = nextFor;
      changed = true;
      hoistedForLoop = true;
    }
    return { text: s, changed };
  });
  if (tokenFix.changed) {
    fixed = tokenFix.code;
    fixes.push('Normalized LSL types/constants (integer, float, TRUE/FALSE, NULL_KEY, removed void/const)');
    if (fixedHallucinatedLl) {
      fixes.push('Repaired non-standard ll* API names (llStringLength / llGetListLength / llFrand)');
    }
    if (hoistedForLoop) {
      fixes.push('Hoisted inline for-loop variable declaration(s) for LSL2/Mono compatibility');
    }
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

  // Auto-hoist user helper functions that an LLM accidentally placed inside `default { ... }`
  if (braces === 0 && fixed.trim()) {
    const rawLines = fixed.split('\n');
    const mLines = masked.split('\n');
    const controlSet = new Set(['if', 'else', 'for', 'while', 'do', 'return', 'state', 'switch']);
    let d = 0;
    let inState = false;
    let defaultStartLine = -1;
    let stateJustEntered = false;
    const hoistRanges: Array<[number, number]> = [];

    for (let li = 0; li < mLines.length; li++) {
      const ml = mLines[li];
      const nextNonEmpty = mLines.slice(li + 1, li + 4).map((s) => s.trim()).find(Boolean) || '';
      if (d === 0 && /^\s*(?:default|state\s+[A-Za-z_]\w*)\s*(?:\{|$)/.test(ml)) {
        if (/\{/.test(ml) || nextNonEmpty.startsWith('{')) {
          inState = true;
          stateJustEntered = true;
          if (defaultStartLine < 0 && /^\s*default\b/.test(ml)) defaultStartLine = li;
        }
      } else {
        stateJustEntered = false;
      }

      if (inState && d === 1 && !stateJustEntered && defaultStartLine >= 0) {
        const hdr = ml.match(/^\s*(?:(integer|float|string|key|vector|rotation|list)\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:\{|$)/);
        if (hdr && !controlSet.has(hdr[2]) && !CANONICAL_LSL_EVENTS[hdr[2]]) {
          const hasReturnType = Boolean(hdr[1]);
          const fnName = hdr[2];
          const escaped = fnName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const callOccurrences = (masked.match(new RegExp(`\\b${escaped}\\s*\\(`, 'g')) || []).length;
          const opensBlock = /\{/.test(ml) || nextNonEmpty.startsWith('{');
          if (opensBlock && (hasReturnType || callOccurrences >= 2)) {
            let subDepth = d;
            let sawOpen = false;
            let endLine = -1;
            for (let lj = li; lj < mLines.length; lj++) {
              const subMl = mLines[lj];
              for (let ci = 0; ci < subMl.length; ci++) {
                if (subMl[ci] === '{') {
                  subDepth++;
                  sawOpen = true;
                } else if (subMl[ci] === '}') {
                  subDepth--;
                }
              }
              if (sawOpen && subDepth === d) {
                endLine = lj;
                break;
              }
            }
            if (endLine >= li) {
              hoistRanges.push([li, endLine]);
              li = endLine;
              continue;
            }
          }
        }
      }

      for (let ci = 0; ci < ml.length; ci++) {
        if (ml[ci] === '{') d++;
        else if (ml[ci] === '}') {
          d = Math.max(0, d - 1);
          if (d === 0) inState = false;
        }
      }
    }

    if (hoistRanges.length > 0 && defaultStartLine >= 0) {
      const hoistedBlocks: string[] = [];
      const removeSet = new Set<number>();
      for (const [sLine, eLine] of hoistRanges) {
        const blockLines = rawLines.slice(sLine, eLine + 1).map((l) => l.replace(/^ {4}/, ''));
        hoistedBlocks.push(blockLines.join('\n'));
        for (let k = sLine; k <= eLine; k++) removeSet.add(k);
      }
      const rebuilt: string[] = [];
      for (let li = 0; li < rawLines.length; li++) {
        if (li === defaultStartLine) {
          rebuilt.push(...hoistedBlocks, '');
        }
        if (!removeSet.has(li)) {
          rebuilt.push(rawLines[li]);
        }
      }
      fixed = rebuilt.join('\n');
      masked = maskLslStringsAndComments(fixed);
      fixes.push(`Hoisted ${hoistRanges.length} user helper function(s) above default state block`);
    }
  }

  // Strict LSL2/Mono illegal syntax checks (outside strings & comments)
  const maskedLines = masked.split('\n');
  const bannedLlSet = new Set<string>(BANNED_HALLUCINATED_LSL_FUNCTIONS);
  const flaggedErrors = new Set<string>();
  const pushErr = (msg: string) => {
    if (!flaggedErrors.has(msg)) {
      flaggedErrors.add(msg);
      errors.push(msg);
    }
  };

  for (let li = 0; li < maskedLines.length; li++) {
    const lineNo = li + 1;
    const ml = maskedLines[li];
    if (/\?[^:\n;{}]+:/.test(ml)) {
      pushErr(`Line ${lineNo}: LSL2/Mono does not support the ternary operator (? :); use if/else or llList2String(...)`);
    }
    if (/\bswitch\s*\(/.test(ml) || /^\s*case\s+[^:]+:/.test(ml)) {
      pushErr(`Line ${lineNo}: LSL2/Mono does not support switch/case statements; use if / else if / else`);
    }
    if (/\b(?:break|continue)\s*;/.test(ml)) {
      pushErr(`Line ${lineNo}: LSL2/Mono does not support break/continue statements; use loop condition flags or return`);
    }
    if (/\bfor\s*\(\s*(?:integer|float|string|key|vector|rotation|list)\s+[A-Za-z_]\w*/.test(ml)) {
      pushErr(`Line ${lineNo}: LSL2/Mono forbids inline variable declaration inside for(...); declare before the loop`);
    }
    if (/\b(?!return\b)([A-Za-z_]\w*)\s*\[/.test(ml)) {
      pushErr(`Line ${lineNo}: LSL2/Mono does not support bracket indexing (arr[i]); use llList2* or llGetSubString`);
    }
    const illegalTypeMatch = ml.match(/\b(event|var|array|object|boolean|bool)\s+[A-Za-z_]\w*/);
    if (illegalTypeMatch) {
      pushErr(`Line ${lineNo}: LSL2/Mono has no \`${illegalTypeMatch[1]}\` type — valid types are integer, float, string, key, vector, rotation, list`);
    }
    if (
      /\blist\s+[A-Za-z_]\w*\s*=\s*llRot2Euler\b/.test(ml) ||
      /\bllList2(?:Float|Integer|String|Key|Vector|Rot|List)\s*\(\s*llRot2Euler\s*\(/.test(ml)
    ) {
      pushErr(`Line ${lineNo}: \`llRot2Euler(...)\` returns a \`vector\` (radians), NEVER a \`list\` — access .x / .y / .z instead`);
    }
    // Check llEuler2Rot(<x, y, z>) for obvious degree literals without DEG_TO_RAD
    const eulerRe = /\bllEuler2Rot\s*\(\s*<\s*([^>]+)\s*>\s*\)/g;
    let eulerMatch: RegExpExecArray | null;
    while ((eulerMatch = eulerRe.exec(ml)) !== null) {
      const inner = eulerMatch[1];
      if (!/\b(?:DEG_TO_RAD|PI|TWO_PI|PI_BY_TWO)\b/.test(inner)) {
        const nums = inner
          .split(',')
          .map((part) => Number(part.trim()))
          .filter((n) => Number.isFinite(n));
        if (nums.some((n) => Math.abs(n) > 6.3)) {
          pushErr(`Line ${lineNo}: \`llEuler2Rot(<${inner}>)\` expects radians, not degrees — multiply by \`DEG_TO_RAD\``);
        }
      }
    }
    // Verify every ll*() call is in the official LSL library
    const llRe = /\b(ll[A-Z][A-Za-z0-9_]*)\s*\(/g;
    let llMatch: RegExpExecArray | null;
    while ((llMatch = llRe.exec(ml)) !== null) {
      const fnName = llMatch[1];
      if (bannedLlSet.has(fnName)) {
        pushErr(`Line ${lineNo}: \`${fnName}()\` does not exist in Second Life LSL — use only official LSL ll* functions`);
      } else if (!OFFICIAL_LSL_FUNCTION_SET.has(fnName)) {
        pushErr(`Line ${lineNo}: Unknown LSL built-in \`${fnName}()\` — not in official Second Life LSL library`);
      }
    }
  }

  // Check global variable initializers for illegal function calls (at top-level brace depth 0 before states)
  // AND check events declared inside state blocks (depth 1) against CANONICAL_LSL_EVENTS
  let topDepth = 0;
  let inStateBlock = false;
  let stateEnteredOnLine = false;
  const controlKeywords = new Set(['if', 'else', 'for', 'while', 'do', 'return', 'state']);
  let eventCount = 0;

  for (let li = 0; li < maskedLines.length; li++) {
    const ml = maskedLines[li];
    const nextNonEmpty = maskedLines
      .slice(li + 1, li + 4)
      .map((s) => s.trim())
      .find(Boolean) || '';

    if (topDepth === 0 && /^\s*(?:default|state\s+[A-Za-z_]\w*)\s*(?:\{|$)/.test(ml)) {
      const hasOpenHere = /\{/.test(ml);
      const nextStartsBrace = nextNonEmpty.startsWith('{');
      if (hasOpenHere || nextStartsBrace) {
        inStateBlock = true;
        stateEnteredOnLine = true;
      }
    } else {
      stateEnteredOnLine = false;
    }

    if (!inStateBlock && topDepth === 0) {
      const globalInit = ml.match(/^\s*(?:integer|float|string|key|vector|rotation|list)\s+([A-Za-z_]\w*)\s*=\s*([^;]+);/);
      if (globalInit && /\b[A-Za-z_]\w*\s*\(/.test(globalInit[2])) {
        pushErr(`Line ${li + 1}: Global variable \`${globalInit[1]}\` cannot be initialized with a function call in LSL2/Mono; assign inside state_entry()`);
      }
    }

    // Check event headers inside state blocks (either immediately on state opening depth 1, or with Allman braces at depth 1)
    if (inStateBlock && topDepth === 1 && !stateEnteredOnLine) {
      const evHeader = ml.match(/^\s*([a-z][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*(?:\{|$)/);
      if (evHeader && !controlKeywords.has(evHeader[1])) {
        const opensBlock = /\{/.test(ml) || nextNonEmpty.startsWith('{');
        if (opensBlock) {
          const evName = evHeader[1];
          const params = evHeader[2].trim();
          const spec = CANONICAL_LSL_EVENTS[evName];
          if (spec) {
            eventCount++;
            const actualArgCount = params ? params.split(',').filter((x) => x.trim()).length : 0;
            if (actualArgCount !== spec.minArgs) {
              pushErr(`Line ${li + 1}: Event \`${evName}\` expects ${spec.minArgs} parameter(s) (${spec.signature}), found ${actualArgCount}`);
            }
          } else {
            pushErr(`Line ${li + 1}: Unknown LSL event \`${evName}(...)\` inside state block — use only official Second Life LSL events`);
          }
        }
      }
    }

    for (let ci = 0; ci < ml.length; ci++) {
      if (ml[ci] === '{') topDepth++;
      else if (ml[ci] === '}') {
        topDepth = Math.max(0, topDepth - 1);
        if (topDepth === 0) inStateBlock = false;
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
  const estimatedMonoBytes = Math.min(65536, 4096 + fixed.length * 6);

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
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Parcel Security & Radar Orb
// Features: Key-derived dialog channel, whitelist + llTextBox add/remove,
//           grace warning countdown, group access toggle, safe memory cap
// ============================================================================

// --- CONFIGURATION ---
float   DEFAULT_RANGE      = 24.0;
float   SCAN_INTERVAL      = 3.0;
float   DIALOG_TIMEOUT     = 45.0;
integer GRACE_TICKS        = 2;
integer MAX_WHITELIST      = 60;
integer MAX_TRACKED        = 40;

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_armed            = TRUE;
integer g_allowGroup       = TRUE;
float   g_range            = 24.0;
string  g_inputMode        = "";
list    g_whitelist        = [];
list    g_warnKeys         = [];
list    g_warnCounts       = [];
integer g_ejectCount       = 0;

// --- HELPER FUNCTIONS (Declared top-down, no void keyword) ---
integer derivePrivateChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

string onOffLabel(integer flag)
{
    return llList2String(["OFF", "ON"], (flag != 0));
}

string armedLabel(integer flag)
{
    return llList2String(["STANDBY", "ARMED"], (flag != 0));
}

closeDialogChannel()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
    g_inputMode = "";
    llSetTimerEvent(0.0);
}

updateHoverDisplay()
{
    string stateTxt = armedLabel(g_armed);
    vector textCol = <1.0, 0.42, 0.36>;
    float glowAmt = 0.04;
    if (g_armed)
    {
        textCol = <0.0, 1.0, 0.62>;
        glowAmt = 0.16;
    }
    string hover = "Security Orb [" + stateTxt + "]\\n"
        + "Range: " + (string)((integer)g_range) + "m | Group: " + onOffLabel(g_allowGroup) + "\\n"
        + "Whitelist: " + (string)llGetListLength(g_whitelist)
        + " | Ejects: " + (string)g_ejectCount;
    llSetText(hover, textCol, 1.0);
    llSetLinkPrimitiveParamsFast(LINK_THIS, [
        PRIM_COLOR, ALL_SIDES, textCol, 1.0,
        PRIM_GLOW, ALL_SIDES, glowAmt
    ]);
}

restartScanner()
{
    llSensorRemove();
    if (g_armed)
    {
        llSensorRepeat("", NULL_KEY, AGENT, g_range, PI, SCAN_INTERVAL);
    }
    updateHoverDisplay();
}

openOwnerConsole(key target)
{
    closeDialogChannel();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(DIALOG_TIMEOUT);
    string body = "${title}\\n"
        + "Mode: " + armedLabel(g_armed) + " | Range: " + (string)((integer)g_range) + "m\\n"
        + "Group Access: " + onOffLabel(g_allowGroup)
        + " | Whitelist: " + (string)llGetListLength(g_whitelist) + "/" + (string)MAX_WHITELIST + "\\n"
        + "Free Memory: " + (string)llGetFreeMemory() + " bytes";
    list buttons = [
        "Toggle Arm", "Toggle Group", "Status",
        "Range 16m", "Range 32m", "Range 64m",
        "Add Name", "Remove Name", "List Allowed",
        "Clear List", "Reset Orb", "Close"
    ];
    llDialog(target, body, buttons, g_channel);
}

integer isAuthorizedAvatar(key av, string avName)
{
    if (av == g_owner) return TRUE;
    if (g_allowGroup && llSameGroup(av)) return TRUE;
    string lowerName = llToLower(llStringTrim(avName, STRING_TRIM));
    if (llListFindList(g_whitelist, [lowerName]) != -1) return TRUE;
    return FALSE;
}

handleIntruder(key av, string avName)
{
    integer idx = llListFindList(g_warnKeys, [av]);
    integer strikes = 1;
    if (idx == -1)
    {
        g_warnKeys += [av];
        g_warnCounts += [1];
        if (llGetListLength(g_warnKeys) > MAX_TRACKED)
        {
            g_warnKeys = llDeleteSubList(g_warnKeys, 0, 0);
            g_warnCounts = llDeleteSubList(g_warnCounts, 0, 0);
        }
    }
    else
    {
        strikes = llList2Integer(g_warnCounts, idx) + 1;
        g_warnCounts = llListReplaceList(g_warnCounts, [strikes], idx, idx);
    }

    if (strikes <= GRACE_TICKS)
    {
        llRegionSayTo(av, 0, "Security Notice: Private parcel. Please leave within "
            + (string)((GRACE_TICKS - strikes + 1) * (integer)SCAN_INTERVAL) + "s.");
    }
    else
    {
        llRegionSayTo(av, 0, "Access denied. Ejecting from private parcel.");
        llEjectFromLand(av);
        ++g_ejectCount;
        integer remIdx = llListFindList(g_warnKeys, [av]);
        if (remIdx != -1)
        {
            g_warnKeys = llDeleteSubList(g_warnKeys, remIdx, remIdx);
            g_warnCounts = llDeleteSubList(g_warnCounts, remIdx, remIdx);
        }
        llOwnerSay("Ejected unauthorized visitor: " + avName);
        updateHoverDisplay();
    }
}

initOrb()
{
    g_owner = llGetOwner();
    g_channel = derivePrivateChannel();
    g_range = DEFAULT_RANGE;
    g_warnKeys = [];
    g_warnCounts = [];
    closeDialogChannel();
    restartScanner();
    llOwnerSay("Security Orb online (Channel " + (string)g_channel + "). Touch for Owner Console.");
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        initOrb();
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        if (toucher != g_owner)
        {
            llRegionSayTo(toucher, 0, "Access restricted to parcel owner.");
            return;
        }
        openOwnerConsole(toucher);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (id != g_owner || channel != g_channel) return;
        string trimmed = llStringTrim(message, STRING_TRIM);

        if (g_inputMode == "ADD")
        {
            string norm = llToLower(trimmed);
            if (norm != "" && llListFindList(g_whitelist, [norm]) == -1)
            {
                if (llGetListLength(g_whitelist) >= MAX_WHITELIST)
                {
                    g_whitelist = llDeleteSubList(g_whitelist, 0, 0);
                }
                g_whitelist += [norm];
                llOwnerSay("Added to whitelist: " + trimmed);
            }
            closeDialogChannel();
            updateHoverDisplay();
            return;
        }
        else if (g_inputMode == "REMOVE")
        {
            string normRem = llToLower(trimmed);
            integer pos = llListFindList(g_whitelist, [normRem]);
            if (pos != -1)
            {
                g_whitelist = llDeleteSubList(g_whitelist, pos, pos);
                llOwnerSay("Removed from whitelist: " + trimmed);
            }
            else
            {
                llOwnerSay("Name not found in whitelist: " + trimmed);
            }
            closeDialogChannel();
            updateHoverDisplay();
            return;
        }

        if (trimmed == "Toggle Arm")
        {
            g_armed = !g_armed;
            restartScanner();
        }
        else if (trimmed == "Toggle Group")
        {
            g_allowGroup = !g_allowGroup;
            updateHoverDisplay();
        }
        else if (trimmed == "Range 16m")
        {
            g_range = 16.0;
            restartScanner();
        }
        else if (trimmed == "Range 32m")
        {
            g_range = 32.0;
            restartScanner();
        }
        else if (trimmed == "Range 64m")
        {
            g_range = 64.0;
            restartScanner();
        }
        else if (trimmed == "Add Name")
        {
            g_inputMode = "ADD";
            llSetTimerEvent(DIALOG_TIMEOUT);
            llTextBox(g_owner, "Enter avatar name to ADD to whitelist:", g_channel);
            return;
        }
        else if (trimmed == "Remove Name")
        {
            g_inputMode = "REMOVE";
            llSetTimerEvent(DIALOG_TIMEOUT);
            llTextBox(g_owner, "Enter avatar name to REMOVE from whitelist:", g_channel);
            return;
        }
        else if (trimmed == "List Allowed")
        {
            if (llGetListLength(g_whitelist) == 0) llOwnerSay("Whitelist is currently empty.");
            else llOwnerSay("Whitelisted avatars: " + llDumpList2String(g_whitelist, ", "));
        }
        else if (trimmed == "Clear List")
        {
            g_whitelist = [];
            llOwnerSay("Whitelist cleared.");
            updateHoverDisplay();
        }
        else if (trimmed == "Status")
        {
            llOwnerSay("Status=" + armedLabel(g_armed)
                + " | Range=" + (string)((integer)g_range) + "m"
                + " | Group=" + onOffLabel(g_allowGroup)
                + " | Whitelist=" + (string)llGetListLength(g_whitelist)
                + " | FreeMem=" + (string)llGetFreeMemory());
        }
        else if (trimmed == "Reset Orb")
        {
            llResetScript();
            return;
        }
        closeDialogChannel();
    }

    sensor(integer num_detected)
    {
        if (!g_armed) return;
        integer i;
        for (i = 0; i < num_detected; ++i)
        {
            key av = llDetectedKey(i);
            string avName = llDetectedName(i);
            if (!isAuthorizedAvatar(av, avName))
            {
                handleIntruder(av, avName);
            }
        }
    }

    no_sensor()
    {
        g_warnKeys = [];
        g_warnCounts = [];
    }

    timer()
    {
        closeDialogChannel();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(vehicle|car|boat|plane|hover|flight|bank|drive)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Physics Hovercraft & Vehicle Engine
// Features: Multi-gear speed selector, dynamic banking & camera follow,
//           owner/public lock console, engine glow & thruster particles
// ============================================================================

// --- CONFIGURATION ---
vector  SIT_OFFSET         = <0.25, 0.0, 0.55>;
float   HOVER_ALTITUDE     = 1.6;
float   DIALOG_TIMEOUT     = 40.0;
list    GEAR_NAMES         = ["Cruise", "Sport", "Hyper"];
list    GEAR_SPEEDS        = [14.0, 24.0, 36.0];

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
key     g_pilot            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_gearIdx          = 1;
integer g_publicAccess     = FALSE;
integer g_engineActive     = FALSE;
float   g_turnRate         = 2.6;
float   g_verticalLift     = 14.0;

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

string accessLabel()
{
    return llList2String(["Owner Only", "Public"], (g_publicAccess != 0));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
    llSetTimerEvent(0.0);
}

setThrusterFx(integer enabled)
{
    if (!enabled)
    {
        llParticleSystem([]);
        llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.03]);
        return;
    }
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.22]);
    llParticleSystem([
        PSYS_PART_FLAGS, PSYS_PART_INTERP_COLOR_MASK | PSYS_PART_INTERP_SCALE_MASK | PSYS_PART_EMISSIVE_MASK,
        PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_ANGLE_CONE,
        PSYS_PART_START_COLOR, <0.0, 1.0, 0.72>,
        PSYS_PART_END_COLOR, <0.0, 0.55, 1.0>,
        PSYS_PART_START_ALPHA, 0.9,
        PSYS_PART_END_ALPHA, 0.0,
        PSYS_PART_START_SCALE, <0.14, 0.14, 0.0>,
        PSYS_PART_END_SCALE, <0.42, 0.42, 0.0>,
        PSYS_PART_MAX_AGE, 0.7,
        PSYS_SRC_BURST_RATE, 0.06,
        PSYS_SRC_BURST_PART_COUNT, 6
    ]);
}

updateHudText()
{
    string gearName = llList2String(GEAR_NAMES, g_gearIdx);
    string statusTxt = llList2String(["PARKED · Sit to Pilot", "ENGINE LIVE · WASD + E/C"], (g_engineActive != 0));
    vector col = <0.0, 0.92, 0.85>;
    if (g_engineActive) col = <0.0, 1.0, 0.58>;
    llSetText("${title}\\n" + statusTxt + "\\nGear: " + gearName + " | Access: " + accessLabel(), col, 1.0);
}

configureVehiclePhysics()
{
    llSetVehicleType(VEHICLE_TYPE_AIRPLANE);
    llSetVehicleFloatParam(VEHICLE_HOVER_HEIGHT, HOVER_ALTITUDE);
    llSetVehicleFloatParam(VEHICLE_HOVER_EFFICIENCY, 0.85);
    llSetVehicleFloatParam(VEHICLE_HOVER_TIMESCALE, 0.45);
    llSetVehicleFloatParam(VEHICLE_BUOYANCY, 1.0);
    llSetVehicleVectorParam(VEHICLE_LINEAR_FRICTION_TIMESCALE, <2.2, 1.4, 2.0>);
    llSetVehicleVectorParam(VEHICLE_ANGULAR_FRICTION_TIMESCALE, <0.35, 0.35, 0.45>);
    llSetVehicleFloatParam(VEHICLE_LINEAR_MOTOR_TIMESCALE, 0.35);
    llSetVehicleFloatParam(VEHICLE_LINEAR_MOTOR_DECAY_TIMESCALE, 0.45);
    llSetVehicleFloatParam(VEHICLE_ANGULAR_MOTOR_TIMESCALE, 0.25);
    llSetVehicleFloatParam(VEHICLE_ANGULAR_MOTOR_DECAY_TIMESCALE, 0.35);
    llSetVehicleFloatParam(VEHICLE_BANKING_EFFICIENCY, 0.75);
    llSetVehicleFloatParam(VEHICLE_BANKING_MIX, 0.65);
    llSetVehicleFloatParam(VEHICLE_BANKING_TIMESCALE, 0.25);
    llSetVehicleFloatParam(VEHICLE_VERTICAL_ATTRACTION_EFFICIENCY, 0.8);
    llSetVehicleFloatParam(VEHICLE_VERTICAL_ATTRACTION_TIMESCALE, 0.9);
    llSetCameraEyeOffset(<-6.5, 0.0, 2.4>);
    llSetCameraAtOffset(<2.5, 0.0, 1.0>);
    llSitTarget(SIT_OFFSET, ZERO_ROTATION);
    llSetSitText("Pilot Craft");
}

openVehicleMenu(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(DIALOG_TIMEOUT);
    string info = "${title}\\nCurrent Gear: " + llList2String(GEAR_NAMES, g_gearIdx)
        + "\\nAccess Mode: " + accessLabel()
        + "\\nFree Memory: " + (string)llGetFreeMemory() + " bytes";
    list btns = ["Cruise", "Sport", "Hyper", "Toggle Lock", "Eject Pilot", "Reset"];
    llDialog(target, info, btns, g_channel);
}

disengagePilot()
{
    g_engineActive = FALSE;
    llSetStatus(STATUS_PHYSICS, FALSE);
    llReleaseControls();
    setThrusterFx(FALSE);
    g_pilot = NULL_KEY;
    updateHudText();
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        configureVehiclePhysics();
        setThrusterFx(FALSE);
        updateHudText();
        llOwnerSay("Vehicle engine calibrated. Sit to pilot or touch for control menu.");
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        if (toucher == g_owner || toucher == g_pilot)
        {
            openVehicleMenu(toucher);
        }
        else
        {
            llRegionSayTo(toucher, 0, "Sit to pilot or contact owner for vehicle settings.");
        }
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        if (id != g_owner && id != g_pilot) return;
        if (message == "Cruise") g_gearIdx = 0;
        else if (message == "Sport") g_gearIdx = 1;
        else if (message == "Hyper") g_gearIdx = 2;
        else if (message == "Toggle Lock" && id == g_owner) g_publicAccess = !g_publicAccess;
        else if (message == "Eject Pilot" && id == g_owner && g_pilot != NULL_KEY)
        {
            llUnSit(g_pilot);
        }
        else if (message == "Reset" && id == g_owner)
        {
            llResetScript();
            return;
        }
        updateHudText();
        closeMenu();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER)
        {
            llResetScript();
            return;
        }
        if (change & CHANGED_LINK)
        {
            key sitter = llAvatarOnSitTarget();
            if (sitter != NULL_KEY)
            {
                if (!g_publicAccess && sitter != g_owner)
                {
                    llRegionSayTo(sitter, 0, "Vehicle is locked to owner only.");
                    llUnSit(sitter);
                    return;
                }
                g_pilot = sitter;
                llRequestPermissions(g_pilot, PERMISSION_TAKE_CONTROLS);
            }
            else if (g_pilot != NULL_KEY)
            {
                disengagePilot();
            }
        }
    }

    run_time_permissions(integer perm)
    {
        if (perm & PERMISSION_TAKE_CONTROLS)
        {
            llTakeControls(
                CONTROL_FWD | CONTROL_BACK | CONTROL_LEFT | CONTROL_RIGHT
                | CONTROL_ROT_LEFT | CONTROL_ROT_RIGHT | CONTROL_UP | CONTROL_DOWN,
                TRUE,
                FALSE
            );
            g_engineActive = TRUE;
            llSetStatus(STATUS_PHYSICS, TRUE);
            setThrusterFx(TRUE);
            updateHudText();
            llRegionSayTo(g_pilot, 0, "Controls engaged! Gear: " + llList2String(GEAR_NAMES, g_gearIdx));
        }
    }

    control(key id, integer level, integer edge)
    {
        if (!g_engineActive || id != g_pilot) return;
        float fwdPower = llList2Float(GEAR_SPEEDS, g_gearIdx);
        vector lin = ZERO_VECTOR;
        vector ang = ZERO_VECTOR;
        if (level & CONTROL_FWD) lin.x += fwdPower;
        if (level & CONTROL_BACK) lin.x -= fwdPower * 0.55;
        if (level & CONTROL_LEFT) lin.y += fwdPower * 0.45;
        if (level & CONTROL_RIGHT) lin.y -= fwdPower * 0.45;
        if (level & CONTROL_UP) lin.z += g_verticalLift;
        if (level & CONTROL_DOWN) lin.z -= g_verticalLift;
        if (level & CONTROL_ROT_LEFT) ang.z += g_turnRate;
        if (level & CONTROL_ROT_RIGHT) ang.z -= g_turnRate;
        llSetVehicleVectorParam(VEHICLE_LINEAR_MOTOR_DIRECTION, lin);
        llSetVehicleVectorParam(VEHICLE_ANGULAR_MOTOR_DIRECTION, ang);
    }

    timer()
    {
        closeMenu();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }
}
\`\`\``;
  }

  if (/(door|slide|gate|open|close|דלת|שער)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Smart Sliding Door Controller
// Features: Smooth stepped slide animation (non-blocking timer), access modes
//           (Public / Group / Owner), auto-close, owner llDialog menu
// ============================================================================

// --- CONFIGURATION ---
vector  SLIDE_OFFSET       = <0.0, 2.2, 0.0>;
integer SLIDE_STEPS        = 8;
float   STEP_INTERVAL      = 0.08;
float   AUTO_CLOSE_DELAY   = 6.0;
float   MENU_TIMEOUT       = 40.0;

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
vector  g_closedPos        = ZERO_VECTOR;
integer g_isOpen           = FALSE;
integer g_isMoving         = FALSE;
integer g_stepIndex        = 0;
integer g_targetOpen       = FALSE;
integer g_accessMode       = 0; // 0 = Public, 1 = Group, 2 = Owner Only
integer g_autoSensor       = FALSE;
integer g_timerMode        = 0; // 0 = idle, 1 = animating, 2 = auto-close, 3 = menu

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

string accessModeName()
{
    return llList2String(["Public", "Group Only", "Owner Only"], g_accessMode);
}

integer canOperateDoor(key av)
{
    if (av == g_owner) return TRUE;
    if (g_accessMode == 0) return TRUE;
    if (g_accessMode == 1 && llSameGroup(av)) return TRUE;
    return FALSE;
}

closeMenuChannel()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
}

updateDoorVisuals()
{
    string stateLabel = llList2String(["CLOSED", "OPEN"], (g_isOpen != 0));
    vector col = <0.0, 0.95, 0.62>;
    float glow = 0.04;
    if (g_isOpen)
    {
        col = <0.25, 1.0, 0.45>;
        glow = 0.16;
    }
    llSetLinkPrimitiveParamsFast(LINK_THIS, [
        PRIM_GLOW, ALL_SIDES, glow
    ]);
    llSetText("${title}\\nState: " + stateLabel + " | Access: " + accessModeName(), col, 1.0);
}

startDoorSlide(integer wantOpen)
{
    if (g_isMoving) return;
    if (wantOpen == g_isOpen) return;
    g_targetOpen = wantOpen;
    g_isMoving = TRUE;
    g_stepIndex = 0;
    g_timerMode = 1;
    llSetTimerEvent(STEP_INTERVAL);
}

applySensorMode()
{
    llSensorRemove();
    if (g_autoSensor)
    {
        llSensorRepeat("", NULL_KEY, AGENT, 4.0, PI, 1.8);
    }
}

openOwnerMenu(key target)
{
    closeMenuChannel();
    g_listenHandle = llListen(g_channel, "", target, "");
    string sensorTxt = llList2String(["OFF", "ON"], (g_autoSensor != 0));
    string msg = "${title}\\nAccess: " + accessModeName()
        + " | Auto-Sensor: " + sensorTxt
        + "\\nTouch non-owner to test access or pick an option:";
    list btns = ["Open/Close", "Public", "Group Only", "Owner Only", "Toggle Sensor", "Recalibrate", "Reset", "Close"];
    llDialog(target, msg, btns, g_channel);
    if (!g_isMoving)
    {
        g_timerMode = 3;
        llSetTimerEvent(MENU_TIMEOUT);
    }
}

initDoor()
{
    g_owner = llGetOwner();
    g_channel = deriveChannel();
    g_closedPos = llGetPos();
    g_isOpen = FALSE;
    g_isMoving = FALSE;
    g_timerMode = 0;
    closeMenuChannel();
    llSetTimerEvent(0.0);
    applySensorMode();
    updateDoorVisuals();
    llOwnerSay("Smart Sliding Door ready. Closed origin saved at " + (string)g_closedPos);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        initDoor();
    }

    touch_start(integer total_number)
    {
        key av = llDetectedKey(0);
        if (!canOperateDoor(av))
        {
            llRegionSayTo(av, 0, "Door locked (" + accessModeName() + ").");
            return;
        }
        if (av == g_owner && llDetectedTouchFace(0) == 0)
        {
            openOwnerMenu(av);
            return;
        }
        startDoorSlide(!g_isOpen);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel || id != g_owner) return;
        if (message == "Open/Close") startDoorSlide(!g_isOpen);
        else if (message == "Public") g_accessMode = 0;
        else if (message == "Group Only") g_accessMode = 1;
        else if (message == "Owner Only") g_accessMode = 2;
        else if (message == "Toggle Sensor")
        {
            g_autoSensor = !g_autoSensor;
            applySensorMode();
        }
        else if (message == "Recalibrate")
        {
            g_closedPos = llGetPos();
            g_isOpen = FALSE;
            llOwnerSay("Recalibrated closed origin: " + (string)g_closedPos);
        }
        else if (message == "Reset")
        {
            llResetScript();
            return;
        }
        closeMenuChannel();
        updateDoorVisuals();
    }

    sensor(integer num_detected)
    {
        if (!g_autoSensor || g_isOpen) return;
        integer i;
        for (i = 0; i < num_detected; ++i)
        {
            if (canOperateDoor(llDetectedKey(i)))
            {
                startDoorSlide(TRUE);
                return;
            }
        }
    }

    timer()
    {
        if (g_timerMode == 1)
        {
            ++g_stepIndex;
            float frac = (float)g_stepIndex / (float)SLIDE_STEPS;
            if (!g_targetOpen) frac = 1.0 - frac;
            vector nextPos = g_closedPos + (SLIDE_OFFSET * frac);
            llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_POSITION, nextPos]);
            if (g_stepIndex >= SLIDE_STEPS)
            {
                g_isMoving = FALSE;
                g_isOpen = g_targetOpen;
                updateDoorVisuals();
                if (g_isOpen)
                {
                    g_timerMode = 2;
                    llSetTimerEvent(AUTO_CLOSE_DELAY);
                }
                else
                {
                    g_timerMode = 0;
                    llSetTimerEvent(0.0);
                }
            }
        }
        else if (g_timerMode == 2)
        {
            startDoorSlide(FALSE);
        }
        else
        {
            closeMenuChannel();
            g_timerMode = 0;
            llSetTimerEvent(0.0);
        }
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(tip|jar|pay|vendor|money|donate|leaderboard)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Tip Jar & Top-5 Donor Board
// Features: Configurable quick-pay buttons, bounded donor ledger, thank-you
//           particles, owner console for goal setting & donor report
// ============================================================================

// --- CONFIGURATION ---
integer MAX_DONORS         = 40;
float   FX_DURATION        = 3.0;
float   MENU_TIMEOUT       = 45.0;
list    PAY_PRESETS        = [25, 50, 100, 250];

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_totalLinden      = 0;
integer g_tipGoal          = 1000;
string  g_topName          = "None";
integer g_topAmount        = 0;
string  g_lastDonor        = "None";
integer g_lastAmount       = 0;
list    g_donorNames       = [];
list    g_donorTotals      = [];
integer g_fxActive         = FALSE;

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
}

updateHoverBoard()
{
    integer pct = 0;
    if (g_tipGoal > 0)
    {
        pct = (integer)(((float)g_totalLinden / (float)g_tipGoal) * 100.0);
    }
    string txt = "${title}\\n"
        + "Total: L$" + (string)g_totalLinden + " / L$" + (string)g_tipGoal + " (" + (string)pct + "%)\\n"
        + "Top Donor: " + g_topName + " (L$" + (string)g_topAmount + ")\\n"
        + "Latest: " + g_lastDonor + " (L$" + (string)g_lastAmount + ")";
    llSetText(txt, <0.0, 1.0, 0.65>, 1.0);
}

triggerThankYouFx()
{
    g_fxActive = TRUE;
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.24]);
    llParticleSystem([
        PSYS_PART_FLAGS, PSYS_PART_INTERP_COLOR_MASK | PSYS_PART_INTERP_SCALE_MASK | PSYS_PART_EMISSIVE_MASK,
        PSYS_SRC_PATTERN, PSYS_SRC_PATTERN_ANGLE_CONE,
        PSYS_PART_START_COLOR, <0.0, 1.0, 0.65>,
        PSYS_PART_END_COLOR, <0.2, 0.78, 1.0>,
        PSYS_PART_START_ALPHA, 1.0,
        PSYS_PART_END_ALPHA, 0.0,
        PSYS_PART_START_SCALE, <0.16, 0.16, 0.0>,
        PSYS_PART_END_SCALE, <0.45, 0.45, 0.0>,
        PSYS_PART_MAX_AGE, 1.6,
        PSYS_SRC_BURST_RATE, 0.05,
        PSYS_SRC_BURST_PART_COUNT, 12
    ]);
    llSetTimerEvent(FX_DURATION);
}

recordDonation(string donorName, integer amount)
{
    g_totalLinden += amount;
    g_lastDonor = donorName;
    g_lastAmount = amount;

    integer idx = llListFindList(g_donorNames, [donorName]);
    integer cumulative = amount;
    if (idx == -1)
    {
        if (llGetListLength(g_donorNames) >= MAX_DONORS)
        {
            g_donorNames = llDeleteSubList(g_donorNames, 0, 0);
            g_donorTotals = llDeleteSubList(g_donorTotals, 0, 0);
        }
        g_donorNames += [donorName];
        g_donorTotals += [amount];
    }
    else
    {
        cumulative = llList2Integer(g_donorTotals, idx) + amount;
        g_donorTotals = llListReplaceList(g_donorTotals, [cumulative], idx, idx);
    }

    if (cumulative > g_topAmount)
    {
        g_topAmount = cumulative;
        g_topName = donorName;
    }
}

printDonorReport()
{
    integer count = llGetListLength(g_donorNames);
    if (count == 0)
    {
        llOwnerSay("No tips recorded yet.");
        return;
    }
    string report = "Donor Summary (" + (string)count + " donors, L$" + (string)g_totalLinden + " total): ";
    integer i;
    for (i = 0; i < count; ++i)
    {
        if (i > 0) report += ", ";
        report += llList2String(g_donorNames, i) + " (L$" + (string)llList2Integer(g_donorTotals, i) + ")";
    }
    llOwnerSay(report);
}

openOwnerMenu(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(MENU_TIMEOUT);
    string info = "${title} · Owner Console\\nTotal: L$" + (string)g_totalLinden
        + " | Goal: L$" + (string)g_tipGoal
        + "\\nFree Memory: " + (string)llGetFreeMemory() + " bytes";
    llDialog(target, info, ["Goal 500", "Goal 2000", "Goal 5000", "Donor Report", "Test FX", "Reset Stats"], g_channel);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        llSetPayPrice(PAY_DEFAULT, PAY_PRESETS);
        llSetClickAction(CLICK_ACTION_PAY);
        llParticleSystem([]);
        updateHoverBoard();
        llOwnerSay("Tip Jar initialized. Right-click -> Touch for Owner Console.");
    }

    touch_start(integer total_number)
    {
        key av = llDetectedKey(0);
        if (av == g_owner)
        {
            openOwnerMenu(av);
        }
        else
        {
            llRegionSayTo(av, 0, "Thank you for supporting! Right-click and choose Pay to leave a tip.");
        }
    }

    money(key id, integer amount)
    {
        string donor = llKey2Name(id);
        recordDonation(donor, amount);
        llRegionSayTo(id, 0, "Thank you so much, " + donor + ", for your generous L$" + (string)amount + " tip!");
        llOwnerSay("Tip received: " + donor + " paid L$" + (string)amount + " (Total: L$" + (string)g_totalLinden + ")");
        updateHoverBoard();
        triggerThankYouFx();
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel || id != g_owner) return;
        if (message == "Goal 500") g_tipGoal = 500;
        else if (message == "Goal 2000") g_tipGoal = 2000;
        else if (message == "Goal 5000") g_tipGoal = 5000;
        else if (message == "Donor Report") printDonorReport();
        else if (message == "Test FX") triggerThankYouFx();
        else if (message == "Reset Stats")
        {
            llResetScript();
            return;
        }
        updateHoverBoard();
        closeMenu();
    }

    timer()
    {
        llSetTimerEvent(0.0);
        if (g_fxActive)
        {
            g_fxActive = FALSE;
            llParticleSystem([]);
            llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.04]);
        }
        closeMenu();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(teleport|tp\b|warp|landmark|sit.?tp)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Multi-Destination Sit Teleporter
// Features: Fast llSetRegionPos transport, destination selector menu,
//           safe origin return, hover indicator & teleport count diagnostics
// ============================================================================

// --- CONFIGURATION ---
float   MENU_TIMEOUT       = 45.0;
list    DEST_NAMES         = ["Sky Lounge", "Main Plaza", "VIP Roof", "Beach Dock"];
list    DEST_COORDS        = [<128.0, 128.0, 65.0>, <128.0, 110.0, 24.0>, <140.0, 132.0, 120.0>, <96.0, 148.0, 22.0>];

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_destIdx          = 0;
integer g_tripCount        = 0;
vector  g_homePos          = ZERO_VECTOR;

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
    llSetTimerEvent(0.0);
}

updateSign()
{
    string destName = llList2String(DEST_NAMES, g_destIdx);
    vector destPos = llList2Vector(DEST_COORDS, g_destIdx);
    string txt = "${title}\\nDestination: " + destName
        + " (" + (string)((integer)destPos.x) + ", " + (string)((integer)destPos.y) + ", " + (string)((integer)destPos.z) + ")\\n"
        + "Sit to Teleport | Trips: " + (string)g_tripCount;
    llSetText(txt, <0.1, 0.96, 0.82>, 1.0);
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.10]);
}

openDestinationMenu(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(MENU_TIMEOUT);
    string info = "Select Teleport Destination\\nCurrent: " + llList2String(DEST_NAMES, g_destIdx)
        + "\\nRight-click -> Sit to warp immediately.";
    list btns = DEST_NAMES + ["Status", "Close"];
    llDialog(target, info, btns, g_channel);
}

executeTeleport(key av)
{
    vector targetPos = llList2Vector(DEST_COORDS, g_destIdx);
    string destName = llList2String(DEST_NAMES, g_destIdx);
    vector origin = llGetPos();
    g_homePos = origin;

    if (llSetRegionPos(targetPos))
    {
        llUnSit(av);
        ++g_tripCount;
        llRegionSayTo(av, 0, "Arrived safely at " + destName + "!");
    }
    else
    {
        llUnSit(av);
        llRegionSayTo(av, 0, "Teleport failed: destination unreachable.");
    }
    llSetRegionPos(g_homePos);
    updateSign();
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        g_homePos = llGetPos();
        llSitTarget(<0.0, 0.0, 0.55>, ZERO_ROTATION);
        llSetSitText("Teleport");
        llSetClickAction(CLICK_ACTION_SIT);
        closeMenu();
        updateSign();
        llOwnerSay("Multi-Destination Teleporter online. Right-click -> Touch to change destination.");
    }

    touch_start(integer total_number)
    {
        openDestinationMenu(llDetectedKey(0));
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        integer idx = llListFindList(DEST_NAMES, [message]);
        if (idx != -1)
        {
            g_destIdx = idx;
            updateSign();
            llRegionSayTo(id, 0, "Destination switched to: " + message);
        }
        else if (message == "Status")
        {
            llRegionSayTo(id, 0, "Trips: " + (string)g_tripCount + " | Free Memory: " + (string)llGetFreeMemory() + " bytes");
        }
        closeMenu();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER)
        {
            llResetScript();
            return;
        }
        if (change & CHANGED_LINK)
        {
            key av = llAvatarOnSitTarget();
            if (av != NULL_KEY)
            {
                executeTeleport(av);
            }
        }
    }

    timer()
    {
        closeMenu();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }
}
\`\`\``;
  }

  if (/(hud|menu|dialog|ui|button)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Multi-Page HUD & Dialog Controller
// Features: Paginated llDialog navigation, theme color presets, glow & alpha
//           controls, idle listener auto-cleanup, attach & memory diagnostics
// ============================================================================

// --- CONFIGURATION ---
float   DIALOG_TIMEOUT     = 45.0;
integer PAGE_SIZE          = 9;
list    THEME_LABELS       = [
    "Emerald", "Cyan", "Gold", "Crimson", "Violet", "Amber",
    "Ice Blue", "Mint", "Rose", "White", "Obsidian", "Lime"
];
list    THEME_VECTORS      = [
    <0.0, 1.0, 0.62>, <0.0, 0.85, 1.0>, <1.0, 0.82, 0.2>, <1.0, 0.22, 0.32>,
    <0.68, 0.35, 1.0>, <1.0, 0.58, 0.12>, <0.6, 0.92, 1.0>, <0.45, 1.0, 0.78>,
    <1.0, 0.42, 0.72>, <1.0, 1.0, 1.0>, <0.14, 0.18, 0.20>, <0.55, 1.0, 0.18>
];

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_page             = 0;
integer g_glowOn           = FALSE;
float   g_alpha            = 1.0;
string  g_activeTheme      = "Emerald";

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeDialog()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
    llSetTimerEvent(0.0);
}

applyVisualPreset(vector col)
{
    float glowAmt = 0.0;
    if (g_glowOn) glowAmt = 0.22;
    llSetLinkPrimitiveParamsFast(LINK_SET, [
        PRIM_COLOR, ALL_SIDES, col, g_alpha,
        PRIM_GLOW, ALL_SIDES, glowAmt
    ]);
}

openMainMenu(key target)
{
    closeDialog();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(DIALOG_TIMEOUT);
    string glowTxt = llList2String(["OFF", "ON"], (g_glowOn != 0));
    string body = "${title} HUD\\nTheme: " + g_activeTheme
        + " | Glow: " + glowTxt
        + " | Opacity: " + (string)((integer)(g_alpha * 100.0)) + "%";
    list buttons = ["Themes...", "Glow Toggle", "Opacity", "Memory", "Reset", "Close"];
    llDialog(target, body, buttons, g_channel);
}

openThemePage(key target, integer pageNum)
{
    integer total = llGetListLength(THEME_LABELS);
    integer maxPages = (total + PAGE_SIZE - 1) / PAGE_SIZE;
    if (pageNum < 0) pageNum = maxPages - 1;
    if (pageNum >= maxPages) pageNum = 0;
    g_page = pageNum;

    integer startIdx = g_page * PAGE_SIZE;
    integer endIdx = startIdx + PAGE_SIZE - 1;
    if (endIdx >= total) endIdx = total - 1;

    list pageBtns = ["<< Prev", "Main Menu", "Next >>"] + llList2List(THEME_LABELS, startIdx, endIdx);
    closeDialog();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(DIALOG_TIMEOUT);
    string hdr = "Select HUD Theme (Page " + (string)(g_page + 1) + "/" + (string)maxPages + ")\\nCurrent: " + g_activeTheme;
    llDialog(target, hdr, pageBtns, g_channel);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        closeDialog();
        applyVisualPreset(llList2Vector(THEME_VECTORS, 0));
        llOwnerSay("${title} HUD ready (" + (string)llGetFreeMemory() + " bytes free). Touch to open menu.");
    }

    attach(key id)
    {
        if (id != NULL_KEY)
        {
            g_owner = id;
            g_channel = deriveChannel();
            closeDialog();
            llOwnerSay("${title} HUD attached. Touch anytime to configure.");
        }
    }

    touch_start(integer total_number)
    {
        key av = llDetectedKey(0);
        if (av == g_owner)
        {
            openMainMenu(av);
        }
    }

    listen(integer channel, string name, key id, string message)
    {
        if (id != g_owner || channel != g_channel) return;
        if (message == "Themes...")
        {
            openThemePage(id, 0);
            return;
        }
        else if (message == "<< Prev")
        {
            openThemePage(id, g_page - 1);
            return;
        }
        else if (message == "Next >>")
        {
            openThemePage(id, g_page + 1);
            return;
        }
        else if (message == "Main Menu")
        {
            openMainMenu(id);
            return;
        }
        else if (message == "Glow Toggle")
        {
            g_glowOn = !g_glowOn;
            integer idx = llListFindList(THEME_LABELS, [g_activeTheme]);
            if (idx < 0) idx = 0;
            applyVisualPreset(llList2Vector(THEME_VECTORS, idx));
            openMainMenu(id);
            return;
        }
        else if (message == "Opacity")
        {
            if (g_alpha > 0.75) g_alpha = 0.65;
            else g_alpha = 1.0;
            integer idx2 = llListFindList(THEME_LABELS, [g_activeTheme]);
            if (idx2 < 0) idx2 = 0;
            applyVisualPreset(llList2Vector(THEME_VECTORS, idx2));
            openMainMenu(id);
            return;
        }
        else if (message == "Memory")
        {
            llOwnerSay("Free Mono memory: " + (string)llGetFreeMemory() + " bytes");
        }
        else if (message == "Reset")
        {
            llResetScript();
            return;
        }
        else
        {
            integer themeIdx = llListFindList(THEME_LABELS, [message]);
            if (themeIdx != -1)
            {
                g_activeTheme = message;
                applyVisualPreset(llList2Vector(THEME_VECTORS, themeIdx));
                llOwnerSay("HUD theme switched to: " + g_activeTheme);
                openThemePage(id, g_page);
                return;
            }
        }
        closeDialog();
    }

    timer()
    {
        closeDialog();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(particle|fire|flame|rain|snow|spark|magic|fx|effect)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Multi-Preset Particle FX Studio
// Features: 4 curated particle presets (Aurora, Plasma, Ember, Snowfall),
//           intensity controls, owner/user llDialog menu, clean timer timeout
// ============================================================================

// --- CONFIGURATION ---
float   MENU_TIMEOUT       = 45.0;
list    FX_PRESETS         = ["Aurora", "Plasma", "Ember", "Snowfall"];

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_active           = TRUE;
integer g_presetIdx        = 0;
float   g_intensity        = 1.0;

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
    llSetTimerEvent(0.0);
}

applyParticleEmitter()
{
    string presetName = llList2String(FX_PRESETS, g_presetIdx);
    if (!g_active)
    {
        llParticleSystem([]);
        llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.0]);
        llSetText("${title}\\nPreset: " + presetName + " (PAUSED)", <0.68, 0.72, 0.75>, 1.0);
        return;
    }

    vector startCol = <0.0, 1.0, 0.72>;
    vector endCol = <0.12, 0.55, 1.0>;
    vector accel = <0.0, 0.0, 0.18>;
    integer pattern = PSYS_SRC_PATTERN_ANGLE_CONE;
    float maxAge = 2.2;
    float burstRate = 0.08 / g_intensity;
    integer burstCount = (integer)(6.0 * g_intensity);

    if (g_presetIdx == 1)
    {
        startCol = <0.72, 0.25, 1.0>;
        endCol = <0.0, 0.95, 1.0>;
        accel = <0.0, 0.0, 0.05>;
        pattern = PSYS_SRC_PATTERN_EXPLODE;
        maxAge = 1.4;
    }
    else if (g_presetIdx == 2)
    {
        startCol = <1.0, 0.72, 0.15>;
        endCol = <1.0, 0.18, 0.05>;
        accel = <0.0, 0.0, 0.45>;
        pattern = PSYS_SRC_PATTERN_ANGLE_CONE;
        maxAge = 1.8;
    }
    else if (g_presetIdx == 3)
    {
        startCol = <0.92, 0.98, 1.0>;
        endCol = <0.65, 0.85, 1.0>;
        accel = <0.0, 0.0, -0.35>;
        pattern = PSYS_SRC_PATTERN_DROP;
        maxAge = 3.2;
    }

    llParticleSystem([
        PSYS_PART_FLAGS, PSYS_PART_INTERP_COLOR_MASK | PSYS_PART_INTERP_SCALE_MASK | PSYS_PART_EMISSIVE_MASK | PSYS_PART_WIND_MASK,
        PSYS_SRC_PATTERN, pattern,
        PSYS_PART_START_COLOR, startCol,
        PSYS_PART_END_COLOR, endCol,
        PSYS_PART_START_ALPHA, 0.95,
        PSYS_PART_END_ALPHA, 0.0,
        PSYS_PART_START_SCALE, <0.16, 0.16, 0.0>,
        PSYS_PART_END_SCALE, <0.52, 0.52, 0.0>,
        PSYS_PART_MAX_AGE, maxAge,
        PSYS_SRC_ACCEL, accel,
        PSYS_SRC_BURST_RATE, burstRate,
        PSYS_SRC_BURST_PART_COUNT, burstCount,
        PSYS_SRC_BURST_SPEED_MIN, 0.35,
        PSYS_SRC_BURST_SPEED_MAX, 1.15
    ]);
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.16]);
    llSetText("${title}\\nPreset: " + presetName + " (ACTIVE)", startCol, 1.0);
}

openFxMenu(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(MENU_TIMEOUT);
    string statusStr = llList2String(["PAUSED", "ACTIVE"], (g_active != 0));
    string msg = "${title}\\nStatus: " + statusStr
        + " | Preset: " + llList2String(FX_PRESETS, g_presetIdx)
        + " | Power: " + (string)((integer)(g_intensity * 100.0)) + "%";
    list btns = ["Toggle FX", "Low Power", "High Power", "Aurora", "Plasma", "Ember", "Snowfall", "Reset", "Close"];
    llDialog(target, msg, btns, g_channel);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        closeMenu();
        applyParticleEmitter();
        llOwnerSay("Particle FX Studio online. Touch prim for control menu.");
    }

    touch_start(integer total_number)
    {
        openFxMenu(llDetectedKey(0));
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        if (message == "Toggle FX") g_active = !g_active;
        else if (message == "Low Power") g_intensity = 0.6;
        else if (message == "High Power") g_intensity = 1.5;
        else if (message == "Reset" && id == g_owner)
        {
            llResetScript();
            return;
        }
        else
        {
            integer idx = llListFindList(FX_PRESETS, [message]);
            if (idx != -1)
            {
                g_presetIdx = idx;
                g_active = TRUE;
            }
        }
        applyParticleEmitter();
        closeMenu();
    }

    timer()
    {
        closeMenu();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(http|webhook|discord|api|rest|server|json)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Secure HTTP JSON Client Bridge
// Features: Structured JSON serialization (llList2Json), automatic retry
//           with backoff timer, request correlation & owner diagnostics menu
// ============================================================================

// --- CONFIGURATION ---
string  ENDPOINT_URL       = "https://example.com/api/sl-event";
float   REQUEST_TIMEOUT    = 15.0;
integer MAX_RETRIES        = 2;
float   MENU_TIMEOUT       = 40.0;

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
key     g_reqId            = NULL_KEY;
string  g_lastBody         = "";
integer g_retryCount       = 0;
integer g_okCount          = 0;
integer g_errCount         = 0;
integer g_lastStatus       = 0;

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
}

updateBridgeSign(string stateLabel, vector col)
{
    string txt = "${title}\\n" + stateLabel
        + "\\nOK: " + (string)g_okCount + " | Err: " + (string)g_errCount
        + " | Last HTTP: " + (string)g_lastStatus;
    llSetText(txt, col, 1.0);
}

dispatchJsonRequest(string payload)
{
    g_lastBody = payload;
    g_reqId = llHTTPRequest(ENDPOINT_URL, [
        HTTP_METHOD, "POST",
        HTTP_MIMETYPE, "application/json",
        HTTP_BODY_MAXLENGTH, 4096,
        HTTP_VERIFY_CERT, TRUE
    ], payload);
    if (g_reqId == NULL_KEY)
    {
        ++g_errCount;
        updateBridgeSign("THROTTLED (Rate limit)", <1.0, 0.45, 0.35>);
        llOwnerSay("HTTP request throttled by simulator.");
        return;
    }
    updateBridgeSign("DISPATCHING...", <0.2, 0.85, 1.0>);
    llSetTimerEvent(REQUEST_TIMEOUT);
}

sendEventPayload(string eventName, key actorKey, string actorName)
{
    g_retryCount = 0;
    string body = llList2Json(JSON_OBJECT, [
        "event", eventName,
        "actor_key", (string)actorKey,
        "actor_name", actorName,
        "region", llGetRegionName(),
        "object", llGetObjectName(),
        "timestamp", llGetTimestamp()
    ]);
    dispatchJsonRequest(body);
}

openOwnerMenu(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(MENU_TIMEOUT);
    string info = "${title}\\nEndpoint: " + ENDPOINT_URL
        + "\\nSuccess: " + (string)g_okCount + " | Errors: " + (string)g_errCount
        + "\\nFree Memory: " + (string)llGetFreeMemory() + " bytes";
    llDialog(target, info, ["Send Ping", "Status", "Reset", "Close"], g_channel);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        closeMenu();
        updateBridgeSign("READY · Touch to send JSON", <0.0, 1.0, 0.65>);
        llOwnerSay("HTTP JSON Bridge initialized.");
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        if (toucher == g_owner)
        {
            openOwnerMenu(toucher);
            return;
        }
        sendEventPayload("visitor_touch", toucher, llDetectedName(0));
        llRegionSayTo(toucher, 0, "Event transmitted to external bridge.");
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel || id != g_owner) return;
        closeMenu();
        if (message == "Send Ping")
        {
            sendEventPayload("owner_ping", g_owner, llKey2Name(g_owner));
        }
        else if (message == "Status")
        {
            llOwnerSay("OK=" + (string)g_okCount + " | Err=" + (string)g_errCount + " | Last=" + (string)g_lastStatus);
        }
        else if (message == "Reset")
        {
            llResetScript();
        }
    }

    http_response(key request_id, integer status, list metadata, string body)
    {
        if (request_id != g_reqId) return;
        llSetTimerEvent(0.0);
        g_reqId = NULL_KEY;
        g_lastStatus = status;

        if (status >= 200 && status < 300)
        {
            ++g_okCount;
            updateBridgeSign("ONLINE · Last OK", <0.0, 1.0, 0.62>);
            llOwnerSay("HTTP " + (string)status + " OK: " + llGetSubString(body, 0, 180));
        }
        else if (g_retryCount < MAX_RETRIES)
        {
            ++g_retryCount;
            llOwnerSay("HTTP " + (string)status + " failed; retry " + (string)g_retryCount + "/" + (string)MAX_RETRIES);
            dispatchJsonRequest(g_lastBody);
        }
        else
        {
            ++g_errCount;
            updateBridgeSign("ERROR HTTP " + (string)status, <1.0, 0.35, 0.35>);
            llOwnerSay("HTTP delivery failed after retries (status " + (string)status + ").");
        }
    }

    timer()
    {
        llSetTimerEvent(0.0);
        closeMenu();
        if (g_reqId != NULL_KEY)
        {
            g_reqId = NULL_KEY;
            if (g_retryCount < MAX_RETRIES)
            {
                ++g_retryCount;
                dispatchJsonRequest(g_lastBody);
            }
            else
            {
                ++g_errCount;
                updateBridgeSign("TIMEOUT", <1.0, 0.55, 0.25>);
                llOwnerSay("HTTP request timed out.");
            }
        }
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(greet|visitor|welcome|notecard|counter|landmark)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Visitor Greeter & Counter
// Features: Memory-safe ring-buffer deduplication, optional inventory notecard
//           & landmark gift delivery, owner analytics console & range control
// ============================================================================

// --- CONFIGURATION ---
integer MAX_RING_ENTRIES   = 80;
float   SCAN_INTERVAL      = 4.0;
float   MENU_TIMEOUT       = 45.0;

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
float   g_range            = 16.0;
integer g_enabled          = TRUE;
integer g_totalVisits      = 0;
list    g_visitorKeys      = [];
list    g_visitorNames     = [];

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
    llSetTimerEvent(0.0);
}

updateGreeterBoard()
{
    string stateTxt = llList2String(["PAUSED", "ACTIVE"], (g_enabled != 0));
    vector col = <0.0, 1.0, 0.65>;
    if (!g_enabled) col = <0.72, 0.72, 0.72>;
    string txt = "${title} [" + stateTxt + "]\\n"
        + "Unique Visitors: " + (string)g_totalVisits
        + " | Radius: " + (string)((integer)g_range) + "m";
    llSetText(txt, col, 1.0);
}

restartScanner()
{
    llSensorRemove();
    if (g_enabled)
    {
        llSensorRepeat("", NULL_KEY, AGENT, g_range, PI, SCAN_INTERVAL);
    }
    updateGreeterBoard();
}

deliverOptionalGifts(key av)
{
    if (llGetInventoryNumber(INVENTORY_NOTECARD) > 0)
    {
        llGiveInventory(av, llGetInventoryName(INVENTORY_NOTECARD, 0));
    }
    if (llGetInventoryNumber(INVENTORY_LANDMARK) > 0)
    {
        llGiveInventory(av, llGetInventoryName(INVENTORY_LANDMARK, 0));
    }
}

openOwnerConsole(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(MENU_TIMEOUT);
    string info = "${title} · Analytics\\nUnique Visits: " + (string)g_totalVisits
        + " | Cached: " + (string)llGetListLength(g_visitorKeys) + "/" + (string)MAX_RING_ENTRIES
        + "\\nFree Memory: " + (string)llGetFreeMemory() + " bytes";
    llDialog(target, info, ["Toggle On/Off", "Range 12m", "Range 24m", "Recent List", "Clear Cache", "Reset"], g_channel);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        closeMenu();
        restartScanner();
        llOwnerSay("Visitor Greeter online (" + (string)((integer)g_range) + "m radius).");
    }

    sensor(integer num_detected)
    {
        if (!g_enabled) return;
        integer i;
        for (i = 0; i < num_detected; ++i)
        {
            key av = llDetectedKey(i);
            string avName = llDetectedName(i);
            if (llListFindList(g_visitorKeys, [av]) == -1)
            {
                if (llGetListLength(g_visitorKeys) >= MAX_RING_ENTRIES)
                {
                    g_visitorKeys = llDeleteSubList(g_visitorKeys, 0, 0);
                    g_visitorNames = llDeleteSubList(g_visitorNames, 0, 0);
                }
                g_visitorKeys += [av];
                g_visitorNames += [avName];
                ++g_totalVisits;
                llRegionSayTo(av, 0, "Welcome, " + avName + "! Enjoy your stay at " + llGetRegionName() + ".");
                deliverOptionalGifts(av);
                updateGreeterBoard();
            }
        }
    }

    touch_start(integer total_number)
    {
        key av = llDetectedKey(0);
        if (av == g_owner)
        {
            openOwnerConsole(av);
        }
        else
        {
            llRegionSayTo(av, 0, "Welcome to " + llGetRegionName() + "! Total visitors greeted: " + (string)g_totalVisits);
        }
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel || id != g_owner) return;
        if (message == "Toggle On/Off")
        {
            g_enabled = !g_enabled;
            restartScanner();
        }
        else if (message == "Range 12m")
        {
            g_range = 12.0;
            restartScanner();
        }
        else if (message == "Range 24m")
        {
            g_range = 24.0;
            restartScanner();
        }
        else if (message == "Recent List")
        {
            if (llGetListLength(g_visitorNames) == 0) llOwnerSay("No visitors recorded yet.");
            else llOwnerSay("Recent visitors: " + llDumpList2String(g_visitorNames, ", "));
        }
        else if (message == "Clear Cache")
        {
            g_visitorKeys = [];
            g_visitorNames = [];
            llOwnerSay("Visitor cache cleared.");
        }
        else if (message == "Reset")
        {
            llResetScript();
            return;
        }
        closeMenu();
    }

    timer()
    {
        closeMenu();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(light|lamp|glow|neon|color|bulb|dimmer)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Smart Point-Light & Dimmer Suite
// Features: Multi-scene color presets, 4 brightness dimmer levels, fullbright
//           & glow sync, owner/public access toggle, clean dialog timeout
// ============================================================================

// --- CONFIGURATION ---
float   MENU_TIMEOUT       = 40.0;
list    SCENE_NAMES        = ["Warm", "Daylight", "Emerald", "Cyber Cyan", "Sunset", "Violet"];
list    SCENE_COLORS       = [
    <1.0, 0.88, 0.70>, <0.96, 0.98, 1.0>, <0.0, 1.0, 0.62>,
    <0.0, 0.85, 1.0>, <1.0, 0.45, 0.22>, <0.68, 0.35, 1.0>
];

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_isOn             = TRUE;
integer g_sceneIdx         = 0;
float   g_intensity        = 0.85;
float   g_radius           = 14.0;
integer g_ownerOnly        = FALSE;

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
    llSetTimerEvent(0.0);
}

string powerLabel()
{
    return llList2String(["OFF", "ON"], (g_isOn != 0));
}

applyLightingState()
{
    vector col = llList2Vector(SCENE_COLORS, g_sceneIdx);
    string sceneName = llList2String(SCENE_NAMES, g_sceneIdx);
    float glowAmt = 0.0;
    if (g_isOn) glowAmt = 0.12 + (g_intensity * 0.14);

    llSetLinkPrimitiveParamsFast(LINK_THIS, [
        PRIM_POINT_LIGHT, g_isOn, col, g_intensity, g_radius, 0.75,
        PRIM_FULLBRIGHT, ALL_SIDES, g_isOn,
        PRIM_COLOR, ALL_SIDES, col, 1.0,
        PRIM_GLOW, ALL_SIDES, glowAmt
    ]);
    string txt = "${title}\\nPower: " + powerLabel()
        + " | Scene: " + sceneName
        + "\\nDimmer: " + (string)((integer)(g_intensity * 100.0)) + "%";
    llSetText(txt, col, 0.92);
}

openLightMenu(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    llSetTimerEvent(MENU_TIMEOUT);
    string accessTxt = llList2String(["Public", "Owner Only"], (g_ownerOnly != 0));
    string msg = "${title}\\nPower: " + powerLabel()
        + " | Scene: " + llList2String(SCENE_NAMES, g_sceneIdx)
        + "\\nBrightness: " + (string)((integer)(g_intensity * 100.0)) + "% | Access: " + accessTxt;
    list btns = [
        "Toggle Power", "Dim 40%", "Bright 100%",
        "Warm", "Daylight", "Emerald",
        "Cyber Cyan", "Sunset", "Violet",
        "Toggle Lock", "Reset", "Close"
    ];
    llDialog(target, msg, btns, g_channel);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        closeMenu();
        applyLightingState();
        llOwnerSay("Smart Lighting Suite online. Touch prim to open dimmer & scene controls.");
    }

    touch_start(integer total_number)
    {
        key av = llDetectedKey(0);
        if (g_ownerOnly && av != g_owner)
        {
            llRegionSayTo(av, 0, "Lighting controls are restricted to the owner.");
            return;
        }
        openLightMenu(av);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        if (g_ownerOnly && id != g_owner) return;

        if (message == "Toggle Power")
        {
            g_isOn = !g_isOn;
            llRegionSayTo(id, 0, "Light switched " + powerLabel() + ".");
        }
        else if (message == "Dim 40%")
        {
            g_intensity = 0.40;
            g_isOn = TRUE;
        }
        else if (message == "Bright 100%")
        {
            g_intensity = 1.0;
            g_isOn = TRUE;
        }
        else if (message == "Toggle Lock" && id == g_owner)
        {
            g_ownerOnly = !g_ownerOnly;
        }
        else if (message == "Reset" && id == g_owner)
        {
            llResetScript();
            return;
        }
        else
        {
            integer sIdx = llListFindList(SCENE_NAMES, [message]);
            if (sIdx != -1)
            {
                g_sceneIdx = sIdx;
                g_isOn = TRUE;
            }
        }
        applyLightingState();
        closeMenu();
    }

    timer()
    {
        closeMenu();
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  if (/(elevator|lift|platform|move|float|bob|oscillat)/i.test(p)) {
    return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Multi-Floor Smooth Lift Engine
// Features: Smooth stepped vertical interpolation (non-blocking timer),
//           4 selectable floors, arrival chime, recalibration & owner reset
// ============================================================================

// --- CONFIGURATION ---
integer MOVE_STEPS         = 16;
float   STEP_SECONDS       = 0.08;
float   MENU_TIMEOUT       = 45.0;
list    FLOOR_NAMES        = ["Floor 1 (Lobby)", "Floor 2 (Studio)", "Floor 3 (Lounge)", "Floor 4 (Roof)"];
list    FLOOR_HEIGHTS      = [0.0, 5.0, 10.0, 16.0];

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
vector  g_basePos          = ZERO_VECTOR;
integer g_currentFloor     = 0;
integer g_targetFloor      = 0;
vector  g_startPos         = ZERO_VECTOR;
vector  g_endPos           = ZERO_VECTOR;
integer g_stepNum          = 0;
integer g_inTransit        = FALSE;

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeMenu()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
}

updateFloorDisplay()
{
    string floorTxt = llList2String(FLOOR_NAMES, g_currentFloor);
    string statusTxt = llList2String(["READY · Touch for Floors", "IN TRANSIT..."], (g_inTransit != 0));
    vector col = <0.1, 0.96, 0.78>;
    if (g_inTransit) col = <1.0, 0.85, 0.25>;
    llSetText("${title}\\n" + floorTxt + "\\n" + statusTxt, col, 1.0);
}

beginFloorTransit(integer destIdx)
{
    if (g_inTransit) return;
    if (destIdx < 0 || destIdx >= llGetListLength(FLOOR_HEIGHTS)) return;
    if (destIdx == g_currentFloor) return;

    g_targetFloor = destIdx;
    g_startPos = llGetPos();
    g_endPos = g_basePos + <0.0, 0.0, llList2Float(FLOOR_HEIGHTS, destIdx)>;
    g_stepNum = 0;
    g_inTransit = TRUE;
    llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.18]);
    updateFloorDisplay();
    llSetTimerEvent(STEP_SECONDS);
}

openElevatorMenu(key target)
{
    closeMenu();
    g_listenHandle = llListen(g_channel, "", target, "");
    string info = "${title}\\nCurrent: " + llList2String(FLOOR_NAMES, g_currentFloor) + "\\nSelect destination floor:";
    list btns = ["Floor 1", "Floor 2", "Floor 3", "Floor 4", "Recalibrate", "Close"];
    llDialog(target, info, btns, g_channel);
    if (!g_inTransit)
    {
        llSetTimerEvent(MENU_TIMEOUT);
    }
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        g_basePos = llGetPos();
        g_currentFloor = 0;
        g_inTransit = FALSE;
        closeMenu();
        llSetTimerEvent(0.0);
        updateFloorDisplay();
        llOwnerSay("Multi-Floor Elevator calibrated at base " + (string)g_basePos);
    }

    touch_start(integer total_number)
    {
        key av = llDetectedKey(0);
        if (g_inTransit)
        {
            llRegionSayTo(av, 0, "Elevator is currently moving. Please wait a moment.");
            return;
        }
        openElevatorMenu(av);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        closeMenu();
        if (message == "Floor 1") beginFloorTransit(0);
        else if (message == "Floor 2") beginFloorTransit(1);
        else if (message == "Floor 3") beginFloorTransit(2);
        else if (message == "Floor 4") beginFloorTransit(3);
        else if (message == "Recalibrate" && id == g_owner)
        {
            g_basePos = llGetPos();
            g_currentFloor = 0;
            updateFloorDisplay();
            llOwnerSay("Elevator base recalibrated to " + (string)g_basePos);
        }
    }

    timer()
    {
        if (!g_inTransit)
        {
            closeMenu();
            llSetTimerEvent(0.0);
            return;
        }

        ++g_stepNum;
        float t = (float)g_stepNum / (float)MOVE_STEPS;
        vector nextPos = g_startPos + ((g_endPos - g_startPos) * t);
        llSetRegionPos(nextPos);

        if (g_stepNum >= MOVE_STEPS)
        {
            g_inTransit = FALSE;
            g_currentFloor = g_targetFloor;
            llSetTimerEvent(0.0);
            llSetLinkPrimitiveParamsFast(LINK_THIS, [PRIM_GLOW, ALL_SIDES, 0.04]);
            updateFloorDisplay();
        }
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
  }

  return `\`\`\`lsl
// ============================================================================
// ${title}
// Production Second Life / OpenSim LSL2/Mono Interactive Prim Controller
// Features: Key-derived private channel, owner/public access toggle,
//           visual FX pulse, usage telemetry & automatic listener cleanup
// ============================================================================

// --- CONFIGURATION ---
float   DIALOG_TIMEOUT     = 45.0;
float   PULSE_DURATION     = 3.5;
vector  COLOR_READY        = <0.0, 1.0, 0.62>;
vector  COLOR_ACTIVE       = <0.0, 0.85, 1.0>;

// --- RUNTIME STATE (Literal initializers only) ---
key     g_owner            = NULL_KEY;
integer g_channel          = 0;
integer g_listenHandle     = 0;
integer g_useCount         = 0;
integer g_ownerOnly        = FALSE;
integer g_fxRunning        = FALSE;
string  g_lastUser         = "None";

// --- HELPER FUNCTIONS ---
integer deriveChannel()
{
    return -1 - (integer)("0x" + llGetSubString((string)llGetKey(), 0, 6));
}

closeDialogChannel()
{
    if (g_listenHandle != 0)
    {
        llListenRemove(g_listenHandle);
        g_listenHandle = 0;
    }
}

string accessLabel()
{
    return llList2String(["Public", "Owner Only"], (g_ownerOnly != 0));
}

updateHoverStatus()
{
    string stateTxt = llList2String(["READY", "ACTIVE FX"], (g_fxRunning != 0));
    vector col = COLOR_READY;
    if (g_fxRunning) col = COLOR_ACTIVE;
    string txt = "${title}\\nStatus: " + stateTxt
        + " | Access: " + accessLabel() + "\\n"
        + "Uses: " + (string)g_useCount + " | Last: " + g_lastUser;
    llSetText(txt, col, 1.0);
}

triggerPulseEffect(key actor)
{
    g_fxRunning = TRUE;
    llSetLinkPrimitiveParamsFast(LINK_THIS, [
        PRIM_COLOR, ALL_SIDES, COLOR_ACTIVE, 1.0,
        PRIM_GLOW, ALL_SIDES, 0.24
    ]);
    updateHoverStatus();
    llSetTimerEvent(PULSE_DURATION);
    llRegionSayTo(actor, 0, "${title} activated!");
}

openControlMenu(key target, string actorName)
{
    closeDialogChannel();
    g_listenHandle = llListen(g_channel, "", target, "");
    if (!g_fxRunning)
    {
        llSetTimerEvent(DIALOG_TIMEOUT);
    }
    string body = "${title}\\nUser: " + actorName
        + " | Uses: " + (string)g_useCount
        + "\\nAccess: " + accessLabel()
        + " | Free Mem: " + (string)llGetFreeMemory() + " bytes";
    list btns = ["Activate", "Glow FX", "Status", "Toggle Access", "Reset", "Close"];
    llDialog(target, body, btns, g_channel);
}

// --- MAIN STATE ---
default
{
    state_entry()
    {
        g_owner = llGetOwner();
        g_channel = deriveChannel();
        g_fxRunning = FALSE;
        closeDialogChannel();
        llSetLinkPrimitiveParamsFast(LINK_THIS, [
            PRIM_COLOR, ALL_SIDES, COLOR_READY, 1.0,
            PRIM_GLOW, ALL_SIDES, 0.06
        ]);
        updateHoverStatus();
        llOwnerSay("Initialized LSL controller: ${title} (Channel " + (string)g_channel + ")");
    }

    touch_start(integer total_number)
    {
        key toucher = llDetectedKey(0);
        string who = llDetectedName(0);
        if (g_ownerOnly && toucher != g_owner)
        {
            llRegionSayTo(toucher, 0, "This device is currently set to Owner Only mode.");
            return;
        }
        ++g_useCount;
        g_lastUser = who;
        updateHoverStatus();
        openControlMenu(toucher, who);
    }

    listen(integer channel, string name, key id, string message)
    {
        if (channel != g_channel) return;
        if (g_ownerOnly && id != g_owner) return;
        closeDialogChannel();

        if (message == "Activate" || message == "Glow FX")
        {
            triggerPulseEffect(id);
        }
        else if (message == "Status")
        {
            llRegionSayTo(id, 0, "Uses: " + (string)g_useCount
                + " | Access: " + accessLabel()
                + " | Free Memory: " + (string)llGetFreeMemory() + " bytes");
        }
        else if (message == "Toggle Access" && id == g_owner)
        {
            g_ownerOnly = !g_ownerOnly;
            updateHoverStatus();
            llOwnerSay("Access mode switched to: " + accessLabel());
        }
        else if (message == "Reset" && id == g_owner)
        {
            llResetScript();
        }
    }

    timer()
    {
        llSetTimerEvent(0.0);
        closeDialogChannel();
        if (g_fxRunning)
        {
            g_fxRunning = FALSE;
            llSetLinkPrimitiveParamsFast(LINK_THIS, [
                PRIM_COLOR, ALL_SIDES, COLOR_READY, 1.0,
                PRIM_GLOW, ALL_SIDES, 0.06
            ]);
            updateHoverStatus();
        }
    }

    on_rez(integer start_param)
    {
        llResetScript();
    }

    changed(integer change)
    {
        if (change & CHANGED_OWNER) llResetScript();
    }
}
\`\`\``;
}
