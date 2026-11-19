export type MaintenanceDurationUnit = 'minutes' | 'hours' | 'days' | 'weeks';

export interface MaintenanceConfigInput {
  maintenanceMode?: boolean;
  maintenanceTitle?: string;
  maintenanceArticle?: string;
  maintenanceMessage?: string;
  maintenanceStartedAt?: number;
  maintenanceEndsAt?: number;
  maintenanceDurationAmount?: number;
  maintenanceDurationUnit?: MaintenanceDurationUnit | string;
  maintenanceUpdatedBy?: string;
}

export interface ResolvedMaintenanceState {
  active: boolean;
  expired: boolean;
  title: string;
  article: string;
  message: string;
  startedAt: number;
  endsAt: number;
  remainingMs: number;
  remainingLabel: string;
  totalDurationMs: number;
  progressPct: number;
  durationAmount: number;
  durationUnit: MaintenanceDurationUnit;
  updatedBy: string;
  isIndefinite: boolean;
}

const VALID_UNITS = new Set<MaintenanceDurationUnit>(['minutes', 'hours', 'days', 'weeks']);

export function normalizeMaintenanceUnit(unit: unknown): MaintenanceDurationUnit {
  const clean = String(unit || '').trim().toLowerCase() as MaintenanceDurationUnit;
  return VALID_UNITS.has(clean) ? clean : 'minutes';
}

export function computeMaintenanceDurationMs(
  amount: unknown,
  unit: MaintenanceDurationUnit | string = 'minutes'
): number {
  const n = Math.floor(Number(amount) || 0);
  if (n <= 0) return 0;
  const clamped = Math.min(n, 3650);
  const normUnit = normalizeMaintenanceUnit(unit);
  switch (normUnit) {
    case 'minutes':
      return clamped * 60 * 1000;
    case 'hours':
      return clamped * 60 * 60 * 1000;
    case 'days':
      return clamped * 24 * 60 * 60 * 1000;
    case 'weeks':
      return clamped * 7 * 24 * 60 * 60 * 1000;
  }
}

export function formatMaintenanceCountdown(remainingMs: number): string {
  const totalSec = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  if (totalSec <= 0) return '00s';
  const weeks = Math.floor(totalSec / (7 * 86400));
  const remAfterW = totalSec % (7 * 86400);
  const days = Math.floor(remAfterW / 86400);
  const hours = Math.floor((remAfterW % 86400) / 3600);
  const mins = Math.floor((remAfterW % 3600) / 60);
  const secs = totalSec % 60;
  const pad = (v: number) => String(v).padStart(2, '0');
  const parts: string[] = [];
  if (weeks > 0) parts.push(`${weeks}w`);
  if (days > 0 || weeks > 0) parts.push(`${days}d`);
  if (hours > 0 || days > 0 || weeks > 0) parts.push(`${pad(hours)}h`);
  if (mins > 0 || hours > 0 || days > 0 || weeks > 0) parts.push(`${pad(mins)}m`);
  parts.push(`${pad(secs)}s`);
  return parts.join(' ');
}

export function getMaintenanceCountdownSegments(remainingMs: number): {
  weeks: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
} {
  const totalSec = Math.max(0, Math.ceil(Number(remainingMs || 0) / 1000));
  const weeks = Math.floor(totalSec / (7 * 86400));
  const remW = totalSec % (7 * 86400);
  const days = Math.floor(remW / 86400);
  const hours = Math.floor((remW % 86400) / 3600);
  const minutes = Math.floor((remW % 3600) / 60);
  const seconds = totalSec % 60;
  return { weeks, days, hours, minutes, seconds };
}

export function resolveMaintenanceState(
  config: MaintenanceConfigInput | null | undefined,
  now: number = Date.now()
): ResolvedMaintenanceState {
  const cfg = config || {};
  const enabled = Boolean(cfg.maintenanceMode);
  const startedAt = Math.max(0, Number(cfg.maintenanceStartedAt) || 0);
  const endsAt = Math.max(0, Number(cfg.maintenanceEndsAt) || 0);
  const unit = normalizeMaintenanceUnit(cfg.maintenanceDurationUnit);
  const amount = Math.max(0, Math.floor(Number(cfg.maintenanceDurationAmount) || 0));
  const title =
    String(cfg.maintenanceTitle || '').trim() ||
    'Scheduled Platform Maintenance';
  const fallbackArticle =
    String(cfg.maintenanceMessage || '').trim() ||
    'Lokizenith AI is receiving live upgrades and performance improvements. Your workspace will reopen automatically when the timer reaches zero.';
  const article = String(cfg.maintenanceArticle || '').trim() || fallbackArticle;

  if (!enabled) {
    return {
      active: false,
      expired: false,
      title,
      article,
      message: title,
      startedAt,
      endsAt: 0,
      remainingMs: 0,
      remainingLabel: '00s',
      totalDurationMs: 0,
      progressPct: 100,
      durationAmount: amount,
      durationUnit: unit,
      updatedBy: String(cfg.maintenanceUpdatedBy || 'Admin'),
      isIndefinite: false,
    };
  }

  if (endsAt > 0 && now >= endsAt) {
    return {
      active: false,
      expired: true,
      title,
      article,
      message: title,
      startedAt,
      endsAt,
      remainingMs: 0,
      remainingLabel: '00s',
      totalDurationMs: startedAt > 0 && endsAt > startedAt ? endsAt - startedAt : 0,
      progressPct: 100,
      durationAmount: amount,
      durationUnit: unit,
      updatedBy: String(cfg.maintenanceUpdatedBy || 'Admin'),
      isIndefinite: false,
    };
  }

  const isIndefinite = endsAt <= 0;
  const remainingMs = isIndefinite ? 0 : Math.max(0, endsAt - now);
  const totalDurationMs =
    !isIndefinite && startedAt > 0 && endsAt > startedAt
      ? endsAt - startedAt
      : computeMaintenanceDurationMs(amount, unit);
  const elapsedMs = totalDurationMs > 0 ? Math.max(0, totalDurationMs - remainingMs) : 0;
  const progressPct =
    totalDurationMs > 0
      ? Math.min(100, Math.max(0, Math.round((elapsedMs / totalDurationMs) * 100)))
      : 0;

  return {
    active: true,
    expired: false,
    title,
    article,
    message: title,
    startedAt,
    endsAt,
    remainingMs,
    remainingLabel: isIndefinite ? 'Until Admin Resumes' : formatMaintenanceCountdown(remainingMs),
    totalDurationMs,
    progressPct,
    durationAmount: amount,
    durationUnit: unit,
    updatedBy: String(cfg.maintenanceUpdatedBy || 'Admin'),
    isIndefinite,
  };
}

export function isAccountAdminBypass(account: any): boolean {
  if (!account || typeof account !== 'object') return false;
  if (account.isAdmin || account.isRootAdmin) return true;
  if (account.adminAccessLevel === 'full' || account.adminAccessLevel === 'partial') return true;
  return false;
}

export function shouldShowMaintenanceOverlay(
  config: MaintenanceConfigInput | null | undefined,
  account: any,
  now: number = Date.now()
): boolean {
  if (isAccountAdminBypass(account)) return false;
  return resolveMaintenanceState(config, now).active;
}
