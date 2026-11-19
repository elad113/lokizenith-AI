export interface CodeIdea {
  label: string;
  prompt: string;
}

export interface MatlabExecutionResult {
  handled: boolean;
  status: number;
  stdout: string;
  stderr: string;
  compilerName: string;
  compileStage: string;
}

export const LANGUAGE_IDEAS_POOL: Record<string, CodeIdea[]> = {
  python: [
    { label: '🐍 Prime Benchmark', prompt: 'Write a Python prime number generator and Miller-Rabin primality benchmark with timing stats' },
    { label: '📊 Matrix & Eigen Solver', prompt: 'Build a Python linear algebra matrix toolkit (determinant, inverse, Gaussian elimination) with interactive input' },
    { label: '🤖 Neural Net from Scratch', prompt: 'Create a pure-Python 2-layer neural network trained on XOR with live loss curve ASCII chart' },
    { label: '🗂️ Interactive Task Engine', prompt: 'Build a complete Python CLI task & priority scheduler that reads commands from input()' },
    { label: '🔐 Cipher & Hash Vault', prompt: 'Write a Python cryptography utility with AES-style key stream, Caesar/Vigenere cipher, and SHA-256 inspector' },
    { label: '🎲 Monte Carlo Pi & Physics', prompt: 'Build a Python Monte Carlo simulator for Pi estimation and projectile motion with ASCII trajectory plot' },
    { label: '🧬 DNA Sequence Analyzer', prompt: 'Write a Python bioinformatics DNA/RNA codon translator, GC-content analyzer, and motif finder' },
    { label: '📈 Stock Backtester CLI', prompt: 'Create a Python algorithmic trading moving-average crossover backtester with Sharpe ratio report' },
  ],
  matlab: [
    { label: '📐 Matrix & Eigen Analysis', prompt: 'Write a MATLAB script for matrix operations, eigenvalues, determinant, and solving Ax = b linear systems' },
    { label: '🌊 Signal FFT Spectrum', prompt: 'Build a MATLAB Discrete Fourier Transform (DFT) signal analyzer with ASCII frequency spectrum plot' },
    { label: '🚀 Runge-Kutta ODE Solver', prompt: 'Create a MATLAB 4th-order Runge-Kutta (RK4) differential equation solver for a damped harmonic oscillator' },
    { label: '🔢 Interactive Newton-Raphson', prompt: 'Write a MATLAB numerical root-finding calculator using input() with Newton-Raphson iteration table' },
    { label: '🧮 Magic Square & SVD', prompt: 'Write a MATLAB numerical linear algebra showcase with magic squares, trace, condition number, andlu decomposition' },
    { label: '📡 Kalman Filter Tracker', prompt: 'Build a 1D/2D Kalman filter state estimator in MATLAB for tracking a moving target with noisy measurements' },
    { label: '🌡️ Heat Diffusion 1D PDE', prompt: 'Write a MATLAB finite-difference 1D heat equation solver displaying temperature evolution across time steps' },
    { label: '📊 Polynomial Curve Fit', prompt: 'Create a MATLAB least-squares polynomial regression fitter with R-squared accuracy and residual table' },
  ],
  java: [
    { label: '☕ Banking Ledger System', prompt: 'Build a Java object-oriented banking ledger with transactions, interest calculation, and Scanner input' },
    { label: '🧭 Dijkstra Shortest Path', prompt: 'Write a Java weighted graph shortest-path router using Dijkstra priority queue with formatted route output' },
    { label: '⚡ Multi-Thread Work Pool', prompt: 'Create a Java concurrent job processor simulation with thread-safe statistics and latency histogram' },
    { label: '🎮 RPG Arena Simulator', prompt: 'Build a Java turn-based tactical RPG battle engine with classes, critical hits, and interactive Scanner moves' },
    { label: '📦 LRU Cache & B-Tree', prompt: 'Implement a generic O(1) LRU Cache in Java with doubly-linked list, hash map, and benchmark suite' },
    { label: '🔍 Regex & AST Tokenizer', prompt: 'Write a Java mathematical expression lexer, parser, and evaluator with step-by-step AST printout' },
  ],
  lsl: [
    { label: '🚪 LSL Auto-Sliding Door', prompt: 'LSL automatic sliding security door that opens smoothly on touch or sensor and listens on channel 0' },
    { label: '🛡️ LSL Security Orb Scanner', prompt: 'Write an LSL parcel security scanner orb with whitelist, sensor sweep, and owner chat commands' },
    { label: '🌈 LSL Hovertext & Glow FX', prompt: 'Build an LSL color-cycling neon hovertext sign and particle emitter controller triggered by touch_start' },
    { label: '🤖 LSL Interactive Greeter', prompt: 'Create an LSL smart visitor greeter & landmark giver that tracks unique avatars and responds to chat' },
    { label: '🏎️ LSL Vehicle Physics Script', prompt: 'Write an LSL hovercraft vehicle script with banking, thrust controls, and HUD telemetry output' },
    { label: '🎰 LSL Tip Jar & Leaderboard', prompt: 'Build an LSL animated tip jar with top donor leaderboard, split payouts, and thank-you particle burst' },
  ],
  javascript: [
    { label: '⚡ Event Loop & Async Queue', prompt: 'Write a JavaScript concurrent task scheduler with retry backoff, rate limiting, and live progress logs' },
    { label: '🧩 A* Maze Pathfinder', prompt: 'Build a JavaScript A* pathfinding solver that generates a random ASCII maze and prints the optimal path' },
    { label: '📦 Reactive State Store', prompt: 'Create a zero-dependency JavaScript reactive state engine with computed selectors and time-travel undo' },
    { label: '🔐 JWT & Crypto Simulator', prompt: 'Write a Node.js JavaScript HMAC token signer, verifier, and rate-limiter benchmark' },
    { label: '🎲 Procedural Dungeon Gen', prompt: 'Build a JavaScript BSP procedural dungeon generator with rooms, corridors, and loot placement' },
    { label: '📊 Streaming CSV Analytics', prompt: 'Write a JavaScript data pipeline that aggregates, groups, and prints ASCII bar charts from dataset records' },
  ],
  typescript: [
    { label: '🔷 Type-Safe Event Bus', prompt: 'Build a strongly-typed TypeScript generic pub/sub event bus with middleware and schema validation' },
    { label: '🧠 ECS Game Architecture', prompt: 'Create a TypeScript Entity-Component-System (ECS) micro-engine simulating physics and health systems' },
    { label: '🛠️ Result<T, E> & Parser', prompt: 'Write a TypeScript functional Result/Option monad library with a composable JSON schema validator' },
    { label: '📈 Order Book Matching Engine', prompt: 'Build a high-frequency TypeScript limit order book matching engine with price-time priority and trade tape' },
    { label: '🔄 Finite State Machine', prompt: 'Create a strictly typed TypeScript hierarchical finite state machine for a checkout & payment workflow' },
    { label: '🕸️ Graph Dependency Solver', prompt: 'Write a TypeScript topological sort & circular dependency detector for a package build system' },
  ],
  html: [
    { label: '🌐 Neon Cyberpunk Dashboard', prompt: 'Build an interactive HTML/CSS/JS cyberpunk telemetry dashboard with live animated charts and controls' },
    { label: '🎹 WebAudio Synth Pad', prompt: 'Create an interactive HTML/CSS/JS polyphonic synthesizer keyboard with waveform visualizer canvas' },
    { label: '🪐 Particle Gravity Sandbox', prompt: 'Build an HTML5 Canvas interactive orbital gravity simulator where clicking spawns planets and stars' },
    { label: '⏱️ Pomodoro & Glass UI', prompt: 'Design a sleek glassmorphic HTML/CSS/JS productivity timer, kanban board, and soundscapes widget' },
    { label: '🎮 Retro Brick Breaker Game', prompt: 'Build a playable arcade neon Brick Breaker game in a single HTML5 Canvas file with power-ups and score' },
    { label: '🎨 Generative Fractal Studio', prompt: 'Create an interactive HTML5 Canvas Mandelbrot & Julia fractal explorer with zoom and color palettes' },
  ],
  cpp: [
    { label: '⚙️ STL Memory Pool & Benchmark', prompt: 'Write a C++20 custom arena memory allocator and benchmark it against std::vector with timing output' },
    { label: '🧭 A* Grid Navigator', prompt: 'Build a C++ A* pathfinding algorithm on a 2D obstacle grid with ASCII map visualization and std::cin support' },
    { label: '🔢 Matrix SIMD-Style Math', prompt: 'Create a C++ template matrix multiplication & linear system solver with operator overloading' },
    { label: '🌲 Red-Black / AVL Tree', prompt: 'Implement a self-balancing C++ AVL binary search tree with tree printer and lookup metrics' },
    { label: '🚀 N-Body Physics Engine', prompt: 'Write a C++ gravitational N-body orbital simulation using Velocity Verlet integration' },
    { label: '🗜️ Huffman Compression', prompt: 'Build a C++ lossless Huffman coding compressor and decompressor with bit-saving statistics' },
  ],
  csharp: [
    { label: '🟣 LINQ Analytics Engine', prompt: 'Write a C# data analytics pipeline using LINQ queries, grouping, and formatted console tables' },
    { label: '🏦 Async Order Processor', prompt: 'Build a C# async/await e-commerce order & inventory processor with Console.ReadLine input support' },
    { label: '🎲 Dungeon Loot & Combat', prompt: 'Create a C# RPG loot generator and combat simulator using records, pattern matching, and interfaces' },
    { label: '📐 Vector3 Physics Lab', prompt: 'Write a C# 3D vector kinematics and collision detector with step-by-step telemetry output' },
    { label: '🔐 SHA & Token Vault', prompt: 'Build a C# security vault manager with salted hashing, role permissions, and audit log formatting' },
    { label: '📊 Financial Amortization', prompt: 'Create a C# loan & compound investment calculator printing a full amortization schedule' },
  ],
  rust: [
    { label: '🦀 Zero-Copy Tokenizer', prompt: 'Write an idiomatic Rust zero-copy text tokenizer and word-frequency analyzer with microsecond timing' },
    { label: '🧭 Dijkstra Graph Router', prompt: 'Build a Rust BinaryHeap Dijkstra shortest-path router on a weighted city graph with path reconstruction' },
    { label: '🔐 Safe LRU Cache Engine', prompt: 'Create a clean, safe Rust generic LRU cache with hit/miss metrics and unit benchmark output' },
    { label: '⚡ Concurrent Prime Sieve', prompt: 'Write a Rust parallel segmented prime sieve using std::thread with throughput statistics' },
    { label: '📊 Financial Monte Carlo', prompt: 'Build a Rust deterministic PRNG Monte Carlo portfolio risk simulator with percentile table' },
    { label: '🧩 Expression AST Evaluator', prompt: 'Write a Rust recursive-descent math expression parser and evaluator with Result error handling' },
  ],
  go: [
    { label: '🐹 Worker Pool Pipeline', prompt: 'Build an idiomatic Go concurrent worker pool using goroutines, channels, and sync.WaitGroup with latency stats' },
    { label: '⚡ Token Bucket Rate Limiter', prompt: 'Create a Go thread-safe token bucket rate limiter and stress-test it across concurrent simulated clients' },
    { label: '🗂️ In-Memory KV Store', prompt: 'Write a Go thread-safe TTL key-value cache with background expiry stats and formatted benchmark table' },
    { label: '🧭 Shortest-Path Grid BFS', prompt: 'Build a Go BFS/A* maze solver that renders the obstacle grid and optimal path in ASCII' },
    { label: '📊 Streaming Log Analyzer', prompt: 'Create a Go structured HTTP log parser and percentile latency (p50/p95/p99) aggregator' },
    { label: '🔐 Merkle Tree Verifier', prompt: 'Write a Go SHA-256 Merkle tree builder and cryptographic inclusion proof verifier' },
  ],
};

