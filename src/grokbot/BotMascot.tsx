import React, { useEffect, useId } from 'react';
import { MascotAnimationState, MascotSilhouette, GrokBotAgent } from './types';

let mouseListenerAttached = false;

function ensureGlobalMouseEyeTracker() {
  if (mouseListenerAttached || typeof window === 'undefined') return;
  mouseListenerAttached = true;
  window.addEventListener(
    'mousemove',
    (e) => {
      const nx = (e.clientX / Math.max(1, window.innerWidth) - 0.5) * 2;
      const ny = (e.clientY / Math.max(1, window.innerHeight) - 0.5) * 2;
      const dx = Math.max(-3.6, Math.min(3.6, nx * 3.4)).toFixed(2);
      const dy = Math.max(-3.2, Math.min(3.2, ny * 3.0)).toFixed(2);
      document.documentElement.style.setProperty('--grok-eye-dx', `${dx}px`);
      document.documentElement.style.setProperty('--grok-eye-dy', `${dy}px`);
    },
    { passive: true }
  );
}

export const MASCOT_SILHOUETTES: Array<{
  id: MascotSilhouette;
  label: string;
  desc: string;
}> = [
  { id: 'blob', label: 'Classic Blob', desc: 'Smooth tilted orb' },
  { id: 'cloud', label: 'Cloud Puff', desc: 'Scalloped cloud puff' },
  { id: 'cube', label: 'Cube Buddy', desc: 'Tilted rounded square' },
  { id: 'star', label: 'Star / Neko', desc: '4-point soft vinyl star' },
  { id: 'clover', label: 'Clover Puff', desc: '4-lobe bumpy buddy' },
  { id: 'heart', label: 'Heart Blob', desc: 'Plump tilted heart' },
  { id: 'flower', label: 'Flower Puff', desc: '8-petal scalloped puff' },
  { id: 'drop', label: 'Teardrop', desc: 'Plump teardrop orb' },
  { id: 'pill', label: 'Pill Bot', desc: 'Tilted capsule + hands' },
  { id: 'triangle', label: 'Triangle Buddy', desc: 'Soft rounded triangle' },
];

export const MASCOT_COLORS = [
  { name: 'Teal Mint', hex: '#14B8A6' },
  { name: 'Emerald', hex: '#10B981' },
  { name: 'Coral Red', hex: '#FF2E4C' },
  { name: 'Hot Pink', hex: '#EC4899' },
  { name: 'Electric Violet', hex: '#8B5CF6' },
  { name: 'Warm Amber', hex: '#F59E0B' },
  { name: 'Grok Orange', hex: '#F97316' },
  { name: 'Sky Cyan', hex: '#0EA5E9' },
  { name: 'Pure Snow', hex: '#F8FAFC' },
];

interface BotMascotProps {
  silhouette?: MascotSilhouette;
  color?: string;
  state?: MascotAnimationState;
  size?: number;
  className?: string;
  showStatusAura?: boolean;
}

