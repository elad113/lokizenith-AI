import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildUpstreamBusyReply,
  detectFallbackLanguage,
  extractTextContent,
  matchGreetingOrSmallTalk,
  stripSystemWrappers,
} from './chatFallbackHelper';

test('matchGreetingOrSmallTalk responds naturally to Hebrew greetings including היי', () => {
  for (const input of ['היי', 'היי!', 'הי', 'שלום', 'אהלן', 'בוקר טוב', 'היי מה נשמע?']) {
    const lang = detectFallbackLanguage(input);
    assert.equal(lang, 'he');
    const reply = matchGreetingOrSmallTalk(input, lang);
    assert.ok(reply, `Expected greeting reply for "${input}"`);
    assert.equal(reply!.includes('היבטים מרכזיים'), false);
    assert.equal(reply!.includes('נצלול לעומק'), false);
  }
});

test('handles [CONTEXT ...] wrappers and multimodal array content without losing Hebrew greeting detection', () => {
  const wrapped = '[CONTEXT: user=guest]\n[MEMORIES: none]\nהיי';
  const clean = stripSystemWrappers(wrapped);
  assert.equal(clean, 'היי');
  const lang = detectFallbackLanguage(wrapped);
  assert.equal(lang, 'he');
  const reply = matchGreetingOrSmallTalk(clean, lang);
  assert.equal(reply, 'היי! 😊 מה נשמע? איך אפשר לעזור לך היום?');

  const arrayExtracted = extractTextContent([{ type: 'text', text: 'מה קורה?' }]);
  assert.equal(arrayExtracted, 'מה קורה?');
  assert.equal(matchGreetingOrSmallTalk(arrayExtracted, 'he'), 'הכול מצוין, תודה! 😊 במה אפשר לעזור לך היום?');
});

test('supports English and Arabic greetings cleanly', () => {
  assert.equal(matchGreetingOrSmallTalk('hi!', 'en'), 'Hey there! 😊 How can I help you today?');
  assert.equal(matchGreetingOrSmallTalk('thanks!', 'en'), "You're welcome! Let me know if there's anything else I can help with.");
  assert.equal(matchGreetingOrSmallTalk('مرحبا', 'ar'), 'مرحباً! 😊 كيف يمكنني مساعدتك اليوم؟');
});

test('upstream busy fallback never emits robotic היבטים מרכזיים boilerplate', () => {
  for (const lang of ['he', 'ar', 'en'] as const) {
    const msg = buildUpstreamBusyReply(lang);
    assert.equal(msg.includes('היבטים מרכזיים'), false);
    assert.equal(msg.includes('נצלול לעומק'), false);
    assert.ok(msg.length > 20);
  }
});
