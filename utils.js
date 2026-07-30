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
    afterQuickAdd(); openPerson(nid);
  } else if(kind==='child'){
    const partnerId = findCouplePartner(baseId);
    const existing = Object.values(S.geno.links).filter(l=>
      RELS[l.type]?.kind==='child' && l.a===baseId).length;
    const baseX = partnerId ? (p.x + (S.geno.nodes[partnerId]?.x||p.x))/2 : p.x;
    const cx = baseX + existing*GAP_X - (existing>0? GAP_X/2 : 0);
    const nid = addNodeSilent('unknown', cx, p.y+GAP_Y+20);
    addLink(baseId, nid, 'child');  // addLink가 child모드로 들어가므로 아래서 정리
    S.childMode=null; S.linkFrom=null;
    afterQuickAdd(); openPerson(nid);
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
    afterQuickAdd(); openPerson(nid);
  } else if(kind==='sibling'){
    const parentLinks = Object.values(S.geno.links).filter(l=>
      RELS[l.type]?.kind==='child' && l.b===baseId);
    if(!parentLinks.length){ toast('먼저 부모를 추가해야 형제를 만들 수 있어요'); return; }
    const sibCount = Object.values(S.geno.links).filter(l=>
      RELS[l.type]?.kind==='child' && l.a===parentLinks[0].a).length;
    const nid = addNodeSilent('unknown', p.x + GAP_X*(sibCount>0?1:1), p.y);
    parentLinks.forEach(pl=>{ addLink(pl.a, nid, 'child'); S.childMode=null; S.linkFrom=null; });
    afterQuickAdd(); openPerson(nid);
  }
}
function afterQuickAdd(){
  S.childMode=null; S.linkFrom=null;
  metaSave(); draw();  // metaSave 안에서 pushHistory 자동 호출됨
}

/* ── 우클릭 방사형(컨텍스트) 메뉴 ── */
let ctxTarget = null;
function ensureCtxMenu(){
  if($('ctxMenu')) return;
  const m = document.createElement('div');
  m.id = 'ctxMenu';
  m.style.cssText = 'position:fixed;z-index:9999;display:none;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 12px 32px rgba(30,50,40,.18);padding:6px;min-width:180px;';
  m.innerHTML = `
    <button data-a="spouse">＋ 배우자</button>
    <button data-a="child">＋ 자녀</button>
    <button data-a="parent">＋ 부모</button>
    <button data-a="sibling">＋ 형제자매</button>
    <div style="border-top:1px solid var(--line);margin:4px 0;"></div>
    <button data-a="link">🔗 관계선 긋기</button>
    <button data-a="info">정보 입력 / 수정</button>
    <div style="border-top:1px solid var(--line);margin:4px 0;"></div>
    <button data-a="delete" style="color:var(--danger);">이 인물 삭제</button>`;
  m.querySelectorAll('button').forEach(b=>{
    b.style.cssText='display:block;width:100%;text-align:left;background:none;border:none;padding:9px 11px;font-size:14px;border-radius:7px;color:var(--ink);';
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
    else if(a==='info') openPerson(ctxTarget);
    else if(a==='delete'){ if(confirm('이 인물과 연결된 관계선을 모두 삭제할까요?')) delNodeDirect(ctxTarget); }
    hideCtxMenu();
  });
}
function showCtxMenu(nodeId, clientX, clientY){
  ensureCtxMenu();
  ctxTarget = nodeId;
  const m = $('ctxMenu');
  m.style.left = clientX+'px'; m.style.top = clientY+'px'; m.style.display='block';
  setTimeout(()=> document.addEventListener('mousedown', ctxOutside), 0);
}
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
function genoSnapshot(){ return JSON.stringify({nodes:S.geno.nodes, links:S.geno.links}); }
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
  S.geno.nodes = snap.nodes||{}; S.geno.links = snap.links||{};
  // Firebase에 전체 덮어쓰기 (수동저장 철학과 동일하게 즉시 반영)
  db.ref(genoPath()).update({ nodes:S.geno.nodes, links:S.geno.links }).catch(errSave);
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
