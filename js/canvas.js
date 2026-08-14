/* ============================================================
   canvas.js — [기능] 캔버스·렌더링
   스테이지, 노드/링크 CRUD, draw, 자녀선/관계선/노드 렌더
   ============================================================ */

const NW = 56;

async function openCanvas(id){
  S.caseId = id; S.sel=null; S.linkFrom=null;
  const c = S.cases[id]; if(!c) return;
  $('cvTitle').textContent = c.title;
  $('cvSub').textContent = `${c.visibility==='org'?'기관 공유':'비공개'} · 자동저장`;
  show('viewCanvas');

  let snap;
  try{ snap = await db.ref(genoPath()).once('value'); }
  catch(e){ toast('가계도를 불러올 권한이 없거나 실패했습니다.'); closeCanvas(); return; }
  S.geno = snap.val() || { nodes:{}, links:{} };
  S.geno.nodes = S.geno.nodes || {};
  S.geno.links = S.geno.links || {};
  S.geno.households = S.geno.households || {};
  S.geno.textboxes = S.geno.textboxes || {};

  buildStage();
  setTool('');            // 기본값: 아무 도구도 선택 안 됨
  draw();
  fitView();
  if(!Object.keys(S.geno.nodes).length) hint('빈 캔버스를 탭하면 인물이 추가됩니다.');
  maybeShowTutorial();
}
function closeCanvas(){
  if(S.stage){ S.stage.destroy(); S.stage=null; S.layer=null; }
  S.caseId=null;
  if(S.me) show('app');
}

function buildStage(){
  if(S.stage) S.stage.destroy();
  const wrap = $('stageWrap');
  S.stage = new Konva.Stage({
    container:'stage', width:wrap.clientWidth, height:wrap.clientHeight, draggable:false
  });
  S.layer = new Konva.Layer();
  S.stage.add(S.layer);

  S.stage.on('wheel', e=>{
    e.evt.preventDefault();
    const old = S.stage.scaleX(), p = S.stage.getPointerPosition();
    const to = { x:(p.x - S.stage.x())/old, y:(p.y - S.stage.y())/old };
    const ns = Math.max(.25, Math.min(3, e.evt.deltaY>0 ? old/1.08 : old*1.08));
    S.stage.scale({x:ns,y:ns});
    S.stage.position({ x:p.x - to.x*ns, y:p.y - to.y*ns });
  });
  let lastDist=0;
  S.stage.on('touchmove', e=>{
    const [t1,t2] = [e.evt.touches[0], e.evt.touches[1]];
    if(!t1 || !t2) return;
    e.evt.preventDefault();
    S.stage.draggable(false);
    const p1={x:t1.clientX,y:t1.clientY}, p2={x:t2.clientX,y:t2.clientY};
    const dist = Math.hypot(p2.x-p1.x, p2.y-p1.y);
    const center = {x:(p1.x+p2.x)/2, y:(p1.y+p2.y)/2};
    if(!lastDist){ lastDist=dist; return; }
    const box = S.stage.container().getBoundingClientRect();
    const cs = { x:center.x-box.left, y:center.y-box.top };
    const old = S.stage.scaleX();
    const to = { x:(cs.x - S.stage.x())/old, y:(cs.y - S.stage.y())/old };
    const ns = Math.max(.25, Math.min(3, old * (dist/lastDist)));
    S.stage.scale({x:ns,y:ns});
    S.stage.position({ x:cs.x - to.x*ns, y:cs.y - to.y*ns });
    lastDist=dist;
  });
  S.stage.on('touchend', ()=>{ lastDist=0; S.stage.draggable(S.tool==='pan'); });

  S.stage.on('click tap', e=>{
    if(e.target !== S.stage) return;
    if(S.tool==='household'){ finishHouseholdDraft(); return; }
    // 도형 도구로 캔버스를 탭해 노드를 만드는 방식은 제거됨.
    // 인물 추가는 상단 '인물 추가' 버튼 또는 기존 인물 우클릭으로만 수행.
    S.sel=null; S.linkFrom=null; draw();
  });

  /* 캔버스 빈 곳 우클릭 → 브라우저 메뉴 대신 "글상자 추가" 메뉴 표시
     (인물/글상자 자체의 contextmenu 핸들러가 stopPropagation 하므로,
      여기까지 이벤트가 올라오면 진짜 빈 공간을 우클릭한 것) */
  const stageWrap = $('stageWrap');
  if(stageWrap && !stageWrap._ctxBound){
    stageWrap.addEventListener('contextmenu', e=>{
      e.preventDefault();
      hideCtxMenu();
      const pos = S.stage.getPointerPosition();
      if(!pos) return;
      const scale = S.stage.scaleX();
      const canvasX = (pos.x - S.stage.x())/scale;
      const canvasY = (pos.y - S.stage.y())/scale;
      showMiniMenu([
        {icon:'🗒', text:'글상자 추가', onClick:()=> addTextBox(canvasX, canvasY)}
      ], e.clientX, e.clientY);
    });
    stageWrap._ctxBound = true;
  }
  /* [이식] 캔버스 진입 시 히스토리 초기화(현재 상태를 기준점으로) */
  genoHistory = []; genoHistIndex = -1;
  pushHistory();

  /* 빈 캔버스면 시작 방법 안내 */
  if(Object.keys(S.geno.nodes||{}).length === 0){
    hint("상단 '인물 추가' 버튼으로 첫 인물을 놓고, 인물을 우클릭해 가족을 늘리세요.");
  }
}
function resizeStage(){
  if(!S.stage) return;
  const wrap = $('stageWrap');
  S.stage.width(wrap.clientWidth); S.stage.height(wrap.clientHeight);
}

