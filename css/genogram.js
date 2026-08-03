/* ============================================================
   genogram.js — [기능] 가계도 조작(이식)
   우클릭 방사형 메뉴, 가족 원클릭 추가, Undo/Redo, PNG, metaSave
   ============================================================ */

function addNodeSilent(gender, x, y){
  const id = uid();
  const now = Date.now();
  const n = {
    id, gender, x:Math.round(x), y:Math.round(y),
    name:'', birth:'', alive:true, status:{}, ip:false, memo:'',
    education:'', relationship:'', symptoms:'', support:'', family_history:'', residence:'', cause_of_death:'',
    createdAt:now, updatedAt:now
  };
  S.geno.nodes[id] = n;
  db.ref(genoPath()+'/nodes/'+id).set(n).catch(errSave);
  return id;
}

/* 가족 원클릭 추가: 배우자/자녀/부모/형제 */
function quickAddRelative(baseId, kind){
  const p = S.geno.nodes[baseId]; if(!p) return;
  const GAP_X = 130, GAP_Y = 150;
  if(kind==='spouse'){
    const nid = addNodeSilent(p.gender==='female'?'male':'female', p.x+GAP_X, p.y);
    addLink(baseId, nid, 'marriage');
    afterQuickAdd(); openInfoCard(nid);
  } else if(kind==='child'){
    const partnerId = findCouplePartner(baseId);
    const existing = Object.values(S.geno.links).filter(l=>
      RELS[l.type]?.kind==='child' && l.a===baseId).length;
    const baseX = partnerId ? (p.x + (S.geno.nodes[partnerId]?.x||p.x))/2 : p.x;
    const cx = baseX + existing*GAP_X - (existing>0? GAP_X/2 : 0);
    const nid = addNodeSilent('unknown', cx, p.y+GAP_Y+20);
    addLink(baseId, nid, 'child');  // addLink가 child모드로 들어가므로 아래서 정리
    S.childMode=null; S.linkFrom=null;
    afterQuickAdd(); openInfoCard(nid);
  } else if(kind==='parent'){
    const parentCount = Object.values(S.geno.links).filter(l=>
      RELS[l.type]?.kind==='child' && l.b===baseId).length;
    const nid = addNodeSilent(parentCount===0?'male':'female',
      p.x + (parentCount===0?-70:70), p.y-GAP_Y-20);
    addLink(nid, baseId, 'child');
    S.childMode=null; S.linkFrom=null;
    // 부모 2명이 되면 두 부모를 결혼선으로 연결
    if(parentCount===1){
      const first = Object.values(S.geno.links).find(l=>
        RELS[l.type]?.kind==='child' && l.b===baseId && l.a!==nid);
      if(first) addLink(first.a, nid, 'marriage');
    }
    afterQuickAdd(); openInfoCard(nid);
  } else if(kind==='sibling'){
    const parentLinks = Object.values(S.geno.links).filter(l=>
      RELS[l.type]?.kind==='child' && l.b===baseId);
    if(!parentLinks.length){ toast('먼저 부모를 추가해야 형제를 만들 수 있어요'); return; }
    const sibCount = Object.values(S.geno.links).filter(l=>
      RELS[l.type]?.kind==='child' && l.a===parentLinks[0].a).length;
    const nid = addNodeSilent('unknown', p.x + GAP_X*(sibCount>0?1:1), p.y);
    parentLinks.forEach(pl=>{ addLink(pl.a, nid, 'child'); S.childMode=null; S.linkFrom=null; });
    afterQuickAdd(); openInfoCard(nid);
  }
}
function afterQuickAdd(){
  S.childMode=null; S.linkFrom=null;
  metaSave(); draw();  // metaSave 안에서 pushHistory 자동 호출됨
}

/* 동거가족표시 도구: 순서대로 탭한 인물을 모아뒀다가, 버튼을 다시 누르면 묶는다 */
function toggleHouseholdTool(){
  if(S.tool==='household'){ finishHouseholdDraft(); return; }
  S.householdDraft = new Set();
  setTool('household');
}
function finishHouseholdDraft(){
  const members = [...(S.householdDraft||[])];
  if(members.length>=2){
    const id = uid();
    const h = { id, members };
    S.geno.households[id] = h;
    db.ref(genoPath()+'/households/'+id).set(h).catch(errSave);
    metaSave();
    toast('동거가족으로 묶었습니다.');
  } else {
    toast('2명 이상 선택해야 동거가족으로 묶을 수 있어요.');
  }
  setTool('');
}

