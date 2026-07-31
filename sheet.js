/* ============================================================
   sheet.js — [기능] 편집 시트
   인물 정보 시트, 관계선 편집, 저장/삭제
   ============================================================ */

/* ═══ 시트: 인물 / 관계선 ═══ */
function openSheet(html){
  $('sheetBody').innerHTML = html;
  $('dim').classList.add('on'); $('sheet').classList.add('on');
}
function closeSheet(){
  $('dim').classList.remove('on'); $('sheet').classList.remove('on');
}

function openPerson(id){
  const n = S.geno.nodes[id]; if(!n) return;
  const createdDate = n.createdAt ? new Date(n.createdAt).toLocaleDateString('ko-KR') : '—';
  openSheet(`
    <h3>인물 편집</h3>
    <div class="sub">가계도에서 탭한 인물의 정보를 입력합니다.</div>
    
    <div style="font-size:11.5px;color:var(--ink-soft);padding:8px 0;border-bottom:1px solid var(--line);margin-bottom:14px;">
      작성일: <b>${esc(createdDate)}</b>
    </div>

    <div class="fld"><label>이름</label>
      <input id="pName" class="inp" value="${esc(n.name||'')}" placeholder="예) 김○수"></div>
    <div class="fld"><label>성별</label>
      <div class="seg" id="pGender">
        <button data-v="male" class="${n.gender==='male'?'on':''}">■ 남성</button>
        <button data-v="female" class="${n.gender==='female'?'on':''}">● 여성</button>
        <button data-v="unknown" class="${n.gender==='unknown'?'on':''}">◆ 미상</button>
      </div></div>
    <div class="row2">
      <div class="fld"><label>출생연도</label>
        <input id="pBirth" class="inp" type="number" inputmode="numeric" value="${esc(n.birth||'')}" placeholder="1975"></div>
      <div class="fld"><label>생존 여부</label>
        <div class="seg" id="pAlive">
          <button data-v="1" class="${n.alive!==false?'on':''}">생존</button>
          <button data-v="0" class="${n.alive===false?'on':''}">사망</button>
        </div></div>
    </div>
    <div class="fld"><label>상태 코딩 (복수 선택)</label>
      <div class="tagrid" id="pStatus">
        ${Object.entries(STATUS).map(([k,v])=>`
          <button class="stag ${n.status?.[k]?'on':''}" data-k="${k}"
            style="${n.status?.[k]?`color:${v.color};background:${v.color}18;`:''}">
            <i style="background:${v.color}"></i>${v.label}
          </button>`).join('')}
      </div></div>
    <div class="fld"><label>중심인물 (IP)</label>
      <div class="seg" id="pIp">
        <button data-v="0" class="${!n.ip?'on':''}">아니오</button>
        <button data-v="1" class="${n.ip?'on':''}">중심인물로 표시</button>
      </div></div>

    <div style="border-top:1px solid var(--line);margin:18px 0 14px;padding-top:14px;font-size:12.5px;font-weight:700;color:var(--ink-soft);">기본 정보</div>
    
    <div class="fld"><label>학력</label>
      <input id="pEducation" class="inp" value="${esc(n.education||'')}" placeholder="예) 고졸, 대졸, 대학원"></div>
    <div class="fld"><label>관계 (가족 내 역할)</label>
      <input id="pRelationship" class="inp" value="${esc(n.relationship||'')}" placeholder="예) 막내, 장녀, 며느리"></div>
    <div class="fld"><label>거주지</label>
      <input id="pResidence" class="inp" value="${esc(n.residence||'')}" placeholder="예) 공주시, 대전시"></div>

    <div style="border-top:1px solid var(--line);margin:18px 0 14px;padding-top:14px;font-size:12.5px;font-weight:700;color:var(--ink-soft);">건강 & 지지</div>
    
    <div class="fld"><label>주요증상</label>
      <textarea id="pSymptoms" class="inp" placeholder="우울감, 불안, 약물사용 등 주요 증상">${esc(n.symptoms||'')}</textarea></div>
    <div class="fld"><label>지지도 (사회적 지지)</label>
      <input id="pSupport" class="inp" value="${esc(n.support||'')}" placeholder="예) 낮음, 중간, 높음 또는 구체적 지지 자원"></div>
    <div class="fld"><label>가족력</label>
      <textarea id="pFamilyHistory" class="inp" placeholder="정신질환, 물질사용, 자살시도 등 가족력">${esc(n.family_history||'')}</textarea></div>
    
    ${n.alive===false ? `<div class="fld"><label>사망원인</label>
      <input id="pCauseOfDeath" class="inp" value="${esc(n.cause_of_death||'')}" placeholder="질병, 사고, 자살 등"></div>` : ''}

    <div style="border-top:1px solid var(--line);margin:18px 0 14px;padding-top:14px;font-size:12.5px;font-weight:700;color:var(--ink-soft);">추가 메모</div>
    
    <div class="fld"><label>사례 기록</label>
      <textarea id="pMemo" class="inp" placeholder="기타 관찰 내용, 주요 사건 등">${esc(n.memo||'')}</textarea></div>

    <div style="border-top:1px solid var(--line);margin:18px 0 14px;padding-top:14px;font-size:12.5px;font-weight:700;color:var(--ink-soft);">가계도에 표시할 항목</div>
    <div style="display:flex;flex-wrap:wrap;gap:8px;" id="pDisplayFields">
      ${[['name','이름'],['relationship','관계'],['education','학력'],['symptoms','증상'],['support','지지도'],['residence','거주지'],['family_history','가족력'],['cause_of_death','사망원인']].map(([k,lb])=>`
        <label style="display:flex;align-items:center;gap:5px;font-size:12.5px;cursor:pointer;padding:6px 10px;border-radius:10px;border:1px solid var(--line);background:var(--white);">
          <input type="checkbox" data-dk="${k}" ${(n.displayFields||{})[k]?'checked':''} style="accent-color:var(--sage-deep);"> ${lb}
        </label>`).join('')}
    </div>
    <div style="font-size:11px;color:var(--muted);margin-top:6px;line-height:1.5;">체크한 항목이 가계도 아이콘 아래에 표시됩니다.</div>
    
    <div class="sheet-acts">
      <button class="btn ghost" style="color:var(--danger);border-color:#EBC8C0;" onclick="delNode('${id}')">삭제</button>
      <button class="btn" onclick="savePerson('${id}')">저장하기</button>
    </div>
  `);
  ['pGender','pAlive','pIp'].forEach(segBind);
  $('pStatus').querySelectorAll('.stag').forEach(b=>{
    b.onclick = () => {
      const k=b.dataset.k, c=STATUS[k].color, on=b.classList.toggle('on');
      b.style.cssText = on ? `color:${c};background:${c}18;border-color:${c};` : '';
    };
  });
}
function savePerson(id){
  const n = S.geno.nodes[id]; if(!n) return;
  n.name  = $('pName').value.trim();
  n.gender= segVal('pGender');
  n.birth = $('pBirth').value.trim();
  n.alive = segVal('pAlive')==='1';
  n.ip    = segVal('pIp')==='1';
  n.memo  = $('pMemo').value.trim();
  
  // 필수 #3: 새 필드 저장
  n.education     = $('pEducation').value.trim();
  n.relationship  = $('pRelationship').value.trim();
  n.symptoms      = $('pSymptoms').value.trim();
  n.support       = $('pSupport').value.trim();
  n.family_history= $('pFamilyHistory').value.trim();
  n.residence     = $('pResidence').value.trim();
  if($('pCauseOfDeath')) n.cause_of_death = $('pCauseOfDeath').value.trim();
  n.updatedAt     = Date.now();
  
  // displayFields 체크박스 저장
  const df = {};
  $('pDisplayFields').querySelectorAll('input[type=checkbox]').forEach(cb=>{
    if(cb.checked) df[cb.dataset.dk] = true;
  });
  n.displayFields = df;
  
  const st = {};
  $('pStatus').querySelectorAll('.stag.on').forEach(b=> st[b.dataset.k]=true);
  n.status = st;

  /* 수정 #7: 이 인물 + IP 해제된 인물만 부분 저장 */
  const upd = { ['nodes/'+id]: n };
  if(n.ip) Object.values(S.geno.nodes).forEach(o=>{
    if(o.id!==id && o.ip){ o.ip=false; upd['nodes/'+o.id+'/ip']=false; }
  });
  db.ref(genoPath()).update(upd).catch(errSave);
  metaSave();
  draw(); closeSheet(); toast('저장했습니다.');
}
function delNode(id){
  if(!confirm('이 인물과 연결된 관계선을 모두 지울까요?')) return;
  const upd = { ['nodes/'+id]: null };
  delete S.geno.nodes[id];
  Object.entries(S.geno.links).forEach(([lid,l])=>{
    if(l.a===id || l.b===id){ delete S.geno.links[lid]; upd['links/'+lid]=null; }
  });
  db.ref(genoPath()).update(upd).catch(errSave);
  metaSave();
  S.sel=null; draw(); closeSheet(); toast('삭제했습니다.');
}

