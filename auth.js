/* ============================================================
   auth.js — [계정연동] 인증·PIN
   로그인/가입/기관생성/승인대기/라우팅/PIN
   ============================================================ */

function switchAuth(mode){
  setMsg('');
  ['formLogin','formSignup','formOrg','formResume'].forEach(f=>$(f).classList.add('hide'));
  $('authTabs').classList.toggle('hide', mode==='resume');
  $('tabLogin').classList.toggle('on', mode==='login');
  $('tabSignup').classList.toggle('on', mode!=='login');
  if(mode==='login') $('formLogin').classList.remove('hide');
  else if(mode==='signup') $('formSignup').classList.remove('hide');
  else if(mode==='org') $('formOrg').classList.remove('hide');
  else $('formResume').classList.remove('hide');
}

async function doLogin(){
  const email = $('liEmail').value.trim(), pw = $('liPw').value;
  if(!email || !pw){ setMsg('이메일과 비밀번호를 모두 입력해 주세요.'); return; }
  setMsg(''); $('btnLogin').disabled = true;
  try{ await auth.signInWithEmailAndPassword(email, pw); }
  catch(e){ setMsg(authErr(e)); }
  $('btnLogin').disabled = false;
}

/* 코드 → 기관 확인 후 users + orgMembers 이중 기록 */
async function registerMember(user, name, code){
  let orgId = null;
  try{ const s = await db.ref('orgCodes/'+code).once('value'); orgId = s.val(); }catch(e){}
  if(!orgId){
    setMsg('가입코드와 일치하는 기관이 없습니다. 코드를 다시 확인해 주세요.');
    try{ await user.delete(); }catch(e){ await auth.signOut(); }   // 유령 계정 방지 (수정 #6 계열)
    return false;
  }
  const rec = { name, email:user.email, orgId, role:'member', approved:false, createdAt:Date.now() };
  try{
    await db.ref('users/'+user.uid).set(rec);
    await db.ref('orgMembers/'+orgId+'/'+user.uid).set({
      name, email:user.email, role:'member', approved:false, createdAt:rec.createdAt
    });
  }catch(e){ setMsg('가입 처리 중 문제가 발생했습니다. 아래 "가입 마무리"로 다시 시도해 주세요.'); return false; }
  return true;
}

async function doSignup(){
  const name = $('suName').value.trim();
  const code = $('suCode').value.trim().toUpperCase();
  const email= $('suEmail').value.trim();
  const pw   = $('suPw').value;
  if(!name || !code || !email || !pw){ setMsg('모든 항목을 입력해 주세요.'); return; }
  setMsg(''); $('btnSignup').disabled = true; authBusy = true;

  let cred;
  try{ cred = await auth.createUserWithEmailAndPassword(email, pw); }
  catch(e){ setMsg(authErr(e)); $('btnSignup').disabled=false; authBusy=false; return; }

  const ok = await registerMember(cred.user, name, code);
  $('btnSignup').disabled = false; authBusy = false;
  if(ok) routeUser(cred.user);
}

/* 가입이 중간에 끊긴 계정 마무리 */
async function doResume(){
  const name = $('rsName').value.trim();
  const code = $('rsCode').value.trim().toUpperCase();
  if(!name || !code){ setMsg('이름과 가입코드를 입력해 주세요.'); return; }
  const user = auth.currentUser;
  if(!user){ location.reload(); return; }
  $('btnResume').disabled = true;
  const ok = await registerMember(user, name, code);
  $('btnResume').disabled = false;
  if(ok) routeUser(user);
}