/* ── 우클릭 방사형(컨텍스트) 메뉴 ── */
let ctxTarget = null;
function ensureCtxMenu(){
  if($('ctxMenu')) return;
  const m = document.createElement('div');
  m.id = 'ctxMenu';
  m.style.cssText = 'position:fixed;z-index:9999;display:none;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(30,50,40,.18);padding:6px;min-width:210px;max-height:86vh;overflow-y:auto;';
  m.innerHTML = `
    <div class="ctx-h">가족 추가</div>
    <button data-a="spouse">＋ 배우자</button>
    <button data-a="child">＋ 자녀</button>
    <button data-a="parent">＋ 부모</button>
    <button data-a="sibling">＋ 형제자매</button>
    <div class="ctx-sep"></div>
    <div class="ctx-h">관계</div>
    <button data-a="link">🔗 관계선 긋기</button>
    <div class="ctx-sep"></div>
    <div class="ctx-h">정보 입력</div>
    <button data-a="info">👤 인물 정보 입력 / 수정</button>
    <button data-a="info-status">🎨 상태 코딩 (질환·치료 등)</button>
    <button data-a="info-health">🩺 건강 & 지지 (증상·가족력)</button>
    <div class="ctx-sep"></div>
    <button data-a="delete" style="color:var(--danger);">🗑 이 인물 삭제</button>`;

  // 헤더/구분선 스타일
  m.querySelectorAll('.ctx-h').forEach(h=>{
    h.style.cssText='font-size:11px;font-weight:700;color:var(--muted,#8AA);padding:6px 11px 3px;letter-spacing:.2px;';
  });
  m.querySelectorAll('.ctx-sep').forEach(s=>{
    s.style.cssText='border-top:1px solid var(--line);margin:5px 0;';
  });
  m.querySelectorAll('button').forEach(b=>{
    b.style.cssText='display:block;width:100%;text-align:left;background:none;border:none;padding:8px 11px;font-size:13.5px;border-radius:7px;color:var(--ink);cursor:pointer;white-space:nowrap;';
    b.onmouseenter=()=> b.style.background='var(--sage-bg)';
    b.onmouseleave=()=> b.style.background='none';
  });
  document.body.appendChild(m);
  m.addEventListener('click', e=>{
    e.stopPropagation();
    const btn = e.target.closest('button'); if(!btn||!ctxTarget) return;
    const a = btn.dataset.a;
    if(['spouse','child','parent','sibling'].includes(a)) quickAddRelative(ctxTarget, a);
    else if(a==='link'){ S.tool='link'; S.linkFrom=ctxTarget; hint('관계를 이을 상대 인물을 클릭하세요'); draw(); }
    else if(a==='info') openInfoCard(ctxTarget);
    else if(a && a.startsWith('info-')) openInfoCard(ctxTarget, a.slice(5));
    else if(a==='delete'){ if(confirm('이 인물과 연결된 관계선을 모두 삭제할까요?')) delNodeDirect(ctxTarget); }
    hideCtxMenu();
  });
}

/* ══════════════════════════════════════════════════════════
   [신규] 작은 정보 팝업 카드 — 큰 사이드시트 대신 우클릭 자리 옆에 뜬다
   ══════════════════════════════════════════════════════════ */
