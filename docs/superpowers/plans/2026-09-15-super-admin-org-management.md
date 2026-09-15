# 슈퍼관리자 — 기관 추가 + 코드 발급 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 관리자 모드 안에서 "슈퍼관리자"가 새 기관을 추가하고 가입코드를 발급할 수 있게 하여, 다른 기관도 이 앱을 함께 쓸 수 있게 한다.

**Architecture:** 클라이언트 전용 정적 앱(빌드 도구 없음, 전역 함수 로드순서 의존)이므로 새 기능도 기존 패턴(전역 함수, `openSheet`/`closeSheet` 모달, `db.ref().update()` 이중 기록)을 그대로 따른다. 새 권한 축은 `users/{uid}/superAdmin` 불리언 하나뿐이고, 신규 기관의 "첫 관리자 문제"는 `registerMember()`에서 해당 기관의 `orgMembers`가 비어 있으면 자동으로 관리자+승인 상태로 등록해 해결한다.

**Tech Stack:** Vanilla JS (ES2017+), Firebase Realtime Database + Auth (compat SDK), Konva.js(가계도 캔버스, 이번 작업과 무관). 빌드 도구 없음 — `python3 -m http.server 5500`로 로컬 실행.

## Global Constraints

- 이 저장소엔 자동화 테스트가 전혀 없다(스펙/README 확인됨). 각 태스크의 "테스트" 단계는 로컬 서버(`python3 -m http.server 5500`)로 브라우저에서 직접 조작해 확인하고, Firebase Realtime Database 콘솔에서 실제 기록된 값을 확인하는 수동 검증이다. 자동화 테스트 프레임워크를 새로 들여오지 않는다(기존 패턴 유지, YAGNI).
- 역할/권한 관련 필드는 기존 코드의 이중 기록 관례를 따른다: `users/{uid}/...`와 `orgMembers/{orgId}/{uid}/...` 양쪽에 동시에 쓴다 (`approve()`, `toggleRole()` 참고).
- 최초 슈퍼관리자 부트스트랩은 코드로 만들지 않는다. 본인이 Firebase RTDB 콘솔에서 `users/{uid}/superAdmin`을 직접 `true`로 설정한다 (이 값 하나만 있으면 기능이 동작함 — `orgMembers` 쪽 미러링은 안 해도 무방, 이후 슈퍼관리자 토글(Task 4)부터는 자동으로 양쪽에 기록됨).
- 이번 계획은 Firebase 보안 규칙(콘솔에서 관리, 레포에 없음) 변경을 포함하지 않는다. 규칙은 이 기능이 배포된 뒤 사용자와 함께 콘솔에서 별도로 조정한다 (스펙의 "Firebase 보안 규칙" 섹션 참고).
- 신규 코드는 6자리 대문자+숫자 코드 생성 방식(`ABCDEFGHJKLMNPQRSTUVWXYZ23456789`, 혼동되는 문자 I/O/0/1 제외, 충돌 시 최대 5회 재시도)을 기존 `doCreateOrg()`와 동일하게 유지한다.

## File Structure

- `js/admin.js` — 슈퍼관리자 전용 UI 로직 추가: 기관 추가(`openAddOrgSheet`, `addOrgAsSuperAdmin`), 전체 기관 목록(`loadOrgList`), 슈퍼관리자 지정/해제(`toggleSuperAdmin`). 기존 `loadAdmin()`에 노출 제어 1줄 추가.
- `index.html` — `tabAdmin` 섹션에 슈퍼관리자 전용 패널(`#superAdminPanel`, `#orgList`) 마크업 추가. 로그인 화면의 공개 "기관을 새로 등록" 폼(`#formOrg`) 및 관련 안내문구 제거.
- `js/auth.js` — `registerMember()`에 "해당 기관 최초 가입자는 자동 관리자·승인" 로직 추가. `switchAuth()`에서 `formOrg`/`'org'` 모드 참조 제거. `doCreateOrg()` 함수 제거.

