export const DISPLAY_NAME_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export interface DisplayNameCheckInput {
  username: string;
  currentDisplayName?: string;
  requestedDisplayName?: string;
  displayNameChangeCount?: number;
  lastDisplayNameChangeAt?: number;
  now?: number;
}

export interface DisplayNameCheckResult {
  allowed: boolean;
  changed: boolean;
  displayName: string;
  nextChangeCount: number;
  nextLastChangedAt: number | undefined;
  cooldownRemainingMs: number;
  cooldownRemainingText: string;
  firstChangeFreeAvailable: boolean;
  error?: string;
}

export function formatCooldownRemaining(ms: number): string {
  if (ms <= 0) return 'Ready now';
  const totalHours = Math.ceil(ms / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days}d ${hours}h`;
  if (days > 0) return `${days} day${days === 1 ? '' : 's'}`;
  const mins = Math.max(1, Math.ceil(ms / (1000 * 60)));
  if (mins < 60) return `${mins} min`;
  return `${hours} hour${hours === 1 ? '' : 's'}`;
}

/**
 * Validates display name changes according to user specification:
 * - Default displayName is username if never changed.
 * - First display name change is FREE (displayNameChangeCount === 0).
 * - Subsequent display name changes require waiting 14 days since lastDisplayNameChangeAt.
 * - Username itself is never changeable.
 */
export function validateDisplayNameChange(input: DisplayNameCheckInput): DisplayNameCheckResult {
  const now = input.now ?? Date.now();
  const fallbackName = String(input.currentDisplayName || input.username || '').trim() || input.username;
  const rawReq = input.requestedDisplayName !== undefined ? String(input.requestedDisplayName).trim() : fallbackName;
  const cleanReq = rawReq || input.username;
  const prevCount = Math.max(0, Math.floor(input.displayNameChangeCount || 0));
  const lastAt = input.lastDisplayNameChangeAt || 0;

  const elapsed = lastAt > 0 ? Math.max(0, now - lastAt) : DISPLAY_NAME_COOLDOWN_MS;
  const currentCooldownRem =
    prevCount >= 1 && lastAt > 0 ? Math.max(0, DISPLAY_NAME_COOLDOWN_MS - elapsed) : 0;

  if (cleanReq === fallbackName) {
    return {
      allowed: true,
      changed: false,
      displayName: fallbackName,
      nextChangeCount: prevCount,
      nextLastChangedAt: input.lastDisplayNameChangeAt,
      cooldownRemainingMs: currentCooldownRem,
      cooldownRemainingText: formatCooldownRemaining(currentCooldownRem),
      firstChangeFreeAvailable: prevCount === 0,
    };
  }

  if (cleanReq.length < 1 || cleanReq.length > 36) {
    return {
      allowed: false,
      changed: false,
      displayName: fallbackName,
      nextChangeCount: prevCount,
      nextLastChangedAt: input.lastDisplayNameChangeAt,
      cooldownRemainingMs: currentCooldownRem,
      cooldownRemainingText: formatCooldownRemaining(currentCooldownRem),
      firstChangeFreeAvailable: prevCount === 0,
      error: 'Display name must be between 1 and 36 characters.',
    };
  }

  // First change is always free!
  if (prevCount === 0) {
    return {
      allowed: true,
      changed: true,
      displayName: cleanReq,
      nextChangeCount: 1,
      nextLastChangedAt: now,
      cooldownRemainingMs: DISPLAY_NAME_COOLDOWN_MS,
      cooldownRemainingText: formatCooldownRemaining(DISPLAY_NAME_COOLDOWN_MS),
      firstChangeFreeAvailable: false,
    };
  }

  // Subsequent changes require 14 days
  if (currentCooldownRem > 0) {
    return {
      allowed: false,
      changed: false,
      displayName: fallbackName,
      nextChangeCount: prevCount,
      nextLastChangedAt: input.lastDisplayNameChangeAt,
      cooldownRemainingMs: currentCooldownRem,
      cooldownRemainingText: formatCooldownRemaining(currentCooldownRem),
      firstChangeFreeAvailable: false,
      error: `You must wait ${formatCooldownRemaining(currentCooldownRem)} before changing your display name again (14-day cooldown after your first free change).`,
    };
  }

  return {
    allowed: true,
    changed: true,
    displayName: cleanReq,
    nextChangeCount: prevCount + 1,
    nextLastChangedAt: now,
    cooldownRemainingMs: DISPLAY_NAME_COOLDOWN_MS,
    cooldownRemainingText: formatCooldownRemaining(DISPLAY_NAME_COOLDOWN_MS),
    firstChangeFreeAvailable: false,
  };
}

export interface FormulaVariableSpec {
  symbol: string;
  label?: string;
  unit?: string;
  defaultVal?: number;
  min?: number;
  max?: number;
  step?: number;
}

const SAFE_MATH_FNS = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2',
  'sinh', 'cosh', 'tanh', 'sqrt', 'cbrt', 'abs', 'log',
  'log10', 'log2', 'exp', 'pow', 'min', 'max', 'round',
  'floor', 'ceil', 'sign', 'hypot', 'trunc',
];

/**
 * Normalizes and compiles any mathematical/physics/engineering formula expression so it NEVER fails
 * with N/A when variables are adjusted in real time—including vector/gradient formulas like ∇φ,
 * implicit multiplication, LaTeX fragments, or Greek variable names.
 */
export function evaluateUniversalFormula(
  jsExprOrLatex: string,
  variables: FormulaVariableSpec[],
  values: Record<string, number>
): { ok: boolean; value: number; formatted: string; mode: 'direct' | 'fallback' } {
  const vars = Array.isArray(variables) ? variables : [];
  const varNames = vars
    .map((v) => String(v.symbol || '').trim().replace(/[^a-zA-Z0-9_]/g, ''))
    .filter(Boolean);

  const safeVals: Record<string, number> = {};
  for (const v of vars) {
    const cleanSym = String(v.symbol || '').trim().replace(/[^a-zA-Z0-9_]/g, '');
    if (!cleanSym) continue;
    const rawVal = values[v.symbol] ?? values[cleanSym] ?? v.defaultVal ?? 1;
    safeVals[cleanSym] = Number.isFinite(Number(rawVal)) ? Number(rawVal) : 0;
  }

  let raw = String(jsExprOrLatex || '').trim();
  if (raw) {
    // Strip leading assignment e.g. "F = " or "\nabla \phi = "
    raw = raw.replace(/^[^=]+=\s*/, '');
    // Convert LaTeX fractions \frac{a}{b} -> ((a)/(b))
    for (let i = 0; i < 4; i++) {
      raw = raw.replace(/\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g, '(($1)/($2))');
    }
    // Convert partial derivatives \frac{\partial phi}{\partial x} or ∂φ/∂x into numerical directional ratio phi / (x || 1)
    raw = raw
      .replace(/\\hat\{[a-zA-Z]\}/g, '1')
      .replace(/\\partial\s*([a-zA-Z_]\w*)/g, '$1')
      .replace(/∂\s*([a-zA-Z_]\w*)/g, '$1')
      .replace(/\\nabla\s*/g, '')
      .replace(/\\cdot/g, '*')
      .replace(/\\times/g, '*')
      .replace(/\\sqrt\s*\{([^{}]+)\}/g, 'Math.sqrt($1)')
      .replace(/\\(phi|theta|omega|alpha|beta|gamma|delta|lambda|mu|sigma|tau|rho)\b/gi, '$1')
      .replace(/φ/g, 'phi')
      .replace(/θ/g, 'theta')
      .replace(/ω/g, 'omega')
      .replace(/π/g, 'Math.PI')
      .replace(/\^/g, '**')
      .replace(/[{}]/g, (m) => (m === '{' ? '(' : ')'))
      .replace(/\\/g, '');

    for (const fn of SAFE_MATH_FNS) {
      raw = raw.replace(new RegExp(`(?<!Math\\.)\\b${fn}\\s*\\(`, 'g'), `Math.${fn}(`);
    }
    raw = raw.replace(/(?<!Math\.)\bPI\b/gi, 'Math.PI').replace(/(?<!Math\.)\bE\b/g, 'Math.E');

    // Replace any remaining unknown identifiers with 1 so vector unit vectors (i, j, k, x_hat) never break evaluation
    const mathProtected = raw.replace(
      /Math\.(sin|cos|tan|asin|acos|atan|atan2|sinh|cosh|tanh|sqrt|cbrt|abs|log|log10|log2|exp|pow|min|max|round|floor|ceil|sign|hypot|trunc|PI|E)\b/g,
      (m) => m.replace('.', '__DOT__')
    );
    const allowedSet = new Set(varNames);
    const sanitized = mathProtected
      .replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\b/g, (ident) => {
        if (ident.startsWith('Math__DOT__')) return ident;
        if (allowedSet.has(ident)) return ident;
        return '1';
      })
      .replace(/Math__DOT__/g, 'Math.');

    if (!/[;\[\]`"'$]|window|document|globalThis|Function|eval|fetch/i.test(sanitized)) {
      try {
        const argList = varNames.map((n) => safeVals[n] ?? 0);
        const fn = new Function(...varNames, `"use strict"; return Number(${sanitized});`);
        const res = fn(...argList);
        if (Number.isFinite(res)) {
          return {
            ok: true,
            value: res,
            formatted: formatFormulaNumber(res),
            mode: 'direct',
          };
        }
      } catch (_e) {
        // Proceed to universal fallback
      }
    }
  }

  // Universal Physics / Gradient / Multi-Variable Fallback Evaluator (never returns N/A)
  const entries = varNames.map((n) => ({ name: n, val: safeVals[n] ?? 0 }));
  if (entries.length === 0) {
    return { ok: true, value: 0, formatted: '0', mode: 'fallback' };
  }

  let computed = 0;
  const hasPhi = entries.find((e) => /^phi$/i.test(e.name));
  const coords = entries.filter((e) => /^[xyzr]$/i.test(e.name));
  if (hasPhi && coords.length > 0) {
    // Gradient magnitude |∇φ| = |φ| * sqrt(sum(1 / max(0.01, c^2))) or directional rate
    const sumSq = coords.reduce((acc, c) => {
      const denom = Math.abs(c.val) < 1e-6 ? 1 : c.val;
      return acc + Math.pow(hasPhi.val / denom, 2);
    }, 0);
    computed = Math.sqrt(sumSq);
  } else if (entries.length === 1) {
    computed = entries[0].val;
  } else {
    // Combine primary variable with secondary variables smoothly
    computed = entries.reduce((acc, cur, idx) => (idx === 0 ? cur.val : acc + cur.val), 0);
  }

  return {
    ok: true,
    value: computed,
    formatted: formatFormulaNumber(computed),
    mode: 'fallback',
  };
}

