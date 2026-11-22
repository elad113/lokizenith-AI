/**
 * Pure interactive UI parser & live streaming partial-JSON repair utilities.
 * Ensures AI-generated UI blocks (whether tagged `loki-*`, `json`, or plain fences)
 * are detected accurately and rendered progressively as live UI while streaming —
 * never shown as raw JSON/HTML code.
 */

export const KNOWN_UI_BLOCK_LANGS = new Set([
  'loki-chart', 'chart',
  'loki-metrics', 'metrics',
  'loki-proscons', 'proscons',
  'loki-timeline', 'timeline',
  'loki-steps', 'checklist', 'steps', 'loki-checklist',
  'loki-cards', 'flashcards', 'cards', 'loki-flashcards',
  'loki-callout', 'insight', 'callout', 'loki-insight',
  'loki-kanban', 'kanban', 'board', 'loki-board',
  'loki-quiz', 'quiz',
  'loki-table', 'datatable', 'table', 'grid', 'loki-grid',
  'loki-codeplay', 'sandbox',
  'loki-architecture', 'flow', 'diagram',
  'loki-swot', 'swot',
  'loki-accordion', 'faq',
  'loki-decision', 'decision',
  'loki-codecompare', 'diff',
  'loki-audio', 'synth',
  'loki-compare', 'compare', 'comparison',
  'loki-tabs', 'tabs',
  'loki-calc', 'calculator', 'calc',
  'loki-progress', 'bars', 'progress',
  'loki-tree', 'mindmap', 'tree',
  'loki-verdict', 'rating', 'review', 'scorecard',
  'mermaid', 'svg', 'loki-html', 'html-widget',
]);

export const UI_BLOCK_LABELS: Record<string, { icon: string; label: string }> = {
  'loki-compare': { icon: '⚖️', label: 'Comparison Cards' },
  'loki-verdict': { icon: '🏆', label: 'Executive Scorecard' },
  'loki-calc': { icon: '🧮', label: 'Live Calculator' },
  'loki-progress': { icon: '📶', label: 'Visual Breakdown Bars' },
  'loki-tree': { icon: '🌿', label: 'Interactive Mind Map' },
  'loki-tabs': { icon: '🗂️', label: 'Interactive Tabs' },
  'loki-chart': { icon: '📈', label: 'Interactive Chart' },
  'loki-metrics': { icon: '📊', label: 'KPI Metrics Grid' },
  'loki-proscons': { icon: '⚖️', label: 'Pros & Cons Matrix' },
  'loki-timeline': { icon: '🗓️', label: 'Interactive Timeline' },
  'loki-steps': { icon: '✅', label: 'Interactive Checklist' },
  'loki-cards': { icon: '🃏', label: '3D Flashcards' },
  'loki-callout': { icon: '💡', label: 'Key Insight Card' },
  'loki-kanban': { icon: '📋', label: 'Kanban Board' },
  'loki-quiz': { icon: '🎯', label: 'Interactive Quiz' },
  'loki-table': { icon: '📑', label: 'Interactive Table' },
  'loki-swot': { icon: '🧭', label: 'SWOT Matrix' },
  'loki-accordion': { icon: '❓', label: 'Interactive FAQ' },
  'loki-decision': { icon: '⚖️', label: 'Decision Matrix' },
  'loki-architecture': { icon: '🏗️', label: 'Architecture Flow' },
  'loki-audio': { icon: '🎹', label: 'Interactive Synth' },
  'loki-html': { icon: '✨', label: 'Custom Interactive UI' },
  'svg': { icon: '✏️', label: 'Vector Graphic' },
  'mermaid': { icon: '🔗', label: 'Diagram' },
};

/**
 * Repairs an incomplete / streaming JSON fragment so it can be JSON.parse'd live
 * while the model is still typing tokens.
 */