각 태스크는 이 세 파일을 자기 완결적으로 건드리며, 태스크가 끝날 때마다 앱은 항상 정상 동작하는 상태다.

---

### Task 1: 관리자 모드 — 기관 추가 + 코드 발급 + 전체 기관 목록

**Files:**
- Modify: `index.html:207-208` (tabAdmin 섹션, `#adminCases` 바로 다음)
- Modify: `js/admin.js` (`loadAdmin()` 끝부분 + 새 함수 3개 추가)

**Interfaces:**
- Produces: `openAddOrgSheet()`, `addOrgAsSuperAdmin()`, `loadOrgList()` — 전역 함수. `#superAdminPanel`, `#orgList`, `#newOrgName` DOM id.
- Consumes: 기존 `$()`, `esc()`, `toast()`(utils.js), `openSheet()`/`closeSheet()`(sheet.js), `S.me.superAdmin`, `S.uid`(config.js), `db`(config.js).

- [ ] **Step 1: `index.html`에 슈퍼관리자 패널 마크업 추가**

`index.html:207` (`<div id="adminCases"></div>`) 바로 다음, `</div>`(208번째 줄, tabAdmin 패딩 wrapper 닫는 태그) 이전에 삽입:

```html
          <div id="superAdminPanel" class="hide">
            <div class="sec-head" style="padding:18px 0 10px;"><b>전체 기관 관리</b></div>
            <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.6;margin:0 0 12px;">
              슈퍼관리자만 볼 수 있습니다. 새 기관을 등록하고 가입코드를 발급합니다.
            </p>
            <button class="btn sm" onclick="openAddOrgSheet()" style="margin-bottom:12px;">+ 새 기관 추가</button>
            <div id="orgList"></div>
          </div>
```

- [ ] **Step 2: `js/admin.js`의 `loadAdmin()` 끝에 노출 제어 추가**

`loadAdmin()` 함수 안, `membersRef.on(...)` 블록이 끝나는 `}, err => toast('직원 목록을 불러오지 못했습니다.'));` 바로 다음 줄에 추가:

```js
  $('superAdminPanel').classList.toggle('hide', !S.me.superAdmin);
  if(S.me.superAdmin) loadOrgList();
```

- [ ] **Step 3: `js/admin.js`에 기관 추가 + 목록 함수 추가**

파일 끝(`copyCode()` 함수 다음)에 추가:

