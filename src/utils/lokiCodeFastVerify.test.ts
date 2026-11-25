import test from 'node:test';
import assert from 'node:assert/strict';
import { planLokiCodeRoute, verifyGeneratedCodeFast } from './lokiCodeFastVerify';

test('planLokiCodeRoute targets <= 10s latency across general and LSL languages with hard stream caps', () => {
  const py = planLokiCodeRoute('python');
  assert.equal(py.primaryModel, 'gemini-3.1-flash-lite');
  assert.equal(py.primaryThinking, 'MINIMAL');
  assert.ok(py.firstTokenTimeoutMs <= 4000);
  assert.ok(py.hedgeDelayMs <= 2000);
  assert.ok(py.totalStreamTimeoutMs <= 8000);
  assert.ok(py.totalStreamTimeoutMs + py.repairTimeoutMs <= 10000);
  assert.equal(py.groqReasoningEffort, 'low');

  const lsl = planLokiCodeRoute('lsl');
  assert.equal(lsl.primaryModel, 'gemini-3.1-flash-lite');
  assert.equal(lsl.primaryThinking, 'MINIMAL');
  assert.equal(lsl.secondaryModel, 'gemini-4-hydrogen');
  assert.ok(lsl.firstTokenTimeoutMs <= 4000);
  assert.ok(lsl.hedgeDelayMs <= 2000);
  assert.ok(lsl.totalStreamTimeoutMs <= 8000);
  assert.ok(lsl.totalStreamTimeoutMs + lsl.repairTimeoutMs <= 10000);
});

test('verifyGeneratedCodeFast validates JavaScript and TypeScript via real esbuild AST parser', () => {
  const goodJs = verifyGeneratedCodeFast('javascript', '```javascript\nconst add = (a, b) => a + b;\nconsole.log(add(2, 3));\n```');
  assert.equal(goodJs.ok, true);
  assert.equal(goodJs.errors.length, 0);
  assert.ok(goodJs.verifyMs < 500);

  const badJs = verifyGeneratedCodeFast('javascript', '```js\nfunction broken( { return 1;\n```');
  assert.equal(badJs.ok, false);
  assert.ok(badJs.errors.length > 0);

  const goodTs = verifyGeneratedCodeFast('typescript', '```ts\ninterface User { id: number; name: string }\nconst u: User = { id: 1, name: "Ada" };\n```');
  assert.equal(goodTs.ok, true);

  const badTs = verifyGeneratedCodeFast('typescript', '```ts\nconst x: number = ;\n```');
  assert.equal(badTs.ok, false);
});

test('verifyGeneratedCodeFast validates Python AST and catches syntax errors', () => {
  const goodPy = verifyGeneratedCodeFast('python', '```python\ndef fib(n: int) -> int:\n    return n if n < 2 else fib(n - 1) + fib(n - 2)\nprint(fib(8))\n```');
  assert.equal(goodPy.ok, true);
  assert.equal(goodPy.errors.length, 0);

  const badPy = verifyGeneratedCodeFast('python', '```python\ndef broken(x)\n    return x\n```');
  assert.equal(badPy.ok, false);
  assert.ok(badPy.errors.length > 0);
});

test('verifyGeneratedCodeFast validates HTML including inline script syntax', () => {
  const goodHtml = verifyGeneratedCodeFast(
    'html',
    '```html\n<!DOCTYPE html><html><body><button id="b">Hi</button><script>document.getElementById("b").onclick = () => console.log("ok");</script></body></html>\n```'
  );
  assert.equal(goodHtml.ok, true);

  const badHtml = verifyGeneratedCodeFast(
    'html',
    '```html\n<!DOCTYPE html><html><body><script>const x = (;</script></body></html>\n```'
  );
  assert.equal(badHtml.ok, false);
  assert.ok(badHtml.errors.some((e) => e.includes('Inline <script #1>')));
});

test('verifyGeneratedCodeFast validates LSL2/Mono and C++/Java/Rust structural integrity', () => {
  const goodLsl = verifyGeneratedCodeFast(
    'lsl',
    '```lsl\ndefault {\n    state_entry() {\n        llSay(0, "Ready");\n    }\n}\n```'
  );
  assert.equal(goodLsl.ok, true);
  assert.equal(goodLsl.compiler, 'Second Life LSL2 Mono Compiler');

  const badCpp = verifyGeneratedCodeFast('cpp', '```cpp\n#include <iostream>\nint main() {\n    std::cout << "hi";\n```');
  assert.equal(badCpp.ok, false);
  assert.ok(badCpp.errors.some((e) => e.includes("Unclosed '{'")));
});