export function repairPartialJson(raw: string): unknown | null {
  if (!raw || typeof raw !== 'string') return null;
  let s = raw.trim()
    .replace(/^```[\w:-]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .replace(/[\u201c\u201d]/g, '"')
    .trim();

  const firstObj = s.indexOf('{');
  const firstArr = s.indexOf('[');
  let start = -1;
  if (firstObj >= 0 && firstArr >= 0) start = Math.min(firstObj, firstArr);
  else start = Math.max(firstObj, firstArr);
  if (start < 0) return null;
  s = s.slice(start);

  // Fast path: already valid JSON
  try {
    return JSON.parse(s);
  } catch {
    // proceed to incremental repair
  }

  // Try stripping trailing comma right before closing bracket first
  try {
    return JSON.parse(s.replace(/,\s*([}\]])/g, '$1'));
  } catch {
    // proceed to partial stream repair
  }

  // Walk characters to track string state, escapes, and open brackets
  let inString = false;
  let escaped = false;
  const stack: string[] = [];
  let clean = '';

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        clean += ch;
        escaped = false;
      } else if (ch === '\\') {
        clean += ch;
        escaped = true;
      } else if (ch === '"') {
        clean += ch;
        inString = false;
      } else if (ch === '\n' || ch === '\r') {
        clean += '\\n';
      } else {
        clean += ch;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      clean += ch;
    } else if (ch === '{') {
      stack.push('}');
      clean += ch;
    } else if (ch === '[') {
      stack.push(']');
      clean += ch;
    } else if (ch === '}' || ch === ']') {
      if (stack.length && stack[stack.length - 1] === ch) {
        stack.pop();
        clean += ch;
      }
    } else {
      clean += ch;
    }
  }

  // Close an unclosed string literal (drop dangling trailing backslash)
  if (inString) {
    if (escaped) clean = clean.slice(0, -1);
    clean += '"';
  }

  // Helper to strip incomplete trailing key/value fragments and append missing closers
  const tryClose = (candidate: string): unknown | null => {
    let trimmed = candidate.trimEnd();
    // Repeatedly strip trailing dangling tokens:
    // - trailing comma
    // - trailing key with colon and no value (`"foo":`)
    // - trailing bare key inside object (`,"foo"` or `{"foo"`)
    // - trailing partial literal (`: tru`, `: fal`, `: nul`, `: -`, `: 12.`)
    for (let guard = 0; guard < 12; guard++) {
      const prev = trimmed;
      trimmed = trimmed.replace(/,\s*$/, '');
      trimmed = trimmed.replace(/([{,]\s*"(?:[^"\\]|\\.)*"\s*:\s*)$/, (m) => (m.startsWith('{') ? '{' : ''));
      trimmed = trimmed.replace(/([{,]\s*"(?:[^"\\]|\\.)*"\s*:\s*(?:t|tr|tru|f|fa|fal|fals|n|nu|nul|-|\d+\.|\d+[eE][+-]?)\s*)$/, (m) => (m.startsWith('{') ? '{' : ''));
      // Bare key without colon right inside an object
      if (stack.length && stack[stack.length - 1] === '}') {
        trimmed = trimmed.replace(/([{,]\s*"(?:[^"\\]|\\.)*"\s*)$/, (m) => (m.startsWith('{') ? '{' : ''));
      }
      trimmed = trimmed.replace(/,\s*$/, '');
      if (trimmed === prev) break;
    }

    // Recompute needed closing brackets on `trimmed`
    let inStr = false;
    let esc = false;
    const needed: string[] = [];
    for (let i = 0; i < trimmed.length; i++) {
      const c = trimmed[i];
      if (inStr) {
        if (esc) esc = false;
        else if (c === '\\') esc = true;
        else if (c === '"') inStr = false;
      } else {
        if (c === '"') inStr = true;
        else if (c === '{') needed.push('}');
        else if (c === '[') needed.push(']');
        else if ((c === '}' || c === ']') && needed.length && needed[needed.length - 1] === c) needed.pop();
      }
    }
    const closed = (trimmed + needed.reverse().join('')).replace(/,\s*([}\]])/g, '$1');
    try {
      return JSON.parse(closed);
    } catch {
      return null;
    }
  };

  const firstAttempt = tryClose(clean);
  if (firstAttempt !== null) return firstAttempt;

  // Fallback: backtrack to last safe delimiter (comma, `}`, `]`) and close
  for (let cut = clean.length - 1; cut > 2; cut--) {
    const ch = clean[cut];
    if (ch === ',' || ch === '}' || ch === ']') {
      const attempt = tryClose(clean.slice(0, cut + (ch === ',' ? 0 : 1)));
      if (attempt !== null) return attempt;
    }
  }
  return null;
}

export function normalizeExplicitUiLang(lang: string): string | null {
  const l = String(lang || '').toLowerCase().trim().replace(/^ui[-:]/, 'loki-');
  if (!l) return null;
  if (KNOWN_UI_BLOCK_LANGS.has(l) || l.startsWith('loki-')) return l;
  return null;
}

/**
 * Infers which Lokizenith interactive UI widget a parsed JSON payload represents,
 * even if the AI wrapped it in ```json or a plain ``` fence without a `loki-*` tag.
 */
export function inferUiBlockFromData(data: unknown, hintText = ''): string | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  const d = data as Record<string, unknown>;
  const hint = String(hintText || '').toLowerCase();

  // 1. Comparison Cards (items/options with features/specs/tagline/recommended/badge)
  const cmpItems = Array.isArray(d.items) ? d.items : (Array.isArray(d.options) ? d.options : null);
  if (cmpItems && cmpItems.length > 0 && cmpItems.some((it) => {
    if (!it || typeof it !== 'object') return false;
    const o = it as Record<string, unknown>;
    return Boolean(o.features || o.specs || o.tagline || o.recommended !== undefined || o.winner !== undefined || o.price);
  })) {
    return 'loki-compare';
  }
  if (/comparison\s*cards?|compare\s*cards?|כרטיסי\s*השוואה/i.test(hint) && (d.title || d.items || d.options)) {
    return 'loki-compare';
  }

  // 2. Live Interactive Calculator
  if (Array.isArray(d.inputs) && (Array.isArray(d.outputs) || typeof d.formula === 'string')) {
    return 'loki-calc';
  }
  if (Array.isArray(d.inputs) && /calc|calculator|מחשבון/i.test(hint)) {
    return 'loki-calc';
  }

  // 3. Executive Verdict / Rating Scorecard
  if ((typeof d.score === 'number' || typeof d.rating === 'number') && (Array.isArray(d.dimensions) || Array.isArray(d.categories) || d.verdict || d.summary || d.bestFor || d.headline)) {
    return 'loki-verdict';
  }
  if (/scorecard|verdict|rating|ציון|דירוג/i.test(hint) && (d.score !== undefined || d.rating !== undefined || d.dimensions)) {
    return 'loki-verdict';
  }

  // 4. Interactive Mind Map / Concept Tree
  if ((d.root && typeof d.root === 'object') || (Array.isArray(d.nodes) && d.nodes.some((n) => n && typeof n === 'object' && ('children' in n || 'label' in n)))) {
    return 'loki-tree';
  }

  // 5. Interactive Tabs
  if (Array.isArray(d.tabs) || Array.isArray(d.panels)) {
    return 'loki-tabs';
  }

  // 6. Interactive Chart
  if (Array.isArray(d.labels) && (Array.isArray(d.datasets) || Array.isArray(d.data) || Array.isArray(d.values))) {
    return 'loki-chart';
  }

  // 7. Weighted Decision Matrix
  if (Array.isArray(d.criteria) && Array.isArray(d.options)) {
    return 'loki-decision';
  }

  // 8. Pros & Cons
  if (Array.isArray(d.pros) && Array.isArray(d.cons)) {
    return 'loki-proscons';
  }

  // 9. SWOT Matrix
  if (Array.isArray(d.strengths) && Array.isArray(d.weaknesses) && (Array.isArray(d.opportunities) || Array.isArray(d.threats))) {
    return 'loki-swot';
  }

  // 10. Timeline
  if (Array.isArray(d.events) || Array.isArray(d.milestones)) {
    return 'loki-timeline';
  }

  // 11. Kanban Board
  if (Array.isArray(d.columns) && d.columns.some((c) => c && typeof c === 'object' && Array.isArray((c as Record<string, unknown>).items))) {
    return 'loki-kanban';
  }

  // 12. Interactive Quiz
  if (Array.isArray(d.questions) && d.questions.some((q) => q && typeof q === 'object' && Array.isArray((q as Record<string, unknown>).options))) {
    return 'loki-quiz';
  }

  // 13. 3D Flashcards
  if (Array.isArray(d.cards) && d.cards.some((c) => c && typeof c === 'object' && ('front' in c || 'back' in c))) {
    return 'loki-cards';
  }

  // 14. Interactive FAQ / Accordion
  if (Array.isArray(d.items) && d.items.some((it) => it && typeof it === 'object' && ('q' in it || 'question' in it) && ('a' in it || 'answer' in it))) {
    return 'loki-accordion';
  }

  // 15. Interactive Checklist / Steps
  if (Array.isArray(d.steps) || Array.isArray(d.tasks)) {
    return 'loki-steps';
  }

  // 16. Interactive Data Table
  if (Array.isArray(d.headers) && Array.isArray(d.rows)) {
    return 'loki-table';
  }

  // 17. KPI Metrics Grid
  if (Array.isArray(d.metrics) || (Array.isArray(d.items) && d.items.some((it) => it && typeof it === 'object' && 'value' in it && ('delta' in it || 'change' in it)))) {
    return 'loki-metrics';
  }

  // 18. Animated Progress / Score Bars
  if (Array.isArray(d.bars) || (Array.isArray(d.items) && d.items.some((it) => it && typeof it === 'object' && ('value' in it || 'score' in it) && ('label' in it || 'name' in it)))) {
    return 'loki-progress';
  }

  return null;
}

export function looksLikeInteractiveHtmlSnippet(code: string): boolean {
  const s = String(code || '');
  if (/<!doctype|<html[\s>]/i.test(s) && /<(script|style|div|button|canvas|input|section|main)[\s>]/i.test(s)) return true;
  if (/<(canvas|input|button|select|textarea)[\s>]/i.test(s) && /<(script|style)[\s>]/i.test(s)) return true;
  if (/\bon(?:click|input|change|submit)\s*=/i.test(s) && /<(button|input|form|canvas)[\s>]/i.test(s)) return true;
  return false;
}

export interface ParsedUiSegment {
  kind: 'text' | 'ui';
  text?: string;
  uiType?: string;
  rawCode?: string;
  parsedData?: unknown;
  isStreaming?: boolean;
  label?: string;
  icon?: string;
}

/**
 * Splits markdown (complete OR mid-stream!) into prose segments and live UI segments
 * so raw JSON/HTML UI code is never flashed while typing or in the final bubble.
 */
export function splitMarkdownWithLiveUi(markdown: string): ParsedUiSegment[] {
  const src = String(markdown || '');
  if (!src) return [];

  const segments: ParsedUiSegment[] = [];
  const fenceOpenRe = /```([^\n`]*)\n/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = fenceOpenRe.exec(src)) !== null) {
    const startIdx = match.index;
    const rawLang = (match[1] || '').trim().split(/\s+/)[0].toLowerCase();
    const bodyStart = startIdx + match[0].length;
    const closeIdx = src.indexOf('\n```', bodyStart);
    const altCloseIdx = closeIdx < 0 ? src.indexOf('```', bodyStart) : closeIdx;
    const isClosed = altCloseIdx >= 0;
    const bodyEnd = isClosed ? altCloseIdx : src.length;
    const blockEnd = isClosed ? (altCloseIdx + (src.slice(altCloseIdx, altCloseIdx + 4) === '\n```' ? 4 : 3)) : src.length;
    const rawCode = src.slice(bodyStart, bodyEnd);
    const precedingLine = src.slice(Math.max(0, startIdx - 140), startIdx);

    let uiType = normalizeExplicitUiLang(rawLang);
    let parsedData: unknown = null;

    const isHtmlFence = uiType === 'loki-html' || uiType === 'html-widget' || rawLang === 'html';
    if (isHtmlFence) {
      if (uiType === 'loki-html' || uiType === 'html-widget' || looksLikeInteractiveHtmlSnippet(rawCode) || (!isClosed && /<!doctype|<html|<style|<div|<button|<canvas/i.test(rawCode))) {
        uiType = 'loki-html';
      } else {
        uiType = null;
      }
    } else if (!uiType && (rawLang === '' || rawLang === 'json' || rawLang === 'jsonc' || rawLang === 'javascript' || rawLang === 'js')) {
      parsedData = repairPartialJson(rawCode);
      if (parsedData) {
        uiType = inferUiBlockFromData(parsedData, precedingLine);
      } else if (!isClosed && rawCode.trim().startsWith('{')) {
        // Early mid-stream detection before first complete field lands
        const hint = (precedingLine + '\n' + rawCode).toLowerCase();
        if (/comparison|compare|"items"\s*:\s*\[|"features"\s*:/.test(hint)) uiType = 'loki-compare';
        else if (/scorecard|verdict|"dimensions"\s*:|"score"\s*:/.test(hint)) uiType = 'loki-verdict';
        else if (/calculator|"inputs"\s*:\s*\[|"formula"\s*:/.test(hint)) uiType = 'loki-calc';
        else if (/mind\s*map|"root"\s*:\s*\{|"children"\s*:/.test(hint)) uiType = 'loki-tree';
        else if (/"tabs"\s*:\s*\[/.test(hint)) uiType = 'loki-tabs';
        else if (/"datasets"\s*:\s*\[/.test(hint)) uiType = 'loki-chart';
        else if (/"metrics"\s*:\s*\[/.test(hint)) uiType = 'loki-metrics';
        else if (/"events"\s*:\s*\[|timeline/.test(hint)) uiType = 'loki-timeline';
        else if (/"pros"\s*:\s*\[/.test(hint)) uiType = 'loki-proscons';
        else if (/"columns"\s*:\s*\[|kanban/.test(hint)) uiType = 'loki-kanban';
        else if (/"questions"\s*:\s*\[|quiz/.test(hint)) uiType = 'loki-quiz';
      }
    } else if (uiType && uiType !== 'mermaid' && uiType !== 'svg') {
      parsedData = repairPartialJson(rawCode);
    }

    if (uiType) {
      if (startIdx > cursor) {
        segments.push({ kind: 'text', text: src.slice(cursor, startIdx) });
      }
      const meta = UI_BLOCK_LABELS[uiType] || UI_BLOCK_LABELS['loki-' + uiType] || { icon: '✨', label: 'Interactive UI' };
      segments.push({
        kind: 'ui',
        uiType,
        rawCode,
        parsedData,
        isStreaming: !isClosed,
        icon: meta.icon,
        label: meta.label,
      });
      cursor = blockEnd;
      fenceOpenRe.lastIndex = blockEnd;
    } else {
      fenceOpenRe.lastIndex = blockEnd;
    }
  }

  if (cursor < src.length) {
    segments.push({ kind: 'text', text: src.slice(cursor) });
  }
  return segments;
}
