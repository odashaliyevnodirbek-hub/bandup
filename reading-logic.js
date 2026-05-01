// ============================================================
//  BandWise — Reading Logic
//  Depends on: reading-data.js (PASSAGES array)
// ============================================================

// ── STATE ────────────────────────────────────────────────────
let currentPassage = null;
let answers        = {};      // { questionNum: { el, correct } }
let timeLeft       = 20 * 60;
let timerInterval  = null;
let paused         = false;
let currentColor   = 'yellow';
let fontSize       = 15;      // px, passage body font size
let isDragging     = false;
let startX         = 0;
let startLeftW     = 0;

const colorMap = { yellow:'hl-y', green:'hl-g', blue:'hl-b', pink:'hl-p' };

// Band score lookup (correct out of total)
function getBand(correct, total) {
  const pct = correct / total;
  if (pct >= 0.97) return '9.0';
  if (pct >= 0.93) return '8.5';
  if (pct >= 0.87) return '8.0';
  if (pct >= 0.80) return '7.5';
  if (pct >= 0.73) return '7.0';
  if (pct >= 0.67) return '6.5';
  if (pct >= 0.60) return '6.0';
  if (pct >= 0.53) return '5.5';
  if (pct >= 0.47) return '5.0';
  if (pct >= 0.40) return '4.5';
  if (pct >= 0.33) return '4.0';
  if (pct >= 0.27) return '3.5';
  return '3.0';
}

// ── VIEW SWITCHER ─────────────────────────────────────────────
function showView(id) {
  ['selectorView','introView','testView'].forEach(v => {
    const el = document.getElementById(v);
    if (el) { el.style.display = 'none'; }
  });
  const target = document.getElementById(id);
  if (target) {
    target.style.display = 'flex';
    target.style.flexDirection = 'column';
  }
  window.scrollTo(0, 0);
}

// ── FULLSCREEN (hide/show sidebar) ───────────────────────────
function enterFullscreen() {
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  if (sidebar) sidebar.style.display = 'none';
  if (main)    { main.style.marginLeft = '0'; main.style.width = '100%'; }
}

function exitFullscreen() {
  const sidebar = document.querySelector('.sidebar');
  const main    = document.querySelector('.main');
  if (sidebar) sidebar.style.display = '';
  if (main)    { main.style.marginLeft = ''; main.style.width = ''; }
}

// ── SELECTOR ─────────────────────────────────────────────────
function buildSelector() {
  const grid = document.getElementById('testsGrid');
  if (!grid) return;
  grid.innerHTML = '';

  PASSAGES.forEach((p, i) => {
    const isLocked = p.access === 'premium';
    const diffClass = { easy:'diff-easy', medium:'diff-medium', hard:'diff-hard' }[p.difficulty] || 'diff-medium';
    const diffLabel = p.difficulty.charAt(0).toUpperCase() + p.difficulty.slice(1);

    const card = document.createElement('div');
    card.className = 'test-card' + (isLocked ? ' locked' : '');
    card.dataset.diff = p.difficulty;
    if (!isLocked) card.onclick = () => showIntro(p.id);

    const tagsHtml = p.tags.map(t => `<span class="tc-tag">${t}</span>`).join('');
    const accessTag = isLocked
      ? `<span class="tc-tag">⭐ Premium</span>`
      : `<span class="tc-tag gold">✓ Free</span>`;

    card.innerHTML = `
      <div class="diff-badge ${diffClass}">${diffLabel}</div>
      <div class="tc-num">0${i + 1}</div>
      <div class="tc-title">${p.title}</div>
      <div class="tc-desc">${p.description}</div>
      <div class="tc-tags">${accessTag}${tagsHtml}<span class="tc-tag">${p.questionCount} Questions</span></div>
      <div class="tc-footer">
        <span class="tc-meta">⏱ ${p.minutes} min · 📖 ${p.words} words</span>
        ${isLocked
          ? `<button class="btn-locked" onclick="location.href='pricing-page.html'">🔒 Unlock</button>`
          : `<button class="btn-go" onclick="event.stopPropagation();showIntro(${p.id})">View →</button>`
        }
      </div>`;
    grid.appendChild(card);
  });

  // "More coming soon" card
  const more = document.createElement('div');
  more.className = 'test-card';
  more.style.cssText = 'border-style:dashed;cursor:default;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:0.5rem;opacity:0.5';
  more.innerHTML = `<div style="font-size:2rem">➕</div><div style="font-weight:600;font-size:0.88rem">More coming soon</div><div style="font-size:0.75rem;color:var(--muted2)">New passages added regularly</div>`;
  grid.appendChild(more);
}