/* 지우개에서 직접 삭제 (confirm은 drawNode에서 이미 함) */
function delNodeDirect(id){
  const upd = { ['nodes/'+id]: null };
  delete S.geno.nodes[id];
  Object.entries(S.geno.links).forEach(([lid,l])=>{
    if(l.a===id || l.b===id){ delete S.geno.links[lid]; upd['links/'+lid]=null; }
  });
  db.ref(genoPath()).update(upd).catch(errSave);
  metaSave(); S.sel=null; draw(); toast('삭제했습니다.');
}

function openRelPicker(aId, bId){
  const a=S.geno.nodes[aId], b=S.geno.nodes[bId];
  const sym = {
    marriage:   `<svg width="44" height="20"><line x1="2" y1="10" x2="42" y2="10" stroke="#22332E" stroke-width="2"/></svg>`,
    cohabit:    `<svg width="44" height="20"><line x1="2" y1="10" x2="42" y2="10" stroke="#22332E" stroke-width="2" stroke-dasharray="6 4"/></svg>`,
    separated:  `<svg width="44" height="20"><line x1="2" y1="10" x2="42" y2="10" stroke="#22332E" stroke-width="2"/><line x1="22" y1="3" x2="22" y2="17" stroke="#22332E" stroke-width="2" transform="rotate(20 22 10)"/></svg>`,
    divorced:   `<svg width="44" height="20"><line x1="2" y1="10" x2="42" y2="10" stroke="#22332E" stroke-width="2"/><line x1="18" y1="3" x2="18" y2="17" stroke="#22332E" stroke-width="2" transform="rotate(20 18 10)"/><line x1="26" y1="3" x2="26" y2="17" stroke="#22332E" stroke-width="2" transform="rotate(20 26 10)"/></svg>`,
    remarriage: `<svg width="44" height="20"><line x1="2" y1="10" x2="42" y2="10" stroke="#22332E" stroke-width="2"/><line x1="16" y1="3" x2="16" y2="17" stroke="#22332E" stroke-width="2" transform="rotate(20 16 10)"/><path d="M24 10l6-4v8z" fill="#22332E"/></svg>`,
    child:      `<svg width="44" height="20"><path d="M8 2 v8 h28 v8" fill="none" stroke="#22332E" stroke-width="2"/></svg>`,
    adopted:    `<svg width="44" height="20"><path d="M8 2 v8 h28 v8" fill="none" stroke="#22332E" stroke-width="2" stroke-dasharray="5 3"/></svg>`,
    close:      `<svg width="44" height="20"><line x1="2" y1="7" x2="42" y2="7" stroke="#4C7A6D" stroke-width="2"/><line x1="2" y1="13" x2="42" y2="13" stroke="#4C7A6D" stroke-width="2"/></svg>`,
    conflict:   `<svg width="44" height="20"><path d="M2 10 l6-5 6 10 6-10 6 10 6-10 6 5" fill="none" stroke="#C15B47" stroke-width="2"/></svg>`,
    cutoff:     `<svg width="44" height="20"><line x1="2" y1="10" x2="42" y2="10" stroke="#7A8B85" stroke-width="2" stroke-dasharray="8 6"/><line x1="17" y1="4" x2="27" y2="16" stroke="#7A8B85" stroke-width="2"/><line x1="27" y1="4" x2="17" y2="16" stroke="#7A8B85" stroke-width="2"/></svg>`,
    distant:    `<svg width="44" height="20"><line x1="2" y1="10" x2="42" y2="10" stroke="#8A6FA8" stroke-width="2" stroke-dasharray="3 5"/></svg>`,
    complex:    `<svg width="44" height="20"><line x1="2" y1="6" x2="42" y2="6" stroke="#4C7A6D" stroke-width="1.5"/><path d="M2 14 l5-3 5 6 5-6 5 6 5-6 5 6 5-3" fill="none" stroke="#C15B47" stroke-width="1.5"/></svg>`
  };
  const group = (title, keys) => `
    <div style="font-size:12px;font-weight:700;color:var(--ink-soft);margin:14px 0 8px;">${title}</div>
    <div class="rel-list">
      ${keys.map(k=>`
        <button class="rel-item" onclick="promptYear('${aId}','${bId}','${k}')">
          <span class="rl-sym">${sym[k]||''}</span>
          <span><b>${RELS[k].label}</b><small>${RELS[k].desc}</small></span>
        </button>`).join('')}
    </div>`;
  openSheet(`
    <h3>관계 설정</h3>
    <div class="sub"><b>${esc(a.name||'이름 없음')}</b> → <b>${esc(b.name||'이름 없음')}</b> 사이의 관계를 고르세요.<br>
      자녀·입양은 <b>앞사람이 부모</b>, 뒷사람이 자녀입니다.</div>
    ${group('부부 · 커플', ['marriage','cohabit','separated','divorced','remarriage'])}
    ${group('자녀', ['child','adopted'])}
    ${group('정서적 관계', ['close','conflict','cutoff','distant','complex'])}
    <div id="yearPrompt" class="hide" style="margin-top:16px;padding-top:14px;border-top:1px solid var(--line);">
      <div class="row2">
        <div class="fld"><label>시작 연도 (선택)</label>
          <input id="rlYearStart" class="inp" type="number" inputmode="numeric" placeholder="예) 1998"></div>
        <div class="fld"><label>종료 연도 (선택)</label>
          <input id="rlYearEnd" class="inp" type="number" inputmode="numeric" placeholder="예) 2015"></div>
      </div>
      <button class="btn" id="rlConfirm">관계 추가하기</button>
    </div>
  `);
}
/* 관계 선택 → 연도 입력란 표시 → 확인 시 추가 */
let _pendingRel = {};
function promptYear(a,b,type){
  _pendingRel = {a,b,type};
  $('yearPrompt').classList.remove('hide');
  $('rlYearStart').value = '';
  $('rlYearEnd').value = '';
  $('rlConfirm').onclick = ()=>{
    const ys = $('rlYearStart').value.trim();
    const ye = $('rlYearEnd').value.trim();
    addLink(a,b,type, ys||'', ye||'');
  };
  $('yearPrompt').scrollIntoView({behavior:'smooth'});
}