async function doCreateOrg(){
  const orgName = $('orgName').value.trim();
  const name    = $('orgAdmin').value.trim();
  const email   = $('orgEmail').value.trim();
  const pw      = $('orgPw').value;
  if(!orgName || !name || !email || !pw){ setMsg('모든 항목을 입력해 주세요.'); return; }
  setMsg(''); $('btnOrg').disabled = true; authBusy = true;

  let cred;
  try{ cred = await auth.createUserWithEmailAndPassword(email, pw); }
  catch(e){ setMsg(authErr(e)); $('btnOrg').disabled=false; authBusy=false; return; }

  try{
    const orgId = db.ref('orgs').push().key;
    await db.ref('orgs/'+orgId).set({ name:orgName, ownerUid:cred.user.uid, createdAt:Date.now() });

    // 가입코드 발급 (충돌 시 재생성 — 규칙이 중복 생성을 거부)
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = null;
    for(let i=0; i<5 && !code; i++){
      const c = Array.from({length:6},()=>A[Math.floor(Math.random()*A.length)]).join('');
      try{ await db.ref('orgCodes/'+c).set(orgId); code = c; }catch(e){}
    }
    if(!code) throw new Error('code');
    await db.ref('orgPrivate/'+orgId).set({ joinCode:code });

    await db.ref('users/'+cred.user.uid).set({
      name, email, orgId, role:'admin', approved:true, createdAt:Date.now()
    });
    await db.ref('orgMembers/'+orgId+'/'+cred.user.uid).set({
      name, email, role:'admin', approved:true, createdAt:Date.now()
    });
    authBusy = false; $('btnOrg').disabled = false;
    routeUser(cred.user);
  }catch(e){
    authBusy = false; $('btnOrg').disabled = false;
    setMsg('기관 등록 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.');
  }
}

async function doReset(){
  const email = $('liEmail').value.trim();
  if(!email){ setMsg('비밀번호를 재설정할 이메일을 먼저 입력해 주세요.'); return; }
  try{
    await auth.sendPasswordResetEmail(email);
    setMsg('재설정 메일을 보냈습니다. 받은편지함을 확인해 주세요.','ok');
  }catch(e){ setMsg(authErr(e)); }
}

function doLogout(){
  sessionStorage.removeItem(PIN_KEY);
  auth.signOut().then(()=>location.reload());
}

/* ── 승인 대기 / 거절 화면 ── */
function showPending(kind){
  if(kind==='rejected'){
    $('pendTitle').textContent = '가입이 승인되지 않았습니다';
    $('pendText').innerHTML = `<b style="color:var(--sage-deep);">${esc(S.org.name)}</b> 관리자가 가입을 거절했습니다.<br>다시 신청하거나 관리자에게 문의하세요.`;
    $('pendReapply').hidden = false;
  }else{
    $('pendTitle').textContent = '승인을 기다리는 중입니다';
    $('pendText').innerHTML = `<b style="color:var(--sage-deep);">${esc(S.org.name)}</b> 관리자가 계정을 승인하면<br>바로 이용할 수 있습니다.`;
    $('pendReapply').hidden = true;
  }
  show('viewPending');
}
async function reapply(){
  try{
    await db.ref('users/'+S.uid+'/rejected').set(false);
    await db.ref('orgMembers/'+S.me.orgId+'/'+S.uid+'/rejected').set(false);
    toast('다시 신청했습니다.');
    showPending('wait');
  }catch(e){ toast('신청에 실패했습니다.'); }
}

/* ── 라우팅 ── */
async function routeUser(user){
  S.uid = user.uid;
  let uSnap;
  try{ uSnap = await db.ref('users/'+user.uid).once('value'); }
  catch(e){ toast('계정 정보를 불러오지 못했습니다.'); show('viewAuth'); switchAuth('login'); return; }

  if(!uSnap.exists()){                 // 가입이 중간에 끊긴 계정 → 마무리 폼 (수정 #6 계열)
    show('viewAuth'); switchAuth('resume'); return;
  }
  S.me = uSnap.val();

  const oSnap = await db.ref('orgs/'+S.me.orgId).once('value');
  S.org = oSnap.val() || { name:'(기관 정보 없음)' };

  if(S.me.rejected){ showPending('rejected'); return; }
  if(!S.me.approved){ showPending('wait'); return; }
  if(!S.me.pinHash){ startPin('set'); return; }
  if(sessionStorage.getItem(PIN_KEY) === user.uid){ enterApp(); return; }
  startPin('verify');
}

