/* ============================================================
   cases.js — [기능] 케이스
   앱 진입, 케이스 목록·검색·생성·설정·삭제, 탭
   ============================================================ */

function isDesktop(){ return window.matchMedia('(min-width:1024px)').matches; }
function updateNewBtn(){
  const dt = isDesktop();
  $('deskNew').style.display = dt ? 'flex' : 'none';
  $('mobNew').style.display  = (!dt && S.tab==='cases' && $('app').classList.contains('on')) ? 'flex' : 'none';
}

function enterApp(){
  const initial = (S.me.name||'?').trim().slice(0,1);
  ['hdrAv','sideAv','meAv'].forEach(i=> $(i).textContent = initial);
  $('greet').textContent  = `안녕하세요, ${S.me.name} 선생님`;
  $('hdrOrg').textContent = S.org.name;
  $('sideNm').textContent = S.me.name;
  $('sideOrg').textContent= S.org.name;
  $('meNm').textContent   = S.me.name;
  $('meEmail').textContent= S.me.email;
  $('meOrg').textContent  = S.org.name;

  const isAdmin = S.me.role==='admin';
  $('meRole').textContent = isAdmin ? '관리자' : '직원';
  $('sideAdmin').classList.toggle('hide', !isAdmin);
  $('tabBtnAdmin').classList.toggle('hide', !isAdmin);
  if(isAdmin) loadAdmin();

  show('app');
  goTab(S.tab==='admin' && !isAdmin ? 'cases' : S.tab);
  watchCases();
  updateNewBtn();
}

/* 수정 #5: off() 후 on() — 리스너 중복 방지 */
function watchCases(){
  if(casesRef) casesRef.off();
  casesRef = db.ref('cases/'+S.me.orgId);
  casesRef.on('value', snap=>{
    const all = {};
    Object.entries(snap.val()||{}).forEach(([id,c])=>{ if(!c.deleted) all[id]=c; });
    S.allCases = all;
    const visible = {};
    Object.entries(all).forEach(([id,c])=>{
      const mine   = c.ownerUid === S.uid;
      const shared = c.visibility === 'org';
      const admin  = S.me.role === 'admin';
      if(mine || shared || admin) visible[id] = c;
    });
    S.cases = visible;
    renderCases();
    if(S.me.role==='admin') renderAdminCases(all);
  }, err => toast('케이스를 불러오지 못했습니다.'));
}

function renderCases(){
  const q = ($('q').value||'').trim().toLowerCase();
  let list = Object.entries(S.cases);
  if(q) list = list.filter(([id,c]) =>
    (c.title||'').toLowerCase().includes(q) || (c.caseNo||'').toLowerCase().includes(q));
  list.sort((a,b)=> (b[1].updatedAt||0) - (a[1].updatedAt||0));

  const weekAgo = Date.now() - 7*864e5;
  $('stTotal').textContent = Object.keys(S.cases).length;
  $('stWeek').textContent  = Object.values(S.cases).filter(c=>(c.updatedAt||0)>weekAgo).length;
  $('caseCount').textContent = list.length ? `${list.length}건` : '';

  const el = $('caseList');
  if(!list.length){
    el.innerHTML = `<div class="empty">
      <svg width="46" height="42" viewBox="0 0 46 42"><rect x="4" y="3" width="14" height="14" fill="none" stroke="#5B6E67" stroke-width="2"/><circle cx="35" cy="10" r="7" fill="none" stroke="#5B6E67" stroke-width="2"/><line x1="18" y1="10" x2="28" y2="10" stroke="#5B6E67" stroke-width="2"/><path d="M23 10v14h-6" fill="none" stroke="#5B6E67" stroke-width="2"/><rect x="10" y="25" width="14" height="14" fill="none" stroke="#5B6E67" stroke-width="2"/></svg>
      <b>${q ? '검색 결과가 없습니다' : '첫 케이스를 만들어 보세요'}</b>
      <p>${q ? '다른 이름이나 사례번호로 찾아보세요.' : '가족 구조를 그리고, 상태를 코딩해 기록으로 남깁니다.'}</p>
    </div>`;
    return;
  }
  el.innerHTML = list.map(([id,c])=>{
    const mine = c.ownerUid===S.uid;
    const canDel = mine || S.me.role==='admin';
    return `<div class="case" onclick="openCanvas('${id}')">
      <div class="thumb">${miniGeno(c)}</div>
      <div class="case-body">
        <div class="nm">${esc(c.title||'제목 없음')}${riskDot(c)}</div>
        <div class="mt">${c.gen||1}세대 · ${c.count||0}명${c.caseNo?' · '+esc(c.caseNo):''}</div>
        <div class="chips">
          <span class="chip ${c.visibility==='org'?'shared':'priv'}">${c.visibility==='org'?'기관 공유':'비공개'}</span>
          ${!mine ? `<span class="chip">${esc(c.ownerName||'')}</span>` : ''}
          ${riskChips(c)}
        </div>
      </div>
      <div class="case-time">${timeAgo(c.updatedAt)}</div>
      ${canDel ? `<button class="case-del" onclick="event.stopPropagation();quickDeleteCase('${id}','${esc(c.title||'')}')" title="삭제">✕</button>` : ''}
    </div>`;
  }).join('');
}

