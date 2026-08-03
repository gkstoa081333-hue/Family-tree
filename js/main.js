/* ============================================================
   main.js — 부팅·전역 이벤트
   resize, 캔버스 단축키(Del/Undo/Redo), 복귀 재잠금
   ============================================================ */

/* ── 전역 이벤트: 리사이즈 1회 등록 (수정 #11) · 복귀 재잠금 ── */
window.addEventListener('resize', ()=>{ resizeStage(); updateNewBtn(); });

/* [이식] 캔버스 단축키 — Del 삭제 / Ctrl+Z, Ctrl+Shift+Z 실행취소·다시실행 */
document.addEventListener('keydown', e=>{
  // 캔버스 화면이 열려있을 때만 동작
  if(!$('viewCanvas') || !$('viewCanvas').classList.contains('on')) return;
  const tag = document.activeElement.tagName;
  if(tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT') return;

  if(e.key==='Enter' && S.tool==='household'){ e.preventDefault(); finishHouseholdDraft(); return; }
  if((e.ctrlKey||e.metaKey) && !e.shiftKey && e.key.toLowerCase()==='z'){ e.preventDefault(); genoUndo(); return; }
  if((e.ctrlKey||e.metaKey) && (e.shiftKey && e.key.toLowerCase()==='z' || e.key.toLowerCase()==='y')){ e.preventDefault(); genoRedo(); return; }

  if((e.key==='Delete' || e.key==='Backspace') && S.sel){
    e.preventDefault();
    const n = S.geno.nodes[S.sel];
    if(n && confirm(`이 인물(${n.name||'이름 없음'})과 연결된 관계선을 모두 삭제할까요?`)){
      delNodeDirect(S.sel);  // 내부에서 metaSave→pushHistory 호출됨
    }
  }
});
let bgAt = null;
document.addEventListener('visibilitychange', ()=>{
  if(document.hidden) bgAt = Date.now();
  else if(bgAt && Date.now()-bgAt > 5*60*1000 && S.me?.pinHash){
    sessionStorage.removeItem(PIN_KEY);
    closeSheet();
    if(S.stage){ S.stage.destroy(); S.stage=null; S.layer=null; S.caseId=null; }
    startPin('verify');
  }
});
