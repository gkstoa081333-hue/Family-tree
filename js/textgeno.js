/* ============================================================
   textgeno.js — [기능] 글로 그리는 가계도
   가족관계 문장 → 인물·관계 목록(규칙 기반, 외부 전송·원문 저장 없음)
   → 세대별 자동 배치 → 기존 저장 구조(nodes/links/households)로 생성
   ============================================================ */

/* ── 호칭 사전: [표기(정규식), 역할, 성별, 형제순서(-1 손위 / 1 손아래)] — 긴 표기 먼저 ── */
const TG_TERMS = [
  ['대상자','ip'],['내담자','ip'],['본인','ip'],['클라이언트','ip'],['Cl','ip'],
  ['친할아버지','pgf','male'],['친할머니','pgm','female'],['외할아버지','mgf','male'],['외할머니','mgm','female'],
  ['할아버지','pgf','male'],['할머니','pgm','female'],
  ['외조부','mgf','male'],['외조모','mgm','female'],['조부','pgf','male'],['조모','pgm','female'],
  ['아버지','father','male'],['아빠','father','male'],['부친','father','male'],['부','father','male'],
  ['어머니','mother','female'],['엄마','mother','female'],['모친','mother','female'],['모','mother','female'],
  ['전남편','ex','male'],['전아내','ex','female'],['전부인','ex','female'],['전처','ex','female'],['전배우자','ex'],
  ['남편','spouse','male'],['아내','spouse','female'],['부인','spouse','female'],['처','spouse','female'],['배우자','spouse'],
  ['큰아들','child','male'],['작은아들','child','male'],['막내아들','child','male'],['장남','child','male'],['차남','child','male'],['아들','child','male'],
  ['큰딸','child','female'],['작은딸','child','female'],['막내딸','child','female'],['장녀','child','female'],['차녀','child','female'],['딸','child','female'],['자녀','child'],
  ['남동생','sib','male',1],['여동생','sib','female',1],['동생','sib',null,1],
  ['오빠','sib','male',-1],['언니','sib','female',-1],['누나','sib','female',-1],['형','sib','male',-1],
];
/* 아직 그리지 못하는 호칭 — 안내만 */
const TG_UNSUPPORTED = /(?<![가-힣])(고모|이모|삼촌|외삼촌|큰아버지|작은아버지|큰어머니|작은어머니|숙모|사촌|시어머니|시아버지|장모|장인|며느리|사위|손자|손녀|조카|계부|계모|새아버지|새어머니|의붓\S*)/g;

const TG_PART = '께서|에게|한테|이랑|하고|과는|와는|과도|와도|은|는|이|가|와|과|의|도|랑|을|를|만|께|로|으로';
const TG_PARTNER_P = /^(와|과|과는|와는|과도|와도|랑|이랑|하고|에게|한테|께)$/;
const TG_MENTION = new RegExp(
  `(?<![가-힣A-Za-z])(${TG_TERMS.map(t=>t[0]).join('|')})(\\s*\\([^)]*\\))?(?:\\s*(${TG_PART}))?(?![가-힣])`, 'g');

/* 상태(STATUS 키) — 증상 표기는 일치한 낱말 그대로 */
const TG_STATUS = [
  ['addict', /알코올|알콜|음주|술\s?문제|과음|도박|마약|약물\s?(?:남용|중독)|중독/g],
  ['mental', /자살\s?시도|자해|우울|조현|양극성|조울|불안|공황|강박|ADHD|정신\s?질환|환청|망상/g],
  ['phys',   /간암|폐암|위암|대장암|유방암|췌장암|암\s?투병|당뇨|고혈압|뇌졸중|중풍|뇌경색|치매|심장\s?질환|신부전|투석|파킨슨/g],
  ['disab',  /장애/g],
  ['care',   /치료\s?중|입원\s?중|통원|약물\s?치료|복약/g],
];
const TG_EVENTS = [
  ['death',     /사망|돌아가[셨시심]|별세|작고|숨[졌짐지]|사별/g],
  ['divorced',  /이혼/g],
  ['separated', /별거/g],
  ['remarriage',/재혼/g],
  ['marriage',  /결혼|혼인/g],
  ['cutoff',    /단절|절연|연락이?\s?(?:끊|두절|안\s?[되됨])|왕래가?\s?없/g],
  ['conflict',  /갈등|불화|사이가?\s?(?:나쁘|안\s?좋)|다툼|싸움|폭력|학대/g],
  ['distant',   /소원|서먹|멀어|거리감/g],
  ['close',     /친밀|가깝|사이가?\s?좋|의지/g],
  ['household', /(?:함께|같이)\s?(?:살|산다|사는|거주|지내|생활)|동거/g],
  ['residence', /요양원|요양병원|교도소|수감|쉼터|그룹홈|시설\s?입소/g],
];
const TG_COUPLE = ['divorced','separated','remarriage','marriage'];
const TG_EMO = ['cutoff','conflict','distant','close'];