function quickDeleteCase(id, title){
  if(!confirm(`"${title}" 케이스를 삭제할까요?\n가계도 기록도 함께 사라지며 복구할 수 없습니다.`)) return;
  db.ref(casePath(id)).update({ deleted:true, updatedAt:Date.now() })
    .then(()=> toast('삭제했습니다.'))
    .catch(()=> toast('삭제에 실패했습니다.'));
}

function riskChips(c){
  const s = c.riskSummary || {};
  let out = '';
  if(s.addict) out += `<span class="chip addict">중독 ${s.addict}</span>`;
  if(s.mental) out += `<span class="chip mental">우울·정신 ${s.mental}</span>`;
  return out;
}
function riskDot(c){
  const s = c.riskSummary || {};
  if(s.addict) return `<span style="width:8px;height:8px;border-radius:50%;background:var(--st-addict);flex:0 0 8px;"></span>`;
  if(s.mental) return `<span style="width:8px;height:8px;border-radius:50%;background:var(--st-mental);flex:0 0 8px;"></span>`;
  return '';
}

function miniGeno(c){
  const t = c.thumb;
  if(!t || !t.n || !t.n.length){
    return `<svg width="46" height="42" viewBox="0 0 46 42"><rect x="6" y="8" width="10" height="10" fill="none" stroke="#A9CFC3" stroke-width="1.6"/><circle cx="34" cy="13" r="5" fill="none" stroke="#A9CFC3" stroke-width="1.6"/><line x1="16" y1="13" x2="29" y2="13" stroke="#A9CFC3" stroke-width="1.6"/><path d="M22 13v10h-4" fill="none" stroke="#A9CFC3" stroke-width="1.6"/><rect x="13" y="24" width="10" height="10" fill="none" stroke="#A9CFC3" stroke-width="1.6"/></svg>`;
  }
  const xs=t.n.map(p=>p.x), ys=t.n.map(p=>p.y);
  const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys);
  const w=Math.max(maxX-minX,1), h=Math.max(maxY-minY,1);
  const k=Math.min(40/w, 34/h), ox=(56-w*k)/2-minX*k, oy=(50-h*k)/2-minY*k;
  const P = p => [p.x*k+ox, p.y*k+oy];
  let svg = `<svg width="56" height="50" viewBox="0 0 56 50">`;
  (t.l||[]).forEach(l=>{
    const a=t.n.find(p=>p.i===l.a), b=t.n.find(p=>p.i===l.b);
    if(!a||!b) return;
    const [x1,y1]=P(a), [x2,y2]=P(b);
    if(l.k==='child') svg += `<path d="M${x1} ${y1} V${(y1+y2)/2} H${x2} V${y2}" fill="none" stroke="#4C7A6D" stroke-width="1.1"/>`;
    else svg += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="#4C7A6D" stroke-width="1.1"/>`;
  });
  t.n.forEach(p=>{
    const [x,y]=P(p), c=p.c||'#4C7A6D', sw=p.ip?2:1.3;
    if(p.g==='female') svg += `<circle cx="${x}" cy="${y}" r="4" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
    else if(p.g==='unknown') svg += `<path d="M${x} ${y-4.5} L${x+4.5} ${y} L${x} ${y+4.5} L${x-4.5} ${y} Z" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
    else svg += `<rect x="${x-4}" y="${y-4}" width="8" height="8" fill="none" stroke="${c}" stroke-width="${sw}"/>`;
    if(p.ip) svg += `<rect x="${x-6.2}" y="${y-6.2}" width="12.4" height="12.4" fill="none" stroke="${c}" stroke-width="0.7"/>`;
  });
  return svg + `</svg>`;
}

function goTab(t){
  S.tab = t;
  ['tabCases','tabAdmin','tabMe'].forEach(v=>$(v).classList.add('hide'));
  $('tab'+t[0].toUpperCase()+t.slice(1)).classList.remove('hide');
  [['cases','tabBtnCases','sideCases'],['admin','tabBtnAdmin','sideAdmin'],['me','tabBtnMe','sideMe']]
    .forEach(([k,b,s])=>{ $(b).classList.toggle('on', k===t); $(s).classList.toggle('on', k===t); });
  updateNewBtn();
  $('mainScroll').scrollTop = 0;
}

/* ═══ 케이스 생성·설정 (경로: cases/{orgId}/{caseId}) ═══ */
function casePath(id){ return 'cases/'+S.me.orgId+'/'+id; }
function genoPath(){ return 'genograms/'+S.me.orgId+'/'+S.caseId; }

function newCase(){
  openSheet(`
    <h3>새 케이스</h3>
    <div class="sub">내담자 가족의 가계도를 새로 시작합니다.</div>
    <div class="fld"><label>케이스 이름</label>
      <input id="ncTitle" class="inp" placeholder="예) 김○수 가족"></div>
    <div class="fld"><label>사례번호 (선택)</label>
      <input id="ncNo" class="inp" placeholder="예) 2026-118"></div>
    <div class="fld"><label>공개범위</label>
      <div class="seg" id="ncVis">
        <button class="on" data-v="private">🔒 비공개</button>
        <button data-v="org">👥 기관 공유</button>
      </div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:7px;line-height:1.55;">
        비공개는 나와 기관 관리자만 볼 수 있습니다. 나중에 언제든 바꿀 수 있습니다.
      </div>
    </div>
    <button class="btn" onclick="createCase()">케이스 만들기</button>
  `);
  segBind('ncVis');
  setTimeout(()=>$('ncTitle').focus(),300);
}
function segBind(id){
  const seg = $(id);
  seg.querySelectorAll('button').forEach(b=>{
    b.onclick = () => { seg.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on'); };
  });
}
function segVal(id){ const b=$(id).querySelector('button.on'); return b ? b.dataset.v : null; }

async function createCase(){
  const title = $('ncTitle').value.trim();
  if(!title){ toast('케이스 이름을 입력해 주세요.'); return; }
  const id = db.ref('cases/'+S.me.orgId).push().key;
  try{
    await db.ref(casePath(id)).set({
      ownerUid:S.uid, ownerName:S.me.name,
      title, caseNo:$('ncNo').value.trim()||'',
      visibility: segVal('ncVis'),
      count:0, gen:1, createdAt:Date.now(), updatedAt:Date.now()
    });
  }catch(e){ toast('케이스 생성에 실패했습니다.'); return; }
  closeSheet();
  toast('케이스를 만들었습니다.');
  setTimeout(()=>openCanvas(id), 250);
}

function openCaseSettings(){
  const c = S.cases[S.caseId]; if(!c) return;
  const canEdit = c.ownerUid===S.uid || S.me.role==='admin';
  openSheet(`
    <h3>케이스 설정</h3>
    <div class="sub">${esc(c.title)}</div>
    <div class="fld"><label>케이스 이름</label>
      <input id="csTitle" class="inp" value="${esc(c.title||'')}" ${canEdit?'':'disabled'}></div>
    <div class="fld"><label>사례번호</label>
      <input id="csNo" class="inp" value="${esc(c.caseNo||'')}" ${canEdit?'':'disabled'}></div>
    <div class="fld"><label>공개범위</label>
      <div class="seg" id="csVis">
        <button data-v="private" class="${c.visibility!=='org'?'on':''}">🔒 비공개</button>
        <button data-v="org" class="${c.visibility==='org'?'on':''}">👥 기관 공유</button>
      </div>
      <div style="font-size:11.5px;color:var(--muted);margin-top:7px;line-height:1.55;">
        담당자: ${esc(c.ownerName||'—')}${canEdit?'':' · 변경 권한이 없습니다.'}
      </div>
    </div>
    ${canEdit ? `
      <div class="sheet-acts">
        <button class="btn ghost" style="color:var(--danger);border-color:#EBC8C0;" onclick="deleteCase()">삭제</button>
        <button class="btn" onclick="saveCaseSettings()">저장하기</button>
      </div>` : ''}
  `);
  if(canEdit) segBind('csVis');
}
async function saveCaseSettings(){
  const t = $('csTitle').value.trim();
  if(!t){ toast('케이스 이름을 입력해 주세요.'); return; }
  try{
    await db.ref(casePath(S.caseId)).update({
      title:t, caseNo:$('csNo').value.trim(), visibility:segVal('csVis'), updatedAt:Date.now()
    });
  }catch(e){ toast('저장에 실패했습니다.'); return; }
  $('cvTitle').textContent = t;
  $('cvSub').textContent = `${segVal('csVis')==='org'?'기관 공유':'비공개'} · 자동저장`;
  closeSheet(); toast('저장했습니다.');
}
async function deleteCase(){
  if(!confirm('이 케이스를 삭제할까요? 가계도 기록도 함께 사라집니다.')) return;
  try{ await db.ref(casePath(S.caseId)).update({ deleted:true, updatedAt:Date.now() }); }
  catch(e){ toast('삭제에 실패했습니다.'); return; }
  closeSheet(); closeCanvas(); toast('삭제했습니다.');
}

/* ═══════════════════════════════════════════════════════════════
   캔버스 — Konva
   ═══════════════════════════════════════════════════════════════ */
