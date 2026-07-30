<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, maximum-scale=1.0, user-scalable=no">
<meta name="theme-color" content="#4C7A6D">
<title>가계도 · 제네그램</title>
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css">
<link rel="stylesheet" href="css/styles.css">
</head>
<body>

<div id="boot"><div class="spin"></div><small style="color:var(--ink-soft);font-size:13px;">불러오는 중</small></div>

<!-- ══════════ 1. 로그인 / 가입 / 기관등록 / 가입마무리 ══════════ -->
<div id="viewAuth" class="center-screen hide">
  <div class="card">
    <div class="brand">
      <svg width="46" height="42" viewBox="0 0 46 42">
        <rect x="4" y="3" width="15" height="15" fill="none" stroke="#4C7A6D" stroke-width="2.4"/>
        <circle cx="35" cy="10.5" r="7.5" fill="none" stroke="#4C7A6D" stroke-width="2.4"/>
        <line x1="19" y1="10.5" x2="27.5" y2="10.5" stroke="#4C7A6D" stroke-width="2.4"/>
        <path d="M23 10.5 V26 H12" fill="none" stroke="#6FA292" stroke-width="2.4"/>
        <path d="M23 26 H34" fill="none" stroke="#6FA292" stroke-width="2.4"/>
        <circle cx="12" cy="33.5" r="7" fill="none" stroke="#6FA292" stroke-width="2.4"/>
        <rect x="27" y="26.5" width="14" height="14" fill="none" stroke="#22332E" stroke-width="2.4"/>
        <rect x="24.5" y="24" width="19" height="19" fill="none" stroke="#22332E" stroke-width="1"/>
      </svg>
      <h1>가계도</h1>
      <p>사회복지 현장을 위한 제네그램 도구</p>
    </div>

    <div class="tabs" id="authTabs">
      <button id="tabLogin" class="on" onclick="switchAuth('login')">로그인</button>
      <button id="tabSignup" onclick="switchAuth('signup')">가입하기</button>
    </div>

    <div id="authMsg"></div>

    <div id="formLogin">
      <div class="fld"><label>이메일</label>
        <input id="liEmail" class="inp" type="email" placeholder="name@center.or.kr" autocomplete="username"></div>
      <div class="fld"><label>비밀번호</label>
        <input id="liPw" class="inp" type="password" placeholder="비밀번호" autocomplete="current-password"></div>
      <button class="btn" id="btnLogin" onclick="doLogin()">로그인</button>
      <div class="foot-note"><a onclick="doReset()">비밀번호를 잊으셨나요?</a></div>
    </div>

    <div id="formSignup" class="hide">
      <div class="fld"><label>이름</label>
        <input id="suName" class="inp" placeholder="홍길동"></div>
      <div class="fld"><label>기관 가입코드</label>
        <input id="suCode" class="inp" placeholder="기관 관리자에게 받은 코드" style="text-transform:uppercase;letter-spacing:.08em;">
        <div style="font-size:11.5px;color:var(--muted);margin-top:6px;line-height:1.5;">
          코드가 없다면 <a onclick="switchAuth('org')" style="color:var(--sage-deep);font-weight:600;cursor:pointer;">기관을 새로 등록</a>하세요.
        </div>
      </div>
      <div class="fld"><label>이메일</label>
        <input id="suEmail" class="inp" type="email" placeholder="name@center.or.kr" autocomplete="username"></div>
      <div class="fld"><label>비밀번호 (6자 이상)</label>
        <input id="suPw" class="inp" type="password" placeholder="비밀번호" autocomplete="new-password"></div>
      <button class="btn" id="btnSignup" onclick="doSignup()">가입 신청하기</button>
      <div class="foot-note">가입 후 기관 관리자의 승인을 받으면 이용할 수 있습니다.</div>
    </div>

    <div id="formOrg" class="hide">
      <div class="fld"><label>기관명</label>
        <input id="orgName" class="inp" placeholder="○○시정신건강복지센터"></div>
      <div class="fld"><label>관리자 이름</label>
        <input id="orgAdmin" class="inp" placeholder="홍길동"></div>
      <div class="fld"><label>이메일</label>
        <input id="orgEmail" class="inp" type="email" placeholder="name@center.or.kr"></div>
      <div class="fld"><label>비밀번호 (6자 이상)</label>
        <input id="orgPw" class="inp" type="password" placeholder="비밀번호"></div>
      <button class="btn" id="btnOrg" onclick="doCreateOrg()">기관 등록하고 시작하기</button>
      <div class="foot-note">
        등록하면 관리자 권한을 받고, 소속 직원에게 나눠줄 <b>가입코드</b>가 발급됩니다.<br>
        <a onclick="switchAuth('signup')">코드로 가입하기</a>
      </div>
    </div>

    <!-- 가입이 중간에 끊긴 계정의 마무리 -->
    <div id="formResume" class="hide">
      <div class="msg ok">계정은 있지만 가입이 완료되지 않았습니다.<br>아래 정보를 입력해 가입을 마무리하세요.</div>
      <div class="fld"><label>이름</label>
        <input id="rsName" class="inp" placeholder="홍길동"></div>
      <div class="fld"><label>기관 가입코드</label>
        <input id="rsCode" class="inp" placeholder="기관 관리자에게 받은 코드" style="text-transform:uppercase;letter-spacing:.08em;"></div>
      <button class="btn" id="btnResume" onclick="doResume()">가입 마무리하기</button>
      <div class="foot-note"><a onclick="doLogout()">다른 계정으로 로그인</a></div>
    </div>
  </div>