export const BotMascot: React.FC<BotMascotProps> = ({
  silhouette = 'pill',
  color = '#14B8A6',
  state = 'idle',
  size = 44,
  className = '',
  showStatusAura = false,
}) => {
  const uid = useId().replace(/:/g, '');

  useEffect(() => {
    ensureGlobalMouseEyeTracker();
  }, []);

  const isLightBody =
    color.toLowerCase() === '#f8fafc' ||
    color.toLowerCase() === '#ffffff' ||
    color.toLowerCase() === '#faf9f6';
  const eyeColor = isLightBody ? '#141416' : '#121215';

  const animClass =
    state === 'thinking'
      ? 'grok-mascot-thinking'
      : state === 'coding'
      ? 'grok-mascot-coding'
      : state === 'approval' || state === 'celebrating'
      ? 'grok-mascot-approval'
      : 'grok-mascot-idle';

  const renderSilhouetteBody = () => {
    switch (silhouette) {
      case 'blob':
        return (
          <g transform="rotate(-18 50 50)">
            <circle cx="50" cy="50" r="39" fill={`url(#grad_${uid})`} />
            <ellipse cx="38" cy="30" rx="16" ry="8" fill="rgba(255,255,255,0.22)" transform="rotate(-15 38 30)" />
          </g>
        );

      case 'cloud':
        return (
          <g transform="rotate(-14 50 50)">
            <path
              d="M25 68 C13 68 10 53 19 44 C16 30 30 20 44 25 C54 16 73 21 76 35 C88 39 90 56 80 65 C75 73 61 73 52 71 C42 74 32 72 25 68 Z"
              fill="none"
              stroke={color}
              strokeOpacity="0.28"
              strokeWidth="4.5"
              transform="scale(1.06) translate(-2.8 -2.8)"
            />
            <path
              d="M25 68 C13 68 10 53 19 44 C16 30 30 20 44 25 C54 16 73 21 76 35 C88 39 90 56 80 65 C75 73 61 73 52 71 C42 74 32 72 25 68 Z"
              fill={`url(#grad_${uid})`}
            />
            <ellipse cx="42" cy="32" rx="14" ry="6" fill="rgba(255,255,255,0.2)" />
          </g>
        );

      case 'cube':
        return (
          <g transform="rotate(-24 50 50)">
            <rect x="17" y="17" width="66" height="66" rx="16" fill={`url(#grad_${uid})`} />
            <rect x="23" y="21" width="32" height="9" rx="4.5" fill="rgba(255,255,255,0.22)" />
          </g>
        );

      case 'star':
      case 'neko':
        return (
          <g transform="rotate(-18 50 50)">
            <path
              d="M50 8 C59 8 64 25 71 31 C78 37 92 41 92 50 C92 59 78 63 71 69 C64 75 59 92 50 92 C41 92 36 75 29 69 C22 63 8 59 8 50 C8 41 22 37 29 31 C36 25 41 8 50 8 Z"
              fill="none"
              stroke={color}
              strokeOpacity="0.26"
              strokeWidth="4.5"
              transform="scale(1.06) translate(-2.8 -2.8)"
            />
            <path
              d="M50 8 C59 8 64 25 71 31 C78 37 92 41 92 50 C92 59 78 63 71 69 C64 75 59 92 50 92 C41 92 36 75 29 69 C22 63 8 59 8 50 C8 41 22 37 29 31 C36 25 41 8 50 8 Z"
              fill={`url(#grad_${uid})`}
            />
            <ellipse cx="45" cy="28" rx="10" ry="6" fill="rgba(255,255,255,0.22)" />
          </g>
        );

      case 'clover':
        return (
          <g transform="rotate(-24 50 50)">
            <path
              d="M34 18 C43 12 57 12 66 18 C78 16 86 28 81 40 C88 50 84 65 73 72 C75 83 62 90 50 84 C38 90 25 83 27 72 C16 65 12 50 19 40 C14 28 22 16 34 18 Z"
              fill={`url(#grad_${uid})`}
            />
            <ellipse cx="42" cy="27" rx="12" ry="6" fill="rgba(255,255,255,0.2)" />
          </g>
        );

      case 'heart':
        return (
          <g transform="rotate(-18 50 50)">
            <path
              d="M50 84 C38 84 14 66 14 41 C14 24 28 15 41 21 C46 23 48 27 50 30 C52 27 54 23 59 21 C72 15 86 24 86 41 C86 66 62 84 50 84 Z"
              fill={`url(#grad_${uid})`}
            />
            <ellipse cx="35" cy="31" rx="11" ry="6" fill="rgba(255,255,255,0.22)" transform="rotate(-15 35 31)" />
          </g>
        );

      case 'flower':
        return (
          <g transform="rotate(-16 50 50)">
            <path
              d="M50 11 C57 11 61 19 67 21 C73 23 82 21 85 27 C88 33 82 41 84 47 C86 53 92 60 88 66 C84 72 75 71 70 76 C65 81 65 90 58 91 C51 92 46 84 39 83 C32 82 25 88 19 83 C13 78 18 69 15 63 C12 57 6 51 9 44 C12 37 21 37 25 32 C29 27 28 17 35 15 C42 13 44 11 50 11 Z"
              fill={`url(#grad_${uid})`}
            />
            <ellipse cx="42" cy="28" rx="12" ry="6" fill="rgba(255,255,255,0.24)" />
          </g>
        );

      case 'drop':
        return (
          <g transform="rotate(-14 50 50)">
            <path
              d="M48 12 C64 12 84 39 84 60 C84 79 69 90 50 90 C31 90 16 79 16 60 C16 39 32 12 48 12 Z"
              fill={`url(#grad_${uid})`}
            />
            <ellipse cx="40" cy="34" rx="10" ry="6" fill="rgba(255,255,255,0.22)" transform="rotate(-20 40 34)" />
          </g>
        );

      case 'triangle':
        return (
          <g transform="rotate(-14 50 50)">
            <path
              d="M44 14 C50 7 61 9 66 17 L88 57 C93 66 87 78 76 80 L28 86 C17 87 10 77 14 66 L36 20 C38 17 41 15 44 14 Z"
              fill={`url(#grad_${uid})`}
            />
            <ellipse cx="46" cy="28" rx="10" ry="5" fill="rgba(255,255,255,0.22)" />
          </g>
        );

      case 'pill':
      default:
        return (
          <g>
            <g transform="rotate(-18 50 50)">
              <rect x="12" y="23" width="76" height="54" rx="27" fill={`url(#grad_${uid})`} />
              <ellipse cx="38" cy="34" rx="18" ry="6.5" fill="rgba(255,255,255,0.23)" />
            </g>
            {(state === 'coding' || state === 'purchasing' || state === 'celebrating') && (
              <>
                <circle cx="10" cy="58" r="6.5" fill={`url(#grad_${uid})`} />
                <circle cx="90" cy="44" r="6.5" fill={`url(#grad_${uid})`} />
              </>
            )}
          </g>
        );
    }
  };

  // Position of the signature parallel capsule eyes (`||`) per silhouette matching Screenshot 2026-11-11 182523.png
  const getEyeTransform = () => {
    switch (silhouette) {
      case 'blob':
        return { x: 58, y: 37, rot: -28 };
      case 'cloud':
        return { x: 56, y: 42, rot: -24 };
      case 'cube':
        return { x: 52, y: 50, rot: -24 };
      case 'star':
      case 'neko':
        return { x: 56, y: 46, rot: -24 };
      case 'clover':
        return { x: 51, y: 48, rot: -24 };
      case 'heart':
        return { x: 57, y: 46, rot: -22 };
      case 'flower':
        return { x: 55, y: 50, rot: -22 };
      case 'drop':
        return { x: 59, y: 48, rot: -22 };
      case 'triangle':
        return { x: 58, y: 38, rot: -34 };
      case 'pill':
      default:
        return { x: 57, y: 44, rot: -22 };
    }
  };

  const eyePos = getEyeTransform();

  const renderEyes = () => {
    if (state === 'celebrating') {
      return (
        <g transform={`translate(${eyePos.x}, ${eyePos.y}) rotate(${eyePos.rot})`}>
          <path
            d="M -11 2 Q -7 -6 -3 2"
            fill="none"
            stroke={eyeColor}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
          <path
            d="M 3 2 Q 7 -6 11 2"
            fill="none"
            stroke={eyeColor}
            strokeWidth="4.2"
            strokeLinecap="round"
          />
        </g>
      );
    }

    const eyeHeight = state === 'coding' ? 9.5 : 15;
    const eyeWidth = 6.2;
    const scanOffset = state === 'browsing' ? 2.5 : state === 'thinking' ? -2.2 : 0;

    return (
      <g
        style={{
          transform: `translate(var(--grok-eye-dx, 0px), var(--grok-eye-dy, 0px))`,
          transition: 'transform 90ms ease-out',
        }}
      >
        <g transform={`translate(${eyePos.x + scanOffset}, ${eyePos.y}) rotate(${eyePos.rot})`}>
          <rect
            x={-9.5}
            y={-eyeHeight / 2}
            width={eyeWidth}
            height={eyeHeight}
            rx={eyeWidth / 2}
            fill={eyeColor}
          />
          <rect
            x={2.5}
            y={-eyeHeight / 2}
            width={eyeWidth}
            height={eyeHeight}
            rx={eyeWidth / 2}
            fill={eyeColor}
          />
          {state === 'purchasing' && (
            <>
              <circle cx={-6.5} cy={-2.5} r="1.6" fill="#FFFFFF" />
              <circle cx={5.5} cy={-2.5} r="1.6" fill="#FFFFFF" />
            </>
          )}
        </g>
      </g>
    );
  };

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
      data-mascot-state={state}
      data-mascot-silhouette={silhouette}
    >
      {showStatusAura && state !== 'idle' && (
        <span
          className="absolute inset-0 rounded-full opacity-35 blur-md pointer-events-none"
          style={{
            background:
              state === 'thinking'
                ? '#7C5CFF'
                : state === 'browsing'
                ? '#0088FF'
                : state === 'coding'
                ? '#00A86B'
                : state === 'purchasing'
                ? '#D63384'
                : '#E67E00',
          }}
        />
      )}
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className={`overflow-visible ${animClass}`}
        aria-hidden="true"
      >
        <defs>
          <radialGradient id={`grad_${uid}`} cx="35%" cy="28%" r="72%">
            <stop offset="0%" stopColor={color} stopOpacity="1" />
            <stop offset="78%" stopColor={color} stopOpacity="0.96" />
            <stop offset="100%" stopColor={isLightBody ? '#CBD5E1' : '#09090B'} stopOpacity="0.22" />
          </radialGradient>
        </defs>

        {renderSilhouetteBody()}
        {renderEyes()}

        {/* State Micro-Badges */}
        {state === 'coding' && (
          <g transform="translate(78, 18)">
            <circle cx="0" cy="0" r="10" fill="#00A86B" />
            <text x="0" y="3.5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="bold">
              ⚡
            </text>
          </g>
        )}
        {state === 'purchasing' && (
          <g transform="translate(80, 20)">
            <rect x="-11" y="-8" width="22" height="16" rx="4" fill="#D63384" />
            <line x1="-7" y1="-2" x2="7" y2="-2" stroke="#fff" strokeWidth="2" />
            <circle cx="4" cy="3" r="2" fill="#fff" />
          </g>
        )}
        {state === 'approval' && (
          <g transform="translate(80, 18)">
            <circle cx="0" cy="0" r="10" fill="#E67E00" />
            <text x="0" y="4" textAnchor="middle" fill="#fff" fontSize="12" fontWeight="bold">
              !
            </text>
          </g>
        )}
        {state === 'celebrating' && (
          <g>
            <circle cx="14" cy="18" r="3" fill="#F59E0B" />
            <circle cx="86" cy="16" r="3.5" fill="#EC4899" />
            <circle cx="88" cy="78" r="3" fill="#10B981" />
            <circle cx="15" cy="82" r="2.5" fill="#8B5CF6" />
          </g>
        )}
      </svg>
    </div>
  );
};

