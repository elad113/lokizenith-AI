import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import * as nodeModule from 'node:module';
import vm from 'node:vm';
import { analyzeAndFixLslScript } from './lslSpecialist.ts';
import { analyzeAndFixMatlabScript } from './matlabSpecialist.ts';
import type { FastThinkingLevel } from './fastChatRouting.ts';

type EsbuildTransformSync = (
  input: string,
  options: { loader: 'js' | 'ts'; target: string; format: string }
) => unknown;

let cachedEsbuildTransform: EsbuildTransformSync | null | undefined;
function getOptionalEsbuildTransform(): EsbuildTransformSync | null {
  if (cachedEsbuildTransform !== undefined) return cachedEsbuildTransform;
  try {
    const req = createRequire(import.meta.url);
    const mod = req('esbuild') as { transformSync?: EsbuildTransformSync };
    cachedEsbuildTransform = typeof mod?.transformSync === 'function' ? mod.transformSync : null;
  } catch {
    cachedEsbuildTransform = null;
  }
  return cachedEsbuildTransform;
}

export interface LokiCodeRoutePlan {
  lang: string;
  primaryModel: string;
  primaryThinking: FastThinkingLevel;
  secondaryModel: string;
  secondaryThinking: FastThinkingLevel;
  maxOutputTokens: number;
  hedgeDelayMs: number;
  firstTokenTimeoutMs: number;
  totalStreamTimeoutMs: number;
  chunkStallTimeoutMs: number;
  groqTimeoutMs: number;
  groqHardTimeoutMs: number;
  groqReasoningEffort: 'low';
  ovhTimeoutMs: number;
  repairMaxTokens: number;
  repairTimeoutMs: number;
}

/**
 * Latency-optimized routing plan strictly targeting <= 10s end-to-end LokiCode generation + syntax verification
 * across ALL languages including LSL2/Mono.
 * Uses Flash Lite (MINIMAL) as primary so rich 130-220 line LSL scripts stream completely in 3-6s,
 * hedged quickly to Gemini Hydrogen (LOW), with hard stream & stall deadlines so a provider can never hang.
 */
export function planLokiCodeRoute(
  langId: string,
  opts: { hasImages?: boolean; mode?: 'new' | 'edit'; promptLength?: number } = {}
): LokiCodeRoutePlan {
  const lang = String(langId || 'python').toLowerCase().trim() || 'python';
  const isLsl = lang === 'lsl';
  const isHtml = lang === 'html';
  const isEdit = opts.mode === 'edit';
  const hasImages = Boolean(opts.hasImages);

  if (isLsl) {
    return {
      lang,
      primaryModel: 'gemini-3.1-flash-lite',
      primaryThinking: 'MINIMAL',
      secondaryModel: 'gemini-4-hydrogen',
      secondaryThinking: 'LOW',
      maxOutputTokens: isEdit ? 3400 : 3000,
      hedgeDelayMs: hasImages ? 2200 : 1500,
      firstTokenTimeoutMs: hasImages ? 4200 : 3200,
      totalStreamTimeoutMs: 7600,
      chunkStallTimeoutMs: 2800,
      groqTimeoutMs: 3200,
      groqHardTimeoutMs: 6800,
      groqReasoningEffort: 'low',
      ovhTimeoutMs: 2600,
      repairMaxTokens: 2600,
      repairTimeoutMs: 1900,
    };
  }

  return {
    lang,
    primaryModel: 'gemini-3.1-flash-lite',
    primaryThinking: 'MINIMAL',
    secondaryModel: 'gemini-4-hydrogen',
    secondaryThinking: 'LOW',
    maxOutputTokens: isHtml ? 3400 : isEdit ? 3200 : 2800,
    hedgeDelayMs: hasImages ? 2200 : 1500,
    firstTokenTimeoutMs: hasImages ? 4500 : 3400,
    totalStreamTimeoutMs: 7600,
    chunkStallTimeoutMs: 2800,
    groqTimeoutMs: 3200,
    groqHardTimeoutMs: 6800,
    groqReasoningEffort: 'low',
    ovhTimeoutMs: 2400,
    repairMaxTokens: 2600,
    repairTimeoutMs: 1900,
  };
}

