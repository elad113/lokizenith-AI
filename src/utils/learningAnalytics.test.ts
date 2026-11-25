import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stepSpring,
  createDefaultDailyTasks,
  toggleDailyTask,
  recordModuleActivityOnTasks,
  computeDailyGoalProgress,
  computeStreakMetrics,
  buildSmoothSvgChart,
  type StudyDayRecord
} from './learningAnalytics';

test('stepSpring converges smoothly toward target value', () => {
  let val = 0;
  let vel = 0;
  let done = false;
  for (let i = 0; i < 240; i++) {
    const res = stepSpring(val, 100, vel, { stiffness: 200, damping: 22, dt: 1 / 60 });
    val = res.value;
    vel = res.velocity;
    done = res.done;
    if (done) break;
  }
  assert.equal(done, true);
  assert.equal(val, 100);
  assert.equal(vel, 0);
});

test('daily study task creation, toggling, and module auto-completion work deterministically', () => {
  const tasks = createDefaultDailyTasks('he');
  assert.equal(tasks.length, 3);
  assert.equal(tasks.every(t => !t.completed), true);

  // Toggle first task
  const afterToggle = toggleDailyTask(tasks, 'dt_quiz');
  assert.equal(afterToggle[0].completed, true);
  assert.equal(afterToggle[0].currentCount, 1);

  // Auto-complete steps category
  const { tasks: afterActivity, newlyCompletedIds } = recordModuleActivityOnTasks(afterToggle, 'steps', 1);
  assert.deepEqual(newlyCompletedIds, ['dt_steps']);
  assert.equal(afterActivity[1].completed, true);

  const summary = computeDailyGoalProgress(afterActivity, 30, 15);
  assert.equal(summary.completedTasks, 2);
  assert.equal(summary.totalTasks, 3);
  assert.equal(summary.earnedXp, 85);
  assert.equal(summary.taskPct, 67);
  assert.equal(summary.timePct, 50);
  assert.equal(summary.allTasksDone, false);
});

test('computeStreakMetrics calculates current and best streaks accurately', () => {
  const days: StudyDayRecord[] = [
    { dateKey: '2026-11-18', label: 'Wed', minutes: 20, modulesCompleted: 2, retentionPct: 78 },
    { dateKey: '2026-11-19', label: 'Thu', minutes: 25, modulesCompleted: 3, retentionPct: 82 },
    { dateKey: '2026-11-20', label: 'Fri', minutes: 0, modulesCompleted: 0, retentionPct: 80 },
    { dateKey: '2026-11-21', label: 'Sat', minutes: 15, modulesCompleted: 1, retentionPct: 84 },
    { dateKey: '2026-11-22', label: 'Sun', minutes: 30, modulesCompleted: 3, retentionPct: 88 },
    { dateKey: '2026-11-23', label: 'Mon', minutes: 35, modulesCompleted: 4, retentionPct: 92 }
  ];

  const metrics = computeStreakMetrics(days);
  assert.equal(metrics.currentStreak, 3);
  assert.equal(metrics.bestStreak, 3);
  assert.equal(metrics.activeDays, 5);
});

test('buildSmoothSvgChart generates valid cubic bezier SVG path and area path', () => {
  const chart = buildSmoothSvgChart([12, 24, 18, 35, 42, 30, 50], {
    width: 480,
    height: 150,
    padX: 20,
    padY: 16,
    minVal: 0,
    maxVal: 60
  });

  assert.equal(chart.points.length, 7);
  assert.ok(chart.linePath.startsWith('M 20 '));
  assert.ok(chart.linePath.includes(' C '));
  assert.ok(chart.areaPath.endsWith(' Z'));
  // Last point should have smaller y (higher on chart) than first point since 50 > 12
  assert.ok(chart.points[6].y < chart.points[0].y);
});
