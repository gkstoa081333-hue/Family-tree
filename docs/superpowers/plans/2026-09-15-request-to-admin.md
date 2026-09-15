# "관리자에게 요청" 탭 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 로그인한 모든 사용자가 기능개선/질문을 제출할 수 있고, 슈퍼관리자가 전체 요청을 모아 보고 텍스트로 답변할 수 있는 새 탭 "관리자에게 요청"을 추가한다.

**Architecture:** 기존 앱과 동일한 패턴(전역 함수, `openSheet`/`closeSheet` 모달, `.on('value')` 실시간 리스너, `db.ref(...).set()/.update()`)을 그대로 따르는 새 파일 `js/requests.js` 하나로 기능을 구현한다. 데이터는 `requests/{uid}/{requestId}`로 제출자별 네임스페이스를 둬서, "본인 요청만 읽기"를 Firebase 규칙으로 표현하기 쉽게 한다 (기존 `orgMembers/{orgId}/{uid}` 네임스페이스 관례와 동일).

**Tech Stack:** Vanilla JS, Firebase Realtime Database. 빌드 도구·테스트 프레임워크 없음 — `python3 -m http.server 5500`로 로컬 실행, 브라우저에서 수동 확인.

## Global Constraints

- 이 저장소엔 자동화 테스트가 없다. 각 태스크의 "테스트"는 로컬 서버로 브라우저에서 직접 조작해 확인하고, Firebase Realtime Database 콘솔에서 실제 기록된 값을 확인하는 수동 검증이다.
- 새 탭은 `기관 관리`와 달리 **모든 승인된 사용자에게 항상 노출**한다 (역할/슈퍼관리자 여부로 숨기지 않음). 슈퍼관리자 전용 섹션(`#superAdminRequestPanel`)만 `S.me.superAdmin` 여부로 숨긴다 (기존 `#superAdminPanel` 패턴과 동일).
- 기존 코드 재사용: 모달은 `openSheet()`/`closeSheet()`(js/sheet.js), 유형 선택은 `segBind()`/`segVal()`(js/cases.js, `newCase()`가 이미 쓰는 함수), 이스케이프는 `esc()`, 알림은 `toast()`(js/utils.js). 배지 스타일은 기존 `.badge`/`.badge.wait` CSS 클래스, 답변 박스 배경은 `var(--sage-bg)`(css/styles.css:6에 이미 정의됨) — 새 CSS 클래스나 변수를 추가하지 않는다.
- Firebase 보안 규칙(콘솔에서 관리, 레포에 없음) 변경은 이 계획에 포함하지 않는다 — 스펙의 "Firebase 보안 규칙" 섹션대로 별도 진행한다.

## File Structure

- `js/requests.js` (신규) — 이 기능의 모든 로직: 제출 시트, 목록 렌더링(본인/전체), 답변 저장.
- `index.html` — 사이드바(`aside nav`)·탭바(`.tabbar`)에 새 버튼, `#tabRequests` 탭 컨테이너 마크업(슈퍼관리자 전용 섹션 포함) 추가, `js/requests.js` 스크립트 태그 추가(`admin.js` 다음, `main.js` 이전 — 로드순서 관례 유지).
- `js/cases.js` — `goTab()`의 배열들에 `requests` 탭 추가. `enterApp()`에서 `loadRequests()` 항상 호출(관리자 조건 없이).

---

### Task 1: 요청 제출 + "내가 보낸 요청" 목록

**Files:**
- Create: `js/requests.js`
- Modify: `index.html:127-134` (사이드바 nav), `index.html:201-203`(새 `#tabRequests` 탭 삽입), `index.html:230-234`(탭바 버튼), `index.html:345-346`(스크립트 태그)
- Modify: `js/cases.js:149-155`(`goTab()`), `js/cases.js:24-33`(`enterApp()`)