</div>

<!-- ══════════ 2. 승인 대기 / 거절 ══════════ -->
<div id="viewPending" class="center-screen hide">
  <div class="card" style="text-align:center;">
    <svg width="52" height="52" viewBox="0 0 52 52" style="margin:0 auto 16px;display:block;">
      <circle cx="26" cy="26" r="23" fill="none" stroke="#A9CFC3" stroke-width="3"/>
      <path d="M26 13v14l9 5" fill="none" stroke="#4C7A6D" stroke-width="3" stroke-linecap="round"/>
    </svg>
    <h1 id="pendTitle" style="margin:0 0 8px;font-size:20px;font-weight:800;">승인을 기다리는 중입니다</h1>
    <p id="pendText" style="margin:0 0 22px;font-size:13.5px;color:var(--ink-soft);line-height:1.65;"></p>
    <button class="btn" id="pendReapply" onclick="reapply()" style="margin-bottom:9px;" hidden>다시 신청하기</button>
    <button class="btn ghost" onclick="location.reload()" style="margin-bottom:9px;">상태 새로고침</button>
    <button class="btn ghost" onclick="doLogout()">로그아웃</button>
  </div>
</div>

<!-- ══════════ 3. PIN ══════════ -->
<div id="viewPin" class="center-screen hide">
  <div class="card" style="text-align:center;" id="pinCard">
    <h1 id="pinTitle" style="margin:0 0 6px;font-size:20px;font-weight:800;">PIN 입력</h1>
    <p id="pinSub" style="margin:0;font-size:13px;color:var(--ink-soft);line-height:1.55;">
      내담자 정보를 보호합니다. 6자리 PIN을 입력하세요.
    </p>
    <div class="pin-dots" id="pinDots"><i></i><i></i><i></i><i></i><i></i><i></i></div>
    <div class="pin-pad" id="pinPad"></div>
    <div style="margin-top:18px;">
      <a onclick="doLogout()" style="font-size:12.5px;color:var(--muted);cursor:pointer;">다른 계정으로 로그인</a>
    </div>
  </div>
</div>