function setTool(t){
  S.tool = t; S.linkFrom = null; S.childMode = null;
  ['select','link','eraser','pan','household'].forEach(k=>{
    const el = $('tl'+k[0].toUpperCase()+k.slice(1));
    if(el) el.classList.toggle('on', k===t);
  });
  if(S.stage) S.stage.draggable(t==='pan');
  if(t==='link') hint('연결할 인물 두 명을 차례로 탭하세요.');
  else if(t==='pan') hint('드래그해서 화면을 이동합니다.');
  else if(t==='eraser') hint('삭제할 인물이나 관계선을 탭하세요.');
  else if(t==='select') hint('인물을 탭해 선택하세요. Shift+탭으로 다중 선택.');
  else if(t==='household') hint('동거가족으로 묶을 인물들을 순서대로 탭하세요. 완료하려면 버튼을 다시 누르세요.');
  else if(t==='') hint('');
  else hintOff();
  if(t!=='select') S.selected.clear();
  if(t!=='household') S.householdDraft = null;
  hintOff();
  draw();
}
let hintTimer;
function hint(m){ const h=$('cvHint'); h.textContent=m; h.classList.remove('hide'); clearTimeout(hintTimer); hintTimer=setTimeout(hintOff,3200); }
function hintOff(){ $('cvHint').classList.add('hide'); }

/* ── 사용 설명 팝업 (하루 단위로 "오늘은 보지 않기") ── */
function maybeShowTutorial(){
  const today = new Date().toISOString().slice(0,10);
  if(localStorage.getItem('genoTutorialSkip') === today) return;
  openSheet(`
    <h3>사용 설명</h3>
    <div class="sub">가계도는 우클릭으로 조작합니다.</div>
    <p style="font-size:13px;color:var(--ink-soft);line-height:1.7;margin:0 0 16px;">
      상단 '인물 추가' 버튼으로 첫 인물을 놓고, <b>인물을 우클릭</b>하면 가족 추가·관계선·삭제 메뉴가 열립니다.<br>
      빈 곳을 우클릭하면 메뉴가 닫힙니다.
    </p>
    <label style="display:flex;align-items:center;gap:8px;font-size:12.5px;color:var(--ink-soft);margin-bottom:14px;">
      <input type="checkbox" id="tutSkipToday" style="accent-color:var(--sage-deep);"> 오늘 하루 보지 않기
    </label>
    <div class="sheet-acts">
      <button class="btn" onclick="closeTutorial()">확인</button>
    </div>
  `);
}
function closeTutorial(){
  if($('tutSkipToday')?.checked) localStorage.setItem('genoTutorialSkip', new Date().toISOString().slice(0,10));
  closeSheet();
}

/* ── 노드 CRUD (수정 #7: 노드/링크 단위 저장) ── */
function errSave(){ toast('저장에 실패했습니다. 연결을 확인해 주세요.'); }
function saveNode(n){ db.ref(genoPath()+'/nodes/'+n.id).set(n).catch(errSave); metaSave(); }
function saveNodePos(n){ db.ref(genoPath()+'/nodes/'+n.id).update({x:n.x, y:n.y}).catch(errSave); metaSave(); }

