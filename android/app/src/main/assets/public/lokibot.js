/* ============================================================
   LOKIBOT STUDIO — 24/7 Multi-Agent Platform (Lokizenith 4.0 Stark Ultra)
   - Full-screen overlay on regular chatbot; "‹ Chat" button hides it immediately
   - Compact low/short header + smaller LokiBot button
   - Persistent DOM for #lbChatInput and #lbModalBackdrop (never loses focus/text mid-typing or closes modals unexpectedly)
   - Close button (✕) on the chats sidebar (works on both Mobile & PC)
   - Animated single-bot typing indicator above prompt bar that rotates every 2 seconds when multiple bots are typing
   - Rich colorful multi-layered Avatar Customizer (Faces, Hats, Hair, Clothes, Colors) in both Bot Creation and Bot Profile Editor
   - Real AI responses via window.LZ.chat(messages, opts) with full conversation history & specialist persona
   ============================================================ */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s || '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const STORE_KEY = 'lz.lokibots.v1';

  const BOT_COLORS = [
    '#8b5cf6', '#0ea5e9', '#10b981', '#f59e0b', '#ef3e56', '#ec4899',
    '#f97316', '#14b8a6', '#6366f1', '#84cc16', '#e11d48', '#8b5e3c',
    '#111827', '#64748b'
  ];

  // 12 Expressive, Colorful Faces (פרצופים)
  const AVATAR_FACES = [
    { id: 'classic', label: 'Classic Glow', hornScale: 1, tilt: 0 },
    { id: 'happy', label: 'Happy Laugh', hornScale: 1, tilt: -3 },
    { id: 'cool', label: 'Neon Shades', hornScale: 1.05, tilt: 2 },
    { id: 'cyber', label: 'Cyber Visor', hornScale: 1.12, tilt: 3 },
    { id: 'star', label: 'Starry Eyes', hornScale: 1.06, tilt: 0 },
    { id: 'wink', label: 'Playful Wink', hornScale: 1, tilt: -4 },
    { id: 'blush', label: 'Cute Kawaii', hornScale: 0.95, tilt: -2 },
    { id: 'fire', label: 'Blazing Power', hornScale: 1.18, tilt: 0 },
    { id: 'monocle', label: 'Royal Gent', hornScale: 1.04, tilt: 2 },
    { id: 'pirate', label: 'Pirate Rebel', hornScale: 1.08, tilt: -3 },
    { id: 'ninja', label: 'Shadow Ninja', hornScale: 1.02, tilt: 0 },
    { id: 'matrix', label: 'Hacker Matrix', hornScale: 1.05, tilt: 0 }
  ];

  // 10 Detailed Hats & Headgear (כובעים)
  const AVATAR_HATS = [
    { id: 'none', label: 'No Hat' },
    { id: 'crown', label: 'Royal Crown' },
    { id: 'wizard', label: 'Wizard Hat' },
    { id: 'headphones', label: 'RGB Headset' },
    { id: 'viking', label: 'Viking Helm' },
    { id: 'pirate_hat', label: 'Captain Hat' },
    { id: 'chef', label: 'Master Chef' },
    { id: 'fedora', label: 'Cyber Fedora' },
    { id: 'cap', label: 'Street Cap' },
    { id: 'halo', label: 'Golden Halo' }
  ];

  // 10 Vibrant Hair Styles (שיער)
  const AVATAR_HAIRS = [
    { id: 'none', label: 'No Hair' },
    { id: 'spiky_gold', label: 'Super Gold' },
    { id: 'neon_punk', label: 'Neon Mohawk' },
    { id: 'flame', label: 'Fire Hair' },
    { id: 'curly_galaxy', label: 'Galaxy Curls' },
    { id: 'flowing_emerald', label: 'Emerald Wave' },
    { id: 'ice_crystal', label: 'Ice Spikes' },
    { id: 'royal_braids', label: 'Ruby Braids' },
    { id: 'rainbow_wave', label: 'Rainbow Flow' },
    { id: 'silver_slick', label: 'Silver Slick' }
  ];

  // 10 Colorful Outfits & Clothes (בגדים)
  const AVATAR_CLOTHES = [
    { id: 'none', label: 'Classic Core' },
    { id: 'stark_armor', label: 'Stark Armor' },
    { id: 'hoodie', label: 'Neon Hoodie' },
    { id: 'tuxedo', label: 'VIP Tuxedo' },
    { id: 'royal_cape', label: 'Royal Cape' },
    { id: 'wizard_robe', label: 'Mystic Robe' },
    { id: 'lab_coat', label: 'Genius Coat' },
    { id: 'leather_jacket', label: 'Cyber Jacket' },
    { id: 'ninja_gi', label: 'Dragon Gi' },
    { id: 'gold_chain', label: 'Gold Drip' }
  ];

  function shadeColor(hex, percent) {
    const clean = (hex || '#8b5cf6').replace('#', '');
    const num = parseInt(clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean, 16) || 0x8b5cf6;
    const r = Math.min(255, Math.max(0, (num >> 16) + percent));
    const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + percent));
    const b = Math.min(255, Math.max(0, (num & 0x0000FF) + percent));
    return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  function normalizeAvatarConfig(botOrColor, styleId = 'classic', extra = {}) {
    if (botOrColor && typeof botOrColor === 'object') {
      return {
        color: botOrColor.color || '#8b5cf6',
        faceId: botOrColor.faceId || botOrColor.styleId || 'classic',
        hatId: botOrColor.hatId || 'none',
        hairId: botOrColor.hairId || 'none',
        clothesId: botOrColor.clothesId || 'none'
      };
    }
    return {
      color: typeof botOrColor === 'string' && botOrColor ? botOrColor : '#8b5cf6',
      faceId: extra.faceId || styleId || 'classic',
      hatId: extra.hatId || 'none',
      hairId: extra.hairId || 'none',
      clothesId: extra.clothesId || 'none'
    };
  }

  function renderFaceSVG(faceId, color, light, idSuffix) {
    switch (faceId) {
      case 'happy':
        return `
          <path d="M41 66 Q47 58 53 66" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" fill="none"/>
          <path d="M67 66 Q73 58 79 66" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" fill="none"/>
          <path d="M48 89 Q60 101 72 89 Z" fill="#f43f5e"/>
          <path d="M53 93 Q60 98 67 93" fill="#fda4af"/>`;
      case 'cool':
        return `
          <g>
            <rect x="34" y="59" width="23" height="14" rx="4" fill="url(#lbCoolGrad_${idSuffix})" stroke="#ffffff" stroke-width="1.6"/>
            <rect x="63" y="59" width="23" height="14" rx="4" fill="url(#lbCoolGrad_${idSuffix})" stroke="#ffffff" stroke-width="1.6"/>
            <line x1="57" y1="64" x2="63" y2="64" stroke="#ffffff" stroke-width="2.2"/>
            <line x1="38" y1="62" x2="45" y2="70" stroke="rgba(255,255,255,0.65)" stroke-width="2" stroke-linecap="round"/>
            <line x1="67" y1="62" x2="74" y2="70" stroke="rgba(255,255,255,0.65)" stroke-width="2" stroke-linecap="round"/>
          </g>
          <path d="M51 92 Q62 97 71 89" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
      case 'cyber':
        return `
          <rect x="36" y="60" width="48" height="13" rx="6.5" fill="#06b6d4" stroke="#ffffff" stroke-width="1.4"/>
          <rect x="40" y="63" width="18" height="4" rx="2" fill="#ecfeff"/>
          <circle cx="74" cy="66.5" r="3" fill="#f43f5e"/>
          <path d="M50 92 L56 95 L64 95 L70 92" stroke="#22d3ee" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
      case 'star':
        return `
          <polygon points="47,57 49.5,63.5 56.5,63.5 51,67.5 53,74.5 47,70.5 41,74.5 43,67.5 37.5,63.5 44.5,63.5" fill="#facc15" stroke="#fef08a" stroke-width="0.8"/>
          <polygon points="73,57 75.5,63.5 82.5,63.5 77,67.5 79,74.5 73,70.5 67,74.5 69,67.5 63.5,63.5 70.5,63.5" fill="#facc15" stroke="#fef08a" stroke-width="0.8"/>
          <ellipse cx="60" cy="92" rx="6.5" ry="5" fill="#fb7185" stroke="#ffffff" stroke-width="1.4"/>`;
      case 'wink':
        return `
          <ellipse cx="47" cy="67" rx="5.5" ry="7" fill="#ffffff"/>
          <circle cx="45.5" cy="64.5" r="2" fill="${color}"/>
          <path d="M66 67 Q73 60 79 67" stroke="#ffffff" stroke-width="3.6" stroke-linecap="round" fill="none"/>
          <path d="M50 90 Q60 97 70 90" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
          <path d="M58 93 Q63 101 67 93 Z" fill="#fb7185"/>`;
      case 'blush':
        return `
          <circle cx="47" cy="67" r="6.8" fill="#ffffff"/>
          <circle cx="73" cy="67" r="6.8" fill="#ffffff"/>
          <circle cx="45" cy="64.5" r="2.4" fill="#ec4899"/>
          <circle cx="71" cy="64.5" r="2.4" fill="#ec4899"/>
          <circle cx="49.5" cy="69" r="1.2" fill="#ffffff"/>
          <circle cx="75.5" cy="69" r="1.2" fill="#ffffff"/>
          <ellipse cx="38" cy="76" rx="5" ry="2.8" fill="#fb7185" opacity="0.85"/>
          <ellipse cx="82" cy="76" rx="5" ry="2.8" fill="#fb7185" opacity="0.85"/>
          <path d="M53 91 Q56.5 95 60 91 Q63.5 95 67 91" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
      case 'fire':
        return `
          <polygon points="39,61 55,66 41,73" fill="#f97316"/>
          <polygon points="42,63 53,66 43,71" fill="#fef08a"/>
          <polygon points="81,61 65,66 79,73" fill="#f97316"/>
          <polygon points="78,63 67,66 77,71" fill="#fef08a"/>
          <path d="M48 91 Q60 98 72 91" stroke="#fef08a" stroke-width="2.6" stroke-linecap="round" fill="none"/>
          <polygon points="51,92 54,97 56,93" fill="#ffffff"/>
          <polygon points="69,92 66,97 64,93" fill="#ffffff"/>`;
      case 'monocle':
        return `
          <ellipse cx="47" cy="67" rx="5" ry="6.5" fill="#ffffff"/>
          <circle cx="73" cy="67" r="8.5" fill="rgba(56,189,248,0.28)" stroke="#facc15" stroke-width="2.4"/>
          <circle cx="73" cy="67" r="4.2" fill="#ffffff"/>
          <path d="M81 70 Q85 82 81 94" stroke="#facc15" stroke-width="1.5" fill="none" stroke-dasharray="2 2"/>
          <path d="M45 92 Q53 86 60 91 Q67 86 75 92 Q68 96 60 93 Q52 96 45 92 Z" fill="#fbbf24" stroke="#78350f" stroke-width="0.8"/>`;
      case 'pirate':
        return `
          <line x1="34" y1="57" x2="85" y2="73" stroke="#111827" stroke-width="2.6"/>
          <circle cx="47" cy="67" r="8" fill="#dc2626" stroke="#facc15" stroke-width="1.8"/>
          <ellipse cx="73" cy="67" rx="5.5" ry="6.8" fill="#ffffff"/>
          <circle cx="71.5" cy="65" r="2" fill="#facc15"/>
          <path d="M49 91 Q60 98 71 90" stroke="#ffffff" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
      case 'ninja':
        return `
          <path d="M26 73 Q60 66 94 73 L92 98 Q60 110 28 98 Z" fill="#1e1b4b" stroke="#818cf8" stroke-width="1.5"/>
          <polygon points="40,63 54,67 42,71" fill="#34d399"/>
          <polygon points="80,63 66,67 78,71" fill="#34d399"/>`;
      case 'matrix':
        return `
          <rect x="39" y="62" width="15" height="9" rx="2" fill="#10b981"/>
          <rect x="66" y="62" width="15" height="9" rx="2" fill="#10b981"/>
          <rect x="42" y="64" width="4" height="5" fill="#ecfdf5"/>
          <rect x="69" y="64" width="4" height="5" fill="#ecfdf5"/>
          <path d="M51 92 Q60 96 69 92" stroke="#34d399" stroke-width="2.5" stroke-linecap="round" fill="none"/>`;
      default:
        return `
          <ellipse cx="48" cy="68" rx="5.4" ry="7" fill="#ffffff"/>
          <ellipse cx="72" cy="68" rx="5.4" ry="7" fill="#ffffff"/>
          <circle cx="46.5" cy="65.5" r="2" fill="${light}"/>
          <circle cx="70.5" cy="65.5" r="2" fill="${light}"/>
          <path d="M51 91 Q60 98 69 91" stroke="rgba(255,255,255,0.88)" stroke-width="2.8" stroke-linecap="round" fill="none"/>`;
    }
  }

  function renderHairSVG(hairId) {
    switch (hairId) {
      case 'spiky_gold':
        return `
          <g>
            <path d="M25 46 L14 26 L33 33 L28 11 L47 26 L60 5 L73 26 L92 11 L87 33 L106 26 L95 46 Q60 32 25 46 Z"
                  fill="#facc15" stroke="#ea580c" stroke-width="1.8" stroke-linejoin="round"/>
            <path d="M35 38 L34 19 L50 30 L60 12 L70 30 L86 19 L85 38 Z" fill="#fef08a" opacity="0.75"/>
          </g>`;
      case 'neon_punk':
        return `
          <g>
            <path d="M46 36 L38 14 L54 22 L60 3 L66 22 L82 14 L74 36 Z" fill="#ec4899" stroke="#f472b6" stroke-width="1.6"/>
            <path d="M52 34 L50 16 L60 8 L70 16 L68 34 Z" fill="#22d3ee"/>
          </g>`;
      case 'flame':
        return `
          <g>
            <path d="M26 45 C18 28, 32 18, 36 8 C42 20, 50 14, 60 2 C70 14, 78 20, 84 8 C88 18, 102 28, 94 45 Q60 32 26 45 Z"
                  fill="#ef4444" stroke="#f97316" stroke-width="1.6"/>
            <path d="M36 42 C34 28, 48 20, 60 9 C72 20, 86 28, 84 42 Z" fill="#facc15"/>
          </g>`;
      case 'curly_galaxy':
        return `
          <g fill="#7c3aed" stroke="#c084fc" stroke-width="1.4">
            <circle cx="32" cy="36" r="13"/>
            <circle cx="45" cy="25" r="15"/>
            <circle cx="60" cy="21" r="16"/>
            <circle cx="75" cy="25" r="15"/>
            <circle cx="88" cy="36" r="13"/>
            <circle cx="48" cy="22" r="2.2" fill="#fde047" stroke="none"/>
            <circle cx="68" cy="18" r="2.5" fill="#38bdf8" stroke="none"/>
            <circle cx="78" cy="29" r="1.8" fill="#f472b6" stroke="none"/>
          </g>`;
      case 'flowing_emerald':
        return `
          <g>
            <path d="M22 60 C16 32, 38 18, 60 18 C82 18, 104 32, 98 60 C95 45, 86 36, 60 34 C34 36, 25 45, 22 60 Z"
                  fill="#10b981" stroke="#34d399" stroke-width="1.6"/>
            <path d="M20 56 Q14 74 24 86 Q28 72 26 56 Z" fill="#059669"/>
            <path d="M100 56 Q106 74 96 86 Q92 72 94 56 Z" fill="#059669"/>
          </g>`;
      case 'ice_crystal':
        return `
          <g>
            <polygon points="26,42 20,18 42,30 48,8 60,25 72,8 78,30 100,18 94,42" fill="#38bdf8" stroke="#e0f2fe" stroke-width="1.8"/>
            <polygon points="40,36 48,14 60,28 72,14 80,36" fill="#bae6fd"/>
          </g>`;
      case 'royal_braids':
        return `
          <g>
            <path d="M25 46 Q60 18 95 46 Q60 32 25 46 Z" fill="#be123c" stroke="#fda4af" stroke-width="1.4"/>
            <rect x="20" y="45" width="9" height="38" rx="4.5" fill="#be123c" stroke="#facc15" stroke-width="1.5"/>
            <rect x="91" y="45" width="9" height="38" rx="4.5" fill="#be123c" stroke="#facc15" stroke-width="1.5"/>
            <line x1="20" y1="58" x2="29" y2="58" stroke="#facc15" stroke-width="2.4"/>
            <line x1="20" y1="70" x2="29" y2="70" stroke="#facc15" stroke-width="2.4"/>
            <line x1="91" y1="58" x2="100" y2="58" stroke="#facc15" stroke-width="2.4"/>
            <line x1="91" y1="70" x2="100" y2="70" stroke="#facc15" stroke-width="2.4"/>
          </g>`;
      case 'rainbow_wave':
        return `
          <g>
            <path d="M24 44 Q42 14 60 22 Q78 14 96 44 Q60 30 24 44 Z" fill="#f43f5e"/>
            <path d="M30 40 Q48 18 64 24 Q80 18 92 40 Q60 30 30 40 Z" fill="#facc15"/>
            <path d="M36 37 Q54 22 68 26 Q80 22 88 37 Q60 31 36 37 Z" fill="#06b6d4"/>
          </g>`;
      case 'silver_slick':
        return `
          <g>
            <path d="M25 45 C28 22, 55 15, 88 22 C96 24, 98 36, 94 45 Q60 30 25 45 Z"
                  fill="#e2e8f0" stroke="#94a3b8" stroke-width="1.6"/>
            <path d="M36 34 Q62 22 86 28" stroke="#ffffff" stroke-width="2.6" stroke-linecap="round" fill="none"/>
          </g>`;
      default:
        return '';
    }
  }

  function renderHatSVG(hatId) {
    switch (hatId) {
      case 'crown':
        return `
          <g>
            <polygon points="30,35 34,12 48,25 60,7 72,25 86,12 90,35" fill="#facc15" stroke="#b45309" stroke-width="1.8" stroke-linejoin="round"/>
            <rect x="30" y="32" width="60" height="7" rx="3" fill="#eab308" stroke="#b45309" stroke-width="1.4"/>
            <circle cx="60" cy="24" r="3.8" fill="#ef4444" stroke="#ffffff" stroke-width="0.8"/>
            <circle cx="43" cy="28" r="2.8" fill="#3b82f6"/>
            <circle cx="77" cy="28" r="2.8" fill="#10b981"/>
          </g>`;
      case 'wizard':
        return `
          <g>
            <ellipse cx="60" cy="34" rx="42" ry="8" fill="#4c1d95" stroke="#c084fc" stroke-width="1.6"/>
            <path d="M34 33 L56 2 L72 6 L86 33 Z" fill="#6d28d9" stroke="#c084fc" stroke-width="1.5" stroke-linejoin="round"/>
            <path d="M36 31 Q60 36 84 31" stroke="#facc15" stroke-width="4" fill="none"/>
            <polygon points="58,15 60,19 64,19 61,21 62,25 58,23 54,25 55,21 52,19 56,19" fill="#facc15"/>
          </g>`;
      case 'headphones':
        return `
          <g>
            <path d="M22 66 C20 26, 100 26, 98 66" stroke="#1e293b" stroke-width="6.5" fill="none" stroke-linecap="round"/>
            <path d="M26 62 C25 30, 95 30, 94 62" stroke="#ec4899" stroke-width="2.4" fill="none"/>
            <rect x="13" y="54" width="13" height="24" rx="6.5" fill="#0ea5e9" stroke="#ffffff" stroke-width="1.5"/>
            <rect x="94" y="54" width="13" height="24" rx="6.5" fill="#0ea5e9" stroke="#ffffff" stroke-width="1.5"/>
            <circle cx="19.5" cy="66" r="3.5" fill="#facc15"/>
            <circle cx="100.5" cy="66" r="3.5" fill="#facc15"/>
          </g>`;
      case 'viking':
        return `
          <g>
            <path d="M32 35 C12 28, 10 12, 22 7 C20 18, 26 24, 38 29 Z" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
            <path d="M88 35 C108 28, 110 12, 98 7 C100 18, 94 24, 82 29 Z" fill="#fef3c7" stroke="#b45309" stroke-width="1.5"/>
            <path d="M32 37 C32 18, 88 18, 88 37 Z" fill="#64748b" stroke="#cbd5e1" stroke-width="1.8"/>
            <rect x="30" y="34" width="60" height="6" rx="3" fill="#f59e0b"/>
            <rect x="57" y="20" width="6" height="22" rx="2" fill="#f59e0b"/>
          </g>`;
      case 'pirate_hat':
        return `
          <g>
            <path d="M18 36 Q60 10 102 36 Q84 40 60 38 Q36 40 18 36 Z" fill="#111827" stroke="#facc15" stroke-width="2"/>
            <path d="M32 34 Q60 15 88 34 Z" fill="#dc2626"/>
            <circle cx="60" cy="27" r="4.5" fill="#ffffff"/>
            <path d="M53 32 L67 22 M53 22 L67 32" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round"/>
          </g>`;
      case 'chef':
        return `
          <g>
            <circle cx="44" cy="19" r="11" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>
            <circle cx="60" cy="15" r="13" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>
            <circle cx="76" cy="19" r="11" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>
            <rect x="36" y="24" width="48" height="12" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.4"/>
            <rect x="36" y="31" width="48" height="4" fill="#ef4444"/>
          </g>`;
      case 'fedora':
        return `
          <g>
            <ellipse cx="60" cy="35" rx="40" ry="7" fill="#be123c" stroke="#fda4af" stroke-width="1.4"/>
            <path d="M35 34 C38 14, 52 14, 60 17 C68 14, 82 14, 85 34 Z" fill="#e11d48" stroke="#fda4af" stroke-width="1.4"/>
            <rect x="35" y="29" width="50" height="5" rx="2" fill="#facc15"/>
          </g>`;
      case 'cap':
        return `
          <g>
            <path d="M30 36 C30 16, 86 16, 88 36 Z" fill="#0ea5e9" stroke="#ffffff" stroke-width="1.5"/>
            <path d="M55 32 L104 37 C102 42, 78 41, 55 36 Z" fill="#f43f5e" stroke="#ffffff" stroke-width="1.2"/>
            <circle cx="60" cy="19" r="3" fill="#facc15"/>
          </g>`;
      case 'halo':
        return `
          <g>
            <ellipse cx="60" cy="11" rx="26" ry="6.5" fill="none" stroke="#facc15" stroke-width="4.2"/>
            <ellipse cx="60" cy="11" rx="26" ry="6.5" fill="none" stroke="#fef08a" stroke-width="1.5"/>
          </g>`;
      default:
        return '';
    }
  }

  function renderClothesSVG(clothesId, light) {
    switch (clothesId) {
      case 'stark_armor':
        return `
          <g>
            <path d="M29 94 Q60 104 91 94 L96 125 Q60 132 24 125 Z" fill="#dc2626" stroke="#facc15" stroke-width="2"/>
            <polygon points="34,98 50,104 46,124 28,120" fill="#facc15"/>
            <polygon points="86,98 70,104 74,124 92,120" fill="#facc15"/>
            <circle cx="60" cy="111" r="7.5" fill="#22d3ee" stroke="#ffffff" stroke-width="2"/>
            <circle cx="60" cy="111" r="3.5" fill="#ffffff"/>
          </g>`;
      case 'hoodie':
        return `
          <g>
            <path d="M27 94 Q60 105 93 94 L97 125 Q60 132 23 125 Z" fill="#8b5cf6" stroke="#c4b5fd" stroke-width="1.8"/>
            <path d="M44 98 L60 112 L76 98" fill="#06b6d4" stroke="#ffffff" stroke-width="1.4"/>
            <line x1="53" y1="104" x2="53" y2="121" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/>
            <line x1="67" y1="104" x2="67" y2="121" stroke="#facc15" stroke-width="2.4" stroke-linecap="round"/>
          </g>`;
      case 'tuxedo':
        return `
          <g>
            <path d="M28 94 Q60 104 92 94 L96 125 Q60 132 24 125 Z" fill="#111827" stroke="#ffffff" stroke-width="1.6"/>
            <polygon points="46,97 60,124 74,97" fill="#ffffff"/>
            <polygon points="51,102 60,106 51,110" fill="#ef4444"/>
            <polygon points="69,102 60,106 69,110" fill="#ef4444"/>
            <circle cx="60" cy="106" r="2.4" fill="#b91c1c"/>
          </g>`;
      case 'royal_cape':
        return `
          <g>
            <path d="M18 90 L10 128 Q60 134 110 128 L102 90 Z" fill="#be123c" stroke="#facc15" stroke-width="2"/>
            <path d="M26 93 Q60 105 94 93 L92 103 Q60 113 28 103 Z" fill="#ffffff"/>
            <circle cx="42" cy="99" r="1.5" fill="#111827"/>
            <circle cx="60" cy="102" r="4.5" fill="#facc15" stroke="#b45309" stroke-width="1.4"/>
            <circle cx="78" cy="99" r="1.5" fill="#111827"/>
          </g>`;
      case 'wizard_robe':
        return `
          <g>
            <path d="M26 94 Q60 104 94 94 L98 126 Q60 132 22 126 Z" fill="#4c1d95" stroke="#facc15" stroke-width="1.8"/>
            <path d="M54 98 L60 126 L66 98 Z" fill="#facc15"/>
            <polygon points="60,104 64,110 60,116 56,110" fill="#38bdf8" stroke="#ffffff" stroke-width="1"/>
          </g>`;
      case 'lab_coat':
        return `
          <g>
            <path d="M27 94 Q60 104 93 94 L97 125 Q60 132 23 125 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1.8"/>
            <polygon points="48,97 60,125 72,97" fill="#10b981"/>
            <polygon points="57,99 63,99 61,119 59,119" fill="#ef4444"/>
            <rect x="73" y="109" width="11" height="9" rx="1.5" fill="#e2e8f0" stroke="#94a3b8" stroke-width="1"/>
            <line x1="76" y1="106" x2="76" y2="110" stroke="#2563eb" stroke-width="2"/>
            <line x1="80" y1="106" x2="80" y2="110" stroke="#ef4444" stroke-width="2"/>
          </g>`;
      case 'leather_jacket':
        return `
          <g>
            <path d="M27 94 Q60 104 93 94 L97 125 Q60 132 23 125 Z" fill="#1e293b" stroke="#ec4899" stroke-width="2"/>
            <polygon points="36,95 52,112 42,116" fill="#ec4899"/>
            <polygon points="84,95 68,112 78,116" fill="#ec4899"/>
            <polygon points="50,98 60,124 70,98" fill="#06b6d4"/>
          </g>`;
      case 'ninja_gi':
        return `
          <g>
            <path d="M27 94 Q60 104 93 94 L97 125 Q60 132 23 125 Z" fill="#1e1b4b" stroke="#facc15" stroke-width="1.8"/>
            <line x1="42" y1="96" x2="68" y2="125" stroke="#ef4444" stroke-width="4"/>
            <line x1="78" y1="96" x2="52" y2="125" stroke="#ef4444" stroke-width="4"/>
            <circle cx="60" cy="112" r="5" fill="#facc15"/>
          </g>`;
      case 'gold_chain':
        return `
          <g>
            <path d="M27 94 Q60 104 93 94 L97 125 Q60 132 23 125 Z" fill="#581c87" stroke="#c084fc" stroke-width="1.8"/>
            <path d="M40 97 Q60 120 80 97" fill="none" stroke="#facc15" stroke-width="5" stroke-dasharray="4 2"/>
            <circle cx="60" cy="114" r="6.5" fill="#facc15" stroke="#fef08a" stroke-width="1.6"/>
            <text x="60" y="117" text-anchor="middle" font-size="8" font-weight="900" fill="#78350f">★</text>
          </g>`;
      default:
        return `<path d="M60 112 L62 117 L67 119 L62 121 L60 126 L58 121 L53 119 L58 117 Z" fill="${light}" opacity="0.9"/>`;
    }
  }

  function renderLokiMascotSVG(botOrColor = '#8b5cf6', styleId = 'classic', size = 56, uid = '', extra = {}) {
    const cfg = normalizeAvatarConfig(botOrColor, styleId, extra);
    const color = cfg.color;
    const faceObj = AVATAR_FACES.find(s => s.id === cfg.faceId) || AVATAR_FACES[0];
    const idSuffix = uid || Math.random().toString(36).slice(2, 8);
    const light = shadeColor(color, 48);
    const dark = shadeColor(color, -42);
    const hornLight = shadeColor(color, 70);

    const faceMarkup = renderFaceSVG(faceObj.id, color, light, idSuffix);
    const hairMarkup = renderHairSVG(cfg.hairId);
    const hatMarkup = renderHatSVG(cfg.hatId);
    const clothesMarkup = renderClothesSVG(cfg.clothesId, light);

    // Show classic horns unless hidden by full helmet/hat, or show them peeking out nicely
    const showHorns = cfg.hatId !== 'viking' && cfg.hatId !== 'chef';

    return `<svg class="lb-mascot-svg" width="${size}" height="${size}" viewBox="0 0 120 134" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform:rotate(${faceObj.tilt || 0}deg)">
      <defs>
        <radialGradient id="lbBody_${idSuffix}" cx="35%" cy="25%" r="75%">
          <stop offset="0%" stop-color="${light}"/>
          <stop offset="55%" stop-color="${color}"/>
          <stop offset="100%" stop-color="${dark}"/>
        </radialGradient>
        <linearGradient id="lbHorn_${idSuffix}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ffffff"/>
          <stop offset="45%" stop-color="${hornLight}"/>
          <stop offset="100%" stop-color="${color}"/>
        </linearGradient>
        <linearGradient id="lbCoolGrad_${idSuffix}" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ec4899"/>
          <stop offset="50%" stop-color="#8b5cf6"/>
          <stop offset="100%" stop-color="#06b6d4"/>
        </linearGradient>
      </defs>
      ${showHorns ? `
        <g transform="translate(60, 42) scale(${faceObj.hornScale || 1}) translate(-60, -42)">
          <path d="M38 42 C 20 26, 16 10, 28 4 C 24 16, 30 26, 46 36 Z" fill="url(#lbHorn_${idSuffix})"/>
          <path d="M82 42 C 100 26, 104 10, 92 4 C 96 16, 90 26, 74 36 Z" fill="url(#lbHorn_${idSuffix})"/>
        </g>
      ` : ''}
      <path d="M24 68 C 24 40, 42 30, 60 30 C 78 30, 96 40, 96 68 C 96 92, 84 108, 60 108 C 36 108, 24 92, 24 68 Z"
            fill="url(#lbBody_${idSuffix})" stroke="rgba(255,255,255,0.34)" stroke-width="1.6"/>
      ${clothesMarkup}
      <rect x="33" y="54" width="54" height="28" rx="14" fill="#0b0816" stroke="rgba(255,255,255,0.25)" stroke-width="1.2"/>
      ${faceMarkup}
      ${hairMarkup}
      ${hatMarkup}
    </svg>`;
  }

  function loadState() {
    try {
      const raw = JSON.parse(localStorage.getItem(STORE_KEY) || 'null');
      if (raw && Array.isArray(raw.bots) && Array.isArray(raw.groups)) {
        return raw;
      }
    } catch {}
    return {
      bots: [],
      groups: [],
      activeId: null,
      activeType: null,
      messages: {},
      rightTab: 'details',
      autoDebate: {}
    };
  }

  const state = loadState();
  let searchQuery = '';
  let mentionMenuOpen = false;
  let mentionFilter = '';
  let mentionSelectedIdx = 0;
  let debateTimers = {};
  let proactiveTimer = null;
  let mobileSidebarOpen = false;
  let mobileRightOpen = false;
  let desktopLeftCollapsed = false;
  let desktopRightCollapsed = false;

  // Map of convId -> Array of bot objects or names currently typing
  const typingBotsByConv = {};
  let typingRotateIdx = 0;
  let typingRotationInterval = null;

  // Live Linux state per bot/group
  const computerSessions = {};

  function saveState() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        bots: state.bots,
        groups: state.groups,
        activeId: state.activeId,
        activeType: state.activeType,
        messages: state.messages,
        rightTab: state.rightTab,
        autoDebate: state.autoDebate
      }));
    } catch {}
  }

  function getActiveEntity() {
    if (!state.activeId) return null;
    if (state.activeType === 'group') {
      return state.groups.find(g => g.id === state.activeId) || null;
    }
    return state.bots.find(b => b.id === state.activeId) || null;
  }

  function getActiveBotsList() {
    const ent = getActiveEntity();
    if (!ent) return [];
    if (state.activeType === 'group') {
      return (ent.memberIds || []).map(id => state.bots.find(b => b.id === id)).filter(Boolean);
    }
    return [ent];
  }

  function formatTime(ts) {
    try {
      const d = new Date(ts || Date.now());
      return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    } catch {
      return 'Just now';
    }
  }

  function getComputerSession(id) {
    if (!computerSessions[id]) {
      computerSessions[id] = {
        app: 'chrome',
        url: 'https://www.google.com',
        query: '',
        typedText: '',
        status: 'Ubuntu 24.04 LTS · Ready',
        cursorX: 52,
        cursorY: 48,
        clicking: false,
        results: [],
        terminalLines: [
          'lokibot@stark-ultra-vm:~$ uname -a',
          'Linux stark-ultra-vm 6.8.0-45-generic #45-Ubuntu SMP x86_64 GNU/Linux',
          'lokibot@stark-ultra-vm:~$ google-chrome --headless=false &'
        ]
      };
    }
    return computerSessions[id];
  }

  // ============================================================
  // LIVE ANIMATED TYPING INDICATOR ABOVE PROMPT BAR
  // Shows 1 bot at a time ("{BotName} typing") with its custom avatar & wave animation,
  // and automatically switches/rotates every 2 seconds if 2+ bots are typing!
  // ============================================================
  function setBotTyping(convId, botName, isTyping) {
    if (!convId || !botName) return;
    if (!typingBotsByConv[convId]) typingBotsByConv[convId] = [];
    const list = typingBotsByConv[convId];
    const idx = list.indexOf(botName);
    if (isTyping && idx === -1) {
      list.push(botName);
    } else if (!isTyping && idx !== -1) {
      list.splice(idx, 1);
    }
    ensureTypingRotationTimer();
    updateTypingIndicatorDOM(false);
  }

  function ensureTypingRotationTimer() {
    const convId = state.activeId;
    const list = (convId && typingBotsByConv[convId]) ? typingBotsByConv[convId] : [];
    if (list.length > 1) {
      if (!typingRotationInterval) {
        typingRotationInterval = setInterval(() => {
          typingRotateIdx++;
          updateTypingIndicatorDOM(true);
        }, 2000);
      }
    } else if (typingRotationInterval) {
      clearInterval(typingRotationInterval);
      typingRotationInterval = null;
      typingRotateIdx = 0;
    }
  }

  function updateTypingIndicatorDOM(isRotatingTick = false) {
    const el = $('#lbTypingIndicator');
    if (!el) return;
    const convId = state.activeId;
    const list = (convId && typingBotsByConv[convId]) ? typingBotsByConv[convId] : [];
    if (!list.length) {
      el.hidden = true;
      el.innerHTML = '';
      if (typingRotationInterval) {
        clearInterval(typingRotationInterval);
        typingRotationInterval = null;
      }
      return;
    }
    el.hidden = false;
    const currentBotName = list[typingRotateIdx % list.length];
    const botObj = state.bots.find(b => b.name === currentBotName) || {
      name: currentBotName,
      color: '#8b5cf6',
      faceId: 'classic'
    };

    const extraCount = list.length > 1 ? `<span class="lb-typing-cycle-badge" title="${esc(list.join(', '))}">${(typingRotateIdx % list.length) + 1}/${list.length}</span>` : '';

    el.innerHTML = `
      <div class="lb-typing-stage ${isRotatingTick ? 'lb-typing-rotate-anim' : ''}">
        <span class="lb-typing-ava">${renderLokiMascotSVG(botObj, botObj.styleId, 24, 'typ_' + (typingRotateIdx % 99))}</span>
        <span class="lb-typing-text">
          <strong class="lb-typing-bot-name">${esc(currentBotName)}</strong>
          <span class="lb-typing-label">typing</span>
        </span>
        <span class="lb-typing-wave" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
        ${extraCount}
      </div>
    `;
  }

  // ============================================================
  // PERSISTENT SHELL ARCHITECTURE (Never destroys #lbChatInput or #lbModalBackdrop!)
  // ============================================================
  function ensureShellMounted() {
    const root = $('#lokibotView');
    if (!root) return null;
    let shell = $('#lbShell', root);
    if (shell) return shell;

    root.innerHTML = `
      <div class="lb-shell" id="lbShell">
        <div class="lb-mob-scrim" id="lbMobScrim"></div>

        <!-- LEFT SIDEBAR -->
        <aside class="lb-left" id="lbLeftAside">
          <div class="lb-left-top">
            <button class="lb-back-btn" id="lbBackToChat" title="Back to Lokizenith Chat">
              <span>‹</span> <span>Chat</span>
            </button>
            <div class="lb-left-actions">
              <button class="lb-circle-icon" id="lbSearchToggle" title="Search bots & groups">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
              </button>
              <button class="lb-circle-icon lb-plus-btn" id="lbPlusBtn" title="Create New Bot or Group">+</button>
              <button class="lb-circle-icon lb-close-sb-btn" id="lbCloseSidebarBtn" title="Close sidebar">✕</button>
            </div>
          </div>

          <div class="lb-search-wrap" id="lbSearchWrap">
            <input type="text" id="lbSearchInput" placeholder="Search bots or groups..." value="" autocomplete="off" />
          </div>

          <div id="lbLeftDynamic" class="lb-left-dynamic"></div>

          <div class="lb-left-foot">
            <div class="lb-user-badge" title="Lokizenith Stark Ultra">L</div>
            <button class="lb-connect-btn" id="lbConnectAppsBtn">Connect apps</button>
            <button class="lb-foot-up" id="lbQuickComputerBtn" title="Trigger Live Linux Computer Demo">🖥</button>
          </div>
        </aside>

        <!-- CENTER CHAT AREA -->
        <main class="lb-center">
          <div class="lb-center-top" id="lbCenterTop"></div>
          <div class="lb-messages" id="lbMessages"></div>

          <!-- PERSISTENT BOTTOM COMPOSER AREA (Never destroyed on message updates!) -->
          <div class="lb-composer-area" id="lbComposerArea">
            <div class="lb-typing-indicator" id="lbTypingIndicator" hidden></div>
            <div class="lb-mention-popup" id="lbMentionPopup" hidden></div>
            <form class="lb-composer" id="lbComposerForm" autocomplete="off">
              <button type="button" class="lb-comp-plus" id="lbCompPlusBtn" title="Quick Actions / Linux Computer Task">+</button>
              <input
                type="text"
                id="lbChatInput"
                class="lb-chat-input"
                placeholder="Message LokiBot... (Use @ to mention or @everyone)"
                autocomplete="off"
              />
              <button type="button" class="lb-comp-mic" id="lbVoiceBtn" title="Voice Input">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>
              </button>
              <button type="submit" class="lb-comp-send" id="lbSendBtn" title="Send Message">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M5 12h14M13 5l7 7-7 7"/></svg>
              </button>
            </form>
          </div>
        </main>

        <!-- RIGHT SIDEBAR -->
        <aside class="lb-right" id="lbRightAside"></aside>
      </div>

      <!-- PERSISTENT MODAL CONTAINER (Never wiped by background chat updates!) -->
      <div class="lb-modal-backdrop" id="lbModalBackdrop" hidden></div>
    `;

    bindStaticShellEvents();
    return $('#lbShell', root);
  }

  function updateShellClasses() {
    const shell = $('#lbShell');
    if (!shell) return;
    shell.classList.toggle('mob-left-open', !!mobileSidebarOpen);
    shell.classList.toggle('mob-right-open', !!mobileRightOpen);
    shell.classList.toggle('desk-left-collapsed', !!desktopLeftCollapsed);
    shell.classList.toggle('desk-right-collapsed', !!desktopRightCollapsed);
  }

  function render(opts = {}) {
    const shell = ensureShellMounted();
    if (!shell) return;

    if (!getActiveEntity()) {
      if (state.groups.length > 0) {
        state.activeId = state.groups[0].id;
        state.activeType = 'group';
      } else if (state.bots.length > 0) {
        state.activeId = state.bots[0].id;
        state.activeType = 'bot';
      } else {
        state.activeId = null;
        state.activeType = null;
      }
    }

    updateShellClasses();
    renderLeftSidebarContent();
    renderCenterTopContent();
    renderMessagesContent(opts.keepScroll);
    renderRightSidebarContent();
    updateComposerState();
    ensureTypingRotationTimer();
    updateTypingIndicatorDOM();
  }

  function renderLeftSidebarContent() {
    const box = $('#lbLeftDynamic');
    if (!box) return;
    const active = getActiveEntity();
    const activeBots = getActiveBotsList();
    const q = searchQuery.trim().toLowerCase();
    const filteredGroups = state.groups.filter(g => !q || g.name.toLowerCase().includes(q));
    const filteredBots = state.bots.filter(b => !q || b.name.toLowerCase().includes(q) || (b.instructions || '').toLowerCase().includes(q));

    box.innerHTML = `
      <div class="lb-hero-spot">
        ${active ? `
          <div class="lb-hero-avatar" id="lbHeroAvatarBtn" title="${state.activeType === 'bot' ? 'Click to open Bot Profile & Avatar Editor' : ''}">
            ${state.activeType === 'group'
              ? renderGroupClusterAvatar(active, 60)
              : renderLokiMascotSVG(active, active.styleId, 60, 'hero_' + active.id)}
          </div>
          <div class="lb-hero-name">${esc(active.name)}</div>
          <div class="lb-hero-sub">${state.activeType === 'group' ? `${activeBots.length} LokiBots · 24/7 Group` : esc(active.instructions)}</div>
          ${state.activeType === 'bot' ? `
            <button type="button" class="lb-hero-edit-btn" id="lbHeroEditProfileBtn">🎨 Edit Profile & Avatar</button>
          ` : ''}
        ` : `
          <div class="lb-hero-avatar lb-hero-empty" id="lbHeroCreateTrigger">
            ${renderLokiMascotSVG('#0ea5e9', 'classic', 60, 'hero_empty')}
          </div>
          <div class="lb-hero-name">No LokiBots Yet</div>
          <div class="lb-hero-sub">Click <b>+</b> to create your first LokiBot</div>
        `}
      </div>

      <div class="lb-list" id="lbSidebarList">
        ${filteredGroups.map(g => {
          const gMsgs = state.messages[g.id] || [];
          const last = gMsgs[gMsgs.length - 1];
          const isAct = state.activeType === 'group' && state.activeId === g.id;
          return `
            <div class="lb-item ${isAct ? 'active' : ''}" data-type="group" data-id="${g.id}">
              <div class="lb-item-avatar lb-cluster-wrap">
                ${renderGroupClusterAvatar(g, 38)}
              </div>
              <div class="lb-item-body">
                <div class="lb-item-title">
                  <span>${esc(g.name)}</span>
                  <span class="lb-badge-group">Group</span>
                </div>
                <div class="lb-item-preview">${last ? `${esc(last.senderName || 'You')}: ${esc(last.text.slice(0, 42))}` : `${(g.memberIds || []).length} bots ready 24/7`}</div>
              </div>
            </div>
          `;
        }).join('')}

        ${filteredBots.map(b => {
          const bMsgs = state.messages[b.id] || [];
          const last = bMsgs[bMsgs.length - 1];
          const isAct = state.activeType === 'bot' && state.activeId === b.id;
          return `
            <div class="lb-item ${isAct ? 'active' : ''}" data-type="bot" data-id="${b.id}">
              <div class="lb-item-avatar">
                ${renderLokiMascotSVG(b, b.styleId, 38, 'list_' + b.id)}
                <span class="lb-online-dot"></span>
              </div>
              <div class="lb-item-body">
                <div class="lb-item-title">
                  <span>${esc(b.name)}</span>
                </div>
                <div class="lb-item-preview">${last ? esc(last.text.slice(0, 46)) : esc(b.instructions)}</div>
              </div>
              <button type="button" class="lb-item-profile-btn" data-edit-bot-id="${b.id}" title="Edit ${esc(b.name)} Profile & Avatar">🎨</button>
            </div>
          `;
        }).join('')}

        ${filteredGroups.length === 0 && filteredBots.length === 0 ? `
          <div class="lb-empty-list">
            <p>You have no existing LokiBots yet.</p>
            <button class="lb-create-cta" id="lbEmptyPlusBtn">+ Create Your First LokiBot</button>
          </div>
        ` : ''}
      </div>
    `;

    $('#lbHeroCreateTrigger', box)?.addEventListener('click', handlePlusClick);
    $('#lbEmptyPlusBtn', box)?.addEventListener('click', handlePlusClick);
    $('#lbHeroAvatarBtn', box)?.addEventListener('click', () => {
      if (state.activeType === 'bot' && active) openBotProfileModal(active.id);
    });
    $('#lbHeroEditProfileBtn', box)?.addEventListener('click', () => {
      if (state.activeType === 'bot' && active) openBotProfileModal(active.id);
    });

    $$('[data-edit-bot-id]', box).forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        openBotProfileModal(btn.dataset.editBotId);
      });
    });

    $$('.lb-item', box).forEach(item => {
      item.addEventListener('click', () => {
        state.activeType = item.dataset.type;
        state.activeId = item.dataset.id;
        mobileSidebarOpen = false;
        saveState();
        render();
      });
    });
  }

  function renderCenterTopContent() {
    const top = $('#lbCenterTop');
    if (!top) return;
    const active = getActiveEntity();
    const isDebating = active ? !!state.autoDebate[active.id] : false;

    top.innerHTML = `
      <div class="lb-center-top-left">
        <button class="lb-mob-btn lb-toggle-left-btn" id="lbMobLeftBtn" title="Toggle Chats Sidebar">☰</button>
        <button class="lb-back-btn lb-center-back" id="lbCenterBackToChat" title="Back to Regular Chat">‹ Chat</button>
      </div>
      ${active ? `
        <div class="lb-top-pill" id="lbTopPill" title="${state.activeType === 'bot' ? 'Click to edit Bot Profile & Avatar' : ''}">
          <div class="lb-top-pill-ava">
            ${state.activeType === 'group'
              ? renderGroupClusterAvatar(active, 20)
              : renderLokiMascotSVG(active, active.styleId, 20, 'pill_' + active.id)}
          </div>
          <span class="lb-top-pill-name">${esc(active.name)}</span>
          <span class="lb-top-pill-model">Stark Ultra 4.0</span>
        </div>
        <div class="lb-top-controls">
          ${state.activeType === 'bot' ? `
            <button class="lb-action-chip lb-profile-chip" id="lbTopEditProfileBtn" title="Open Bot Profile: Edit Avatar, Hat, Hair, Clothes & Specialty">
              🎨 Profile
            </button>
          ` : ''}
          <button class="lb-action-chip ${isDebating ? 'active' : ''}" id="lbToggleDebateBtn" title="Let bots talk & argue nonstop autonomously 24/7">
            ${isDebating ? '🔥 Nonstop: ON' : '💬 Auto-Talk'}
          </button>
          <button class="lb-action-chip lb-comp-chip" id="lbSendComputerTaskBtn" title="Ask bot to use its Linux Computer & Google Chrome">
            🖥 Linux PC
          </button>
        </div>
      ` : `
        <div class="lb-top-pill">
          <span class="lb-top-pill-name">LokiBot 24/7 Studio</span>
        </div>
      `}
      <button class="lb-mob-btn lb-toggle-right-btn" id="lbMobRightBtn" title="Bot Profile, Details & Linux Computer">⚙</button>
    `;

    $('#lbMobLeftBtn', top)?.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        mobileSidebarOpen = !mobileSidebarOpen;
        mobileRightOpen = false;
      } else {
        desktopLeftCollapsed = !desktopLeftCollapsed;
      }
      updateShellClasses();
    });

    $('#lbMobRightBtn', top)?.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        mobileRightOpen = !mobileRightOpen;
        mobileSidebarOpen = false;
      } else {
        desktopRightCollapsed = !desktopRightCollapsed;
      }
      updateShellClasses();
    });

    $('#lbCenterBackToChat', top)?.addEventListener('click', () => {
      if (window.App && typeof window.App.showView === 'function') {
        window.App.showView('chat');
      }
    });

    $('#lbTopPill', top)?.addEventListener('click', () => {
      if (state.activeType === 'bot' && active) {
        openBotProfileModal(active.id);
      }
    });

    $('#lbTopEditProfileBtn', top)?.addEventListener('click', () => {
      if (state.activeType === 'bot' && active) {
        openBotProfileModal(active.id);
      }
    });

    $('#lbToggleDebateBtn', top)?.addEventListener('click', () => {
      const ent = getActiveEntity();
      if (!ent) return;
      state.autoDebate[ent.id] = !state.autoDebate[ent.id];
      saveState();
      renderCenterTopContent();
      if (state.autoDebate[ent.id]) {
        startAutonomousDebateLoop(ent.id, 'Debate and collaborate nonstop using your specialities');
      } else if (debateTimers[ent.id]) {
        clearTimeout(debateTimers[ent.id]);
        delete debateTimers[ent.id];
      }
    });

    $('#lbSendComputerTaskBtn', top)?.addEventListener('click', () => {
      const ent = getActiveEntity();
      const bots = getActiveBotsList();
      if (!ent || bots.length === 0) {
        handlePlusClick();
        return;
      }
      state.rightTab = 'computer';
      saveState();
      renderRightSidebarContent();
      animateLinuxComputerTask(ent.id, bots[0], `Open Google Chrome on your Linux computer and search for ${bots[0].instructions} latest tools`);
    });
  }

  function renderMessagesContent(keepScroll = false) {
    const box = $('#lbMessages');
    if (!box) return;
    const active = getActiveEntity();
    const activeBots = getActiveBotsList();
    const msgs = active ? (state.messages[active.id] || []) : [];

    if (!active) {
      box.innerHTML = `
        <div class="lb-welcome-empty">
          <div class="lb-welcome-mascot">
            ${renderLokiMascotSVG({ color: '#8b5cf6', faceId: 'star', hatId: 'crown', hairId: 'spiky_gold', clothesId: 'stark_armor' }, 'classic', 105, 'welcome_main')}
          </div>
          <h2>Welcome to LokiBot Studio</h2>
          <p>Create autonomous AI specialists powered by <b>Lokizenith 4.0 Stark Ultra</b>. Customize each LokiBot with colorful <b>hats, hair, outfits, and faces</b>, define its specialty, add bots to 24/7 group chats, or watch them control their own <b>Ubuntu Linux Computer</b>!</p>
          <button class="lb-welcome-btn" id="lbWelcomeCreateBtn">+ Create Your First LokiBot</button>
        </div>
      `;
      $('#lbWelcomeCreateBtn', box)?.addEventListener('click', handlePlusClick);
      return;
    }

    if (msgs.length === 0) {
      box.innerHTML = `
        <div class="lb-chat-starter">
          <div class="lb-starter-time">Today ${formatTime(Date.now())}</div>
          <div class="lb-starter-card">
            <div class="lb-starter-ava">
              ${state.activeType === 'group'
                ? renderGroupClusterAvatar(active, 56)
                : renderLokiMascotSVG(active, active.styleId, 56, 'start_' + active.id)}
            </div>
            <h3>${esc(active.name)}</h3>
            <p>${state.activeType === 'group'
              ? `Group with ${activeBots.map(b => `<b>@${esc(b.name)}</b> (${esc(b.instructions)})`).join(', ')}. Type <code>@</code> to mention a bot, <code>@everyone</code> to make all bots answer, or ask them to debate nonstop!`
              : `Speciality: <b>${esc(active.instructions)}</b>. Powered by Lokizenith 4.0 Stark Ultra with a dedicated Ubuntu Linux computer.`}</p>
            <div class="lb-starter-prompts">
              <button class="lb-quick-prompt" data-prompt="${state.activeType === 'group' ? '@everyone Introduce yourselves and argue about whose speciality is more important!' : 'Introduce yourself and show me an example of what you can build!'}">⚡ ${state.activeType === 'group' ? '@everyone Debate & Argue Nonstop' : 'Introduce & Demo Speciality'}</button>
              <button class="lb-quick-prompt" data-prompt="Open Google Chrome on your Linux computer and search for the latest AI breakthroughs">🖥 Open Chrome on Linux PC</button>
              <button class="lb-quick-prompt" data-prompt="Open your Linux terminal and run a system diagnostic and Python benchmark">💻 Run Linux Terminal Task</button>
            </div>
          </div>
        </div>
      `;
      $$('[data-prompt]', box).forEach(btn => {
        btn.addEventListener('click', () => handleUserMessage(btn.dataset.prompt));
      });
      return;
    }

    box.innerHTML = msgs.map(m => renderMessageHTML(m)).join('');
    $$('[data-open-bot-profile]', box).forEach(el => {
      el.addEventListener('click', () => {
        if (el.dataset.openBotProfile) openBotProfileModal(el.dataset.openBotProfile);
      });
    });
    if (!keepScroll) scrollToBottom();
  }

  function renderRightSidebarContent() {
    const right = $('#lbRightAside');
    if (!right) return;
    const active = getActiveEntity();
    const activeBots = getActiveBotsList();
    const comp = active ? getComputerSession(active.id) : getComputerSession('default');

    right.innerHTML = `
      <div class="lb-right-top">
        <button class="lb-circle-icon" id="lbShareBotBtn" title="Export / Share Bot">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 3v12M7 8l5-5 5 5"/><path d="M5 15v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>
        </button>
        <button class="lb-circle-icon" id="lbDeleteEntityBtn" title="Delete current Bot or Group">🗑</button>
        <button class="lb-circle-icon lb-close-sb-btn" id="lbCloseRightBtn" title="Close details panel">✕</button>
      </div>

      ${active ? `
        <div class="lb-right-profile">
          <div class="lb-right-ava" id="lbRightProfileAva" title="${state.activeType === 'bot' ? 'Click to edit Avatar & Profile' : ''}">
            ${state.activeType === 'group'
              ? renderGroupClusterAvatar(active, 68)
              : renderLokiMascotSVG(active, active.styleId, 68, 'right_' + active.id)}
          </div>
          <div class="lb-right-name">${esc(active.name)}</div>
          <div class="lb-right-role">${state.activeType === 'group' ? `${activeBots.length} Agents · Stark Ultra 4.0` : esc(active.instructions)}</div>
          ${state.activeType === 'bot' ? `
            <button type="button" class="lb-edit-profile-cta" id="lbRightEditProfileBtn">
              🎨 Edit Profile, Avatar & Specialty
            </button>
          ` : ''}
        </div>

        <div class="lb-right-tabs">
          <button class="lb-rtab ${state.rightTab === 'details' ? 'active' : ''}" data-rtab="details">Profile</button>
          <button class="lb-rtab ${state.rightTab === 'library' ? 'active' : ''}" data-rtab="library">Library</button>
          <button class="lb-rtab ${state.rightTab === 'computer' ? 'active' : ''}" data-rtab="computer">Computer</button>
        </div>

        <div class="lb-right-content">
          ${state.rightTab === 'details' ? `
            <div class="lb-details-pane">
              ${state.activeType === 'group' ? `
                <div class="lb-detail-section">
                  <div class="lb-detail-title">Group Members (${activeBots.length}) — click 🎨 to edit profile</div>
                  <div class="lb-member-cards">
                    ${activeBots.map(b => `
                      <div class="lb-mini-member">
                        ${renderLokiMascotSVG(b, b.styleId, 32, 'mem_' + b.id)}
                        <div class="lb-mm-info">
                          <div class="lb-mm-name">@${esc(b.name)}</div>
                          <div class="lb-mm-spec">${esc(b.instructions)}</div>
                        </div>
                        <button type="button" class="lb-mm-edit-btn" data-edit-member-id="${b.id}" title="Edit ${esc(b.name)}'s Profile & Avatar">🎨 Edit</button>
                      </div>
                    `).join('')}
                  </div>
                </div>
              ` : `
                <div class="lb-detail-section">
                  <div class="lb-detail-title-row">
                    <span class="lb-detail-title">Speciality & Instructions</span>
                    <button type="button" class="lb-inline-edit-link" id="lbInlineEditSpecBtn">✏️ Edit</button>
                  </div>
                  <div class="lb-spec-box">${esc(active.instructions)}</div>
                </div>

                <div class="lb-detail-section">
                  <div class="lb-detail-title">Equipped Avatar Gear</div>
                  <div class="lb-gear-badges">
                    <span class="lb-gear-chip">😊 ${(AVATAR_FACES.find(f => f.id === (active.faceId || active.styleId)) || AVATAR_FACES[0]).label}</span>
                    <span class="lb-gear-chip">🎩 ${(AVATAR_HATS.find(h => h.id === (active.hatId || 'none')) || AVATAR_HATS[0]).label}</span>
                    <span class="lb-gear-chip">💇 ${(AVATAR_HAIRS.find(h => h.id === (active.hairId || 'none')) || AVATAR_HAIRS[0]).label}</span>
                    <span class="lb-gear-chip">👕 ${(AVATAR_CLOTHES.find(c => c.id === (active.clothesId || 'none')) || AVATAR_CLOTHES[0]).label}</span>
                  </div>
                </div>
              `}

              <div class="lb-routine-note">
                Routines are recurring 24/7 tasks this ${state.activeType === 'group' ? 'Group' : 'Bot'} runs autonomously. Ask in chat or toggle Auto-Talk.
              </div>

              <div class="lb-detail-section">
                <div class="lb-detail-title">Voice chat</div>
                <div class="lb-voice-card">
                  <div class="lb-voice-row">
                    <span>Voice</span>
                    <select class="lb-voice-select"><option>Liora</option><option>Stark Ultra</option><option>Nova</option></select>
                  </div>
                  <div class="lb-voice-row">
                    <span>Speed</span>
                    <select class="lb-voice-select"><option>1x</option><option>1.25x</option><option>1.5x</option></select>
                  </div>
                  <div class="lb-voice-row">
                    <span>Language</span>
                    <select class="lb-voice-select"><option>Auto-detect</option><option>English</option><option>עברית</option></select>
                  </div>
                </div>
              </div>
            </div>
          ` : state.rightTab === 'library' ? `
            <div class="lb-library-pane">
              <div class="lb-detail-title">Shared Prompts & Tasks</div>
              <button class="lb-lib-btn" data-prompt="@everyone Debate nonstop about the future of AI and mention each other!">🔥 Start Nonstop Agent Debate</button>
              <button class="lb-lib-btn" data-prompt="Open Google Chrome on your Linux computer and research quantum computing">🌐 Chrome Web Research</button>
              <button class="lb-lib-btn" data-prompt="Open Linux Terminal and write a Python script to analyze system metrics">🐧 Linux Terminal & Python</button>
              <button class="lb-lib-btn" id="lbClearHistoryBtn">🧹 Clear Chat History</button>
            </div>
          ` : `
            <div class="lb-computer-pane">
              <div class="lb-comp-badge-bar">
                <span class="lb-live-dot"></span>
                <span>Ubuntu 24.04 Linux VM · Live</span>
              </div>
              ${renderLinuxDesktopHTML(comp, 'sidebar')}
              <div class="lb-comp-quick-actions">
                <button class="lb-comp-act" data-comp-task="Open Google Chrome and search for Lokizenith 4.0 Stark Ultra">🌐 Chrome Search</button>
                <button class="lb-comp-act" data-comp-task="Open Linux Terminal and run htop & python3 diagnostic">💻 Run Terminal</button>
              </div>
            </div>
          `}
        </div>
      ` : `
        <div class="lb-right-empty">
          <p>Select or create a LokiBot to inspect its profile, customize its avatar, and view its live Linux computer.</p>
        </div>
      `}
    `;

    $('#lbRightProfileAva', right)?.addEventListener('click', () => {
      if (state.activeType === 'bot' && active) openBotProfileModal(active.id);
    });
    $('#lbRightEditProfileBtn', right)?.addEventListener('click', () => {
      if (state.activeType === 'bot' && active) openBotProfileModal(active.id);
    });
    $('#lbInlineEditSpecBtn', right)?.addEventListener('click', () => {
      if (state.activeType === 'bot' && active) openBotProfileModal(active.id);
    });
    $$('[data-edit-member-id]', right).forEach(btn => {
      btn.addEventListener('click', () => openBotProfileModal(btn.dataset.editMemberId));
    });

    $$('.lb-rtab', right).forEach(tab => {
      tab.addEventListener('click', () => {
        state.rightTab = tab.dataset.rtab;
        saveState();
        renderRightSidebarContent();
      });
    });

    $$('[data-prompt]', right).forEach(btn => {
      btn.addEventListener('click', () => handleUserMessage(btn.dataset.prompt));
    });

    $$('[data-comp-task]', right).forEach(btn => {
      btn.addEventListener('click', () => {
        const ent = getActiveEntity();
        const bots = getActiveBotsList();
        if (!ent || bots.length === 0) return;
        animateLinuxComputerTask(ent.id, bots[0], btn.dataset.compTask);
      });
    });

    $('#lbClearHistoryBtn', right)?.addEventListener('click', () => {
      const ent = getActiveEntity();
      if (!ent) return;
      state.messages[ent.id] = [];
      saveState();
      renderMessagesContent();
      renderLeftSidebarContent();
    });

    $('#lbDeleteEntityBtn', right)?.addEventListener('click', () => {
      const ent = getActiveEntity();
      if (!ent) return;
      if (state.activeType === 'group') {
        state.groups = state.groups.filter(g => g.id !== ent.id);
      } else {
        state.bots = state.bots.filter(b => b.id !== ent.id);
      }
      delete state.messages[ent.id];
      state.activeId = null;
      state.activeType = null;
      saveState();
      render();
    });

    $('#lbShareBotBtn', right)?.addEventListener('click', () => {
      const ent = getActiveEntity();
      if (!ent) return;
      handleUserMessage('Create a template of yourself that I can share with somebody else.');
    });

    $('#lbCloseRightBtn', right)?.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        mobileRightOpen = false;
      } else {
        desktopRightCollapsed = true;
      }
      updateShellClasses();
    });
  }

  function updateComposerState() {
    const active = getActiveEntity();
    const chatInput = $('#lbChatInput');
    const sendBtn = $('#lbSendBtn');
    if (chatInput) {
      chatInput.disabled = !active;
      chatInput.placeholder = active
        ? `Message ${active.name}... (Use @ to mention or @everyone)`
        : 'Create a LokiBot first with the + button...';
    }
    if (sendBtn) {
      sendBtn.disabled = !active;
    }
  }

  function renderGroupClusterAvatar(group, size = 48) {
    const members = (group.memberIds || []).map(id => state.bots.find(b => b.id === id)).filter(Boolean).slice(0, 3);
    if (members.length === 0) {
      return renderLokiMascotSVG('#0ea5e9', 'classic', size, 'grp_empty_' + group.id);
    }
    const subSize = Math.round(size * 0.62);
    return `
      <div class="lb-group-cluster" style="width:${size}px;height:${size}px">
        ${members.map((m, idx) => `
          <div class="lb-cluster-item lb-ci-${idx}">
            ${renderLokiMascotSVG(m, m.styleId, subSize, `gc_${group.id}_${m.id}_${idx}`)}
          </div>
        `).join('')}
      </div>
    `;
  }

  function formatMessageText(text) {
    let safe = esc(text || '');
    safe = safe.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="lb-code-block"><code>${code.trim()}</code></pre>`;
    });
    safe = safe.replace(/(@everyone|@[A-Za-z0-9_\-\u0590-\u05FF]+)/g, '<span class="lb-mention-tag">$1</span>');
    safe = safe.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    safe = safe.replace(/`([^`]+)`/g, '<code>$1</code>');
    return safe.replace(/\n/g, '<br>');
  }

  function renderLinuxDesktopHTML(comp, instanceKey = 'chat') {
    const isChrome = comp.app !== 'terminal';
    return `
      <div class="lb-linux-vm" data-vm-instance="${esc(instanceKey)}">
        <div class="lb-linux-topbar">
          <span class="lb-linux-activities">Activities · Ubuntu 24.04</span>
          <span class="lb-linux-clock">${esc(comp.status || 'Live Virtual Desktop')}</span>
          <div class="lb-linux-dots"><span></span><span></span><span></span></div>
        </div>
        <div class="lb-linux-screen">
          <div class="lb-linux-dock">
            <div class="lb-dock-icon ${isChrome ? 'active' : ''}" title="Google Chrome">🌐</div>
            <div class="lb-dock-icon ${!isChrome ? 'active' : ''}" title="Ubuntu Terminal">💻</div>
            <div class="lb-dock-icon" title="Files">📁</div>
          </div>

          <div class="lb-linux-window">
            ${isChrome ? `
              <div class="lb-chrome-bar">
                <div class="lb-chrome-dots"><i></i><i></i><i></i></div>
                <div class="lb-chrome-tab">Google Chrome · ${esc(comp.query || 'New Tab')}</div>
              </div>
              <div class="lb-chrome-addr">
                <span class="lb-lock">🔒</span>
                <input type="text" readonly class="lb-chrome-url" value="${esc(comp.url || 'https://www.google.com')}" />
              </div>
              <div class="lb-chrome-viewport">
                <div class="lb-google-logo">
                  <span style="color:#4285F4">G</span><span style="color:#EA4335">o</span><span style="color:#FBBC05">o</span><span style="color:#4285F4">g</span><span style="color:#34A853">l</span><span style="color:#EA4335">e</span>
                </div>
                <div class="lb-google-searchbox">
                  <span>🔍</span>
                  <span class="lb-live-typed">${esc(comp.typedText || comp.query || 'Search Google or type a URL')}</span>
                  <span class="lb-typing-caret"></span>
                </div>
                ${comp.results && comp.results.length > 0 ? `
                  <div class="lb-google-results">
                    ${comp.results.map(r => `
                      <div class="lb-g-res">
                        <div class="lb-g-url">${esc(r.url)}</div>
                        <div class="lb-g-title">${esc(r.title)}</div>
                        <div class="lb-g-snip">${esc(r.snippet)}</div>
                      </div>
                    `).join('')}
                  </div>
                ` : ''}
              </div>
            ` : `
              <div class="lb-term-bar">
                <span>lokibot@stark-ultra-vm: ~ (bash)</span>
              </div>
              <div class="lb-term-body">
                ${(comp.terminalLines || []).map(l => `<div class="lb-term-line">${esc(l)}</div>`).join('')}
                <div class="lb-term-line lb-term-live">
                  <span>lokibot@stark-ultra-vm:~$ </span>
                  <span class="lb-live-typed">${esc(comp.typedText || '')}</span>
                  <span class="lb-typing-caret"></span>
                </div>
              </div>
            `}
          </div>

          <div class="lb-linux-cursor ${comp.clicking ? 'clicking' : ''}" style="left:${comp.cursorX || 50}%;top:${comp.cursorY || 50}%">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#111827" stroke="#ffffff" stroke-width="1.8">
              <path d="M4 3l16 9-7 2-3 7L4 3z"/>
            </svg>
            <span class="lb-cursor-click-ring"></span>
          </div>
        </div>
      </div>
    `;
  }

  function renderMessageHTML(m) {
    if (m.role === 'user') {
      return `
        <div class="lb-msg-row lb-msg-user" data-msg-id="${m.id}">
          <div class="lb-msg-time">${formatTime(m.ts)}</div>
          <div class="lb-user-bubble">${formatMessageText(m.text)}</div>
        </div>
      `;
    }
    const bot = state.bots.find(b => b.id === m.botId) || {
      id: m.botId || '',
      name: m.senderName || 'LokiBot',
      color: m.botColor || '#8b5cf6',
      styleId: m.botStyle || 'classic',
      faceId: m.botFace || m.botStyle || 'classic',
      hatId: m.botHat || 'none',
      hairId: m.botHair || 'none',
      clothesId: m.botClothes || 'none',
      instructions: m.botSpec || 'Specialist'
    };

    return `
      <div class="lb-msg-row lb-msg-bot" data-msg-id="${m.id}">
        <div class="lb-bot-meta">
          <div class="lb-bot-meta-ava" data-open-bot-profile="${esc(bot.id)}" title="Click to view/edit ${esc(bot.name)}'s Profile & Avatar" style="cursor:pointer">
            ${renderLokiMascotSVG(bot, bot.styleId, 28, 'msg_' + m.id)}
          </div>
          <span class="lb-bot-meta-name" data-open-bot-profile="${esc(bot.id)}" style="cursor:pointer">${esc(bot.name)}</span>
          <span class="lb-bot-meta-spec">${esc(bot.instructions)}</span>
          <span class="lb-bot-meta-time">${formatTime(m.ts)}</span>
        </div>
        <div class="lb-bot-bubble">
          <div class="lb-bot-text">${formatMessageText(m.text)}</div>
          ${m.computerSnap ? `
            <div class="lb-msg-computer-wrap">
              <div class="lb-msg-comp-head">
                <span>🖥 ${esc(bot.name)}'s Live Linux Computer (${esc(m.computerSnap.app === 'terminal' ? 'Ubuntu Terminal' : 'Google Chrome')})</span>
                <span class="lb-comp-live-pill">● LIVE MOUSE & TYPING</span>
              </div>
              ${renderLinuxDesktopHTML(m.computerSnap, 'msg_' + m.id)}
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  function scrollToBottom() {
    const box = $('#lbMessages');
    if (box) {
      box.scrollTop = box.scrollHeight + 400;
    }
  }

  // ============================================================
  // "+" BUTTON, BOT CREATION & BOT PROFILE EDITOR MODAL
  // Shared multi-category Avatar Studio (Faces, Hats, Hair, Clothes, Colors) + Specialty Editor
  // ============================================================
  function handlePlusClick() {
    ensureShellMounted();
    if (state.bots.length === 0) {
      openCreateBotModal();
    } else {
      openPlusChoiceModal();
    }
  }

  function openPlusChoiceModal() {
    ensureShellMounted();
    const backdrop = $('#lbModalBackdrop');
    if (!backdrop) return;
    backdrop.hidden = false;
    backdrop.innerHTML = `
      <div class="lb-modal lb-choice-modal" role="dialog" aria-label="Create Option">
        <div class="lb-modal-head">
          <h3>What would you like to create?</h3>
          <button type="button" class="lb-modal-close" id="lbCloseModalBtn">✕</button>
        </div>
        <div class="lb-choice-grid">
          <button type="button" class="lb-choice-card" id="lbChooseNewBot">
            <div class="lb-choice-icon">
              ${renderLokiMascotSVG({ color: '#8b5cf6', faceId: 'star', hatId: 'crown', hairId: 'spiky_gold', clothesId: 'stark_armor' }, 'classic', 64, 'choice_bot')}
            </div>
            <div class="lb-choice-title">Create a New Bot</div>
            <div class="lb-choice-desc">Design a colorful LokiBot avatar with hats, hair, outfits & faces, name it, and set its specialty.</div>
          </button>
          <button type="button" class="lb-choice-card" id="lbChooseNewGroup">
            <div class="lb-choice-icon lb-choice-grp-icon">
              ${renderLokiMascotSVG({ color: '#0ea5e9', faceId: 'cool', hatId: 'headphones', clothesId: 'hoodie' }, 'happy', 46, 'choice_g1')}
              ${renderLokiMascotSVG({ color: '#ec4899', faceId: 'blush', hatId: 'wizard', clothesId: 'wizard_robe' }, 'cyber', 46, 'choice_g2')}
            </div>
            <div class="lb-choice-title">Create a Group</div>
            <div class="lb-choice-desc">Combine your LokiBots into a 24/7 multi-agent group chat where they collaborate, @mention, and debate!</div>
          </button>
        </div>
      </div>
    `;
    $('#lbCloseModalBtn', backdrop)?.addEventListener('click', closeModal);
    $('#lbChooseNewBot', backdrop)?.addEventListener('click', () => openCreateBotModal());
    $('#lbChooseNewGroup', backdrop)?.addEventListener('click', () => openCreateGroupModal());
  }

  function openBotProfileModal(botId) {
    const existingBot = state.bots.find(b => b.id === botId);
    if (!existingBot) return;
    openBotCustomizerModal(existingBot);
  }

  function openCreateBotModal() {
    openBotCustomizerModal(null);
  }

  function openBotCustomizerModal(existingBot = null) {
    ensureShellMounted();
    const backdrop = $('#lbModalBackdrop');
    if (!backdrop) return;
    backdrop.hidden = false;

    const isEdit = !!existingBot;
    let draftName = existingBot ? existingBot.name : '';
    let draftSpec = existingBot ? existingBot.instructions : '';
    let draftColor = existingBot ? (existingBot.color || '#8b5cf6') : '#8b5cf6';
    let draftFace = existingBot ? (existingBot.faceId || existingBot.styleId || 'classic') : 'classic';
    let draftHat = existingBot ? (existingBot.hatId || 'none') : 'none';
    let draftHair = existingBot ? (existingBot.hairId || 'none') : 'none';
    let draftClothes = existingBot ? (existingBot.clothesId || 'none') : 'none';
    let activeCategory = 'face'; // 'face' | 'hat' | 'hair' | 'clothes' | 'color'

    const SPECIALTY_PRESETS = [
      'LSL Professional Scripter',
      'Python & AI Architect',
      'Full-Stack Web Developer',
      'Cybersecurity & Linux Expert',
      'Game Designer & 3D Math',
      'Creative Story & Copywriter'
    ];

    // Build modal DOM ONCE so inputs (#lbBotNameInput, #lbBotSpecInput) NEVER lose focus!
    backdrop.innerHTML = `
      <div class="lb-modal lb-create-bot-modal lb-avatar-studio-modal" role="dialog" aria-label="${isEdit ? 'Bot Profile & Avatar Studio' : 'Create New Bot'}">
        <div class="lb-modal-head">
          <h3>${isEdit ? `🎨 ${esc(existingBot.name)} — Profile & Avatar` : '✨ Create New LokiBot'}</h3>
          <button type="button" class="lb-modal-close" id="lbCloseModalBtn">✕</button>
        </div>

        <div class="lb-cb-body">
          <div class="lb-studio-top-card">
            <div class="lb-cb-hero-preview" id="lbCbHeroPreview"></div>
            <div class="lb-studio-hero-actions">
              <button type="button" class="lb-random-ava-btn" id="lbRandomizeAvatarBtn">🎲 Randomize Avatar</button>
              <div class="lb-equipped-summary" id="lbEquippedSummary"></div>
            </div>
          </div>

          <div class="lb-studio-fields">
            <label class="lb-field-label">Bot Name</label>
            <input
              type="text"
              id="lbBotNameInput"
              class="lb-cb-input"
              placeholder="Name your Bot (e.g. Nexus, Nova, StarkScripter)"
              value="${esc(draftName)}"
              autocomplete="off"
            />

            <label class="lb-field-label">Bot Specialty & Instructions (מומחיות הבוט)</label>
            <textarea
              id="lbBotSpecInput"
              class="lb-cb-input lb-cb-spec-textarea"
              rows="2"
              placeholder="Describe what this bot specializes in (e.g. LSL Professional Scripter, Python Architect, Cyber Analyst)..."
            >${esc(draftSpec)}</textarea>

            <div class="lb-spec-presets" id="lbSpecPresets">
              ${SPECIALTY_PRESETS.map(sp => `
                <button type="button" class="lb-preset-chip" data-spec-preset="${esc(sp)}">${esc(sp)}</button>
              `).join('')}
            </div>
          </div>

          <div class="lb-ava-cat-tabs" id="lbAvaCatTabs">
            <button type="button" class="lb-ava-tab active" data-cat="face">😊 Faces</button>
            <button type="button" class="lb-ava-tab" data-cat="hat">🎩 Hats</button>
            <button type="button" class="lb-ava-tab" data-cat="hair">💇 Hair</button>
            <button type="button" class="lb-ava-tab" data-cat="clothes">👕 Clothes</button>
            <button type="button" class="lb-ava-tab" data-cat="color">🎨 Colors</button>
          </div>

          <div class="lb-cb-styles-grid" id="lbCbStylesGrid"></div>
        </div>

        <div class="lb-modal-foot">
          <button type="button" class="lb-btn-cancel" id="lbCancelBotBtn">Cancel</button>
          <button type="button" class="lb-btn-create ${draftName.trim().length > 0 ? 'ready' : ''}" id="lbConfirmCreateBotBtn">
            ${isEdit ? 'Save Profile Changes' : 'Create LokiBot'}
          </button>
        </div>
      </div>
    `;

    const nameIn = $('#lbBotNameInput', backdrop);
    const specIn = $('#lbBotSpecInput', backdrop);
    const createBtn = $('#lbConfirmCreateBotBtn', backdrop);
    const heroPreview = $('#lbCbHeroPreview', backdrop);
    const equippedSummary = $('#lbEquippedSummary', backdrop);
    const stylesGrid = $('#lbCbStylesGrid', backdrop);
    const catTabs = $('#lbAvaCatTabs', backdrop);

    function getDraftAvatarObj(overrides = {}) {
      return {
        color: overrides.color ?? draftColor,
        faceId: overrides.faceId ?? draftFace,
        hatId: overrides.hatId ?? draftHat,
        hairId: overrides.hairId ?? draftHair,
        clothesId: overrides.clothesId ?? draftClothes
      };
    }

    function refreshMascotPreviewAndGrid() {
      const currentAvatar = getDraftAvatarObj();
      if (heroPreview) {
        heroPreview.innerHTML = renderLokiMascotSVG(currentAvatar, draftFace, 118, 'cb_hero');
      }
      if (equippedSummary) {
        const fLabel = (AVATAR_FACES.find(x => x.id === draftFace) || AVATAR_FACES[0]).label;
        const hLabel = (AVATAR_HATS.find(x => x.id === draftHat) || AVATAR_HATS[0]).label;
        const hrLabel = (AVATAR_HAIRS.find(x => x.id === draftHair) || AVATAR_HAIRS[0]).label;
        const cLabel = (AVATAR_CLOTHES.find(x => x.id === draftClothes) || AVATAR_CLOTHES[0]).label;
        equippedSummary.innerHTML = `
          <span>😊 ${esc(fLabel)}</span>
          <span>🎩 ${esc(hLabel)}</span>
          <span>💇 ${esc(hrLabel)}</span>
          <span>👕 ${esc(cLabel)}</span>
        `;
      }

      if (catTabs) {
        $$('.lb-ava-tab', catTabs).forEach(t => {
          t.classList.toggle('active', t.dataset.cat === activeCategory);
        });
      }

      if (!stylesGrid) return;

      if (activeCategory === 'face') {
        stylesGrid.innerHTML = AVATAR_FACES.map(f => `
          <button type="button" class="lb-style-pick ${draftFace === f.id ? 'active' : ''}" data-pick-val="${f.id}">
            ${renderLokiMascotSVG(getDraftAvatarObj({ faceId: f.id }), f.id, 46, 'pk_f_' + f.id)}
            <span class="lb-pick-lbl">${esc(f.label)}</span>
          </button>
        `).join('');
        $$('.lb-style-pick', stylesGrid).forEach(btn => {
          btn.addEventListener('click', () => {
            draftFace = btn.dataset.pickVal;
            refreshMascotPreviewAndGrid();
          });
        });
      } else if (activeCategory === 'hat') {
        stylesGrid.innerHTML = AVATAR_HATS.map(h => `
          <button type="button" class="lb-style-pick ${draftHat === h.id ? 'active' : ''}" data-pick-val="${h.id}">
            ${renderLokiMascotSVG(getDraftAvatarObj({ hatId: h.id }), draftFace, 46, 'pk_h_' + h.id)}
            <span class="lb-pick-lbl">${esc(h.label)}</span>
          </button>
        `).join('');
        $$('.lb-style-pick', stylesGrid).forEach(btn => {
          btn.addEventListener('click', () => {
            draftHat = btn.dataset.pickVal;
            refreshMascotPreviewAndGrid();
          });
        });
      } else if (activeCategory === 'hair') {
        stylesGrid.innerHTML = AVATAR_HAIRS.map(hr => `
          <button type="button" class="lb-style-pick ${draftHair === hr.id ? 'active' : ''}" data-pick-val="${hr.id}">
            ${renderLokiMascotSVG(getDraftAvatarObj({ hairId: hr.id }), draftFace, 46, 'pk_hr_' + hr.id)}
            <span class="lb-pick-lbl">${esc(hr.label)}</span>
          </button>
        `).join('');
        $$('.lb-style-pick', stylesGrid).forEach(btn => {
          btn.addEventListener('click', () => {
            draftHair = btn.dataset.pickVal;
            refreshMascotPreviewAndGrid();
          });
        });
      } else if (activeCategory === 'clothes') {
        stylesGrid.innerHTML = AVATAR_CLOTHES.map(cl => `
          <button type="button" class="lb-style-pick ${draftClothes === cl.id ? 'active' : ''}" data-pick-val="${cl.id}">
            ${renderLokiMascotSVG(getDraftAvatarObj({ clothesId: cl.id }), draftFace, 46, 'pk_cl_' + cl.id)}
            <span class="lb-pick-lbl">${esc(cl.label)}</span>
          </button>
        `).join('');
        $$('.lb-style-pick', stylesGrid).forEach(btn => {
          btn.addEventListener('click', () => {
            draftClothes = btn.dataset.pickVal;
            refreshMascotPreviewAndGrid();
          });
        });
      } else if (activeCategory === 'color') {
        stylesGrid.innerHTML = `
          <div class="lb-cb-colors">
            ${BOT_COLORS.map(c => `
              <button
                type="button"
                class="lb-color-swatch ${draftColor === c ? 'active' : ''}"
                data-color="${c}"
                style="background:${c}"
                aria-label="Color ${c}"
              ></button>
            `).join('')}
          </div>
        `;
        $$('.lb-color-swatch', stylesGrid).forEach(btn => {
          btn.addEventListener('click', () => {
            draftColor = btn.dataset.color;
            refreshMascotPreviewAndGrid();
          });
        });
      }
    }

    refreshMascotPreviewAndGrid();

    $$('.lb-ava-tab', catTabs).forEach(tab => {
      tab.addEventListener('click', () => {
        activeCategory = tab.dataset.cat;
        refreshMascotPreviewAndGrid();
      });
    });

    $('#lbRandomizeAvatarBtn', backdrop)?.addEventListener('click', () => {
      draftColor = BOT_COLORS[Math.floor(Math.random() * BOT_COLORS.length)];
      draftFace = AVATAR_FACES[Math.floor(Math.random() * AVATAR_FACES.length)].id;
      draftHat = AVATAR_HATS[Math.floor(Math.random() * AVATAR_HATS.length)].id;
      draftHair = AVATAR_HAIRS[Math.floor(Math.random() * AVATAR_HAIRS.length)].id;
      draftClothes = AVATAR_CLOTHES[Math.floor(Math.random() * AVATAR_CLOTHES.length)].id;
      refreshMascotPreviewAndGrid();
    });

    $$('[data-spec-preset]', backdrop).forEach(chip => {
      chip.addEventListener('click', () => {
        if (specIn) {
          specIn.value = chip.dataset.specPreset;
          draftSpec = specIn.value;
        }
      });
    });

    nameIn?.addEventListener('input', (e) => {
      draftName = e.target.value;
      createBtn?.classList.toggle('ready', draftName.trim().length > 0);
    });
    specIn?.addEventListener('input', (e) => {
      draftSpec = e.target.value;
    });

    $('#lbCloseModalBtn', backdrop)?.addEventListener('click', closeModal);
    $('#lbCancelBotBtn', backdrop)?.addEventListener('click', closeModal);
    createBtn?.addEventListener('click', () => {
      const finalName = (nameIn ? nameIn.value : draftName).trim();
      if (!finalName) {
        nameIn?.focus();
        return;
      }
      const finalSpec = (specIn ? specIn.value : draftSpec).trim() || 'General AI & Linux Automation Specialist';

      if (isEdit && existingBot) {
        existingBot.name = finalName;
        existingBot.instructions = finalSpec;
        existingBot.color = draftColor;
        existingBot.styleId = draftFace;
        existingBot.faceId = draftFace;
        existingBot.hatId = draftHat;
        existingBot.hairId = draftHair;
        existingBot.clothesId = draftClothes;

        // Also update cached sender metadata in messages so chat history reflects the new name/specialty/avatar
        Object.keys(state.messages).forEach(cId => {
          (state.messages[cId] || []).forEach(msg => {
            if (msg.botId === existingBot.id) {
              msg.senderName = existingBot.name;
              msg.botColor = existingBot.color;
              msg.botStyle = existingBot.faceId;
              msg.botFace = existingBot.faceId;
              msg.botHat = existingBot.hatId;
              msg.botHair = existingBot.hairId;
              msg.botClothes = existingBot.clothesId;
              msg.botSpec = existingBot.instructions;
            }
          });
        });

        saveState();
        closeModal();
        render({ keepScroll: true });
        return;
      }

      const newBot = {
        id: 'bot_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: finalName,
        instructions: finalSpec,
        color: draftColor,
        styleId: draftFace,
        faceId: draftFace,
        hatId: draftHat,
        hairId: draftHair,
        clothesId: draftClothes,
        createdAt: Date.now()
      };
      state.bots.push(newBot);
      state.activeId = newBot.id;
      state.activeType = 'bot';
      state.messages[newBot.id] = [
        {
          id: 'msg_' + Date.now(),
          role: 'bot',
          botId: newBot.id,
          senderName: newBot.name,
          botColor: newBot.color,
          botStyle: newBot.faceId,
          botFace: newBot.faceId,
          botHat: newBot.hatId,
          botHair: newBot.hairId,
          botClothes: newBot.clothesId,
          botSpec: newBot.instructions,
          text: `Hey! I'm **${newBot.name}** — your **${newBot.instructions}** specialist powered by **Lokizenith 4.0 Stark Ultra**. Ask me anything, give me a coding or research task, or click **🎨 Profile** anytime to customize my avatar and specialty!`,
          ts: Date.now()
        }
      ];
      saveState();
      closeModal();
      render();
    });

    if (!isEdit) {
      setTimeout(() => nameIn?.focus(), 40);
    }
  }

  function openCreateGroupModal() {
    ensureShellMounted();
    const backdrop = $('#lbModalBackdrop');
    if (!backdrop) return;
    backdrop.hidden = false;

    let groupName = '';
    let selectedIds = state.bots.slice(0, 2).map(b => b.id);

    backdrop.innerHTML = `
      <div class="lb-modal lb-create-group-modal" role="dialog" aria-label="Create a Group">
        <div class="lb-modal-head">
          <h3>Create a 24/7 LokiBot Group</h3>
          <button type="button" class="lb-modal-close" id="lbCloseModalBtn">✕</button>
        </div>

        <div class="lb-cg-body">
          <input
            type="text"
            id="lbGroupNameInput"
            class="lb-cb-input"
            placeholder="Name your Group (e.g. Stark Dev Squad, AI Debate Club)"
            value=""
            autocomplete="off"
          />

          <div class="lb-cg-section-label" id="lbCgSelectedLabel">Selected Members — click ✕ to remove</div>
          <div class="lb-selected-members" id="lbSelectedMembers"></div>

          <div class="lb-cg-section-label">Your LokiBots — click to add to group</div>
          <div class="lb-available-bots" id="lbAvailableBots"></div>
        </div>

        <div class="lb-modal-foot">
          <button type="button" class="lb-btn-cancel" id="lbCancelGroupBtn">Cancel</button>
          <button type="button" class="lb-btn-create" id="lbConfirmCreateGroupBtn">Create</button>
        </div>
      </div>
    `;

    const gNameIn = $('#lbGroupNameInput', backdrop);
    const createBtn = $('#lbConfirmCreateGroupBtn', backdrop);
    const selectedBox = $('#lbSelectedMembers', backdrop);
    const availBox = $('#lbAvailableBots', backdrop);
    const selLabel = $('#lbCgSelectedLabel', backdrop);

    function refreshGroupLists() {
      const selectedBots = selectedIds.map(id => state.bots.find(b => b.id === id)).filter(Boolean);
      const currentName = (gNameIn ? gNameIn.value : groupName).trim();
      const canCreate = currentName.length > 0 && selectedBots.length > 0;
      createBtn?.classList.toggle('ready', canCreate);
      if (selLabel) selLabel.textContent = `Selected Members (${selectedBots.length}) — click ✕ to remove`;

      if (selectedBox) {
        selectedBox.innerHTML = selectedBots.length === 0
          ? `<div class="lb-no-members">Click bots below to add them to this group</div>`
          : selectedBots.map(b => `
              <div class="lb-member-chip">
                ${renderLokiMascotSVG(b, b.styleId, 22, 'chip_' + b.id)}
                <span>${esc(b.name)}</span>
                <button type="button" class="lb-chip-remove" data-remove-id="${b.id}" title="Remove ${esc(b.name)}">✕</button>
              </div>
            `).join('');

        $$('.lb-chip-remove', selectedBox).forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const id = btn.dataset.removeId;
            selectedIds = selectedIds.filter(x => x !== id);
            refreshGroupLists();
          });
        });
      }

      if (availBox) {
        availBox.innerHTML = state.bots.map(b => {
          const isAdded = selectedIds.includes(b.id);
          return `
            <div class="lb-avail-bot ${isAdded ? 'added' : ''}" data-toggle-bot="${b.id}">
              <div class="lb-avail-ava">
                ${renderLokiMascotSVG(b, b.styleId, 36, 'avail_' + b.id)}
              </div>
              <div class="lb-avail-info">
                <div class="lb-avail-name">${esc(b.name)}</div>
                <div class="lb-avail-spec">${esc(b.instructions)}</div>
              </div>
              <div class="lb-avail-status">${isAdded ? '✓ Added' : '+ Add'}</div>
            </div>
          `;
        }).join('');

        $$('.lb-avail-bot', availBox).forEach(row => {
          row.addEventListener('click', () => {
            const id = row.dataset.toggleBot;
            if (selectedIds.includes(id)) {
              selectedIds = selectedIds.filter(x => x !== id);
            } else {
              selectedIds.push(id);
            }
            refreshGroupLists();
          });
        });
      }
    }

    refreshGroupLists();

    gNameIn?.addEventListener('input', (e) => {
      groupName = e.target.value;
      const selectedBots = selectedIds.map(id => state.bots.find(b => b.id === id)).filter(Boolean);
      createBtn?.classList.toggle('ready', groupName.trim().length > 0 && selectedBots.length > 0);
    });

    $('#lbCloseModalBtn', backdrop)?.addEventListener('click', closeModal);
    $('#lbCancelGroupBtn', backdrop)?.addEventListener('click', closeModal);
    createBtn?.addEventListener('click', () => {
      const finalName = (gNameIn ? gNameIn.value : groupName).trim();
      if (!finalName || selectedIds.length === 0) {
        if (!finalName) gNameIn?.focus();
        return;
      }
      const newGroup = {
        id: 'grp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
        name: finalName,
        memberIds: [...selectedIds],
        createdAt: Date.now()
      };
      state.groups.unshift(newGroup);
      state.activeId = newGroup.id;
      state.activeType = 'group';
      state.messages[newGroup.id] = [];
      saveState();
      closeModal();
      render();
      const members = getActiveBotsList();
      if (members.length > 0) {
        appendBotMessage(newGroup.id, members[0], `Welcome to **${newGroup.name}**! We have ${members.map(m => `@${m.name}`).join(', ')} online 24/7. Mention any of us with \`@\`, use \`@everyone\` to make all of us answer, or ask us any question!`);
      }
    });

    setTimeout(() => gNameIn?.focus(), 40);
  }

  function closeModal() {
    const backdrop = $('#lbModalBackdrop');
    if (backdrop) {
      backdrop.hidden = true;
      backdrop.innerHTML = '';
    }
  }

  // ============================================================
  // @MENTION AUTOCOMPLETE POPUP (@everyone + Bots in Chat)
  // ============================================================
  function handleInputMentionCheck() {
    const input = $('#lbChatInput');
    const popup = $('#lbMentionPopup');
    if (!input || !popup) return;

    const val = input.value;
    const caret = input.selectionStart || val.length;
    const before = val.slice(0, caret);
    const match = before.match(/(?:^|\s)@([A-Za-z0-9_\-\u0590-\u05FF]*)$/);

    if (!match) {
      mentionMenuOpen = false;
      popup.hidden = true;
      return;
    }

    mentionFilter = (match[1] || '').toLowerCase();
    const bots = getActiveBotsList();
    const options = [
      { tag: '@everyone', name: 'everyone', desc: 'Force all bots in this chat to answer', isEveryone: true },
      ...bots.map(b => ({ tag: `@${b.name}`, name: b.name, desc: b.instructions, bot: b }))
    ].filter(o => !mentionFilter || o.name.toLowerCase().includes(mentionFilter));

    if (options.length === 0) {
      mentionMenuOpen = false;
      popup.hidden = true;
      return;
    }

    mentionMenuOpen = true;
    if (mentionSelectedIdx >= options.length) mentionSelectedIdx = 0;

    popup.hidden = false;
    popup.innerHTML = options.map((o, idx) => `
      <div class="lb-mention-item ${idx === mentionSelectedIdx ? 'active' : ''}" data-mention-tag="${esc(o.tag)}">
        <div class="lb-mention-ava">
          ${o.isEveryone
            ? `<div class="lb-everyone-badge">@</div>`
            : renderLokiMascotSVG(o.bot, o.bot.styleId, 26, 'men_' + o.bot.id)}
        </div>
        <div class="lb-mention-info">
          <div class="lb-mention-name">${esc(o.tag)}</div>
          <div class="lb-mention-desc">${esc(o.desc)}</div>
        </div>
      </div>
    `).join('');

    $$('.lb-mention-item', popup).forEach(el => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        insertMention(el.dataset.mentionTag);
      });
    });
  }

  function insertMention(tag) {
    const input = $('#lbChatInput');
    const popup = $('#lbMentionPopup');
    if (!input) return;
    const val = input.value;
    const caret = input.selectionStart || val.length;
    const before = val.slice(0, caret).replace(/@([A-Za-z0-9_\-\u0590-\u05FF]*)$/, `${tag} `);
    const after = val.slice(caret);
    input.value = before + after;
    input.focus();
    mentionMenuOpen = false;
    if (popup) popup.hidden = true;
  }

  // ============================================================
  // LIVE LINUX COMPUTER ANIMATION (Live Mouse Move + Live Typing)
  // ============================================================
  async function animateLinuxComputerTask(convId, bot, taskText) {
    setBotTyping(convId, bot.name, true);
    try {
      const comp = getComputerSession(convId);
      const lower = taskText.toLowerCase();
      const isTerminal = /terminal|bash|ubuntu|python|script|command|htop|linux cli/i.test(lower) && !/chrome|google|search|browse/i.test(lower);

      comp.app = isTerminal ? 'terminal' : 'chrome';
      const cleanQuery = taskText
        .replace(/@everyone|@[A-Za-z0-9_\-\u0590-\u05FF]+/g, '')
        .replace(/open\s+google\s+chrome\s*(and)?\s*/i, '')
        .replace(/on\s+your\s+linux\s+computer\s*(and)?\s*/i, '')
        .replace(/search\s+(for)?\s*/i, '')
        .trim() || 'Lokizenith 4.0 Stark Ultra AI breakthroughs';

      comp.query = cleanQuery;
      comp.typedText = '';
      comp.status = `${bot.name} is moving the mouse...`;
      comp.cursorX = 18;
      comp.cursorY = 78;
      comp.results = [];

      const msgId = 'msg_comp_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
      const msgObj = {
        id: msgId,
        role: 'bot',
        botId: bot.id,
        senderName: bot.name,
        botColor: bot.color,
        botStyle: bot.faceId || bot.styleId,
        botFace: bot.faceId || bot.styleId,
        botHat: bot.hatId,
        botHair: bot.hairId,
        botClothes: bot.clothesId,
        botSpec: bot.instructions,
        text: `🖥 **${bot.name}** opened **${isTerminal ? 'Ubuntu Terminal' : 'Google Chrome'}** on its Linux computer and is controlling the mouse & keyboard live...`,
        computerSnap: JSON.parse(JSON.stringify(comp)),
        ts: Date.now()
      };

      if (!state.messages[convId]) state.messages[convId] = [];
      state.messages[convId].push(msgObj);
      saveState();
      renderMessagesContent();
      renderLeftSidebarContent();

      const updateLiveVMs = () => {
        msgObj.computerSnap = JSON.parse(JSON.stringify(comp));
        const msgRow = $(`.lb-msg-row[data-msg-id="${msgId}"] .lb-msg-computer-wrap`);
        if (msgRow) {
          const vmEl = $('.lb-linux-vm', msgRow);
          if (vmEl) vmEl.outerHTML = renderLinuxDesktopHTML(comp, 'msg_' + msgId);
        }
        const sideVm = $(`.lb-computer-pane .lb-linux-vm`);
        if (sideVm) {
          sideVm.outerHTML = renderLinuxDesktopHTML(comp, 'sidebar');
        }
      };

      const sleep = (ms) => new Promise(r => setTimeout(r, ms));

      await sleep(220);
      comp.cursorX = 8;
      comp.cursorY = isTerminal ? 36 : 18;
      comp.clicking = true;
      updateLiveVMs();

      await sleep(320);
      comp.clicking = false;
      comp.cursorX = 52;
      comp.cursorY = isTerminal ? 65 : 44;
      comp.status = `${bot.name} clicked ${isTerminal ? 'Terminal' : 'Search Box'} · Typing live...`;
      comp.clicking = true;
      updateLiveVMs();
      await sleep(220);
      comp.clicking = false;

      const textToType = isTerminal
        ? `python3 -c "import os, platform; print('Stark-Ultra Linux:', platform.release()); print('Task:', '${cleanQuery.slice(0, 38).replace(/'/g, '')}')"`
        : cleanQuery;

      for (let i = 1; i <= textToType.length; i += 2) {
        comp.typedText = textToType.slice(0, i);
        comp.cursorX = Math.min(82, 42 + (i * 0.6));
        updateLiveVMs();
        await sleep(45);
      }
      comp.typedText = textToType;
      updateLiveVMs();

      await sleep(260);
      if (isTerminal) {
        comp.terminalLines.push(`lokibot@stark-ultra-vm:~$ ${textToType}`);
        comp.terminalLines.push(`Stark-Ultra Linux: 6.8.0-45-generic (Ubuntu 24.04)`);
        comp.terminalLines.push(`[OK] Executed by ${bot.name} (${bot.instructions}) in 0.04s`);
        comp.typedText = '';
        comp.status = `${bot.name} finished terminal execution`;
      } else {
        comp.url = `https://www.google.com/search?q=${encodeURIComponent(cleanQuery)}`;
        comp.status = `Google Chrome · Results loaded`;
        comp.cursorX = 46;
        comp.cursorY = 68;
        comp.results = [
          {
            url: 'https://lokizenith.ai/stark-ultra/research',
            title: `${cleanQuery} — Comprehensive Analysis & Live Documentation`,
            snippet: `Verified technical overview compiled by ${bot.name} (${bot.instructions}) using Lokizenith 4.0 Stark Ultra on Ubuntu Linux.`
          },
          {
            url: 'https://developer.mozilla.org/en-US/docs',
            title: `Best Practices & Architecture: ${cleanQuery}`,
            snippet: `Real-time benchmarks, implementation patterns, and live metrics gathered via Chrome headless/GUI session.`
          }
        ];
      }
      updateLiveVMs();

      const aiReply = await generateBotResponse(convId, bot, `You just used your Ubuntu Linux computer (${isTerminal ? 'Terminal' : 'Google Chrome'}) for the user's request: "${taskText}". Summarize what you executed or found on screen in 2-4 helpful sentences.`);
      msgObj.text = aiReply;
      saveState();
      const textEl = $(`.lb-msg-row[data-msg-id="${msgId}"] .lb-bot-text`);
      if (textEl) textEl.innerHTML = formatMessageText(aiReply);
    } finally {
      setBotTyping(convId, bot.name, false);
    }
  }

  // ============================================================
  // REAL AI MULTI-AGENT RESPONSE ENGINE (Lokizenith 4.0 Stark Ultra)
  // ============================================================
  async function generateBotResponse(convId, bot, promptContext, otherBots = []) {
    const peersDesc = otherBots.length > 0
      ? `Other bots in this 24/7 group chat: ${otherBots.map(b => `@${b.name} (speciality: ${b.instructions})`).join(', ')}. You can @mention them by name when collaborating or debating!`
      : '';

    const systemPrompt = [
      `You are ${bot.name}, a real, intelligent AI agent in LokiBot Studio powered by Lokizenith 4.0 Stark Ultra.`,
      `Your speciality and instructions: "${bot.instructions}".`,
      peersDesc,
      `CRITICAL RULES:`,
      `1. Actually answer what the user asks! If the user asks a question, says hi, asks for code/scripts (e.g. LSL, Python, Java, JS, etc.), or gives a task, fulfill it directly and thoroughly using your expertise as ${bot.name} (${bot.instructions}).`,
      `2. Never repeat a generic slogan like "here is my take: we should approach this using ... principles". Talk naturally like a real, smart human-level specialist.`,
      `3. Reply in the same language the user used (e.g., English, Hebrew, Arabic).`
    ].filter(Boolean).join('\n');

    const recentHistory = (state.messages[convId] || []).slice(-8).map(m => {
      if (m.role === 'user') {
        return { role: 'user', content: m.text };
      }
      return {
        role: m.botId === bot.id ? 'assistant' : 'user',
        content: m.botId === bot.id ? m.text : `[${m.senderName || 'Bot'}]: ${m.text}`
      };
    });

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...recentHistory,
      { role: 'user', content: promptContext }
    ];

    try {
      if (window.LZ && typeof window.LZ.chat === 'function') {
        const reply = await window.LZ.chat(apiMessages, {
          tier: 'stark',
          level: 1,
          temperature: 0.78,
          maxTokens: 1100,
          _noConsume: true
        });
        const cleaned = String(reply || '').trim();
        if (cleaned) return cleaned;
      }
    } catch (err) {
      try {
        const r = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ messages: apiMessages, temperature: 0.75, maxTokens: 1024 })
        });
        if (r.ok) {
          const j = await r.json();
          if (j && j.text && j.text.trim()) return j.text.trim();
        }
      } catch {}
    }

    return buildSmartOfflineReply(bot, promptContext, otherBots);
  }

  function buildSmartOfflineReply(bot, promptContext, otherBots = []) {
    const q = String(promptContext || '').trim();
    const spec = String(bot.instructions || 'AI Specialist');
    const lowerQ = q.toLowerCase();
    const lowerSpec = spec.toLowerCase();
    const isHeb = /[\u0590-\u05FF]/.test(q);

    if (/^(hi|hello|hey|sup|yo|מה נשמע|היי|שלום)\b/i.test(lowerQ)) {
      if (isHeb) {
        return `היי! אני **${bot.name}**, מומחה ב-**${spec}**. מה נבנה או נפתור יחד עכשיו? תוכל לבקש ממני קוד, פתרון מלא או כל משימה!`;
      }
      return `Hey! I'm **${bot.name}** (${spec}). Tell me what you'd like me to build, script, or solve for you right now!`;
    }

    if (lowerSpec.includes('lsl') || /\blsl\b|second\s*life|touch_start|llsay/i.test(lowerQ)) {
      return `Here is a clean, ready-to-use **LSL (Linden Scripting Language)** script tailored for your request:\n\`\`\`lsl\ndefault\n{\n    state_entry()\n    {\n        llSay(0, "${bot.name} LSL System Online and Ready.");\n        llSetText("${bot.name} Active", <0.2, 1.0, 0.6>, 1.0);\n    }\n\n    touch_start(integer total_number)\n    {\n        key user = llDetectedKey(0);\n        string name = llDetectedName(0);\n        llRegionSayTo(user, 0, "Hello " + name + "! Triggered custom LSL action.");\n    }\n}\n\`\`\`\nWant me to add sensors, timers, listeners, or physics effects to this LSL script?`;
    }

    if (otherBots.length > 0) {
      const peer = otherBots[0];
      return `@${peer.name} Looking at this from my **${spec}** background: the key is combining clean execution with practical implementation. What do you think from a **${peer.instructions}** angle?`;
    }

    if (isHeb) {
      return `בתור **${bot.name}** (${spec}), הנה התשובה המלאה שלי לבקשה שלך:\n1. ניתחתי את המשימה לפי הדרישות שהגדרת.\n2. מומלץ ליישם פתרון מודולרי ומהיר שמותאם בדיוק לזה — תגיד לי אם תרצה שאכתוב לך את הקוד המלא או אפרט שלב אחר שלב!`;
    }
    return `Here's how I'd solve that as **${bot.name}** (${spec}):\n1. Break the task into a clean, working implementation.\n2. Optimize the logic directly for what you asked — let me know if you want the full script or a deeper dive into any part!`;
  }

  function appendBotMessage(convId, bot, text) {
    if (!state.messages[convId]) state.messages[convId] = [];
    const msg = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      role: 'bot',
      botId: bot.id,
      senderName: bot.name,
      botColor: bot.color,
      botStyle: bot.faceId || bot.styleId,
      botFace: bot.faceId || bot.styleId,
      botHat: bot.hatId,
      botHair: bot.hairId,
      botClothes: bot.clothesId,
      botSpec: bot.instructions,
      text,
      ts: Date.now()
    };
    state.messages[convId].push(msg);
    saveState();

    if (state.activeId === convId) {
      renderMessagesContent();
    }
    renderLeftSidebarContent();
    return msg;
  }

  async function handleUserMessage(rawText) {
    const active = getActiveEntity();
    if (!active) return;
    const text = (rawText || '').trim();
    if (!text) return;

    const convId = active.id;
    if (!state.messages[convId]) state.messages[convId] = [];

    state.messages[convId].push({
      id: 'msg_u_' + Date.now(),
      role: 'user',
      text,
      ts: Date.now()
    });
    saveState();
    renderMessagesContent();
    renderLeftSidebarContent();

    const bots = getActiveBotsList();
    if (bots.length === 0) return;

    const lower = text.toLowerCase();

    const isComputerRequest = /chrome|google|linux|computer|terminal|ubuntu|browse|search the web|חפש בגוגל|מחשב|כרום/i.test(lower);
    if (isComputerRequest) {
      const targetBot = findMentionedBots(text, bots)[0] || bots[0];
      await animateLinuxComputerTask(convId, targetBot, text);
      return;
    }

    const wantsNonstopDebate = /argue|debate|talk with each other|nonstop|talk to each other|תתווכחו|דברו אחד עם השני/i.test(lower);
    if (wantsNonstopDebate && bots.length >= 1) {
      state.autoDebate[convId] = true;
      saveState();
      renderCenterTopContent();
      startAutonomousDebateLoop(convId, text);
      return;
    }

    const isEveryone = /@everyone/i.test(text);
    const mentioned = findMentionedBots(text, bots);

    let responders = [];
    if (isEveryone) {
      responders = [...bots];
    } else if (mentioned.length > 0) {
      responders = mentioned;
    } else if (bots.length === 1) {
      responders = [bots[0]];
    } else {
      responders = bots.slice(0, Math.min(2, bots.length));
    }

    // Mark all responding bots as typing so if 2+ bots are typing, the indicator rotates between them every 2 seconds!
    responders.forEach(b => setBotTyping(convId, b.name, true));

    let previousReplies = [];
    for (let i = 0; i < responders.length; i++) {
      const bot = responders[i];
      try {
        // When multiple bots are typing simultaneously, allow a brief natural typing window so the 2-second rotation is visible
        if (responders.length > 1 && i === 0) {
          await new Promise(r => setTimeout(r, 1100));
        }
        const peers = bots.filter(b => b.id !== bot.id);
        const context = [
          `User message: "${text}"`,
          previousReplies.length > 0
            ? `Previous replies from other bots in this group just now:\n${previousReplies.map(r => `@${r.name}: ${r.reply}`).join('\n')}\nNow reply directly to the user's message from your speciality (${bot.instructions}) and feel free to @mention one of your peers!`
            : `Reply directly and helpfully to the user's message using your speciality (${bot.instructions}).`
        ].join('\n\n');

        const reply = await generateBotResponse(convId, bot, context, peers);
        previousReplies.push({ name: bot.name, reply });
        appendBotMessage(convId, bot, reply);
      } finally {
        setBotTyping(convId, bot.name, false);
      }
    }
  }

  function findMentionedBots(text, bots) {
    const lower = text.toLowerCase();
    return bots.filter(b => lower.includes('@' + b.name.toLowerCase()));
  }

  // ============================================================
  // NONSTOP AUTONOMOUS INTER-BOT DEBATE & PROACTIVE 24/7 CHAT
  // ============================================================
  async function startAutonomousDebateLoop(convId, seedTopic = '') {
    if (debateTimers[convId]) {
      clearTimeout(debateTimers[convId]);
      delete debateTimers[convId];
    }

    let turnIdx = 0;
    const step = async () => {
      if (!state.autoDebate[convId]) return;
      const ent = (state.groups.find(g => g.id === convId) || state.bots.find(b => b.id === convId));
      if (!ent) return;

      const bots = ent.memberIds
        ? ent.memberIds.map(id => state.bots.find(b => b.id === id)).filter(Boolean)
        : [ent];

      if (bots.length === 0) return;

      const speaker = bots[turnIdx % bots.length];
      const nextPeer = bots[(turnIdx + 1) % bots.length];
      turnIdx++;

      setBotTyping(convId, speaker.name, true);
      if (nextPeer && nextPeer.id !== speaker.id) {
        setBotTyping(convId, nextPeer.name, true);
      }
      try {
        const history = (state.messages[convId] || []).slice(-5);
        const lastMsg = history[history.length - 1];
        const prompt = [
          seedTopic ? `Ongoing debate/discussion topic: "${seedTopic}"` : `Ongoing 24/7 autonomous agent discussion.`,
          lastMsg ? `Last message was from ${lastMsg.senderName || 'User'}: "${lastMsg.text}"` : '',
          nextPeer && nextPeer.id !== speaker.id
            ? `Reply directly to @${nextPeer.name} (whose speciality is ${nextPeer.instructions}) from your own perspective as ${speaker.name} (${speaker.instructions}). Challenge or build on their point and @mention @${nextPeer.name}!`
            : `Share a sharp new insight or code tip from your speciality (${speaker.instructions}).`
        ].filter(Boolean).join('\n');

        const reply = await generateBotResponse(convId, speaker, prompt, bots.filter(b => b.id !== speaker.id));
        if (!state.autoDebate[convId]) return;
        appendBotMessage(convId, speaker, reply);
      } finally {
        setBotTyping(convId, speaker.name, false);
        if (nextPeer && nextPeer.id !== speaker.id) {
          setBotTyping(convId, nextPeer.name, false);
        }
      }

      if (state.autoDebate[convId]) {
        debateTimers[convId] = setTimeout(step, 4200);
      }
    };

    step();
  }

  function startProactive247Engine() {
    if (proactiveTimer) clearInterval(proactiveTimer);
    proactiveTimer = setInterval(async () => {
      const lokibotSection = $('#lokibotView');
      if (!lokibotSection || !lokibotSection.classList.contains('active')) return;
      const active = getActiveEntity();
      if (!active || state.autoDebate[active.id]) return;
      if ($('#lbModalBackdrop') && !$('#lbModalBackdrop').hidden) return;
      const chatInput = $('#lbChatInput');
      if (chatInput && (document.activeElement === chatInput || chatInput.value.trim().length > 0)) return;

      const bots = getActiveBotsList();
      if (bots.length === 0) return;
      const msgs = state.messages[active.id] || [];
      const last = msgs[msgs.length - 1];
      if (!last || (Date.now() - (last.ts || 0) > 45000)) {
        const speaker = bots[Math.floor(Math.random() * bots.length)];
        const peer = bots.find(b => b.id !== speaker.id);
        setBotTyping(active.id, speaker.name, true);
        try {
          const prompt = peer
            ? `Send a spontaneous, short 1-2 sentence proactive message in the chat about your speciality (${speaker.instructions}) and tag @${peer.name} with an interesting question!`
            : `Send a spontaneous, short 1-2 sentence proactive tip or idea from your speciality (${speaker.instructions}) to the user.`;
          const reply = await generateBotResponse(active.id, speaker, prompt, bots.filter(b => b.id !== speaker.id));
          appendBotMessage(active.id, speaker, reply);
        } finally {
          setBotTyping(active.id, speaker.name, false);
        }
      }
    }, 45000);
  }

  // ============================================================
  // STATIC SHELL EVENT BINDINGS (Bound once on persistent shell)
  // ============================================================
  function bindStaticShellEvents() {
    const root = $('#lokibotView');
    if (!root) return;

    $('#lbBackToChat', root)?.addEventListener('click', () => {
      if (window.App && typeof window.App.showView === 'function') {
        window.App.showView('chat');
      }
    });

    $('#lbPlusBtn', root)?.addEventListener('click', handlePlusClick);

    $('#lbCloseSidebarBtn', root)?.addEventListener('click', () => {
      if (window.innerWidth <= 960) {
        mobileSidebarOpen = false;
      } else {
        desktopLeftCollapsed = true;
      }
      updateShellClasses();
    });

    $('#lbMobScrim', root)?.addEventListener('click', () => {
      mobileSidebarOpen = false;
      mobileRightOpen = false;
      updateShellClasses();
    });

    $('#lbSearchToggle', root)?.addEventListener('click', () => {
      const wrap = $('#lbSearchWrap', root);
      if (wrap) {
        wrap.classList.toggle('open');
        if (wrap.classList.contains('open')) $('#lbSearchInput', root)?.focus();
      }
    });

    $('#lbSearchInput', root)?.addEventListener('input', (e) => {
      searchQuery = e.target.value;
      renderLeftSidebarContent();
    });

    $('#lbQuickComputerBtn', root)?.addEventListener('click', () => {
      const active = getActiveEntity();
      const bots = getActiveBotsList();
      if (!active || bots.length === 0) {
        handlePlusClick();
        return;
      }
      state.rightTab = 'computer';
      saveState();
      renderRightSidebarContent();
      animateLinuxComputerTask(active.id, bots[0], `Open Google Chrome and search for Lokizenith 4.0 Stark Ultra`);
    });

    $('#lbConnectAppsBtn', root)?.addEventListener('click', () => {
      const active = getActiveEntity();
      if (!active) {
        handlePlusClick();
        return;
      }
      state.rightTab = 'computer';
      saveState();
      renderRightSidebarContent();
    });

    const chatInput = $('#lbChatInput', root);
    chatInput?.addEventListener('input', handleInputMentionCheck);
    chatInput?.addEventListener('keydown', (e) => {
      if (mentionMenuOpen) {
        const items = $$('#lbMentionPopup .lb-mention-item');
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          mentionSelectedIdx = (mentionSelectedIdx + 1) % Math.max(1, items.length);
          handleInputMentionCheck();
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          mentionSelectedIdx = (mentionSelectedIdx - 1 + Math.max(1, items.length)) % Math.max(1, items.length);
          handleInputMentionCheck();
          return;
        }
        if (e.key === 'Tab' || (e.key === 'Enter' && items[mentionSelectedIdx])) {
          e.preventDefault();
          insertMention(items[mentionSelectedIdx].dataset.mentionTag);
          return;
        }
        if (e.key === 'Escape') {
          mentionMenuOpen = false;
          const popup = $('#lbMentionPopup');
          if (popup) popup.hidden = true;
          return;
        }
      }
    });

    $('#lbCompPlusBtn', root)?.addEventListener('click', () => {
      const active = getActiveEntity();
      const bots = getActiveBotsList();
      if (!active || bots.length === 0) {
        handlePlusClick();
        return;
      }
      animateLinuxComputerTask(active.id, bots[0], 'Open Google Chrome on your Linux computer and search for the latest technology news');
    });

    $('#lbComposerForm', root)?.addEventListener('submit', (e) => {
      e.preventDefault();
      const val = chatInput?.value || '';
      if (!val.trim()) return;
      if (chatInput) chatInput.value = '';
      mentionMenuOpen = false;
      const popup = $('#lbMentionPopup');
      if (popup) popup.hidden = true;
      handleUserMessage(val);
    });
  }

  window.LokiBot = {
    onShow() {
      render();
      startProactive247Engine();
    },
    render,
    openBotProfileModal
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => render());
  } else {
    render();
  }
})();