function filterDiff(diff, btn) {
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  document.querySelectorAll('.test-card').forEach(card => {
    if (card.style.borderStyle === 'dashed') return; // keep "more" card
    card.style.display = (diff === 'all' || card.dataset.diff === diff) ? 'block' : 'none';
  });
}

// ── INTRO ─────────────────────────────────────────────────────
function showIntro(passageId) {
  currentPassage = PASSAGES.find(p => p.id === passageId);
  if (!currentPassage) return;
  const p = currentPassage;

  document.getElementById('introEyebrow').textContent  = `📖 Reading Test 0${p.id} · ${p.difficulty.charAt(0).toUpperCase()+p.difficulty.slice(1)}`;
  document.getElementById('introTitle').innerHTML       = p.title;
  document.getElementById('introDesc').textContent      = p.description;
  document.getElementById('introStatMin').textContent   = p.minutes;
  document.getElementById('introStatQ').textContent     = p.questionCount;
  document.getElementById('introStatWords').textContent = p.words;
  document.getElementById('introStatAccess').textContent= p.access === 'free' ? 'Free' : 'Premium';

  const typesEl = document.getElementById('introTypes');
  typesEl.innerHTML = p.questionTypes.map(t => `<span class="intro-type">✓ ${t}</span>`).join('');

  showView('introView');
}

function backToSelector() {
  clearInterval(timerInterval);
  paused    = false;
  answers   = {};
  timeLeft  = 20 * 60;
  exitFullscreen();
  showView('selectorView');
}

function goBackToIntro() {
  clearInterval(timerInterval);
  paused   = false;
  answers  = {};
  timeLeft = 20 * 60;
  exitFullscreen();
  resetTestUI();
  showView('introView');
}

// ── TEST RENDERER ─────────────────────────────────────────────
function startTest() {
  if (!currentPassage) return;
  renderPassage();
  renderQuestions();
  resetTestUI();
  enterFullscreen();
  showView('testView');

  document.getElementById('testTitleBar').textContent = '📖 ' + currentPassage.title;
  timeLeft = currentPassage.minutes * 60;
  paused   = false;
  answers  = {};
  updateTimerDisplay();

  timerInterval = setInterval(() => {
    if (paused) return;
    timeLeft--;
    updateTimerDisplay();
    if (timeLeft === 300) showToast('⚠️ 5 minutes remaining!', true);
    if (timeLeft === 60)  showToast('🚨 1 minute left!', true);
    if (timeLeft <= 0)    { clearInterval(timerInterval); submitTest(); }
  }, 1000);
}

function renderPassage() {
  const p    = currentPassage;
  const body = document.getElementById('passageBody');
  const meta = document.getElementById('passageMeta');
  const titleEl = document.getElementById('passageTitle');

  titleEl.textContent = p.title;
  meta.innerHTML = `<span>📖 ${p.words} words</span><span>⏱ ~${Math.round(p.minutes*0.4)} min read</span><span>🎓 Academic</span>`;
  body.innerHTML  = p.paragraphs.map(para => `<p>${para}</p>`).join('');
  body.style.fontSize = fontSize + 'px';
}