function addNode(gender, x, y){
  const id = uid();
  const now = Date.now();
  const n = {
    id, gender, x:Math.round(x), y:Math.round(y),
    name:'', birth:'', alive:true, status:{}, ip:false, memo:'',
    education:'', relationship:'', symptoms:'', support:'', family_history:'', residence:'', cause_of_death:'',
    createdAt:now, updatedAt:now
  };
  S.geno.nodes[id] = n;
  saveNode(n); draw();
  if(typeof openInfoCard==='function') openInfoCard(id); else openPerson(id);
}

/* [이식] 상단 '인물 추가' 버튼 — 화면 중앙에 인물을 놓는다.
   빈 캔버스일 때 시작점을 만들고, 이후 가족 확장은 인물 우클릭으로 수행한다. */
function addPersonCenter(){
  if(!S.stage){ return; }
  // 현재 보이는 화면의 중앙을 캔버스 좌표로 환산
  const s = S.stage.scaleX();
  const cx = (S.stage.width()/2  - S.stage.x()) / s;
  const cy = (S.stage.height()/2 - S.stage.y()) / s;
  // 이미 노드가 있으면 겹치지 않게 약간 어긋나게 배치
  const count = Object.keys(S.geno.nodes).length;
  const ox = count>0 ? (count%5)*40 - 80 : 0;
  const oy = count>0 ? Math.floor(count/5)*40 : 0;
  const isFirst = count === 0;
  const id = uid();
  const now = Date.now();
  const n = {
    id, gender:'male', x:Math.round(cx+ox), y:Math.round(cy+oy),
    name:'', birth:'', alive:true, status:{}, ip:isFirst, memo:'',
    education:'', relationship:'', symptoms:'', support:'', family_history:'', residence:'', cause_of_death:'',
    createdAt:now, updatedAt:now
  };
  S.geno.nodes[id] = n;
  saveNode(n); draw();
  toast(isFirst ? '중심인물을 추가했어요. 우클릭으로 가족을 늘리세요' : '인물을 추가했어요');
  // 팝업 카드를 화면 중앙 근처에 띄운다
  if(typeof ctxLastXY!=='undefined'){ ctxLastXY = {x: window.innerWidth/2 - 140, y: 140}; }
  if(typeof openInfoCard==='function') openInfoCard(id); else openPerson(id);
}

function nodeColor(n){
  const on = Object.keys(n.status||{}).filter(k=>n.status[k]);
  return on.length ? STATUS[on[0]].color : '#22332E';
}

/* ── 렌더 ── */
function draw(){
  if(!S.layer) return;
  S.layer.destroyChildren();
  S.nodeGroups = {};
  drawHouseholds();
  const childLinks = [];
  Object.values(S.geno.links).forEach(l=>{
    const a = S.geno.nodes[l.a], b = S.geno.nodes[l.b];
    if(!a || !b) return;
    const def = RELS[l.type];
    if(def && def.kind==='child') childLinks.push(l);
    else drawLink(l, a, b);
  });
  drawChildStructures(childLinks);
  Object.values(S.geno.nodes).forEach(drawNode);
  drawTextBoxes();
  S.layer.draw();
}

/* ═══ 글상자(텍스트박스) — 캔버스에 자유 배치하는 메모 ═══ */
function drawTextBoxes(){
  Object.values(S.geno.textboxes||{}).forEach(tb=>{
    const grp = new Konva.Group({ x:tb.x, y:tb.y, draggable:true });
    const txt = new Konva.Text({
      text:tb.text||'', fontSize:12.5, fontFamily:'Pretendard',
      fill:'#3B4A44', width:180, padding:9, lineHeight:1.4
    });
    const bg = new Konva.Rect({
      width:txt.width(), height:txt.height(),
      fill:'#FFF7DE', stroke:'#E3D5A0', strokeWidth:1.2, dash:[5,4], cornerRadius:6
    });
    grp.add(bg); grp.add(txt);

    grp.on('dragend', ()=>{
      tb.x = Math.round(grp.x()); tb.y = Math.round(grp.y());
      db.ref(genoPath()+'/textboxes/'+tb.id).update({x:tb.x, y:tb.y}).catch(errSave);
      metaSave();
    });
    grp.on('click tap', e=>{ e.cancelBubble = true; openTextBoxEdit(tb.id); });
    grp.on('contextmenu', e=>{
      e.evt.preventDefault(); e.cancelBubble = true;
      if(e.evt.stopPropagation) e.evt.stopPropagation();
      showMiniMenu([
        {icon:'✏️', text:'내용 수정', onClick:()=> openTextBoxEdit(tb.id)},
        {icon:'🗑', text:'삭제', danger:true, onClick:()=> delTextBox(tb.id)}
      ], e.evt.clientX, e.evt.clientY);
    });

    S.layer.add(grp);
  });
}