```js
/* ═══ 슈퍼관리자: 기관 추가/코드 발급 ═══ */
function openAddOrgSheet(){
  openSheet(`
    <h3>새 기관 추가</h3>
    <div class="sub">기관명을 입력하면 가입코드가 발급됩니다.</div>
    <div class="fld"><label>기관명</label>
      <input id="newOrgName" class="inp" placeholder="○○시정신건강복지센터"></div>
    <button class="btn" onclick="addOrgAsSuperAdmin()">기관 추가하고 코드 발급</button>
  `);
  setTimeout(()=>$('newOrgName').focus(),300);
}

async function addOrgAsSuperAdmin(){
  const orgName = $('newOrgName').value.trim();
  if(!orgName){ toast('기관명을 입력해 주세요.'); return; }
  try{
    const orgId = db.ref('orgs').push().key;
    await db.ref('orgs/'+orgId).set({ name:orgName, ownerUid:S.uid, createdAt:Date.now() });

    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = null;
    for(let i=0; i<5 && !code; i++){
      const c = Array.from({length:6},()=>A[Math.floor(Math.random()*A.length)]).join('');
      try{ await db.ref('orgCodes/'+c).set(orgId); code = c; }catch(e){}
    }
    if(!code) throw new Error('code');
    await db.ref('orgPrivate/'+orgId).set({ joinCode:code });

    openSheet(`
      <h3>기관이 추가되었습니다</h3>
      <div class="sub">${esc(orgName)}</div>
      <div class="code-box">
        <small>이 기관 담당자에게 아래 코드를 전달하세요</small>
        <b>${code}</b>
        <div style="margin-top:11px;"><button class="btn sm ghost" onclick="navigator.clipboard.writeText('${code}').then(()=>toast('코드를 복사했습니다.'))">코드 복사</button></div>
      </div>
      <button class="btn" onclick="closeSheet()" style="margin-top:14px;">확인</button>
    `);
    loadOrgList();
  }catch(e){ toast('기관 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.'); }
}

function loadOrgList(){
  db.ref('orgs').once('value').then(async snap=>{
    const orgs = snap.val() || {};
    const codesSnap = await db.ref('orgPrivate').once('value');
    const codes = codesSnap.val() || {};
    const list = Object.entries(orgs).sort((a,b)=>(b[1].createdAt||0)-(a[1].createdAt||0));
    $('orgList').innerHTML = list.length ? list.map(([id,o])=>`
      <div class="usr">
        <div class="ub"><b>${esc(o.name)}</b><small>${o.createdAt ? new Date(o.createdAt).toLocaleDateString('ko-KR') : '—'}</small></div>
        <span class="badge">${esc((codes[id]||{}).joinCode || '——————')}</span>
        <button class="btn sm ghost" onclick="navigator.clipboard.writeText('${esc((codes[id]||{}).joinCode||'')}').then(()=>toast('코드를 복사했습니다.'))">복사</button>
      </div>`).join('')
      : `<p style="font-size:13px;color:var(--muted);padding:6px 2px;">등록된 기관이 없습니다.</p>`;
  }).catch(()=> toast('기관 목록을 불러오지 못했습니다.'));
}
```

- [ ] **Step 4: 수동 확인**

1. `python3 -m http.server 5500`로 로컬 서버 실행, `http://localhost:5500` 접속.
2. 기존 관리자 계정으로 로그인 (아직 `superAdmin` 필드 없음). "기관 관리" 탭에 들어가도 "전체 기관 관리" 섹션이 **보이지 않아야** 한다.
3. Firebase RTDB 콘솔에서 그 계정의 `users/{uid}/superAdmin`을 `true`로 설정.
4. 앱을 새로고침하고 다시 "기관 관리" 탭 진입 → "전체 기관 관리" 섹션이 보여야 한다.
5. "+ 새 기관 추가" 클릭 → 기관명(예: "테스트기관") 입력 → 제출 → 6자리 코드가 표시되고 "코드 복사" 버튼이 동작해야 한다.
6. Firebase 콘솔에서 `orgs/{새orgId}`, `orgCodes/{코드}`, `orgPrivate/{새orgId}/joinCode`가 정확히 기록됐는지 확인.
7. "확인" 클릭해 시트를 닫고, "전체 기관 목록"에 방금 만든 기관이 이름+코드와 함께 나타나는지 확인.

- [ ] **Step 5: Commit**

```bash
git add index.html js/admin.js
git commit -m "$(cat <<'EOF'
feat: let super-admins add orgs and issue join codes from admin panel

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Nvz8GVy1ZoQCSNe5ZetFr
EOF
)"
```

---

### Task 2: 신규 기관의 첫 가입자를 자동으로 관리자·승인 처리

**Files:**
- Modify: `js/auth.js:27-44` (`registerMember()`)

**Interfaces:**
- Consumes: `db`(config.js), `setMsg()`(utils.js). 함수 시그니처(`registerMember(user, name, code)`)와 반환값(boolean)은 변경하지 않는다 — `doSignup()`/`doResume()`이 그대로 호출한다.
- Produces: 동작 변경만 있고 새 함수는 없다.

- [ ] **Step 1: `registerMember()` 수정**

`js/auth.js:27-44`의 기존 함수를 다음으로 교체:

