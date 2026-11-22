export interface ChatIntentInfo {
  kind: 'code' | 'image' | 'video' | 'search' | 'visual' | 'chat';
  icon: string;
  label: string;
}

const MATH_FUNCS: Record<string, (...args: number[]) => number> = {
  round: (x, d = 0) => {
    const f = Math.pow(10, Math.max(0, Math.min(8, Math.trunc(d))));
    return Math.round(x * f) / f;
  },
  floor: Math.floor,
  ceil: Math.ceil,
  sqrt: (x) => (x < 0 ? NaN : Math.sqrt(x)),
  abs: Math.abs,
  min: Math.min,
  max: Math.max,
  pow: Math.pow,
  log: Math.log,
  log10: Math.log10,
  exp: Math.exp,
};

type Token =
  | { type: 'num'; value: number }
  | { type: 'id'; value: string }
  | { type: 'op'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma' };

function tokenize(expr: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  const s = expr.trim();
  while (i < s.length) {
    const ch = s[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      let dots = 0;
      while (i < s.length && /[0-9.]/.test(s[i])) {
        if (s[i] === '.') dots++;
        if (dots > 1) return null;
        numStr += s[i++];
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) return null;
      tokens.push({ type: 'num', value: val });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let id = '';
      while (i < s.length && /[a-zA-Z0-9_.]/.test(s[i])) {
        id += s[i++];
      }
      tokens.push({ type: 'id', value: id });
      continue;
    }
    if (ch === '+' || ch === '-' || ch === '*' || ch === '/' || ch === '^' || ch === '%') {
      if (ch === '*' && s[i + 1] === '*') {
        tokens.push({ type: 'op', value: '^' });
        i += 2;
      } else {
        tokens.push({ type: 'op', value: ch });
        i++;
      }
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', value: ch });
      i++;
      continue;
    }
    if (ch === ',') {
      tokens.push({ type: 'comma' });
      i++;
      continue;
    }
    return null;
  }
  return tokens;
}

/**
 * Safe recursive-descent mathematical formula evaluator without eval/Function.
 * Supports +, -, *, /, %, ^ (and **), parentheses, variables, and safe Math helpers.
 */
export function safeEvalFormula(expr: string, vars: Record<string, number> = {}): number | null {
  if (!expr || typeof expr !== 'string' || expr.length > 400) return null;
  const tokens = tokenize(expr);
  if (!tokens || !tokens.length) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpression(): number {
    let left = parseTerm();
    while (peek()?.type === 'op' && (peek() as { value: string }).value.match(/^[+-]$/)) {
      const op = (consume() as { value: string }).value;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (peek()?.type === 'op' && (peek() as { value: string }).value.match(/^[*\/%]$/)) {
      const op = (consume() as { value: string }).value;
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') left = right === 0 ? NaN : left / right;
      else left = right === 0 ? NaN : left % right;
    }
    return left;
  }

  function parsePower(): number {
    let base = parseUnary();
    if (peek()?.type === 'op' && (peek() as { value: string }).value === '^') {
      consume();
      const exp = parsePower();
      base = Math.pow(base, exp);
    }
    return base;
  }

  function parseUnary(): number {
    const tk = peek();
    if (tk?.type === 'op' && (tk.value === '+' || tk.value === '-')) {
      consume();
      const val = parseUnary();
      return tk.value === '-' ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tk = peek();
    if (!tk) return NaN;
    if (tk.type === 'num') {
      consume();
      return tk.value;
    }
    if (tk.type === 'paren' && tk.value === '(') {
      consume();
      const val = parseExpression();
      const close = consume();
      if (!close || close.type !== 'paren' || close.value !== ')') return NaN;
      return val;
    }
    if (tk.type === 'id') {
      consume();
      const rawName = tk.value.startsWith('Math.') ? tk.value.slice(5) : tk.value;
      if (peek()?.type === 'paren' && (peek() as { value: string }).value === '(') {
        const fn = MATH_FUNCS[rawName.toLowerCase()];
        if (!fn) return NaN;
        consume(); // '('
        const args: number[] = [];
        if (!(peek()?.type === 'paren' && (peek() as { value: string }).value === ')')) {
          args.push(parseExpression());
          while (peek()?.type === 'comma') {
            consume();
            args.push(parseExpression());
          }
        }
        const close = consume();
        if (!close || close.type !== 'paren' || close.value !== ')') return NaN;
        return fn(...args);
      }
      if (rawName === 'PI' || rawName === 'pi') return Math.PI;
      if (rawName === 'E') return Math.E;
      if (Object.prototype.hasOwnProperty.call(vars, tk.value)) {
        const v = Number(vars[tk.value]);
        return Number.isFinite(v) ? v : NaN;
      }
      return NaN;
    }
    return NaN;
  }

  try {
    const result = parseExpression();
    if (pos !== tokens.length) return null;
    if (!Number.isFinite(result)) return null;
    return result;
  } catch {
    return null;
  }
}

export function classifyConversationIntent(
  messages: Array<{ role?: string; content?: string; type?: string }> = []
): ChatIntentInfo {
  const joined = messages
    .map((m) => String(m?.content || ''))
    .join('\n')
    .slice(0, 6000);

  if (messages.some((m) => m?.type === 'video') || /\b(generate.*video|ai video|צור סרטון|סרטון)\b/i.test(joined)) {
    return { kind: 'video', icon: '🎬', label: 'Video' };
  }
  if (messages.some((m) => m?.type === 'image') || /data:image\/|\b(generate.*image|צור תמונה|צייר)\b/i.test(joined)) {
    return { kind: 'image', icon: '🎨', label: 'Image' };
  }
  if (/```(?:loki-|chart|compare|tabs|calc|progress|tree|verdict|table|metrics|kanban|timeline)/i.test(joined)) {
    return { kind: 'visual', icon: '✦', label: 'Interactive' };
  }
  if (/```(?:js|ts|jsx|tsx|py|python|html|css|sql|cpp|rust|go|java|bash|sh|json)/i.test(joined) || /\b(function|const |import |def |class )\b/.test(joined)) {
    return { kind: 'code', icon: '⟨/⟩', label: 'Code' };
  }
  if (/\b(search the web|חפש באינטרנט|מקורות|news|latest)\b/i.test(joined)) {
    return { kind: 'search', icon: '🌐', label: 'Research' };
  }
  return { kind: 'chat', icon: '◈', label: 'Chat' };
}

export function formatRelativeAge(ts: number, now: number = Date.now()): string {
  const diff = Math.max(0, now - Number(ts || 0));
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'now';
  if (min < 60) return `${min}m`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d`;
  const d = new Date(ts);
  return d.toLocaleDateString('en', { month: 'short', day: 'numeric' });
}