let infoCardTarget = null;
function ensureInfoCard(){
  if($('infoCard')) return;
  const c = document.createElement('div');
  c.id = 'infoCard';
  c.style.cssText = 'position:fixed;z-index:10000;display:none;background:#fff;border:1px solid var(--line);border-radius:14px;box-shadow:0 16px 40px rgba(30,50,40,.22);padding:14px;width:290px;max-height:88vh;overflow-y:auto;font-family:inherit;';
  document.body.appendChild(c);
  // 카드 안을 클릭해도 바깥클릭 닫기가 발동하지 않도록
  c.addEventListener('mousedown', e=> e.stopPropagation());
}
function openInfoCard(id, section){
  ensureInfoCard();
  hideCtxMenu();
  infoCardTarget = id;
  const n = S.geno.nodes[id]; if(!n) return;
  const c = $('infoCard');

  const seg = (name, val, opts)=> `<div class="ic-seg" data-seg="${name}">`+
    opts.map(o=>`<button type="button" data-v="${o.v}" class="${String(val)===String(o.v)?'on':''}">${o.t}</button>`).join('')+`</div>`;

  const statusBtns = Object.entries(STATUS).map(([k,v])=>
    `<button type="button" class="ic-stag ${n.status?.[k]?'on':''}" data-k="${k}" style="${n.status?.[k]?`color:${v.color};background:${v.color}18;border-color:${v.color};`:''}"><i style="background:${v.color}"></i>${v.label}</button>`
  ).join('');

  c.innerHTML = `
    <div class="ic-title">인물 정보</div>
    <div class="ic-f"><label>이름</label>
      <input id="icName" value="${esc(n.name||'')}" placeholder="예) 김○수"></div>
    <div class="ic-f"><label>성별</label>
      ${seg('gender', n.gender, [{v:'male',t:'■ 남'},{v:'female',t:'● 여'},{v:'unknown',t:'◆ 미상'}])}</div>
    <div class="ic-row">
      <div class="ic-f"><label>출생연도</label>
        <input id="icBirth" type="number" inputmode="numeric" value="${esc(n.birth||'')}" placeholder="1975"></div>
      <div class="ic-f"><label>생존</label>
        ${seg('alive', n.alive!==false?1:0, [{v:1,t:'생존'},{v:0,t:'사망'}])}</div>
    </div>
    <div class="ic-f"><label>상태 코딩 (복수 선택)</label>
      <div class="ic-tags" id="icStatus">${statusBtns}</div></div>
    <div class="ic-f"><label>중심인물(IP)</label>
      ${seg('ip', n.ip?1:0, [{v:0,t:'아니오'},{v:1,t:'중심인물'}])}</div>

    <details class="ic-more"><summary>추가 정보 (학력·거주지·증상 등)</summary>
      <div class="ic-f"><label>학력</label><input id="icEducation" value="${esc(n.education||'')}" placeholder="고졸, 대졸 등"></div>
      <div class="ic-f"><label>가족 내 역할</label><input id="icRelationship" value="${esc(n.relationship||'')}" placeholder="장녀, 막내 등"></div>
      <div class="ic-f"><label>거주지</label><input id="icResidence" value="${esc(n.residence||'')}" placeholder="공주시 등"></div>
      <div class="ic-f"><label>주요 증상</label><textarea id="icSymptoms" rows="2" placeholder="우울, 불안 등">${esc(n.symptoms||'')}</textarea></div>
      <div class="ic-f"><label>지지도</label><input id="icSupport" value="${esc(n.support||'')}" placeholder="낮음/중간/높음"></div>
      <div class="ic-f"><label>가족력</label><textarea id="icFamily" rows="2" placeholder="정신질환, 물질사용 등">${esc(n.family_history||'')}</textarea></div>
      <div class="ic-f ic-death" style="display:${n.alive===false?'block':'none'}"><label>사망원인</label><input id="icCause" value="${esc(n.cause_of_death||'')}" placeholder="질병, 사고 등"></div>
      <div class="ic-f"><label>사례 기록 메모</label><textarea id="icMemo" rows="2" placeholder="기타 관찰 내용">${esc(n.memo||'')}</textarea></div>
    </details>

    <div class="ic-acts">
      <button type="button" class="ic-cancel" onclick="closeInfoCard()">닫기</button>
      <button type="button" class="ic-save" onclick="saveInfoCard()">저장</button>
    </div>`;

  bindInfoCard(c);
  // 위치: 우클릭 자리 옆. 화면 밖 넘침 보정
  c.style.display='block';
  const cw=c.offsetWidth, ch=c.offsetHeight;
  let x=(ctxLastXY.x||120)+6, y=(ctxLastXY.y||120);
  if(x+cw > window.innerWidth-8)  x = Math.max(8, window.innerWidth - cw - 8);
  if(y+ch > window.innerHeight-8) y = Math.max(8, window.innerHeight - ch - 8);
  c.style.left=x+'px'; c.style.top=y+'px';
  setTimeout(()=> document.addEventListener('mousedown', infoCardOutside), 0);

  // 특정 섹션 요청 시 해당 위치로 스크롤/포커스
  if(section){
    const anchor={basic:'icName',status:'icStatus',detail:'icEducation',health:'icSymptoms',memo:'icMemo',display:null}[section];
    if(anchor==='icEducation'||anchor==='icSymptoms'||anchor==='icMemo'){
      const det=c.querySelector('.ic-more'); if(det) det.open=true;
    }
    setTimeout(()=>{ const el=$(anchor); if(el){ el.scrollIntoView({block:'center'}); if(el.focus)el.focus(); } }, 60);
  } else {
    setTimeout(()=>{ const el=$('icName'); if(el) el.focus(); }, 60);
  }
}
function bindInfoCard(c){
  // 세그먼트 토글
  c.querySelectorAll('.ic-seg').forEach(seg=>{
    seg.querySelectorAll('button').forEach(b=>{
      b.onclick=()=>{ seg.querySelectorAll('button').forEach(x=>x.classList.remove('on')); b.classList.add('on');
        if(seg.dataset.seg==='alive'){ const d=c.querySelector('.ic-death'); if(d) d.style.display = b.dataset.v==='0'?'block':'none'; }
      };
    });
  });
  // 상태코딩 토글
  c.querySelectorAll('.ic-stag').forEach(b=>{
    b.onclick=()=>{ const k=b.dataset.k, col=STATUS[k].color, on=b.classList.toggle('on');
      b.style.cssText = on?`color:${col};background:${col}18;border-color:${col};`:''; };
  });
}
function icSegVal(name){
  const seg=$('infoCard').querySelector(`.ic-seg[data-seg="${name}"] button.on`);
  return seg?seg.dataset.v:null;
}
function saveInfoCard(){
  const id=infoCardTarget, n=S.geno.nodes[id]; if(!n) return;
  n.name=$('icName').value.trim();
  n.gender=icSegVal('gender')||n.gender;
  n.birth=$('icBirth').value.trim();
  n.alive=icSegVal('alive')==='1';
  n.ip=icSegVal('ip')==='1';
  n.education=$('icEducation').value.trim();
  n.relationship=$('icRelationship').value.trim();
  n.residence=$('icResidence').value.trim();
  n.symptoms=$('icSymptoms').value.trim();
  n.support=$('icSupport').value.trim();
  n.family_history=$('icFamily').value.trim();
  if($('icCause')) n.cause_of_death=$('icCause').value.trim();
  n.memo=$('icMemo').value.trim();
  const st={}; $('infoCard').querySelectorAll('.ic-stag.on').forEach(b=> st[b.dataset.k]=true); n.status=st;
  n.updatedAt=Date.now();
  const upd={['nodes/'+id]:n};
  if(n.ip) Object.values(S.geno.nodes).forEach(o=>{ if(o.id!==id && o.ip){ o.ip=false; upd['nodes/'+o.id+'/ip']=false; }});
  db.ref(genoPath()).update(upd).catch(errSave);
  metaSave(); draw(); closeInfoCard(); toast('저장했습니다.');
}
function closeInfoCard(){
  const c=$('infoCard'); if(c) c.style.display='none';
  document.removeEventListener('mousedown', infoCardOutside);
  infoCardTarget=null;
}
function infoCardOutside(e){
  const c=$('infoCard'); if(c && !c.contains(e.target)) closeInfoCard();
}
function showCtxMenu(nodeId, clientX, clientY){
  ensureCtxMenu();
  ctxTarget = nodeId;
  ctxLastXY = {x:clientX, y:clientY};  // 정보 팝업을 이 자리에 띄우기 위해 기억
  const m = $('ctxMenu');
  m.style.display='block';
  // 먼저 표시한 뒤 실제 크기를 재서 화면 밖으로 넘치면 위치 보정
  const mw = m.offsetWidth, mh = m.offsetHeight;
  let x = clientX, y = clientY;
  if(x + mw > window.innerWidth - 8)  x = window.innerWidth - mw - 8;
  if(y + mh > window.innerHeight - 8) y = Math.max(8, window.innerHeight - mh - 8);
  m.style.left = x+'px'; m.style.top = y+'px';
  setTimeout(()=> document.addEventListener('mousedown', ctxOutside), 0);
}
let ctxLastXY = {x:120, y:120};
function hideCtxMenu(){
  const m = $('ctxMenu'); if(m) m.style.display='none';
  document.removeEventListener('mousedown', ctxOutside);
}
function ctxOutside(e){
  const m = $('ctxMenu'); if(m && !m.contains(e.target)) hideCtxMenu();
}

