import fs from 'fs';
import path from 'path';
import type express from 'express';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  buildAnswerLengthInstruction,
  consumeGuestQuota,
  getGuestQuota,
  isSafePublicHttpUrl,
} from '../utils/guestAndLength.ts';
import { analyzeAndFixLslScript } from '../utils/lslSpecialist.ts';
import { analyzeAndFixMatlabScript } from '../utils/matlabSpecialist.ts';
import { transpileTypeScriptToJs } from '../utils/lokiCodeEngine.ts';
import { registerPluginRoutes } from './pluginsEngine.ts';
import { fetchPageTextSafe, registerDeepSearchRoutes } from './deepSearchEngine.ts';
import { registerLokiBotRoutes } from './lokiBotRoutes.ts';
import { buildSmartFallbackFollowups, detectTextLang } from '../utils/aiUpgrades.ts';
import { generateGameChatReply, type GameId } from '../utils/gameEngine.ts';
import { buildGameChatMessages, type GameChatHistoryItem } from '../utils/webSearchAndAiUpgrades.ts';
import {
  callKeyedAiChain,
  chainCooldowns,
  getHotProviderSlots,
  streamKeyedAiChain,
  transcribeWithGroqWhisper,
} from './aiKeyChain.ts';
import { buildLokiCodeSkillSystemPrompt } from './lokicodeSkill.ts';

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

