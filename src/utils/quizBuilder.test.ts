import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isQuizOrTestRequest,
  parseQuizRequestSpec,
  evaluateQuizSubmission,
  isReferentialOrEmptyQuizTopic,
  resolveQuizContextFromConversation,
  detectSubjectStudyProfile,
  type QuizQuestionItem,
} from './quizBuilder.ts';

test('isQuizOrTestRequest detects English and Hebrew test/quiz prompts and ignores code unit tests', () => {
  assert.equal(isQuizOrTestRequest('make a test about World War II with 10 questions'), true);
  assert.equal(isQuizOrTestRequest('Create a 15-question test on photosynthesis with option questions and open questions'), true);
  assert.equal(isQuizOrTestRequest('תעשה לי מבחן על מערכת השמש עם 12 שאלות'), true);
  assert.equal(isQuizOrTestRequest('תכין מבחן של 20 שאלות בהיסטוריה'), true);
  assert.equal(isQuizOrTestRequest('תעשה על זה מבחן'), true);
  assert.equal(isQuizOrTestRequest('/test Python basics 8 questions'), true);
  assert.equal(isQuizOrTestRequest('write unit tests for this function in Jest'), false);
  assert.equal(isQuizOrTestRequest('run pytest test suite'), false);
});

test('parseQuizRequestSpec clamps question count between 5 and 20 and distributes across all 4 question types (mc, tf, fill, open)', () => {
  const s1 = parseQuizRequestSpec('Make a test about the Solar System with 12 questions');
  assert.equal(s1.count, 12);
  assert.equal(s1.mode, 'mixed');
  assert.equal(s1.mcCount + s1.tfCount + s1.fillCount + s1.openCount, 12);
  assert.ok(s1.mcCount >= 2 && s1.tfCount >= 1 && s1.fillCount >= 1 && s1.openCount >= 2);
  assert.match(s1.topic, /Solar System/i);

  const sMin = parseQuizRequestSpec('Make a test about math with 2 questions');
  assert.equal(sMin.count, 5);
  assert.equal(sMin.mcCount + sMin.tfCount + sMin.fillCount + sMin.openCount, 5);
  assert.ok(sMin.mcCount >= 1 && sMin.tfCount >= 1 && sMin.fillCount >= 1 && sMin.openCount >= 1);

  const sMax = parseQuizRequestSpec('Make a test about biology with 35 questions');
  assert.equal(sMax.count, 20);

  const s20 = parseQuizRequestSpec('תעשה לי מבחן על מלחמת העולם השנייה עם 20 שאלות');
  assert.equal(s20.count, 20);
  assert.equal(s20.lang, 'he');
  assert.equal(s20.mcCount + s20.tfCount + s20.fillCount + s20.openCount, 20);

  const sOpenOnly = parseQuizRequestSpec('Create a test about physics with 7 questions only open questions');
  assert.equal(sOpenOnly.count, 7);
  assert.equal(sOpenOnly.mode, 'open');
  assert.equal(sOpenOnly.openCount, 7);
  assert.equal(sOpenOnly.mcCount, 0);

  const sTfOnly = parseQuizRequestSpec('תעשה לי מבחן בתנך עם 6 שאלות רק נכון או לא נכון');
  assert.equal(sTfOnly.count, 6);
  assert.equal(sTfOnly.mode, 'tf');
  assert.equal(sTfOnly.tfCount, 6);

  const sFillOnly = parseQuizRequestSpec('תעשה מבחן בהיסטוריה עם 6 שאלות רק השלמת משפטים');
  assert.equal(sFillOnly.count, 6);
  assert.equal(sFillOnly.mode, 'fill');
  assert.equal(sFillOnly.fillCount, 6);

  const sSplit = parseQuizRequestSpec('Make a test on chemistry with 6 option questions and 4 open questions');
  assert.equal(sSplit.count, 10);
  assert.equal(sSplit.mcCount, 6);
  assert.equal(sSplit.openCount, 4);
});