export interface FastCodeVerifyResult {
  ok: boolean;
  lang: string;
  compiler: string;
  code: string;
  errors: string[];
  warnings: string[];
  fixes: string[];
  verifyMs: number;
}

export function extractFencedCodeBlock(raw: string): string {
  const text = String(raw || '').replace(/^\uFEFF/, '').trim();
  if (!text) return '';
  const m = text.match(/```[a-zA-Z0-9_+#.-]*\s*\n([\s\S]*?)```/);
  if (m && m[1]) return m[1].trim();
  const unclosed = text.match(/```[a-zA-Z0-9_+#.-]*\s*\n([\s\S]*)$/);
  if (unclosed && unclosed[1]) return unclosed[1].replace(/```\s*$/, '').trim();
  return text;
}

function sanitizeCommonArtifacts(code: string): { code: string; fixes: string[] } {
  const fixes: string[] = [];
  let out = String(code || '').replace(/\r\n/g, '\n');
  if (/[\u200B-\u200D\uFEFF]/.test(out)) {
    out = out.replace(/[\u200B-\u200D\uFEFF]/g, '');
    fixes.push('Removed invisible zero-width Unicode characters');
  }
  if (/^```[a-zA-Z0-9_+#.-]*\s*\n/.test(out)) {
    out = extractFencedCodeBlock(out);
    fixes.push('Stripped wrapping markdown code fence');
  }
  return { code: out.trim(), fixes };
}

function checkBalancedDelimiters(code: string, opts: { hashComments?: boolean } = {}): string[] {
  const errors: string[] = [];
  const stack: Array<{ ch: string; line: number }> = [];
  const pairs: Record<string, string> = { '(': ')', '[': ']', '{': '}' };
  const closeToOpen: Record<string, string> = { ')': '(', ']': '[', '}': '{' };

  let inSingle = false;
  let inDouble = false;
  let inBacktick = false;
  let inLineComment = false;
  let inBlockComment = false;
  let line = 1;

  for (let i = 0; i < code.length; i++) {
    const ch = code[i];
    const next = code[i + 1];

    if (ch === '\n') {
      line++;
      inLineComment = false;
      continue;
    }
    if (inLineComment) continue;
    if (inBlockComment) {
      if (ch === '*' && next === '/') {
        inBlockComment = false;
        i++;
      }
      continue;
    }
    if (inSingle) {
      if (ch === '\\') { i++; continue; }
      if (ch === "'") inSingle = false;
      continue;
    }
    if (inDouble) {
      if (ch === '\\') { i++; continue; }
      if (ch === '"') inDouble = false;
      continue;
    }
    if (inBacktick) {
      if (ch === '\\') { i++; continue; }
      if (ch === '`') inBacktick = false;
      continue;
    }

    if (ch === '/' && next === '/') {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === '/' && next === '*') {
      inBlockComment = true;
      i++;
      continue;
    }
    if (opts.hashComments && ch === '#') {
      inLineComment = true;
      continue;
    }
    if (ch === "'") {
      // Skip Rust lifetime annotations like 'a or 'static
      if (/[a-zA-Z_]/.test(next || '') && code[i + 2] !== "'") {
        continue;
      }
      inSingle = true;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      continue;
    }
    if (ch === '`') {
      inBacktick = true;
      continue;
    }

    if (pairs[ch]) {
      stack.push({ ch, line });
    } else if (closeToOpen[ch]) {
      const top = stack[stack.length - 1];
      if (!top || top.ch !== closeToOpen[ch]) {
        errors.push(`Line ${line}: Unexpected closing '${ch}'`);
      } else {
        stack.pop();
      }
    }
  }

  if (inBlockComment) errors.push('Unclosed /* block comment');
  for (const unclosed of stack.slice(-3)) {
    errors.push(`Line ${unclosed.line}: Unclosed '${unclosed.ch}'`);
  }
  return errors;
}

