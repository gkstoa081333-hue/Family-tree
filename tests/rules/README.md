# 보안 규칙 테스트 (가상 계정 · 로컬 에뮬레이터)

운영 DB를 건드리지 않고 `proposed-rtdb-rules.json`을 로컬 Firebase 에뮬레이터에 올려
가입·승인·거절·케이스·삭제·슈퍼관리자 흐름을 가상 계정으로 실행한다. Java 11+ 필요.

```bash
cd tests/rules
npm install
npm test
```

규칙을 고친 뒤 콘솔에 게시하기 전에 반드시 돌려서 전부 ✅인지 확인할 것.
