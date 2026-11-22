import test from 'node:test';
import assert from 'node:assert/strict';
import {
  detectCandyRequest,
  buildCandyReply,
  detectTextLang,
  buildSmartFallbackFollowups,
  buildPersonalizationPrompt,
  containsSensitiveInfo,
  extractKnowledgeFacts,
  scoreKnowledgeMatch,
  type KnowledgeEntry,
} from './aiUpgrades.ts';

test('detectCandyRequest matches Hebrew and English candy prompts cleanly', () => {
  assert.deepEqual(detectCandyRequest('תביא לי סוכריה'), { isCandy: true, lang: 'he' });
  assert.deepEqual(detectCandyRequest('אפשר סוכריה בבקשה?'), { isCandy: true, lang: 'he' });
  assert.deepEqual(detectCandyRequest('סוכריה'), { isCandy: true, lang: 'he' });
  assert.deepEqual(detectCandyRequest('give me candy please'), { isCandy: true, lang: 'en' });
  assert.deepEqual(detectCandyRequest('can I have a lollipop?'), { isCandy: true, lang: 'en' });
  assert.equal(detectCandyRequest('How does Candy Crush Saga implement match-3 algorithms?').isCandy, false);
  assert.equal(detectCandyRequest('Explain quantum entanglement').isCandy, false);
  assert.equal(buildCandyReply('he'), 'הנה קח סוכריה! 🍬');
  assert.equal(buildCandyReply('en'), 'Here, take a candy! 🍬');
});

test('detectTextLang & buildSmartFallbackFollowups adapt to Hebrew and English topics', () => {
  assert.equal(detectTextLang('איך עובד ריאקט?'), 'he');
  assert.equal(detectTextLang('Explain Docker containers'), 'en');

  const heFollowups = buildSmartFallbackFollowups(
    'איך עובד פוטוסינתזה בצמחים?',
    'פוטוסינתזה היא תהליך שבו צמחים ממירים אנרגיית אור לאנרגיה כימית.',
    'en'
  );
  assert.equal(heFollowups.length, 3);
  assert.ok(heFollowups.every((q) => /[\u0590-\u05FF]/.test(q)));
  assert.ok(heFollowups.some((q) => q.includes('פוטוסינתזה')));

  const heConvFollowups = buildSmartFallbackFollowups(
    'הסבר לי ב-2 משפטים קצרים מה זה חור שחור',
    '**חור שחור** הוא אזור בחלל שבו הכבידה חזקה במיוחד.',
    'he'
  );
  assert.ok(heConvFollowups.some((q) => q.includes('חור שחור')));
  assert.ok(heConvFollowups.every((q) => !q.includes('הסבר לי')));

  const heBlackHole = buildSmartFallbackFollowups(
    'מה קורה בתוך חור שחור ליד אופק האירועים?',
    'ליד **אופק האירועים** הכבידה חזקה עד כדי כך שאפילו אור לא יכול לברוח.',
    'he'
  );
  assert.ok(heBlackHole.some((q) => q.includes('חור שחור')));
  assert.ok(heBlackHole.every((q) => !q.includes('קורה בתוך')));

  const hePasta = buildSmartFallbackFollowups(
    'איך מכינים פסטה קרבונרה אמיתית בלי שמנת?',
    'מערבבים חלמונים, גבינת פקורינו רומנו, פלפל שחור ומי בישול של הפסטה.',
    'he'
  );
  assert.ok(hePasta.some((q) => q.includes('פסטה קרבונרה')));
  assert.ok(hePasta.every((q) => !q.includes('איך מכינים')));

  const codeFollowups = buildSmartFallbackFollowups(
    'How to debounce in TypeScript?',
    'Here is a TypeScript debounce function:\n```ts\nfunction debounce() {}\n```',
    'en'
  );
  assert.equal(codeFollowups.length, 3);
  assert.ok(codeFollowups.some((q) => /optimize|pitfalls|tested/i.test(q)));
});

test('buildPersonalizationPrompt compiles rich profile fields cleanly', () => {
  const prompt = buildPersonalizationPrompt({
    name: 'Elad',
    userRole: 'Full-Stack Game Developer',
    persona: 'direct',
    responseFormat: 'bullets',
    emojiLevel: 'none',
    aboutMe: 'Builds 3D engines and AI apps in Israel',
    howRespond: 'Always include runnable code snippets',
    avoidTopics: 'Long intros',
  });
  assert.ok(prompt.includes('Elad'));
  assert.ok(prompt.includes('Full-Stack Game Developer'));
  assert.ok(prompt.includes('razor-sharp'));
  assert.ok(prompt.includes('bullet points'));
  assert.ok(prompt.includes('Do NOT use emojis'));
  assert.ok(prompt.includes('Always include runnable code snippets'));
  assert.ok(prompt.includes('Long intros'));
  assert.equal(buildPersonalizationPrompt({}), '');
});

test('extractKnowledgeFacts filters PII and extracts clean reusable facts', () => {
  assert.equal(containsSensitiveInfo('My email is user@example.com'), true);
  assert.equal(containsSensitiveInfo('My password is secret123'), true);
  assert.equal(containsSensitiveInfo('WebSockets enable full-duplex TCP connections.'), false);

  const blocked = extractKnowledgeFacts(
    'Remember my email test@domain.com',
    'I noted your email test@domain.com for your account profile settings.'
  );
  assert.equal(blocked.length, 0);

  const learned = extractKnowledgeFacts(
    'What is WebAssembly used for?',
    'WebAssembly (Wasm) is a portable binary instruction format that runs near-native speed inside modern web browsers. It lets C++, Rust, and Go code execute safely alongside JavaScript.'
  );
  assert.equal(learned.length, 1);
  assert.ok(learned[0].fact.includes('WebAssembly'));
  assert.ok(learned[0].tags.includes('webassembly'));
});

test('scoreKnowledgeMatch ranks matching learned knowledge entries accurately', () => {
  const entries: KnowledgeEntry[] = [
    {
      id: 'k1',
      topic: 'WebAssembly',
      fact: 'WebAssembly runs Rust and C++ at near-native speed in browsers.',
      tags: ['webassembly', 'wasm', 'rust', 'browsers'],
      lang: 'en',
      confidence: 0.85,
      uses: 2,
      createdAt: 1,
      updatedAt: 1,
    },
    {
      id: 'k2',
      topic: 'Photosynthesis',
      fact: 'Chlorophyll absorbs sunlight to convert CO2 and water into glucose.',
      tags: ['photosynthesis', 'plants', 'chlorophyll'],
      lang: 'en',
      confidence: 0.8,
      uses: 1,
      createdAt: 1,
      updatedAt: 1,
    },
  ];
  const matches = scoreKnowledgeMatch('Can Rust compile to WebAssembly for browsers?', entries, 3);
  assert.equal(matches.length, 1);
  assert.equal(matches[0].id, 'k1');
});