/* ═══ 동거가족 표시 — 점선 타원으로 인물 묶음 표시 ═══ */
function drawHouseholds(){
  const PAD = NW/2 + 22;
  Object.values(S.geno.households||{}).forEach(h=>{
    const members = (h.members||[]).map(id=>S.geno.nodes[id]).filter(Boolean);
    if(members.length < 2) return;
    const minX=Math.min(...members.map(n=>n.x))-PAD, maxX=Math.max(...members.map(n=>n.x))+PAD;
    const minY=Math.min(...members.map(n=>n.y))-PAD, maxY=Math.max(...members.map(n=>n.y))+PAD;
    const ell = new Konva.Ellipse({
      x:(minX+maxX)/2, y:(minY+maxY)/2,
      radiusX:(maxX-minX)/2, radiusY:(maxY-minY)/2,
      stroke:'#22332E', strokeWidth:1.6, dash:[7,6],
      listening:true
    });
    ell.on('click tap', e=>{
      e.cancelBubble = true;
      if(confirm('이 동거가족 표시를 삭제할까요?')){
        delete S.geno.households[h.id];
        db.ref(genoPath()+'/households/'+h.id).remove().catch(errSave);
        metaSave(); draw(); toast('동거가족 표시를 삭제했습니다.');
      }
    });
    S.layer.add(ell);
  });
}

/* ═══ 자녀선 — 커플 중앙 + 형제 수평선 구조 ═══ */
function findCouplePartner(parentId){
  for(const l of Object.values(S.geno.links)){
    const def = RELS[l.type];
    if(!def || def.kind!=='couple') continue;
    if(l.a===parentId) return l.b;
    if(l.b===parentId) return l.a;
  }
  return null;
}

function drawChildStructures(childLinks){
  if(!childLinks.length) return;
  const R = NW/2;
  const isEraser = S.tool==='eraser';

  /* 자녀 히트 영역 (클릭으로 수정/삭제) */
  function addChildHit(link, pts){
    const hit = new Konva.Line({
      points:pts, stroke:'transparent', strokeWidth:14, listening:true
    });
    hit.on('click tap', e=>{
      e.cancelBubble = true;
      if(isEraser){
        if(confirm(`${RELS[link.type]?.label||'관계'} 관계선을 삭제할까요?`)){
          delete S.geno.links[link.id];
          db.ref(genoPath()+'/links/'+link.id).remove().catch(errSave);
          metaSave(); draw(); toast('관계선을 삭제했습니다.');
        }
      } else { openLinkEdit(link.id); }
    });
    S.layer.add(hit);
  }

  /* 커플 단위로 자녀 그룹핑 */
  const groups = {};
  childLinks.forEach(l=>{
    const partnerId = findCouplePartner(l.a);
    const key = partnerId ? [l.a, partnerId].sort().join('|') : 'solo|'+l.a;
    if(!groups[key]) groups[key] = { parentId:l.a, partnerId, items:[] };
    groups[key].items.push(l);
  });

  Object.values(groups).forEach(g=>{
    const p1 = S.geno.nodes[g.parentId];
    const p2 = g.partnerId ? S.geno.nodes[g.partnerId] : null;
    if(!p1) return;

    /* 앵커 X: 커플 중앙 / 한부모면 부모 X */
    const ax = p2 ? (p1.x + p2.x)/2 : p1.x;

    /* 드롭 시작 Y: 커플선이 지나는 Y (부모 중심)
       — 노드(흰색 fill)가 나중에 그려져 겹침 부분을 자연스럽게 가림 */
    const coupleY = p2 ? (p1.y + p2.y)/2 : p1.y;

    /* 부모 아이콘 하단 (실제로 보이기 시작하는 지점) */
    const visibleStartY = (p2 ? Math.max(p1.y, p2.y) : p1.y) + R;

    /* 자녀 노드 수집 + 좌→우 정렬 */
    const kids = g.items
      .map(l=>({ link:l, node:S.geno.nodes[l.b] }))
      .filter(k=>k.node)
      .sort((a,b)=> a.node.x - b.node.x);
    if(!kids.length) return;

    /* 형제 수평선 Y = 부모 하단과 최상위 자녀 상단의 중간 */
    const nearestChildTop = Math.min(...kids.map(k=> k.node.y - R));
    const barY = Math.round((visibleStartY + nearestChildTop) / 2);

    /* ① 커플 중앙 → 수평선까지 수직 드롭 (coupleY에서 시작 = 커플선과 연결) */
    S.layer.add(new Konva.Line({
      points:[ax, coupleY, ax, barY],
      stroke:'#22332E', strokeWidth:2, listening:false
    }));

    if(kids.length===1){
      const k = kids[0];
      const dash = k.link.type==='adopted' ? [6,4] : undefined;
      /* 자녀 아이콘 상단에서 끝남 (child.y - R, 갭 없음) */
      const cy = k.node.y - R;
      if(Math.abs(k.node.x - ax) < 3){
        S.layer.add(new Konva.Line({
          points:[ax, barY, ax, cy], stroke:'#22332E', strokeWidth:2, dash, listening:false
        }));
      } else {
        S.layer.add(new Konva.Line({
          points:[ax, barY, k.node.x, barY, k.node.x, cy],
          stroke:'#22332E', strokeWidth:2, dash, listening:false
        }));
      }
      addChildHit(k.link, [ax, coupleY, k.node.x, k.node.y]);

    } else {
      const leftX  = Math.min(ax, kids[0].node.x);
      const rightX = Math.max(ax, kids[kids.length-1].node.x);

      /* ② 수평 형제선 */
      S.layer.add(new Konva.Line({
        points:[leftX, barY, rightX, barY],
        stroke:'#22332E', strokeWidth:2, listening:false
      }));

      /* ③ 각 자녀로 수직 드롭 — 자녀 아이콘 상단에서 끝남 */
      kids.forEach(k=>{
        const dash = k.link.type==='adopted' ? [6,4] : undefined;
        const cy = k.node.y - R;
        S.layer.add(new Konva.Line({
          points:[k.node.x, barY, k.node.x, cy],
          stroke:'#22332E', strokeWidth:2, dash, listening:false
        }));
        addChildHit(k.link, [ax, coupleY, k.node.x, k.node.y]);
      });
    }
  });
}

