export interface MatlabAuditStats {
  lines: number;
  functions: number;
  loops: number;
  conditionals: number;
  plots: number;
  matrixOps: number;
  dispCalls: number;
}

export interface MatlabAuditResult {
  code: string;
  valid: boolean;
  errors: string[];
  warnings: string[];
  fixes: string[];
  stats: MatlabAuditStats;
}

export function buildMatlabSystemPrompt(
  opts: { mode?: 'new' | 'edit'; comments?: boolean; hasImages?: boolean } = {}
): string {
  const isEdit = opts.mode === 'edit';
  const wantComments = opts.comments !== false;
  const visionRule = opts.hasImages
    ? '\n- IMAGE ANALYSIS: Carefully inspect any attached screenshot (MATLAB error console, equation, plot, or code snippet) and implement or fix every detail accurately.'
    : '';

  if (isEdit) {
    return `Principal MATLAB / Scientific Computing Engineer editing an existing MATLAB (.m) script.
Use clean vectorized matrix operations, idiomatic MATLAB syntax (% comments, ~= inequality, 1-based indexing, balanced end blocks), and clear disp/fprintf output.${visionRule}
${wantComments ? 'Brief comments on changes.' : 'Minimal comments.'}
Start line 1 with \`\`\`matlab and output ONLY the updated code block.`;
  }

  return `Principal MATLAB / Scientific Computing Engineer. Write clean, complete, immediately runnable MATLAB (.m) code with zero TODOs.
Use vectorized operations, explicit numeric examples, clear disp/fprintf summaries, % comments, ~= inequality, and properly closed if/for/while/switch/function blocks with end.${visionRule}
${wantComments ? 'Short helpful % comments.' : 'Minimal comments.'}
Start line 1 IMMEDIATELY with \`\`\`matlab and end with \`\`\`. No text outside the fence.`;
}

function stripCodeFences(raw: string): string {
  const trimmed = String(raw || '').trim();
  const match = trimmed.match(/^```(?:matlab|octave|m)?\s*\n?([\s\S]*?)\n?```$/i);
  return match ? match[1].trim() : trimmed;
}

function stripMatlabComment(line: string): string {
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === "'" && !inDouble) inSingle = !inSingle;
    else if (ch === '"' && !inSingle) inDouble = !inDouble;
    else if (ch === '%' && !inSingle && !inDouble) return line.slice(0, i);
  }
  return line;
}

export function analyzeAndFixMatlabScript(rawCode: string): MatlabAuditResult {
  let code = stripCodeFences(rawCode);
  const errors: string[] = [];
  const warnings: string[] = [];
  const fixes: string[] = [];

  if (!code.trim()) {
    return {
      code: '',
      valid: false,
      errors: ['MATLAB script is empty.'],
      warnings: [],
      fixes: [],
      stats: { lines: 0, functions: 0, loops: 0, conditionals: 0, plots: 0, matrixOps: 0, dispCalls: 0 },
    };
  }

  // Fix 1: Replace C-style // comments outside string literals with %
  let replacedDoubleSlash = false;
  const fixedCommentLines = code.split('\n').map((line) => {
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < line.length - 1; i++) {
      const ch = line[i];
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle) inDouble = !inDouble;
      else if (!inSingle && !inDouble && ch === '/' && line[i + 1] === '/') {
        // Ignore URLs like http:// or https://
        if (i > 0 && line[i - 1] === ':') continue;
        replacedDoubleSlash = true;
        return `${line.slice(0, i)}%${line.slice(i + 2)}`;
      }
    }
    return line;
  });
  if (replacedDoubleSlash) {
    code = fixedCommentLines.join('\n');
    fixes.push('Converted C-style // comments to MATLAB % comments.');
  }

  // Fix 2: Replace C-style != with MATLAB ~=
  if (/!=/.test(code)) {
    code = code.replace(/!=/g, '~=');
    fixes.push('Replaced C-style != operator with MATLAB ~= inequality operator.');
  }

  // Fix 3: Replace Python-style True/False literals if used outside strings/comments
  const lines = code.split('\n');
  let blockDepth = 0;
  let functions = 0;
  let loops = 0;
  let conditionals = 0;
  let plots = 0;
  let matrixOps = 0;
  let dispCalls = 0;
  let parenDepth = 0;
  let bracketDepth = 0;

  const openerRe = /^\s*(?:function|for|parfor|while|if|switch|try|classdef)\b/;
  const closerRe = /^\s*end\b(?:\s*;|\s*%.*)?$/;

  for (let idx = 0; idx < lines.length; idx++) {
    const active = stripMatlabComment(lines[idx]).trim();
    if (!active) continue;

    if (/^\s*function\b/.test(active)) functions++;
    if (/^\s*(?:for|parfor|while)\b/.test(active)) loops++;
    if (/^\s*(?:if|switch)\b/.test(active)) conditionals++;
    if (/\b(?:plot|surf|mesh|stem|bar|hist|histogram|figure|subplot|imagesc)\s*\(/.test(active)) plots++;
    if (/(?:\.\*|\.\/|\.\^|\bzeros\b|\bones\b|\beye\b|\blinspace\b|\bdet\b|\binv\b|\beig\b|\bsvd\b|\bfft\b)/.test(active)) {
      matrixOps++;
    }
    if (/\b(?:disp|fprintf)\s*\(/.test(active)) dispCalls++;

    // Track block depth (skip single-line blocks that contain both opener and '; end' or ' end')
    if (openerRe.test(active)) {
      const inlineEnds = (active.match(/\bend\b/g) || []).length;
      blockDepth += Math.max(0, 1 - inlineEnds);
    } else if (closerRe.test(active)) {
      blockDepth--;
      if (blockDepth < 0) {
        errors.push(`Line ${idx + 1}: Unexpected 'end' statement with no matching block opener.`);
        blockDepth = 0;
      }
    }

    // Track parentheses and square brackets outside strings
    let inSingle = false;
    let inDouble = false;
    for (let i = 0; i < active.length; i++) {
      const ch = active[i];
      if (ch === "'" && !inDouble) {
        // Handle transpose operator vs string quote heuristically
        const prev = i > 0 ? active[i - 1] : '';
        if (!inSingle && /[A-Za-z0-9_)\]}]/.test(prev)) continue;
        inSingle = !inSingle;
      } else if (ch === '"' && !inSingle) {
        inDouble = !inDouble;
      } else if (!inSingle && !inDouble) {
        if (ch === '(') parenDepth++;
        else if (ch === ')') parenDepth--;
        else if (ch === '[') bracketDepth++;
        else if (ch === ']') bracketDepth--;
      }
    }
  }

  if (blockDepth > 0) {
    const appendEnds = Array.from({ length: blockDepth }, () => 'end').join('\n');
    code = `${code.trimEnd()}\n${appendEnds}`;
    fixes.push(`Appended ${blockDepth} missing 'end' statement(s) to close open block(s).`);
  }

  if (parenDepth !== 0) {
    errors.push(
      parenDepth > 0
        ? `Unclosed parentheses: missing ${parenDepth} closing ')'.`
        : `Extra closing parentheses: ${Math.abs(parenDepth)} unmatched ')'.`
    );
  }
  if (bracketDepth !== 0) {
    errors.push(
      bracketDepth > 0
        ? `Unclosed matrix brackets: missing ${bracketDepth} closing ']'.`
        : `Extra closing matrix brackets: ${Math.abs(bracketDepth)} unmatched ']'.`
    );
  }

  if (dispCalls === 0 && plots === 0) {
    warnings.push('Script has no disp/fprintf or plot output; consider printing results.');
  }

  const finalLines = code.split('\n').length;
  return {
    code,
    valid: errors.length === 0,
    errors,
    warnings,
    fixes,
    stats: {
      lines: finalLines,
      functions,
      loops,
      conditionals,
      plots,
      matrixOps,
      dispCalls,
    },
  };
}