/* 말로 입력한 나이(일흔넷, 사십육 세) → 숫자 */
function tgNormalizeNumbers(t){
  const TENS = {열:10,스물:20,스무:20,서른:30,마흔:40,쉰:50,예순:60,일흔:70,여든:80,아흔:90};
  const UNITS = {하나:1,한:1,둘:2,두:2,셋:3,세:3,넷:4,네:4,다섯:5,여섯:6,일곱:7,여덟:8,아홉:9};
  const SINO = {일:1,이:2,삼:3,사:4,오:5,육:6,칠:7,팔:8,구:9};
  const END = '(?=\\s*(?:살|세|이시|이고|이며|이다|이에요|입니다))';
  t = t.replace(new RegExp(`(${Object.keys(TENS).join('|')})(${Object.keys(UNITS).join('|')})?${END}`, 'g'),
    (m,a,b)=> String(TENS[a] + (b?UNITS[b]:0)));
  t = t.replace(/([이삼사오육칠팔구])?십([일이삼사오육칠팔구])?(?=\s*(?:살|세))/g,
    (m,a,b)=> String((a?SINO[a]:1)*10 + (b?SINO[b]:0)));
  return t;
}

function tgYearIn(s, ref){
  let y = null;
  s.replace(/(\d{4})\s*년(?!생)|(\d{1,2})\s*년\s*전|(재작년|작년|올해|금년)/g, (m,a,b,c)=>{
    y = a ? +a : b ? ref - +b : ({재작년:ref-2, 작년:ref-1, 올해:ref, 금년:ref})[c];
  });
  return y;
}
function tgNegated(after){ return /^[^,.]{0,8}?(없|아니|않)/.test(after); }

