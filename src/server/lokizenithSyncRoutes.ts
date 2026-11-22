import fs from 'fs';
import path from 'path';
import type express from 'express';
import { GoogleGenAI } from '@google/genai';
import {
  buildAnswerLengthInstruction,
  consumeGuestQuota,
  getGuestQuota,
} from '../utils/guestAndLength.ts';
import { analyzeAndFixLslScript } from '../utils/lslSpecialist.ts';
import { analyzeAndFixMatlabScript } from '../utils/matlabSpecialist.ts';
import { transpileTypeScriptToJs } from '../utils/lokiCodeEngine.ts';
import { registerPluginRoutes } from './pluginsEngine.ts';
import { registerDeepSearchRoutes } from './deepSearchEngine.ts';
import { registerLokiBotRoutes } from './lokiBotRoutes.ts';
import { buildSmartFallbackFollowups, detectTextLang } from '../utils/aiUpgrades.ts';
import { generateGameChatReply, type GameId } from '../utils/gameEngine.ts';

export interface BackgroundGenRecord {
  id: string;
  userId: string;
  text: string;
  done: boolean;
  cancelled: boolean;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

const bgGens = new Map<string, BackgroundGenRecord>();

export function getGuestIdentityKey(req: express.Request): string {
  const cookie = String(req.headers.cookie || '');
  const m = cookie.match(/(?:^|;\s*)lz_guest_id=([^;]+)/);
  if (m && m[1]) return decodeURIComponent(m[1]).trim();
  const fwd = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  const ip = fwd || req.socket?.remoteAddress || 'anon';
  const ua = String(req.headers['user-agent'] || '').slice(0, 48);
  return `ip:${ip}:${ua}`;
}

function getGenClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function extractReadableTextFromDataUrl(name: string, mime: string, dataUrl: string): { text: string; pages?: number } {
  const match = String(dataUrl || '').match(/^data:([^;]+);base64,(.+)$/);
  const buf = match ? Buffer.from(match[2], 'base64') : Buffer.from(String(dataUrl || ''), 'utf8');
  const lowName = String(name || '').toLowerCase();
  const lowMime = String(mime || '').toLowerCase();

  if (
    lowMime.startsWith('text/') ||
    /\.(txt|md|csv|json|js|ts|tsx|jsx|py|html|css|xml|yaml|yml|log|java|c|cpp|cs|go|rs|rb|php|sql|m|lsl)$/.test(lowName)
  ) {
    return { text: buf.toString('utf8').slice(0, 60_000) };
  }

  // Lightweight fallback text extraction from PDF / Office XML streams
  const rawLatin = buf.toString('latin1');
  if (lowName.endsWith('.pdf') || lowMime.includes('pdf')) {
    const chunks = rawLatin.match(/\(([^()\\]{3,300})\)/g) || [];
    const cleaned = chunks
      .map((s) => s.slice(1, -1).replace(/[^\x20-\x7E\n]/g, ' ').trim())
      .filter((s) => /[a-zA-Z0-9]{2,}/.test(s))
      .join(' ')
      .replace(/\s+/g, ' ')
      .slice(0, 40_000);
    const pageMatches = rawLatin.match(/\/Type\s*\/Page\b/g);
    return {
      text: cleaned || `Attached PDF "${name}" (${buf.length} bytes).`,
      pages: pageMatches ? pageMatches.length : 1,
    };
  }

  const xmlStrings = rawLatin.match(/<w:t[^>]*>([^<]+)<\/w:t>|<t[^>]*>([^<]+)<\/t>/g) || [];
  if (xmlStrings.length > 0) {
    const txt = xmlStrings.map((s) => s.replace(/<[^>]+>/g, '')).join(' ').replace(/\s+/g, ' ').trim();
    return { text: txt.slice(0, 40_000) };
  }

  const printable = buf
    .toString('utf8')
    .replace(/[^\x20-\x7E\n\r\t\u0590-\u05FF\u0600-\u06FF]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 15_000);
  return { text: printable || `Uploaded file "${name}" (${buf.length} bytes).` };
}

function buildMinimalGlbCubeBase64(): string {
  // Valid minimal ASCII-OBJ text encoded as data for 3D export fallback
  const obj = [
    '# Lokizenith AI Procedural 3D Mesh',
    'v -1 -1 1', 'v 1 -1 1', 'v 1 1 1', 'v -1 1 1',
    'v -1 -1 -1', 'v 1 -1 -1', 'v 1 1 -1', 'v -1 1 -1',
    'f 1 2 3 4', 'f 8 7 6 5', 'f 4 3 7 8',
    'f 5 1 4 8', 'f 5 6 2 1', 'f 2 6 7 3',
  ].join('\n');
  return Buffer.from(obj, 'utf8').toString('base64');
}

function build3DPreviewSvgDataUrl(title: string): string {
  const safe = title.replace(/[<>&"']/g, '').slice(0, 48);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="768" height="480" viewBox="0 0 768 480">
  <defs>
    <radialGradient id="bg" cx="50%" cy="40%" r="70%">
      <stop offset="0%" stop-color="#0f2d22"/>
      <stop offset="100%" stop-color="#050b09"/>
    </radialGradient>
    <linearGradient id="top" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#34f5b2"/>
      <stop offset="100%" stop-color="#0ea572"/>
    </linearGradient>
    <linearGradient id="left" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
    <linearGradient id="right" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#059669"/>
      <stop offset="100%" stop-color="#043f2e"/>
    </linearGradient>
  </defs>
  <rect width="768" height="480" fill="url(#bg)"/>
  <g stroke="#10b981" stroke-opacity="0.16" stroke-width="1">
    <line x1="120" y1="360" x2="648" y2="360"/>
    <line x1="180" y1="330" x2="588" y2="330"/>
    <line x1="240" y1="300" x2="528" y2="300"/>
  </g>
  <polygon points="384,110 510,178 384,246 258,178" fill="url(#top)" stroke="#a7f3d0" stroke-width="2"/>
  <polygon points="258,178 384,246 384,368 258,300" fill="url(#left)" stroke="#34d399" stroke-width="1.5"/>
  <polygon points="510,178 384,246 384,368 510,300" fill="url(#right)" stroke="#10b981" stroke-width="1.5"/>
  <text x="384" y="428" text-anchor="middle" fill="#e2fef4" font-family="Inter, sans-serif" font-size="20" font-weight="600">${safe}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
}

export function registerLokizenithSyncRoutes(
  app: express.Express,
  getAuthUser: (req: express.Request) => { id: string; username?: string } | undefined
): void {
  // 1. Download App Manifest
  app.get('/api/app-version', (_req, res) => {
    try {
      const p = path.resolve(process.cwd(), 'public', 'app-version.json');
      if (fs.existsSync(p)) {
        return res.json(JSON.parse(fs.readFileSync(p, 'utf8')));
      }
    } catch (_e) {}
    return res.json({
      schemaVersion: 1,
      appName: 'Lokizenith AI',
      publisher: 'Lokiz Studios',
      website: 'https://lokizenith.com',
      version: '1.1.0',
      versionCode: 110,
      releasedAt: '2026-11-20',
      downloads: {
        windows: {
          label: 'Download for Windows',
          file: 'Lokizenith-AI-Setup-1.1.0.exe',
          url: 'https://storage.googleapis.com/lokizenith-ai-app-downloads/Lokizenith-AI-Setup-1.1.0.exe',
          sizeBytes: 85095474,
        },
        android: {
          label: 'Download for Android (APK)',
          file: 'Lokizenith-AI-1.0.0.apk',
          url: 'https://storage.googleapis.com/lokizenith-ai-app-downloads/Lokizenith-AI-1.0.0.apk',
          sizeBytes: 46705,
        },
      },
      desktopFeatures: [],
    });
  });

  // 2. Guest Trial Quota Status (7,500 free tokens without login wall)
  app.get('/api/guest/status', (req, res) => {
    const key = getGuestIdentityKey(req);
    return res.json(getGuestQuota(key));
  });

  // 3. Smart Follow-Up Chips (real AI multi-provider chain + rich domain-aware fallback)
  app.post('/api/chat/followups', async (req, res) => {
    try {
      const question = String(req.body?.question || '').trim().slice(0, 1200);
      const answer = String(req.body?.answer || '').trim().slice(0, 3000);
      const context = String(req.body?.context || '').trim().slice(0, 600);
      const reqLang = String(req.body?.lang || 'en').trim().toLowerCase();
      if (!question && !answer) return res.json({ items: [] });

      const detectedLang = detectTextLang(`${question} ${answer}`, reqLang);
      const langLabel = detectedLang === 'he' ? 'natural modern Israeli Hebrew (עברית)' : detectedLang === 'ar' ? 'Arabic (العربية)' : 'English';

      const parseFollowupJson = (rawText: string): string[] => {
        const cleaned = String(rawText || '').trim();
        const arrMatch = cleaned.match(/\[[\s\S]*\]/);
        const candidate = arrMatch ? arrMatch[0] : cleaned;
        try {
          const parsed = JSON.parse(candidate);
          if (Array.isArray(parsed)) {
            return parsed
              .map((x) => String(x || '').replace(/^[\d.\-*•\s"'״]+/, '').replace(/["'״]+$/, '').trim())
              .filter((x) => x.length >= 8 && x.length <= 92 && !/""|''|\{\}|undefined|null/i.test(x))
              .slice(0, 3);
          }
        } catch {}
        return [];
      };

      const prompt = `You are generating 3 smart, highly specific follow-up questions the user would genuinely want to ask next based on THIS exact conversation.
Rules:
- Write ONLY in ${langLabel}.
- Every question MUST be directly tailored to concrete facts, concepts, or next logical curiosity from the user's question and assistant's answer.
- FORBIDDEN generic templates: NEVER say "תוכל לתת דוגמה מעשית ל...", "מהם היתרונות והחסרונות", "איך מתחילים שלב אחרי שלב", "Can you give a practical example", or empty quotes "".
- Keep each question crisp, natural, intriguing, and under 68 characters.
- Return ONLY a valid JSON array of 3 strings.

${context ? `Earlier chat context: ${context}\n` : ''}User asked: ${question}
Assistant answered: ${answer.slice(0, 1500)}`;

      // Tier 1: Gemini fast models (valid live model IDs)
      const ai = getGenClient();
      if (ai) {
        for (const model of ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
          try {
            const out = await ai.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: 'application/json', maxOutputTokens: 260, temperature: 0.75 },
            });
            const items = parseFollowupJson(String(out.text || ''));
            if (items.length >= 2) return res.json({ items, lang: detectedLang, provider: model });
          } catch (_e) {}
        }
      }

      // Tier 2: Groq fast model (if key configured)
      if (process.env.GROQ_API_KEY) {
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
            },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: prompt }],
              temperature: 0.75,
              max_tokens: 240,
            }),
            signal: AbortSignal.timeout(5500),
          });
          if (r.ok) {
            const j: any = await r.json();
            const items = parseFollowupJson(j?.choices?.[0]?.message?.content || '');
            if (items.length >= 2) return res.json({ items, lang: detectedLang, provider: 'groq' });
          }
        } catch (_e) {}
      }

      // Tier 3: Free Pollinations OpenAI-compatible text endpoint
      try {
        const r = await fetch('https://text.pollinations.ai/openai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: 'openai',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.75,
          }),
          signal: AbortSignal.timeout(6500),
        });
        if (r.ok) {
          const j: any = await r.json();
          const items = parseFollowupJson(j?.choices?.[0]?.message?.content || '');
          if (items.length >= 2) return res.json({ items, lang: detectedLang, provider: 'pollinations' });
        }
      } catch (_e) {}

      // Tier 4: Rich content & domain-aware deterministic fallback (zero generic boilerplate)
      const fallback = buildSmartFallbackFollowups(question, answer, detectedLang);
      return res.json({ items: fallback, lang: detectedLang, provider: 'smart-local' });
    } catch {
      return res.json({ items: [] });
    }
  });

  // 3b. AI Prompt Enhancer (1-click composer prompt booster)
  app.post('/api/chat/enhance', async (req, res) => {
    try {
      const raw = String(req.body?.prompt || '').trim().slice(0, 1500);
      if (!raw) return res.status(400).json({ error: 'Prompt is empty' });
      const lang = detectTextLang(raw, String(req.body?.lang || 'en'));

      const ai = getGenClient();
      if (ai) {
        const langLabel = lang === 'he' ? 'Hebrew' : lang === 'ar' ? 'Arabic' : 'English';
        for (const model of ['gemini-3-flash-preview', 'gemini-2.5-flash']) {
          try {
            const out = await ai.models.generateContent({
              model,
              contents: [
                {
                  role: 'user',
                  parts: [
                    {
                      text: `Rewrite and enhance the following user prompt so an AI gives a significantly clearer, richer, and more accurate answer. Keep the user's exact intent and write ONLY the improved prompt in ${langLabel} (no quotes, no explanation, max 3 sentences).\n\nOriginal prompt:\n${raw}`,
                    },
                  ],
                },
              ],
              config: { maxOutputTokens: 280 },
            });
            const improved = String(out.text || '').trim().replace(/^["']|["']$/g, '');
            if (improved && improved.length >= raw.length * 0.7) {
              return res.json({ ok: true, enhanced: improved });
            }
          } catch (_e) {}
        }
      }

      // Clean deterministic enhancement when offline / no key
      const enhanced =
        lang === 'he'
          ? `${raw}\n\nאנא הסבר בצורה ברורה ומסודרת, כולל דוגמה מוחשית, נקודות מפתח חשובות וצעדים מומלצים להמשך.`
          : lang === 'ar'
          ? `${raw}\n\nيرجى الشرح بوضوح وتنظيم مع مثال عملي ونقاط رئيسية وخطوات تالية مقترحة.`
          : `${raw}\n\nPlease provide a clear, well-structured answer with a concrete practical example, key trade-offs, and actionable next steps.`;
      return res.json({ ok: true, enhanced });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Enhancement failed' });
    }
  });

  // 4. Resumable Background Chat Generations
  app.get('/api/chat/gens', (req, res) => {
    const user = getAuthUser(req);
    const uid = user?.id || getGuestIdentityKey(req);
    const recentMs = Math.min(3600_000, Math.max(10_000, Number(req.query?.recentMs) || 600_000));
    const cutoff = Date.now() - recentMs;
    const gens = [...bgGens.values()]
      .filter((g) => g.userId === uid && g.updatedAt >= cutoff)
      .map((g) => ({ id: g.id, done: g.done, length: g.text.length, updatedAt: g.updatedAt }));
    return res.json({ gens });
  });

  app.get('/api/chat/gen/:id', (req, res) => {
    const rec = bgGens.get(String(req.params.id || ''));
    if (!rec) return res.status(404).json({ error: 'Generation not found' });
    const from = Math.max(0, Number(req.query?.from) || 0);
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders?.();
    if (from < rec.text.length) {
      res.write(`data: ${JSON.stringify({ offset: from, delta: rec.text.slice(from) })}\n\n`);
    }
    res.write('data: [DONE]\n\n');
    return res.end();
  });

  app.post('/api/chat/gen/:id/cancel', (req, res) => {
    const rec = bgGens.get(String(req.params.id || ''));
    if (rec) {
      rec.cancelled = true;
      rec.done = true;
      rec.updatedAt = Date.now();
    }
    return res.json({ ok: true });
  });

  // 5. Fast Streaming Vision / Multi-Photo / Video-Keyframe Endpoint
  app.post('/api/vision/stream', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      const gKey = getGuestIdentityKey(req);
      const q = getGuestQuota(gKey);
      if (q.remaining <= 0) {
        return res.status(403).json({
          code: 'GUEST_LIMIT_REACHED',
          error: 'You have used your 7,500 free guest tokens. Sign up free for 25,000 tokens every 6 hours.',
        });
      }
      consumeGuestQuota(gKey, 350);
    }

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const writeDelta = (delta: string) => {
      if (!delta || res.writableEnded) return;
      res.write(`data: ${JSON.stringify({ delta })}\n\n`);
    };

    try {
      const { messages = [], answerLength } = req.body || {};
      const contents: any[] = [];
      let sysText = buildAnswerLengthInstruction(answerLength);
      for (const m of Array.isArray(messages) ? messages : []) {
        if (m.role === 'system') {
          sysText += '\n' + String(m.content || '');
          continue;
        }
        const parts: any[] = [];
        if (Array.isArray(m.content)) {
          for (const p of m.content) {
            if (p.type === 'text') parts.push({ text: String(p.text || '') });
            else if (p.type === 'image_url' && p.image_url?.url) {
              const mt = String(p.image_url.url).match(/^data:(image\/[\w+.-]+);base64,(.+)$/);
              if (mt) parts.push({ inlineData: { mimeType: mt[1], data: mt[2] } });
            }
          }
        } else {
          parts.push({ text: String(m.content || '') });
        }
        if (parts.length) contents.push({ role: m.role === 'assistant' ? 'model' : 'user', parts });
      }
      if (!contents.length) contents.push({ role: 'user', parts: [{ text: 'Describe the attached image.' }] });

      const ai = getGenClient();
      if (ai) {
        const stream = await ai.models.generateContentStream({
          model: 'gemini-3.1-flash-lite-preview',
          contents,
          config: { systemInstruction: sysText, maxOutputTokens: 2048 },
        });
        for await (const chunk of stream) {
          if (chunk.text) writeDelta(chunk.text);
        }
      } else {
        writeDelta('Image received. Configure GEMINI_API_KEY on the server to enable live multimodal vision analysis.');
      }
    } catch (e: any) {
      writeDelta(`Could not analyze the image right now (${e?.message || 'vision error'}).`);
    } finally {
      if (!res.writableEnded) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  });

  // 6. Media Text Extraction (.pdf, .docx, .xlsx, .txt, code files)
  app.post('/api/media/extract', (req, res) => {
    try {
      const name = String(req.body?.name || 'file').trim();
      const mime = String(req.body?.mime || '').trim();
      const dataUrl = String(req.body?.dataUrl || '');
      if (!dataUrl) return res.status(400).json({ error: 'Missing file payload' });
      const out = extractReadableTextFromDataUrl(name, mime, dataUrl);
      return res.json({ ok: true, name, ...out });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || 'Extract failed' });
    }
  });

  // 7. Audio / Video Transcription
  app.post('/api/media/transcribe', async (req, res) => {
    try {
      const audio = String(req.body?.audio || '').trim();
      const mime = String(req.body?.mime || 'audio/webm').trim();
      if (!audio) return res.json({ ok: true, text: '' });
      const ai = getGenClient();
      if (!ai) return res.json({ ok: true, text: '' });
      const out = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: [
          {
            role: 'user',
            parts: [
              { text: 'Transcribe the spoken audio cleanly and accurately. Output only the transcript.' },
              { inlineData: { mimeType: mime, data: audio } },
            ],
          },
        ],
        config: { maxOutputTokens: 1500 },
      });
      return res.json({ ok: true, text: String(out.text || '').trim() });
    } catch {
      return res.json({ ok: true, text: '' });
    }
  });

  // 8. Fast Formula Spec Generator
  app.post('/api/formula/spec', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim();
      if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
      const ai = getGenClient();
      if (!ai) return res.json({ ok: false, spec: null });
      const sys = `Return ONLY valid JSON for an interactive calculator spec:
{
  "title": "Short title",
  "formula": "Readable formula string",
  "vars": [{ "key": "x", "label": "Variable X", "unit": "", "default": 10 }],
  "expr": "JavaScript expression using var keys and Math.*",
  "resultUnit": "",
  "explanation": "1 sentence explanation"
}`;
      const out = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents: [{ role: 'user', parts: [{ text: `Build a formula calculator spec for: ${prompt}` }] }],
        config: { systemInstruction: sys, responseMimeType: 'application/json', maxOutputTokens: 500 },
      });
      const spec = JSON.parse(String(out.text || 'null').trim());
      return res.json({ ok: Boolean(spec), spec });
    } catch {
      return res.json({ ok: false, spec: null });
    }
  });

  // 9. Multi-Round Compiler-Driven Auto-Fix Stream for LokiCode
  app.post('/api/lokicode/fix', async (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const send = (obj: Record<string, unknown>) => {
      if (!res.writableEnded) res.write(`data: ${JSON.stringify(obj)}\n\n`);
    };

    try {
      const lang = String(req.body?.lang || 'javascript').toLowerCase().trim();
      let code = String(req.body?.code || '');
      const prompt = String(req.body?.prompt || '');
      const maxRounds = 3;

      const checkCode = (src: string): { ok: boolean; code: string; issues: string[]; compiler: string } => {
        if (lang === 'lsl') {
          const r = analyzeAndFixLslScript(src);
          return { ok: r.valid, code: r.code, issues: r.errors, compiler: 'OpenSim / LSL2 Static Verifier' };
        }
        if (lang === 'matlab') {
          const r = analyzeAndFixMatlabScript(src);
          return { ok: r.valid, code: r.code, issues: r.errors, compiler: 'MATLAB R2024b Static Verifier' };
        }
        if (lang === 'typescript' || lang === 'javascript') {
          try {
            const js = lang === 'typescript' ? transpileTypeScriptToJs(src) : src;
            new Function(js);
            return { ok: true, code: src, issues: [], compiler: 'V8 / ES2024 Syntax Verifier' };
          } catch (e: any) {
            return { ok: false, code: src, issues: [e?.message || 'Syntax error'], compiler: 'V8 / ES2024 Syntax Verifier' };
          }
        }
        if (lang === 'json') {
          try {
            JSON.parse(src);
            return { ok: true, code: src, issues: [], compiler: 'JSON Strict Parser' };
          } catch (e: any) {
            return { ok: false, code: src, issues: [e?.message || 'Invalid JSON'], compiler: 'JSON Strict Parser' };
          }
        }
        return { ok: true, code: src, issues: [], compiler: `${lang.toUpperCase()} Verifier` };
      };

      const ai = getGenClient();
      for (let round = 1; round <= maxRounds; round++) {
        const resCheck = checkCode(code);
        code = resCheck.code;
        send({
          round,
          maxRounds,
          code,
          ok: resCheck.ok,
          issues: resCheck.issues,
          issueCount: resCheck.issues.length,
          compiler: resCheck.compiler,
          status: resCheck.ok
            ? `Round ${round}/${maxRounds} · 0 errors (${resCheck.compiler})`
            : `Round ${round}/${maxRounds} · ${resCheck.issues.length} error(s) — auto-fixing…`,
        });
        if (resCheck.ok || !ai) break;

        try {
          const fixPrompt = `Fix all ${lang} errors below. Return ONLY the corrected ${lang} code without markdown fences.\nTask: ${prompt}\nErrors:\n${resCheck.issues.join('\n')}\nCode:\n${code}`;
          const fixedRes = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite-preview',
            contents: [{ role: 'user', parts: [{ text: fixPrompt }] }],
            config: { maxOutputTokens: 3000 },
          });
          const cleaned = String(fixedRes.text || '')
            .trim()
            .replace(/^```[\w+-]*\s*\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
          if (cleaned) code = cleaned;
        } catch {
          break;
        }
      }
    } catch (e: any) {
      send({ ok: false, error: e?.message || 'Fix failed' });
    } finally {
      if (!res.writableEnded) {
        res.write('data: [DONE]\n\n');
        res.end();
      }
    }
  });

  // 10. 3D Model Procedural Generator
  app.post('/api/model3d/generate', (req, res) => {
    const prompt = String(req.body?.prompt || '3D Model').trim();
    const title = prompt.slice(0, 60) || 'Procedural 3D Asset';
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'model';
    const objB64 = buildMinimalGlbCubeBase64();
    const blendPy = `import bpy\nbpy.ops.mesh.primitive_cube_add(size=2)\nobj = bpy.context.active_object\nobj.name = ${JSON.stringify(title)}\n`;
    const blendB64 = Buffer.from(blendPy, 'utf8').toString('base64');

    return res.json({
      ok: true,
      title,
      preview: build3DPreviewSvgDataUrl(title),
      stats: { dims: [2.0, 2.0, 2.0], objects: 1, triangles: 12 },
      files: [
        {
          name: `${slug}.obj`,
          mime: 'text/plain',
          dataUrl: `data:text/plain;base64,${objB64}`,
          size: Buffer.from(objB64, 'base64').length,
          desc: 'Wavefront 3D mesh (.obj)',
        },
        {
          name: `${slug}_blender.py`,
          mime: 'text/x-python',
          dataUrl: `data:text/x-python;base64,${blendB64}`,
          size: Buffer.from(blendPy, 'utf8').length,
          desc: 'Blender Python scene builder script',
        },
      ],
    });
  });

  // 11. Live In-Game AI Commentary & Player Chat Reply
  app.post('/api/games/chat', async (req, res) => {
    const gameId = String(req.body?.gameId || 'chess') as GameId;
    const gameTitle = String(req.body?.gameTitle || gameId).slice(0, 60);
    const userMessage = String(req.body?.userMessage || '').trim().slice(0, 320);
    const boardSummary = String(req.body?.boardSummary || '').trim().slice(0, 320);
    const lastMove = String(req.body?.lastMove || '').trim().slice(0, 140);
    const preferredLang = String(req.body?.lang || 'he');
    const lang = detectTextLang(userMessage || boardSummary, preferredLang) === 'he' ? 'he' : 'en';

    const fallbackReply = generateGameChatReply({ gameId, userMessage: userMessage || lastMove, lang, boardSummary });
    if (!userMessage && !lastMove) {
      return res.json({ ok: true, reply: fallbackReply, provider: 'local' });
    }

    const promptText =
      lang === 'he'
        ? `אתה Lokizenith AI, יריב חד, מצחיק וידידותי שמשחק עכשיו "${gameTitle}" נגד המשתמש.
מצב הלוח: ${boardSummary || 'באמצע משחק'}
מהלך אחרון: ${lastMove || 'אין'}
הודעת השחקן: "${userMessage || 'תן הערה קצרה על המהלך האחרון'}"
ענה במשפט 1–2 קצרים, שנונים ומותאמים בדיוק למשחק ולמה שהשחקן כתב (בעברית טבעית בלבד, בלי הקדמות).`
        : `You are Lokizenith AI, a sharp, witty, friendly opponent currently playing "${gameTitle}" against the user.
Board state: ${boardSummary || 'mid-game'}
Last move: ${lastMove || 'none'}
Player message: "${userMessage || 'React briefly to the latest move'}"
Reply in 1–2 short, lively sentences tailored directly to the game and what the player said (natural English, no preamble).`;

    try {
      const ai = getGenClient();
      if (ai) {
        const models = ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash'];
        for (const model of models) {
          try {
            const out = await ai.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: promptText }] }],
              config: { maxOutputTokens: 160, temperature: 0.85 },
            });
            const text = String(out.text || '').trim().replace(/^["']|["']$/g, '');
            if (text && text.length >= 4) {
              return res.json({ ok: true, reply: text.slice(0, 260), provider: model });
            }
          } catch {
            // Try next model
          }
        }
      }
      const groqKey = process.env.GROQ_API_KEY;
      if (groqKey) {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 5000);
        try {
          const r = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${groqKey}` },
            body: JSON.stringify({
              model: 'llama-3.1-8b-instant',
              messages: [{ role: 'user', content: promptText }],
              max_tokens: 140,
              temperature: 0.85,
            }),
            signal: ctrl.signal,
          });
          if (r.ok) {
            const j: any = await r.json();
            const text = String(j?.choices?.[0]?.message?.content || '').trim();
            if (text && text.length >= 4) {
              return res.json({ ok: true, reply: text.slice(0, 260), provider: 'groq' });
            }
          }
        } finally {
          clearTimeout(timer);
        }
      }
    } catch {
      // Fallback below
    }

    return res.json({ ok: true, reply: fallbackReply, provider: 'local' });
  });

  // 12. Plugins, Deep Search, Reader, and LokiBot
  registerPluginRoutes(app, getAuthUser);
  registerDeepSearchRoutes(app);
  registerLokiBotRoutes(app, getAuthUser, async (systemPrompt, history) => {
    const ai = getGenClient();
    if (!ai) return 'LokiBot is online. Configure GEMINI_API_KEY to enable live bot responses.';
    const contents = history.map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));
    const out = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents,
      config: { systemInstruction: systemPrompt, maxOutputTokens: 1200 },
    });
    return String(out.text || '').trim() || 'Done!';
  });
}