function addLink(a,b,type, yearStart, yearEnd){
  const kind = RELS[type].kind;
  const upd = {};
  /* 같은 종류의 기존 관계 제거 (재혼은 여러 개 허용, 자녀도 여러 개 허용) */
  if(type!=='remarriage' && kind!=='child'){
    Object.entries(S.geno.links).forEach(([lid,l])=>{
      const same = (l.a===a&&l.b===b) || (l.a===b&&l.b===a);
      if(same && RELS[l.type]?.kind===kind){ delete S.geno.links[lid]; upd['links/'+lid]=null; }
    });
  }
  const id = uid();
  const link = { id, a, b, type };
  if(yearStart) link.yearStart = yearStart;
  if(yearEnd) link.yearEnd = yearEnd;
  S.geno.links[id] = link;
  upd['links/'+id] = link;
  db.ref(genoPath()).update(upd).catch(errSave);
  metaSave();

  /* 자녀·입양 관계면 연속 등록 모드 진입 */
  if(kind==='child'){
    S.childMode = { parentId:a, type, yearStart:yearStart||'', yearEnd:yearEnd||'' };
    S.linkFrom = a;   // 부모 선택 유지
    draw(); closeSheet();
    const parentName = S.geno.nodes[a]?.name || '이름 없음';
    toast(`${RELS[type].label} 연결 완료`);
    hint(`다음 자녀를 탭하세요 · ${parentName}(부모) 탭하면 종료`);
    return;
  }

  S.linkFrom=null; S.childMode=null; draw(); closeSheet();
  toast(`${RELS[type].label} 관계를 연결했습니다.`);
}

/* ══════════════════════════════════════════════════════════
   [이식] 데스크톱 우클릭 조작 — 가족 원클릭 추가 / 관계선 / 삭제
   기존 기능은 그대로 두고, PC에서 편하게 쓰도록 추가한 계층
   ══════════════════════════════════════════════════════════ */

/* 정보창을 열지 않고 조용히 노드만 생성 (우클릭 메뉴용) */