/* 글 → { people:{키:{gender,label,age,birth,alive,cause,status,symptoms,residence,order,unknown}}, rels:[{a,b,type,year}], households:[[키]], notes:[] } */
function parseFamilyText(text, ref){
  const people = {}, rels = [], households = [], notes = [];
  let parentsType = null;
  const termDef = Object.fromEntries(TG_TERMS.map(t=>[t[0], t]));
  const keyOf = term=>{ const r = termDef[term][1]; return (r==='child'||r==='sib') ? r+':'+term : r; };
  const person = (term)=>{
    const [, role, gender, order] = termDef[term], k = keyOf(term);
    if(!people[k]) people[k] = { gender:gender||null, label: role==='ip' ? '' : term, status:{}, symptoms:[], order: order||0 };
    if(role==='child' && /^(큰|장)/.test(term)) people[k].order = -1;
    if(role==='child' && /^막내/.test(term)) people[k].order = 9;
    return k;
  };
  const addRel = (a, b, type, year)=>{
    if(a===b) return;
    const kind = TG_COUPLE.includes(type) ? 'couple' : 'emo';
    const i = rels.findIndex(r=> ((r.a===a&&r.b===b)||(r.a===b&&r.b===a)) && (TG_COUPLE.includes(r.type)?'couple':'emo')===kind);
    const r = { a, b, type }; if(year) r.year = year;
    if(i>=0) rels[i] = r; else rels.push(r);
  };

  person('대상자');
  text = tgNormalizeNumbers(text.replace(/\r/g,''));
  const unsup = [...new Set([...text.matchAll(TG_UNSUPPORTED)].map(m=>m[1]))];
  if(unsup.length) notes.push(`아직 자동으로 그리지 못하는 호칭: ${unsup.join(', ')} — 직접 추가해 주세요.`);

  const sentences = text.split(/(?<!\d)\.(?!\d)|[\n!?]/).map(s=>s.trim()).filter(Boolean);
  for(const s of sentences){
    const pm = s.match(/부모(?:님)?(?:은|는|이|가)?\s.*?(이혼|별거)/);
    if(pm) parentsType = pm[1]==='이혼' ? 'divorced' : 'separated';

    /* 인물 언급 + 조사 종류(topic/partner/other) */
    const ms = [...s.matchAll(TG_MENTION)].map(m=>{
      const k = person(m[1]), paren = m[2]||'';
      /* 조사 없이 나이가 바로 오면 나이 뒤 조사를 본다 (딸 13살이랑) */
      const bare = s.slice(m.index + m[0].length).match(new RegExp(`^\\s*(\\d{1,3})(?:\\s*(?:세|살))?(?![\\d년월일회개명시번차%.])(?:(${TG_PART})(?![가-힣]))?`));
      const p = m[3] || (!paren && bare && bare[2]) || '';
      const kind = TG_PARTNER_P.test(p) ? 'partner' : /^(의|을|를|로|으로)$/.test(p) ? 'other' : 'topic';
      const P = people[k];
      if(/(^|[\s,(])(여|여성|F)(?=[\s,)])/.test(paren)) P.gender = 'female';
      if(/(^|[\s,(])(남|남성|M)(?=[\s,)])/.test(paren)) P.gender = 'male';
      const by = paren.match(/(\d{4})\s*년?생?/), ag = paren.match(/(?<!\d)(\d{1,3})(?!\d)/);
      if(by) P.birth = +by[1]; else if(ag) P.age = +ag[1];
      if(!paren && bare) P.age = +bare[1];
      return { k, kind, start:m.index, end:m.index + m[0].length + (!paren && !m[3] && bare ? bare[0].length : 0) };
    });
    /* 쉼표·및으로 이어진 언급은 마지막 언급의 조사를 따른다 (아들(17), 딸(13)과) */
    for(let i = ms.length-2; i>=0; i--){
      if(/^\s*(,|및|그리고)?\s*$/.test(s.slice(ms[i].end, ms[i+1].start)) && ms[i].kind==='topic') {
        ms[i].kind = ms[i+1].kind; ms[i].chain = true;
      }
    }

    let topic = 'ip', group = [], winStart = 0;
    const segs = [{ start:0, end: ms.length ? ms[0].start : s.length }];
    ms.forEach((m,i)=> segs.push({ m, start:m.end, end: i+1<ms.length ? ms[i+1].start : s.length }));
    for(const seg of segs){
      const m = seg.m;
      if(m){
        if(m.kind==='topic'){ topic = m.k; group = []; }
        else if(m.kind==='partner'){ group.push(m.k); }
        if(m.chain) continue;
      }
      const owner = m && m.kind==='topic' ? m.k : topic;
      const partners = m && m.kind==='partner' ? group.splice(0) : [];
      const segText = s.slice(seg.start, seg.end);
      const ag = m && m.kind==='topic' && people[owner].age===undefined && segText.match(/(?<!\d)(\d{1,3})\s*(?:세|살)/);
      if(ag) people[owner].age = +ag[1];

      for(const [st, re] of TG_STATUS){
        for(const x of segText.matchAll(re)){
          if(tgNegated(segText.slice(x.index + x[0].length))) continue;
          const P = people[owner];
          P.status[st] = true;
          let word = x[0].replace(/\s/g,'').replace('알콜','알코올');
          if(/자살시도|자해/.test(word)){
            const y = tgYearIn(s.slice(winStart, seg.start + x.index), ref);
            if(y) word += `(${y})`;
          }
          if(!P.symptoms.includes(word)) P.symptoms.push(word);
        }
      }
      const evs = TG_EVENTS.flatMap(([type, re])=> [...segText.matchAll(re)].map(x=>({ type, x })))
        .sort((a,b)=> a.x.index - b.x.index);
      for(const {type, x} of evs){
        const abs = seg.start + x.index, after = segText.slice(x.index + x[0].length);
        if(!/없|않/.test(x[0]) && tgNegated(after)) continue;
        const year = tgYearIn(s.slice(winStart, abs + x[0].length), ref);
        if(type==='residence'){ people[owner].residence = x[0].replace(/\s/g,''); continue; }
        winStart = abs + x[0].length;
        if(type==='death'){
          const dead = x[0]==='사별' && partners.length ? partners : [owner];
          dead.forEach(k=>{
            const P = people[k]; if(!P) return;
            P.alive = false;
            const c = s.slice(0, abs).match(/([가-힣A-Za-z]+?)(?:으로|로)\s*(?:인(?:해|한)\s*)?$/);
            P.cause = [year, c && c[1]].filter(Boolean).join(' ');
          });
          if(x[0]==='사별') partners.forEach(k=> addRel(owner, k, 'marriage'));
          continue;
        }
        if(type==='household'){ households.push([owner, ...partners]); continue; }
        /* 상대 없이 말한 정서관계는 대상자와의 관계로 본다 (남동생은 연락이 끊겼다) */
        const with_ = partners.length ? partners : owner!=='ip' && TG_EMO.includes(type) ? ['ip'] : [];
        with_.forEach(k=> addRel(owner, k, type, year));
      }
    }
  }

  /* 후처리: 전배우자 병합, 기본 결혼선, 성별 추정, 빠진 부모·조부모(미확인), 자녀선 */
  const relOf = (a,b)=> rels.find(r=> (r.a===a&&r.b===b)||(r.a===b&&r.b===a));
  if(people.ex && people.spouse && /divorced|separated/.test(relOf('ip','spouse')?.type||'')){
    const E = people.ex, P = people.spouse;
    Object.assign(P.status, E.status); P.symptoms.push(...E.symptoms.filter(w=>!P.symptoms.includes(w)));
    ['age','birth','alive','cause','residence'].forEach(f=>{ if(E[f]!==undefined && P[f]===undefined) P[f] = E[f]; });
    rels.forEach(r=>{ if(r.a==='ex') r.a='spouse'; if(r.b==='ex') r.b='spouse'; });
    households.forEach(h=> h.forEach((k,i)=>{ if(k==='ex') h[i]='spouse'; }));
    delete people.ex;
    const seen = new Set();   // 병합 뒤 같은 쌍·같은 종류가 겹치면 나중 언급만 남김
    for(let i = rels.length-1; i>=0; i--){
      const r = rels[i], key = [r.a, r.b].sort().join('|') + TG_COUPLE.includes(r.type);
      if(seen.has(key)) rels.splice(i, 1); else seen.add(key);
    }
  }
  const coupleOf = (a,b)=> rels.find(r=> ((r.a===a&&r.b===b)||(r.a===b&&r.b===a)) && TG_COUPLE.includes(r.type));
  if(people.spouse && !coupleOf('ip','spouse')) rels.push({ a:'ip', b:'spouse', type:'marriage' });
  if(people.ex && !coupleOf('ip','ex')) rels.push({ a:'ip', b:'ex', type:'divorced' });
  ['spouse','ex'].forEach(k=>{
    const P = people[k]; if(!P) return;
    if(/divorced/.test(coupleOf('ip',k)?.type||'') && !/^전/.test(P.label)) P.label = '전' + P.label;
  });

  const ip = people.ip, sp = people.spouse || people.ex;
  if(!ip.gender){
    const hint = sp && sp.gender ? (sp.gender==='male' ? 'female' : 'male')
      : people['sib:오빠'] || people['sib:언니'] ? 'female' : people['sib:형'] || people['sib:누나'] ? 'male' : null;
    ip.gender = hint;
  }
  if(sp && !sp.gender && ip.gender) sp.gender = ip.gender==='male' ? 'female' : 'male';
  if(!ip.gender) notes.push('대상자 성별을 글에서 찾지 못해 ◇로 그렸어요. "대상자(여, 46)"처럼 쓰면 반영돼요.');

  const sibs = Object.keys(people).filter(k=>k.startsWith('sib:'));
  const ensure = (k, gender, label)=>{ if(!people[k]) people[k] = { gender, label, status:{}, symptoms:[], unknown:true }; };
  if(people.pgf || people.pgm){ ensure('pgf','male','친조부(미확인)'); ensure('pgm','female','친조모(미확인)'); ensure('father','male','부(미확인)'); }
  if(people.mgf || people.mgm){ ensure('mgf','male','외조부(미확인)'); ensure('mgm','female','외조모(미확인)'); ensure('mother','female','모(미확인)'); }
  if(people.father || people.mother || sibs.length){ ensure('father','male','부(미확인)'); ensure('mother','female','모(미확인)'); }
  if(/^(할아버지|할머니)$/.test(people.pgf?.label||'') || /^(할아버지|할머니)$/.test(people.pgm?.label||''))
    notes.push('"할머니·할아버지"는 친가로 그렸어요. 외가라면 "외할머니"처럼 써 주세요.');

  if(people.father){ if(!coupleOf('father','mother')) rels.push({ a:'father', b:'mother', type: parentsType||'marriage' });
    ['ip', ...sibs].forEach(k=> rels.push({ a:'father', b:k, type:'child' })); }
  if(people.pgf){ if(!coupleOf('pgf','pgm')) rels.push({ a:'pgf', b:'pgm', type:'marriage' }); rels.push({ a:'pgf', b:'father', type:'child' }); }
  if(people.mgf){ if(!coupleOf('mgf','mgm')) rels.push({ a:'mgf', b:'mgm', type:'marriage' }); rels.push({ a:'mgf', b:'mother', type:'child' }); }
  Object.keys(people).filter(k=>k.startsWith('child:')).forEach(k=> rels.push({ a:'ip', b:k, type:'child' }));

  Object.values(people).forEach(P=>{ if(P.age!==undefined && !P.birth) P.birth = ref - P.age; });
  return { people, rels, households: households.filter(h=> h.length>1 && h.every(k=>people[k])), notes };
}

