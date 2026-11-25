import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type express from 'express';
import {
  extractKnowledgeFacts,
  scoreKnowledgeMatch,
  containsSensitiveInfo,
  detectTextLang,
  type KnowledgeEntry,
} from '../utils/aiUpgrades.ts';

export interface AiReportRecord {
  id: string;
  messageId: string;
  convId: string;
  userPrompt: string;
  aiResponse: string;
  reason: string;
  category: string;
  model: string;
  reporterUsername: string;
  reporterDisplayName: string;
  reporterId: string;
  status: 'open' | 'reviewing' | 'resolved';
  adminNote: string;
  createdAt: number;
  updatedAt: number;
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const REPORTS_FILE = path.join(DATA_DIR, 'ai-reports.json');
const KNOWLEDGE_FILE = path.join(DATA_DIR, 'ai-knowledge.json');

let reportsCache: AiReportRecord[] = [];
let knowledgeCache: KnowledgeEntry[] = [];
let loaded = false;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function atomicWriteJson(filePath: string, data: unknown) {
  try {
    ensureDir();
    const tmp = `${filePath}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
    fs.renameSync(tmp, filePath);
  } catch (e: any) {
    console.warn(`[reportsAndKnowledge] Failed to persist ${path.basename(filePath)}:`, e?.message || e);
  }
}

function loadStores() {
  if (loaded) return;
  loaded = true;
  try {
    if (fs.existsSync(REPORTS_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(REPORTS_FILE, 'utf8'));
      if (Array.isArray(parsed)) reportsCache = parsed;
    }
  } catch (_e) {}
  try {
    if (fs.existsSync(KNOWLEDGE_FILE)) {
      const parsed = JSON.parse(fs.readFileSync(KNOWLEDGE_FILE, 'utf8'));
      if (Array.isArray(parsed)) knowledgeCache = parsed;
    }
  } catch (_e) {}
}

export function getAllReports(): AiReportRecord[] {
  loadStores();
  return [...reportsCache].sort((a, b) => b.createdAt - a.createdAt);
}

export function getOpenReportsCount(): number {
  loadStores();
  return reportsCache.filter((r) => r.status !== 'resolved').length;
}

export function getAllKnowledge(): KnowledgeEntry[] {
  loadStores();
  return [...knowledgeCache].sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getKnowledgeStats() {
  loadStores();
  const totalUses = knowledgeCache.reduce((sum, k) => sum + (k.uses || 0), 0);
  const topTopics = [...knowledgeCache]
    .sort((a, b) => (b.uses || 0) - (a.uses || 0))
    .slice(0, 8)
    .map((k) => k.topic);
  return {
    totalFacts: knowledgeCache.length,
    totalUses,
    topTopics,
  };
}

export function addLearnedFact(
  topic: string,
  fact: string,
  tags: string[],
  lang: 'he' | 'ar' | 'en',
  sourceUser?: string,
  confidence = 0.8
): KnowledgeEntry | null {
  loadStores();
  const cleanTopic = String(topic || '').trim().slice(0, 80);
  const cleanFact = String(fact || '').trim().slice(0, 420);
  if (cleanFact.length < 24 || containsSensitiveInfo(cleanFact) || containsSensitiveInfo(cleanTopic)) {
    return null;
  }

  // Deduplicate by normalized fact prefix or very high tag overlap on same topic
  const normFact = cleanFact.toLowerCase().replace(/\s+/g, ' ');
  const existing = knowledgeCache.find(
    (k) =>
      k.fact.toLowerCase().replace(/\s+/g, ' ') === normFact ||
      (k.topic.toLowerCase() === cleanTopic.toLowerCase() &&
        k.fact.toLowerCase().slice(0, 60) === normFact.slice(0, 60))
  );
  const now = Date.now();
  if (existing) {
    existing.updatedAt = now;
    existing.confidence = Math.min(0.99, Math.max(existing.confidence, confidence) + 0.02);
    existing.tags = Array.from(new Set([...(existing.tags || []), ...tags])).slice(0, 10);
    atomicWriteJson(KNOWLEDGE_FILE, knowledgeCache);
    return existing;
  }

  const entry: KnowledgeEntry = {
    id: 'kn_' + crypto.randomBytes(6).toString('hex'),
    topic: cleanTopic || 'General Knowledge',
    fact: cleanFact,
    tags: Array.from(new Set(tags.map((t) => String(t).toLowerCase()).filter(Boolean))).slice(0, 10),
    lang,
    sourceUser: sourceUser ? String(sourceUser).slice(0, 48) : 'Community',
    confidence: Math.min(0.99, Math.max(0.5, confidence)),
    uses: 0,
    createdAt: now,
    updatedAt: now,
  };
  knowledgeCache.unshift(entry);
  if (knowledgeCache.length > 600) {
    knowledgeCache = knowledgeCache.slice(0, 600);
  }
  atomicWriteJson(KNOWLEDGE_FILE, knowledgeCache);
  return entry;
}

export interface ReportsAndKnowledgeDeps {
  getAuthUser: (req: express.Request) => any;
  hasAdminPermission: (user: any, module: string) => boolean;
  onAdminUpdate?: () => void;
  recordAudit?: (entry: { category: string; action: string; actor: string; target?: string; detail: string }) => void;
}

export function registerReportsAndKnowledgeRoutes(app: express.Express, deps: ReportsAndKnowledgeDeps): void {
  loadStores();

  // ================= AI MESSAGE REPORTS =================
  app.post('/api/reports', (req, res) => {
    try {
      const user = deps.getAuthUser(req);
      const reason = String(req.body?.reason || '').trim().slice(0, 1200);
      const category = String(req.body?.category || 'other').trim().slice(0, 40);
      const aiResponse = String(req.body?.aiResponse || req.body?.messageContent || '').trim().slice(0, 3000);
      const userPrompt = String(req.body?.userPrompt || '').trim().slice(0, 1500);
      const messageId = String(req.body?.messageId || '').trim().slice(0, 80);
      const convId = String(req.body?.convId || '').trim().slice(0, 80);
      const model = String(req.body?.model || 'lokizenith').trim().slice(0, 40);

      if (!reason || reason.length < 2) {
        return res.status(400).json({ error: 'Please enter a reason for the report.' });
      }

      const now = Date.now();
      const rec: AiReportRecord = {
        id: 'rep_' + crypto.randomBytes(6).toString('hex'),
        messageId,
        convId,
        userPrompt,
        aiResponse,
        reason,
        category,
        model,
        reporterUsername: user?.username || 'Guest',
        reporterDisplayName: user?.displayName || user?.username || 'Guest User',
        reporterId: user?.id || 'guest',
        status: 'open',
        adminNote: '',
        createdAt: now,
        updatedAt: now,
      };

      reportsCache.unshift(rec);
      if (reportsCache.length > 500) {
        reportsCache = reportsCache.slice(0, 500);
      }
      atomicWriteJson(REPORTS_FILE, reportsCache);

      deps.recordAudit?.({
        category: 'security',
        action: 'AI_MESSAGE_REPORTED',
        actor: rec.reporterUsername,
        target: rec.id,
        detail: `[${rec.category}] ${rec.reason.slice(0, 140)}`,
      });
      deps.onAdminUpdate?.();

      return res.json({ ok: true, report: rec });
    } catch (e: any) {
      return res.status(500).json({ error: e?.message || 'Could not submit report.' });
    }
  });

  app.get('/api/admin/reports', (req, res) => {
    const user = deps.getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (
      !deps.hasAdminPermission(user, 'reports') &&
      !deps.hasAdminPermission(user, 'security') &&
      !deps.hasAdminPermission(user, 'directory')
    ) {
      return res.status(403).json({ error: 'Forbidden: Reports permission required.' });
    }
    const list = getAllReports();
    return res.json({
      ok: true,
      reports: list,
      openCount: list.filter((r) => r.status !== 'resolved').length,
      totalCount: list.length,
    });
  });

  app.post('/api/admin/reports/:id/status', (req, res) => {
    const user = deps.getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (
      !deps.hasAdminPermission(user, 'reports') &&
      !deps.hasAdminPermission(user, 'security') &&
      !deps.hasAdminPermission(user, 'directory')
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const rec = reportsCache.find((r) => r.id === String(req.params.id || ''));
    if (!rec) return res.status(404).json({ error: 'Report not found.' });
    const nextStatus = String(req.body?.status || 'resolved');
    if (['open', 'reviewing', 'resolved'].includes(nextStatus)) {
      rec.status = nextStatus as AiReportRecord['status'];
    }
    if (typeof req.body?.adminNote === 'string') {
      rec.adminNote = req.body.adminNote.trim().slice(0, 500);
    }
    rec.updatedAt = Date.now();
    atomicWriteJson(REPORTS_FILE, reportsCache);
    deps.recordAudit?.({
      category: 'security',
      action: 'AI_REPORT_STATUS_UPDATED',
      actor: user.username,
      target: rec.id,
      detail: `Status -> ${rec.status}`,
    });
    deps.onAdminUpdate?.();
    return res.json({ ok: true, report: rec });
  });

  app.delete('/api/admin/reports/:id', (req, res) => {
    const user = deps.getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (
      !deps.hasAdminPermission(user, 'reports') &&
      !deps.hasAdminPermission(user, 'security')
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const idx = reportsCache.findIndex((r) => r.id === String(req.params.id || ''));
    if (idx < 0) return res.status(404).json({ error: 'Report not found.' });
    reportsCache.splice(idx, 1);
    atomicWriteJson(REPORTS_FILE, reportsCache);
    deps.onAdminUpdate?.();
    return res.json({ ok: true });
  });

  // ================= SELF-LEARNING AI KNOWLEDGE BASE =================
  app.post('/api/knowledge/learn', (req, res) => {
    try {
      const user = deps.getAuthUser(req);
      const question = String(req.body?.question || '').trim().slice(0, 1500);
      const answer = String(req.body?.answer || '').trim().slice(0, 4000);
      if (!question || !answer) return res.json({ ok: true, learned: 0 });

      const candidates = extractKnowledgeFacts(question, answer);
      const saved: KnowledgeEntry[] = [];
      for (const c of candidates) {
        const entry = addLearnedFact(c.topic, c.fact, c.tags, c.lang, user?.username || 'Community', c.confidence);
        if (entry) saved.push(entry);
      }
      if (saved.length) deps.onAdminUpdate?.();
      return res.json({ ok: true, learned: saved.length, totalFacts: knowledgeCache.length });
    } catch (_e) {
      return res.json({ ok: true, learned: 0 });
    }
  });

  let knowledgeFlushTimer: NodeJS.Timeout | null = null;
  const scheduleKnowledgeFlush = () => {
    if (knowledgeFlushTimer) return;
    knowledgeFlushTimer = setTimeout(() => {
      knowledgeFlushTimer = null;
      atomicWriteJson(KNOWLEDGE_FILE, knowledgeCache);
    }, 10000);
    knowledgeFlushTimer.unref?.();
  };

  app.post('/api/knowledge/query', (req, res) => {
    try {
      loadStores();
      const query = String(req.body?.query || '').trim().slice(0, 800);
      const limit = Math.min(6, Math.max(1, Number(req.body?.limit) || 4));
      if (!query || query.length < 4 || !knowledgeCache.length) {
        return res.json({ ok: true, items: [], contextPrompt: '' });
      }
      const matches = scoreKnowledgeMatch(query, knowledgeCache, limit);
      if (matches.length) {
        for (const m of matches) {
          m.uses = (m.uses || 0) + 1;
        }
        scheduleKnowledgeFlush();
      }
      const contextPrompt = matches.length
        ? [
            '=== LEARNED COMMUNITY KNOWLEDGE BASE (RECALLED FROM PAST CONVERSATIONS) ===',
            'Use these verified insights when relevant to enrich your answer naturally:',
            ...matches.map((m, i) => `${i + 1}. [${m.topic}] ${m.fact}`),
          ].join('\n')
        : '';
      return res.json({ ok: true, items: matches, contextPrompt });
    } catch (_e) {
      return res.json({ ok: true, items: [], contextPrompt: '' });
    }
  });

  app.get('/api/knowledge/stats', (_req, res) => {
    return res.json({ ok: true, ...getKnowledgeStats() });
  });

  app.get('/api/admin/knowledge', (req, res) => {
    const user = deps.getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (
      !deps.hasAdminPermission(user, 'knowledge') &&
      !deps.hasAdminPermission(user, 'vault') &&
      !deps.hasAdminPermission(user, 'directory')
    ) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return res.json({ ok: true, entries: getAllKnowledge(), stats: getKnowledgeStats() });
  });

  app.post('/api/admin/knowledge', (req, res) => {
    const user = deps.getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!deps.hasAdminPermission(user, 'knowledge') && !deps.hasAdminPermission(user, 'vault')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const topic = String(req.body?.topic || '').trim();
    const fact = String(req.body?.fact || '').trim();
    if (!topic || !fact || fact.length < 15) {
      return res.status(400).json({ error: 'Topic and fact (min 15 chars) are required.' });
    }
    const lang = detectTextLang(`${topic} ${fact}`, 'en');
    const tags = String(req.body?.tags || `${topic} ${fact}`)
      .toLowerCase()
      .split(/[\s,]+/)
      .filter((w) => w.length >= 2)
      .slice(0, 10);
    const saved = addLearnedFact(topic, fact, tags, lang, `Admin:${user.username}`, 0.98);
    if (!saved) {
      return res.status(400).json({ error: 'Fact could not be saved (may contain sensitive data or be too short).' });
    }
    deps.onAdminUpdate?.();
    return res.json({ ok: true, entry: saved });
  });

  app.delete('/api/admin/knowledge/:id', (req, res) => {
    const user = deps.getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (!deps.hasAdminPermission(user, 'knowledge') && !deps.hasAdminPermission(user, 'vault')) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    const idx = knowledgeCache.findIndex((k) => k.id === String(req.params.id || ''));
    if (idx < 0) return res.status(404).json({ error: 'Knowledge entry not found.' });
    knowledgeCache.splice(idx, 1);
    atomicWriteJson(KNOWLEDGE_FILE, knowledgeCache);
    deps.onAdminUpdate?.();
    return res.json({ ok: true });
  });
}