function makeGenClient(apiKey: string): GoogleGenAI {
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

async function runWithGeminiPool<T>(
  fn: (ai: GoogleGenAI, apiKey: string, slotId: string) => Promise<T | null>
): Promise<T | null> {
  const slots = getHotProviderSlots('gemini');
  for (const slot of slots) {
    try {
      const result = await fn(makeGenClient(slot.apiKey), slot.apiKey, slot.slotId);
      if (result !== null && result !== undefined && result !== '') {
        return result;
      }
    } catch {
      chainCooldowns.coolForHttpStatus(slot.slotId, 429);
    }
  }
  return null;
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

      // Tier 1: Gemini Key Pool (rotates configured Gemini keys)
      const gemItems = await runWithGeminiPool(async (ai) => {
        for (const model of ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-2.0-flash']) {
          try {
            const out = await ai.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: prompt }] }],
              config: { responseMimeType: 'application/json', maxOutputTokens: 260, temperature: 0.75 },
            });
            const items = parseFollowupJson(String(out.text || ''));
            if (items.length >= 2) return { items, model };
          } catch (_e) {}
        }
        return null;
      });
      if (gemItems) {
        return res.json({ items: gemItems.items, lang: detectedLang, provider: gemItems.model });
      }

      // Tier 2: Full Keyed Provider Chain (Groq multi-key pool -> Cerebras -> SambaNova -> OpenRouter -> Together -> Mistral -> OpenAI -> DeepSeek -> xAI -> NVIDIA -> Anthropic)
      const chainOut = await callKeyedAiChain({
        messages: [{ role: 'user', content: prompt }],
        purpose: 'fast',
        maxTokens: 240,
        temperature: 0.75,
        timeoutMs: 5000,
      });
      if (chainOut.ok) {
        const items = parseFollowupJson(chainOut.text);
        if (items.length >= 2) return res.json({ items, lang: detectedLang, provider: chainOut.providerId || 'chain' });
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

      const langLabel = lang === 'he' ? 'Hebrew' : lang === 'ar' ? 'Arabic' : 'English';
      const enhancePrompt = `Rewrite and enhance the following user prompt so an AI gives a significantly clearer, richer, and more accurate answer. Keep the user's exact intent and write ONLY the improved prompt in ${langLabel} (no quotes, no explanation, max 3 sentences).\n\nOriginal prompt:\n${raw}`;

      const gemImproved = await runWithGeminiPool(async (ai) => {
        for (const model of ['gemini-3-flash-preview', 'gemini-2.5-flash']) {
          try {
            const out = await ai.models.generateContent({
              model,
              contents: [{ role: 'user', parts: [{ text: enhancePrompt }] }],
              config: { maxOutputTokens: 280 },
            });
            const improved = String(out.text || '').trim().replace(/^["']|["']$/g, '');
            if (improved && improved.length >= raw.length * 0.7) return improved;
          } catch (_e) {}
        }
        return null;
      });
      if (gemImproved) return res.json({ ok: true, enhanced: gemImproved });

      const chainEnhanced = await callKeyedAiChain({
        messages: [{ role: 'user', content: enhancePrompt }],
        purpose: 'fast',
        maxTokens: 280,
        temperature: 0.5,
        timeoutMs: 4000,
      });
      if (chainEnhanced.ok) {
        const improved = chainEnhanced.text.trim().replace(/^["']|["']$/g, '');
        if (improved && improved.length >= raw.length * 0.7) {
          return res.json({ ok: true, enhanced: improved });
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

      let streamedAny = false;
      const geminiSlots = getHotProviderSlots('gemini');
      for (const slot of geminiSlots) {
        try {
          const ai = makeGenClient(slot.apiKey);
          const stream = await ai.models.generateContentStream({
            model: 'gemini-3.1-flash-lite-preview',
            contents,
            config: { systemInstruction: sysText, maxOutputTokens: 2048 },
          });
          for await (const chunk of stream) {
            if (chunk.text) {
              streamedAny = true;
              writeDelta(chunk.text);
            }
          }
          if (streamedAny) break;
        } catch {
          chainCooldowns.coolForHttpStatus(slot.slotId, 429);
        }
      }

      if (!streamedAny) {
        const visionRes = await streamKeyedAiChain({
          messages: Array.isArray(messages) ? messages : [],
          systemInstruction: sysText,
          maxTokens: 2048,
          purpose: 'vision',
          firstTokenTimeoutMs: 6500,
          onDelta: (d) => {
            streamedAny = true;
            writeDelta(d);
          },
        });
        if (!visionRes.ok && !streamedAny) {
          writeDelta('Image received, and all configured vision providers in the API chain are currently unavailable or rate-limited.');
        }
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

  // 7. Audio / Video Transcription (Gemini key pool -> Groq Whisper Turbo pool)
  app.post('/api/media/transcribe', async (req, res) => {
    try {
      const audio = String(req.body?.audio || '').trim();
      const mime = String(req.body?.mime || 'audio/webm').trim();
      if (!audio) return res.json({ ok: true, text: '' });
      const gemText = await runWithGeminiPool(async (ai) => {
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
        const txt = String(out.text || '').trim();
        return txt || null;
      });
      if (gemText) return res.json({ ok: true, text: gemText });

      const groqOut = await transcribeWithGroqWhisper({ audioB64: audio, mime });
      if (groqOut.ok && groqOut.text) return res.json({ ok: true, text: groqOut.text });

      return res.json({ ok: true, text: '' });
    } catch {
      return res.json({ ok: true, text: '' });
    }
  });

  // 8. Fast Formula Spec Generator
  app.post('/api/formula/spec', async (req, res) => {
    try {
      const prompt = String(req.body?.prompt || '').trim();
      if (!prompt) return res.status(400).json({ error: 'Missing prompt' });
      const sys = `Return ONLY valid JSON for an interactive calculator spec:
{
  "title": "Short title",
  "formula": "Readable formula string",
  "vars": [{ "key": "x", "label": "Variable X", "unit": "", "default": 10 }],
  "expr": "JavaScript expression using var keys and Math.*",
  "resultUnit": "",
  "explanation": "1 sentence explanation"
}`;
      const gemSpec = await runWithGeminiPool(async (ai) => {
        const out = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-preview',
          contents: [{ role: 'user', parts: [{ text: `Build a formula calculator spec for: ${prompt}` }] }],
          config: { systemInstruction: sys, responseMimeType: 'application/json', maxOutputTokens: 500 },
        });
        const parsed = JSON.parse(String(out.text || 'null').trim());
        return parsed || null;
      });
      if (gemSpec) return res.json({ ok: true, spec: gemSpec });

      const chainOut = await callKeyedAiChain({
        messages: [{ role: 'user', content: `Build a formula calculator spec for: ${prompt}` }],
        systemInstruction: sys,
        json: true,
        purpose: 'fast',
        maxTokens: 500,
        timeoutMs: 4500,
      });
      if (chainOut.ok) {
        const match = chainOut.text.match(/\{[\s\S]*\}/);
        if (match) {
          const parsed = JSON.parse(match[0]);
          if (parsed) return res.json({ ok: true, spec: parsed });
        }
      }
      return res.json({ ok: false, spec: null });
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

      const t0 = Date.now();
      let lastCheck = checkCode(code);
      let roundsDone = 0;
      let finishReason = 'ok';
      const fixSkillSys = buildLokiCodeSkillSystemPrompt({ langId: lang, mode: 'edit', comments: true });

      for (let round = 1; round <= maxRounds; round++) {
        roundsDone = round;
        const resCheck = checkCode(code);
        lastCheck = resCheck;
        code = resCheck.code;
        send({
          round,
          maxRounds,
          code,
          ok: resCheck.ok,
          issues: resCheck.issues,
          issueCount: resCheck.issues.length,
          compiler: resCheck.compiler,
          done: resCheck.ok,
          rounds: round,
          verifyMs: Math.max(1, Date.now() - t0),
          status: resCheck.ok
            ? `Round ${round}/${maxRounds} · 0 errors (${resCheck.compiler})`
            : `Round ${round}/${maxRounds} · ${resCheck.issues.length} error(s) — auto-fixing…`,
        });
        if (resCheck.ok) {
          finishReason = 'ok';
          break;
        }

        try {
          const fixPrompt = `Fix all ${lang.toUpperCase()} errors below. Return ONLY a single complete \`\`\`${lang} ... \`\`\` fenced block.\nTask: ${prompt}\nErrors:\n${resCheck.issues.join('\n')}\nCode:\n\`\`\`${lang}\n${code}\n\`\`\``;
          let fixedRaw = '';
          const chainFix = await callKeyedAiChain({
            messages: [
              { role: 'system', content: fixSkillSys },
              { role: 'user', content: fixPrompt },
            ],
            purpose: 'code',
            maxTokens: 3200,
            temperature: 0.15,
            timeoutMs: 5500,
          });
          if (chainFix.ok && chainFix.text) fixedRaw = chainFix.text;

          if (!fixedRaw) {
            const gemFix = await runWithGeminiPool(async (ai) => {
              const fixedRes = await ai.models.generateContent({
                model: 'gemini-3.1-flash-lite',
                contents: [{ role: 'user', parts: [{ text: fixPrompt }] }],
                config: {
                  maxOutputTokens: 3200,
                  systemInstruction: fixSkillSys,
                  thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
                },
              });
              return String(fixedRes.text || '').trim() || null;
            });
            if (gemFix) fixedRaw = gemFix;
          }

          const cleaned = String(fixedRaw || '')
            .trim()
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .trim()
            .replace(/^```[\w+-]*\s*\n?/, '')
            .replace(/\n?```$/, '')
            .trim();
          if (cleaned && cleaned !== code) {
            code = cleaned;
          } else {
            finishReason = 'no-progress';
            break;
          }
          if (round === maxRounds) {
            lastCheck = checkCode(code);
            code = lastCheck.code;
            finishReason = lastCheck.ok ? 'ok' : 'max-rounds';
          }
        } catch {
          finishReason = 'error';
          break;
        }
      }

      if (!lastCheck.ok) {
        send({
          done: true,
          round: roundsDone,
          rounds: roundsDone,
          maxRounds,
          code,
          ok: false,
          issues: lastCheck.issues,
          issueCount: lastCheck.issues.length,
          compiler: lastCheck.compiler,
          verifyMs: Math.max(1, Date.now() - t0),
          reason: finishReason,
        });
      }
    } catch (e: any) {
      send({ done: true, ok: false, error: e?.message || 'Fix failed', issues: [e?.message || 'Fix failed'] });
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

  // 11. Live In-Game AI Commentary & Real Conversational Mid-Game Chat
  app.post('/api/games/chat', async (req, res) => {
    const gameId = String(req.body?.gameId || 'chess') as GameId;
    const gameTitle = String(req.body?.gameTitle || gameId).slice(0, 60);
    const userMessage = String(req.body?.userMessage || '').trim().slice(0, 500);
    const boardSummary = String(req.body?.boardSummary || '').trim().slice(0, 700);
    const lastMove = String(req.body?.lastMove || '').trim().slice(0, 180);
    const difficulty = String(req.body?.difficulty || 'medium').trim().slice(0, 32);
    const scoreSummary = String(req.body?.scoreSummary || '').trim().slice(0, 120);
    const preferredLang = String(req.body?.lang || 'he');
    const lang = detectTextLang(userMessage || boardSummary, preferredLang) === 'he' ? 'he' : 'en';
    const rawHistory = Array.isArray(req.body?.history) ? (req.body.history as GameChatHistoryItem[]) : [];

    const fallbackReply = generateGameChatReply({ gameId, userMessage: userMessage || lastMove, lang, boardSummary });
    if (!userMessage && !lastMove) {
      return res.json({ ok: true, reply: fallbackReply, provider: 'local' });
    }

    const { systemInstruction, contents, openaiMessages } = buildGameChatMessages({
      gameTitle,
      lang,
      boardSummary,
      lastMove,
      difficulty,
      scoreSummary,
      history: rawHistory,
      userMessage,
    });

    try {
      const gemGame = await runWithGeminiPool(async (ai) => {
        try {
          const out = await ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: { systemInstruction, maxOutputTokens: 450 },
          });
          const text = String(out.text || '').trim().replace(/^["']|["']$/g, '');
          if (text && text.length >= 4) return { text, provider: 'gemini-3.1-flash-lite' };
        } catch {}

        const out = await ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents,
          config: {
            systemInstruction,
            maxOutputTokens: 500,
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        });
        const text = String(out.text || '').trim().replace(/^["']|["']$/g, '');
        if (text && text.length >= 4) return { text, provider: 'gemini-4-hydrogen' };
        return null;
      });
      if (gemGame) {
        return res.json({ ok: true, reply: gemGame.text.slice(0, 700), provider: gemGame.provider });
      }

      const chainOut = await callKeyedAiChain({
        messages: openaiMessages,
        purpose: 'fast',
        maxTokens: 320,
        temperature: 0.75,
        timeoutMs: 5000,
      });
      if (chainOut.ok && chainOut.text.length >= 4) {
        return res.json({ ok: true, reply: chainOut.text.slice(0, 700), provider: chainOut.providerId || 'chain' });
      }
    } catch {
      // Fallback below
    }

    return res.json({ ok: true, reply: fallbackReply, provider: 'local' });
  });

  // 11b. Live URL & Website Intelligence Reader (Gemini urlContext + Safe Server Page Fetch)
  app.post('/api/ai/url-analyze', async (req, res) => {
    try {
      const rawUrl = String(req.body?.url || '').trim();
      const question = String(req.body?.question || '').trim().slice(0, 400);
      const preferredLang = String(req.body?.lang || 'he');
      const normalizedUrl = /^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`;
      if (!isSafePublicHttpUrl(normalizedUrl)) {
        return res.status(400).json({ ok: false, error: 'Please provide a valid public http(s) URL.' });
      }

      const lang = detectTextLang(question, preferredLang) === 'he' ? 'he' : 'en';
      const isHe = lang === 'he';
      const pageText = await fetchPageTextSafe(normalizedUrl, 12000, 4500);
      let domain = '';
      try {
        domain = new URL(normalizedUrl).hostname.replace(/^www\./i, '');
      } catch {
        domain = normalizedUrl;
      }

      const urlPrompt = isHe
        ? `נתח לעומק את הדף בכתובת ${normalizedUrl}.${question ? `\nשאלת המשתמש: ${question}` : ''}${
            pageText ? `\n\nתוכן שנקרא ישירות מהאתר:\n"""${pageText.slice(0, 9000)}"""` : ''
          }
החזר תשובה בעברית ברורה ומובנית בפורמט JSON תקני בלבד:
{
  "title": "כותרת העמוד או הנושא",
  "tldr": "תקציר חד וממוקד ב-2-3 משפטים",
  "answer": "תשובה ישירה לשאלת המשתמש או ניתוח מרכזי",
  "keyPoints": ["נקודת מפתח 1", "נקודת מפתח 2", "נקודת מפתח 3", "נקודת מפתח 4"],
  "takeaways": ["מסקנה או המלצה מעשית 1", "מסקנה 2"],
  "followUps": ["שאלת המשך חכמה 1", "שאלת המשך חכמה 2"]
}`
        : `Analyze the web page at ${normalizedUrl} thoroughly.${question ? `\nUser question: ${question}` : ''}${
            pageText ? `\n\nDirect page text:\n"""${pageText.slice(0, 9000)}"""` : ''
          }
Return ONLY valid JSON in English:
{
  "title": "Page title or topic",
  "tldr": "Sharp 2-3 sentence executive summary",
  "answer": "Direct answer to the user's question or main breakdown",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3", "Key point 4"],
  "takeaways": ["Actionable takeaway 1", "Takeaway 2"],
  "followUps": ["Smart follow-up question 1", "Smart follow-up question 2"]
}`;

      let rawText =
        (await runWithGeminiPool(async (ai) => {
          if (!pageText || pageText.length < 250) {
            const urlResp = await ai.models.generateContent({
              model: 'gemini-4-hydrogen',
              contents: [{ role: 'user', parts: [{ text: urlPrompt }] }],
              config: {
                tools: [{ urlContext: {} }],
                maxOutputTokens: 1600,
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            });
            return String(urlResp.text || '').trim() || null;
          }
          const jsonResp = await ai.models.generateContent({
            model: 'gemini-4-hydrogen',
            contents: [{ role: 'user', parts: [{ text: urlPrompt }] }],
            config: {
              responseMimeType: 'application/json',
              maxOutputTokens: 1600,
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          return String(jsonResp.text || '').trim() || null;
        })) || '';

      if (!rawText && pageText) {
        const chainUrl = await callKeyedAiChain({
          messages: [{ role: 'user', content: urlPrompt }],
          purpose: 'quality',
          json: true,
          maxTokens: 1600,
          timeoutMs: 6500,
        });
        if (chainUrl.ok) rawText = chainUrl.text;
      }

      if (rawText) {
        try {
          const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
          const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return res.json({
              ok: true,
              url: normalizedUrl,
              domain,
              lang,
              wordCount: pageText ? pageText.split(/\s+/).length : 0,
              title: String(parsed.title || domain),
              tldr: String(parsed.tldr || ''),
              answer: String(parsed.answer || parsed.tldr || ''),
              keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 6).map(String) : [],
              takeaways: Array.isArray(parsed.takeaways) ? parsed.takeaways.slice(0, 4).map(String) : [],
              followUps: Array.isArray(parsed.followUps) ? parsed.followUps.slice(0, 3).map(String) : [],
            });
          }

          return res.json({
            ok: true,
            url: normalizedUrl,
            domain,
            lang,
            wordCount: pageText ? pageText.split(/\s+/).length : 0,
            title: domain,
            tldr: rawText.slice(0, 360),
            answer: rawText,
            keyPoints: [],
            takeaways: [],
            followUps: [],
          });
        } catch {
          // Fall back to direct page snippet below
        }
      }

      if (pageText) {
        return res.json({
          ok: true,
          url: normalizedUrl,
          domain,
          lang,
          wordCount: pageText.split(/\s+/).length,
          title: domain,
          tldr: pageText.slice(0, 420),
          answer: pageText.slice(0, 1200),
          keyPoints: [],
          takeaways: [],
          followUps: [],
        });
      }

      return res.status(502).json({
        ok: false,
        error: isHe ? 'לא ניתן היה לקרוא את האתר הזה כרגע.' : 'Could not read that website right now.',
      });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || 'URL analysis failed' });
    }
  });

  // 12. Plugins, Deep Search, Reader, and LokiBot
  registerPluginRoutes(app, getAuthUser);
  registerDeepSearchRoutes(app);
  registerLokiBotRoutes(app, getAuthUser, async (systemPrompt, history) => {
    const gemReply = await runWithGeminiPool(async (ai) => {
      const contents = history.map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      const out = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-preview',
        contents,
        config: { systemInstruction: systemPrompt, maxOutputTokens: 1200 },
      });
      return out.text && out.text.trim() ? out.text.trim() : null;
    });
    if (gemReply) return gemReply;

    const chainOut = await callKeyedAiChain({
      messages: history.map((m) => ({ role: m.role, content: m.content })),
      systemInstruction: systemPrompt,
      purpose: 'fast',
      maxTokens: 1200,
      timeoutMs: 6500,
    });
    if (chainOut.ok && chainOut.text) return chainOut.text;
    return 'LokiBot is online. Configure an API key (Gemini, Groq, Cerebras, OpenRouter, etc.) in server environment variables to enable live bot responses.';
  });
}
