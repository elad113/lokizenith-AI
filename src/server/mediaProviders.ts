import { GoogleGenAI } from '@google/genai';

export interface ImageGenResult {
  dataUrl: string;
  provider: string;
  model: string;
  chainTried?: string[];
}

export interface VideoGenResult {
  dataUrl: string;
  keyframeUrl?: string;
  mimeType: string;
  provider: string;
  model: string;
  duration: number;
  ratio: string;
  width: number;
  height: number;
  isNeuralVideo: boolean;
  keyframes?: string[];
  chainTried?: string[];
}

export interface ProviderInfo {
  id: string;
  name: string;
  model: string;
  kind: 'neural-video' | 'image';
  configured: boolean;
  freeTier: boolean;
}

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
  });
}

function detectImageMime(buf: Buffer): string | null {
  if (!buf || buf.length < 12) return null;
  // JPEG
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  // PNG
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  // WebP
  if (buf.subarray(0, 4).toString('ascii') === 'RIFF' && buf.subarray(8, 12).toString('ascii') === 'WEBP') {
    return 'image/webp';
  }
  // GIF
  if (buf.subarray(0, 3).toString('ascii') === 'GIF') return 'image/gif';
  return null;
}

async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs = 20000): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctl.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function callGradioImageSpace(
  baseUrl: string,
  endpoint: string,
  dataPayload: any[],
  timeoutMs = 26000
): Promise<Buffer | null> {
  try {
    const startRes = await fetchWithTimeout(
      `${baseUrl}/gradio_api/call/${endpoint}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'User-Agent': 'LokizenithAI/2.9' },
        body: JSON.stringify({ data: dataPayload }),
      },
      12000
    );
    if (!startRes.ok) return null;
    const startJson: any = await startRes.json();
    const eventId = startJson?.event_id;
    if (!eventId) return null;

    const sseRes = await fetchWithTimeout(
      `${baseUrl}/gradio_api/call/${endpoint}/${eventId}`,
      { headers: { Accept: 'text/event-stream', 'User-Agent': 'LokizenithAI/2.9' } },
      timeoutMs
    );
    if (!sseRes.ok) return null;
    const rawText = await sseRes.text();
    const dataLines = rawText
      .split('\n')
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trim());

    let imgUrl = '';
    for (let i = dataLines.length - 1; i >= 0; i--) {
      try {
        const parsed = JSON.parse(dataLines[i]);
        const findImgUrl = (obj: any): string => {
          if (!obj) return '';
          if (typeof obj === 'string') {
            if (/^https?:\/\/.+\.(webp|png|jpg|jpeg)/i.test(obj) || obj.includes('/gradio_api/file=')) return obj;
            return '';
          }
          if (Array.isArray(obj)) {
            for (const item of obj) {
              const found = findImgUrl(item);
              if (found) return found;
            }
          } else if (typeof obj === 'object') {
            if (typeof obj.url === 'string' && obj.url.startsWith('http')) return obj.url;
            if (typeof obj.path === 'string' && /\.(webp|png|jpg|jpeg)$/i.test(obj.path)) {
              return `${baseUrl}/gradio_api/file=${obj.path}`;
            }
            for (const v of Object.values(obj)) {
              const found = findImgUrl(v);
              if (found) return found;
            }
          }
          return '';
        };
        imgUrl = findImgUrl(parsed);
        if (imgUrl) break;
      } catch (_e) {}
    }

    if (!imgUrl) return null;
    const imgRes = await fetchWithTimeout(imgUrl, { headers: { 'User-Agent': 'LokizenithAI/2.9' } }, 15000);
    if (!imgRes.ok) return null;
    const buf = Buffer.from(await imgRes.arrayBuffer());
    if (buf.length < 2500 || !detectImageMime(buf)) return null;
    return buf;
  } catch (_e) {
    return null;
  }
}

/**
 * Multi-Provider Image Generation Chain (12-tier fallback for maximum reliability)
 * Configured Key Tiers:
 *   1. Gemini Native Image (`gemini-3.1-flash-lite-image` -> `imagen-3.0-generate-002`)
 *   2. Fal.ai FLUX Schnell (`FAL_KEY`)
 *   3. Pollinations Authenticated (`POLLINATIONS_API_KEY`)
 *   4. HuggingFace Inference Router (`HF_TOKEN`)
 *   5. Together.ai FLUX (`TOGETHER_API_KEY`)
 * Free Live Zero-Key Tiers (Verified Active):
 *   6. Black Forest Labs FLUX.1-Schnell (HuggingFace ZeroGPU Space)
 *   7. Stability AI Stable Diffusion 3.5 Large Turbo (HuggingFace ZeroGPU Space)
 *   8. Z-Image-Turbo (HuggingFace ZeroGPU Space)
 *   9. Evalstate FLUX.1-Schnell Mirror (HuggingFace ZeroGPU Space)
 *  10. AI Horde / Stable Horde Distributed GPU Cluster
 *  11. Pollinations Free Opportunistic (`turbo` -> `flux` -> `sana`)
 *  12. Airforce & Kepler OVH SDXL Opportunistic
 */
export async function generateImageChain(
  prompt: string,
  width = 1024,
  height = 1024
): Promise<ImageGenResult> {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Prompt is required');

  const w = Math.min(1280, Math.max(512, Math.round(Number(width) || 1024)));
  const h = Math.min(1280, Math.max(512, Math.round(Number(height) || 1024)));
  const seed = Math.floor(Math.random() * 1_000_000_000);
  const chainTried: string[] = [];

  // 1. Gemini Image Generation (if GEMINI_API_KEY configured)
  const ai = getGenAIClient();
  if (ai) {
    chainTried.push('gemini-3.1-flash-lite-image');
    try {
      const res = await ai.models.generateContent({
        model: 'gemini-3.1-flash-lite-image',
        contents: cleanPrompt,
        config: {
          responseModalities: ['IMAGE'],
        },
      });
      const parts = res.candidates?.[0]?.content?.parts || [];
      for (const p of parts) {
        if (p.inlineData?.data) {
          const mime = p.inlineData.mimeType || 'image/png';
          return {
            dataUrl: `data:${mime};base64,${p.inlineData.data}`,
            provider: 'Gemini Flash Image',
            model: 'gemini-3.1-flash-lite-image',
            chainTried,
          };
        }
      }
    } catch (_e) {}

    chainTried.push('imagen-3.0-generate-002');
    try {
      const res = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: cleanPrompt,
        config: { numberOfImages: 1, aspectRatio: w > h ? '16:9' : h > w ? '9:16' : '1:1', outputMimeType: 'image/jpeg' },
      });
      const b64 = res.generatedImages?.[0]?.image?.imageBytes;
      if (b64) {
        return {
          dataUrl: `data:image/jpeg;base64,${b64}`,
          provider: 'Google Imagen 3',
          model: 'imagen-3.0-generate-002',
          chainTried,
        };
      }
    } catch (_e) {}
  }

  // 2. Fal.ai FLUX Schnell (if FAL_KEY configured)
  if (process.env.FAL_KEY) {
    chainTried.push('fal-flux-schnell');
    try {
      const r = await fetchWithTimeout(
        'https://fal.run/fal-ai/flux/schnell',
        {
          method: 'POST',
          headers: {
            Authorization: `Key ${process.env.FAL_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            image_size: { width: w, height: h },
            num_images: 1,
          }),
        },
        22000
      );
      if (r.ok) {
        const j: any = await r.json();
        const imgUrl = j?.images?.[0]?.url;
        if (imgUrl) {
          const ir = await fetchWithTimeout(imgUrl, {}, 15000);
          const buf = Buffer.from(await ir.arrayBuffer());
          const mime = detectImageMime(buf);
          if (mime) {
            return {
              dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
              provider: 'Fal.ai FLUX',
              model: 'fal-ai/flux/schnell',
              chainTried,
            };
          }
        }
      }
    } catch (_e) {}
  }

  // 3. Authenticated Pollinations (when POLLINATIONS_API_KEY configured)
  const polliKey = process.env.POLLINATIONS_API_KEY;
  if (polliKey) {
    for (const pm of [
      { model: 'flux', label: 'Pollinations FLUX' },
      { model: 'turbo', label: 'Pollinations Turbo' },
    ]) {
      chainTried.push(`pollinations-auth:${pm.model}`);
      try {
        const encoded = encodeURIComponent(cleanPrompt.slice(0, 800));
        const url = `https://gen.pollinations.ai/image/${encoded}?width=${w}&height=${h}&model=${encodeURIComponent(pm.model)}&nologo=true&enhance=true&seed=${seed}`;
        const r = await fetchWithTimeout(
          url,
          { headers: { Authorization: `Bearer ${polliKey}`, 'User-Agent': 'LokizenithAI/2.9', Accept: 'image/*' } },
          22000
        );
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          const mime = detectImageMime(buf);
          if (mime && buf.length > 2500) {
            return {
              dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
              provider: pm.label,
              model: pm.model,
              chainTried,
            };
          }
        }
      } catch (_e) {}
    }
  }

  // 4. HuggingFace Inference Router (when HF_TOKEN configured)
  if (process.env.HF_TOKEN) {
    for (const hfModel of ['black-forest-labs/FLUX.1-schnell', 'stabilityai/stable-diffusion-xl-base-1.0']) {
      chainTried.push(`hf:${hfModel}`);
      try {
        const r = await fetchWithTimeout(
          `https://router.huggingface.co/hf-inference/models/${hfModel}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${process.env.HF_TOKEN}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ inputs: cleanPrompt }),
          },
          24000
        );
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          const mime = detectImageMime(buf);
          if (mime) {
            return {
              dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
              provider: 'HuggingFace FLUX/SDXL',
              model: hfModel,
              chainTried,
            };
          }
        }
      } catch (_e) {}
    }
  }

  // 5. Together.ai FLUX Schnell (when TOGETHER_API_KEY configured)
  if (process.env.TOGETHER_API_KEY) {
    chainTried.push('together-flux');
    try {
      const r = await fetchWithTimeout(
        'https://api.together.xyz/v1/images/generations',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'black-forest-labs/FLUX.1-schnell-Free',
            prompt: cleanPrompt,
            width: Math.min(w, 1024),
            height: Math.min(h, 1024),
            steps: 4,
            n: 1,
            response_format: 'b64_json',
          }),
        },
        22000
      );
      if (r.ok) {
        const j: any = await r.json();
        const b64 = j?.data?.[0]?.b64_json;
        if (b64) {
          return {
            dataUrl: `data:image/png;base64,${b64}`,
            provider: 'Together FLUX.1 Schnell',
            model: 'FLUX.1-schnell-Free',
            chainTried,
          };
        }
      }
    } catch (_e) {}
  }

  // 6-9. Verified Free Live HuggingFace ZeroGPU Gradio Image Spaces (fast ~3-6s, high quality!)
  const gw = Math.min(1024, Math.max(512, Math.round(w / 64) * 64));
  const gh = Math.min(1024, Math.max(512, Math.round(h / 64) * 64));
  const gradioSpaces: Array<{
    id: string;
    label: string;
    model: string;
    baseUrl: string;
    endpoint: string;
    payload: any[];
    timeoutMs: number;
  }> = [
    {
      id: 'hf-space:flux-1-schnell',
      label: 'FLUX.1-Schnell (Black Forest Labs)',
      model: 'FLUX.1-schnell',
      baseUrl: 'https://black-forest-labs-flux-1-schnell.hf.space',
      endpoint: 'infer',
      payload: [cleanPrompt, seed % 2147483647, true, gw, gh, 4],
      timeoutMs: 24000,
    },
    {
      id: 'hf-space:sd-3.5-large-turbo',
      label: 'Stable Diffusion 3.5 Large Turbo',
      model: 'SD-3.5-Large-Turbo',
      baseUrl: 'https://stabilityai-stable-diffusion-3-5-large-turbo.hf.space',
      endpoint: 'infer',
      payload: [cleanPrompt, '', seed % 2147483647, true, gw, gh, 0, 4],
      timeoutMs: 24000,
    },
    {
      id: 'hf-space:z-image-turbo',
      label: 'Z-Image-Turbo',
      model: 'Z-Image-Turbo',
      baseUrl: 'https://mrfakename-z-image-turbo.hf.space',
      endpoint: 'generate_image',
      payload: [cleanPrompt, gh, gw, 8, seed % 2147483647, true],
      timeoutMs: 24000,
    },
    {
      id: 'hf-space:evalstate-flux-schnell',
      label: 'FLUX.1-Schnell Mirror',
      model: 'FLUX.1-schnell',
      baseUrl: 'https://evalstate-flux1-schnell.hf.space',
      endpoint: 'infer',
      payload: [cleanPrompt, seed % 2147483647, true, gw, gh, 4],
      timeoutMs: 22000,
    },
  ];

  for (const sp of gradioSpaces) {
    chainTried.push(sp.id);
    const buf = await callGradioImageSpace(sp.baseUrl, sp.endpoint, sp.payload, sp.timeoutMs);
    if (buf) {
      const mime = detectImageMime(buf) || 'image/webp';
      return {
        dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
        provider: sp.label,
        model: sp.model,
        chainTried,
      };
    }
  }

  // 10. Pollinations Free Opportunistic Fallback (Turbo -> FLUX -> Sana)
  for (const pm of [
    { model: 'turbo', label: 'Pollinations Turbo' },
    { model: 'flux', label: 'Pollinations FLUX' },
    { model: 'sana', label: 'Pollinations Sana' },
  ]) {
    chainTried.push(`pollinations:${pm.model}`);
    try {
      const encoded = encodeURIComponent(cleanPrompt.slice(0, 700));
      const url = `https://image.pollinations.ai/prompt/${encoded}?width=${gw}&height=${gh}&model=${encodeURIComponent(pm.model)}&nologo=true&seed=${seed}`;
      const r = await fetchWithTimeout(url, { headers: { 'User-Agent': 'LokizenithAI/2.9', Accept: 'image/*' } }, 14000);
      if (r.ok) {
        const buf = Buffer.from(await r.arrayBuffer());
        const mime = detectImageMime(buf);
        if (mime && buf.length > 2500) {
          return {
            dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
            provider: pm.label,
            model: pm.model,
            chainTried,
          };
        }
      }
    } catch (_e) {}
  }

  // 11. Stable Horde / AI Horde Distributed GPU Cluster (free open-source fallback)
  for (const hordeHost of ['https://stablehorde.net', 'https://aihorde.net']) {
    chainTried.push(`horde:${hordeHost.includes('stable') ? 'stablehorde' : 'aihorde'}`);
    try {
      const initRes = await fetchWithTimeout(
        `${hordeHost}/api/v2/generate/async`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.AI_HORDE_API_KEY || '0000000000',
            'Client-Agent': 'LokizenithAI:2.9:support@lokizenith.com',
          },
          body: JSON.stringify({
            prompt: cleanPrompt,
            params: { width: 512, height: 512, steps: 20, n: 1 },
          }),
        },
        10000
      );
      if (initRes.ok) {
        const initData: any = await initRes.json();
        const jobId = initData?.id;
        if (jobId) {
          const pollStart = Date.now();
          while (Date.now() - pollStart < 24000) {
            await new Promise((r) => setTimeout(r, 2000));
            const checkRes = await fetchWithTimeout(`${hordeHost}/api/v2/generate/status/${jobId}`, {}, 6000);
            if (checkRes.ok) {
              const checkData: any = await checkRes.json();
              if (checkData.done && checkData.generations?.[0]?.img) {
                const imgData = String(checkData.generations[0].img);
                if (imgData.startsWith('http')) {
                  const imgFetch = await fetchWithTimeout(imgData, {}, 12000);
                  const buf = Buffer.from(await imgFetch.arrayBuffer());
                  const mime = detectImageMime(buf) || 'image/webp';
                  return {
                    dataUrl: `data:${mime};base64,${buf.toString('base64')}`,
                    provider: 'AI Horde GPU Cluster',
                    model: 'SDXL Community',
                    chainTried,
                  };
                }
                return {
                  dataUrl: `data:image/webp;base64,${imgData}`,
                  provider: 'AI Horde GPU Cluster',
                  model: 'SDXL Community',
                  chainTried,
                };
              }
            }
          }
        }
      }
    } catch (_e) {}
  }

  // 12. Kepler OVH SDXL Opportunistic Fallback
  chainTried.push('kepler-sdxl');
  try {
    const r = await fetchWithTimeout(
      'https://oai.endpoints.kepler.ai.cloud.ovh.net/v1/images/generations',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'stable-diffusion-xl-base-v10',
          prompt: cleanPrompt,
          n: 1,
          size: '1024x1024',
          response_format: 'b64_json',
        }),
      },
      15000
    );
    if (r.ok) {
      const j: any = await r.json();
      const b64 = j?.data?.[0]?.b64_json;
      if (b64) {
        return {
          dataUrl: `data:image/png;base64,${b64}`,
          provider: 'Kepler OVH SDXL',
          model: 'stable-diffusion-xl-base-v10',
          chainTried,
        };
      }
    }
  } catch (_e) {}

  throw new Error(`All ${chainTried.length} image generation providers are temporarily busy. Please try again.`);
}

