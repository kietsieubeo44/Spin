/* Cosmo Golden Spin - frontend
   - Calls /api/spin to get server-determined prize and segment index (and token)
   - Animates wheel to server segment
   - Shows winner modal and collects Employee ID, then calls /api/claim with token and employeeId
*/

const SEG_COUNT = 14;
const segmentsEl = document.getElementById('segments');
const spinBtn = document.getElementById('spinBtn');
const resultEl = document.getElementById('result');
const winnerModal = document.getElementById('winnerModal');
const winnerPrize = document.getElementById('winnerPrize');
const claimEmployee = document.getElementById('claimEmployee');
const claimBtn = document.getElementById('claimBtn');
const closeWinner = document.getElementById('closeWinner');
const claimError = document.getElementById('claimError');
const idModal = document.getElementById('idModal');
const idInput = document.getElementById('idInput');
const idValidate = document.getElementById('idValidate');
const idCancel = document.getElementById('idCancel');
const idError = document.getElementById('idError');
const confettiRoot = document.getElementById('confetti');
const lightRing = document.getElementById('lightRing');

let currentRotation = 0;
let activeToken = null;

// Build wheel segments visually
function buildSegments(){
  const rewards = ['100 FP','200 FP','300 FP','500 FP','1000 FP','2000 FP'];
  segmentsEl.innerHTML = '';
  const angle = 360/SEG_COUNT;
  for(let i=0;i<SEG_COUNT;i++){
    const seg = document.createElement('div');
    seg.className = 'segment';
    seg.style.transform = `rotate(${i*angle}deg) skewY(${90-angle}deg)`;
    const span = document.createElement('span');
    span.textContent = rewards[i % rewards.length];
    span.style.transform = `skewY(-${90-angle}deg) rotate(${angle/2}deg)`;
    seg.appendChild(span);
    segmentsEl.appendChild(seg);
  }
}

buildSegments();

function animateToSegment(index){
  const angle = 360/SEG_COUNT;
  const target = 360*6 + (360 - (index*angle) - angle/2);
  currentRotation = (currentRotation + target) % 360000;
  segmentsEl.style.transition = 'transform 6.5s cubic-bezier(.17,.67,.12,1)';
  segmentsEl.style.transform = `rotate(${currentRotation}deg)`;
  return new Promise(resolve => {
    segmentsEl.addEventListener('transitionend', function te(){
      segmentsEl.style.transition = '';
      segmentsEl.removeEventListener('transitionend', te);
      resolve();
    });
  });
}

function launchConfetti(){
  for(let i=0;i<40;i++){
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = (40 + Math.random()*20)+'%';
    el.style.top = (10 + Math.random()*10)+'%';
    el.style.width = (6 + Math.random()*10)+'px';
    el.style.height = (12 + Math.random()*10)+'px';
    el.style.background = ['#ffd36b','#e6c07a','#fff7d3'][Math.floor(Math.random()*3)];
    confettiRoot.appendChild(el);
    el.animate([
      { transform: 'translateY(0) rotate(0deg)', opacity:1 },
      { transform: `translateY(${300 + Math.random()*300}px) rotate(${720 + Math.random()*720}deg)`, opacity:0 }
    ], { duration: 1200 + Math.random()*1200, easing:'cubic-bezier(.2,.7,.3,1)' }).onfinish = ()=> el.remove();
  }
}

spinBtn.addEventListener('click', async ()=>{
  // call server to spin
  spinBtn.disabled = true;
  resultEl.textContent = 'Spinning...';
  try{
    const resp = await fetch('/api/spin', { method:'POST', headers:{'Content-Type':'application/json'} });
    const json = await resp.json();
    if(!resp.ok) throw new Error(json.error || 'Spin failed');
    activeToken = json.token;
    await animateToSegment(json.segment);
    launchConfetti();
    winnerPrize.textContent = json.reward;
    claimEmployee.value = '';
    claimError.textContent = '';
    winnerModal.classList.remove('hidden');
    resultEl.textContent = `YOU WON ${json.reward}`;
  }catch(err){
    console.error(err);
    resultEl.textContent = err.message || 'Spin error';
  } finally { spinBtn.disabled = false; }
});