```js
/* 코드 → 기관 확인 후 users + orgMembers 이중 기록. 그 기관의 첫 가입자는 자동으로 관리자·승인 처리 */
async function registerMember(user, name, code){
  let orgId = null;
  try{ const s = await db.ref('orgCodes/'+code).once('value'); orgId = s.val(); }catch(e){}
  if(!orgId){
    setMsg('가입코드와 일치하는 기관이 없습니다. 코드를 다시 확인해 주세요.');
    try{ await user.delete(); }catch(e){ await auth.signOut(); }   // 유령 계정 방지 (수정 #6 계열)
    return false;
  }
  let isFirstMember = false;
  try{
    const membersSnap = await db.ref('orgMembers/'+orgId).once('value');
    isFirstMember = !membersSnap.exists();
  }catch(e){}
  const role = isFirstMember ? 'admin' : 'member';
  const approved = isFirstMember;
  const rec = { name, email:user.email, orgId, role, approved, createdAt:Date.now() };
  try{
    await db.ref('users/'+user.uid).set(rec);
    await db.ref('orgMembers/'+orgId+'/'+user.uid).set({
      name, email:user.email, role, approved, createdAt:rec.createdAt
    });
  }catch(e){ setMsg('가입 처리 중 문제가 발생했습니다. 아래 "가입 마무리"로 다시 시도해 주세요.'); return false; }
  return true;
}
```

- [ ] **Step 2: 수동 확인 — 첫 가입자는 자동 관리자**

1. Task 1에서 만든 "테스트기관" 코드를 준비.
2. 로그아웃 상태에서 "가입하기" 탭 → 이름/해당 코드/새 이메일/비밀번호 입력 → 가입 신청.
3. 가입 즉시 "승인 대기" 화면 없이 바로 앱(케이스 목록)으로 진입해야 한다.
4. Firebase 콘솔에서 `users/{새uid}`와 `orgMembers/{orgId}/{새uid}` 둘 다 `role:'admin', approved:true`인지 확인.
5. "기관 관리" 탭이 보이고 들어가지는지 확인 (관리자이므로).

- [ ] **Step 3: 수동 확인 — 두 번째 가입자는 기존처럼 대기**

1. 같은 코드로 다른 이메일로 한 번 더 가입.
2. 이번엔 "승인을 기다리는 중입니다" 화면으로 가야 한다.
3. Firebase 콘솔에서 해당 계정이 `role:'member', approved:false`인지 확인.
4. 방금 1번 계정(그 기관의 관리자)으로 로그인해 "기관 관리" 탭에서 승인 처리가 정상 동작하는지 확인.

- [ ] **Step 4: Commit**

```bash
git add js/auth.js
git commit -m "$(cat <<'EOF'
fix: auto-approve first member of a new org as its admin

Without this, a super-admin-created org had a join code but no way for
anyone to become its first admin, since approval requires an existing
admin.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Nvz8GVy1ZoQCSNe5ZetFr
EOF
)"
```

---

### Task 3: 로그인 화면의 공개 "기관을 새로 등록" 제거

**Files:**
- Modify: `index.html:55` (안내 문구), `index.html:66-80` (`#formOrg` 블록 삭제)
- Modify: `js/auth.js:8`, `js/auth.js:14` (`switchAuth()`), `js/auth.js:76-114` (`doCreateOrg()` 삭제)

**Interfaces:**
- Consumes: 없음 (순수 삭제/정리).
- Produces: 없음 — `doCreateOrg`, `formOrg`, `switchAuth('org')` 경로를 앱 전체에서 제거한다 (Task 1 완료로 대체 기능이 이미 존재하므로 안전).

- [ ] **Step 1: `index.html:55`의 안내 문구 교체**

기존:
```html
        <div style="font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.5;">
          코드가 없다면 <a onclick="switchAuth('org')" style="color:var(--sage-deep);font-weight:600;cursor:pointer;">기관을 새로 등록</a>하세요.
        </div>
```
교체:
```html
        <div style="font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.5;">
          코드가 없다면 소속 기관 관리자에게 문의해 주세요.
        </div>
```

- [ ] **Step 2: `index.html:66-80`의 `#formOrg` 블록 삭제**

