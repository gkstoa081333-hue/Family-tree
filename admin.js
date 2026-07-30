/* ═══════════════════════════════════════════════
   디자인 토큰 — 세이지 그린 (팔레트 2번)
   ═══════════════════════════════════════════════ */
:root{
  --sage-deep:#4C7A6D;  --sage-mid:#6FA292;  --sage-light:#A9CFC3;
  --sage-bg:#F1F6F3;    --ink:#22332E;       --ink-soft:#5B6E67;
  --white:#fff;         --line:#DCE7E2;      --muted:#93a29c;
  --st-addict:#C15B47;  --st-mental:#8A6FA8; --st-phys:#C99A3A;
  --st-care:#4C7A6D;    --st-disab:#7A8B85;
  --danger:#C15B47;
  --sat:env(safe-area-inset-top,0px);
  --sab:env(safe-area-inset-bottom,0px);
}
*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}
html,body{height:100%;margin:0;overscroll-behavior:none;}
body{
  font-family:'Pretendard',-apple-system,BlinkMacSystemFont,sans-serif;
  background:var(--sage-bg); color:var(--ink);
  -webkit-font-smoothing:antialiased;
}
button{font-family:inherit;cursor:pointer;border:none;background:none;color:inherit;}
input,select,textarea{font-family:inherit;font-size:16px;}
:focus-visible{outline:2px solid var(--sage-deep);outline-offset:2px;}
.hide{display:none !important;}