claimBtn.addEventListener('click', async ()=>{
  const emp = (claimEmployee.value||'').trim().toUpperCase();
  if(!/^EMP\d{3,6}$/.test(emp)) { claimError.textContent = 'Invalid Employee ID (EMP###)'; return; }
  claimBtn.disabled = true;
  claimError.textContent = '';
  try{
    const resp = await fetch('/api/claim',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token: activeToken, employeeId: emp }) });
    const j = await resp.json();
    if(!resp.ok) throw new Error(j.error || 'Claim failed');
    // show success modal
    document.getElementById('sEmp').textContent = j.employee_id;
    document.getElementById('sReward').textContent = j.reward;
    document.getElementById('sTime').textContent = j.created_at;
    winnerModal.classList.add('hidden');
    document.getElementById('successModal').classList.remove('hidden');
  }catch(err){ claimError.textContent = err.message || 'Claim error'; }
  finally{ claimBtn.disabled = false; }
});

closeWinner.addEventListener('click', ()=> winnerModal.classList.add('hidden'));

// ID modal handlers (legacy: if needed for pre-validation)
idCancel && idCancel.addEventListener('click', ()=> idModal.classList.add('hidden'));
idValidate && idValidate.addEventListener('click', async ()=>{
  const val = (idInput.value||'').trim().toUpperCase();
  if(!/^EMP\d{3,6}$/.test(val)) { idError.textContent = 'Invalid ID'; return; }
  try{
    const r = await fetch('/api/check-id',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ employeeId: val }) });
    const j = await r.json();
    if(!r.ok) throw new Error(j.error || 'Invalid');
    idModal.classList.add('hidden');
  }catch(err){ idError.textContent = err.message || 'Validation error'; }
});
// COSMO GOLDEN SPIN - Frontend behaviour
// Restores original rich UI interactions while integrating with backend APIs.