function drawLink(l, a, b){
  const def = RELS[l.type] || RELS.marriage;
  const col = '#22332E';
  const isEraser = S.tool==='eraser';
  
  /* 관계선 클릭 영역 (투명 히트 영역) */
  function addHitLine(pts){
    const hit = new Konva.Line({
      points:pts, stroke:'transparent', strokeWidth:14, listening:true
    });
    hit.on('click tap', e => {
      e.cancelBubble = true;
      if(isEraser){
        if(confirm(`${RELS[l.type]?.label||'관계'} 관계선을 삭제할까요?`)){
          delete S.geno.links[l.id];
          db.ref(genoPath()+'/links/'+l.id).remove().catch(errSave);
          metaSave(); draw(); toast('관계선을 삭제했습니다.');
        }
      } else {
        openLinkEdit(l.id);
      }
    });
    S.layer.add(hit);
  }
  
  /* 연도 라벨 */
  function addYearLabel(x, y){
    const yr = l.year || l.yearStart;
    if(!yr) return;
    const txt = l.yearEnd ? `${yr}–${l.yearEnd}` : yr;
    S.layer.add(new Konva.Text({
      x:x-30, y:y-16, width:60, align:'center',
      text:String(txt), fontSize:10, fontFamily:'Pretendard',
      fill:'var(--ink-soft,#5B6E67)', listening:false
    }));
  }

  /* child 링크는 draw()에서 drawChildStructures로 처리 — 여기서 스킵 */
  if(def.kind==='child') return;

  if(def.kind==='emo'){
    const emoColors = {
      close:'#4C7A6D', conflict:'#C15B47', cutoff:'#7A8B85',
      distant:'#8A6FA8', complex:'#C15B47'
    };
    const c = emoColors[l.type] || '#7A8B85';

    if(l.type==='conflict'){
      const steps=8, pts=[];
      for(let i=0;i<=steps;i++){
        const t=i/steps, x=a.x+(b.x-a.x)*t, y=a.y+(b.y-a.y)*t;
        const nx=-(b.y-a.y), ny=(b.x-a.x), len=Math.hypot(nx,ny)||1;
        const off = (i%2? 6:-6) * (i&&i<steps?1:0);
        pts.push(x + nx/len*off, y + ny/len*off);
      }
      S.layer.add(new Konva.Line({ points:pts, stroke:c, strokeWidth:2, listening:false }));
      addHitLine([a.x,a.y,b.x,b.y]);
    } else if(l.type==='close'){
      [-2.5, 2.5].forEach(o=>{
        const nx=-(b.y-a.y), ny=(b.x-a.x), len=Math.hypot(nx,ny)||1;
        S.layer.add(new Konva.Line({
          points:[a.x+nx/len*o, a.y+ny/len*o, b.x+nx/len*o, b.y+ny/len*o],
          stroke:c, strokeWidth:2, listening:false }));
      });
      addHitLine([a.x,a.y,b.x,b.y]);
    } else if(l.type==='distant'){
      /* 소원: 점선 (간격 넓은) */
      S.layer.add(new Konva.Line({ points:[a.x,a.y,b.x,b.y], stroke:c, strokeWidth:2, dash:[4,6], listening:false }));
      addHitLine([a.x,a.y,b.x,b.y]);
    } else if(l.type==='complex'){
      /* 복합: 친밀(이중선 위) + 갈등(지그재그 아래) */
      const nx=-(b.y-a.y), ny=(b.x-a.x), len=Math.hypot(nx,ny)||1;
      // 친밀선 (위쪽)
      [-3, -7].forEach(o=>{
        S.layer.add(new Konva.Line({
          points:[a.x+nx/len*o, a.y+ny/len*o, b.x+nx/len*o, b.y+ny/len*o],
          stroke:'#4C7A6D', strokeWidth:1.8, listening:false }));
      });
      // 갈등선 (아래쪽)
      const steps2=8, pts2=[];
      for(let i=0;i<=steps2;i++){
        const t=i/steps2, x=a.x+(b.x-a.x)*t+nx/len*4, y=a.y+(b.y-a.y)*t+ny/len*4;
        const off2 = (i%2? 4:-4) * (i&&i<steps2?1:0);
        pts2.push(x + nx/len*off2, y + ny/len*off2);
      }
      S.layer.add(new Konva.Line({ points:pts2, stroke:'#C15B47', strokeWidth:1.5, listening:false }));
      addHitLine([a.x,a.y,b.x,b.y]);
    } else {
      /* 단절 (cutoff) */
      S.layer.add(new Konva.Line({ points:[a.x,a.y,b.x,b.y], stroke:c, strokeWidth:2, dash:[10,7], listening:false }));
      const mx=(a.x+b.x)/2, my2=(a.y+b.y)/2;
      S.layer.add(new Konva.Line({ points:[mx-7,my2-7,mx+7,my2+7], stroke:c, strokeWidth:2, listening:false }));
      S.layer.add(new Konva.Line({ points:[mx+7,my2-7,mx-7,my2+7], stroke:c, strokeWidth:2, listening:false }));
      addHitLine([a.x,a.y,b.x,b.y]);
    }
    return;
  }

  /* 커플 관계 */
  const pts = [a.x, a.y, b.x, b.y];
  S.layer.add(new Konva.Line({
    points:pts, stroke:col, strokeWidth:2,
    dash: (l.type==='cohabit') ? [7,5] : undefined, listening:false
  }));
  addHitLine(pts);

  const mx=(a.x+b.x)/2, my=(a.y+b.y)/2;
  const slashes = { separated:1, divorced:2 }[l.type] || 0;
  if(slashes){
    for(let i=0;i<slashes;i++){
      const o = slashes===1 ? 0 : (i? 6 : -6);
      S.layer.add(new Konva.Line({
        points:[mx+o-6, my+9, mx+o+6, my-9], stroke:col, strokeWidth:2, listening:false }));
    }
  }
  /* 재혼: 이혼 표시 + 화살표 */
  if(l.type==='remarriage'){
    S.layer.add(new Konva.Line({ points:[mx-6,my+9,mx+6,my-9], stroke:col, strokeWidth:2, listening:false }));
    S.layer.add(new Konva.Line({ points:[mx,my+9,mx+12,my-3], stroke:col, strokeWidth:2, listening:false }));
  }
  addYearLabel(mx, my);
}