<!-- ══════════ 4. 메인 앱 ══════════ -->
<div id="app">
  <aside class="side">
    <div class="logo">
      <svg width="26" height="24" viewBox="0 0 46 42">
        <rect x="4" y="3" width="15" height="15" fill="none" stroke="#4C7A6D" stroke-width="3"/>
        <circle cx="35" cy="10.5" r="7.5" fill="none" stroke="#4C7A6D" stroke-width="3"/>
        <line x1="19" y1="10.5" x2="27.5" y2="10.5" stroke="#4C7A6D" stroke-width="3"/>
        <path d="M23 10.5 V26 H27" fill="none" stroke="#6FA292" stroke-width="3"/>
        <rect x="27" y="26.5" width="14" height="14" fill="none" stroke="#22332E" stroke-width="3"/>
      </svg>
      <b>가계도</b>
    </div>
    <nav>
      <button id="sideCases" class="on" onclick="goTab('cases')">
        <svg width="19" height="19" viewBox="0 0 22 22"><rect x="3" y="4" width="7" height="6" rx="1.5" fill="none" stroke="#5B6E67" stroke-width="1.7"/><circle cx="15.5" cy="7" r="3.5" fill="none" stroke="#5B6E67" stroke-width="1.7"/><path d="M6.5 10v4h9" stroke="#5B6E67" stroke-width="1.7" fill="none"/><rect x="12" y="14" width="7" height="6" rx="1.5" fill="none" stroke="#5B6E67" stroke-width="1.7"/></svg>
        케이스
      </button>
      <button id="sideAdmin" class="hide" onclick="goTab('admin')">
        <svg width="19" height="19" viewBox="0 0 22 22"><path d="M11 2.5l7 3v5c0 4-3 7.5-7 9-4-1.5-7-5-7-9v-5z" fill="none" stroke="#5B6E67" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 11l2 2 4-4" fill="none" stroke="#5B6E67" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        기관 관리
      </button>
      <button id="sideMe" onclick="goTab('me')">
        <svg width="19" height="19" viewBox="0 0 22 22"><circle cx="11" cy="7" r="3.4" fill="none" stroke="#5B6E67" stroke-width="1.7"/><path d="M4.5 18a6.5 6.5 0 0 1 13 0" fill="none" stroke="#5B6E67" stroke-width="1.7"/></svg>
        내 정보
      </button>
    </nav>
    <div class="me">
      <div class="avatar" id="sideAv">?</div>
      <div class="mb"><b id="sideNm">—</b><small id="sideOrg">—</small></div>
    </div>
  </aside>

  <div class="main">
    <div class="scroll" id="mainScroll">

      <div id="tabCases">
        <div class="hdr">
          <div class="hi" id="greet">안녕하세요</div>
          <div class="row">
            <div>
              <h2>케이스</h2>
              <div class="org" id="hdrOrg">—</div>
            </div>
            <div class="avatar" id="hdrAv">?</div>
            <button class="fab" id="deskNew" onclick="newCase()" style="display:none;">
              <svg width="18" height="18" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>
              <span class="fab-txt">새 케이스</span>
            </button>
          </div>
        </div>
        <div class="searchbar">
          <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="7" cy="7" r="5" fill="none" stroke="#93a29c" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="#93a29c" stroke-width="1.6" stroke-linecap="round"/></svg>
          <input id="q" placeholder="이름·사례번호 검색" oninput="renderCases()">
        </div>
        <div class="stats">
          <div class="stat"><b id="stTotal">0</b><span>열람 가능한 케이스</span></div>
          <div class="stat alt"><b id="stWeek">0</b><span>이번 주 수정</span></div>
        </div>
        <div class="sec-head"><b>전체 케이스</b><span id="caseCount"></span></div>
        <div class="case-grid" id="caseList"></div>
      </div>

      <div id="tabAdmin" class="hide">
        <div class="hdr">
          <div class="hi">기관 관리자</div>
          <div class="row"><h2>기관 관리</h2></div>
        </div>
        <div style="padding:14px 20px 90px;">
          <div class="code-box">
            <small>직원에게 이 코드를 알려주세요</small>
            <b id="adminCode">——————</b>
            <div style="margin-top:11px;"><button class="btn sm ghost" onclick="copyCode()">코드 복사</button></div>
          </div>
          <div class="sec-head" style="padding:6px 0 10px;"><b>승인 대기</b><span id="waitCnt"></span></div>
          <div id="waitList"></div>
          <div class="sec-head" style="padding:18px 0 10px;"><b>소속 직원</b><span id="memCnt"></span></div>
          <div id="memList"></div>
          <div class="sec-head" style="padding:18px 0 10px;"><b>케이스 공개범위</b></div>
          <p style="font-size:12.5px;color:var(--ink-soft);line-height:1.6;margin:0 0 12px;">
            관리자는 기관의 모든 케이스를 열람하고, 공개범위를 바꿀 수 있습니다.
          </p>
          <div id="adminCases"></div>
        </div>
      </div>

      <div id="tabMe" class="hide">
        <div class="hdr">
          <div class="hi">계정</div>
          <div class="row"><h2>내 정보</h2></div>
        </div>
        <div style="padding:14px 20px 90px;">
          <div class="usr" style="margin-bottom:16px;">
            <div class="avatar" id="meAv">?</div>
            <div class="ub"><b id="meNm">—</b><small id="meEmail">—</small></div>
            <span class="badge" id="meRole">직원</span>
          </div>
          <div class="fld"><label>소속 기관</label><div class="inp" style="display:flex;align-items:center;" id="meOrg">—</div></div>
          <button class="btn ghost" onclick="openPinChange()" style="margin-bottom:10px;">PIN 변경하기</button>
          <button class="btn ghost" onclick="doLogout()">로그아웃</button>
          <p style="font-size:11.5px;color:var(--muted);text-align:center;margin-top:18px;line-height:1.7;">
            내담자 정보는 기관 단위로 분리 저장됩니다.<br>기기 분실 시 즉시 관리자에게 알려주세요.
          </p>
        </div>
      </div>

    </div>

    <div class="tabbar">
      <button id="tabBtnCases" class="on" onclick="goTab('cases')">
        <svg width="22" height="22" viewBox="0 0 22 22"><rect x="3" y="4" width="7" height="6" rx="1.5" fill="none" stroke="#9aaaa4" stroke-width="1.7"/><circle cx="15.5" cy="7" r="3.5" fill="none" stroke="#9aaaa4" stroke-width="1.7"/><path d="M6.5 10v4h9" stroke="#9aaaa4" stroke-width="1.7" fill="none"/><rect x="12" y="14" width="7" height="6" rx="1.5" fill="none" stroke="#9aaaa4" stroke-width="1.7"/></svg>
        케이스
      </button>
      <button id="tabBtnAdmin" class="hide" onclick="goTab('admin')">
        <svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 2.5l7 3v5c0 4-3 7.5-7 9-4-1.5-7-5-7-9v-5z" fill="none" stroke="#9aaaa4" stroke-width="1.7" stroke-linejoin="round"/><path d="M8 11l2 2 4-4" fill="none" stroke="#9aaaa4" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>
        기관 관리
      </button>
      <button id="tabBtnMe" onclick="goTab('me')">
        <svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="7" r="3.4" fill="none" stroke="#9aaaa4" stroke-width="1.7"/><path d="M4.5 18a6.5 6.5 0 0 1 13 0" fill="none" stroke="#9aaaa4" stroke-width="1.7"/></svg>
        내 정보
      </button>
    </div>
  </div>

  <button class="fab" id="mobNew" onclick="newCase()">
    <svg width="24" height="24" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" stroke="#fff" stroke-width="2.3" stroke-linecap="round"/></svg>
  </button>
