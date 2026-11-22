/* Lokizenith AI — Live Progressive UI Builder & Partial-JSON Stream Engine
   Ensures AI-generated interactive UI (Comparison Cards, Calculators, Scorecards,
   Charts, Mind Maps, Tabs, Timelines, Tables, HTML mini-apps) renders LIVE while
   typing AND in final messages — never flashing raw JSON or HTML code. */
(function(){
  'use strict';

  const KNOWN_UI_LANGS = new Set([
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
    'mermaid', 'svg', 'loki-html', 'html-widget'
  ]);

  const UI_META = {
    'loki-compare': { icon: '⚖️', label: 'Comparison Cards' },
    'compare': { icon: '⚖️', label: 'Comparison Cards' },
    'comparison': { icon: '⚖️', label: 'Comparison Cards' },
    'loki-verdict': { icon: '🏆', label: 'Executive Scorecard' },
    'scorecard': { icon: '🏆', label: 'Executive Scorecard' },
    'rating': { icon: '🏆', label: 'Rating Scorecard' },
    'review': { icon: '🏆', label: 'Review Scorecard' },
    'loki-calc': { icon: '🧮', label: 'Live Calculator' },
    'calculator': { icon: '🧮', label: 'Live Calculator' },
    'calc': { icon: '🧮', label: 'Live Calculator' },
    'loki-progress': { icon: '📶', label: 'Visual Breakdown' },
    'bars': { icon: '📶', label: 'Visual Breakdown' },
    'progress': { icon: '📶', label: 'Visual Breakdown' },
    'loki-tree': { icon: '🌿', label: 'Concept Mind Map' },
    'mindmap': { icon: '🌿', label: 'Concept Mind Map' },
    'tree': { icon: '🌿', label: 'Concept Mind Map' },
    'loki-tabs': { icon: '🗂️', label: 'Interactive Tabs' },
    'tabs': { icon: '🗂️', label: 'Interactive Tabs' },
    'loki-chart': { icon: '📈', label: 'Interactive Chart' },
    'chart': { icon: '📈', label: 'Interactive Chart' },
    'loki-metrics': { icon: '📊', label: 'KPI Metrics' },
    'metrics': { icon: '📊', label: 'KPI Metrics' },
    'loki-proscons': { icon: '⚖️', label: 'Pros & Cons Matrix' },
    'proscons': { icon: '⚖️', label: 'Pros & Cons Matrix' },
    'loki-timeline': { icon: '🗓️', label: 'Interactive Timeline' },
    'timeline': { icon: '🗓️', label: 'Interactive Timeline' },
    'loki-steps': { icon: '✅', label: 'Interactive Checklist' },
    'checklist': { icon: '✅', label: 'Interactive Checklist' },
    'steps': { icon: '✅', label: 'Interactive Checklist' },
    'loki-cards': { icon: '🃏', label: '3D Flashcards' },
    'flashcards': { icon: '🃏', label: '3D Flashcards' },
    'loki-callout': { icon: '💡', label: 'Key Insight' },
    'insight': { icon: '💡', label: 'Key Insight' },
    'loki-kanban': { icon: '📋', label: 'Kanban Board' },
    'kanban': { icon: '📋', label: 'Kanban Board' },
    'loki-quiz': { icon: '🎯', label: 'Interactive Quiz' },
    'quiz': { icon: '🎯', label: 'Interactive Quiz' },
    'loki-table': { icon: '📑', label: 'Interactive Table' },
    'datatable': { icon: '📑', label: 'Interactive Table' },
    'table': { icon: '📑', label: 'Interactive Table' },
    'loki-swot': { icon: '🧭', label: 'SWOT Analysis' },
    'swot': { icon: '🧭', label: 'SWOT Analysis' },
    'loki-accordion': { icon: '❓', label: 'Interactive FAQ' },
    'faq': { icon: '❓', label: 'Interactive FAQ' },
    'loki-decision': { icon: '⚖️', label: 'Decision Matrix' },
    'decision': { icon: '⚖️', label: 'Decision Matrix' },
    'loki-architecture': { icon: '🏗️', label: 'Architecture Flow' },
    'loki-audio': { icon: '🎹', label: 'Interactive Synth' },
    'loki-html': { icon: '✨', label: 'Interactive UI App' },
    'html-widget': { icon: '✨', label: 'Interactive UI App' },
    'svg': { icon: '✏️', label: 'Vector Graphic' },
    'mermaid': { icon: '🔗', label: 'Interactive Diagram' }
  };

  function repairPartialJson(raw){
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

    try { return JSON.parse(s); } catch(_){}
    try { return JSON.parse(s.replace(/,\s*([}\]])/g, '$1')); } catch(_){}

    let inString = false, escaped = false;
    const stack = [];
    let clean = '';
    for (let i = 0; i < s.length; i++){
      const ch = s[i];
      if (inString){
        if (escaped){ clean += ch; escaped = false; }
        else if (ch === '\\'){ clean += ch; escaped = true; }
        else if (ch === '"'){ clean += ch; inString = false; }
        else if (ch === '\n' || ch === '\r'){ clean += '\\n'; }
        else { clean += ch; }
        continue;
      }
      if (ch === '"'){ inString = true; clean += ch; }
      else if (ch === '{'){ stack.push('}'); clean += ch; }
      else if (ch === '['){ stack.push(']'); clean += ch; }
      else if (ch === '}' || ch === ']'){
        if (stack.length && stack[stack.length - 1] === ch){ stack.pop(); clean += ch; }
      } else { clean += ch; }
    }
    if (inString){
      if (escaped) clean = clean.slice(0, -1);
      clean += '"';
    }

    const tryClose = (candidate) => {
      let trimmed = candidate.trimEnd();
      for (let g = 0; g < 12; g++){
        const prev = trimmed;
        trimmed = trimmed.replace(/,\s*$/, '');
        trimmed = trimmed.replace(/([{,]\s*"(?:[^"\\]|\\.)*"\s*:\s*)$/, m => m.startsWith('{') ? '{' : '');
        trimmed = trimmed.replace(/([{,]\s*"(?:[^"\\]|\\.)*"\s*:\s*(?:t|tr|tru|f|fa|fal|fals|n|nu|nul|-|\d+\.|\d+[eE][+-]?)\s*)$/, m => m.startsWith('{') ? '{' : '');
        if (stack.length && stack[stack.length - 1] === '}'){
          trimmed = trimmed.replace(/([{,]\s*"(?:[^"\\]|\\.)*"\s*)$/, m => m.startsWith('{') ? '{' : '');
        }
        trimmed = trimmed.replace(/,\s*$/, '');
        if (trimmed === prev) break;
      }
      let inStr = false, esc = false;
      const needed = [];
      for (let i = 0; i < trimmed.length; i++){
        const c = trimmed[i];
        if (inStr){
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
      try { return JSON.parse(closed); } catch(_){ return null; }
    };

    const first = tryClose(clean);
    if (first !== null) return first;

    for (let cut = clean.length - 1; cut > 2; cut--){
      const ch = clean[cut];
      if (ch === ',' || ch === '}' || ch === ']'){
        const attempt = tryClose(clean.slice(0, cut + (ch === ',' ? 0 : 1)));
        if (attempt !== null) return attempt;
      }
    }
    return null;
  }

  function normalizeExplicitLang(lang){
    const l = String(lang || '').toLowerCase().trim().replace(/^ui[-:]/, 'loki-');
    if (!l) return null;
    if (KNOWN_UI_LANGS.has(l) || l.startsWith('loki-')) return l;
    return null;
  }

  function inferUiBlockFromData(data, hintText){
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    const hint = String(hintText || '').toLowerCase();

    const cmpItems = Array.isArray(data.items) ? data.items : (Array.isArray(data.options) ? data.options : null);
    if (cmpItems && cmpItems.length > 0 && cmpItems.some(it => it && typeof it === 'object' && (it.features || it.specs || it.tagline || it.recommended !== undefined || it.winner !== undefined || it.price))){
      return 'loki-compare';
    }
    if (/comparison\s*cards?|compare\s*cards?|כרטיסי\s*השוואה/i.test(hint) && (data.title || data.items || data.options)){
      return 'loki-compare';
    }
    if (Array.isArray(data.inputs) && (Array.isArray(data.outputs) || typeof data.formula === 'string')) return 'loki-calc';
    if (Array.isArray(data.inputs) && /calc|calculator|מחשבון/i.test(hint)) return 'loki-calc';
    if ((typeof data.score === 'number' || typeof data.rating === 'number') && (Array.isArray(data.dimensions) || Array.isArray(data.categories) || data.verdict || data.summary || data.bestFor || data.headline)) return 'loki-verdict';
    if (/scorecard|verdict|rating|ציון|דירוג/i.test(hint) && (data.score !== undefined || data.rating !== undefined || data.dimensions)) return 'loki-verdict';
    if ((data.root && typeof data.root === 'object') || (Array.isArray(data.nodes) && data.nodes.some(n => n && typeof n === 'object' && ('children' in n || 'label' in n)))) return 'loki-tree';
    if (Array.isArray(data.tabs) || Array.isArray(data.panels)) return 'loki-tabs';
    if (Array.isArray(data.labels) && (Array.isArray(data.datasets) || Array.isArray(data.data) || Array.isArray(data.values))) return 'loki-chart';
    if (Array.isArray(data.criteria) && Array.isArray(data.options)) return 'loki-decision';
    if (Array.isArray(data.pros) && Array.isArray(data.cons)) return 'loki-proscons';
    if (Array.isArray(data.strengths) && Array.isArray(data.weaknesses) && (Array.isArray(data.opportunities) || Array.isArray(data.threats))) return 'loki-swot';
    if (Array.isArray(data.events) || Array.isArray(data.milestones)) return 'loki-timeline';
    if (Array.isArray(data.columns) && data.columns.some(c => c && typeof c === 'object' && Array.isArray(c.items))) return 'loki-kanban';
    if (Array.isArray(data.questions) && data.questions.some(q => q && typeof q === 'object' && Array.isArray(q.options))) return 'loki-quiz';
    if (Array.isArray(data.cards) && data.cards.some(c => c && typeof c === 'object' && ('front' in c || 'back' in c))) return 'loki-cards';
    if (Array.isArray(data.items) && data.items.some(it => it && typeof it === 'object' && ('q' in it || 'question' in it) && ('a' in it || 'answer' in it))) return 'loki-accordion';
    if (Array.isArray(data.steps) || Array.isArray(data.tasks)) return 'loki-steps';
    if (Array.isArray(data.headers) && Array.isArray(data.rows)) return 'loki-table';
    if (Array.isArray(data.metrics) || (Array.isArray(data.items) && data.items.some(it => it && typeof it === 'object' && 'value' in it && ('delta' in it || 'change' in it)))) return 'loki-metrics';
    if (Array.isArray(data.bars) || (Array.isArray(data.items) && data.items.some(it => it && typeof it === 'object' && ('value' in it || 'score' in it) && ('label' in it || 'name' in it)))) return 'loki-progress';
    return null;
  }

  function looksLikeHtmlUi(code){
    const s = String(code || '');
    if (/<!doctype|<html[\s>]/i.test(s) && /<(script|style|div|button|canvas|input|section|main)[\s>]/i.test(s)) return true;
    if (/<(canvas|input|button|select|textarea)[\s>]/i.test(s) && /<(script|style)[\s>]/i.test(s)) return true;
    if (/\bon(?:click|input|change|submit)\s*=/i.test(s) && /<(button|input|form|canvas)[\s>]/i.test(s)) return true;
    return false;
  }

  function splitMarkdownWithLiveUi(markdown){
    const src = String(markdown || '');
    if (!src) return [];
    const segments = [];
    const fenceOpenRe = /```([^\n`]*)\n/g;
    let cursor = 0;
    let match;

    while ((match = fenceOpenRe.exec(src)) !== null){
      const startIdx = match.index;
      const rawLang = (match[1] || '').trim().split(/\s+/)[0].toLowerCase();
      const bodyStart = startIdx + match[0].length;
      const closeIdx = src.indexOf('\n```', bodyStart);
      const altCloseIdx = closeIdx < 0 ? src.indexOf('```', bodyStart) : closeIdx;
      const isClosed = altCloseIdx >= 0;
      const bodyEnd = isClosed ? altCloseIdx : src.length;
      const blockEnd = isClosed ? (altCloseIdx + (src.slice(altCloseIdx, altCloseIdx + 4) === '\n```' ? 4 : 3)) : src.length;
      const rawCode = src.slice(bodyStart, bodyEnd);
      const preceding = src.slice(Math.max(0, startIdx - 160), startIdx);

      let uiType = normalizeExplicitLang(rawLang);
      let parsedData = null;

      const isHtmlFence = uiType === 'loki-html' || uiType === 'html-widget' || rawLang === 'html';
      if (isHtmlFence){
        if (uiType === 'loki-html' || uiType === 'html-widget' || looksLikeHtmlUi(rawCode) || (!isClosed && /<!doctype|<html|<style|<div|<button|<canvas/i.test(rawCode))){
          uiType = 'loki-html';
        } else {
          uiType = null;
        }
      } else if (!uiType && (rawLang === '' || rawLang === 'json' || rawLang === 'jsonc' || rawLang === 'javascript' || rawLang === 'js')){
        parsedData = repairPartialJson(rawCode);
        if (parsedData){
          uiType = inferUiBlockFromData(parsedData, preceding);
        } else if (!isClosed && rawCode.trim().startsWith('{')){
          const hint = (preceding + '\n' + rawCode).toLowerCase();
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
      } else if (uiType && uiType !== 'mermaid' && uiType !== 'svg'){
        parsedData = repairPartialJson(rawCode);
      }

      if (uiType){
        if (startIdx > cursor) segments.push({ kind: 'text', text: src.slice(cursor, startIdx) });
        const meta = UI_META[uiType] || { icon: '✨', label: 'Interactive UI' };
        segments.push({
          kind: 'ui',
          uiType,
          rawCode,
          parsedData,
          isStreaming: !isClosed,
          icon: meta.icon,
          label: meta.label
        });
        cursor = blockEnd;
        fenceOpenRe.lastIndex = blockEnd;
      } else {
        fenceOpenRe.lastIndex = blockEnd;
      }
    }

    if (cursor < src.length) segments.push({ kind: 'text', text: src.slice(cursor) });
    return segments;
  }

  function buildSkeletonStage(icon, label, title){
    const wrap = document.createElement('div');
    wrap.className = 'lz-live-ui-skeleton';
    wrap.innerHTML = `
      <div class="lz-lui-skel-head">
        <span class="lz-lui-dot"></span>
        <span>${icon} ${title ? title : ('Assembling ' + label + '…')}</span>
      </div>
      <div class="lz-lui-skel-grid">
        <div class="lz-lui-skel-card"><i></i><b></b><span></span><span></span></div>
        <div class="lz-lui-skel-card"><i></i><b></b><span></span><span></span></div>
      </div>
    `;
    return wrap;
  }

  window.LZLiveUI = {
    repairPartialJson,
    normalizeExplicitLang,
    inferUiBlockFromData,
    looksLikeHtmlUi,
    splitMarkdownWithLiveUi,
    buildSkeletonStage,
    UI_META
  };
})();