아래 블록 전체를 삭제 (바로 다음에 오는 `<!-- 가입이 중간에 끊긴 계정의 마무리 -->` 주석과 `#formResume` 블록은 그대로 둔다):

```html
    <div id="formOrg" class="hide">
      <div class="fld"><label>기관명</label>
        <input id="orgName" class="inp" placeholder="○○시정신건강복지센터"></div>
      <div class="fld"><label>관리자 이름</label>
        <input id="orgAdmin" class="inp" placeholder="홍길동"></div>
      <div class="fld"><label>이메일</label>
        <input id="orgEmail" class="inp" type="email" placeholder="name@center.or.kr"></div>
      <div class="fld"><label>비밀번호 (6자 이상)</label>
        <input id="orgPw" class="inp" type="password" placeholder="비밀번호"></div>
      <button class="btn" id="btnOrg" onclick="doCreateOrg()">기관 등록하고 시작하기</button>
      <div class="foot-note">
        등록하면 관리자 권한을 받고, 소속 직원에게 나눠줄 <b>가입코드</b>가 발급됩니다.<br>
        <a onclick="switchAuth('signup')">코드로 가입하기</a>
      </div>
    </div>
```

- [ ] **Step 3: `js/auth.js`의 `switchAuth()`에서 `formOrg` 참조 제거**

`js/auth.js:6-16`의 `switchAuth()`를 다음으로 교체:

```js
function switchAuth(mode){
  setMsg('');
  ['formLogin','formSignup','formResume'].forEach(f=>$(f).classList.add('hide'));
  $('authTabs').classList.toggle('hide', mode==='resume');
  $('tabLogin').classList.toggle('on', mode==='login');
  $('tabSignup').classList.toggle('on', mode!=='login');
  if(mode==='login') $('formLogin').classList.remove('hide');
  else if(mode==='signup') $('formSignup').classList.remove('hide');
  else $('formResume').classList.remove('hide');
}
```

- [ ] **Step 4: `js/auth.js`의 `doCreateOrg()` 함수 삭제**

`js/auth.js:76-114`의 `doCreateOrg()` 함수 전체(주석 없이 함수 선언부터 마지막 닫는 `}`까지)를 삭제한다.

- [ ] **Step 5: 수동 확인**

1. 로컬 서버로 앱을 열고 "가입하기" 탭 진입 → "기관을 새로 등록" 링크가 더 이상 보이지 않고, 대신 "코드가 없다면 소속 기관 관리자에게 문의해 주세요." 문구가 보여야 한다.
2. 브라우저 개발자 콘솔에 에러가 없는지 확인 (특히 `formOrg` 관련 `null` 참조 에러).
3. 로그인 / 가입(코드로) / 가입 마무리(`가입이 중간에 끊긴 계정`) 흐름이 이전과 동일하게 동작하는지 각각 한 번씩 확인.
4. Task 1에서 만든 슈퍼관리자 → "기관 관리" 탭의 "새 기관 추가"는 여전히 정상 동작하는지 확인 (공개 폼 제거와 무관하게 살아있어야 함).

- [ ] **Step 6: Commit**

```bash
git add index.html js/auth.js
git commit -m "$(cat <<'EOF'
refactor: remove public self-serve org registration

Org creation now happens only through the super-admin panel (see
previous commit); anyone being able to self-register a new org no
longer fits a multi-org deployment.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Nvz8GVy1ZoQCSNe5ZetFr
EOF
)"
```

---

### Task 4: 소속 기관 관리자를 슈퍼관리자로 지정/해제

**Files:**
- Modify: `js/admin.js` (`loadAdmin()`의 `memList` 렌더링, 새 함수 `toggleSuperAdmin`)

**Interfaces:**
- Consumes: `S.me.superAdmin`, `S.me.orgId`, `S.uid`(config.js), `db`, `esc()`, `toast()`(utils.js).
- Produces: `toggleSuperAdmin(u, cur)` 전역 함수.