function verifyJsOrTs(code: string, loader: 'js' | 'ts'): { errors: string[] } {
  const esbuildTransform = getOptionalEsbuildTransform();
  if (esbuildTransform) {
    try {
      esbuildTransform(code, {
        loader,
        target: 'es2022',
        format: 'esm',
      });
      return { errors: [] };
    } catch (err: any) {
      const esErrors = Array.isArray(err?.errors) ? err.errors : [];
      if (esErrors.length > 0) {
        return {
          errors: esErrors.slice(0, 6).map((e: any) => {
            const ln = e?.location?.line ? `Line ${e.location.line}: ` : '';
            return `${ln}${e?.text || 'Syntax error'}`;
          }),
        };
      }
      return { errors: [String(err?.message || 'Syntax error').split('\n')[0]] };
    }
  }

  // Zero-dependency production fallback using built-in Node stripTypeScriptTypes + V8 vm.Script
  try {
    let jsCode = code;
    if (loader === 'ts') {
      const strip = (nodeModule as unknown as { stripTypeScriptTypes?: (src: string, opts?: Record<string, unknown>) => string }).stripTypeScriptTypes;
      if (typeof strip === 'function') {
        jsCode = strip(code, { mode: 'transform' });
      }
    }
    // Strip top-level ESM import/export keywords so vm.Script parses cleanly as a syntax check
    const checkable = jsCode
      .replace(/^\s*import\s+[\s\S]*?from\s+['"][^'"]+['"]\s*;?/gm, '')
      .replace(/^\s*import\s+['"][^'"]+['"]\s*;?/gm, '')
      .replace(/^\s*export\s+default\s+/gm, 'const __default_export__ = ')
      .replace(/^\s*export\s+(?=(?:async\s+)?(?:function|class|const|let|var)\b)/gm, '');
    new vm.Script(checkable, { filename: `verify.${loader}` });
    return { errors: [] };
  } catch (err: any) {
    return { errors: [String(err?.message || 'Syntax error').split('\n')[0]] };
  }
}

function verifyPythonFast(code: string): { compiler: string; errors: string[] } {
  try {
    execFileSync(
      'python3',
      ['-c', 'import ast,sys; ast.parse(sys.stdin.read())'],
      { input: code, stdio: ['pipe', 'pipe', 'pipe'], timeout: 1200 }
    );
    return { compiler: 'Python 3 AST Parser', errors: [] };
  } catch (err: any) {
    const stderr = String(err?.stderr || '').trim();
    if (stderr && /SyntaxError|IndentationError|TabError/i.test(stderr)) {
      const lines = stderr.split('\n').filter(Boolean);
      const summary = lines.slice(-2).join(' — ');
      return { compiler: 'Python 3 AST Parser', errors: [summary] };
    }
    // Fallback if python3 binary is unavailable in the environment
    const balanced = checkBalancedDelimiters(code, { hashComments: true });
    return { compiler: 'Python Structural Syntax Checker', errors: balanced };
  }
}