function renderQuestions() {
  const panel = document.getElementById('questionsPanel');
  panel.innerHTML = '';

  const totalQ = currentPassage.sections.reduce((s, sec) => s + sec.questions.length, 0);
  document.getElementById('progressText').textContent = `0 / ${totalQ}`;
  document.getElementById('progressFill').style.width = '0%';

  currentPassage.sections.forEach(sec => {
    // Section label
    const lbl = document.createElement('div');
    lbl.className = 'q-section-label';
    lbl.textContent = sec.label;
    panel.appendChild(lbl);

    // Instruction
    const inst = document.createElement('div');
    inst.className = 'q-instruction';
    inst.innerHTML = sec.instruction;
    panel.appendChild(inst);

    // For 'ends' and 'match' — show the options box first
    if (sec.type === 'ends' || sec.type === 'match') {
      const optBox = document.createElement('div');
      optBox.className = 'options-box';
      optBox.style.cssText = 'background:var(--surface2);border:1px solid var(--border);border-radius:10px;padding:1rem 1.2rem;margin-bottom:1.2rem;';
      optBox.innerHTML = sec.options.map(o =>
        `<div style="font-size:0.82rem;margin-bottom:0.4rem;color:var(--muted2)"><strong style="color:var(--text)">${o.letter.toUpperCase()}</strong> &nbsp;${o.text}</div>`
      ).join('');
      panel.appendChild(optBox);
    }

    // Questions
    sec.questions.forEach(q => {
      const block = document.createElement('div');
      block.className = 'question-block';
      block.id = `qblock-${q.num}`;

      const numEl = document.createElement('div');
      numEl.className = 'q-num';
      numEl.textContent = `Question ${q.num}`;
      block.appendChild(numEl);

      const textEl = document.createElement('div');
      textEl.className = 'q-text';
      textEl.innerHTML = q.text.replace(/\n/g, ' ').trim();
      block.appendChild(textEl);

      // Render input by type
      if (sec.type === 'tfng') {
        block.appendChild(makeTFNG(q, ['TRUE','FALSE','NOT GIVEN']));
      } else if (sec.type === 'ynng') {
        block.appendChild(makeTFNG(q, ['YES','NO','NOT GIVEN']));
      } else if (sec.type === 'mcq') {
        block.appendChild(makeMCQ(q, sec.options));
      } else if (sec.type === 'match') {
        block.appendChild(makeMatch(q, sec.options));
      } else if (sec.type === 'ends') {
        block.appendChild(makeEnds(q, sec.options));
      } else if (sec.type === 'fill') {
        block.appendChild(makeFill(q));
      }

      panel.appendChild(block);
    });
  });

  // Submit row
  const submitRow = document.createElement('div');
  submitRow.className = 'submit-row';
  submitRow.innerHTML = `
    <span style="font-size:0.78rem;color:var(--muted)" id="answeredCount">0 of ${totalQ} answered</span>
    <button class="btn-submit" id="submitBtn" onclick="submitTest()" disabled>Submit Answers</button>`;
  panel.appendChild(submitRow);
  updateProgress();
}

// ── QUESTION BUILDERS ─────────────────────────────────────────

function makeTFNG(q, labels) {
  const wrap = document.createElement('div');
  wrap.className = 'options';
  const colors = { TRUE:'var(--green)', FALSE:'var(--red)', 'NOT GIVEN':'var(--blue)', YES:'var(--green)', NO:'var(--red)' };
  labels.forEach(lbl => {
    const opt = document.createElement('div');
    opt.className = 'option';
    const c = colors[lbl] || 'var(--muted2)';
    opt.innerHTML = `<span class="opt-letter" style="color:${c};border-color:${c}">${lbl === 'NOT GIVEN' ? 'NG' : lbl[0]}</span> ${lbl}`;
    if (lbl === q.answer) opt.dataset.correct = 'true';
    opt.onclick = () => {
      wrap.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      answers[q.num] = { el: opt, correct: lbl === q.answer };
      updateProgress();
    };
    wrap.appendChild(opt);
  });
  return wrap;
}

function makeMCQ(q, options) {
  // options may come from section or question itself
  const opts = q.options || options || [];
  const wrap = document.createElement('div');
  wrap.className = 'options';
  opts.forEach(o => {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.innerHTML = `<span class="opt-letter">${o.letter.toUpperCase()}</span> ${o.text}`;
    if (o.letter.toLowerCase() === q.answer.toLowerCase()) opt.dataset.correct = 'true';
    opt.onclick = () => {
      wrap.querySelectorAll('.option').forEach(x => x.classList.remove('selected'));
      opt.classList.add('selected');
      answers[q.num] = { el: opt, correct: o.letter.toLowerCase() === q.answer.toLowerCase() };
      updateProgress();
    };
    wrap.appendChild(opt);
  });
  return wrap;
}