/* ── Undo / Redo (스냅샷 방식) ── */
let genoHistory = [], genoHistIndex = -1, genoRestoring = false;
const GENO_MAX_HIST = 40;
function genoSnapshot(){ return JSON.stringify({nodes:S.geno.nodes, links:S.geno.links, households:S.geno.households}); }
function pushHistory(){
  if(genoRestoring) return;
  genoHistory = genoHistory.slice(0, genoHistIndex+1);
  genoHistory.push(genoSnapshot());
  if(genoHistory.length>GENO_MAX_HIST) genoHistory.shift();
  genoHistIndex = genoHistory.length-1;
  updateUndoButtons();
}
function restoreHistory(snapStr){
  genoRestoring = true;
  const snap = JSON.parse(snapStr);
  S.geno.nodes = snap.nodes||{}; S.geno.links = snap.links||{}; S.geno.households = snap.households||{};
  // Firebase에 전체 덮어쓰기 (수동저장 철학과 동일하게 즉시 반영)
  db.ref(genoPath()).update({ nodes:S.geno.nodes, links:S.geno.links, households:S.geno.households }).catch(errSave);
  metaSave(); draw();
  genoRestoring = false;
  updateUndoButtons();
}
function genoUndo(){ if(genoHistIndex<=0) return; genoHistIndex--; restoreHistory(genoHistory[genoHistIndex]); toast('실행취소'); }
function genoRedo(){ if(genoHistIndex>=genoHistory.length-1) return; genoHistIndex++; restoreHistory(genoHistory[genoHistIndex]); toast('다시실행'); }
function updateUndoButtons(){
  const u=$('btnUndo'), r=$('btnRedo');
  if(u) u.disabled = genoHistIndex<=0;
  if(r) r.disabled = genoHistIndex>=genoHistory.length-1;
}

