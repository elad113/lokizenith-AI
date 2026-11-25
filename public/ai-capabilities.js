/* ==========================================================================
   LOKIZENITH AI — INTERACTIVE AI CAPABILITIES SUITE
   1. Live Website / URL Intelligence Reader (/url) — Gemini urlContext
   2. Interactive 3D Flip Study Flashcards (/flashcards)
   3. Interactive Multi-Mode SVG Data Chart (/chart — Bar / Line / Donut)
   4. Weighted Decision Matrix & Pros/Cons Planner (/decide)
   Zero impact on normal chat latency or LokiCode!
   ========================================================================== */
(function () {
  'use strict';

  const CAPABILITIES = [
    {
      id: 'urlreader',
      cmd: '/url',
      icon: '🌐',
      name: 'Live URL Reader',
      nameHe: 'קורא אתרים וקישורים חי',
      desc: 'Read any live webpage URL and get TL;DR, key insights & Q&A',
      descHe: 'קורא כל קישור ואתר חי ומפיק סיכום, נקודות מפתח ותובנות',
      placeholderHe: '/url https://example.com מה הנקודות העיקריות בעמוד הזה?',
      placeholderEn: '/url https://example.com Summarize the main takeaways',
      both: true,
    },
    {
      id: 'flashcards',
      cmd: '/flashcards',
      icon: '🃏',
      name: 'Interactive Flashcards',
      nameHe: 'כרטיסיות למידה אינטראקטיביות',
      desc: 'Generate a 3D flip study deck with mastery tracking on any topic',
      descHe: 'יוצר חפיסת כרטיסיות לימוד מתהפכות עם מעקב שליטה על כל נושא',
      placeholderHe: '/flashcards מערכת השמש / ביולוגיה / אנגלית עסקית',
      placeholderEn: '/flashcards Spanish essentials or World War II key dates',
      both: true,
    },
    {
      id: 'datachart',
      cmd: '/chart',
      icon: '📊',
      name: 'Interactive Data Chart',
      nameHe: 'גרף נתונים אינטראקטיבי',
      desc: 'Turn any topic or numbers into Bar, Line & Donut charts + CSV/SVG',
      descHe: 'הופך כל נושא או מספרים לגרף עמודות, קו או עוגה עם ייצוא CSV/SVG',
      placeholderHe: '/chart השוואת מכירות רבעוניות או 5 המדינות הגדולות בעולם',
      placeholderEn: '/chart Top 6 programming languages by popularity 2026',
      both: true,
    },
    {
      id: 'decision',
      cmd: '/decide',
      icon: '⚖️',
      name: 'Decision Matrix',
      nameHe: 'מטריצת החלטות חכמה',
      desc: 'Compare options with live importance sliders, pros/cons & winner',
      descHe: 'השוואת אפשרויות עם סליידרים חיים למשקל הקריטריונים והמלצה',
      placeholderHe: '/decide מקבוק פרו מול Dell XPS מול ThinkPad ללימודים ותכנות',
      placeholderEn: '/decide MacBook Pro vs ThinkPad vs Dell XPS for coding',
      both: true,
    },
  ];

  const CHART_PALETTE = ['#38bdf8', '#f59e0b', '#fb7185', '#a78bfa', '#34d399', '#fb923c', '#60a5fa', '#e879f9'];

  function isHeb(s) {
    return (String(s || '').match(/[\u0590-\u05FF]/g) || []).length >= 2;
  }

  function esc(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function extractJsonBlock(raw) {
    const str = String(raw || '').trim();
    const fenced = str.match(/```(?:json)?\s*([\s\S]*?)```/i);
    const candidate = fenced ? fenced[1].trim() : str;
    const start = candidate.indexOf('{');
    const end = candidate.lastIndexOf('}');
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(candidate.slice(start, end + 1));
      } catch (_) {}
    }
    return null;
  }

  function detectCommand(text) {
    const raw = String(text || '').trim();
    if (!raw) return null;

    if (/^\/(url|read|site|webpage|קרא|קישור)\b/i.test(raw)) {
      const arg = raw.replace(/^\/(url|read|site|webpage|קרא|קישור)\s*/i, '').trim();
      return { id: 'urlreader', arg };
    }
    if (/^\/(flashcards?|cards?|study|כרטיסיות)\b/i.test(raw)) {
      const arg = raw.replace(/^\/(flashcards?|cards?|study|כרטיסיות)\s*/i, '').trim();
      return { id: 'flashcards', arg };
    }
    if (/(?:תכין|צור|תיצור|תעשה|תן|בנה)\s+(?:לי\s+)?כרטיסיות(?:\s+לימוד|\s+למידה|\s+זיכרון)?|(?:make|create|generate|build)\s+(?:me\s+)?(?:study\s+)?flashcards?\b/i.test(raw) && raw.length < 220) {
      const arg = raw
        .replace(/^(?:בבקשה\s+)?(?:תכין|צור|תיצור|תעשה|תן|בנה)\s+(?:לי\s+)?כרטיסיות(?:\s+לימוד|\s+למידה|\s+זיכרון)?\s*(?:על|בנושא|לגבי)?\s*/i, '')
        .replace(/^(?:please\s+)?(?:can\s+you\s+)?(?:make|create|generate|build)\s+(?:me\s+)?(?:study\s+)?flashcards?\s*(?:about|on|for)?\s*/i, '')
        .trim();
      return { id: 'flashcards', arg };
    }
    if (/^\/(chart|datachart|graph|plot|גרף|תרשים)\b/i.test(raw)) {
      const arg = raw.replace(/^\/(chart|datachart|graph|plot|גרף|תרשים)\s*/i, '').trim();
      return { id: 'datachart', arg };
    }
    if (/^\/(decide|decision|proscons|compare|החלטה|מטריצה)\b/i.test(raw)) {
      const arg = raw.replace(/^\/(decide|decision|proscons|compare|החלטה|מטריצה)\s*/i, '').trim();
      return { id: 'decision', arg };
    }

    // Auto-trigger ONLY when user explicitly pastes a URL with a read/summarize/analyze intent
    const urlMatch = raw.match(/https?:\/\/[^\s<>()]+/i);
    if (
      urlMatch &&
      /(?:סכם|תסכם|קרא|תקרא|נתח|תנתח|בדוק|תבדוק|מה\s+כתוב|הסבר|תסביר|\bsummariz|\banalyz|\bread\b|\bexplain\b|\btl;?dr\b|\bkey\s+points|\bwhat\s+is\s+on)/i.test(
        raw,
      )
    ) {
      return { id: 'urlreader', arg: raw };
    }
    return null;
  }

  function resolveStudyContextFromConv(rawArg, opts) {
    const clean = String(rawArg || '').replace(/^(?:על|בנושא|לגבי|about|on|for)\s+/i, '').replace(/[?.!،,\s]+$/g, '').trim();
    const isRef = !clean || clean.length < 2 || /^(?:זה|הזה|החומר(?:\s+הזה)?|הנושא(?:\s+הזה)?|מה\s+ש(?:למדנו|דיברנו|הסברת)(?:\s+עכשיו|\s+עליו)?|החומר\s+שלמדנו(?:\s+עכשיו)?|this|that|it|this\s+topic|this\s+material|the\s+material(?:\s+we\s+just\s+learned)?|what\s+we\s+(?:just\s+)?learned)$/i.test(clean);
    const msgs = (opts && opts.conv && Array.isArray(opts.conv.messages)) ? opts.conv.messages : [];
    const curId = opts && opts.um && opts.um.id;
    const prior = msgs.filter((m) => m && !m.pending && m.id !== curId && m.content && String(m.content).trim());
    const recentBot = [...prior].reverse().filter((m) => m.role === 'assistant' && String(m.content || '').trim().length > 40).slice(0, 2);
    const recentUser = [...prior].reverse().filter((m) => m.role === 'user' && !/^\/(flashcards|test|quiz)/i.test(String(m.content || ''))).slice(0, 3);

    let topic = clean;
    let contextBlock = '';
    if (isRef) {
      if (recentUser.length > 0) {
        topic = String(recentUser[0].content || '')
          .replace(/^(?:בבקשה\s+)?(?:תלמד|למד|תסביר|הסבר|סכם|תסכם|תעזור\s+לי\s+ללמוד)\s*(?:אותי\s+|לי\s+)?(?:על\s+|את\s+|בנושא\s+|ב-?)?/i, '')
          .replace(/^(?:please\s+)?(?:teach\s+me|explain|summarize)\s*(?:about\s+|on\s+)?/i, '')
          .trim()
          .slice(0, 110);
      }
      if ((!topic || topic.length < 2) && recentBot.length > 0) {
        const hm = String(recentBot[0].content || '').match(/^#{1,3}\s+([^\n#*]{3,80})/m) || String(recentBot[0].content || '').match(/\*\*([^*]{3,70})\*\*/);
        topic = hm && hm[1] ? hm[1].trim() : String(recentBot[0].content || '').replace(/\s+/g, ' ').trim().slice(0, 75);
      }
    }
    if ((isRef || recentBot.length > 0) && recentBot.length > 0) {
      contextBlock = recentBot.map((m) => String(m.content || '').slice(0, 2200)).join('\n---\n');
    }
    return { topic: topic || clean, contextBlock };
  }

  async function runCapability(capId, argText, opts) {
    const rawArg = String(argText || '').trim();
    const resolvedStudy = resolveStudyContextFromConv(rawArg, opts);
    const lang = isHeb(rawArg || resolvedStudy.topic || resolvedStudy.contextBlock) || (window.S && window.S.lang === 'he' && !/[a-zA-Z]{6,}/.test(rawArg)) ? 'he' : 'en';
    const isHe = lang === 'he';
    const signal = opts && opts.signal;

    if (capId === 'urlreader') {
      const urlMatch = rawArg.match(/https?:\/\/[^\s<>()]+/i);
      const url = urlMatch ? urlMatch[0].replace(/[),.;]+$/, '') : '';
      if (!url) {
        return {
          content: isHe
            ? '🌐 כדי לקרוא אתר חי, שלח `/url` ואחריו קישור מלא (לדוגמה: `/url https://en.wikipedia.org/wiki/Chess מה העיקר כאן?`).'
            : '🌐 To read a live webpage, send `/url` followed by a full link (for example: `/url https://example.com summarize the key points`).',
        };
      }
      const question = rawArg.replace(urlMatch[0], '').trim();
      const resp = await fetch('/api/ai/url-analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, question, lang }),
        signal,
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok || !data.ok) {
        throw new Error(data.error || (isHe ? 'לא הצלחתי לקרוא את הקישור.' : 'Could not analyze that URL.'));
      }
      return {
        content: isHe
          ? `🌐 ניתחתי עבורך את העמוד **${data.title || data.domain}** בזמן אמת:`
          : `🌐 Analyzed **${data.title || data.domain}** live for you:`,
        capabilityCard: { type: 'urlreader', lang, data },
      };
    }

    if (capId === 'flashcards') {
      const topic = resolvedStudy.topic || (isHe ? 'עובדות מרתקות במדע וטכנולוגיה' : 'Core computer science concepts');
      const ctxPrompt = resolvedStudy.contextBlock
        ? `\nBase the flashcards directly on the material taught in this conversation:\n${resolvedStudy.contextBlock}\n`
        : '';
      const sys = `You create crisp, high-value study flashcards. Return STRICT JSON ONLY (no markdown prose outside JSON):
{
  "title": "Deck title in ${isHe ? 'Hebrew' : 'English'}",
  "subtitle": "Short 1-line description",
  "cards": [
    { "front": "Clear question, verse/concept, or term", "back": "Concise accurate answer/explanation (1-2 sentences)", "hint": "Optional 4-word memory cue" }
  ]
}
${ctxPrompt}Generate 8 cards about "${topic}". Write everything in ${isHe ? 'natural Hebrew' : 'English'}.`;
      const out = await window.LZ.chat(
        [
          { role: 'system', content: sys },
          { role: 'user', content: `Create a study flashcard deck about: ${topic}` },
        ],
        { tier: 'fera', level: 'fast', maxTokens: 1400, signal },
      );
      const parsed = extractJsonBlock(out);
      if (!parsed || !Array.isArray(parsed.cards) || !parsed.cards.length) {
        return { content: out };
      }
      return {
        content: isHe
          ? `🃏 הכנתי לך חפיסת **${parsed.cards.length} כרטיסיות לימוד** על **${parsed.title || topic}** — לחץ על כל כרטיסייה להפוך אותה!`
          : `🃏 Built an interactive **${parsed.cards.length}-card study deck** for **${parsed.title || topic}** — tap any card to flip!`,
        capabilityCard: { type: 'flashcards', lang, data: parsed },
      };
    }

    if (capId === 'datachart') {
      const topic = rawArg || (isHe ? '5 שפות התכנות הפופולריות ביותר' : 'Top 6 programming languages popularity');
      const sys = `You generate clean numeric datasets for interactive charts. Return STRICT JSON ONLY:
{
  "title": "Chart title in ${isHe ? 'Hebrew' : 'English'}",
  "unit": "Short unit label (e.g. %, USD, M, pts)",
  "defaultMode": "bar",
  "summary": "1-sentence key insight from the numbers",
  "items": [
    { "label": "Short label (max 18 chars)", "value": 42 }
  ]
}
Use 5 to 8 accurate, realistic numeric data points (positive numbers). Write labels and insight in ${isHe ? 'Hebrew' : 'English'}.`;
      const out = await window.LZ.chat(
        [
          { role: 'system', content: sys },
          { role: 'user', content: `Create a chart dataset for: ${topic}` },
        ],
        { tier: 'fera', level: 'fast', maxTokens: 1100, signal },
      );
      const parsed = extractJsonBlock(out);
      if (!parsed || !Array.isArray(parsed.items) || parsed.items.length < 2) {
        return { content: out };
      }
      parsed.items = parsed.items
        .map((it) => ({ label: String(it.label || '').slice(0, 22), value: Number(it.value) || 0 }))
        .filter((it) => it.label && Number.isFinite(it.value));
      return {
        content: isHe
          ? `📊 יצרתי גרף אינטראקטיבי עבור **${parsed.title || topic}** — אפשר להחליף בין עמודות, קו ועוגה או לייצא CSV/SVG:`
          : `📊 Generated an interactive chart for **${parsed.title || topic}** — switch between Bar, Line & Donut or export CSV/SVG:`,
        capabilityCard: { type: 'datachart', lang, data: parsed },
      };
    }

    if (capId === 'decision') {
      const topic = rawArg || (isHe ? 'בחירת מחשב נייד ללימודים ועבודה' : 'Choosing the best laptop for work and study');
      const sys = `You build structured weighted decision matrices. Return STRICT JSON ONLY:
{
  "title": "Decision title in ${isHe ? 'Hebrew' : 'English'}",
  "verdict": "Short initial recommendation",
  "criteria": [
    { "name": "Criterion name", "weight": 8 }
  ],
  "options": [
    {
      "name": "Option name",
      "tagline": "Short 5-word summary",
      "scores": [8, 9, 7, 8],
      "pros": ["Pro 1", "Pro 2"],
      "cons": ["Con 1"]
    }
  ],
  "nextSteps": ["Actionable step 1", "Actionable step 2"]
}
Provide 4 criteria (weight 1-10) and 3 options (each scores array MUST have length equal to criteria length, values 1-10). Write in ${isHe ? 'Hebrew' : 'English'}.`;
      const out = await window.LZ.chat(
        [
          { role: 'system', content: sys },
          { role: 'user', content: `Build a weighted decision matrix for: ${topic}` },
        ],
        { tier: 'fera', level: 'fast', maxTokens: 1500, signal },
      );
      const parsed = extractJsonBlock(out);
      if (!parsed || !Array.isArray(parsed.options) || !Array.isArray(parsed.criteria) || !parsed.options.length) {
        return { content: out };
      }
      return {
        content: isHe
          ? `⚖️ בניתי עבורך **מטריצת החלטות אינטראקטיבית** — הזז את הסליידרים של הקריטריונים כדי לראות איזו אפשרות מנצחת לפי מה שחשוב לך:`
          : `⚖️ Built an **interactive decision matrix** — drag the criteria sliders to see which option wins for your priorities:`,
        capabilityCard: { type: 'decision', lang, data: parsed },
      };
    }

    return null;
  }

  /* ========================================================================
     INTERACTIVE CARD RENDERERS
     ======================================================================== */
  function renderUrlCard(data, isHe) {
    const el = document.createElement('div');
    el.className = 'lz-cap-card lz-url-card';
    el.setAttribute('dir', isHe ? 'rtl' : 'ltr');
    const kp = Array.isArray(data.keyPoints) ? data.keyPoints : [];
    const tk = Array.isArray(data.takeaways) ? data.takeaways : [];
    const fus = Array.isArray(data.followUps) ? data.followUps : [];

    el.innerHTML = `
      <div class="lz-cap-head">
        <div class="lz-cap-badge url">🌐 ${esc(data.domain || 'Live Web')}</div>
        <a class="lz-cap-ext" href="${esc(data.url || '#')}" target="_blank" rel="noopener noreferrer">${isHe ? 'פתח אתר ↗' : 'Open site ↗'}</a>
      </div>
      <h4 class="lz-cap-title">${esc(data.title || data.domain || 'Web Page Analysis')}</h4>
      ${data.tldr ? `<div class="lz-url-tldr"><b>${isHe ? 'שורה תחתונה:' : 'TL;DR:'}</b> ${esc(data.tldr)}</div>` : ''}
      ${data.answer ? `<p class="lz-url-answer">${esc(data.answer)}</p>` : ''}
      ${kp.length ? `<div class="lz-url-sec"><b>${isHe ? 'נקודות מפתח' : 'Key Points'}</b><ul>${kp.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${tk.length ? `<div class="lz-url-sec"><b>${isHe ? 'תובנות מעשיות' : 'Takeaways'}</b><ul>${tk.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
      ${fus.length ? `<div class="lz-url-fus">${fus.map((q) => `<button type="button" class="lz-cap-chip" data-q="${esc(q)}">💬 ${esc(q)}</button>`).join('')}</div>` : ''}
    `;

    el.querySelectorAll('.lz-cap-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        const q = btn.getAttribute('data-q');
        const ta = document.querySelector('#prompt');
        if (ta && q) {
          ta.value = `/url ${data.url} ${q}`;
          ta.dispatchEvent(new Event('input', { bubbles: true }));
          const sendBtn = document.querySelector('#sendBtn');
          if (sendBtn && !sendBtn.disabled) sendBtn.click();
        }
      });
    });
    return el;
  }

  function renderFlashcardsCard(data, isHe) {
    const cards = Array.isArray(data.cards) ? data.cards.slice() : [];
    let idx = 0;
    let flipped = false;
    const known = new Set();

    const wrap = document.createElement('div');
    wrap.className = 'lz-cap-card lz-fc-card';
    wrap.setAttribute('dir', isHe ? 'rtl' : 'ltr');

    function draw() {
      const card = cards[idx] || { front: '', back: '' };
      const pct = Math.round((known.size / Math.max(1, cards.length)) * 100);
      wrap.innerHTML = `
        <div class="lz-cap-head">
          <div class="lz-cap-badge fc">🃏 ${esc(data.title || (isHe ? 'כרטיסיות לימוד' : 'Flashcards'))}</div>
          <span class="lz-fc-count">${idx + 1} / ${cards.length} · ${isHe ? 'שליטה' : 'Mastered'} ${pct}%</span>
        </div>
        <div class="lz-fc-progress"><div class="lz-fc-fill" style="width:${pct}%"></div></div>
        <button type="button" class="lz-fc-stage${flipped ? ' flipped' : ''}" aria-label="${isHe ? 'הפוך כרטיסייה' : 'Flip card'}">
          <div class="lz-fc-face front">
            <span class="lz-fc-side-tag">${isHe ? 'שאלה · לחץ להפיכה' : 'Question · Tap to flip'}</span>
            <div class="lz-fc-text">${esc(card.front)}</div>
            ${card.hint ? `<small class="lz-fc-hint">💡 ${esc(card.hint)}</small>` : ''}
          </div>
          <div class="lz-fc-face back">
            <span class="lz-fc-side-tag">${isHe ? 'תשובה' : 'Answer'}</span>
            <div class="lz-fc-text">${esc(card.back)}</div>
          </div>
        </button>
        <div class="lz-fc-actions">
          <button type="button" class="lz-cap-btn" data-act="prev">‹ ${isHe ? 'הקודם' : 'Prev'}</button>
          <button type="button" class="lz-cap-btn good" data-act="know">✓ ${isHe ? 'ידעתי!' : 'Got it'}</button>
          <button type="button" class="lz-cap-btn warn" data-act="review">↻ ${isHe ? 'לחזור שוב' : 'Review'}</button>
          <button type="button" class="lz-cap-btn" data-act="shuffle">🔀</button>
          <button type="button" class="lz-cap-btn" data-act="next">${isHe ? 'הבא' : 'Next'} ›</button>
        </div>
      `;
      wrap.querySelector('.lz-fc-stage').addEventListener('click', () => {
        flipped = !flipped;
        draw();
      });
      wrap.querySelectorAll('.lz-cap-btn').forEach((b) => {
        b.addEventListener('click', () => {
          const a = b.getAttribute('data-act');
          if (a === 'prev') { idx = (idx - 1 + cards.length) % cards.length; flipped = false; }
          else if (a === 'next') { idx = (idx + 1) % cards.length; flipped = false; }
          else if (a === 'know') { known.add(idx); idx = (idx + 1) % cards.length; flipped = false; }
          else if (a === 'review') { known.delete(idx); idx = (idx + 1) % cards.length; flipped = false; }
          else if (a === 'shuffle') {
            for (let i = cards.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [cards[i], cards[j]] = [cards[j], cards[i]];
            }
            known.clear();
            idx = 0;
            flipped = false;
          }
          draw();
        });
      });
    }
    draw();
    return wrap;
  }

  function renderChartCard(data, isHe) {
    const items = Array.isArray(data.items) ? data.items : [];
    const unit = data.unit || '';
    let mode = ['bar', 'line', 'donut'].includes(data.defaultMode) ? data.defaultMode : 'bar';
    const maxVal = Math.max(1, ...items.map((x) => Math.abs(x.value)));
    const totalVal = Math.max(0.0001, items.reduce((a, b) => a + Math.max(0, b.value), 0));

    const wrap = document.createElement('div');
    wrap.className = 'lz-cap-card lz-chart-card';
    wrap.setAttribute('dir', isHe ? 'rtl' : 'ltr');

    function buildSvg() {
      const W = 520, H = 230;
      if (mode === 'bar') {
        const padL = 36, padR = 16, padT = 22, padB = 46;
        const plotW = W - padL - padR, plotH = H - padT - padB;
        const gap = 12;
        const barW = Math.max(18, (plotW - gap * (items.length - 1)) / Math.max(1, items.length));
        const bars = items.map((it, i) => {
          const bh = Math.max(6, (Math.max(0, it.value) / maxVal) * plotH);
          const x = padL + i * (barW + gap);
          const y = padT + (plotH - bh);
          const col = CHART_PALETTE[i % CHART_PALETTE.length];
          return `
            <g class="lz-ch-bar-g">
              <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" rx="6" fill="${col}" opacity="0.92">
                <title>${esc(it.label)}: ${it.value}${unit ? ' ' + esc(unit) : ''}</title>
              </rect>
              <text x="${(x + barW / 2).toFixed(1)}" y="${(y - 6).toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">${it.value}${esc(unit)}</text>
              <text x="${(x + barW / 2).toFixed(1)}" y="${(H - 14).toFixed(1)}" text-anchor="middle" fill="#94a3b8" font-size="10.5">${esc(it.label.slice(0, 12))}</text>
            </g>`;
        }).join('');
        return `<svg viewBox="0 0 ${W} ${H}" class="lz-svg-chart" role="img" aria-label="${esc(data.title || 'Chart')}">
          <line x1="${padL}" y1="${padT + plotH}" x2="${W - padR}" y2="${padT + plotH}" stroke="rgba(148,163,184,0.28)" stroke-width="1"/>
          ${bars}
        </svg>`;
      }
      if (mode === 'line') {
        const padL = 40, padR = 24, padT = 24, padB = 44;
        const plotW = W - padL - padR, plotH = H - padT - padB;
        const pts = items.map((it, i) => {
          const x = padL + (items.length <= 1 ? plotW / 2 : (i / (items.length - 1)) * plotW);
          const y = padT + plotH - (Math.max(0, it.value) / maxVal) * plotH;
          return { x, y, it, col: CHART_PALETTE[i % CHART_PALETTE.length] };
        });
        const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
        const area = `${padL},${padT + plotH} ${poly} ${pts[pts.length - 1].x.toFixed(1)},${padT + plotH}`;
        return `<svg viewBox="0 0 ${W} ${H}" class="lz-svg-chart" role="img" aria-label="${esc(data.title || 'Line Chart')}">
          <defs><linearGradient id="lzLineFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#38bdf8" stop-opacity="0.34"/><stop offset="100%" stop-color="#38bdf8" stop-opacity="0.02"/></linearGradient></defs>
          <polygon points="${area}" fill="url(#lzLineFill)"/>
          <polyline points="${poly}" fill="none" stroke="#38bdf8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
          ${pts.map((p) => `
            <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5.5" fill="${p.col}" stroke="#0f172a" stroke-width="2"><title>${esc(p.it.label)}: ${p.it.value}${esc(unit)}</title></circle>
            <text x="${p.x.toFixed(1)}" y="${(p.y - 10).toFixed(1)}" text-anchor="middle" fill="#e2e8f0" font-size="11" font-weight="700">${p.it.value}${esc(unit)}</text>
            <text x="${p.x.toFixed(1)}" y="${(H - 14).toFixed(1)}" text-anchor="middle" fill="#94a3b8" font-size="10.5">${esc(p.it.label.slice(0, 12))}</text>
          `).join('')}
        </svg>`;
      }
      // Donut
      const cx = 140, cy = 115, r = 74, sw = 28;
      const circ = 2 * Math.PI * r;
      let offset = 0;
      const slices = items.map((it, i) => {
        const frac = Math.max(0, it.value) / totalVal;
        const len = frac * circ;
        const col = CHART_PALETTE[i % CHART_PALETTE.length];
        const seg = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${col}" stroke-width="${sw}" stroke-dasharray="${len.toFixed(2)} ${(circ - len).toFixed(2)}" stroke-dashoffset="${(-offset).toFixed(2)}" transform="rotate(-90 ${cx} ${cy})"><title>${esc(it.label)}: ${it.value}${esc(unit)} (${Math.round(frac * 100)}%)</title></circle>`;
        offset += len;
        return seg;
      }).join('');
      const legend = items.map((it, i) => {
        const pct = Math.round((Math.max(0, it.value) / totalVal) * 100);
        const y = 32 + i * 24;
        return `<rect x="260" y="${y - 9}" width="11" height="11" rx="3" fill="${CHART_PALETTE[i % CHART_PALETTE.length]}"/><text x="278" y="${y}" fill="#e2e8f0" font-size="11.5" font-weight="600">${esc(it.label.slice(0, 18))} — ${it.value}${esc(unit)} (${pct}%)</text>`;
      }).join('');
      return `<svg viewBox="0 0 ${W} ${H}" class="lz-svg-chart" role="img" aria-label="${esc(data.title || 'Donut Chart')}">
        ${slices}
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" fill="#f8fafc" font-size="15" font-weight="800">${Math.round(totalVal * 10) / 10}${esc(unit)}</text>
        ${legend}
      </svg>`;
    }

    function draw() {
      wrap.innerHTML = `
        <div class="lz-cap-head">
          <div class="lz-cap-badge ch">📊 ${esc(data.title || (isHe ? 'גרף נתונים' : 'Data Chart'))}</div>
          <div class="lz-ch-modes">
            <button type="button" class="lz-cap-btn${mode === 'bar' ? ' on' : ''}" data-m="bar">${isHe ? 'עמודות' : 'Bar'}</button>
            <button type="button" class="lz-cap-btn${mode === 'line' ? ' on' : ''}" data-m="line">${isHe ? 'קו' : 'Line'}</button>
            <button type="button" class="lz-cap-btn${mode === 'donut' ? ' on' : ''}" data-m="donut">${isHe ? 'עוגה' : 'Donut'}</button>
            <button type="button" class="lz-cap-btn" data-exp="csv">⬇ CSV</button>
          </div>
        </div>
        <div class="lz-ch-stage" dir="ltr">${buildSvg()}</div>
        ${data.summary ? `<p class="lz-cap-summary">💡 ${esc(data.summary)}</p>` : ''}
      `;
      wrap.querySelectorAll('[data-m]').forEach((b) => {
        b.addEventListener('click', () => { mode = b.getAttribute('data-m'); draw(); });
      });
      const expBtn = wrap.querySelector('[data-exp="csv"]');
      if (expBtn) {
        expBtn.addEventListener('click', () => {
          const csv = 'Label,Value\n' + items.map((x) => `"${String(x.label).replace(/"/g, '""')}",${x.value}`).join('\n');
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
          const a = document.createElement('a');
          a.href = URL.createObjectURL(blob);
          a.download = 'lokizenith-chart.csv';
          a.click();
          setTimeout(() => URL.revokeObjectURL(a.href), 2000);
        });
      }
    }
    draw();
    return wrap;
  }

  function renderDecisionCard(data, isHe) {
    const criteria = (Array.isArray(data.criteria) ? data.criteria : []).map((c) => ({
      name: String(c.name || ''),
      weight: Math.max(1, Math.min(10, Number(c.weight) || 5)),
    }));
    const options = Array.isArray(data.options) ? data.options : [];
    const nextSteps = Array.isArray(data.nextSteps) ? data.nextSteps : [];

    const wrap = document.createElement('div');
    wrap.className = 'lz-cap-card lz-dec-card';
    wrap.setAttribute('dir', isHe ? 'rtl' : 'ltr');

    function computeScores() {
      const totalW = Math.max(1, criteria.reduce((s, c) => s + c.weight, 0));
      return options
        .map((opt) => {
          let sum = 0;
          criteria.forEach((c, i) => {
            const sc = Number((opt.scores || [])[i]) || 5;
            sum += sc * c.weight;
          });
          return { opt, pct: Math.round((sum / (totalW * 10)) * 100) };
        })
        .sort((a, b) => b.pct - a.pct);
    }

    function draw() {
      const ranked = computeScores();
      const winner = ranked[0];
      wrap.innerHTML = `
        <div class="lz-cap-head">
          <div class="lz-cap-badge dec">⚖️ ${esc(data.title || (isHe ? 'מטריצת החלטות' : 'Decision Matrix'))}</div>
          ${winner ? `<span class="lz-dec-win-tag">🏆 ${esc(winner.opt.name)} (${winner.pct}%)</span>` : ''}
        </div>
        <div class="lz-dec-sliders">
          <small class="lz-dec-lbl">${isHe ? 'התאם את חשיבות כל קריטריון (1–10) והתוצאה תתעדכן מיד:' : 'Adjust criteria importance (1–10) to recalculate live:'}</small>
          ${criteria
            .map(
              (c, i) => `
            <label class="lz-dec-srow">
              <span>${esc(c.name)}</span>
              <input type="range" min="1" max="10" value="${c.weight}" data-ci="${i}">
              <b>${c.weight}</b>
            </label>`,
            )
            .join('')}
        </div>
        <div class="lz-dec-opts">
          ${ranked
            .map(
              (r, idx) => `
            <div class="lz-dec-opt${idx === 0 ? ' winner' : ''}">
              <div class="lz-dec-opt-top">
                <b>${idx === 0 ? '🏆 ' : ''}${esc(r.opt.name)}</b>
                <span class="lz-dec-score">${r.pct}%</span>
              </div>
              <div class="lz-dec-bar"><div class="lz-dec-bar-fill" style="width:${r.pct}%"></div></div>
              ${r.opt.tagline ? `<small class="lz-dec-tag">${esc(r.opt.tagline)}</small>` : ''}
              <div class="lz-dec-pc">
                ${(r.opt.pros || []).slice(0, 2).map((p) => `<span class="pro">+ ${esc(p)}</span>`).join('')}
                ${(r.opt.cons || []).slice(0, 1).map((cn) => `<span class="con">− ${esc(cn)}</span>`).join('')}
              </div>
            </div>`,
            )
            .join('')}
        </div>
        ${nextSteps.length ? `<div class="lz-dec-steps"><b>${isHe ? 'צעדים מומלצים:' : 'Next Steps:'}</b>${nextSteps.map((s) => `<label><input type="checkbox"> <span>${esc(s)}</span></label>`).join('')}</div>` : ''}
      `;
      wrap.querySelectorAll('input[type="range"]').forEach((rng) => {
        rng.addEventListener('input', (e) => {
          const ci = Number(e.target.getAttribute('data-ci'));
          criteria[ci].weight = Number(e.target.value) || 5;
          draw();
        });
      });
    }
    draw();
    return wrap;
  }

  function renderCapabilityCard(card) {
    if (!card || !card.data) return null;
    const isHe = card.lang === 'he' || (window.S && window.S.lang === 'he');
    if (card.type === 'urlreader') return renderUrlCard(card.data, isHe);
    if (card.type === 'flashcards') return renderFlashcardsCard(card.data, isHe);
    if (card.type === 'datachart') return renderChartCard(card.data, isHe);
    if (card.type === 'decision') return renderDecisionCard(card.data, isHe);
    return null;
  }

  function primeComposer(capId) {
    const cap = CAPABILITIES.find((c) => c.id === capId);
    if (!cap) return;
    const ta = document.querySelector('#prompt');
    if (!ta) return;
    const isHe = (window.S && window.S.lang === 'he') || document.documentElement.dir === 'rtl';
    ta.value = cap.cmd + ' ';
    ta.placeholder = isHe ? cap.placeholderHe : cap.placeholderEn;
    ta.focus();
    ta.dispatchEvent(new Event('input', { bubbles: true }));
  }

  window.LZCapabilities = {
    CAPABILITIES,
    detectCommand,
    runCapability,
    renderCapabilityCard,
    primeComposer,
  };
})();