function makeMatch(q, options) {
  // Heading match — pick from i to viii
  const wrap = document.createElement('div');
  wrap.className = 'options';
  options.forEach(o => {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.innerHTML = `<span class="opt-letter">${o.letter}</span> ${o.text}`;
    if (o.letter === q.answer) opt.dataset.correct = 'true';
    opt.onclick = () => {
      wrap.querySelectorAll('.option').forEach(x => x.classList.remove('selected'));
      opt.classList.add('selected');
      answers[q.num] = { el: opt, correct: o.letter === q.answer };
      updateProgress();
    };
    wrap.appendChild(opt);
  });
  return wrap;
}

function makeEnds(q, options) {
  // Sentence endings — pick A-F
  const wrap = document.createElement('div');
  wrap.className = 'options';
  options.forEach(o => {
    const opt = document.createElement('div');
    opt.className = 'option';
    opt.innerHTML = `<span class="opt-letter">${o.letter.toUpperCase()}</span> ${o.text}`;
    if (o.letter.toLowerCase() === q.answer.toLowerCase()) opt.dataset.correct = 'true';
    opt.onclick = () => {
      wrap.querySelectorAll('.option').forEach(x => x.classList.remove('selected'));
      opt.classList.add('selected');
      answers[q.num] = { el: opt, correct: o.letter.toLowerCase() === q.answer.toLowerCase() };
      updateProgress();
    };
    wrap.appendChild(opt);
  });
  return wrap;
}

function makeFill(q) {
  const wrap = document.createElement('div');
  wrap.style.cssText = 'display:flex;flex-direction:column;gap:0.4rem;margin-top:-0.3rem;';

  const input = document.createElement('input');
  input.type        = 'text';
  input.placeholder = 'Type your answer…';
  input.className   = 'fill-input';
  input.style.cssText = `
    background:var(--surface2);
    border:1px solid var(--border);
    border-radius:8px;
    padding:0.55rem 0.9rem;
    font-family:'DM Sans',sans-serif;
    font-size:0.85rem;
    color:var(--text);
    outline:none;
    transition:border-color 0.2s;
    width:100%;
    box-sizing:border-box;`;
  input.onfocus = () => input.style.borderColor = 'var(--gold)';
  input.onblur  = () => input.style.borderColor = 'var(--border)';

  input.addEventListener('input', () => {
    const val = input.value.trim();
    if (val.length > 0) {
      // Build accepted answers list
      const accepted = [q.answer, ...(q.altAnswers || [])].map(a => a.toLowerCase().trim());
      answers[q.num] = {
        el: input,
        correct: accepted.includes(val.toLowerCase()),
        userVal: val,
        acceptedAnswers: accepted
      };
    } else {
      delete answers[q.num];
    }
    updateProgress();
  });

  wrap.appendChild(input);
  return wrap;
}

// ── PROGRESS ──────────────────────────────────────────────────
function updateProgress() {
  const totalQ = currentPassage.sections.reduce((s, sec) => s + sec.questions.length, 0);
  const count  = Object.keys(answers).length;
  const pct    = (count / totalQ) * 100;

  document.getElementById('progressFill').style.width  = pct + '%';
  document.getElementById('progressText').textContent  = `${count} / ${totalQ}`;

  const countEl = document.getElementById('answeredCount');
  if (countEl) countEl.textContent = `${count} of ${totalQ} answered`;

  // Enable submit when all questions have an entry (including fill inputs with any text)
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = count < totalQ;
}

// ── TIMER ─────────────────────────────────────────────────────
function updateTimerDisplay() {
  const m  = Math.floor(timeLeft / 60).toString().padStart(2, '0');
  const s  = (timeLeft % 60).toString().padStart(2, '0');
  const el = document.getElementById('timerVal');
  if (el) {
    el.textContent = `${m}:${s}`;
    el.classList.toggle('warning', timeLeft <= 120);
  }
}

