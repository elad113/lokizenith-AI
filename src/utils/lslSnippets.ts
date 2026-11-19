import { generateOfflineProfessionalLsl, stripMarkdownCodeFence } from './lslSpecialist.ts';

export interface LslSnippet {
  id: string;
  title: string;
  description: string;
  code: string;
}

const SPECS: Array<{ id: string; title: string; description: string; prompt: string }> = [
  {
    id: 'door',
    title: 'Sliding Door',
    description: 'Touch-open sliding door that closes on a timer and resets for a new owner.',
    prompt: 'sliding automatic security door',
  },
  {
    id: 'hud',
    title: 'HUD Menu',
    description: 'Owner HUD dialog with listen cleanup, glow controls, and a timeout.',
    prompt: 'multi-page menu HUD control panel',
  },
  {
    id: 'vendor',
    title: 'Tip Jar Vendor',
    description: 'Pay vendor / tip jar with a donor leaderboard and a short particle burst.',
    prompt: 'tip jar with particle burst and leaderboard',
  },
  {
    id: 'teleporter',
    title: 'Sit Teleporter',
    description: 'Sit-to-teleport pad that moves the avatar with llSetRegionPos and returns home.',
    prompt: 'sit teleporter pad to skybox',
  },
  {
    id: 'particles',
    title: 'Particle Emitter',
    description: 'Touch-toggled particle system with hover text.',
    prompt: 'configurable neon particle fountain emitter',
  },
];

export function getLslSnippets(): LslSnippet[] {
  return SPECS.map((spec) => ({
    id: spec.id,
    title: spec.title,
    description: spec.description,
    code: stripMarkdownCodeFence(generateOfflineProfessionalLsl(spec.prompt)),
  }));
}