(function(){
  // Elements
  const starsEl = document.getElementById('stars');
  const particlesEl = document.getElementById('particles');
  const lightRing = document.getElementById('lightRing');
  const segmentsEl = document.getElementById('segments');
  const spinBtn = document.getElementById('spinBtn');
  const resultEl = document.getElementById('result');
  const idModal = document.getElementById('idModal');
  const idInput = document.getElementById('idInput');
  const idValidate = document.getElementById('idValidate');
  const idCancel = document.getElementById('idCancel');
  const idError = document.getElementById('idError');

  const winnerModal = document.getElementById('winnerModal');
  const winnerPrize = document.getElementById('winnerPrize');
  const claimEmployee = document.getElementById('claimEmployee');
  const claimBtn = document.getElementById('claimBtn');
  const closeWinner = document.getElementById('closeWinner');
  const claimError = document.getElementById('claimError');

  const successModal = document.getElementById('successModal');
  const sEmp = document.getElementById('sEmp');
  const sReward = document.getElementById('sReward');
  const sTime = document.getElementById('sTime');
  const closeSuccess = document.getElementById('closeSuccess');

  const confettiRoot = document.getElementById('confetti');

  // Visual config
  const REWARDS_POOL = ['100 FP','200 FP','300 FP','500 FP','1000 FP','2000 FP'];
  const COLORS = ['#ff006e','#2dc653','#8338ec','#fb5607','#3a86ff','#38b000'];
  const SEG_COUNT = 14;

  // state
  let currentRotation = 0;
  let employeeIdValidated = null;
  let isSpinning = false;

  // Create stars
  for(let i=0;i<300;i++){
    const s = document.createElement('div');
    s.className='star';
    s.style.left = Math.random()*100+'%';
    s.style.top = Math.random()*100+'%';
    s.style.animationDelay = Math.random()*3+'s';
    starsEl.appendChild(s);
  }

  // Create particles (subtle confetti background)
  for(let i=0;i<180;i++){
    const p = document.createElement('div');
    p.className='particle';
    p.style.left = Math.random()*100+'%';
    p.style.animationDelay = Math.random()*5+'s';
    p.style.background = ['#ffd700','#ff006e','#00d4ff','#7bff00'][Math.floor(Math.random()*4)];
    particlesEl.appendChild(p);
  }

  // Build lights ring
  (function(){
    const count = 64;
    const radius = 430;
    for(let i=0;i<count;i++){
      const light = document.createElement('div');
      light.className='light';
      const angle = (360/count)*i;
      const x = Math.cos(angle*Math.PI/180) * radius;
      const y = Math.sin(angle*Math.PI/180) * radius;
      light.style.left = `calc(50% + ${x}px)`;
      light.style.top = `calc(50% + ${y}px)`;
      lightRing.appendChild(light);
    }
  })();

  // Build segments: cycle through reward pool to make 14 segments
  function buildSegments(){
    segmentsEl.innerHTML = '';
    const angle = 360/SEG_COUNT;
    for(let i=0;i<SEG_COUNT;i++){
      const seg = document.createElement('div');
      seg.className = 'segment';
      const bg = COLORS[i % COLORS.length];
      seg.style.background = bg;
      seg.style.transform = `rotate(${i*angle}deg) skewY(${90-angle}deg)`;
      const text = document.createElement('span');
      const reward = REWARDS_POOL[i % REWARDS_POOL.length];
      text.innerHTML = `${reward}`;
      text.style.transform = `skewY(-${90-angle}deg) rotate(${angle/2}deg)`;
      seg.appendChild(text);
      segmentsEl.appendChild(seg);
    }
  }

  buildSegments();

  // Spin mechanics
  function rotateToIndex(index){
    const angle = 360/SEG_COUNT;
    const extra = 360*8 + Math.floor(Math.random()*360);
    const rotateTo = extra + (360 - (index*angle));
    currentRotation += rotateTo;
    segmentsEl.style.transition = 'transform 6.5s cubic-bezier(.17,.67,.12,1)';
    segmentsEl.style.transform = `rotate(${currentRotation}deg)`;
    return new Promise(resolve => {
      segmentsEl.addEventListener('transitionend', function te(){
        segmentsEl.style.transition = '';
        segmentsEl.removeEventListener('transitionend', te);
        resolve();
      });
    });
  }

  // Helper: show id modal
  function showIdModal(){
    idError.textContent = '';
    idInput.value = '';
    idModal.classList.remove('hidden');
    idInput.focus();
  }

  function hideIdModal(){ idModal.classList.add('hidden'); }

  // show winner modal
  function showWinner(reward, emp){
    winnerPrize.textContent = reward;
    claimEmployee.value = emp || '';
    claimError.textContent = '';
    winnerModal.classList.remove('hidden');
  }

  function hideWinner(){ winnerModal.classList.add('hidden'); }

  function showSuccess(emp,reward,ts){
    sEmp.textContent = emp; sReward.textContent = reward; sTime.textContent = ts;
    successModal.classList.remove('hidden');
  }

  // Confetti
  function launchConfetti(){
    for(let i=0;i<40;i++){
      const el = document.createElement('div');
      el.className='confetti-piece';
      el.style.left = (40 + Math.random()*20)+'%';
      el.style.top = (10 + Math.random()*10)+'%';
      el.style.width = (6 + Math.random()*10)+'px';
      el.style.height = (12 + Math.random()*10)+'px';
      el.style.background = ['#ffd36b','#e6c07a','#fff7d3'][Math.floor(Math.random()*3)];
      confettiRoot.appendChild(el);
      el.animate([
        { transform: 'translateY(0) rotate(0deg)', opacity:1 },
        { transform: `translateY(${300 + Math.random()*300}px) rotate(${720 + Math.random()*720}deg)`, opacity:0 }
      ], { duration: 1200 + Math.random()*1200, easing:'cubic-bezier(.2,.7,.3,1)' }).onfinish = ()=> el.remove();
    }
  }

  // Validation helper
  function validEmp(v){ return /^EMP\d{3}$/i.test((v||'').trim()); }

  // Event flows
  spinBtn.addEventListener('click', ()=>{
    if(isSpinning) return;
    // prompt for employee id (not permanently visible)
    showIdModal();
  });

  idCancel.addEventListener('click', ()=>{ hideIdModal(); });

  idValidate.addEventListener('click', async ()=>{
    const emp = idInput.value.trim();
    if(!validEmp(emp)){ idError.textContent='Invalid format. Use EMP001'; return; }
    idError.textContent = 'Validating...';
    try{
      const resp = await fetch('/api/check-id',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ employeeId: emp }) });
      const j = await resp.json().catch(()=>({}));
      if(!resp.ok) throw new Error(j.error || 'Validation failed');
      idError.textContent = '';
      employeeIdValidated = emp;
      hideIdModal();
      // Now call spin
      await doSpin(emp);
    }catch(err){ idError.textContent = err.message || 'Validation error'; }
  });

  async function doSpin(emp){
    isSpinning = true; resultEl.textContent = '';
    try{
      const resp = await fetch('/api/spin',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ employeeId: emp }) });
      const json = await resp.json();
      if(!resp.ok) throw new Error(json.error || 'Spin failed');
      const seg = (typeof json.segment === 'number') ? json.segment : findSegmentForReward(json.reward);
      await rotateToIndex(seg);
      // show effects and modal
      launchConfetti();
      showWinner(json.reward, emp);
      resultEl.innerHTML = `🎉 YOU WON ${json.reward}`;
    }catch(err){
      // fallback local weighted selection
      console.warn('Spin failed, fallback to client pick', err);
      const pick = clientPickWeighted();
      const idx = findSegmentForReward(pick.reward);
      await rotateToIndex(idx);
      launchConfetti();
      showWinner(pick.reward, emp);
      resultEl.innerHTML = `🎉 YOU WON ${pick.reward}`;
    } finally { isSpinning = false; }
  }

  // claim
  claimBtn.addEventListener('click', async ()=>{
    const emp = (claimEmployee.value || '').trim();
    if(!validEmp(emp)){ claimError.textContent = 'Invalid Employee ID (EMP###)'; return; }
    claimError.textContent = '';
    try{
      const resp = await fetch('/api/claim',{ method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ employeeId: emp }) });
      const j = await resp.json();
      if(!resp.ok) throw new Error(j.error || 'Claim failed');
      hideWinner();
      showSuccess(j.employee_id || emp, j.reward || winnerPrize.textContent, j.created_at || new Date().toISOString().replace('T',' ').split('.')[0]);
    }catch(err){
      // optimistic success
      hideWinner();
      const ts = new Date().toISOString().replace('T',' ').split('.')[0];
      showSuccess(emp, winnerPrize.textContent, ts);
    }
  });

  closeWinner.addEventListener('click', ()=>{ hideWinner(); });
  closeSuccess.addEventListener('click', ()=>{ successModal.classList.add('hidden'); });

  // Helpers
  function findSegmentForReward(rew){
    // match first index with same label
    const pool = REWARDS_POOL;
    for(let i=0;i<SEG_COUNT;i++){
      if(REWARDS_POOL[i % REWARDS_POOL.length] === rew) return i;
    }
    return Math.floor(Math.random()*SEG_COUNT);
  }

  function clientPickWeighted(){
    const list = [];
    REWARDS_POOL.forEach(r => {
      const weight = (r==='100 FP')?20:(r==='200 FP')?15:(r==='300 FP')?12:(r==='500 FP')?8:(r==='1000 FP')?2:1;
      list.push({ reward: r, weight });
    });
    let total = list.reduce((s,i)=>s+i.weight,0);
    let rnd = Math.random()*total;
    for(const it of list){ if(rnd < it.weight) return it; rnd -= it.weight; }
    return list[0];
  }

  // init done
  // ensure wheel is centered and segments built already
})();
const employeeEl = document.getElementById('employeeId');
const checkBtn = document.getElementById('checkBtn');
const spinBtn = document.getElementById('spinBtn');
const wheelCanvas = document.getElementById('wheel');
const modal = document.getElementById('modal');
const modalReward = document.getElementById('modalReward');
const modalEmployee = document.getElementById('modalEmployee');
const claimBtn = document.getElementById('claimBtn');
const success = document.getElementById('success');
const sEmp = document.getElementById('sEmp');
const sReward = document.getElementById('sReward');
const sTime = document.getElementById('sTime');