**Interfaces:**
- Produces: `loadRequests()`, `openNewRequestSheet()`, `submitRequest()`, `renderMyRequests(data)` — 전역 함수. `#tabRequests`, `#myRequestList`, `#myReqCount`, `#superAdminRequestPanel`(마크업만, 이 태스크에서는 항상 숨김 상태 유지), `#allRequestList`, `#allReqCount` DOM id(뒤의 세 개는 Task 2가 채움).
- Consumes: `openSheet()`/`closeSheet()`(js/sheet.js), `segBind()`/`segVal()`(js/cases.js), `$()`/`esc()`/`toast()`(js/utils.js), `S.uid`/`S.me`/`S.org`(js/config.js), `db`(js/config.js), `goTab()`(js/cases.js, 이 태스크에서 수정).

- [ ] **Step 1: `index.html`에 사이드바 nav 버튼 추가**

`index.html:127-130`(`#sideAdmin` 버튼) 바로 다음, `index.html:131`(`#sideMe` 버튼) 이전에 삽입:

```html
      <button id="sideRequests" onclick="goTab('requests')">
        <svg width="19" height="19" viewBox="0 0 22 22"><path d="M4 4h14v10H8l-4 4V4z" fill="none" stroke="#5B6E67" stroke-width="1.7" stroke-linejoin="round"/><line x1="7" y1="8" x2="15" y2="8" stroke="#5B6E67" stroke-width="1.7"/><line x1="7" y1="11" x2="13" y2="11" stroke="#5B6E67" stroke-width="1.7"/></svg>
        관리자에게 요청
      </button>
```

- [ ] **Step 2: `index.html`에 `#tabRequests` 탭 컨테이너 추가**

`index.html:201`(`#tabAdmin`의 닫는 `</div>`) 바로 다음, `index.html:203`(`<div id="tabMe" class="hide">`) 이전에 삽입:

```html
      <div id="tabRequests" class="hide">
        <div class="hdr">
          <div class="hi">문의</div>
          <div class="row"><h2>관리자에게 요청</h2></div>
        </div>
        <div style="padding:14px 20px 90px;">
          <button class="btn sm" onclick="openNewRequestSheet()" style="margin-bottom:16px;">+ 새 요청</button>

          <div class="sec-head" style="padding:6px 0 10px;"><b>내가 보낸 요청</b><span id="myReqCount"></span></div>
          <div id="myRequestList"></div>

          <div id="superAdminRequestPanel" class="hide">
            <div class="sec-head" style="padding:18px 0 10px;"><b>받은 요청 관리</b><span id="allReqCount"></span></div>
            <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.6;margin:0 0 12px;">
              슈퍼관리자만 볼 수 있습니다. 모든 기관의 요청을 모아 보여줍니다.
            </p>
            <div id="allRequestList"></div>
          </div>
        </div>
      </div>
```

- [ ] **Step 3: `index.html`에 탭바(모바일) 버튼 추가**

`index.html:230-233`(`#tabBtnAdmin` 버튼) 바로 다음, `index.html:234`(`#tabBtnMe` 버튼) 이전에 삽입:

```html
      <button id="tabBtnRequests" onclick="goTab('requests')">
        <svg width="22" height="22" viewBox="0 0 22 22"><path d="M4 4h14v10H8l-4 4V4z" fill="none" stroke="#9aaaa4" stroke-width="1.7" stroke-linejoin="round"/><line x1="7" y1="8" x2="15" y2="8" stroke="#9aaaa4" stroke-width="1.7"/><line x1="7" y1="11" x2="13" y2="11" stroke="#9aaaa4" stroke-width="1.7"/></svg>
        요청
      </button>
```

- [ ] **Step 4: `index.html`에 스크립트 태그 추가**

`index.html:345`(`<script src="js/admin.js"></script>`) 바로 다음, `index.html:346`(`<script src="js/main.js"></script>`) 이전에 삽입:

```html
<script src="js/requests.js"></script>
```

- [ ] **Step 5: `js/cases.js`의 `goTab()` 수정**

`js/cases.js:147-155`의 기존 함수를 다음으로 교체:

```js
function goTab(t){
  S.tab = t;
  ['tabCases','tabAdmin','tabMe','tabRequests'].forEach(v=>$(v).classList.add('hide'));
  $('tab'+t[0].toUpperCase()+t.slice(1)).classList.remove('hide');
  [['cases','tabBtnCases','sideCases'],['admin','tabBtnAdmin','sideAdmin'],['me','tabBtnMe','sideMe'],['requests','tabBtnRequests','sideRequests']]
    .forEach(([k,b,s])=>{ $(b).classList.toggle('on', k===t); $(s).classList.toggle('on', k===t); });
  updateNewBtn();
  $('mainScroll').scrollTop = 0;
}
```

(`t[0].toUpperCase()+t.slice(1)` 로 `'requests'` → `'Requests'`가 되어 `#tabRequests`를 정확히 찾으므로, 이 함수의 첫 두 줄은 새 탭 이름에 대해 별도 분기 없이 그대로 동작한다.)

- [ ] **Step 6: `js/cases.js`의 `enterApp()`에 `loadRequests()` 호출 추가**

`js/cases.js:24-33`의 기존 함수를 다음으로 교체:

```js
  const isAdmin = S.me.role==='admin';
  $('meRole').textContent = isAdmin ? '관리자' : '직원';
  $('sideAdmin').classList.toggle('hide', !isAdmin);
  $('tabBtnAdmin').classList.toggle('hide', !isAdmin);
  if(isAdmin) loadAdmin();
  loadRequests();

  show('app');
  goTab(S.tab==='admin' && !isAdmin ? 'cases' : S.tab);
  watchCases();
  updateNewBtn();
}
```

(`loadRequests()` 한 줄만 `if(isAdmin) loadAdmin();` 다음에 추가하는 것 — 다른 줄은 그대로.)

- [ ] **Step 7: `js/requests.js` 생성**

```js
/* ============================================================
   requests.js — [기능] 관리자에게 요청
   기능개선/질문 제출, 내 요청 목록, (슈퍼관리자) 전체 요청 + 답변
   ============================================================ */

let requestsRef = null;

function loadRequests(){
  if(requestsRef) requestsRef.off();
  requestsRef = db.ref('requests/'+S.uid);
  requestsRef.on('value', snap=> renderMyRequests(snap.val()),
    err => toast('요청 목록을 불러오지 못했습니다.'));
}

function renderMyRequests(data){
  const list = Object.values(data||{}).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $('myReqCount').textContent = list.length ? `${list.length}건` : '';
  $('myRequestList').innerHTML = list.length ? list.map(r=>`
    <div class="usr" style="align-items:flex-start;flex-wrap:wrap;">
      <div class="ub" style="flex:1 1 100%;">
        <b>${r.type==='feature'?'💡':'❓'} ${esc(r.title)}</b>
        <small style="display:block;white-space:pre-wrap;margin-top:4px;">${esc(r.content)}</small>
      </div>
      <span class="badge ${r.status==='answered'?'':'wait'}">${r.status==='answered'?'답변완료':'답변대기'}</span>
      ${r.status==='answered' ? `<div style="flex:1 1 100%;margin-top:8px;padding:10px 12px;background:var(--sage-bg);border-radius:8px;font-size:12.5px;color:var(--ink-soft);white-space:pre-wrap;">${esc(r.reply)}</div>` : ''}
    </div>`).join('')
    : `<p style="font-size:13px;color:var(--muted);padding:6px 2px;">보낸 요청이 없습니다.</p>`;
}

function openNewRequestSheet(){
  openSheet(`
    <h3>새 요청</h3>
    <div class="sub">기능개선 아이디어나 사용법 질문을 슈퍼관리자에게 보냅니다.</div>
    <div class="fld"><label>유형</label>
      <div class="seg" id="reqType">
        <button class="on" data-v="feature">💡 기능개선</button>
        <button data-v="question">❓ 질문</button>
      </div>
    </div>
    <div class="fld"><label>제목</label>
      <input id="reqTitle" class="inp" placeholder="예) 케이스 검색에 사례번호도 포함해주세요"></div>
    <div class="fld"><label>내용</label>
      <textarea id="reqContent" class="inp" rows="5" placeholder="자세히 적어주시면 도움이 됩니다"></textarea></div>
    <button class="btn" onclick="submitRequest()">보내기</button>
  `);
  segBind('reqType');
  setTimeout(()=>{ const el=$('reqTitle'); if(el) el.focus(); }, 60);
}

async function submitRequest(){
  const title = $('reqTitle').value.trim();
  const content = $('reqContent').value.trim();
  if(!title || !content){ toast('제목과 내용을 모두 입력해 주세요.'); return; }
  const id = db.ref('requests/'+S.uid).push().key;
  const rec = {
    id, uid:S.uid, name:S.me.name, email:S.me.email, orgId:S.me.orgId, orgName:S.org.name,
    type: segVal('reqType'), title, content, status:'pending', createdAt:Date.now()
  };
  try{
    await db.ref('requests/'+S.uid+'/'+id).set(rec);
  }catch(e){ toast('요청 전송에 실패했습니다.'); return; }
  closeSheet();
  toast('요청을 보냈습니다.');
}
```