/* 자녀 연속 등록 — 관계 피커 없이 바로 추가 */
function addChildDirect(childId){
  const cm = S.childMode; if(!cm) return;
  const parentId = cm.parentId;
  /* 이미 같은 부모-자녀 관계가 있으면 스킵 */
  const dup = Object.values(S.geno.links).find(l=>
    l.a===parentId && l.b===childId && (l.type==='child'||l.type==='adopted'));
  if(dup){ toast('이미 연결된 자녀입니다.'); return; }

  const id = uid();
  const link = { id, a:parentId, b:childId, type:cm.type };
  if(cm.yearStart) link.yearStart = cm.yearStart;
  if(cm.yearEnd) link.yearEnd = cm.yearEnd;
  S.geno.links[id] = link;
  db.ref(genoPath()+'/links/'+id).set(link).catch(errSave);
  metaSave(); draw();

  const childName = S.geno.nodes[childId]?.name || '이름 없음';
  toast(`${childName} → ${RELS[cm.type].label} 연결`);
  hint(`다음 자녀를 탭하세요 · 부모 탭하면 종료`);
}

/* 관계선 클릭 시 수정/삭제 시트 */
function openLinkEdit(lid){
  const l = S.geno.links[lid]; if(!l) return;
  const a = S.geno.nodes[l.a], b = S.geno.nodes[l.b];
  const def = RELS[l.type] || { label:'관계', desc:'' };
  openSheet(`
    <h3>관계 수정</h3>
    <div class="sub">
      <b>${esc(a?.name||'이름 없음')}</b> ↔ <b>${esc(b?.name||'이름 없음')}</b><br>
      현재: <b>${def.label}</b> (${def.desc})
    </div>
    <div class="fld"><label>관계 유형 변경</label>
      <select id="leType" class="inp">
        ${Object.entries(RELS).map(([k,v])=>`<option value="${k}" ${k===l.type?'selected':''}>${v.label} — ${v.desc}</option>`).join('')}
      </select></div>
    <div class="row2">
      <div class="fld"><label>시작 연도</label>
        <input id="leYearStart" class="inp" type="number" inputmode="numeric" value="${esc(l.yearStart||'')}" placeholder="1998"></div>
      <div class="fld"><label>종료 연도</label>
        <input id="leYearEnd" class="inp" type="number" inputmode="numeric" value="${esc(l.yearEnd||'')}" placeholder="2015"></div>
    </div>
    <div class="sheet-acts">
      <button class="btn ghost" style="color:var(--danger);border-color:#EBC8C0;" onclick="delLink('${lid}')">삭제</button>
      <button class="btn" onclick="saveLinkEdit('${lid}')">저장하기</button>
    </div>
  `);
}
function saveLinkEdit(lid){
  const l = S.geno.links[lid]; if(!l) return;
  l.type = $('leType').value;
  const ys = $('leYearStart').value.trim();
  const ye = $('leYearEnd').value.trim();
  if(ys) l.yearStart = ys; else delete l.yearStart;
  if(ye) l.yearEnd = ye; else delete l.yearEnd;
  db.ref(genoPath()+'/links/'+lid).set(l).catch(errSave);
  metaSave(); draw(); closeSheet(); toast('관계를 수정했습니다.');
}
function delLink(lid){
  if(!confirm('이 관계선을 삭제할까요?')) return;
  delete S.geno.links[lid];
  db.ref(genoPath()+'/links/'+lid).remove().catch(errSave);
  metaSave(); draw(); closeSheet(); toast('관계선을 삭제했습니다.');
}

