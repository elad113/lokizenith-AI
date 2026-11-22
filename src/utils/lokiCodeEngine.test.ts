import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getCuratedLanguageIdeas,
  detectCodeInputRequirement,
  transpileTypeScriptToJs,
  executeMatlabScript,
} from './lokiCodeEngine.ts';
import {
  store,
  restoreOrGetSessionUser,
} from '../server/store.ts';

test('getCuratedLanguageIdeas returns 4 tailored ideas per language and rotates on refresh', () => {
  const matlabIdeas1 = getCuratedLanguageIdeas('matlab', 0);
  const matlabIdeas2 = getCuratedLanguageIdeas('matlab', 2);
  assert.equal(matlabIdeas1.length, 4);
  assert.equal(matlabIdeas2.length, 4);
  assert.notEqual(matlabIdeas1[0].label, matlabIdeas2[0].label);
  assert.ok(matlabIdeas1.some((i) => /MATLAB/i.test(i.prompt)));

  const pyIdeas = getCuratedLanguageIdeas('python', 0);
  assert.equal(pyIdeas.length, 4);
  assert.ok(pyIdeas.some((i) => /Python/i.test(i.prompt)));
});

test('detectCodeInputRequirement detects stdin calls across all languages including MATLAB', () => {
  assert.equal(detectCodeInputRequirement('matlab', "n = input('Enter N: ');\ndisp(n);"), true);
  assert.equal(detectCodeInputRequirement('matlab', "A = magic(3);\ndisp(A);"), false);
  assert.equal(detectCodeInputRequirement('python', "name = input('Name: ')"), true);
  assert.equal(detectCodeInputRequirement('java', 'Scanner sc = new Scanner(System.in);'), true);
  assert.equal(detectCodeInputRequirement('cpp', 'int x; std::cin >> x;'), true);
  assert.equal(detectCodeInputRequirement('csharp', 'string s = Console.ReadLine();'), true);
  assert.equal(detectCodeInputRequirement('lsl', 'llListen(0, "", NULL_KEY, "");'), true);
});

test('executeMatlabScript compiles and runs MATLAB matrix math, loops, fprintf, and interactive stdin', () => {
  const script = `
% MATLAB Matrix & Stdin Test
n = input('Enter scale factor: ');
A = [1 2; 3 4];
d = det(A);
tr = trace(A);
fprintf('Det: %d, Trace: %d, Scaled: %d\\n', d, tr, tr * n);
for k = 1:3
  fprintf('Step %d = %d\\n', k, k^2);
end
`;
  const res = executeMatlabScript(script, '10\n');
  assert.equal(res.handled, true);
  assert.equal(res.status, 0);
  assert.ok(res.stdout.includes('Enter scale factor: 10'));
  assert.ok(res.stdout.includes('Det: -2, Trace: 5, Scaled: 50'));
  assert.ok(res.stdout.includes('Step 3 = 9'));
});

test('transpileTypeScriptToJs strips TS types cleanly for execution', () => {
  const ts = `
interface User {
  name: string;
  score: number;
}
function greet(u: User): string {
  const bonus: number = 10;
  return u.name + ':' + (u.score + bonus);
}
console.log(greet({ name: 'Loki', score: 90 }));
`;
  const js = transpileTypeScriptToJs(ts);
  assert.ok(!js.includes('interface User'));
  assert.ok(js.includes('function greet'));
});

test('restoreOrGetSessionUser re-binds saved client token across updates without logging user out', () => {
  const anyUser = Object.values(store.users)[0];
  if (!anyUser) return;
  const testToken = 'tok_update_persist_test_' + Date.now();
  delete store.sessions[testToken];

  const restored = restoreOrGetSessionUser(testToken, {
    id: anyUser.id,
    username: anyUser.username,
    googleEmail: anyUser.googleEmail,
  });
  assert.ok(restored);
  assert.equal(restored?.username, anyUser.username);
  assert.ok(store.sessions[testToken]);
  delete store.sessions[testToken];
});
