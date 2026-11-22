import type express from 'express';
import { createTicketId } from '../utils/guestAndLength.ts';

export interface PluginActionSpec {
  name: string;
  description: string;
  write: boolean;
}

export interface PluginSpec {
  id: string;
  name: string;
  description: string;
  logo: string;
  color: string;
  auth: 'oauth' | 'none';
  scopes: string[];
  actions: PluginActionSpec[];
  envClientKey?: string;
}

export const PLUGIN_CATALOG: PluginSpec[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Search, read, summarize, draft, and send email in your Gmail account.',
    logo: '/plugin-logos/gmail.svg',
    color: '#EA4335',
    auth: 'oauth',
    envClientKey: 'GOOGLE_CLIENT_ID',
    scopes: [
      'openid',
      'email',
      'profile',
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.compose',
    ],
    actions: [
      { name: 'search', description: 'Search Gmail messages (query syntax like in:inbox from:someone)', write: false },
      { name: 'read', description: 'Read a single Gmail message by id', write: false },
      { name: 'summarize', description: 'Summarize recent inbox or a search', write: false },
      { name: 'draft', description: 'Create a Gmail draft (requires confirmation to send instead)', write: true },
      { name: 'send', description: 'Send an email (always requires confirmation)', write: true },
    ],
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'List upcoming events and create calendar events in Google Calendar.',
    logo: '/plugin-logos/calendar.svg',
    color: '#4285F4',
    auth: 'oauth',
    envClientKey: 'GOOGLE_CLIENT_ID',
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'],
    actions: [
      { name: 'list', description: 'List upcoming calendar events', write: false },
      { name: 'create', description: 'Create a new calendar event (requires confirmation)', write: true },
    ],
  },
  {
    id: 'drive',
    name: 'Google Drive',
    description: 'Search and read files stored in your Google Drive.',
    logo: '/plugin-logos/drive.svg',
    color: '#0F9D58',
    auth: 'oauth',
    envClientKey: 'GOOGLE_CLIENT_ID',
    scopes: ['openid', 'email', 'https://www.googleapis.com/auth/drive.readonly'],
    actions: [
      { name: 'search', description: 'Search Google Drive files by name or content', write: false },
      { name: 'read', description: 'Read a file summary from Google Drive', write: false },
    ],
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Search repositories, read issues and pull requests, and create GitHub issues.',
    logo: '/plugin-logos/github.svg',
    color: '#24292F',
    auth: 'oauth',
    envClientKey: 'GITHUB_CLIENT_ID',
    scopes: ['read:user', 'repo'],
    actions: [
      { name: 'repos', description: 'List or search GitHub repositories', write: false },
      { name: 'issues', description: 'List repository issues', write: false },
      { name: 'create_issue', description: 'Create a GitHub issue (requires confirmation)', write: true },
    ],
  },
  {
    id: 'spotify',
    name: 'Spotify',
    description: 'View currently playing tracks, search music, and inspect playlists.',
    logo: '/plugin-logos/spotify.svg',
    color: '#1DB954',
    auth: 'oauth',
    envClientKey: 'SPOTIFY_CLIENT_ID',
    scopes: ['user-read-currently-playing', 'playlist-read-private'],
    actions: [
      { name: 'now_playing', description: 'Show the track currently playing on Spotify', write: false },
      { name: 'search', description: 'Search songs, artists, or albums', write: false },
    ],
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'View your Discord servers and post messages to connected channels.',
    logo: '/plugin-logos/discord.svg',
    color: '#5865F2',
    auth: 'oauth',
    envClientKey: 'DISCORD_CLIENT_ID',
    scopes: ['identify', 'guilds'],
    actions: [
      { name: 'guilds', description: 'List your connected Discord servers', write: false },
      { name: 'post', description: 'Post a Discord message (requires confirmation)', write: true },
    ],
  },
  {
    id: 'dropbox',
    name: 'Dropbox',
    description: 'Browse and search documents stored in Dropbox.',
    logo: '/plugin-logos/dropbox.svg',
    color: '#0061FF',
    auth: 'oauth',
    envClientKey: 'DROPBOX_CLIENT_ID',
    scopes: ['files.metadata.read', 'files.content.read'],
    actions: [
      { name: 'list', description: 'List files in Dropbox', write: false },
      { name: 'search', description: 'Search Dropbox files', write: false },
    ],
  },
  {
    id: 'todoist',
    name: 'Todoist',
    description: 'Inspect your tasks and add new to-dos in Todoist.',
    logo: '/plugin-logos/todoist.svg',
    color: '#E44332',
    auth: 'oauth',
    envClientKey: 'TODOIST_CLIENT_ID',
    scopes: ['data:read_write'],
    actions: [
      { name: 'list', description: 'List active Todoist tasks', write: false },
      { name: 'add', description: 'Create a new Todoist task (requires confirmation)', write: true },
    ],
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Search pages and databases in your Notion workspace.',
    logo: '/plugin-logos/notion.svg',
    color: '#111111',
    auth: 'oauth',
    envClientKey: 'NOTION_CLIENT_ID',
    scopes: ['read_content'],
    actions: [
      { name: 'search', description: 'Search Notion pages and databases', write: false },
      { name: 'create_page', description: 'Create a new Notion page (requires confirmation)', write: true },
    ],
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Read channels and post updates to your Slack workspace.',
    logo: '/plugin-logos/slack.svg',
    color: '#4A154B',
    auth: 'oauth',
    envClientKey: 'SLACK_CLIENT_ID',
    scopes: ['channels:read', 'chat:write'],
    actions: [
      { name: 'channels', description: 'List Slack channels', write: false },
      { name: 'post', description: 'Post a Slack message (requires confirmation)', write: true },
    ],
  },
  {
    id: 'weather',
    name: 'Weather',
    description: 'Live global weather, temperature, wind, and forecast with no account required.',
    logo: '/plugin-logos/weather.svg',
    color: '#38BDF8',
    auth: 'none',
    scopes: [],
    actions: [
      { name: 'current', description: 'Get current weather and forecast for any city', write: false },
    ],
  },
  {
    id: 'wikipedia',
    name: 'Wikipedia',
    description: 'Search and read concise Wikipedia articles instantly with no account required.',
    logo: '/plugin-logos/wikipedia.svg',
    color: '#94A3B8',
    auth: 'none',
    scopes: [],
    actions: [
      { name: 'search', description: 'Search Wikipedia articles', write: false },
      { name: 'summary', description: 'Get the summary of a Wikipedia article', write: false },
    ],
  },
];