async function callGradioVideoSpace(
  baseUrl: string,
  endpoint: string,
  dataPayload: unknown[],
  timeoutMs = 38000
): Promise<{ videoUrl: string } | null> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'User-Agent': 'LokizenithAI/2.8',
  };
  if (process.env.HF_TOKEN) headers.Authorization = `Bearer ${process.env.HF_TOKEN}`;

  const submit = await fetchWithTimeout(
    `${baseUrl}/gradio_api/call/${endpoint}`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({ data: dataPayload }),
    },
    10000
  );
  if (!submit.ok) return null;
  const subJson: any = await submit.json().catch(() => null);
  const eventId = subJson?.event_id;
  if (!eventId) return null;

  const streamRes = await fetchWithTimeout(
    `${baseUrl}/gradio_api/call/${endpoint}/${eventId}`,
    { headers },
    timeoutMs
  );
  if (!streamRes.ok) return null;
  const rawText = await streamRes.text();
  if (/event:\s*error/i.test(rawText)) return null;

  // Parse SSE `event: complete` -> `data: [...]`
  const dataLines = rawText
    .split('\n')
    .filter((line) => line.startsWith('data:'))
    .map((line) => line.slice(5).trim());

  for (let i = dataLines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(dataLines[i]);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      for (const item of items) {
        const candidateUrl =
          item?.video?.url ||
          item?.url ||
          (typeof item === 'string' && /^https?:\/\//.test(item) ? item : null);
        if (candidateUrl) {
          return { videoUrl: candidateUrl };
        }
        const candidatePath = item?.video?.path || item?.path;
        if (candidatePath && typeof candidatePath === 'string') {
          const full = candidatePath.startsWith('http')
            ? candidatePath
            : `${baseUrl}/gradio_api/file=${candidatePath}`;
          return { videoUrl: full };
        }
      }
    } catch (_e) {}
  }
  return null;
}