- [ ] **Step 8: 수동 확인**

1. `python3 -m http.server 5500`로 로컬 서버 실행, 로그인.
2. 사이드바(데스크톱)와 하단 탭바(모바일 너비)에 "관리자에게 요청" / "요청" 버튼이 보이고, 클릭하면 새 탭으로 이동하는지 확인 (일반 직원 계정으로도 보여야 함 — `기관 관리`와 달리 숨겨지지 않음).
3. "+ 새 요청" 클릭 → 유형(기능개선/질문) 선택, 제목/내용 입력 → "보내기" → 시트가 닫히고 토스트가 뜨는지 확인.
4. "내가 보낸 요청" 목록에 방금 만든 항목이 "답변대기" 배지와 함께 바로 나타나는지 확인 (실시간 리스너).
5. Firebase 콘솔에서 `requests/{내 uid}/{새 requestId}`에 `uid, name, email, orgId, orgName, type, title, content, status:'pending', createdAt`이 정확히 기록됐는지 확인.
6. 제목이나 내용을 비운 채 "보내기"를 누르면 토스트로 막히는지 확인.

- [ ] **Step 9: Commit**

```bash
git add index.html js/cases.js js/requests.js
git commit -m "$(cat <<'EOF'
feat: add "관리자에게 요청" tab for submitting feature/question requests

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Nvz8GVy1ZoQCSNe5ZetFr
EOF
)"
```

---

### Task 2: 슈퍼관리자 — 전체 요청 조회 + 답변

**Files:**
- Modify: `js/requests.js` (`loadRequests()` 확장, 새 함수 2개 추가)

**Interfaces:**
- Consumes: `S.me.superAdmin`(js/config.js), `db`, `$()`/`esc()`/`toast()`(js/utils.js). Task 1이 만든 `#superAdminRequestPanel`, `#allRequestList`, `#allReqCount` DOM id를 채운다.
- Produces: `renderAllRequests(data)`, `saveReply(ownerUid, requestId)` — 전역 함수.

- [ ] **Step 1: `loadRequests()`에 슈퍼관리자 분기 추가**

Task 1에서 만든 `loadRequests()`를 다음으로 교체 (본인 목록 구독 부분은 그대로 두고, 슈퍼관리자 전체 목록 구독을 추가):

```js
let requestsRef = null, allRequestsRef = null;

function loadRequests(){
  if(requestsRef) requestsRef.off();
  requestsRef = db.ref('requests/'+S.uid);
  requestsRef.on('value', snap=> renderMyRequests(snap.val()),
    err => toast('요청 목록을 불러오지 못했습니다.'));

  $('superAdminRequestPanel').classList.toggle('hide', !S.me.superAdmin);
  if(S.me.superAdmin){
    if(allRequestsRef) allRequestsRef.off();
    allRequestsRef = db.ref('requests');
    allRequestsRef.on('value', snap=> renderAllRequests(snap.val()),
      err => toast('전체 요청 목록을 불러오지 못했습니다.'));
  }
}
```

