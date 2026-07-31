/* ============================================================
   utils.js — 공통 유틸
   toast, show, esc, pinHash, timeAgo, authErr, setMsg
   ============================================================ */

/* ═══ 유틸 ═══ */
const $ = id => document.getElementById(id);
const esc = s => String(s??'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function toast(m){ const t=$('toast'); t.textContent=m; t.classList.add('on'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('on'),2200); }
function show(id){
  ['viewAuth','viewPending','viewPin'].forEach(v=>$(v).classList.add('hide'));
  $('app').classList.remove('on'); $('viewCanvas').classList.remove('on');
  if(id==='app') $('app').classList.add('on');
  else if(id==='viewCanvas') $('viewCanvas').classList.add('on');
  else $(id).classList.remove('hide');
}
/* 수정 #8: uid를 솔트로 섞은 PIN 해시 */
async function pinHash(pin){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(S.uid + ':' + pin));
  return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
}
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
function timeAgo(ts){
  if(!ts) return '';
  const d = Date.now()-ts, m=6e4, h=36e5, day=864e5;
  if(d<m) return '방금';
  if(d<h) return Math.floor(d/m)+'분 전';
  if(d<day) return Math.floor(d/h)+'시간 전';
  if(d<7*day) return Math.floor(d/day)+'일 전';
  return new Date(ts).toLocaleDateString('ko-KR',{month:'numeric',day:'numeric'});
}
function authErr(e){
  const m = {
    'auth/invalid-email':'이메일 형식이 올바르지 않습니다.',
    'auth/user-not-found':'등록되지 않은 이메일입니다.',
    'auth/wrong-password':'비밀번호가 맞지 않습니다.',
    'auth/invalid-credential':'이메일 또는 비밀번호가 맞지 않습니다.',
    'auth/email-already-in-use':'이미 가입된 이메일입니다. 로그인해 주세요.',
    'auth/weak-password':'비밀번호는 6자 이상이어야 합니다.',
    'auth/too-many-requests':'시도가 많습니다. 잠시 후 다시 해주세요.',
    'auth/network-request-failed':'네트워크에 연결할 수 없습니다.'
  };
  return m[e.code] || (e.message || '문제가 발생했습니다.');
}
function setMsg(html, type='err'){
  $('authMsg').innerHTML = html ? `<div class="msg ${type}">${html}</div>` : '';
}

/* ═══════════════════════════════════════════════════════════════
   인증 — 멀티 기관 · 승인제 (구조: orgCodes 분리 = 수정 #3)
   ═══════════════════════════════════════════════════════════════ */
