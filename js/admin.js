/* ============================================================
   admin.js — [기능] 관리자
   구성원 승인/역할, 케이스 공개설정, 초대코드
   ============================================================ */

function loadAdmin(){
  db.ref('orgPrivate/'+S.me.orgId+'/joinCode').once('value')
    .then(s=>{ S.joinCode = s.val() || '——————'; $('adminCode').textContent = S.joinCode; })
    .catch(()=>{ $('adminCode').textContent = '——————'; });

  if(membersRef) membersRef.off();          // 수정 #5
  membersRef = db.ref('orgMembers/'+S.me.orgId);
  membersRef.on('value', snap=>{
    const users = snap.val() || {};
    const wait=[], mem=[];
    Object.entries(users).forEach(([u,rec])=>{
      if(rec.approved) mem.push([u,rec]);
      else if(!rec.rejected) wait.push([u,rec]);   // 거절된 계정은 목록에서 제외 (재신청 시 복귀)
    });

    $('waitCnt').textContent = wait.length ? `${wait.length}명` : '';
    $('memCnt').textContent  = mem.length  ? `${mem.length}명`  : '';

    $('waitList').innerHTML = wait.length ? wait.map(([u,r])=>`
      <div class="usr">
        <div class="avatar">${esc((r.name||'?').slice(0,1))}</div>
        <div class="ub"><b>${esc(r.name)}</b><small>${esc(r.email)}</small></div>
        <button class="btn sm" onclick="approve('${u}',true)">승인</button>
        <button class="btn sm ghost" onclick="approve('${u}',false)">거절</button>
      </div>`).join('')
      : `<p style="font-size:13px;color:var(--muted);padding:6px 2px;">대기 중인 신청이 없습니다.</p>`;

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
  }, err => toast('직원 목록을 불러오지 못했습니다.'));

  $('superAdminPanel').classList.toggle('hide', !S.me.superAdmin);
  if(S.me.superAdmin) loadOrgList();
}

/* 수정 #6: 거절 = 삭제가 아니라 rejected 마킹 (재가입 가능) */
async function approve(u, ok){
  const org = S.me.orgId;
  try{
    if(ok){
      await db.ref().update({
        ['users/'+u+'/approved']: true,  ['users/'+u+'/rejected']: null,
        ['orgMembers/'+org+'/'+u+'/approved']: true, ['orgMembers/'+org+'/'+u+'/rejected']: null
      });
      toast('승인했습니다.');
    }else{
      if(!confirm('이 신청을 거절할까요? 신청자는 다시 신청할 수 있습니다.')) return;
      await db.ref().update({
        ['users/'+u+'/rejected']: true,
        ['orgMembers/'+org+'/'+u+'/rejected']: true
      });
      toast('거절했습니다.');
    }
  }catch(e){ toast('처리에 실패했습니다.'); }
}
async function toggleRole(u, cur){
  const next = cur==='admin' ? 'member' : 'admin';
  if(!confirm(next==='admin' ? '이 직원에게 관리자 권한을 줄까요?' : '관리자 권한을 해제할까요?')) return;
  try{
    await db.ref().update({
      ['users/'+u+'/role']: next,
      ['orgMembers/'+S.me.orgId+'/'+u+'/role']: next
    });
    toast('권한을 바꿨습니다.');
  }catch(e){ toast('처리에 실패했습니다.'); }
}
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
function renderAdminCases(all){
  const list = Object.entries(all).sort((a,b)=>(b[1].updatedAt||0)-(a[1].updatedAt||0));
  $('adminCases').innerHTML = list.length ? list.map(([id,c])=>`
    <div class="usr">
      <div class="ub"><b>${esc(c.title)}</b><small>담당 ${esc(c.ownerName||'—')} · ${c.count||0}명</small></div>
      <span class="badge ${c.visibility==='org'?'':'wait'}">${c.visibility==='org'?'기관 공유':'비공개'}</span>
      <button class="btn sm ghost" onclick="flipVis('${id}','${c.visibility}')">
        ${c.visibility==='org'?'비공개로':'공유로'}</button>
    </div>`).join('')
    : `<p style="font-size:13px;color:var(--muted);padding:6px 2px;">등록된 케이스가 없습니다.</p>`;
}
async function flipVis(id, cur){
  try{
    await db.ref(casePath(id)).update({ visibility: cur==='org' ? 'private' : 'org' });
    toast('공개범위를 바꿨습니다.');
  }catch(e){ toast('처리에 실패했습니다.'); }
}
function copyCode(){
  navigator.clipboard.writeText(S.joinCode||'')
    .then(()=>toast('가입코드를 복사했습니다.'))
    .catch(()=>toast('복사에 실패했습니다.'));
}

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