function togglePause() {
  paused = !paused;
  const btn = document.getElementById('pauseBtn');
  if (btn) {
    btn.textContent = paused ? '▶ Resume' : '⏸ Pause';
    btn.classList.toggle('active', paused);
  }
  showToast(paused ? '⏸ Timer paused' : '▶ Timer resumed', false);
}

function resetTimer() {
  timeLeft = currentPassage ? currentPassage.minutes * 60 : 20 * 60;
  paused   = false;
  const btn = document.getElementById('pauseBtn');
  if (btn) { btn.textContent = '⏸ Pause'; btn.classList.remove('active'); }
  updateTimerDisplay();
  showToast('↺ Timer reset', false);
}

// ── FONT SIZE ─────────────────────────────────────────────────
function changeFontSize(delta) {
  fontSize = Math.min(22, Math.max(12, fontSize + delta));
  const body = document.getElementById('passageBody');
  if (body) body.style.fontSize = fontSize + 'px';
  showToast(`Font size: ${fontSize}px`, false);
}

// ── DRAGGABLE DIVIDER ─────────────────────────────────────────
function initDivider() {
  const divider = document.getElementById('panelDivider');
  const layout  = document.getElementById('readingLayout');
  if (!divider || !layout) return;

  divider.addEventListener('mousedown', e => {
    isDragging = true;
    startX     = e.clientX;
    const leftPanel = layout.querySelector('.passage-panel');
    startLeftW = leftPanel ? leftPanel.offsetWidth : layout.offsetWidth / 2;
    document.body.style.userSelect = 'none';
    document.body.style.cursor     = 'col-resize';
  });

  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    const layout   = document.getElementById('readingLayout');
    const leftPanel  = layout.querySelector('.passage-panel');
    const rightPanel = layout.querySelector('.questions-panel');
    if (!leftPanel || !rightPanel) return;

    const delta    = e.clientX - startX;
    const total    = layout.offsetWidth;
    const newLeft  = Math.min(Math.max(startLeftW + delta, total * 0.25), total * 0.75);
    const newRight = total - newLeft - 6; // 6px divider width

    leftPanel.style.flex  = 'none';
    leftPanel.style.width = newLeft + 'px';
    rightPanel.style.flex  = 'none';
    rightPanel.style.width = newRight + 'px';
  });

  document.addEventListener('mouseup', () => {
    if (!isDragging) return;
    isDragging = false;
    document.body.style.userSelect = '';
    document.body.style.cursor     = '';
  });
}

// ── HIGHLIGHT ─────────────────────────────────────────────────
function setColor(color) {
  currentColor = color;
  document.querySelectorAll('.hl-btn').forEach(b => b.classList.remove('selected'));
  const btn = document.getElementById('hl-' + color[0]);
  if (btn) btn.classList.add('selected');
}

document.addEventListener('mouseup', function(e) {
  const passage   = document.getElementById('passageBody');
  const questions = document.getElementById('questionsPanel');
  if (!passage && !questions) return;
  const sel = window.getSelection();
  if (!sel || sel.isCollapsed || !sel.toString().trim()) return;
  const range = sel.getRangeAt(0);
  const anchor = range.commonAncestorContainer;
  const inPassage   = passage   && (passage.contains(anchor)   || passage.contains(range.startContainer));
  const inQuestions = questions && (questions.contains(anchor)  || questions.contains(range.startContainer));
  if (!inPassage && !inQuestions) return;
  applyHighlight(range);
  sel.removeAllRanges();
});

function applyHighlight(range) {
  const cls = colorMap[currentColor];
  try {
    const frag = range.extractContents();
    const span = document.createElement('span');
    span.className       = cls;
    span.dataset.highlight = 'true';
    span.appendChild(frag);
    range.insertNode(span);
  } catch(e) {
    try {
      const span = document.createElement('span');
      span.className       = cls;
      span.dataset.highlight = 'true';
      range.surroundContents(span);
    } catch(e2) { /* selection too complex */ }
  }
}

