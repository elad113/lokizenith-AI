export interface DailyStudyTask {
  id: string;
  title: string;
  category: 'quiz' | 'cards' | 'steps' | 'custom';
  targetCount: number;
  currentCount: number;
  completed: boolean;
  xp: number;
}

export interface StudyDayRecord {
  dateKey: string; // YYYY-MM-DD
  label: string;
  minutes: number;
  modulesCompleted: number;
  retentionPct: number;
}

export interface SpringState {
  value: number;
  velocity: number;
  done: boolean;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Formats a timestamp or Date object into a local YYYY-MM-DD key.
 */
export function toDateKey(input: number | Date = Date.now()): string {
  const d = input instanceof Date ? input : new Date(input);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Framer-Motion style damped harmonic spring solver step.
 * Simulates physical spring motion for progress rings, counters, and completion badges.
 */
export function stepSpring(
  current: number,
  target: number,
  velocity: number,
  opts: { stiffness?: number; damping?: number; mass?: number; dt?: number; precision?: number } = {}
): SpringState {
  const stiffness = opts.stiffness ?? 180;
  const damping = opts.damping ?? 18;
  const mass = Math.max(0.1, opts.mass ?? 1);
  const dt = Math.min(0.05, Math.max(0.001, opts.dt ?? 1 / 60));
  const precision = opts.precision ?? 0.01;

  const displacement = current - target;
  const springForce = -stiffness * displacement;
  const dampingForce = -damping * velocity;
  const acceleration = (springForce + dampingForce) / mass;

  const nextVelocity = velocity + acceleration * dt;
  const nextValue = current + nextVelocity * dt;

  if (Math.abs(nextVelocity) < precision && Math.abs(nextValue - target) < precision) {
    return { value: target, velocity: 0, done: true };
  }
  return { value: nextValue, velocity: nextVelocity, done: false };
}

/**
 * Creates default daily study tasks for a given language ('he' | 'en' | 'ar').
 */
export function createDefaultDailyTasks(lang: 'he' | 'en' | 'ar' = 'he'): DailyStudyTask[] {
  const titles = {
    he: {
      quiz: 'השלמת מבחן אינטראקטיבי (4 סוגים)',
      steps: 'סיום שיעור מודרך או משחק מושגים',
      cards: 'תרגול כרטיסיות שינון 3D'
    },
    en: {
      quiz: 'Complete 1 Interactive 4-Type Test',
      steps: 'Finish 1 Guided Lesson or Match Game',
      cards: 'Review 3D Study Flashcards'
    },
    ar: {
      quiz: 'إكمال اختبار تفاعلي واحد',
      steps: 'إنهاء درس موجه أو لعبة مطابقة',
      cards: 'مراجعة البطاقات التعليمية 3D'
    }
  }[lang] || {
    quiz: 'Complete 1 Interactive 4-Type Test',
    steps: 'Finish 1 Guided Lesson or Match Game',
    cards: 'Review 3D Study Flashcards'
  };

  return [
    {
      id: 'dt_quiz',
      title: titles.quiz,
      category: 'quiz',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      xp: 50
    },
    {
      id: 'dt_steps',
      title: titles.steps,
      category: 'steps',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      xp: 35
    },
    {
      id: 'dt_cards',
      title: titles.cards,
      category: 'cards',
      targetCount: 1,
      currentCount: 0,
      completed: false,
      xp: 25
    }
  ];
}

/**
 * Toggles a daily task by id and returns an updated task list.
 */
export function toggleDailyTask(tasks: DailyStudyTask[], taskId: string): DailyStudyTask[] {
  return tasks.map(t => {
    if (t.id !== taskId) return t;
    const completed = !t.completed;
    return {
      ...t,
      completed,
      currentCount: completed ? t.targetCount : 0
    };
  });
}

/**
 * Increments progress on matching category tasks when a learning module is completed.
 */
export function recordModuleActivityOnTasks(
  tasks: DailyStudyTask[],
  category: 'quiz' | 'cards' | 'steps',
  increment = 1
): { tasks: DailyStudyTask[]; newlyCompletedIds: string[] } {
  const newlyCompletedIds: string[] = [];
  const next = tasks.map(t => {
    if (t.category !== category) return t;
    const nextCount = Math.min(t.targetCount, (t.currentCount || 0) + Math.max(1, increment));
    const nowCompleted = nextCount >= t.targetCount;
    if (nowCompleted && !t.completed) {
      newlyCompletedIds.push(t.id);
    }
    return {
      ...t,
      currentCount: nextCount,
      completed: nowCompleted
    };
  });
  return { tasks: next, newlyCompletedIds };
}

/**
 * Computes summary metrics for the daily task tracking widget.
 */
export function computeDailyGoalProgress(tasks: DailyStudyTask[], dailyTargetMinutes = 30, studiedMinutesToday = 0) {
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const earnedXp = tasks.reduce((sum, t) => sum + (t.completed ? t.xp : 0), 0);
  const totalXp = tasks.reduce((sum, t) => sum + t.xp, 0);
  const taskPct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  const timePct = dailyTargetMinutes > 0 ? Math.min(100, Math.round((studiedMinutesToday / dailyTargetMinutes) * 100)) : 0;
  const combinedPct = totalTasks > 0 ? Math.round(taskPct * 0.7 + timePct * 0.3) : timePct;

  return {
    totalTasks,
    completedTasks,
    earnedXp,
    totalXp,
    taskPct,
    timePct,
    combinedPct,
    allTasksDone: totalTasks > 0 && completedTasks === totalTasks
  };
}

/**
 * Computes active streak and best streak from chronological day records.
 */
export function computeStreakMetrics(days: StudyDayRecord[]): { currentStreak: number; bestStreak: number; activeDays: number } {
  if (!days.length) return { currentStreak: 0, bestStreak: 0, activeDays: 0 };
  let bestStreak = 0;
  let running = 0;
  let activeDays = 0;

  for (const d of days) {
    const active = d.minutes > 0 || d.modulesCompleted > 0;
    if (active) {
      activeDays++;
      running++;
      if (running > bestStreak) bestStreak = running;
    } else {
      running = 0;
    }
  }

  // Current streak counts backwards from today (or yesterday if today is 0 so far)
  let currentStreak = 0;
  for (let i = days.length - 1; i >= 0; i--) {
    const d = days[i];
    const active = d.minutes > 0 || d.modulesCompleted > 0;
    if (active) {
      currentStreak++;
    } else if (i === days.length - 1) {
      // Allow today to still be in progress if yesterday was active
      continue;
    } else {
      break;
    }
  }

  return { currentStreak, bestStreak: Math.max(bestStreak, currentStreak), activeDays };
}

/**
 * Generates smooth cubic-bezier SVG path data (`d`) and coordinate points for a numeric series.
 */
export function buildSmoothSvgChart(
  values: number[],
  opts: { width?: number; height?: number; padX?: number; padY?: number; minVal?: number; maxVal?: number } = {}
): { linePath: string; areaPath: string; points: Point2D[] } {
  const width = opts.width ?? 520;
  const height = opts.height ?? 160;
  const padX = opts.padX ?? 24;
  const padY = opts.padY ?? 20;

  if (!values.length) {
    return { linePath: '', areaPath: '', points: [] };
  }

  const minVal = opts.minVal ?? 0;
  const rawMax = opts.maxVal ?? Math.max(...values, 10);
  const maxVal = rawMax <= minVal ? minVal + 10 : rawMax;

  const innerW = Math.max(10, width - padX * 2);
  const innerH = Math.max(10, height - padY * 2);
  const baselineY = padY + innerH;

  const points: Point2D[] = values.map((v, idx) => {
    const ratioX = values.length === 1 ? 0.5 : idx / (values.length - 1);
    const clamped = Math.max(minVal, Math.min(maxVal, Number.isFinite(v) ? v : 0));
    const ratioY = (clamped - minVal) / (maxVal - minVal);
    return {
      x: Number((padX + ratioX * innerW).toFixed(2)),
      y: Number((baselineY - ratioY * innerH).toFixed(2))
    };
  });

  if (points.length === 1) {
    const p = points[0];
    const linePath = `M ${padX} ${p.y} L ${width - padX} ${p.y}`;
    const areaPath = `${linePath} L ${width - padX} ${baselineY} L ${padX} ${baselineY} Z`;
    return { linePath, areaPath, points };
  }

  let linePath = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cpx1 = Number((p0.x + (p1.x - p0.x) * 0.42).toFixed(2));
    const cpy1 = p0.y;
    const cpx2 = Number((p1.x - (p1.x - p0.x) * 0.42).toFixed(2));
    const cpy2 = p1.y;
    linePath += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${p1.x} ${p1.y}`;
  }

  const first = points[0];
  const last = points[points.length - 1];
  const areaPath = `${linePath} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;

  return { linePath, areaPath, points };
}