</div>

<!-- ══════════ 5. 캔버스 ══════════ -->
<div id="viewCanvas">
  <div class="cv-main">
    <div class="cv-hdr">
      <button class="iconbtn" onclick="closeCanvas()">
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M11 3l-5 6 5 6" fill="none" stroke="#22332E" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      </button>
      <div class="ttl"><b id="cvTitle">—</b><small id="cvSub">—</small></div>
      <button class="iconbtn" onclick="openCaseSettings()">
        <svg width="18" height="18" viewBox="0 0 18 18"><circle cx="9" cy="9" r="2.4" fill="none" stroke="#22332E" stroke-width="1.8"/><path d="M9 1.5v2M9 14.5v2M2.2 5.2l1.7 1M14.1 11.8l1.7 1M2.2 12.8l1.7-1M14.1 6.2l1.7-1" stroke="#22332E" stroke-width="1.8" stroke-linecap="round"/></svg>
      </button>
      <button class="iconbtn" onclick="exportPNG()">
        <svg width="18" height="18" viewBox="0 0 18 18"><path d="M9 2v9M5.5 7.5L9 11l3.5-3.5" stroke="#4C7A6D" stroke-width="1.9" fill="none" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 12v2.5h11V12" stroke="#4C7A6D" stroke-width="1.9" fill="none" stroke-linecap="round"/></svg>
      </button>
    </div>

    <div id="stageWrap">
      <div id="stage"></div>
      <div class="hint hide" id="cvHint"></div>
      <div class="zoom">
        <button onclick="zoomBy(1.25)">+</button>
        <button onclick="zoomBy(0.8)">−</button>
        <button onclick="fitView()" style="font-size:11px;font-weight:700;">맞춤</button>
      </div>
      <!-- 관계 범례 (확장) -->
      <div class="legend" id="legendBox">
        <div style="font-weight:700;margin-bottom:4px;font-size:11px;color:var(--ink);">상태 코딩</div>
        <div><i style="background:var(--st-addict)"></i>중독</div>
        <div><i style="background:var(--st-mental)"></i>우울·정신</div>
        <div><i style="background:var(--st-phys)"></i>신체질환</div>
        <div><i style="background:var(--st-care)"></i>치료 중</div>
        <div><i style="background:var(--st-disab)"></i>장애</div>
        <div style="font-weight:700;margin:6px 0 4px;font-size:11px;color:var(--ink);">관계선</div>
        <div><svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#22332E" stroke-width="1.5"/></svg> 결혼</div>
        <div><svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#22332E" stroke-width="1.5" stroke-dasharray="4 3"/></svg> 동거</div>
        <div><svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#22332E" stroke-width="1.5"/><line x1="14" y1="1" x2="14" y2="9" stroke="#22332E" stroke-width="1.5"/></svg> 별거</div>
        <div><svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#22332E" stroke-width="1.5"/><line x1="11" y1="1" x2="11" y2="9" stroke="#22332E" stroke-width="1.5"/><line x1="17" y1="1" x2="17" y2="9" stroke="#22332E" stroke-width="1.5"/></svg> 이혼</div>
        <div><svg width="28" height="10"><path d="M0 2v3h28v3" stroke="#22332E" stroke-width="1.5" fill="none"/></svg> 자녀</div>
        <div><svg width="28" height="10"><path d="M0 2v3h28v3" stroke="#22332E" stroke-width="1.5" fill="none" stroke-dasharray="4 3"/></svg> 입양</div>
        <div><svg width="28" height="10"><line x1="0" y1="3" x2="28" y2="3" stroke="#4C7A6D" stroke-width="1.5"/><line x1="0" y1="7" x2="28" y2="7" stroke="#4C7A6D" stroke-width="1.5"/></svg> 친밀</div>
        <div><svg width="28" height="10"><path d="M0 5l4-3 4 6 4-6 4 6 4-6 4 6 4-3" stroke="#C15B47" stroke-width="1.5" fill="none"/></svg> 갈등</div>
        <div><svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#7A8B85" stroke-width="1.5" stroke-dasharray="6 4"/><line x1="11" y1="1" x2="17" y2="9" stroke="#7A8B85" stroke-width="1.5"/></svg> 단절</div>
        <div><svg width="28" height="10"><line x1="0" y1="5" x2="28" y2="5" stroke="#8A6FA8" stroke-width="1.5" stroke-dasharray="3 3"/></svg> 소원</div>
        <div><svg width="28" height="10"><line x1="0" y1="3" x2="28" y2="3" stroke="#4C7A6D" stroke-width="1.5"/><path d="M0 8l4-2 4 4 4-4 4 4 4-4 4 4 4-2" stroke="#C15B47" stroke-width="1" fill="none"/></svg> 복합</div>
      </div>
    </div>

    <div class="toolbar">
      <button class="tool" id="tlSelect" onclick="setTool('select')">
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M5 3l2 16 4-5 5 2L5 3z" fill="none" stroke="#5B6E67" stroke-width="1.8" stroke-linejoin="round"/></svg></span>선택
      </button>
      <button class="tool" id="tlEraser" onclick="setTool('eraser')">
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M3 16l6-12h4l6 12" fill="none" stroke="#C15B47" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><line x1="6" y1="10" x2="16" y2="10" stroke="#C15B47" stroke-width="1.8"/><line x1="3" y1="16" x2="19" y2="16" stroke="#C15B47" stroke-width="1.8" stroke-linecap="round"/></svg></span>지우개
      </button>
      <button class="tool" id="tlPan" onclick="setTool('pan')">
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 3v16M3 11h16" stroke="#5B6E67" stroke-width="1.8" stroke-linecap="round"/><path d="M8 6l3-3 3 3M8 16l3 3 3-3M6 8l-3 3 3 3M16 8l3 3-3 3" fill="none" stroke="#5B6E67" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>이동
      </button>
      <button class="tool" id="tlLink" onclick="setTool('link')">
        <span class="sym"><svg width="26" height="22" viewBox="0 0 26 22"><rect x="2" y="8" width="7" height="7" fill="none" stroke="#5B6E67" stroke-width="1.8"/><circle cx="20.5" cy="11.5" r="4" fill="none" stroke="#5B6E67" stroke-width="1.8"/><line x1="9" y1="11.5" x2="16.5" y2="11.5" stroke="#5B6E67" stroke-width="1.8"/></svg></span>관계선
      </button>
      <button class="tool" id="tlMale" onclick="setTool('male')">
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><rect x="4" y="4" width="14" height="14" fill="none" stroke="#5B6E67" stroke-width="2"/></svg></span>남성
      </button>
      <button class="tool" id="tlFemale" onclick="setTool('female')">
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><circle cx="11" cy="11" r="7.5" fill="none" stroke="#5B6E67" stroke-width="2"/></svg></span>여성
      </button>
      <button class="tool" id="tlUnknown" onclick="setTool('unknown')">
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M11 3l8 8-8 8-8-8z" fill="none" stroke="#5B6E67" stroke-width="2" stroke-linejoin="round"/></svg></span>미상
      </button>
      <button class="tool" id="btnUndo" onclick="genoUndo()" disabled>
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M8 6L3 11l5 5M3 11h10a6 6 0 010 0" fill="none" stroke="#5B6E67" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 11h9a6 6 0 016 6" fill="none" stroke="#5B6E67" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>실행취소
      </button>
      <button class="tool" id="btnRedo" onclick="genoRedo()" disabled>
        <span class="sym"><svg width="22" height="22" viewBox="0 0 22 22"><path d="M14 6l5 5-5 5" fill="none" stroke="#5B6E67" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 11h-9a6 6 0 00-6 6" fill="none" stroke="#5B6E67" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></span>다시실행
      </button>
    </div>
  </div>
</div>

<div class="dim" id="dim" onclick="closeSheet()"></div>
<div class="sheet" id="sheet">
  <div class="grab"></div>
  <div id="sheetBody"></div>
</div>

<div id="toast"></div>

<!-- 외부 라이브러리 -->
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js"></script>
<script src="https://www.gstatic.com/firebasejs/10.12.2/firebase-database-compat.js"></script>
<script src="https://unpkg.com/konva@9.3.6/konva.min.js"></script>

<!-- 앱 스크립트 (로드 순서 중요: 전역 함수 의존성) -->
<script src="js/config.js"></script>
<script src="js/utils.js"></script>
<script src="js/auth.js"></script>
<script src="js/cases.js"></script>
<script src="js/canvas.js"></script>
<script src="js/sheet.js"></script>
<script src="js/genogram.js"></script>
<script src="js/admin.js"></script>
<script src="js/main.js"></script>
</body>
</html>