(파일 맨 위 `let requestsRef = null;` 한 줄을 `let requestsRef = null, allRequestsRef = null;`로 바꾸고, 함수 본문에 슈퍼관리자 분기 4줄을 추가하는 것 — `renderMyRequests` 구독 부분은 손대지 않는다.)

- [ ] **Step 2: `renderAllRequests()`와 `saveReply()` 추가**

`js/requests.js` 끝(`submitRequest()` 함수 다음)에 추가:

```js
function renderAllRequests(data){
  const list = [];
  Object.values(data||{}).forEach(userReqs=>{
    Object.values(userReqs||{}).forEach(r=> list.push(r));
  });
  list.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  $('allReqCount').textContent = list.length ? `${list.length}건` : '';
  $('allRequestList').innerHTML = list.length ? list.map(r=>`
    <div class="usr" style="align-items:flex-start;flex-wrap:wrap;">
      <div class="ub" style="flex:1 1 100%;">
        <b>${r.type==='feature'?'💡':'❓'} ${esc(r.title)}</b>
        <small style="display:block;margin-top:2px;">${esc(r.name||'')} · ${esc(r.orgName||'')}</small>
        <small style="display:block;white-space:pre-wrap;margin-top:4px;">${esc(r.content)}</small>
      </div>
      <span class="badge ${r.status==='answered'?'':'wait'}">${r.status==='answered'?'답변완료':'답변대기'}</span>
      <div style="flex:1 1 100%;margin-top:8px;">
        <textarea id="reply-${r.uid}-${r.id}" class="inp" rows="2" placeholder="답변 입력">${esc(r.reply||'')}</textarea>
        <button class="btn sm ghost" style="margin-top:6px;" onclick="saveReply('${r.uid}','${r.id}')">답변 저장</button>
      </div>
    </div>`).join('')
    : `<p style="font-size:13px;color:var(--muted);padding:6px 2px;">받은 요청이 없습니다.</p>`;
}

async function saveReply(ownerUid, requestId){
  const el = $('reply-'+ownerUid+'-'+requestId);
  const reply = el.value.trim();
  if(!reply){ toast('답변 내용을 입력해 주세요.'); return; }
  try{
    await db.ref('requests/'+ownerUid+'/'+requestId).update({ reply, repliedAt:Date.now(), status:'answered' });
    toast('답변을 저장했습니다.');
  }catch(e){ toast('저장에 실패했습니다.'); }
}
```

- [ ] **Step 3: 수동 확인**

1. 일반 직원 계정으로 Task 1처럼 요청을 하나 보내 둔다 (또는 Task 1에서 만든 테스트 요청을 재사용).
2. 슈퍼관리자 계정(`gkstoa0813@gmail.com` 또는 `gjcmhc07@hanmail.net`)으로 로그인 → "관리자에게 요청" 탭 → "받은 요청 관리" 섹션이 보이는지 확인 (일반 직원 계정으로는 안 보여야 함).
3. 방금 보낸 요청이 제출자 이름·기관명과 함께 목록에 나타나는지 확인.
4. 답변 textarea에 텍스트 입력 → "답변 저장" 클릭 → 토스트 확인, 배지가 "답변완료"로 바뀌는지 확인.
5. Firebase 콘솔에서 `requests/{제출자 uid}/{requestId}`에 `reply`, `repliedAt`, `status:'answered'`가 기록됐는지 확인.
6. 원래 제출자 계정으로 다시 로그인해 "내가 보낸 요청" 목록에서 답변 내용이 보이는지 확인.
7. (규칙이 아직 이전 버전이라면 `requests` 최상위 읽기가 막혀 3번 항목이 비어 보일 수 있다 — 이 경우 Firebase 콘솔 규칙에 `requests`용 슈퍼관리자 읽기 권한이 필요하다는 점을 결과 보고에 남긴다. 이 계획은 규칙 변경을 포함하지 않는다.)

- [ ] **Step 4: Commit**

```bash
git add js/requests.js
git commit -m "$(cat <<'EOF'
feat: let super-admins view all requests and reply to them

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_013Nvz8GVy1ZoQCSNe5ZetFr
EOF
)"
```
