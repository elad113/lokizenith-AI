import path from 'path';
import crypto from 'crypto';
import type express from 'express';

interface BotMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  botId?: string;
  botName?: string;
  ts: number;
}

interface BotRecord {
  id: string;
  name: string;
  role: string;
  instructions: string;
  mascot: string;
  color: string;
  memory: string[];
  messages: BotMessage[];
  running: boolean;
  createdAt: number;
}

interface BotGroupRecord {
  id: string;
  name: string;
  botIds: string[];
  messages: BotMessage[];
  createdAt: number;
}

interface UserLokiBotState {
  bots: BotRecord[];
  groups: BotGroupRecord[];
}

const stateByUser = new Map<string, UserLokiBotState>();

function makeId(prefix: string): string {
  return `${prefix}_${crypto.randomBytes(6).toString('hex')}`;
}

function getUserState(userId: string): UserLokiBotState {
  let st = stateByUser.get(userId);
  if (!st) {
    const starterBot: BotRecord = {
      id: makeId('bot'),
      name: 'Pebble',
      role: 'Full-Stack Research & Coding Assistant',
      instructions: 'Be concise, practical, and helpful. Assist with coding, planning, and technical research.',
      mascot: 'pebble',
      color: '#10e39a',
      memory: ['Prefers clean, concise answers'],
      messages: [],
      running: false,
      createdAt: Date.now(),
    };
    st = { bots: [starterBot], groups: [] };
    stateByUser.set(userId, st);
  }
  return st;
}