// Per-user connected plugins state (stored in memory; OAuth tokens never exposed to client)
const userConnections = new Map<string, Set<string>>();
const pendingTickets = new Map<
  string,
  { plugin: string; action: string; params: Record<string, unknown>; userId: string; createdAt: number }
>();

export function buildPluginCatalogForUser(userId?: string) {
  const connectedSet = userId ? userConnections.get(userId) : undefined;
  return PLUGIN_CATALOG.map((p) => {
    const isNoAuth = p.auth === 'none';
    const configured = isNoAuth || Boolean(p.envClientKey && process.env[p.envClientKey]);
    const connected = isNoAuth || Boolean(connectedSet?.has(p.id));
    return {
      id: p.id,
      name: p.name,
      description: p.description,
      logo: p.logo,
      color: p.color,
      auth: p.auth,
      configured,
      connected,
      scopes: p.scopes,
      actions: p.actions,
    };
  });
}

export async function runLiveWeatherLookup(city: string): Promise<string> {
  const q = String(city || 'New York').trim();
  const geoRes = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=en&format=json`,
    { signal: AbortSignal.timeout(6000) }
  );
  if (!geoRes.ok) throw new Error('Geocoding service unavailable');
  const geo = (await geoRes.json()) as any;
  const hit = geo?.results?.[0];
  if (!hit) return `No weather location found for "${q}".`;
  const wRes = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${hit.latitude}&longitude=${hit.longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code&daily=temperature_2m_max,temperature_2m_min&timezone=auto&forecast_days=3`,
    { signal: AbortSignal.timeout(6000) }
  );
  if (!wRes.ok) throw new Error('Weather API unavailable');
  const w = (await wRes.json()) as any;
  const cur = w?.current || {};
  const place = [hit.name, hit.admin1, hit.country].filter(Boolean).join(', ');
  return `Weather in ${place}: ${cur.temperature_2m ?? '?'}°C (feels like ${cur.apparent_temperature ?? '?'}°C), humidity ${cur.relative_humidity_2m ?? '?'}%, wind ${cur.wind_speed_10m ?? '?'} km/h.`;
}