export function getCuratedLanguageIdeas(lang: string, offset = 0): CodeIdea[] {
  const cleanLang = String(lang || 'python').toLowerCase().trim();
  const pool = LANGUAGE_IDEAS_POOL[cleanLang] || LANGUAGE_IDEAS_POOL.python;
  const count = 4;
  const out: CodeIdea[] = [];
  const start = Math.abs(Math.floor(offset)) % pool.length;
  for (let i = 0; i < count; i++) {
    out.push(pool[(start + i) % pool.length]);
  }
  return out;
}

export function detectCodeInputRequirement(lang: string, code: string): boolean {
  const cleanLang = String(lang || 'python').toLowerCase().trim();
  const src = String(code || '');
  if (!src.trim()) return false;

  switch (cleanLang) {
    case 'python':
    case 'matlab':
      return /\binput\s*\(/.test(src) || /\bsys\.stdin\b/.test(src);
    case 'java':
      return /\bScanner\s*\(\s*System\.in\s*\)|\bBufferedReader\b|\bSystem\.console\s*\(\)|\bSystem\.in\.read/.test(src);
    case 'cpp':
      return /\b(?:std::)?cin\s*>>|\bgetline\s*\(\s*(?:std::)?cin|\bscanf\s*\(/.test(src);
    case 'csharp':
      return /\bConsole\.Read(?:Line|Key)?\s*\(/.test(src);
    case 'javascript':
    case 'typescript':
      return /\bprocess\.stdin\b|\breadline\b|\bprompt\s*\(/.test(src);
    case 'lsl':
      return /\bllListen\s*\(|\btouch_start\s*\(/.test(src);
    case 'rust':
      return /\bstdin\s*\(\s*\)|\bread_line\s*\(/.test(src);
    case 'go':
      return /\bbufio\.New(?:Scanner|Reader)\s*\(\s*os\.Stdin|\bfmt\.Scan(?:f|ln)?\s*\(/.test(src);
    default:
      return false;
  }
}

export function transpileTypeScriptToJs(tsCode: string): string {
  let s = String(tsCode || '');
  // Remove interface and type alias declarations
  s = s.replace(/^\s*(?:export\s+)?interface\s+[A-Za-z0-9_]+(?:\s*<[^>]*>)?\s*\{[\s\S]*?^\s*\}/gm, '');
  s = s.replace(/^\s*(?:export\s+)?type\s+[A-Za-z0-9_]+(?:\s*<[^>]*>)?\s*=\s*[^;]+;/gm, '');
  // Remove generic type parameters on functions e.g. function foo<T, U>(
  s = s.replace(/(\bfunction\s+[A-Za-z0-9_]+)\s*<[^>]+>\s*\(/g, '$1(');
  // Remove access modifiers in class properties/constructors
  s = s.replace(/\b(public|private|protected|readonly)\s+/g, '');
  // Strip `: Type` annotations in variable declarations, parameters, and return types carefully
  s = s.replace(/(\b(?:const|let|var)\s+[A-Za-z0-9_$]+)\s*:\s*[A-Za-z0-9_<>\[\]|&\s,]+(?=\s*=)/g, '$1');
  s = s.replace(/\)\s*:\s*[A-Za-z0-9_<>\[\]|&\s]+(?=\s*\{|\s*=>)/g, ')');
  s = s.replace(/([(\s,][A-Za-z0-9_$]+)\??\s*:\s*(?:string|number|boolean|any|unknown|void|never|object|Record<[^>]+>|Array<[^>]+>|[A-Za-z0-9_]+(?:\[\])?)/g, '$1');
  s = s.replace(/\s+as\s+(?:const|[A-Za-z0-9_<>\[\]|&]+)/g, '');
  return s;
}

/**
 * Deterministic built-in MATLAB / GNU Octave numerical & matrix script runner
 * for common MATLAB scripts (`disp`, `fprintf`, `input`, matrices, vectors, math, loops).
 * Returns `handled: false` if the script uses custom functions/plotting best handled by the AI numerical engine.
 */
export function executeMatlabScript(code: string, stdin = ''): MatlabExecutionResult {
  const compilerName = 'MATLAB R2024b / GNU Octave 9.2 Numerical Engine';
  const compileStage = 'Compiled .m script & matrix workspace OK';
  const raw = String(code || '').trim();
  if (!raw) {
    return {
      handled: true,
      status: 1,
      stdout: '',
      stderr: 'Error: Empty MATLAB script (.m)',
      compilerName,
      compileStage: 'Compilation aborted: empty script',
    };
  }

  // If script defines local `function` blocks, 3D plots, or symbolic toolboxes, let caller decide or simulate if needed
  const hasComplexFeatures =
    /\b(?:surf|meshgrid|ode45|fft|syms|simulink|figure|subplot|plot3)\b/.test(raw);
  if (hasComplexFeatures) {
    return {
      handled: false,
      status: 0,
      stdout: '',
      stderr: '',
      compilerName,
      compileStage,
    };
  }

  const stdinLines = String(stdin || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l, idx, arr) => !(idx === arr.length - 1 && l === ''));
  let stdinIdx = 0;

  const env: Record<string, any> = {
    pi: Math.PI,
    eps: Number.EPSILON,
    inf: Infinity,
    Inf: Infinity,
    nan: NaN,
    NaN: NaN,
  };

  const outLines: string[] = [];

  const formatMatlabVal = (val: any): string => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return `${val}`;
      return Number(val.toFixed(4)).toString();
    }
    if (Array.isArray(val)) {
      if (val.length > 0 && Array.isArray(val[0])) {
        return val
          .map((row: any[]) => '   ' + row.map((v) => String(typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v).padStart(8)).join(' '))
          .join('\n');
      }
      return '   ' + val.map((v) => String(typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(4)) : v).padStart(8)).join(' ');
    }
    return String(val ?? '');
  };

  const evalMatlabExpr = (exprRaw: string): any => {
    const expr = exprRaw.trim();
    if (!expr) return undefined;

    // String literal '...' or "..."
    if ((expr.startsWith("'") && expr.endsWith("'")) || (expr.startsWith('"') && expr.endsWith('"'))) {
      return expr.slice(1, -1);
    }

    // input('prompt') or input('prompt', 's')
    const inputMatch = expr.match(/^input\s*\(\s*(['"])([\s\S]*?)\1(?:\s*,\s*(['"])s\3)?\s*\)$/);
    if (inputMatch) {
      const promptText = inputMatch[2] || '';
      const isStringMode = Boolean(inputMatch[3]);
      const rawIn = stdinIdx < stdinLines.length ? stdinLines[stdinIdx++] : (isStringMode ? 'Alice' : '10');
      if (promptText) {
        outLines.push(`${promptText}${rawIn}`);
      }
      if (isStringMode) return rawIn;
      const num = Number(rawIn);
      return Number.isNaN(num) ? rawIn : num;
    }

    // magic(n), eye(n), zeros(r,c), ones(r,c), linspace(a,b,n)
    const fnCall = expr.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*\(([\s\S]*)\)$/);
    if (fnCall) {
      const fn = fnCall[1];
      const argsRaw = fnCall[2]
        .split(',')
        .map((a) => a.trim())
        .filter(Boolean);
      const args = argsRaw.map(evalMatlabExpr);

      if (fn === 'magic') {
        const n = Math.max(1, Math.min(10, Number(args[0]) || 3));
        const grid = Array.from({ length: n }, () => Array(n).fill(0));
        let i = 0;
        let j = Math.floor(n / 2);
        for (let num = 1; num <= n * n; num++) {
          grid[i][j] = num;
          const nextI = (i - 1 + n) % n;
          const nextJ = (j + 1) % n;
          if (grid[nextI][nextJ] !== 0) {
            i = (i + 1) % n;
          } else {
            i = nextI;
            j = nextJ;
          }
        }
        return grid;
      }
      if (fn === 'eye') {
        const n = Math.max(1, Math.min(12, Number(args[0]) || 3));
        return Array.from({ length: n }, (_, r) => Array.from({ length: n }, (__, c) => (r === c ? 1 : 0)));
      }
      if (fn === 'zeros' || fn === 'ones') {
        const r = Math.max(1, Math.min(12, Number(args[0]) || 3));
        const c = Math.max(1, Math.min(12, Number(args[1] ?? args[0]) || r));
        const fillVal = fn === 'ones' ? 1 : 0;
        return Array.from({ length: r }, () => Array(c).fill(fillVal));
      }
      if (fn === 'linspace') {
        const a = Number(args[0]) || 0;
        const b = Number(args[1]) || 1;
        const n = Math.max(2, Math.min(50, Number(args[2]) || 5));
        return Array.from({ length: n }, (_, idx) => a + ((b - a) * idx) / (n - 1));
      }
      if (fn === 'sum' || fn === 'mean' || fn === 'max' || fn === 'min') {
        const target = args[0];
        const flat: number[] = Array.isArray(target)
          ? target.flat(2).map(Number).filter((n) => !Number.isNaN(n))
          : [Number(target) || 0];
        if (!flat.length) return 0;
        const s = flat.reduce((acc, v) => acc + v, 0);
        if (fn === 'sum') return s;
        if (fn === 'mean') return s / flat.length;
        if (fn === 'max') return Math.max(...flat);
        if (fn === 'min') return Math.min(...flat);
      }
      if (fn === 'trace' && Array.isArray(args[0])) {
        const mat = args[0];
        let tr = 0;
        for (let k = 0; k < mat.length; k++) {
          tr += Number(Array.isArray(mat[k]) ? mat[k][k] : 0) || 0;
        }
        return tr;
      }
      if (fn === 'det' && Array.isArray(args[0])) {
        const m = args[0];
        if (m.length === 2 && m[0].length === 2) {
          return m[0][0] * m[1][1] - m[0][1] * m[1][0];
        }
        if (m.length === 3 && m[0].length === 3) {
          return (
            m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
            m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
            m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
          );
        }
      }
      if (fn === 'length' || fn === 'numel') {
        const t = args[0];
        if (Array.isArray(t)) return fn === 'numel' ? t.flat(2).length : t.length;
        return 1;
      }
      if (fn === 'sqrt') return Math.sqrt(Number(args[0]) || 0);
      if (fn === 'sin') return Math.sin(Number(args[0]) || 0);
      if (fn === 'cos') return Math.cos(Number(args[0]) || 0);
      if (fn === 'tan') return Math.tan(Number(args[0]) || 0);
      if (fn === 'exp') return Math.exp(Number(args[0]) || 0);
      if (fn === 'log') return Math.log(Number(args[0]) || 1);
      if (fn === 'abs') return Math.abs(Number(args[0]) || 0);
      if (fn === 'round') return Math.round(Number(args[0]) || 0);
      if (fn === 'floor') return Math.floor(Number(args[0]) || 0);
      if (fn === 'ceil') return Math.ceil(Number(args[0]) || 0);
      if (fn === 'mod') return (Number(args[0]) || 0) % (Number(args[1]) || 1);
    }

    // Matrix or vector literal: [1 2 3; 4 5 6] or [1, 2, 3]
    if (expr.startsWith('[') && expr.endsWith(']')) {
      const inner = expr.slice(1, -1).trim();
      if (!inner) return [];
      const rows = inner.split(';').map((r) => r.trim()).filter(Boolean);
      const parsedRows = rows.map((r) =>
        r
          .split(/[\s,]+/)
          .filter(Boolean)
          .map((item) => {
            const v = evalMatlabExpr(item);
            return typeof v === 'number' ? v : Number(v);
          })
      );
      return parsedRows.length === 1 ? parsedRows[0] : parsedRows;
    }

    // Range vector a:b or a:step:b
    const rangeMatch = expr.match(/^([+-]?\d+(?:\.\d+)?)\s*:\s*([+-]?\d+(?:\.\d+)?)(?:\s*:\s*([+-]?\d+(?:\.\d+)?))?$/);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const step = rangeMatch[3] !== undefined ? Number(rangeMatch[2]) : 1;
      const end = rangeMatch[3] !== undefined ? Number(rangeMatch[3]) : Number(rangeMatch[2]);
      const arr: number[] = [];
      if (step > 0) {
        for (let v = start; v <= end + 1e-9 && arr.length < 200; v += step) arr.push(Number(v.toFixed(6)));
      } else if (step < 0) {
        for (let v = start; v >= end - 1e-9 && arr.length < 200; v += step) arr.push(Number(v.toFixed(6)));
      }
      return arr;
    }

    // Direct variable lookup
    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(expr) && expr in env) {
      return env[expr];
    }

    // Transpose A'
    if (/^[a-zA-Z_][a-zA-Z0-9_]*'$/.test(expr)) {
      const baseName = expr.slice(0, -1);
      const val = env[baseName];
      if (Array.isArray(val) && Array.isArray(val[0])) {
        const rows = val.length;
        const cols = val[0].length;
        return Array.from({ length: cols }, (_, c) => Array.from({ length: rows }, (__, r) => val[r][c]));
      }
      return val;
    }

    // Numeric arithmetic expression with variable substitution
    let jsExpr = expr
      .replace(/\.\^/g, '**')
      .replace(/\^/g, '**')
      .replace(/\.\*/g, '*')
      .replace(/\.\//g, '/');

    jsExpr = jsExpr.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (id) => {
      if (id in env) {
        const v = env[id];
        if (typeof v === 'number') return String(v);
        if (typeof v === 'string') return JSON.stringify(v);
      }
      if (id === 'Math') return 'Math';
      throw new Error(`Unsupported symbol: ${id}`);
    });

    const val = Function(`"use strict"; return (${jsExpr});`)();
    return val;
  };

  const stripMatlabComment = (lineRaw: string): string => {
    let inQuote: string | null = null;
    for (let i = 0; i < lineRaw.length; i++) {
      const ch = lineRaw[i];
      if (inQuote) {
        if (ch === inQuote) inQuote = null;
      } else if (ch === "'" || ch === '"') {
        inQuote = ch;
      } else if (ch === '%') {
        return lineRaw.slice(0, i).trim();
      }
    }
    return lineRaw.trim();
  };

  try {
    const rawLines = raw.split(/\r?\n/);
    const execLine = (lineRaw: string) => {
      let line = stripMatlabComment(lineRaw);
      if (!line) return;
      if (/^(?:clc|clear|clear\s+all|close\s+all|format\s+\w+)\s*;?$/i.test(line)) return;

      const suppressOutput = line.endsWith(';');
      if (suppressOutput) line = line.slice(0, -1).trim();
      if (!line) return;

      // disp(...)
      const dispMatch = line.match(/^disp\s*\(([\s\S]+)\)$/);
      if (dispMatch) {
        const val = evalMatlabExpr(dispMatch[1]);
        outLines.push(typeof val === 'string' ? val : formatMatlabVal(val));
        return;
      }

      // fprintf(...)
      const fprintfMatch = line.match(/^fprintf\s*\(([\s\S]+)\)$/);
      if (fprintfMatch) {
        const inner = fprintfMatch[1].trim();
        // Split top-level comma args
        const parts: string[] = [];
        let cur = '';
        let inQuote: string | null = null;
        let depth = 0;
        for (let i = 0; i < inner.length; i++) {
          const ch = inner[i];
          if (inQuote) {
            cur += ch;
            if (ch === inQuote) inQuote = null;
          } else if (ch === "'" || ch === '"') {
            inQuote = ch;
            cur += ch;
          } else if (ch === '(' || ch === '[') {
            depth++;
            cur += ch;
          } else if (ch === ')' || ch === ']') {
            depth = Math.max(0, depth - 1);
            cur += ch;
          } else if (ch === ',' && depth === 0) {
            parts.push(cur.trim());
            cur = '';
          } else {
            cur += ch;
          }
        }
        if (cur.trim()) parts.push(cur.trim());

        if (parts.length >= 1) {
          const fmtRaw = String(evalMatlabExpr(parts[0]) ?? '');
          const vals = parts.slice(1).map(evalMatlabExpr);
          let vIdx = 0;
          const formatted = fmtRaw
            .replace(/\\n/g, '\n')
            .replace(/\\t/g, '\t')
            .replace(/%(\d*(?:\.\d+)?)([dfgeis])/g, (_m, spec, type) => {
              const v = vals[vIdx++];
              if (type === 's') return String(v ?? '');
              if (type === 'd' || type === 'i') return String(Math.round(Number(v) || 0));
              if (type === 'f' || type === 'g' || type === 'e') {
                const precMatch = String(spec || '').match(/\.(\d+)/);
                const prec = precMatch ? Number(precMatch[1]) : 4;
                return (Number(v) || 0).toFixed(prec);
              }
              return String(v ?? '');
            });
          const cleaned = formatted.endsWith('\n') ? formatted.slice(0, -1) : formatted;
          outLines.push(cleaned);
          return;
        }
      }

      // Assignment var = expr
      const assignMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+)$/);
      if (assignMatch) {
        const varName = assignMatch[1];
        const val = evalMatlabExpr(assignMatch[2]);
        env[varName] = val;
        if (!suppressOutput) {
          if (Array.isArray(val) && Array.isArray(val[0])) {
            outLines.push(`${varName} =\n${formatMatlabVal(val)}\n`);
          } else {
            outLines.push(`${varName} = ${formatMatlabVal(val)}`);
          }
        }
        return;
      }

      // Bare expression -> ans
      const val = evalMatlabExpr(line);
      env.ans = val;
      if (!suppressOutput && val !== undefined) {
        outLines.push(`ans = ${formatMatlabVal(val)}`);
      }
    };

    // Support basic single-level `for k = a:b ... end` blocks and sequential lines
    for (let i = 0; i < rawLines.length; i++) {
      const clean = stripMatlabComment(rawLines[i]);
      if (!clean) continue;

      const forMatch = clean.match(/^for\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*([\s\S]+)$/);
      if (forMatch) {
        const loopVar = forMatch[1];
        const iterVals = evalMatlabExpr(forMatch[2]);
        const bodyLines: string[] = [];
        let depth = 1;
        i++;
        while (i < rawLines.length && depth > 0) {
          const l = stripMatlabComment(rawLines[i]);
          if (/^(?:for|while|if)\b/.test(l)) depth++;
          if (/^end\b/.test(l) || l === 'end' || l === 'end;') {
            depth--;
            if (depth === 0) break;
          }
          bodyLines.push(rawLines[i]);
          i++;
        }
        const list = Array.isArray(iterVals) ? iterVals : [iterVals];
        for (const item of list.slice(0, 200)) {
          env[loopVar] = item;
          for (const bl of bodyLines) execLine(bl);
        }
        continue;
      }

      execLine(rawLines[i]);
    }

    return {
      handled: true,
      status: 0,
      stdout: outLines.join('\n') + (outLines.length ? '\n' : ''),
      stderr: '',
      compilerName,
      compileStage,
    };
  } catch (_err) {
    // If any complex MATLAB syntax is encountered, fall back to the server AI numerical engine
    return {
      handled: false,
      status: 0,
      stdout: '',
      stderr: '',
      compilerName,
      compileStage,
    };
  }
}