export function registerLokiBotRoutes(
  app: express.Express,
  getAuthUser: (req: express.Request) => { id: string; username?: string } | undefined,
  generateBotReply: (systemPrompt: string, history: { role: string; content: string }[]) => Promise<string>
): void {
  // Serve the embedded / standalone LokiBot workspace page
  app.get(['/lokibot/app', '/lokibot'], (_req, res) => {
    return res.sendFile(path.resolve(process.cwd(), 'public', 'lokibot.html'));
  });

  app.get('/api/lokibot/state', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Sign in to use LokiBot.' });
    const st = getUserState(user.id);
    return res.json({
      bots: st.bots,
      groups: st.groups,
      computer: { connected: false, mode: 'sandbox' },
      usage: { minutesUsed: 0, minutesLimit: 120, activeBots: st.bots.filter((b) => b.running).length },
      maxBots: 6,
    });
  });

  app.post('/api/lokibot/bots', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const st = getUserState(user.id);
    if (st.bots.length >= 6) return res.status(400).json({ error: 'Maximum of 6 bots reached.' });
    const bot: BotRecord = {
      id: makeId('bot'),
      name: String(req.body?.name || 'New Bot').trim().slice(0, 40) || 'New Bot',
      role: String(req.body?.role || 'Assistant').trim().slice(0, 80),
      instructions: String(req.body?.instructions || '').trim().slice(0, 2000),
      mascot: String(req.body?.mascot || 'pebble').trim(),
      color: String(req.body?.color || '#10e39a').trim(),
      memory: [],
      messages: [],
      running: false,
      createdAt: Date.now(),
    };
    st.bots.push(bot);
    return res.json({ ok: true, bot });
  });

  app.patch('/api/lokibot/bots/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const st = getUserState(user.id);
    const bot = st.bots.find((b) => b.id === req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });
    if (typeof req.body?.name === 'string' && req.body.name.trim()) bot.name = req.body.name.trim().slice(0, 40);
    if (typeof req.body?.role === 'string') bot.role = req.body.role.trim().slice(0, 80);
    if (typeof req.body?.instructions === 'string') bot.instructions = req.body.instructions.trim().slice(0, 2000);
    if (typeof req.body?.mascot === 'string') bot.mascot = req.body.mascot.trim();
    if (typeof req.body?.color === 'string') bot.color = req.body.color.trim();
    if (Array.isArray(req.body?.memory)) {
      bot.memory = req.body.memory.map((x: unknown) => String(x || '').trim()).filter(Boolean).slice(0, 40);
    }
    return res.json({ ok: true, bot });
  });

  app.delete('/api/lokibot/bots/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const st = getUserState(user.id);
    st.bots = st.bots.filter((b) => b.id !== req.params.id);
    st.groups.forEach((g) => {
      g.botIds = g.botIds.filter((id) => id !== req.params.id);
    });
    return res.json({ ok: true });
  });

  app.post('/api/lokibot/bots/:id/chat', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const st = getUserState(user.id);
    const bot = st.bots.find((b) => b.id === req.params.id);
    if (!bot) return res.status(404).json({ error: 'Bot not found' });

    const text = String(req.body?.text || req.body?.message || '').trim();
    if (!text) return res.status(400).json({ error: 'Empty message' });

    bot.messages.push({ id: makeId('m'), role: 'user', content: text, ts: Date.now() });
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders?.();

    const sys = `You are ${bot.name} (${bot.role}). ${bot.instructions}\nMemory: ${bot.memory.join('; ') || 'None'}`;
    try {
      const reply = await generateBotReply(
        sys,
        bot.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }))
      );
      const botMsg: BotMessage = { id: makeId('m'), role: 'assistant', content: reply, botId: bot.id, botName: bot.name, ts: Date.now() };
      bot.messages.push(botMsg);
      res.write(`data: ${JSON.stringify({ type: 'delta', delta: reply, botId: bot.id })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', message: botMsg })}\n\n`);
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: e?.message || 'Bot reply failed' })}\n\n`);
    } finally {
      if (!res.writableEnded) res.end();
    }
  });

  app.post('/api/lokibot/groups', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const st = getUserState(user.id);
    const group: BotGroupRecord = {
      id: makeId('grp'),
      name: String(req.body?.name || 'Bot Team').trim().slice(0, 48) || 'Bot Team',
      botIds: Array.isArray(req.body?.botIds) ? req.body.botIds.map(String) : st.bots.slice(0, 2).map((b) => b.id),
      messages: [],
      createdAt: Date.now(),
    };
    st.groups.push(group);
    return res.json({ ok: true, group });
  });

  app.delete('/api/lokibot/groups/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const st = getUserState(user.id);
    st.groups = st.groups.filter((g) => g.id !== req.params.id);
    return res.json({ ok: true });
  });

  app.post('/api/lokibot/groups/:id/chat', async (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    const st = getUserState(user.id);
    const group = st.groups.find((g) => g.id === req.params.id);
    if (!group) return res.status(404).json({ error: 'Group not found' });

    const text = String(req.body?.text || req.body?.message || '').trim();
    if (!text) return res.status(400).json({ error: 'Empty message' });
    group.messages.push({ id: makeId('m'), role: 'user', content: text, ts: Date.now() });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.flushHeaders?.();

    const members = group.botIds.map((id) => st.bots.find((b) => b.id === id)).filter(Boolean) as BotRecord[];
    const responder = members[0];
    if (!responder) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: 'No bots in this team.' })}\n\n`);
      return res.end();
    }
    try {
      const sys = `You are ${responder.name} (${responder.role}) collaborating in team "${group.name}". ${responder.instructions}`;
      const reply = await generateBotReply(
        sys,
        group.messages.slice(-12).map((m) => ({ role: m.role, content: m.content }))
      );
      const botMsg: BotMessage = {
        id: makeId('m'),
        role: 'assistant',
        content: reply,
        botId: responder.id,
        botName: responder.name,
        ts: Date.now(),
      };
      group.messages.push(botMsg);
      res.write(`data: ${JSON.stringify({ type: 'delta', delta: reply, botId: responder.id, botName: responder.name })}\n\n`);
      res.write(`data: ${JSON.stringify({ type: 'done', message: botMsg })}\n\n`);
    } catch (e: any) {
      res.write(`data: ${JSON.stringify({ type: 'error', error: e?.message || 'Team reply failed' })}\n\n`);
    } finally {
      if (!res.writableEnded) res.end();
    }
  });
}
