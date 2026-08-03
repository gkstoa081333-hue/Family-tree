/* ============================================================
   config.js — 설정·전역상태
   Firebase 초기화, 전역 상태 S, 상수(RELS/STATUS/PIN_KEY)
   ============================================================ */

/* ═══════════════════════════════════════════════════════════════
   ⚠️ Firebase 콘솔에서 발급받은 설정값으로 교체하세요.
   콘솔 → 프로젝트 설정 → 내 앱 → 웹 앱 → SDK 설정
   ※ PIN(WebCrypto)은 https 환경에서만 동작합니다.
      로컬 테스트는 `npx serve` 같은 로컬서버로, 배포는 Netlify로.
   ═══════════════════════════════════════════════════════════════ */
const firebaseConfig = {
  apiKey:            "AIzaSyAYGXGzru6atoC_hlfuB11h_NUOOKRjSAc",
  authDomain:        "family-tree-d57c9.firebaseapp.com",
  databaseURL:       "https://family-tree-d57c9-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId:         "family-tree-d57c9",
  storageBucket:     "family-tree-d57c9.firebasestorage.app",
  messagingSenderId: "193716972298",
  appId:             "1:193716972298:web:35d949ec311a6261b428f3"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.database();

/* ═══ 전역 상태 ═══ */
const S = {
  uid:null, me:null, org:null, joinCode:null,
  allCases:{},                 // 기관 전체 (관리자 패널용)
  cases:{},                    // 내가 열람 가능한 것
  caseId:null, geno:{nodes:{},links:{},households:{}},
  tool:'', sel:null, linkFrom:null,
  childMode:null,              // {parentId, type, yearStart, yearEnd} — 자녀 연속 등록 모드
  householdDraft:null,         // Set<nodeId> — 동거가족표시 도구로 순서대로 클릭 중인 인물들
  selected: new Set(),         // 다중 선택된 노드 ID
  nodeGroups: {},              // 노드ID → Konva Group 참조 (드래그용)
  stage:null, layer:null,
  pinBuf:'', pinMode:'verify',
  tab:'cases'
};
const PIN_KEY = 'geno_pin_ok';
let authBusy = false;          // 가입 처리 중 onAuthStateChanged 중복 진입 방지
let casesRef = null, membersRef = null;   // 리스너 중복 방지용 참조 (수정 #5)

const STATUS = {
  addict:{ label:'중독',      color:'#C15B47' },
  mental:{ label:'우울·정신',  color:'#8A6FA8' },
  phys:  { label:'신체질환',   color:'#C99A3A' },
  care:  { label:'치료 중',    color:'#4C7A6D' },
  disab: { label:'장애',      color:'#7A8B85' }
};
const RELS = {
  marriage:  { label:'결혼',  desc:'실선으로 연결',     kind:'couple' },
  cohabit:   { label:'동거',  desc:'점선으로 연결',     kind:'couple' },
  separated: { label:'별거',  desc:'사선 1개 표시',     kind:'couple' },
  divorced:  { label:'이혼',  desc:'사선 2개 표시',     kind:'couple' },
  remarriage:{ label:'재혼',  desc:'이전 이혼 + 새 결혼', kind:'couple' },
  child:     { label:'자녀',  desc:'부모 → 자녀로 연결', kind:'child'  },
  adopted:   { label:'입양',  desc:'점선 자녀선',       kind:'child'  },
  close:     { label:'친밀',  desc:'정서: 굵은 이중선',  kind:'emo'    },
  conflict:  { label:'갈등',  desc:'정서: 지그재그선',   kind:'emo'    },
  cutoff:    { label:'단절',  desc:'정서: 끊긴 선',     kind:'emo'    },
  distant:   { label:'소원',  desc:'정서: 점선 (거리감)', kind:'emo'    },
  complex:   { label:'복합',  desc:'정서: 친밀+갈등 혼합', kind:'emo'   }
};