export function generateOfflineProfessionalMatlab(prompt: string): string {
  const lower = String(prompt || '').toLowerCase();

  if (/(?:fft|signal|wave|frequency|filter|sine|spectrum|audio)/.test(lower)) {
    return `\`\`\`matlab
% Signal Analysis & Spectrum Summary
fs = 1000;
t = 0:1/fs:0.5;
f1 = 50;
f2 = 120;
signal = 1.2 * sin(2 * pi * f1 * t) + 0.7 * sin(2 * pi * f2 * t);

rmsVal = sqrt(mean(signal .^ 2));
peakVal = max(abs(signal));
meanVal = mean(signal);

fprintf('=== Signal Analysis ===\\n');
fprintf('Samples: %d | Sampling Rate: %d Hz\\n', length(signal), fs);
fprintf('Mean: %.4f | RMS: %.4f | Peak: %.4f\\n', meanVal, rmsVal, peakVal);
\`\`\``;
  }

  if (/(?:matrix|linear|eigen|solve|determinant|inverse|system)/.test(lower)) {
    return `\`\`\`matlab
% Linear Algebra & Matrix Analysis
A = [4, 2, 1; 2, 5, 3; 1, 3, 6];
b = [10; 15; 18];

detA = det(A);
traceA = trace(A);
x = A \\ b;
residual = norm(A * x - b);

fprintf('=== Matrix Solver ===\\n');
fprintf('det(A) = %.4f | trace(A) = %.4f\\n', detA, traceA);
disp('Solution vector x:');
disp(x);
fprintf('Residual ||A*x - b|| = %.6e\\n', residual);
\`\`\``;
  }

  if (/(?:fibonacci|prime|sort|factorial|algorithm|loop)/.test(lower)) {
    return `\`\`\`matlab
% Numerical Sequence & Algorithm Benchmark
n = 12;
fib = zeros(1, n);
fib(1) = 1;
fib(2) = 1;
for k = 3:n
    fib(k) = fib(k - 1) + fib(k - 2);
end

fprintf('=== Fibonacci Sequence (n = %d) ===\\n', n);
disp(fib);
fprintf('Sum: %d | Max: %d | Golden Ratio Est: %.6f\\n', sum(fib), max(fib), fib(n) / fib(n - 1));
\`\`\``;
  }

  const safeTitle = String(prompt || 'Scientific Computation')
    .replace(/[\r\n]+/g, ' ')
    .trim()
    .slice(0, 72);

  return `\`\`\`matlab
% MATLAB Computation: ${safeTitle}
x = linspace(0, 10, 21);
y = x .^ 2 - 4 * x + 7;

minVal = min(y);
maxVal = max(y);
avgVal = mean(y);
stdVal = std(y);

fprintf('=== MATLAB Results ===\\n');
fprintf('Points: %d | Min: %.4f | Max: %.4f\\n', length(y), minVal, maxVal);
fprintf('Mean: %.4f | Std Dev: %.4f\\n', avgVal, stdVal);
disp('First 6 values of y:');
disp(y(1:6));
\`\`\``;
}