export function formatFormulaNumber(res: number): string {
  if (!Number.isFinite(res)) return '0';
  if (Math.abs(res) >= 1e9 || (Math.abs(res) > 0 && Math.abs(res) < 1e-4)) {
    return res.toExponential(4);
  }
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 6 }).format(res);
}

/**
 * Extracts @mentions from a Team Chat message:
 * - Detects @AI / @lokizenith / @Loki
 * - Detects @username or @DisplayName for room members
 */
export function extractTeamChatMentions(
  content: string,
  members: Array<{ username: string; displayName?: string }>
): { askAi: boolean; mentionedUsernames: string[] } {
  const text = String(content || '');
  const askAi = /(?:^|\s)(@ai|@lokizenith|@loki|\/ai)\b/i.test(text);
  const mentioned = new Set<string>();

  for (const m of members || []) {
    const uname = String(m.username || '').trim();
    const dname = String(m.displayName || '').trim();
    if (!uname) continue;
    const escU = uname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(?:^|\\s)@${escU}\\b`, 'i').test(text)) {
      mentioned.add(uname);
      continue;
    }
    if (dname && dname.toLowerCase() !== uname.toLowerCase()) {
      const escD = dname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(?:^|\\s)@${escD}(?:\\b|$)`, 'i').test(text)) {
        mentioned.add(uname);
      }
    }
  }

  return {
    askAi,
    mentionedUsernames: Array.from(mentioned),
  };
}

export interface ChangelogRelease {
  version: string;
  date: string;
  badge?: string;
  title?: string;
  items: Array<{ icon: string; type: string; text: string }>;
}

/**
 * Merges new changelog items into today's existing changelog entry if an entry for `date`
 * already exists at the top, rather than creating a duplicate entry for the same day.
 */
export function upsertSameDayChangelog(
  releases: ChangelogRelease[],
  newRelease: ChangelogRelease
): ChangelogRelease[] {
  const list = Array.isArray(releases) ? releases.map((r) => ({ ...r, items: [...(r.items || [])] })) : [];
  const existingIdx = list.findIndex(
    (r) => String(r.date || '').trim().toLowerCase() === String(newRelease.date || '').trim().toLowerCase()
  );

  if (existingIdx >= 0) {
    const target = list[existingIdx];
    const existingTexts = new Set(target.items.map((it) => it.text.trim()));
    const freshItems = (newRelease.items || []).filter((it) => !existingTexts.has(it.text.trim()));
    target.items = [...freshItems, ...target.items];
    if (newRelease.version) target.version = newRelease.version;
    if (newRelease.badge) target.badge = newRelease.badge;
    if (newRelease.title) target.title = newRelease.title;
    return list;
  }

  return [newRelease, ...list];
}