test('evaluateQuizSubmission grades all 4 question types: mc, tf (true/false), fill (fill-in-blank), and open typed answers', () => {
  const questions: QuizQuestionItem[] = [
    { type: 'mc', q: 'What is 2 + 2?', options: ['3', '4', '5', '6'], answer: 1 },
    { type: 'tf', q: 'Elijah confronted King Ahab in 1 Kings 17.', options: ['True', 'False'], answer: 0 },
    { type: 'fill', q: 'Elijah hid by the brook of _____ during the drought.', answer: 'נחל כרית' },
    { type: 'open', q: 'Explain photosynthesis briefly.', answer: 'Plants convert sunlight, water, and carbon dioxide into glucose and oxygen' },
    { type: 'open', q: 'Who wrote Hamlet?', answer: 'William Shakespeare' },
  ];

  const evaluation = evaluateQuizSubmission(
    questions,
    [1, 0, 'בנחל כרית', 'Plants use sunlight and water to make glucose and oxygen', 'Charles Dickens'],
    {
      3: { correct: true, score: 1, feedback: 'Accurate explanation of photosynthesis!' },
      4: { correct: false, score: 0, feedback: 'Hamlet was written by William Shakespeare, not Charles Dickens.' },
    }
  );

  assert.equal(evaluation.total, 5);
  assert.equal(evaluation.score, 4); // Q0 (mc) right, Q1 (tf) right, Q2 (fill) right with Hebrew prefix tolerance, Q3 (open) right, Q4 (open) wrong
  assert.equal(evaluation.percentage, 80);
  assert.equal(evaluation.answers[0].correct, true);
  assert.equal(evaluation.answers[1].correct, true);
  assert.equal(evaluation.answers[2].correct, true);
  assert.equal(evaluation.answers[3].correct, true);
  assert.equal(evaluation.answers[4].correct, false);
});

test('resolveQuizContextFromConversation links "תעשה על זה מבחן" to the Tanakh topic taught earlier in the same chat', () => {
  assert.equal(isReferentialOrEmptyQuizTopic('זה', 'תעשה על זה מבחן'), true);
  assert.equal(isReferentialOrEmptyQuizTopic('החומר הזה', 'תעשה לי מבחן על החומר הזה'), true);
  assert.equal(isReferentialOrEmptyQuizTopic('this', 'make a test on this'), true);
  assert.equal(isReferentialOrEmptyQuizTopic('מלכים א פרק יז', 'תעשה לי מבחן על מלכים א פרק יז'), false);

  const history = [
    {
      id: 'u1',
      role: 'user' as const,
      content: 'תלמד אותי בתנך על מלכים א פרק יז - אליהו הנביא והבצורת',
    },
    {
      id: 'a1',
      role: 'assistant' as const,
      content:
        '# מלכים א׳ פרק י״ז: אליהו הנביא והכרזת הבצורת\nבפרק זה אליהו התשבי מכריז בפני אחאב מלך ישראל על בצורת קשה. לאחר מכן ה׳ מצווה עליו להסתתר בנחל כרית שם העורבים מכלכלים אותו, ובהמשך הוא הולך אל האלמנה בצרפת ומתרחש נס פך השמן וכד הקמח והחיית בן האלמנה.',
    },
    {
      id: 'u2',
      role: 'user' as const,
      content: 'תעשה על זה מבחן של 8 שאלות',
    },
  ];

  const resolved = resolveQuizContextFromConversation('תעשה על זה מבחן של 8 שאלות', 'זה', history, 'u2');
  assert.equal(resolved.usedConversationContext, true);
  assert.match(resolved.topic, /תנך|מלכים|אליהו/);
  assert.match(resolved.studyMaterialContext, /נחל כרית/);
  assert.ok(resolved.subjectProfile);
  assert.equal(resolved.subjectProfile?.id, 'tanakh');

  const bioProfile = detectSubjectStudyProfile('תלמד אותי בביולוגיה על מבנה התא ומיטוכונדריה');
  assert.equal(bioProfile?.id, 'biology');
});