auth.onAuthStateChanged(user => {
  $('boot').classList.add('hide');
  if(authBusy) return;                 // 가입 흐름이 직접 routeUser 호출
  if(!user){ show('viewAuth'); switchAuth('login'); return; }
  routeUser(user);
});

/* ═══ PIN ═══ */
function startPin(mode){
  S.pinMode = mode; S.pinBuf = ''; S._pinFirst = null;
  const t = { set:['PIN을 설정하세요','앱을 열 때마다 이 6자리를 입력합니다.'],
              verify:['PIN 입력','내담자 정보를 보호합니다. 6자리 PIN을 입력하세요.'],
              change:['새 PIN을 설정하세요','바꿀 6자리 PIN을 입력하세요.'] }[mode];
  $('pinTitle').textContent = t[0];
  $('pinSub').textContent   = t[1];
  buildPad(); paintDots();
  show('viewPin');
}
function buildPad(){
  const pad = $('pinPad'); pad.innerHTML='';
  [1,2,3,4,5,6,7,8,9,'','0','←'].forEach(k=>{
    const b = document.createElement('button');
    if(k===''){ b.className='blank'; b.disabled=true; }
    else { b.textContent = k; b.onclick = () => k==='←' ? pinDel() : pinAdd(String(k)); }
    pad.appendChild(b);
  });
}
/* 키보드 숫자키·백스페이스로 PIN 입력 */
document.addEventListener('keydown', e=>{
  if(!$('viewPin') || $('viewPin').classList.contains('hide')) return;
  if(e.key >= '0' && e.key <= '9') pinAdd(e.key);
  else if(e.key === 'Backspace') pinDel();
});
function paintDots(){
  [...$('pinDots').children].forEach((d,i)=> d.classList.toggle('on', i < S.pinBuf.length));
}
function pinAdd(n){
  if(S.pinBuf.length>=6) return;
  S.pinBuf += n; paintDots();
  if(S.pinBuf.length===6) setTimeout(pinSubmit,140);
}
function pinDel(){ S.pinBuf = S.pinBuf.slice(0,-1); paintDots(); }
function pinFail(msg){
  $('pinCard').classList.add('shake');
  setTimeout(()=>$('pinCard').classList.remove('shake'),340);
  S.pinBuf=''; paintDots(); toast(msg);
}
async function pinSubmit(){
  const pin = S.pinBuf;
  if(S.pinMode==='verify'){
    const h = await pinHash(pin);
    if(h === S.me.pinHash){ sessionStorage.setItem(PIN_KEY, S.uid); enterApp(); }
    else pinFail('PIN이 맞지 않습니다.');
    return;
  }
  if(!S._pinFirst){
    S._pinFirst = pin; S.pinBuf=''; paintDots();
    $('pinTitle').textContent = 'PIN 확인';
    $('pinSub').textContent   = '한 번 더 입력해 주세요.';
    return;
  }
  if(S._pinFirst !== pin){
    S._pinFirst = null;
    $('pinTitle').textContent = S.pinMode==='set' ? 'PIN을 설정하세요' : '새 PIN을 설정하세요';
    $('pinSub').textContent   = '처음부터 다시 입력해 주세요.';
    pinFail('두 번 입력한 PIN이 다릅니다.');
    return;
  }
  const h = await pinHash(pin);
  try{ await db.ref('users/'+S.uid+'/pinHash').set(h); }
  catch(e){ pinFail('PIN 저장에 실패했습니다.'); return; }
  S.me.pinHash = h;
  sessionStorage.setItem(PIN_KEY, S.uid);
  toast('PIN이 설정되었습니다.');
  enterApp();
}
function openPinChange(){ sessionStorage.removeItem(PIN_KEY); startPin('change'); }

/* ═══════════════════════════════════════════════════════════════
   앱 진입 · 케이스 목록  (구조: cases/{orgId}/{caseId} = 수정 #1)
   ═══════════════════════════════════════════════════════════════ */