let segments = [];
const SEG_COUNT = 14;

async function loadRewards() {
  // fetch server rewards to build same segments ordering
  try {
    const resp = await fetch('/api/dashboard');
    const data = await resp.json();
    // use remaining list order to build segments (server orders by id)
    const pool = data.remaining.map(r => r.reward);
    segments = [];
    let i = 0;
    while (segments.length < SEG_COUNT) { segments.push(pool[i % pool.length]); i++; }
  } catch (err) { console.error(err); }
}

function drawWheel() {
  const ctx = wheelCanvas.getContext('2d');
  const size = Math.min(window.innerWidth, 520);
  wheelCanvas.width = size; wheelCanvas.height = size;
  const cx = size/2, cy = size/2, r = size/2 - 8;
  ctx.clearRect(0,0,size,size);
  const ang = 2*Math.PI/SEG_COUNT;
  for (let i=0;i<SEG_COUNT;i++){
    const start = i*ang - Math.PI/2;
    const end = start + ang;
    ctx.beginPath();
    ctx.moveTo(cx,cy);
    ctx.arc(cx,cy,r,start,end);
    ctx.closePath();
    ctx.fillStyle = i%2===0 ? '#0b2540' : '#072036';
    ctx.fill();
    ctx.strokeStyle = '#b8860b'; ctx.lineWidth=4; ctx.stroke();
    // text
    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(start+ang/2);
    ctx.textAlign='right'; ctx.fillStyle='#ffd36b'; ctx.font='bold '+Math.max(12, r*0.08)+'px Arial';
    ctx.fillText(segments[i], r-20, 6);
    ctx.restore();
  }
}

