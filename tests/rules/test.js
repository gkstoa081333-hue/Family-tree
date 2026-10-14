// 가상 계정으로 앱의 실제 DB 쓰기 흐름을 에뮬레이터 + 실제 보안 규칙(rules.json)에서 재현
const firebase = require('firebase/compat/app');
require('firebase/compat/auth'); require('firebase/compat/database');

const NS = 'demo-genogram-default-rtdb';
const DB = `http://127.0.0.1:9000`;
const results = [];
const check = async (name, fn) => {
  try { const r = await fn(); results.push(['PASS', name, r ?? '']); }
  catch (e) { results.push(['FAIL', name, e.code || e.message]); }
};
let n = 0;
async function client(email) {
  const app = firebase.initializeApp({ apiKey: 'demo', projectId: 'demo-genogram', databaseURL: `${DB}?ns=${NS}` }, 'c' + (n++));
  app.auth().useEmulator('http://127.0.0.1:9099');
  app.database().useEmulator('127.0.0.1', 9000);
  const cred = await app.auth().createUserWithEmailAndPassword(email, 'test1234');
  return { app, db: app.database(), uid: cred.user.uid, user: cred.user, email };
}
// 규칙 우회(관리자 권한)로 초기 데이터 세팅 — 슈퍼관리자 부트스트랩(콘솔에서 하던 작업) 재현
async function seed(path, val) {
  const r = await fetch(`${DB}/${path}.json?ns=${NS}`, { method: 'PUT', headers: { Authorization: 'Bearer owner' }, body: JSON.stringify(val) });
  if (!r.ok) throw new Error('seed ' + path + ' ' + r.status);
}

// js/auth.js registerMember 와 같은 쓰기 순서
async function registerMember(c, name, code) {
  const orgId = (await c.db.ref('orgCodes/' + code).once('value')).val();
  if (!orgId) return 'NO_ORG';
  const claimRef = c.db.ref('orgAdminClaim/' + orgId);
  let isFirst = false;
  if ((await c.db.ref('orgs/' + orgId + '/needsAdmin').once('value')).val() === true) {
    try { await claimRef.set(c.uid); isFirst = true; }
    catch (e) { isFirst = (await claimRef.once('value')).val() === c.uid; }
  }
  const role = isFirst ? 'admin' : 'member', approved = isFirst;
  const rec = { name, email: c.email, orgId, role, approved, createdAt: Date.now() };
  await c.db.ref().update({
    ['users/' + c.uid]: rec,
    ['orgMembers/' + orgId + '/' + c.uid]: { name, email: c.email, role, approved, createdAt: rec.createdAt }
  });
  if (isFirst) await c.db.ref('orgs/' + orgId + '/needsAdmin').set(false);
  return role;
}