/* 세대별 배치: 조부모 -2, 부모 -1, 대상자·배우자·형제 0, 자녀 +1 */
function tgLayout(people){
  const GX = 130, GY = 170, pos = { ip:{ x:0, y:0 } };
  const byOrder = (a,b)=> (people[b].age??-1) - (people[a].age??-1) || (people[a].order||0) - (people[b].order||0);
  let lx = 0;
  ['spouse','ex'].forEach(k=>{ if(people[k]){ lx -= GX; pos[k] = { x:lx, y:0 }; } });
  const sibs = Object.keys(people).filter(k=>k.startsWith('sib:')).sort(byOrder);
  sibs.forEach((k,i)=> pos[k] = { x:GX*(i+1), y:0 });
  const cx = (sibs.length ? pos[sibs[sibs.length-1]].x : 0) / 2;
  const half = (people.pgf && people.mgf) ? GX : GX/2 + 10;
  if(people.father) pos.father = { x:cx-half, y:-GY };
  if(people.mother) pos.mother = { x:cx+half, y:-GY };
  [['pgf','pgm','father'],['mgf','mgm','mother']].forEach(([m,f,c])=>{
    if(people[m]){ pos[m] = { x:pos[c].x-GX/2-10, y:-2*GY }; pos[f] = { x:pos[c].x+GX/2+10, y:-2*GY }; }
  });
  const kids = Object.keys(people).filter(k=>k.startsWith('child:')).sort(byOrder);
  const partner = people.spouse ? 'spouse' : people.ex ? 'ex' : null;
  const mid = partner ? pos[partner].x/2 : 0;
  kids.forEach((k,i)=> pos[k] = { x: mid + (i-(kids.length-1)/2)*GX, y:GY });
  return pos;
}

