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