(async () => {
  // 슈퍼관리자 (기존 기관 소속 관리자 + superAdmin)
  const sa = await client('super@test.kr');
  await seed('orgs/HQ', { name: '본부', ownerUid: sa.uid, createdAt: 1, needsAdmin: false });
  await seed('users/' + sa.uid, { name: '슈퍼', email: sa.email, orgId: 'HQ', role: 'admin', approved: true, superAdmin: true, createdAt: 1 });
  await seed('orgMembers/HQ/' + sa.uid, { name: '슈퍼', email: sa.email, role: 'admin', approved: true, superAdmin: true, createdAt: 1 });

  // 1. 슈퍼관리자: 기관 추가 + 코드 발급 (admin.js addOrgAsSuperAdmin)
  const orgId = sa.db.ref('orgs').push().key;
  await check('슈퍼관리자 기관 생성', () => sa.db.ref('orgs/' + orgId).set({ name: '테스트기관', ownerUid: sa.uid, createdAt: Date.now(), needsAdmin: true }));
  await check('가입코드 발급(orgCodes)', () => sa.db.ref('orgCodes/TEST01').set(orgId));
  await check('가입코드 저장(orgPrivate)', () => sa.db.ref('orgPrivate/' + orgId).set({ joinCode: 'TEST01' }));

  // 2. 첫 가입자 → 관리자 자동 지정
  const a = await client('admin@test.kr');
  await check('첫 가입자 등록 → 관리자', () => registerMember(a, '첫관리자', 'TEST01'));

  // 3. 두번째 가입자 → 승인대기 직원
  const m = await client('member@test.kr');
  await check('두번째 가입자 등록 → 직원(대기)', () => registerMember(m, '직원1', 'TEST01'));

  // 4. 동시 가입: 새 기관에 두 명이 동시에
  const org2 = sa.db.ref('orgs').push().key;
  await sa.db.ref('orgs/' + org2).set({ name: '동시기관', ownerUid: sa.uid, createdAt: Date.now(), needsAdmin: true });
  await sa.db.ref('orgCodes/RACE01').set(org2);
  const [r1, r2] = [await client('race1@test.kr'), await client('race2@test.kr')];
  await check('동시 가입 2명 → 관리자는 1명만', async () => {
    const roles = await Promise.all([registerMember(r1, '동시1', 'RACE01'), registerMember(r2, '동시2', 'RACE01')]);
    if (roles.filter(x => x === 'admin').length !== 1) throw new Error('roles=' + roles);
    return roles.join(',');
  });

  // 5. 관리자: 승인 (admin.js approve)
  await check('관리자가 직원 승인', () => a.db.ref().update({
    ['users/' + m.uid + '/approved']: true, ['users/' + m.uid + '/rejected']: null,
    ['orgMembers/' + orgId + '/' + m.uid + '/approved']: true, ['orgMembers/' + orgId + '/' + m.uid + '/rejected']: null }));

  // 6. 거절 → 재신청 (approve(false) + reapply)
  const rj = await client('reject@test.kr');
  await check('세번째 가입자 등록', () => registerMember(rj, '거절자', 'TEST01'));
  await check('관리자가 거절', () => a.db.ref().update({ ['users/' + rj.uid + '/rejected']: true, ['orgMembers/' + orgId + '/' + rj.uid + '/rejected']: true }));
  await check('거절자 재신청', async () => {
    await rj.db.ref('users/' + rj.uid + '/rejected').set(false);
    await rj.db.ref('orgMembers/' + orgId + '/' + rj.uid + '/rejected').set(false);
  });

  // 7. 권한 상승 시도는 막혀야 함
  await check('[막혀야 정상] 직원이 스스로 관리자로 변경', async () => {
    try { await m.db.ref('users/' + m.uid + '/role').set('admin'); } catch (e) { return 'denied'; }
    throw new Error('허용됨!');
  });
  await check('[막혀야 정상] 다른 사람이 이미 선점한 관리자 자리로 등록', async () => {
    const x = await client('x@test.kr');
    try {
      await x.db.ref().update({ ['users/' + x.uid]: { name: 'x', email: x.email, orgId, role: 'admin', approved: true, createdAt: 1 } });
    } catch (e) { return 'denied'; }
    throw new Error('허용됨!');
  });

  // 8. 케이스 생성 / 가계도 저장 / 실제 삭제 (cases.js createCase, purgeCase)
  const caseId = m.db.ref('cases/' + orgId).push().key;
  await check('직원 케이스 생성', () => m.db.ref('cases/' + orgId + '/' + caseId).set({ ownerUid: m.uid, ownerName: '직원1', title: '김○○ 가족', caseNo: '', visibility: 'private', count: 0, gen: 1, createdAt: 1, updatedAt: 1 }));
  await check('가계도 인물 저장', () => m.db.ref('genograms/' + orgId + '/' + caseId + '/nodes/n1').set({ id: 'n1', gender: 'male', x: 0, y: 0, name: '홍길동' }));
  await check('케이스 실제 삭제(케이스+가계도)', () => m.db.ref().update({ ['cases/' + orgId + '/' + caseId]: null, ['genograms/' + orgId + '/' + caseId]: null }));
  await check('[막혀야 정상] 삭제된 케이스에 가계도 다시 쓰기', async () => {
    try { await a.db.ref('genograms/' + orgId + '/' + caseId + '/nodes/n2').set({ id: 'n2' }); } catch (e) { return 'denied'; }
    throw new Error('허용됨!');
  });

  // 9. 슈퍼관리자 전체 기관/구성원 조회 (admin.js loadOrgList)
  await check('슈퍼관리자 전체 기관·구성원 조회', async () => {
    const [o, mm] = await Promise.all([sa.db.ref('orgs').once('value'), sa.db.ref('orgMembers').once('value')]);
    const admins = Object.values(mm.val()[orgId]).filter(x => x.role === 'admin' && x.approved).map(x => x.name);
    return `기관 ${Object.keys(o.val()).length}개, 테스트기관 관리자=${admins}`;
  });
  // 10. 요청 보내기 / 답변
  await check('직원 요청 보내기', () => m.db.ref('requests/' + m.uid + '/q1').set({ id: 'q1', uid: m.uid, title: 't', content: 'c', type: 'question', status: 'pending', createdAt: 1 }));
  await check('슈퍼관리자 답변', () => sa.db.ref('requests/' + m.uid + '/q1').update({ reply: 'ok', repliedAt: 1, status: 'answered' }));
  // 11. 직원 0명 기관 삭제 (admin.js deleteOrg)
  const org3 = sa.db.ref('orgs').push().key;
  await sa.db.ref('orgs/' + org3).set({ name: '빈기관', ownerUid: sa.uid, createdAt: 1, needsAdmin: true });
  await sa.db.ref('orgCodes/EMPTY1').set(org3); await sa.db.ref('orgPrivate/' + org3).set({ joinCode: 'EMPTY1' });
  await check('빈 기관 삭제', () => sa.db.ref().update({ ['orgs/' + org3]: null, ['orgPrivate/' + org3]: null, ['orgAdminClaim/' + org3]: null, ['orgCodes/EMPTY1']: null }));

  for (const [s, name, r] of results) console.log(`${s === 'PASS' ? '✅' : '❌'} ${name}${r ? '  — ' + r : ''}`);
  process.exit(0);
})().catch(e => { console.error('SCRIPT ERROR', e); process.exit(1); });