- [ ] **Step 1: `memList` 렌더링에 슈퍼관리자 배지 + 토글 버튼 추가**

`js/admin.js`의 `loadAdmin()` 안, 기존 `$('memList').innerHTML = mem.map(...)` 블록을 다음으로 교체:

```js
    $('memList').innerHTML = mem.map(([u,r])=>`
      <div class="usr">
        <div class="avatar">${esc((r.name||'?').slice(0,1))}</div>
        <div class="ub"><b>${esc(r.name)}</b><small>${esc(r.email)}</small></div>
        <span class="badge">${r.role==='admin'?'관리자':'직원'}${r.superAdmin?' · 슈퍼':''}</span>
        ${u!==S.uid ? `<button class="btn sm ghost" onclick="toggleRole('${u}','${r.role}')">
          ${r.role==='admin'?'직원으로':'관리자로'}</button>` : ''}
        ${(S.me.superAdmin && u!==S.uid && r.role==='admin') ? `<button class="btn sm ghost" onclick="toggleSuperAdmin('${u}','${!!r.superAdmin}')">
          ${r.superAdmin?'슈퍼관리자 해제':'슈퍼관리자로'}</button>` : ''}
      </div>`).join('');
```

(이 버튼은 슈퍼관리자 본인이 보고 있을 때만, 그리고 대상이 이미 그 기관의 '관리자'일 때만 보인다 — 일반 직원을 바로 슈퍼관리자로 만들 수는 없다.)

- [ ] **Step 2: `toggleSuperAdmin()` 함수 추가**

`js/admin.js`의 `toggleRole()` 함수 바로 다음에 추가:

```js
async function toggleSuperAdmin(u, cur){
  const next = cur !== 'true';
  if(!confirm(next ? '이 관리자에게 슈퍼관리자 권한을 줄까요? 기관을 추가하고 코드를 발급할 수 있게 됩니다.' : '슈퍼관리자 권한을 해제할까요?')) return;
  try{
    await db.ref().update({
      ['users/'+u+'/superAdmin']: next,
      ['orgMembers/'+S.me.orgId+'/'+u+'/superAdmin']: next
    });
    toast(next ? '슈퍼관리자로 지정했습니다.' : '슈퍼관리자를 해제했습니다.');
  }catch(e){ toast('처리에 실패했습니다.'); }
}
```

- [ ] **Step 3: 수동 확인**

1. 슈퍼관리자 계정으로 로그인, "기관 관리" 탭 → "소속 직원" 목록에서 자기 자신이 아닌 다른 '관리자' 배지가 붙은 멤버를 찾는다 (없으면 미리 다른 계정을 관리자로 승격해 둔다 — `toggleRole` 사용).
   - 그 멤버 항목에 "슈퍼관리자로" 버튼이 보여야 한다.
   - '직원' 배지가 붙은 멤버에는 이 버튼이 보이지 않아야 한다.
2. "슈퍼관리자로" 클릭 → 확인창 승인 → 배지가 "관리자 · 슈퍼"로 바뀌고, 버튼 텍스트가 "슈퍼관리자 해제"로 바뀌어야 한다.
3. Firebase 콘솔에서 `users/{u}/superAdmin`과 `orgMembers/{orgId}/{u}/superAdmin`이 둘 다 `true`인지 확인.
4. 그 계정으로 직접 로그인해 "기관 관리" 탭에 "전체 기관 관리" 섹션이 보이는지 확인 (Task 1 기능이 이 사람에게도 열려야 함).
5. 다시 "슈퍼관리자 해제" 클릭 → 배지/버튼이 원래대로 돌아오고 DB 값도 `false`로 바뀌는지 확인.

- [ ] **Step 4: Commit**

```bash
git add js/admin.js
git commit -m "$(cat <<'EOF'
feat: let super-admins promote/demote other org admins to super-admin

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Nvz8GVy1ZoQCSNe5ZetFr
EOF
)"
```