function clearAllHighlights() {
  const body = document.getElementById('passageBody');
  if (!body) return;
  body.querySelectorAll('[data-highlight]').forEach(span => {
    const p = span.parentNode;
    while (span.firstChild) p.insertBefore(span.firstChild, span);
    p.removeChild(span);
  });
  showToast('🗑 Highlights cleared', false);
}

// ── SUBMIT ────────────────────────────────────────────────────
function submitTest() {
  clearInterval(timerInterval);
  const totalQ = currentPassage.sections.reduce((s, sec) => s + sec.questions.length, 0);
  let correct = 0, wrong = 0;

  for (const qNum in answers) {
    const a = answers[qNum];

    if (a.el && a.el.tagName === 'INPUT') {
      // Fill-in answer
      const accepted = a.acceptedAnswers || [a.el.getAttribute('data-answer') || ''];
      const userVal  = a.el.value.trim().toLowerCase();
      const isRight  = accepted.includes(userVal);
      a.el.style.borderColor     = isRight ? 'var(--green)' : 'var(--red)';
      a.el.style.backgroundColor = isRight ? 'rgba(52,211,153,0.07)' : 'rgba(248,113,113,0.07)';
      a.el.style.color           = isRight ? 'var(--green)' : 'var(--red)';
      a.el.disabled = true;

      // Show correct answer if wrong
      if (!isRight) {
        const hint = document.createElement('div');
        hint.style.cssText = 'font-size:0.75rem;color:var(--green);margin-top:0.3rem;';
        hint.textContent = '✓ Correct answer: ' + (a.acceptedAnswers ? a.acceptedAnswers[0] : '');
        a.el.parentNode.appendChild(hint);
      }

      isRight ? correct++ : wrong++;
    } else if (a.el) {
      // MCQ / TFNG / match / ends
      const block = a.el.closest('.options');
      if (block) {
        block.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
      }
      if (a.correct) {
        a.el.classList.add('correct');
        correct++;
      } else {
        a.el.classList.add('wrong');
        wrong++;
        // Highlight correct option using data-correct attribute
        if (block) {
          block.querySelectorAll('.option').forEach(o => {
            if (o.dataset.correct === 'true') o.classList.add('correct');
          });
        }
      }
    }
  }

  // Show result
  const band = getBand(correct, totalQ);
  document.getElementById('bandScore').textContent   = band;
  document.getElementById('correctCount').textContent = correct;
  document.getElementById('wrongCount').textContent   = wrong;

  const elapsed = (currentPassage.minutes * 60) - timeLeft;
  const em = Math.floor(elapsed / 60);
  const es = elapsed % 60;
  document.getElementById('timeTaken').textContent = `${em}:${es.toString().padStart(2,'0')}`;

  const rc = document.getElementById('resultCard');
  if (rc) {
    rc.classList.add('show');
    rc.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

// ── RESET UI ──────────────────────────────────────────────────
function resetTestUI() {
  const timerVal = document.getElementById('timerVal');
  if (timerVal) { timerVal.textContent = '20:00'; timerVal.classList.remove('warning'); }

  const fill = document.getElementById('progressFill');
  if (fill) fill.style.width = '0%';

  const progText = document.getElementById('progressText');
  if (progText) progText.textContent = '0 / 0';

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.disabled = true;

  const rc = document.getElementById('resultCard');
  if (rc) rc.classList.remove('show');

  const pauseBtn = document.getElementById('pauseBtn');
  if (pauseBtn) { pauseBtn.textContent = '⏸ Pause'; pauseBtn.classList.remove('active'); }

  clearAllHighlights();

  // Reset panel widths
  const leftPanel  = document.querySelector('.passage-panel');
  const rightPanel = document.querySelector('.questions-panel');
  if (leftPanel)  { leftPanel.style.flex = ''; leftPanel.style.width = ''; }
  if (rightPanel) { rightPanel.style.flex = ''; rightPanel.style.width = ''; }

  fontSize = 15;
  const body = document.getElementById('passageBody');
  if (body) body.style.fontSize = fontSize + 'px';
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, isWarning) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = 'time-toast show' + (isWarning ? ' warning' : '');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  buildSelector();
  showView('selectorView');
  initDivider();
});