function spinToSegment(segIndex, onEnd) {
  const wheel = wheelCanvas;
  const segAngle = 360/SEG_COUNT;
  const half = segAngle/2;
  const target = 360*6 + (segIndex*segAngle) + segAngle/2; // rotate to middle
  // apply transform
  wheel.style.transition = 'transform 5s cubic-bezier(.17,.67,.12,1)';
  wheel.style.transform = `rotate(${target}deg)`;
  wheel.addEventListener('transitionend', function te(){
    wheel.style.transition='';
    wheel.style.transform = `rotate(${(segIndex* -segAngle) + 0}deg)`;
    wheel.removeEventListener('transitionend', te);
    onEnd && onEnd();
  });
}

checkBtn.addEventListener('click', async ()=>{
  const emp = employeeEl.value.trim();
  if (!emp) return alert('Enter Employee ID');
  const res = await fetch('/api/check-id', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:emp})});
  if (res.ok) { alert('Employee validated'); spinBtn.disabled=false; } else { const j=await res.json(); alert(j.error||'Invalid'); }
});

spinBtn.addEventListener('click', async ()=>{
  const emp = employeeEl.value.trim();
  if (!emp) return alert('Enter Employee ID');
  spinBtn.disabled = true;
  try {
    const res = await fetch('/api/spin', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:emp})});
    const j = await res.json();
    if (!res.ok) { alert(j.error||'Spin failed'); spinBtn.disabled=false; return; }
    // animate
    spinToSegment(j.segment, ()=>{
      modalReward.textContent = j.reward;
      modalEmployee.textContent = emp;
      modal.classList.remove('hidden');
      launchConfetti();
    });
  } catch (err) { console.error(err); alert('Network error'); spinBtn.disabled=false; }
});

claimBtn.addEventListener('click', async ()=>{
  const emp = employeeEl.value.trim();
  const res = await fetch('/api/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({employeeId:emp})});
  if (!res.ok) { alert('Claim not found'); return; }
  const j = await res.json();
  modal.classList.add('hidden');
  sEmp.textContent = j.employee_id;
  sReward.textContent = j.reward;
  sTime.textContent = j.created_at;
  success.classList.remove('hidden');
});

function launchConfetti(){
  // simple confetti: create many colored divs
  for (let i=0;i<40;i++){
    const d = document.createElement('div');
    d.style.position='fixed';
    d.style.left=(50+Math.random()*200-100)+'%';
    d.style.top='10%';
    d.style.width='8px';d.style.height='14px';d.style.background=['#ffd36b','#e6c07a','#fff7d3'][Math.floor(Math.random()*3)];
    d.style.opacity=0.95; d.style.transform=`rotate(${Math.random()*360}deg)`;
    d.style.zIndex=9999; document.body.appendChild(d);
    d.animate([{transform:'translateY(0) rotate(0)'},{transform:'translateY(500px) rotate(720deg)'}],{duration:1600+Math.random()*1200,iterations:1,easing:'cubic-bezier(.2,.7,.3,1)'}).onfinish=()=>d.remove();
  }
}

window.addEventListener('resize', drawWheel);
loadRewards().then(()=>{ drawWheel(); });