/* ── 메타(썸네일·요약) 저장 — 디바운스 ── */
let metaT;
function metaSave(){
  // [이식] 변경 발생 시 히스토리 기록 (undo/redo용)
  if(typeof pushHistory==='function') pushHistory();
  clearTimeout(metaT);
  metaT = setTimeout(async ()=>{
    if(!S.caseId) return;
    const nodes = Object.values(S.geno.nodes);
    const thumb = {
      n: nodes.slice(0,14).map(n=>({ i:n.id, x:n.x, y:n.y, g:n.gender, c:nodeColor(n), ip:!!n.ip })),
      l: Object.values(S.geno.links).slice(0,18)
           .map(l=>({ a:l.a, b:l.b, k:RELS[l.type]?.kind || 'couple' }))
    };
    const riskSummary = {};
    nodes.forEach(n=> Object.keys(n.status||{}).forEach(k=>{
      if(n.status[k]) riskSummary[k] = (riskSummary[k]||0)+1;
    }));
    const ys = [...new Set(nodes.map(n=>Math.round(n.y/100)))];
    try{
      await db.ref(casePath(S.caseId)).update({
        updatedAt:Date.now(), count:nodes.length,
        gen:Math.max(ys.length,1), thumb, riskSummary
      });
    }catch(e){ /* 메타 실패는 조용히 — 본문은 이미 저장됨 */ }
  }, 700);
}

/* ── PNG 내보내기 (수정 #10: 흰 배경) ── */
function exportPNG(){
  if(!S.stage || !Object.keys(S.geno.nodes).length){ toast('그릴 인물이 없습니다.'); return; }
  const sc = S.stage.scaleX(), pos = S.stage.position();
  fitView();
  setTimeout(()=>{
    // 현재 보이는 영역 전체를 덮는 흰 배경을 깔고 캡처
    const s = S.stage.scaleX();
    const bg = new Konva.Rect({
      x: -S.stage.x()/s, y: -S.stage.y()/s,
      width: S.stage.width()/s, height: S.stage.height()/s,
      fill:'#ffffff', listening:false
    });
    S.layer.add(bg); bg.moveToBottom(); S.layer.draw();
    const url = S.stage.toDataURL({ pixelRatio:2, mimeType:'image/png' });
    bg.destroy(); S.layer.draw();

    const a = document.createElement('a');
    a.download = `${((S.cases[S.caseId]||{}).title||'가계도').replace(/[\\/:*?"<>|]/g,'')}_가계도.png`;
    a.href = url; a.click();
    S.stage.scale({x:sc,y:sc}); S.stage.position(pos);
    toast('PNG로 저장했습니다.');
  }, 120);
}

/* ═══════════════════════════════════════════════════════════════
   기관 관리 (관리자) — orgMembers 미러 사용
   ═══════════════════════════════════════════════════════════════ */