interface GroupMascotClusterProps {
  bots: GrokBotAgent[];
  size?: number;
  userInitial?: string;
}

export const GroupMascotCluster: React.FC<GroupMascotClusterProps> = ({
  bots,
  size = 44,
  userInitial = 'E',
}) => {
  const members = bots.slice(0, 3);
  const subSize = Math.round(size * 0.56);
  const badgeSize = Math.round(size * 0.44);

  return (
    <div
      className="relative inline-flex items-center justify-center select-none shrink-0"
      style={{ width: size, height: size }}
    >
      {/* Top-left User Initial Circle matching Screenshot 2026-11-11 213847.png */}
      <div
        className="absolute top-0 left-0 rounded-full bg-slate-600/90 text-white font-semibold flex items-center justify-center border border-black/40 z-20"
        style={{
          width: badgeSize,
          height: badgeSize,
          fontSize: Math.max(9, Math.round(badgeSize * 0.52)),
        }}
      >
        {userInitial}
      </div>

      {/* Top-right Mascot */}
      {members[0] && (
        <div className="absolute -top-0.5 right-0 z-10">
          <BotMascot
            silhouette={members[0].silhouette}
            color={members[0].color}
            state={members[0].state}
            size={subSize}
          />
        </div>
      )}

      {/* Bottom-left Mascot */}
      {members[1] && (
        <div className="absolute bottom-0 left-0 z-10">
          <BotMascot
            silhouette={members[1].silhouette}
            color={members[1].color}
            state={members[1].state}
            size={subSize}
          />
        </div>
      )}

      {/* Bottom-right Mascot */}
      {members[2] && (
        <div className="absolute -bottom-0.5 right-0 z-20">
          <BotMascot
            silhouette={members[2].silhouette}
            color={members[2].color}
            state={members[2].state}
            size={subSize}
          />
        </div>
      )}
    </div>
  );
};
