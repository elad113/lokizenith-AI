import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildMatlabSystemPrompt,
  analyzeAndFixMatlabScript,
  generateOfflineProfessionalMatlab,
} from './matlabSpecialist.ts';
import { executeMatlabScript } from './lokiCodeEngine.ts';

test('buildMatlabSystemPrompt creates compact MATLAB prompt in new, edit, and vision modes', () => {
  const newSys = buildMatlabSystemPrompt({ mode: 'new', comments: true });
  assert.ok(newSys.includes('MATLAB'));
  assert.ok(newSys.includes('```matlab'));
  assert.ok(newSys.length < 900, 'Prompt should stay compact for ultra-fast TTFT');

  const editSys = buildMatlabSystemPrompt({ mode: 'edit', hasImages: true });
  assert.ok(editSys.includes('IMAGE ANALYSIS'));
  assert.ok(editSys.includes('Edit'));
});

test('analyzeAndFixMatlabScript auto-fixes C/Python slips and unclosed blocks safely', () => {
  const broken = `\`\`\`matlab
// Convert this comment
x = 10;
if x != 5
    fprintf('Not five: %d\\n', x);
\`\`\``;
  const audit = analyzeAndFixMatlabScript(broken);
  assert.equal(audit.valid, true);
  assert.ok(audit.code.includes('% Convert this comment'));
  assert.ok(audit.code.includes('if x ~= 5'));
  assert.ok(audit.code.endsWith('end'));
  assert.ok(audit.fixes.length >= 2);
});

test('analyzeAndFixMatlabScript catches unbalanced parentheses and stray end', () => {
  const bad = `x = sin(1.0;\nend`;
  const audit = analyzeAndFixMatlabScript(bad);
  assert.equal(audit.valid, false);
  assert.ok(audit.errors.length >= 1);
});

test('generateOfflineProfessionalMatlab emits valid runnable scripts across all 10 domains in milliseconds', () => {
  const topics = [
    'FFT signal processing bandpass filter and SNR',
    'PID controller step response simulation',
    'RK4 ODE nonlinear pendulum physics solver',
    '2D Sobel edge detection image processing',
    'Linear regression gradient descent machine learning',
    'Monte Carlo estimation of pi and integral',
    'Linear algebra matrix eigenvalues and determinant',
    '3D surface radial sinc mesh visualization',
    '2-DOF robotic arm inverse kinematics',
    'general scientific computing benchmark',
  ];

  const t0 = performance.now();
  for (const topic of topics) {
    const out = generateOfflineProfessionalMatlab(topic);
    assert.ok(out.startsWith('```matlab'), `Expected fenced MATLAB block for "${topic}"`);
    const audit = analyzeAndFixMatlabScript(out);
    assert.equal(audit.valid, true, `Expected valid MATLAB for "${topic}", errors: ${audit.errors.join('; ')}`);
    assert.ok(audit.stats.outputs >= 1, `Expected visible output statements for "${topic}"`);
  }
  const elapsedMs = performance.now() - t0;
  assert.ok(elapsedMs < 200, `Expected all 10 domains synthesized+audited in <200ms, got ${elapsedMs}ms`);

  // Verify the linear algebra / default script actually runs cleanly in our MATLAB engine
  const linAlg = analyzeAndFixMatlabScript(generateOfflineProfessionalMatlab('matrix determinant and trace')).code;
  const runRes = executeMatlabScript(linAlg, '');
  assert.equal(runRes.handled, true);
  assert.equal(runRes.status, 0);
});