/* ── 화면: 입력 시트 + 생성 ── */
const TG_EXAMPLE = '대상자(여, 46)는 2년 전 남편(48)과 이혼하고 아들(17), 딸(13)과 함께 산다. 올해 3월 자살시도 1회.\n'
  + '아버지는 2015년 간암으로 사망, 어머니(74)는 치매로 요양원 입소 중이다.\n'
  + '남동생(43)은 알코올 문제가 있고 대상자와 연락이 끊겼다.\n'
  + '전남편과는 갈등이 심하고, 딸과는 친밀하다.';

function openTextGeno(){
  openSheet(`
    <h3>글로 그리기</h3>
    <div class="sub">상담기록의 가족관계 문장을 붙여 넣으면 표준 기호로 가계도를 그려요.<br>
      글은 이 브라우저 안에서만 해석하고 저장하지 않아요. 그려진 인물·관계만 저장돼요.</div>
    <div class="fld"><label>가족관계 <button type="button" class="btn ghost" style="height:auto;padding:2px 10px;font-size:12px;margin-left:6px;" onclick="$('tgText').value=TG_EXAMPLE;tgPreview()">예시 넣기</button>${TG_SR ? `<button type="button" id="tgMicBtn" class="btn ghost" style="height:auto;padding:2px 10px;font-size:12px;margin-left:4px;" onclick="tgMic()">🎤 말로 입력</button>` : ''}</label>
      ${TG_SR ? `<div id="tgMicNote" class="hide" style="font-size:12px;color:var(--danger,#c0392b);margin:-2px 0 6px;">음성은 브라우저 회사 서버(크롬은 구글)에서 글자로 바뀌어요. 이름·주민번호 등은 말하지 말고 "어머니", "남동생"처럼 호칭으로 말해 주세요. 잠깐 쉬면 줄이 바뀌어요.</div>` : ''}
      <textarea id="tgText" class="inp" rows="7" oninput="tgPreview()" placeholder="예) 대상자(여, 46)는 남편(48)과 이혼하고 아들(17)과 산다. 부 62 알코올, 모 58 우울."></textarea></div>
    <div id="tgPreview" style="font-size:12.5px;line-height:1.7;color:var(--ink-soft);margin:-4px 0 14px;"></div>
    <div class="sheet-acts">
      <button class="btn ghost" onclick="closeSheet()">닫기</button>
      <button class="btn" onclick="buildFromText()">가계도 만들기</button>
    </div>`);
  setTimeout(()=> $('tgText')?.focus(), 50);
}

