// 글로 그리는 가계도 해석기 확인 — 실행: node tests/textgeno.test.js
const assert = require('assert');
const { parseFamilyText, tgLayout } = require('../js/textgeno.js');
const REF = 2026;
const has = (r, a, b, type, year) => r.rels.some(l =>
  ((l.a===a && l.b===b) || (l.a===b && l.b===a)) && l.type===type && (year===undefined || l.year===year));

// 1) 발표 자료 예시 문장
const r = parseFamilyText(
  '대상자(여, 46)는 2년 전 남편(48)과 이혼하고 아들(17), 딸(13)과 함께 산다. 올해 3월 자살시도 1회.\n' +
  '아버지는 2015년 간암으로 사망, 어머니(74)는 치매로 요양원 입소 중이다.\n' +
  '남동생(43)은 알코올 문제가 있고 대상자와 연락이 끊겼다.\n' +
  '전남편과는 갈등이 심하고, 딸과는 친밀하다.', REF);
const P = r.people;
assert.deepStrictEqual(Object.keys(P).sort(),
  ['child:딸','child:아들','father','ip','mother','sib:남동생','spouse'].sort());
assert.strictEqual(P.ip.gender, 'female'); assert.strictEqual(P.ip.birth, 1980);
assert.deepStrictEqual(P.ip.symptoms, ['자살시도(2026)']); assert.ok(P.ip.status.mental);
assert.strictEqual(P.spouse.label, '전남편'); assert.strictEqual(P.spouse.gender, 'male');
assert.ok(has(r, 'ip', 'spouse', 'divorced', 2024));
assert.ok(has(r, 'ip', 'spouse', 'conflict'));
assert.ok(has(r, 'ip', 'child:딸', 'close'));
assert.ok(has(r, 'ip', 'sib:남동생', 'cutoff'));
assert.strictEqual(P.father.alive, false); assert.strictEqual(P.father.cause, '2015 간암');
assert.ok(P.mother.status.phys); assert.strictEqual(P.mother.residence, '요양원'); assert.strictEqual(P.mother.birth, 1952);
assert.ok(P['sib:남동생'].status.addict);
assert.deepStrictEqual(r.households, [['ip','child:아들','child:딸']]);
assert.ok(has(r, 'father', 'ip', 'child') && has(r, 'father', 'sib:남동생', 'child') && has(r, 'ip', 'child:아들', 'child'));
assert.ok(has(r, 'father', 'mother', 'marriage'));
const pos = tgLayout(P);
assert.ok(pos.father.y < 0 && pos['child:딸'].y > 0 && pos.spouse.x < 0 && pos['sib:남동생'].x > 0);
assert.ok(pos['child:아들'].x < pos['child:딸'].x);   // 나이 많은 자녀가 왼쪽

// 2) 약어 기록체 + 부정
const a = parseFamilyText('부 62 알코올, 모 58 우울. 형(35)은 알코올 문제는 없다.', REF);
assert.strictEqual(a.people.father.birth, 1964); assert.ok(a.people.father.status.addict);
assert.ok(a.people.mother.status.mental); assert.ok(!a.people['sib:형'].status.addict);
assert.strictEqual(a.people.ip.gender, 'male');   // '형'이라 부르면 대상자는 남성

// 3) 말로 입력(한글 숫자) + 빠진 부모는 미확인으로 채움 + 할머니 안내
const v = parseFamilyText('본인은 마흔여섯 살이고 언니가 있어요. 할머니는 사십구 세로 돌아가셨어요', REF);
assert.strictEqual(v.people.ip.birth, 1980); assert.strictEqual(v.people.ip.gender, 'female');
assert.ok(v.people.father.unknown && v.people.mother.unknown && v.people.pgf.unknown);
assert.strictEqual(v.people.pgm.alive, false);
assert.ok(v.notes.some(n => n.includes('친가')));

// 4) 지원 안 하는 호칭은 안내
assert.ok(parseFamilyText('대상자는 고모와 산다', REF).notes[0].includes('고모'));

// 5) 음성인식 결과처럼 마침표 없이 줄만 바뀐 말투
const s = parseFamilyText('2년 전에 남편이랑 이혼했고 아들 17살 딸 13살이랑 같이 살아요\n' +
  '아버지는 2015년에 간암으로 돌아가셨고\n남동생은 43살이고 술 문제가 있고 연락이 끊겼어요', REF);
assert.ok(has(s, 'ip', 'spouse', 'divorced', 2024));
assert.strictEqual(s.people['child:아들'].age, 17); assert.strictEqual(s.people['child:딸'].age, 13);
assert.deepStrictEqual(s.households, [['ip','child:아들','child:딸']]);
assert.strictEqual(s.people.father.cause, '2015 간암');
assert.ok(has(s, 'sib:남동생', 'ip', 'cutoff')); assert.ok(s.people['sib:남동생'].status.addict);

console.log('textgeno: ok');