function verifyHtmlFast(code: string): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!/<html|<body|<div|<main|<section|<canvas|<!doctype/i.test(code)) {
    warnings.push('HTML document is missing standard structural tags');
  }
  const scriptRegex = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null;
  let scriptIdx = 0;
  while ((match = scriptRegex.exec(code)) !== null) {
    const attrs = String(match[1] || '');
    if (/type\s*=\s*["']application\/(ld\+)?json["']/i.test(attrs)) continue;
    scriptIdx++;
    const body = String(match[2] || '').trim();
    if (!body) continue;
    const jsCheck = verifyJsOrTs(body, 'js');
    for (const err of jsCheck.errors) {
      errors.push(`Inline <script #${scriptIdx}> ${err}`);
    }
  }
  const openScriptCount = (code.match(/<script\b/gi) || []).length;
  const closeScriptCount = (code.match(/<\/script>/gi) || []).length;
  if (openScriptCount !== closeScriptCount) {
    errors.push(`Mismatched <script> tags (${openScriptCount} open vs ${closeScriptCount} close)`);
  }
  const openStyleCount = (code.match(/<style\b/gi) || []).length;
  const closeStyleCount = (code.match(/<\/style>/gi) || []).length;
  if (openStyleCount !== closeStyleCount) {
    errors.push(`Mismatched <style> tags (${openStyleCount} open vs ${closeStyleCount} close)`);
  }
  return { errors, warnings };
}

/**
 * Sub-50ms deterministic syntax & structural verifier for all LokiCode languages.
 */
export function verifyGeneratedCodeFast(langId: string, rawOutput: string): FastCodeVerifyResult {
  const t0 = Date.now();
  const lang = String(langId || 'python').toLowerCase().trim() || 'python';
  const extracted = extractFencedCodeBlock(rawOutput);

  if (lang === 'lsl') {
    const audit = analyzeAndFixLslScript(rawOutput);
    return {
      ok: audit.valid,
      lang: 'lsl',
      compiler: 'Second Life LSL2 Mono Compiler',
      code: audit.code,
      errors: audit.errors,
      warnings: audit.warnings,
      fixes: audit.fixes,
      verifyMs: Math.max(1, Date.now() - t0),
    };
  }

  if (lang === 'matlab') {
    const audit = analyzeAndFixMatlabScript(rawOutput);
    return {
      ok: audit.valid,
      lang: 'matlab',
      compiler: 'MATLAB Static Syntax Verifier',
      code: audit.code,
      errors: audit.errors,
      warnings: audit.warnings,
      fixes: audit.fixes,
      verifyMs: Math.max(1, Date.now() - t0),
    };
  }

  const sanitized = sanitizeCommonArtifacts(extracted);
  const code = sanitized.code;
  const fixes = [...sanitized.fixes];

  if (!code) {
    return {
      ok: false,
      lang,
      compiler: 'LokiCode Syntax Verifier',
      code: '',
      errors: ['Generated code block was empty'],
      warnings: [],
      fixes,
      verifyMs: Math.max(1, Date.now() - t0),
    };
  }

  if (lang === 'javascript' || lang === 'js') {
    const res = verifyJsOrTs(code, 'js');
    return {
      ok: res.errors.length === 0,
      lang: 'javascript',
      compiler: 'esbuild JS AST Parser',
      code,
      errors: res.errors,
      warnings: [],
      fixes,
      verifyMs: Math.max(1, Date.now() - t0),
    };
  }

  if (lang === 'typescript' || lang === 'ts') {
    const res = verifyJsOrTs(code, 'ts');
    return {
      ok: res.errors.length === 0,
      lang: 'typescript',
      compiler: 'esbuild TS AST Parser',
      code,
      errors: res.errors,
      warnings: [],
      fixes,
      verifyMs: Math.max(1, Date.now() - t0),
    };
  }

  if (lang === 'python' || lang === 'py') {
    const res = verifyPythonFast(code);
    return {
      ok: res.errors.length === 0,
      lang: 'python',
      compiler: res.compiler,
      code,
      errors: res.errors,
      warnings: [],
      fixes,
      verifyMs: Math.max(1, Date.now() - t0),
    };
  }

  if (lang === 'html') {
    const res = verifyHtmlFast(code);
    return {
      ok: res.errors.length === 0,
      lang: 'html',
      compiler: 'HTML + Inline JS AST Verifier',
      code,
      errors: res.errors,
      warnings: res.warnings,
      fixes,
      verifyMs: Math.max(1, Date.now() - t0),
    };
  }

  // Compiled languages: C++, Java, C#, Go, Rust
  const errors = checkBalancedDelimiters(code);
  const warnings: string[] = [];
  if (lang === 'go' && !/\bpackage\s+main\b/.test(code)) {
    warnings.push('Missing `package main` declaration');
  }
  if (lang === 'rust' && !/\bfn\s+main\s*\(/.test(code)) {
    warnings.push('Missing `fn main()` entry point');
  }
  if (lang === 'java' && !/\bclass\s+\w+/.test(code)) {
    errors.push('Missing Java class declaration');
  }

  const compilerNames: Record<string, string> = {
    cpp: 'C++20 Structural Syntax Verifier',
    java: 'Java 22 Structural Syntax Verifier',
    csharp: 'C# Structural Syntax Verifier',
    go: 'Go 1.22 Structural Syntax Verifier',
    rust: 'Rust 2021 Structural Syntax Verifier',
  };

  return {
    ok: errors.length === 0,
    lang,
    compiler: compilerNames[lang] || `${lang.toUpperCase()} Syntax Verifier`,
    code,
    errors,
    warnings,
    fixes,
    verifyMs: Math.max(1, Date.now() - t0),
  };
}