export async function runLiveWikipediaLookup(query: string): Promise<string> {
  const q = String(query || '').trim();
  if (!q) return 'Please provide a topic to look up on Wikipedia.';
  const sRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=3&format=json`,
    { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'LokizenithAI/2.7' } }
  );
  if (!sRes.ok) throw new Error('Wikipedia search unavailable');
  const sData = (await sRes.json()) as any;
  const topTitle = Array.isArray(sData?.[1]) ? sData[1][0] : q;
  if (!topTitle) return `No Wikipedia article found for "${q}".`;
  const sumRes = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topTitle)}`,
    { signal: AbortSignal.timeout(6000), headers: { 'User-Agent': 'LokizenithAI/2.7' } }
  );
  if (!sumRes.ok) return `Found Wikipedia topic "${topTitle}", but summary could not be loaded.`;
  const sum = (await sumRes.json()) as any;
  const url = sum?.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(topTitle)}`;
  return `${sum.title || topTitle}: ${sum.extract || 'No summary available.'}\nSource: ${url}`;
}

export function createPluginConfirmationTicket(
  userId: string,
  plugin: string,
  action: string,
  params: Record<string, unknown>
): string {
  const ticket = createTicketId();
  pendingTickets.set(ticket, { plugin, action, params, userId, createdAt: Date.now() });
  return ticket;
}

export function registerPluginRoutes(
  app: express.Express,
  getAuthUser: (req: express.Request) => { id: string; username?: string } | undefined
): void {
  app.get('/api/plugins/catalog', (req, res) => {
    const user = getAuthUser(req);
    return res.json({
      ok: true,
      plugins: buildPluginCatalogForUser(user?.id),
    });
  });

  app.get('/api/plugins/connect/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ ok: false, error: 'Sign in first to connect plugins.' });
    }
    const id = String(req.params.id || '').trim().toLowerCase();
    const spec = PLUGIN_CATALOG.find((p) => p.id === id);
    if (!spec) {
      return res.status(404).json({ ok: false, error: `Unknown plugin "${id}".` });
    }
    if (spec.auth === 'none') {
      return res.json({ ok: true, connected: true, message: `${spec.name} is ready immediately with no account.` });
    }
    const clientId = spec.envClientKey ? String(process.env[spec.envClientKey] || '').trim() : '';
    if (!clientId) {
      return res.status(400).json({
        ok: false,
        error: `${spec.name} OAuth is not configured on this server yet (missing ${spec.envClientKey || 'OAuth credentials'}).`,
      });
    }
    const origin = String(req.query?.origin || process.env.APP_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const redirectUri = `${origin}/api/plugins/callback/${encodeURIComponent(spec.id)}`;
    const state = Buffer.from(JSON.stringify({ uid: user.id, plugin: spec.id, ts: Date.now() })).toString('base64url');

    let authUrl = '';
    if (['gmail', 'calendar', 'drive'].includes(spec.id)) {
      authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&access_type=offline&prompt=consent` +
        `&scope=${encodeURIComponent(spec.scopes.join(' '))}&state=${encodeURIComponent(state)}`;
    } else if (spec.id === 'github') {
      authUrl =
        `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(clientId)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(spec.scopes.join(' '))}&state=${encodeURIComponent(state)}`;
    } else {
      return res.status(400).json({
        ok: false,
        error: `${spec.name} OAuth authorization URL requires provider configuration.`,
      });
    }
    return res.json({ ok: true, url: authUrl });
  });

  app.post('/api/plugins/disconnect/:id', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ ok: false, error: 'Unauthorized' });
    const id = String(req.params.id || '').trim().toLowerCase();
    userConnections.get(user.id)?.delete(id);
    return res.json({ ok: true, disconnected: id });
  });

  app.post('/api/plugins/execute', async (req, res) => {
    try {
      const user = getAuthUser(req);
      const ticket = String(req.body?.ticket || '').trim();
      if (ticket) {
        const saved = pendingTickets.get(ticket);
        if (!saved) {
          return res.status(404).json({ ok: false, error: 'Confirmation ticket expired or not found.' });
        }
        if (user && saved.userId && saved.userId !== user.id) {
          return res.status(403).json({ ok: false, error: 'Ticket belongs to a different account.' });
        }
        pendingTickets.delete(ticket);
        return res.json({
          ok: true,
          summary: `Confirmed ${saved.plugin}.${saved.action} action.`,
        });
      }

      const plugin = String(req.body?.plugin || '').trim().toLowerCase();
      const query = String(req.body?.query || req.body?.city || req.body?.topic || '').trim();
      if (plugin === 'weather') {
        const summary = await runLiveWeatherLookup(query || 'New York');
        return res.json({ ok: true, plugin: 'weather', summary });
      }
      if (plugin === 'wikipedia') {
        const summary = await runLiveWikipediaLookup(query);
        return res.json({ ok: true, plugin: 'wikipedia', summary });
      }
      return res.status(400).json({ ok: false, error: `Plugin "${plugin}" is not connected or requires confirmation.` });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: e?.message || 'Plugin execution failed' });
    }
  });
}