function drawNode(n){
  const g = new Konva.Group({ x:n.x, y:n.y, draggable:true });
  const col = nodeColor(n);
  const isSel = S.sel===n.id, isFrom = S.linkFrom===n.id;
  const isMultiSel = S.selected.has(n.id);
  const isHouseholdPick = !!(S.householdDraft && S.householdDraft.has(n.id));
  const sw = 2.4;
  const R = NW/2;

  let shape;
  if(n.gender==='female'){
    shape = new Konva.Circle({ radius:R, fill:'#fff', stroke:col, strokeWidth:sw });
    if(n.ip) g.add(new Konva.Circle({ radius:R+5, stroke:col, strokeWidth:1.2, listening:false }));
  } else if(n.gender==='unknown'){
    shape = new Konva.Line({ points:[0,-R, R,0, 0,R, -R,0], closed:true, fill:'#fff', stroke:col, strokeWidth:sw });
    if(n.ip) g.add(new Konva.Line({ points:[0,-R-5, R+5,0, 0,R+5, -R-5,0], closed:true, stroke:col, strokeWidth:1.2, listening:false }));
  } else {
    shape = new Konva.Rect({ x:-R, y:-R, width:NW, height:NW, fill:'#fff', stroke:col, strokeWidth:sw });
    if(n.ip) g.add(new Konva.Rect({ x:-R-5, y:-R-5, width:NW+10, height:NW+10, stroke:col, strokeWidth:1.2, listening:false }));
  }
  g.add(shape);

  const on = Object.keys(n.status||{}).filter(k=>n.status[k]);
  if(on.length){
    on.forEach((k,i)=>{
      const h = R / Math.max(on.length,1);
      g.add(new Konva.Rect({
        x:-R+3, y: i*h, width:NW-6, height:h,
        fill:STATUS[k].color, opacity:.3, listening:false
      }));
    });
  }
  if(n.alive===false){
    g.add(new Konva.Line({ points:[-R,-R, R,R], stroke:'#22332E', strokeWidth:2, listening:false }));
    g.add(new Konva.Line({ points:[R,-R, -R,R], stroke:'#22332E', strokeWidth:2, listening:false }));
  }
  if(isSel || isFrom || isMultiSel || isHouseholdPick){
    const sc = isFrom ? '#C15B47' : isHouseholdPick ? '#8A6FA8' : isMultiSel ? '#C99A3A' : '#6FA292';
    g.add(new Konva.Rect({
      x:-R-9, y:-R-9, width:NW+18, height:NW+18, cornerRadius:8,
      stroke:sc, strokeWidth:2, dash:[5,4], listening:false }));
  }

  /* 나이를 아이콘 안에 */
  const age = n.birth ? (new Date().getFullYear() - parseInt(n.birth)) : null;
  const ageText = (age!==null && !isNaN(age) && n.alive!==false) ? String(age) : '';
  if(ageText){
    g.add(new Konva.Text({
      x:-20, y:-8, width:40, align:'center',
      text:ageText, fontSize:15, fontWeight:'bold', fontFamily:'Pretendard', fill:'#22332E', listening:false
    }));
  }

  /* 필드 표시 (displayFields 체크박스에 따라) */
  let labelY = R + 6;
  const df = n.displayFields || {};
  if(n.ip){ g.add(new Konva.Text({ x:-60, y:labelY, width:120, align:'center', text:'중심인물', fontSize:10, fontStyle:'700', fontFamily:'Pretendard', fill:'#4C7A6D', listening:false })); labelY+=14; }
  const fieldMap = [
    ['name','이름'], ['relationship','관계'], ['education','학력'],
    ['symptoms','증상'], ['support','지지도'], ['residence','거주지'],
    ['family_history','가족력'], ['cause_of_death','사망원인']
  ];
  fieldMap.forEach(([key, label])=>{
    if(df[key] && n[key]){
      g.add(new Konva.Text({
        x:-70, y:labelY, width:140, align:'center',
        text: n[key].length > 12 ? n[key].slice(0,11)+'…' : n[key],
        fontSize:10, fontFamily:'Pretendard', fill:'#5B6E67', listening:false
      }));
      labelY += 13;
    }
  });

  /* 드래그 — 이동 중 리드로 없음 (성능 최적화), 놓을 때만 전체 갱신 */
  g.on('dragmove', ()=>{
    const dx = g.x() - n.x, dy = g.y() - n.y;
    n.x = Math.round(g.x()); n.y = Math.round(g.y());

    if(S.tool==='select' && S.selected.has(n.id) && S.selected.size>1){
      S.selected.forEach(sid=>{
        if(sid===n.id) return;
        const sn = S.geno.nodes[sid];
        if(sn){
          sn.x += dx; sn.y += dy;
          const sg = S.nodeGroups[sid];
          if(sg) sg.position({x:sn.x, y:sn.y});
        }
      });
    }
    /* 리드로 하지 않음 — Konva가 그룹 이동만 처리 */
  });
  g.on('dragend', ()=>{
    n.x = Math.round(g.x()); n.y = Math.round(g.y());
    if(S.tool==='select' && S.selected.has(n.id) && S.selected.size>1){
      S.selected.forEach(sid=>{
        const sn = S.geno.nodes[sid]; if(sn) saveNodePos(sn);
      });
    } else {
      saveNodePos(n);
    }
    draw(); /* 놓을 때 관계선 포함 전체 갱신 */
  });
  g.on('click tap', e=>{
    e.cancelBubble = true;
    if(S.tool==='eraser'){
      if(confirm(`이 인물(${n.name||'이름 없음'})과 연결된 관계선을 모두 삭제할까요?`)){
        delNodeDirect(n.id);
      }
      return;
    }
    if(S.tool==='select'){
      if(e.evt && e.evt.shiftKey){
        if(S.selected.has(n.id)) S.selected.delete(n.id);
        else S.selected.add(n.id);
      } else {
        S.selected.clear(); S.selected.add(n.id);
      }
      draw(); return;
    }
    if(S.tool==='household'){
      if(!S.householdDraft) S.householdDraft = new Set();
      if(S.householdDraft.has(n.id)) S.householdDraft.delete(n.id);
      else S.householdDraft.add(n.id);
      draw();
      return;
    }
    if(S.tool==='link'){
      /* 자녀 연속 등록 모드 중이면 바로 자녀 추가 */
      if(S.childMode && n.id !== S.childMode.parentId){
        addChildDirect(n.id);
        return;
      }
      if(S.childMode && n.id === S.childMode.parentId){
        /* 부모를 다시 탭하면 연속 모드 종료 */
        S.childMode = null; S.linkFrom = null;
        hint('연속 등록을 마쳤습니다.'); draw(); return;
      }
      if(!S.linkFrom){ S.linkFrom = n.id; hint('두 번째 인물을 탭하세요.'); draw(); }
      else if(S.linkFrom === n.id){ S.linkFrom = null; draw(); }
      else { openRelPicker(S.linkFrom, n.id); }
      return;
    }
    /* 클릭/탭은 선택만. 정보 입력·가족 추가 등은 우클릭 메뉴로만 수행 */
    S.sel = n.id; draw();
  });

  /* [이식] 데스크톱 우클릭 → 방사형 메뉴 */
  g.on('contextmenu', e=>{
    e.evt.preventDefault();
    e.cancelBubble = true;
    if(e.evt.stopPropagation) e.evt.stopPropagation();
    /* draw()를 호출하면 이 노드 그룹이 파괴되어 메뉴 좌표가 꼬이므로,
       선택 값만 갱신하고 즉시 메뉴를 띄운다 (재렌더는 메뉴 동작 시 수행) */
    S.sel = n.id;
    showCtxMenu(n.id, e.evt.clientX, e.evt.clientY);
  });

  S.layer.add(g);
  S.nodeGroups[n.id] = g;
}

