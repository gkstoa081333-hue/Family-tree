# 가계도 · 제네그램 (Genogram)

공주시정신건강복지센터 내부용 가계도(제네그램) 웹앱. 다기관·승인제·PIN 보호 구조 위에서 내담자 가족 구조와 정서·상태를 코딩해 기록으로 남긴다.

- **스택**: Firebase (Auth + Realtime Database) + Konva.js, 빌드 도구 없는 순수 정적 웹
- **호스팅**: Netlify / Cloudflare Pages 등 정적 호스팅에 그대로 배포 가능
- **Firebase 프로젝트**: `family-tree-d57c9` (asia-southeast1)

## 폴더 구조

```
genogram/
├─ index.html          # HTML 골격 + CSS/JS 참조 (빌드 불필요)
├─ css/
│  └─ styles.css       # [디자인] 전체 스타일
├─ js/
│  ├─ config.js        # 설정·전역상태 — Firebase 초기화, S, RELS/STATUS
│  ├─ utils.js         # 공통 유틸 — toast/show/esc/pinHash/timeAgo
│  ├─ auth.js          # [계정연동] 로그인·가입·기관·승인·라우팅·PIN
│  ├─ cases.js         # [기능] 케이스 목록·검색·생성·설정
│  ├─ canvas.js        # [기능] 캔버스·노드/링크 렌더링
│  ├─ sheet.js         # [기능] 인물·관계선 편집 시트
│  ├─ genogram.js      # [기능] 우클릭 메뉴·가족 추가·Undo/Redo·PNG
│  ├─ admin.js         # [기능] 관리자(승인·역할·공개설정·초대코드)
│  └─ main.js          # 부팅·전역 이벤트·캔버스 단축키
└─ README.md
```

## 스크립트 로드 순서 (중요)

모든 함수가 전역 스코프에 정의되므로 **로드 순서가 곧 의존성 순서**다. `index.html`에서 아래 순서를 반드시 유지한다.

```
config → utils → auth → cases → canvas → sheet → genogram → admin → main
```

파일을 추가하거나 순서를 바꿀 때는, 앞 파일에서 정의한 함수/변수를 뒤 파일이 참조한다는 점에 유의.

## 로컬 실행

정적 서버로 열면 된다 (PIN의 WebCrypto는 https 또는 localhost에서만 동작).

```bash
python3 -m http.server 5500
# http://localhost:5500 접속
```

## 데이터 구조 (Realtime Database)

```
orgs/{orgId}                      기관 정보
orgCodes/{code} = orgId           초대코드 → 기관 매핑
orgPrivate/{orgId}/joinCode       기관 초대코드
orgMembers/{orgId}/{uid}          구성원 상태(role/approved)
users/{uid}                       사용자 프로필
cases/{orgId}/{caseId}            케이스(내담자) 메타·썸네일
genograms/{orgId}/{caseId}        가계도 본체
  ├─ nodes/{nodeId}               인물 (gender/x/y/name/status/임상필드…)
  └─ links/{linkId}               관계 (a,b,type) — couple/child/emo
```

관계 유형(`RELS`)은 구조선(couple/child)과 정서선(emo)으로 나뉜다. 정서선(친밀·갈등·단절·소원·복합)으로 "부와는 보통, 모와는 갈등" 같은 개별 관계를 표현한다.

## 조작 (데스크톱 기준)

- **인물 우클릭** → 배우자/자녀/부모/형제 원클릭 추가, 관계선 긋기, 정보수정, 삭제
- **인물 선택 + Delete** → 삭제
- **Ctrl+Z / Ctrl+Shift+Z** → 실행취소 / 다시실행
- 기존 툴바(도구 선택 후 탭) 방식도 그대로 사용 가능 (모바일 호환)

## 배포

빌드 단계가 없으므로 이 폴더를 그대로 정적 호스팅에 올리면 된다.

- **Netlify**: 폴더를 드래그 앤 드롭하거나 저장소 연결 (빌드 명령 없음, 퍼블리시 디렉터리 = 루트)
- **Cloudflare Pages**: 저장소 연결, 빌드 명령 비움, 출력 디렉터리 = 루트

## 주의: Firebase 설정 키

`js/config.js`의 `firebaseConfig`는 클라이언트 공개 키다(웹 앱에서 원래 노출됨). **실제 보안은 Realtime Database 보안 규칙으로 강제**해야 한다. 저장소를 공개(public)로 둘 경우, 보안 규칙이 기관/승인/역할 기반으로 제대로 걸려 있는지 반드시 확인할 것.