// 말로 입력: 브라우저 음성인식(Web Speech API). 문장 단위로 끊긴 결과를 한 줄씩 붙여 해석기의 문장 구분을 살림
const TG_SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition);
var tgRec = null;
function tgMic(){
  if(tgRec){ tgRec.stop(); return; }
  const ta = $('tgText'), btn = $('tgMicBtn');
  const base = ta.value.trim() ? ta.value.trim() + '\n' : '';
  const rec = tgRec = new TG_SR();
  rec.lang = 'ko-KR'; rec.continuous = true; rec.interimResults = true;
  rec.onresult = e=>{
    const lines = [...e.results].map(x=> x[0].transcript.trim()).filter(Boolean);
    ta.value = base + lines.join('\n'); tgPreview();
  };
  rec.onerror = e=> toast(e.error==='not-allowed' ? '마이크 사용을 허용해 주세요.' : e.error==='no-speech' ? '말소리가 들리지 않아요.' : '음성인식 오류: '+e.error);
  rec.onend = ()=>{ tgRec = null; if(btn) btn.textContent = '🎤 말로 입력'; };
  rec.start();
  btn.textContent = '■ 그만 듣기'; $('tgMicNote').classList.remove('hide');
}

const TG_REL_LABEL = { divorced:'이혼', separated:'별거', remarriage:'재혼', marriage:'결혼', cutoff:'단절', conflict:'갈등', distant:'소원', close:'친밀' };
function tgPreview(){
  const box = $('tgPreview'), t = $('tgText').value.trim();
  if(!t){ box.innerHTML = ''; return; }
  const r = parseFamilyText(t, new Date().getFullYear());
  const nm = k=> k==='ip' ? '대상자' : r.people[k].label;
  const ppl = Object.entries(r.people).filter(([,P])=>!P.unknown).map(([k,P])=>
    esc(nm(k)) + [P.age!==undefined ? P.age : '', P.alive===false ? '사망' : '', ...P.symptoms].filter(x=>x!=='').map(x=>' '+esc(String(x))).join(''));
  const rs = r.rels.filter(l=>TG_REL_LABEL[l.type]).map(l=> `${esc(nm(l.a))}–${esc(nm(l.b))} ${TG_REL_LABEL[l.type]}${l.year?' '+l.year:''}`);
  box.innerHTML = `<b>인물</b> ${ppl.join(' · ')}`
    + (rs.length ? `<br><b>관계</b> ${rs.join(' · ')}` : '')
    + (r.households.length ? `<br><b>동거</b> ${r.households.map(h=>h.map(k=>esc(nm(k))).join('·')).join(' / ')}` : '')
    + r.notes.map(n=>`<br><span style="color:var(--danger)">※ ${esc(n)}</span>`).join('');
}