function zoomBy(f){
  if(!S.stage) return;
  const s = Math.max(.25, Math.min(3, S.stage.scaleX()*f));
  const c = { x:S.stage.width()/2, y:S.stage.height()/2 };
  const to = { x:(c.x-S.stage.x())/S.stage.scaleX(), y:(c.y-S.stage.y())/S.stage.scaleY() };
  S.stage.scale({x:s,y:s});
  S.stage.position({ x:c.x-to.x*s, y:c.y-to.y*s });
}
function fitView(){
  if(!S.stage) return;
  const ns = Object.values(S.geno.nodes);
  if(!ns.length){ S.stage.scale({x:1,y:1}); S.stage.position({x:S.stage.width()/2, y:S.stage.height()/2}); return; }
  const pad = 70;
  const minX=Math.min(...ns.map(n=>n.x))-pad, maxX=Math.max(...ns.map(n=>n.x))+pad;
  const minY=Math.min(...ns.map(n=>n.y))-pad, maxY=Math.max(...ns.map(n=>n.y))+pad;
  const s = Math.min(S.stage.width()/(maxX-minX), S.stage.height()/(maxY-minY), 1.6);
  S.stage.scale({x:s,y:s});
  S.stage.position({
    x:(S.stage.width() - (maxX-minX)*s)/2 - minX*s,
    y:(S.stage.height()- (maxY-minY)*s)/2 - minY*s
  });
}