/* ── 공통 폼 요소 ── */
.fld{margin-bottom:15px;}
.fld > label{display:block;font-size:12px;font-weight:700;color:var(--ink-soft);margin-bottom:6px;}
.inp{
  width:100%;height:48px;background:var(--white);border:1px solid var(--line);
  border-radius:12px;padding:0 14px;font-size:15px;font-weight:500;color:var(--ink);
}
.inp::placeholder{color:var(--muted);font-weight:400;}
.inp:focus{outline:none;border-color:var(--sage-mid);box-shadow:0 0 0 3px rgba(111,162,146,.15);}
textarea.inp{height:auto;min-height:84px;padding:12px 14px;resize:vertical;line-height:1.5;}
.btn{
  width:100%;height:52px;background:var(--sage-deep);color:#fff;border-radius:14px;
  font-size:15.5px;font-weight:700;display:flex;align-items:center;justify-content:center;gap:8px;
  transition:transform .12s, opacity .12s;
}
.btn:active{transform:scale(.985);}
.btn:disabled{opacity:.5;cursor:not-allowed;}
.btn.ghost{background:var(--white);color:var(--ink);border:1px solid var(--line);}
.btn.sm{height:40px;font-size:13.5px;border-radius:11px;width:auto;padding:0 16px;}
.seg{display:flex;background:var(--white);border:1px solid var(--line);border-radius:12px;padding:4px;gap:4px;}
.seg button{
  flex:1;padding:10px 0;border-radius:9px;font-size:13.5px;font-weight:600;color:var(--ink-soft);
  display:flex;align-items:center;justify-content:center;gap:6px;
}
.seg button.on{background:var(--sage-deep);color:#fff;}
.msg{font-size:13px;padding:11px 13px;border-radius:11px;margin-bottom:14px;line-height:1.5;}
.msg.err{background:#FBEDEA;color:var(--st-addict);border:1px solid #EBC8C0;}
.msg.ok{background:#E9F1EE;color:var(--sage-deep);border:1px solid var(--sage-light);}

/* ── 인증 / 대기 / PIN ── */
.center-screen{
  min-height:100dvh;display:flex;align-items:center;justify-content:center;
  padding:24px 20px calc(24px + var(--sab));
  background:radial-gradient(900px 500px at 20% 0%, #E4EFEA 0%, transparent 60%), var(--sage-bg);
}
.card{
  width:100%;max-width:400px;background:var(--white);border:1px solid var(--line);
  border-radius:24px;padding:30px 24px;box-shadow:0 20px 50px -24px rgba(34,51,46,.28);
}
.brand{display:flex;flex-direction:column;align-items:center;margin-bottom:24px;text-align:center;}
.brand svg{margin-bottom:12px;}
.brand h1{margin:0;font-size:24px;font-weight:800;letter-spacing:-.02em;}
.brand p{margin:6px 0 0;font-size:13px;color:var(--ink-soft);line-height:1.5;}
.tabs{display:flex;gap:4px;background:var(--sage-bg);border-radius:12px;padding:4px;margin-bottom:22px;}
.tabs button{flex:1;padding:10px 0;border-radius:9px;font-size:14px;font-weight:700;color:var(--ink-soft);}
.tabs button.on{background:var(--white);color:var(--sage-deep);box-shadow:0 1px 3px rgba(0,0,0,.06);}
.foot-note{margin-top:16px;text-align:center;font-size:12px;color:var(--muted);line-height:1.7;}
.foot-note a{color:var(--sage-deep);font-weight:600;cursor:pointer;text-decoration:none;}

.pin-dots{display:flex;gap:12px;justify-content:center;margin:22px 0 26px;}
.pin-dots i{width:13px;height:13px;border-radius:50%;background:var(--line);transition:background .15s, transform .15s;}
.pin-dots i.on{background:var(--sage-deep);transform:scale(1.15);}
.pin-pad{display:grid;grid-template-columns:repeat(3,1fr);gap:11px;max-width:280px;margin:0 auto;}
.pin-pad button{
  height:60px;border-radius:16px;background:var(--white);border:1px solid var(--line);
  font-size:21px;font-weight:600;display:flex;align-items:center;justify-content:center;
}
.pin-pad button:active{background:var(--sage-bg);}
.pin-pad button.blank{background:transparent;border:none;}
.shake{animation:shake .32s;}
@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}75%{transform:translateX(7px)}}

/* ── 앱 셸 ── */
#app{display:none;height:100dvh;flex-direction:column;}
#app.on{display:flex;}
.side{display:none;}
.main{flex:1;display:flex;flex-direction:column;min-height:0;overflow:hidden;}
.tabbar{
  flex:0 0 auto;background:var(--white);border-top:1px solid var(--line);
  display:flex;align-items:center;justify-content:space-around;
  padding:8px 0 calc(8px + var(--sab));
}
.tabbar button{
  display:flex;flex-direction:column;align-items:center;gap:3px;
  font-size:10.5px;font-weight:600;color:var(--muted);padding:2px 14px;
}
.tabbar button.on{color:var(--sage-deep);}
.tabbar button.on svg *{stroke:var(--sage-deep);}
.scroll{flex:1;overflow-y:auto;-webkit-overflow-scrolling:touch;min-height:0;}

.hdr{padding:calc(16px + var(--sat)) 20px 12px;}
.hdr .hi{font-size:13px;color:var(--ink-soft);font-weight:500;}
.hdr .row{display:flex;align-items:center;justify-content:space-between;margin-top:2px;}
.hdr h2{margin:0;font-size:25px;font-weight:800;letter-spacing:-.02em;}
.hdr .org{font-size:11.5px;color:var(--sage-deep);font-weight:700;margin-top:3px;}
.avatar{
  width:38px;height:38px;border-radius:50%;background:var(--sage-light);color:var(--sage-deep);
  display:flex;align-items:center;justify-content:center;font-weight:700;font-size:14px;flex:0 0 38px;
}
.searchbar{
  margin:4px 20px 0;background:var(--white);border:1px solid var(--line);border-radius:14px;
  height:46px;display:flex;align-items:center;gap:9px;padding:0 14px;
}
.searchbar input{flex:1;border:none;background:none;font-size:14.5px;color:var(--ink);}
.searchbar input:focus{outline:none;}
.stats{display:flex;gap:10px;padding:14px 20px 4px;}
.stat{flex:1;background:var(--sage-deep);color:#fff;border-radius:16px;padding:13px 14px;}
.stat.alt{background:var(--white);color:var(--ink);border:1px solid var(--line);}
.stat b{display:block;font-size:22px;font-weight:800;letter-spacing:-.01em;}
.stat span{font-size:11.5px;font-weight:500;opacity:.85;}
.stat.alt span{color:var(--ink-soft);opacity:1;}
.sec-head{display:flex;justify-content:space-between;align-items:baseline;padding:18px 20px 8px;}
.sec-head b{font-size:15px;font-weight:700;}
.sec-head span{font-size:12.5px;color:var(--muted);}

.case-grid{padding:0 16px 90px;display:grid;grid-template-columns:1fr;gap:10px;}
.case{
  display:flex;gap:13px;align-items:flex-start;background:var(--white);
  border:1px solid var(--line);border-radius:18px;padding:13px;cursor:pointer;
  transition:border-color .14s, transform .1s;
}
.case:active{transform:scale(.99);}
.case:hover{border-color:var(--sage-light);}
.thumb{
  flex:0 0 62px;width:62px;height:58px;background:var(--sage-bg);border-radius:12px;
  display:flex;align-items:center;justify-content:center;overflow:hidden;
}
.case-body{flex:1;min-width:0;}
.case-body .nm{
  font-size:15px;font-weight:700;display:flex;align-items:center;gap:6px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.case-body .mt{font-size:12px;color:var(--ink-soft);margin-top:3px;}
.chips{display:flex;gap:5px;margin-top:8px;flex-wrap:wrap;}
.chip{
  font-size:10.5px;font-weight:600;padding:3px 8px;border-radius:20px;
  background:var(--sage-bg);color:var(--sage-deep);border:1px solid var(--sage-light);
}
.chip.priv{background:#F3F5F4;color:var(--ink-soft);border-color:var(--line);}
.chip.shared{background:#E9F1EE;color:var(--sage-deep);border-color:var(--sage-light);}
.chip.addict{background:#FBEDEA;color:var(--st-addict);border-color:#EBC8C0;}
.chip.mental{background:#F1ECF7;color:var(--st-mental);border-color:#D9CDE8;}
.case-time{font-size:11px;color:var(--muted);white-space:nowrap;flex:0 0 auto;}
.case-del{
  flex:0 0 28px;width:28px;height:28px;border-radius:8px;
  display:flex;align-items:center;justify-content:center;
  font-size:14px;color:var(--muted);background:transparent;
  transition:background .15s, color .15s;margin-left:4px;
}
.case-del:hover{background:#FBEDEA;color:var(--st-addict);}
.case-del:active{background:#EBC8C0;color:var(--st-addict);}
.empty{text-align:center;padding:56px 30px;color:var(--ink-soft);}
.empty svg{margin-bottom:14px;opacity:.5;}
.empty b{display:block;font-size:15px;font-weight:700;color:var(--ink);margin-bottom:6px;}
.empty p{margin:0;font-size:13px;line-height:1.6;}

.fab{
  position:fixed;right:18px;bottom:calc(78px + var(--sab));width:56px;height:56px;border-radius:18px;
  background:var(--sage-deep);color:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 10px 24px -6px rgba(76,122,109,.65);z-index:40;
}
.fab:active{transform:scale(.94);}

/* ── 캔버스 ── */
#viewCanvas{display:none;flex-direction:column;height:100dvh;background:var(--sage-bg);}
#viewCanvas.on{display:flex;}
.cv-hdr{flex:0 0 auto;padding:calc(10px + var(--sat)) 14px 10px;display:flex;align-items:center;gap:10px;}
.iconbtn{
  width:40px;height:40px;border-radius:12px;background:var(--white);border:1px solid var(--line);
  display:flex;align-items:center;justify-content:center;flex:0 0 40px;
}
.iconbtn:active{background:var(--sage-bg);}
.cv-hdr .ttl{flex:1;min-width:0;}
.cv-hdr .ttl b{
  font-size:16px;font-weight:700;display:block;line-height:1.25;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;
}
.cv-hdr .ttl small{font-size:11.5px;color:var(--ink-soft);}
#stageWrap{
  flex:1;margin:0 12px;background:var(--white);border:1px solid var(--line);
  border-radius:20px;position:relative;overflow:hidden;min-height:0;touch-action:none;
}
#stage{width:100%;height:100%;}
.zoom{
  position:absolute;top:12px;right:12px;background:rgba(255,255,255,.94);border:1px solid var(--line);
  border-radius:20px;display:flex;flex-direction:column;overflow:hidden;z-index:5;
}
.zoom button{width:36px;height:36px;font-size:18px;color:var(--ink);display:flex;align-items:center;justify-content:center;}
.zoom button+button{border-top:1px solid var(--line);}
.legend{
  position:absolute;left:12px;bottom:12px;background:rgba(255,255,255,.94);border:1px solid var(--line);
  border-radius:12px;padding:8px 10px;font-size:10px;color:var(--ink-soft);line-height:1.75;z-index:5;
}
.legend i{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:5px;vertical-align:middle;}
.hint{
  position:absolute;top:12px;left:12px;right:60px;background:var(--sage-deep);color:#fff;
  border-radius:12px;padding:9px 13px;font-size:12.5px;font-weight:600;z-index:6;line-height:1.4;
}
.toolbar{
  flex:0 0 auto;margin:12px;padding:0 4px;background:var(--white);border:1px solid var(--line);
  border-radius:20px;display:flex;align-items:center;justify-content:space-around;height:68px;
  margin-bottom:calc(12px + var(--sab));
}
.tool{
  display:flex;flex-direction:column;align-items:center;gap:4px;
  font-size:10px;font-weight:600;color:var(--ink-soft);flex:1;
}
.tool .sym{width:34px;height:34px;display:flex;align-items:center;justify-content:center;border-radius:11px;}
.tool.on{color:var(--sage-deep);}
.tool.on .sym{background:var(--sage-bg);}
.tool.on .sym svg *{stroke:var(--sage-deep);}

/* ── 시트 ── */
.dim{
  position:fixed;inset:0;background:rgba(34,51,46,.4);z-index:60;
  opacity:0;pointer-events:none;transition:opacity .22s;
}
.dim.on{opacity:1;pointer-events:auto;}
.sheet{
  position:fixed;left:0;right:0;bottom:0;z-index:61;background:var(--sage-bg);
  border-radius:26px 26px 0 0;padding:8px 20px calc(24px + var(--sab));
  max-height:90dvh;overflow-y:auto;transform:translateY(100%);transition:transform .28s cubic-bezier(.32,.72,0,1);
}
.sheet.on{transform:translateY(0);}
.grab{width:40px;height:5px;background:#c3d2cc;border-radius:3px;margin:6px auto 16px;}
.sheet h3{margin:0 0 2px;font-size:19px;font-weight:800;letter-spacing:-.01em;}
.sheet .sub{font-size:12.5px;color:var(--ink-soft);margin-bottom:18px;line-height:1.5;}
.row2{display:flex;gap:11px;}
.row2 > .fld{flex:1;}
.tagrid{display:flex;flex-wrap:wrap;gap:8px;}
.stag{
  font-size:12.5px;font-weight:600;padding:8px 13px;border-radius:12px;border:1.5px solid var(--line);
  background:var(--white);color:var(--ink-soft);display:flex;align-items:center;gap:7px;
}
.stag i{width:9px;height:9px;border-radius:50%;}
.stag.on{border-color:currentColor;}
.sheet-acts{display:flex;gap:10px;margin-top:6px;}
.sheet-acts .btn{flex:1;}
.rel-list{display:flex;flex-direction:column;gap:8px;}
.rel-item{
  display:flex;align-items:center;gap:13px;background:var(--white);border:1px solid var(--line);
  border-radius:14px;padding:13px 14px;text-align:left;
}
.rel-item:active{background:var(--sage-bg);}
.rel-item .rl-sym{flex:0 0 44px;height:22px;display:flex;align-items:center;}
.rel-item b{display:block;font-size:14px;font-weight:700;}
.rel-item small{display:block;font-size:11.5px;color:var(--ink-soft);margin-top:2px;}

.usr{
  display:flex;align-items:center;gap:12px;background:var(--white);border:1px solid var(--line);
  border-radius:14px;padding:12px 13px;margin-bottom:8px;
}
.usr .ub{flex:1;min-width:0;}
.usr .ub b{display:block;font-size:14px;font-weight:700;}
.usr .ub small{display:block;font-size:11.5px;color:var(--ink-soft);margin-top:2px;
  white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.badge{font-size:10px;font-weight:700;padding:3px 7px;border-radius:6px;
  background:var(--sage-bg);color:var(--sage-deep);border:1px solid var(--sage-light);}
.badge.wait{background:#FDF3E6;color:#B07A22;border-color:#EBD5B0;}
.code-box{
  background:var(--white);border:1px dashed var(--sage-mid);border-radius:14px;padding:15px;
  text-align:center;margin-bottom:18px;
}
.code-box small{display:block;font-size:11.5px;color:var(--ink-soft);margin-bottom:6px;}
.code-box b{font-size:24px;font-weight:800;letter-spacing:.16em;color:var(--sage-deep);font-family:ui-monospace,monospace;}

#toast{
  position:fixed;left:50%;bottom:calc(96px + var(--sab));transform:translate(-50%,16px);
  background:var(--ink);color:#fff;padding:12px 18px;border-radius:12px;font-size:13.5px;font-weight:600;
  z-index:90;opacity:0;pointer-events:none;transition:.25s;max-width:88vw;text-align:center;
}
#toast.on{opacity:1;transform:translate(-50%,0);}
#boot{
  position:fixed;inset:0;background:var(--sage-bg);z-index:200;
  display:flex;align-items:center;justify-content:center;flex-direction:column;gap:16px;
}
.spin{
  width:32px;height:32px;border:3px solid var(--sage-light);border-top-color:var(--sage-deep);
  border-radius:50%;animation:spin .8s linear infinite;
}
@keyframes spin{to{transform:rotate(360deg)}}

/* ── 데스크톱 (1024px~) ── */
@media (min-width:1024px){
  #app.on{flex-direction:row;}
  .tabbar{display:none;}
  .side{
    display:flex;flex-direction:column;flex:0 0 232px;background:var(--white);
    border-right:1px solid var(--line);padding:24px 16px;gap:4px;
  }
  .side .logo{display:flex;align-items:center;gap:10px;padding:0 8px 22px;}
  .side .logo b{font-size:17px;font-weight:800;letter-spacing:-.01em;}
  .side nav{display:flex;flex-direction:column;gap:3px;flex:1;}
  .side nav button{
    display:flex;align-items:center;gap:11px;padding:11px 12px;border-radius:12px;
    font-size:14px;font-weight:600;color:var(--ink-soft);text-align:left;
  }
  .side nav button:hover{background:var(--sage-bg);}
  .side nav button.on{background:var(--sage-deep);color:#fff;}
  .side nav button.on svg *{stroke:#fff;}
  .side .me{display:flex;align-items:center;gap:10px;padding:11px 8px;border-top:1px solid var(--line);margin-top:8px;}
  .side .me .mb{flex:1;min-width:0;}
  .side .me .mb b{display:block;font-size:13.5px;font-weight:700;}
  .side .me .mb small{display:block;font-size:11px;color:var(--ink-soft);
    white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
  .hdr{padding:28px 32px 14px;}
  .hdr .row{align-items:flex-end;}
  .hdr h2{font-size:28px;}
  .hdr .avatar{display:none;}
  .searchbar{margin:14px 32px 0;max-width:460px;}
  .stats{padding:16px 32px 4px;max-width:460px;}
  .sec-head{padding:22px 32px 10px;}
  .case-grid{padding:0 32px 40px;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;}
  .case{padding:15px;}
  .fab{
    position:static;width:auto;height:44px;border-radius:13px;padding:0 18px;gap:8px;
    font-size:14px;font-weight:700;box-shadow:none;
  }
  .fab .fab-txt{display:inline;}
  #viewCanvas.on{flex-direction:row;height:100dvh;}
  .cv-hdr{
    position:absolute;top:0;left:0;right:0;z-index:10;padding:18px 24px;
    background:linear-gradient(var(--sage-bg) 60%, transparent);
  }
  .cv-main{flex:1;display:flex;flex-direction:column;position:relative;min-width:0;}
  #stageWrap{margin:74px 24px 24px 110px;}
  .toolbar{
    position:absolute;left:24px;top:50%;transform:translateY(-50%);z-index:8;
    flex-direction:column;width:70px;height:auto;margin:0;padding:10px 0;gap:6px;
    justify-content:flex-start;
  }
  .toolbar .tool{flex:0 0 auto;padding:6px 0;}
  .dim{background:rgba(34,51,46,.22);}
  .sheet{
    left:auto;right:0;top:0;bottom:0;width:400px;max-height:none;border-radius:0;
    padding:26px 26px 30px;transform:translateX(100%);
    border-left:1px solid var(--line);box-shadow:-10px 0 40px -20px rgba(34,51,46,.3);
  }
  .sheet.on{transform:translateX(0);}
  .grab{display:none;}
  #toast{bottom:32px;}
}
.fab-txt{display:none;}
.cv-main{flex:1;display:flex;flex-direction:column;position:relative;min-width:0;min-height:0;}