function buildFromText(){
  const t = $('tgText').value.trim();
  if(!t){ toast('가족관계 글을 입력해 주세요.'); return; }
  const r = parseFamilyText(t, new Date().getFullYear());
  if(Object.keys(r.people).length < 2){ toast('가족을 찾지 못했어요. 예시처럼 호칭을 넣어 써 주세요.'); return; }
  const pos = tgLayout(r.people), upd = {};

  /* 새 가계도에 자동으로 놓인 빈 첫 인물은 대체한다 */
  let ox = 0, oy = 0;
  const all = Object.values(S.geno.nodes);
  const blank = all.length===1 && !Object.keys(S.geno.links).length && !all[0].name && !all[0].birth ? all[0] : null;
  if(blank){ ox = blank.x; oy = blank.y; delete S.geno.nodes[blank.id]; upd['nodes/'+blank.id] = null; }
  const rest = Object.values(S.geno.nodes);
  if(rest.length){   // 기존 가계도가 있으면 오른쪽 빈 곳에 그린다
    ox = Math.max(...rest.map(n=>n.x)) + 260 - Math.min(...Object.values(pos).map(p=>p.x));
    oy = (Math.min(...rest.map(n=>n.y)) + Math.max(...rest.map(n=>n.y))) / 2;
  }

  const ids = {}, now = Date.now();
  Object.entries(r.people).forEach(([k,P])=>{
    const id = uid(); ids[k] = id;
    const n = {
      id, gender:P.gender||'unknown', x:Math.round(ox+pos[k].x), y:Math.round(oy+pos[k].y),
      name:'', birth:P.birth ? String(P.birth) : '', alive:P.alive!==false, status:P.status, ip:k==='ip' && !rest.length, memo:'',
      education:'', relationship:P.label||'', symptoms:P.symptoms.join('·'), support:'', family_history:'',
      residence:P.residence||'', cause_of_death:P.cause||'', createdAt:now, updatedAt:now,
      displayFields:{ relationship:true, symptoms:true, residence:true, cause_of_death:true }
    };
    if(P.unknown) n.unknown = true;
    S.geno.nodes[id] = n; upd['nodes/'+id] = n;
  });
  r.rels.forEach(l=>{
    const id = uid(), link = { id, a:ids[l.a], b:ids[l.b], type:l.type };
    if(l.year){ if(/divorced|separated/.test(l.type)) link.yearEnd = String(l.year); else link.yearStart = String(l.year); }
    S.geno.links[id] = link; upd['links/'+id] = link;
  });
  r.households.forEach(h=>{
    const id = uid(), hh = { id, members:h.map(k=>ids[k]) };
    S.geno.households[id] = hh; upd['households/'+id] = hh;
  });
  db.ref(genoPath()).update(upd).catch(errSave);
  metaSave();   // 히스토리 1칸 → 실행취소 한 번에 통째로 되돌림
  closeSheet(); draw(); fitView();
  toast(`${Object.keys(r.people).length}명을 그렸어요. 마음에 안 들면 실행취소(Ctrl+Z)`);
  if(r.notes.length) hint(r.notes.join(' '));
}

if(typeof module!=='undefined') module.exports = { parseFamilyText, tgLayout, tgNormalizeNumbers };