async function downloadVideoAsDataUrl(url: string, timeoutMs = 20000): Promise<{ dataUrl: string; mimeType: string } | null> {
  const r = await fetchWithTimeout(url, { headers: { 'User-Agent': 'LokizenithAI/2.8' } }, timeoutMs);
  if (!r.ok) return null;
  const ct = String(r.headers.get('content-type') || 'video/mp4').split(';')[0].trim();
  if (!ct.startsWith('video/') && !ct.includes('octet-stream')) return null;
  const buf = Buffer.from(await r.arrayBuffer());
  if (buf.length < 4096) return null;
  const mimeType = ct.startsWith('video/') ? ct : 'video/mp4';
  return {
    dataUrl: `data:${mimeType};base64,${buf.toString('base64')}`,
    mimeType,
  };
}

export function getVideoProvidersCatalog(): ProviderInfo[] {
  return [
    { id: 'fal-wan2.1', name: 'Fal.ai Wan 2.1 T2V', model: 'fal-ai/wan/v2.1/1.3b/text-to-video', kind: 'neural-video', configured: !!process.env.FAL_KEY, freeTier: false },
    { id: 'replicate-wan2.1', name: 'Replicate Wan 2.1 / LTX', model: 'wan-video/wan-2.1-t2v-480p', kind: 'neural-video', configured: !!process.env.REPLICATE_API_TOKEN, freeTier: false },
    { id: 'luma-ray2', name: 'Luma Dream Machine Ray 2', model: 'ray-2', kind: 'neural-video', configured: !!process.env.LUMA_API_KEY, freeTier: false },
    { id: 'runway-gen4', name: 'Runway Gen-4 Turbo', model: 'gen4_turbo', kind: 'neural-video', configured: !!process.env.RUNWAY_API_KEY, freeTier: false },
    { id: 'pollinations-seedance', name: 'Pollinations Seedance / Veo', model: 'seedance', kind: 'neural-video', configured: !!process.env.POLLINATIONS_API_KEY, freeTier: false },
    { id: 'hf-ltx-video', name: 'Lightricks LTX-Video Distilled', model: 'Lightricks/LTX-Video', kind: 'neural-video', configured: true, freeTier: true },
    { id: 'hf-wan2.1-fast', name: 'Alibaba Wan 2.1 Fast', model: 'Wan-AI/Wan2.1-T2V-14B', kind: 'neural-video', configured: true, freeTier: true },
    { id: 'airforce-video', name: 'Airforce Video (Veo / Wan 2.5)', model: 'wan2.5-t2v', kind: 'neural-video', configured: true, freeTier: true },
    { id: 'multi-keyframe-cine', name: 'Multi-Keyframe AI Motion Engine', model: 'Lokizen ReWind 2.0', kind: 'neural-video', configured: true, freeTier: true },
  ];
}

/**
 * Multi-Provider AI Video Generation Chain (Web's Top Neural Video Models + Multi-Keyframe Fallback)
 * 1. Fal.ai (Wan 2.1 / LTX-Video) when FAL_KEY set
 * 2. Replicate (Wan 2.1 T2V / LTX-Video) when REPLICATE_API_TOKEN set
 * 3. Luma Dream Machine (Ray 2) when LUMA_API_KEY set
 * 4. Pollinations Video Gateway (Seedance / Veo) when POLLINATIONS_API_KEY set
 * 5. Lightricks LTX-Video Distilled (Free ZeroGPU Space)
 * 6. Alibaba Wan 2.1 Fast (Free ZeroGPU Space)
 * 7. Airforce Video Gateway (`wan2.5-t2v` / `veo_3_1-fast` / `seedance-2.5`)
 * 8. Multi-Keyframe AI Cinematic Storyboard (generates 2 distinct progressive AI keyframes for smooth WebM motion)
 */
export async function generateVideoChain(
  prompt: string,
  opts: { duration?: number; ratio?: string; sourceImageUrl?: string } = {}
): Promise<VideoGenResult> {
  const cleanPrompt = String(prompt || '').trim();
  if (!cleanPrompt) throw new Error('Video prompt is required');

  const duration = Math.min(8, Math.max(2, Math.round(Number(opts.duration) || 4)));
  const ratio = ['16:9', '9:16', '1:1', '4:3'].includes(String(opts.ratio || '')) ? String(opts.ratio) : '16:9';
  const dims =
    ratio === '9:16' ? { width: 512, height: 704 } :
    ratio === '1:1' ? { width: 576, height: 576 } :
    ratio === '4:3' ? { width: 640, height: 480 } :
    { width: 704, height: 512 };

  const chainTried: string[] = [];

  // 1. Fal.ai Wan 2.1 / LTX-Video
  if (process.env.FAL_KEY) {
    for (const falModel of ['fal-ai/wan/v2.1/1.3b/text-to-video', 'fal-ai/ltx-video']) {
      chainTried.push(`fal:${falModel}`);
      try {
        const r = await fetchWithTimeout(
          `https://fal.run/${falModel}`,
          {
            method: 'POST',
            headers: { Authorization: `Key ${process.env.FAL_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: cleanPrompt, aspect_ratio: ratio }),
          },
          45000
        );
        if (r.ok) {
          const j: any = await r.json();
          const vUrl = j?.video?.url || j?.url;
          if (vUrl) {
            const dl = await downloadVideoAsDataUrl(vUrl, 20000);
            if (dl) {
              return {
                dataUrl: dl.dataUrl,
                mimeType: dl.mimeType,
                provider: 'Fal.ai Neural Video',
                model: falModel,
                duration,
                ratio,
                ...dims,
                isNeuralVideo: true,
                chainTried,
              };
            }
          }
        }
      } catch (_e) {}
    }
  }

  // 2. Replicate (Wan 2.1 / LTX-Video)
  if (process.env.REPLICATE_API_TOKEN) {
    chainTried.push('replicate:wan-2.1');
    try {
      const r = await fetchWithTimeout(
        'https://api.replicate.com/v1/models/wan-video/wan-2.1-t2v-480p/predictions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.REPLICATE_API_TOKEN}`,
            'Content-Type': 'application/json',
            Prefer: 'wait=40',
          },
          body: JSON.stringify({ input: { prompt: cleanPrompt, aspect_ratio: ratio } }),
        },
        45000
      );
      if (r.ok) {
        const j: any = await r.json();
        const outUrl = Array.isArray(j?.output) ? j.output[0] : j?.output;
        if (typeof outUrl === 'string' && outUrl.startsWith('http')) {
          const dl = await downloadVideoAsDataUrl(outUrl, 20000);
          if (dl) {
            return {
              dataUrl: dl.dataUrl,
              mimeType: dl.mimeType,
              provider: 'Replicate Wan 2.1',
              model: 'wan-2.1-t2v-480p',
              duration,
              ratio,
              ...dims,
              isNeuralVideo: true,
              chainTried,
            };
          }
        }
      }
    } catch (_e) {}
  }

  // 3. Luma Dream Machine Ray 2
  if (process.env.LUMA_API_KEY) {
    chainTried.push('luma:ray-2');
    try {
      const init = await fetchWithTimeout(
        'https://api.lumalabs.ai/dream-machine/v1/generations',
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${process.env.LUMA_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: cleanPrompt, model: 'ray-2', aspect_ratio: ratio }),
        },
        15000
      );
      if (init.ok) {
        const gen: any = await init.json();
        if (gen?.id) {
          const start = Date.now();
          while (Date.now() - start < 35000) {
            await new Promise((r) => setTimeout(r, 3000));
            const st = await fetchWithTimeout(
              `https://api.lumalabs.ai/dream-machine/v1/generations/${gen.id}`,
              { headers: { Authorization: `Bearer ${process.env.LUMA_API_KEY}` } },
              8000
            );
            if (st.ok) {
              const sj: any = await st.json();
              if (sj?.state === 'completed' && sj?.assets?.video) {
                const dl = await downloadVideoAsDataUrl(sj.assets.video, 20000);
                if (dl) {
                  return {
                    dataUrl: dl.dataUrl,
                    mimeType: dl.mimeType,
                    provider: 'Luma Dream Machine',
                    model: 'ray-2',
                    duration,
                    ratio,
                    ...dims,
                    isNeuralVideo: true,
                    chainTried,
                  };
                }
              }
              if (sj?.state === 'failed') break;
            }
          }
        }
      }
    } catch (_e) {}
  }

  // 4. Pollinations Video Gateway (Seedance / Veo)
  if (process.env.POLLINATIONS_API_KEY) {
    for (const pvModel of ['seedance', 'veo']) {
      chainTried.push(`pollinations-video:${pvModel}`);
      try {
        const encoded = encodeURIComponent(cleanPrompt.slice(0, 600));
        const url = `https://gen.pollinations.ai/video/${encoded}?model=${pvModel}&duration=${duration}&aspectRatio=${encodeURIComponent(ratio)}`;
        const r = await fetchWithTimeout(
          url,
          { headers: { Authorization: `Bearer ${process.env.POLLINATIONS_API_KEY}`, Accept: 'video/*' } },
          40000
        );
        if (r.ok) {
          const buf = Buffer.from(await r.arrayBuffer());
          const ct = String(r.headers.get('content-type') || 'video/mp4').split(';')[0];
          if (ct.startsWith('video/') && buf.length > 4096) {
            return {
              dataUrl: `data:${ct};base64,${buf.toString('base64')}`,
              mimeType: ct,
              provider: `Pollinations (${pvModel})`,
              model: pvModel,
              duration,
              ratio,
              ...dims,
              isNeuralVideo: true,
              chainTried,
            };
          }
        }
      } catch (_e) {}
    }
  }

  // 5. Lightricks LTX-Video Distilled (Free HuggingFace Gradio Space — real T2V diffusion)
  chainTried.push('hf-space:lightricks-ltx-video');
  try {
    const ltx = await callGradioVideoSpace(
      'https://lightricks-ltx-video-distilled.hf.space',
      'text_to_video',
      [
        cleanPrompt,
        'worst quality, inconsistent motion, blurry, jittery, distorted, watermark',
        null,
        null,
        dims.height,
        dims.width,
        'text-to-video',
        Math.min(4, duration),
        9,
        Math.floor(Math.random() * 100000),
        true,
        1,
        true,
      ],
      28000
    );
    if (ltx?.videoUrl) {
      const dl = await downloadVideoAsDataUrl(ltx.videoUrl, 18000);
      if (dl) {
        return {
          dataUrl: dl.dataUrl,
          mimeType: dl.mimeType,
          provider: 'Lightricks LTX-Video',
          model: 'LTX-Video-Distilled',
          duration,
          ratio,
          ...dims,
          isNeuralVideo: true,
          chainTried,
        };
      }
    }
  } catch (_e) {}

  // 6. Alibaba Wan 2.1 Fast (Free HuggingFace Gradio Space)
  chainTried.push('hf-space:wan2.1-fast');
  try {
    const wan = await callGradioVideoSpace(
      'https://multimodalart-wan2-1-fast.hf.space',
      'generate_video',
      [
        null,
        cleanPrompt,
        dims.height,
        dims.width,
        'blurry, static, distorted, watermark, low quality',
        Math.min(4, duration),
        1,
        4,
        Math.floor(Math.random() * 100000),
        true,
      ],
      26000
    );
    if (wan?.videoUrl) {
      const dl = await downloadVideoAsDataUrl(wan.videoUrl, 18000);
      if (dl) {
        return {
          dataUrl: dl.dataUrl,
          mimeType: dl.mimeType,
          provider: 'Alibaba Wan 2.1 Fast',
          model: 'Wan2.1-Fast',
          duration,
          ratio,
          ...dims,
          isNeuralVideo: true,
          chainTried,
        };
      }
    }
  } catch (_e) {}

  // 7. Airforce Video Gateway (wan2.5-t2v / veo_3_1-fast)
  for (const afVid of ['wan2.5-t2v', 'veo_3_1-fast', 'seedance-2.5']) {
    chainTried.push(`airforce-video:${afVid}`);
    try {
      const r = await fetchWithTimeout(
        'https://api.airforce/v1/video/generations',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'User-Agent': 'LokizenithAI/2.8' },
          body: JSON.stringify({ model: afVid, prompt: cleanPrompt, duration, aspect_ratio: ratio }),
        },
        15000
      );
      if (r.ok) {
        const j: any = await r.json();
        const vUrl = j?.data?.[0]?.url || j?.url || j?.video?.url;
        if (typeof vUrl === 'string' && vUrl.startsWith('http')) {
          const dl = await downloadVideoAsDataUrl(vUrl, 18000);
          if (dl) {
            return {
              dataUrl: dl.dataUrl,
              mimeType: dl.mimeType,
              provider: `Airforce (${afVid})`,
              model: afVid,
              duration,
              ratio,
              ...dims,
              isNeuralVideo: true,
              chainTried,
            };
          }
        }
      }
    } catch (_e) {}
  }

  // 8. Guaranteed Multi-Keyframe AI Cinematic Storyboard Fallback (2 progressive scenes rendered smoothly by client ReWind 2.0)
  chainTried.push('multi-keyframe-storyboard');
  const keyframeWidth = ratio === '9:16' ? 576 : ratio === '1:1' ? 768 : 960;
  const keyframeHeight = ratio === '9:16' ? 960 : ratio === '1:1' ? 768 : 544;

  const scene1 = opts.sourceImageUrl
    ? { dataUrl: opts.sourceImageUrl, provider: 'User Keyframe', model: 'source' }
    : await generateImageChain(
        `${cleanPrompt}, opening cinematic establishing shot, film grain, volumetric lighting, 8k`,
        keyframeWidth,
        keyframeHeight
      );

  let scene2Url = scene1.dataUrl;
  try {
    const s2 = await generateImageChain(
      `${cleanPrompt}, dynamic camera push-in action shot, dramatic motion blur, golden cinematic lighting, 8k`,
      keyframeWidth,
      keyframeHeight
    );
    scene2Url = s2.dataUrl;
  } catch (_e) {}

  return {
    dataUrl: scene1.dataUrl,
    keyframeUrl: scene1.dataUrl,
    keyframes: [scene1.dataUrl, scene2Url],
    mimeType: 'image/jpeg',
    provider: `ReWind 2.0 Multi-Keyframe (${scene1.provider})`,
    model: 'rewind-2.0-storyboard',
    duration,
    ratio,
    width: keyframeWidth,
    height: keyframeHeight,
    isNeuralVideo: false,
    chainTried,
  };
}
