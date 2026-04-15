let questions = [];
let questionPool = [];
let currentIndex = 0;
let userAnswers = [];
let explanations = [];
let explanationsById = new Map();
let explanationsLoadPromise = null;
let flipResizeTimer = null;
let flipResizeBound = false;
let quizCardsObserver = null;
let quizCardsIdleHandle = null;
let quizCardsRenderQueued = false;
let quizCardsRendered = false;

function getQuestionCardsLoadingMarkup() {
  return `
    <div class="quiz-cards-loading" role="status" aria-live="polite">
      <span class="quiz-cards-loading-spinner" aria-hidden="true"></span>
      <span class="quiz-cards-loading-label">Laen küsimuste kaarte...</span>
    </div>
  `;
}

function showQuestionCardsLoading() {
  const grid = document.getElementById('all-questions-grid');
  if (!grid) return;

  grid.setAttribute('aria-busy', 'true');
  grid.innerHTML = getQuestionCardsLoadingMarkup();
}

function cleanupQuestionCardsScheduling() {
  if (quizCardsObserver) {
    quizCardsObserver.disconnect();
    quizCardsObserver = null;
  }

  if (quizCardsIdleHandle !== null) {
    if (typeof window.cancelIdleCallback === 'function') {
      window.cancelIdleCallback(quizCardsIdleHandle);
    } else {
      window.clearTimeout(quizCardsIdleHandle);
    }

    quizCardsIdleHandle = null;
  }
}

function renderQuestionCardsNow() {
  if (quizCardsRendered || questionPool.length === 0) return;

  cleanupQuestionCardsScheduling();
  quizCardsRenderQueued = false;
  quizCardsRendered = true;
  createQuestionCards();
}

function scheduleQuestionCardsRender() {
  const section = document.querySelector('.quiz-cards-section');
  if (!section || questionPool.length === 0) return;

  cleanupQuestionCardsScheduling();
  quizCardsRendered = false;
  quizCardsRenderQueued = true;
  showQuestionCardsLoading();

  if ('IntersectionObserver' in window) {
    quizCardsObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        renderQuestionCardsNow();
      }
    }, {
      rootMargin: '320px 0px'
    });

    quizCardsObserver.observe(section);
  }

  const idleRender = () => {
    if (!quizCardsRenderQueued || quizCardsRendered) return;
    renderQuestionCardsNow();
  };

  if (typeof window.requestIdleCallback === 'function') {
    quizCardsIdleHandle = window.requestIdleCallback(idleRender, { timeout: 1600 });
    return;
  }

  quizCardsIdleHandle = window.setTimeout(idleRender, 300);
}

function shuffleQuestions(items) {
  const shuffled = Array.isArray(items) ? items.slice() : [];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function initializeQuizSession() {
  questions = shuffleQuestions(questionPool);
  currentIndex = 0;
  userAnswers = Array(questions.length).fill(null).map(() => ({
    selected: [],
    submitted: false,
    explainOpen: false,
    explainTouched: false,
    celebrated: false
  }));

  setupExplanationUI();
  displayQuestion();
  createQuestionGrid();
  scheduleQuestionCardsRender();
}

function setExplanations(explanationItems) {
    explanations = Array.isArray(explanationItems) ? explanationItems : [];
    explanationsById = new Map(
        explanations
            .filter(item => item && item.id != null)
            .map(item => [String(item.id), String(item.text || '').trim()])
    );
}

function getExplanationText(questionId) {
    return explanationsById.get(String(questionId)) || '';
}

function ensureExplanationsLoaded() {
    if (explanationsById.size > 0) {
        return Promise.resolve(explanations);
    }

    if (explanationsLoadPromise) {
        return explanationsLoadPromise;
    }

    explanationsLoadPromise = fetch('explanations.json')
        .then(response => {
            if (!response.ok) throw new Error('Failed to load explanations.json');
            return response.json();
        })
        .then(explanationsData => {
            setExplanations(explanationsData.explanations || []);
            return explanations;
        })
        .catch(error => {
            console.error('Error loading explanations:', error);
            explanationsLoadPromise = null;
            return [];
        });

    return explanationsLoadPromise;
}

// Load quiz questions up front; load explanations only when needed.
fetch('questions.json')
    .then(response => {
        if (!response.ok) throw new Error('Failed to load questions.json');
        return response.json();
    })
    .then((questionsData) => {
    questionPool = Array.isArray(questionsData.questions) ? questionsData.questions.slice() : [];

    if (questionPool.length === 0) {
        console.error('No questions found in questions.json');
        alert('No questions loaded. Please check questions.json and ensure it is properly formatted.');
        return;
    }

    initializeQuizSession();
})
.catch(error => {
    console.error('Error loading quiz questions:', error);
    alert(`Failed to load questions: ${error.message}`);
});

function syncOptionSelectionState(container) {
    if (!container) return;

    container.querySelectorAll('.option').forEach((optionEl) => {
        const optionInput = optionEl.querySelector('input[name="option"]');
        if (!optionInput) return;

        optionEl.classList.toggle('is-selected', optionInput.checked);
    });
}

// Display the current question
function displayQuestion() {
    if (currentIndex < 0 || currentIndex >= questions.length || !questions[currentIndex]) {
        console.error('Invalid currentIndex or question not found:', currentIndex);
        alert('Error: Question not found. Please check questions.json for proper formatting.');
        return; // Prevent out-of-bounds access or undefined questions
    }

    const question = questions[currentIndex];
    document.getElementById('progress').textContent = `${currentIndex + 1} / ${questions.length}`;
    document.getElementById('question-text').textContent = question.text || 'Question text not available';
    const optionsDiv = document.getElementById('options');
    optionsDiv.innerHTML = '';

    // Default values if fields are missing
    const multiple = question.multiple !== undefined ? question.multiple : false;
    const options = Array.isArray(question.options) ? question.options : [];
    const correct = Array.isArray(question.correct) ? question.correct : []; // Default to empty array if correct is missing

    // Create options (radio for single choice, checkboxes for multiple)
    options.forEach((option, index) => {
        if (!option) return; // Skip invalid options
        const inputType = multiple ? 'checkbox' : 'radio';
        const input = document.createElement('input');
        input.type = inputType;
        input.name = 'option';
        input.value = index;
        input.id = `option-${index}`;
        input.disabled = userAnswers[currentIndex]?.submitted || false;
        if (userAnswers[currentIndex]?.selected?.includes(index)) {
            input.checked = true;
        }
        const label = document.createElement('label');
        label.className = 'option';

        const text = document.createElement('span');
        text.className = 'option-text';
        text.textContent = option;

        input.addEventListener('change', () => {
            syncOptionSelectionState(optionsDiv);
        });

        label.appendChild(input);
        label.appendChild(text);
        optionsDiv.appendChild(label);
    });

    syncOptionSelectionState(optionsDiv);

    // Show/hide submit button based on submission status
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.style.display = userAnswers[currentIndex]?.submitted ? 'none' : 'block';
    displayFeedback(question); // Pass the question object
    updateQuestionGrid();
}

function setupExplanationUI() {
  const area = document.getElementById('explain-area');
  const toggle = document.getElementById('explain-toggle');
  const panel = document.getElementById('explain-panel');

  if (!area || !toggle || !panel) return;
  if (toggle.dataset.bound === 'true') return;

  toggle.dataset.bound = 'true';

  toggle.addEventListener('click', () => {
    const isOpen = toggle.getAttribute('aria-expanded') === 'true';
    const next = !isOpen;

    toggle.setAttribute('aria-expanded', String(next));
    panel.hidden = !next;
    area.classList.toggle('is-open', next);

    if (userAnswers[currentIndex]) {
      userAnswers[currentIndex].explainOpen = next;
      userAnswers[currentIndex].explainTouched = true;
    }
  });
}


function displayFeedback(question) {
  if (!question) return;

  const feedbackDiv = document.getElementById('feedback');
  const feedbackMessage = document.getElementById('feedback-message');

  const explainArea = document.getElementById('explain-area');
  const explainToggle = document.getElementById('explain-toggle');
  const explainPanel = document.getElementById('explain-panel');
  const explainText = document.getElementById('explain-text');

  if (!feedbackDiv || !feedbackMessage) return;

  // Remove old tooltip if it exists from previous versions
  const oldTooltip = document.getElementById('explanation-tooltip');
  if (oldTooltip) oldTooltip.remove();

  const oldMark = document.getElementById('question-mark-btn');
  if (oldMark) oldMark.remove();

  feedbackMessage.innerHTML = '';

  const ua = userAnswers[currentIndex];
  if (!ua?.submitted) {
    if (explainArea) explainArea.hidden = true;
    if (explainPanel) explainPanel.hidden = true;
    if (explainToggle) explainToggle.setAttribute('aria-expanded', 'false');
    return;
  }

  const correct = Array.isArray(question.correct) ? question.correct : [];
  const selected = ua.selected?.slice().sort() || [];

  const isCorrect = arraysEqual(selected, correct);
  feedbackMessage.textContent = isCorrect ? 'Correct!' : 'Incorrect.';

  // Highlight correct and incorrect options
  (question.options || []).forEach((option, index) => {
    if (!option) return;
    const optionDiv = document.querySelector(`#option-${index}`)?.parentElement;
    if (!optionDiv) return;

    optionDiv.classList.remove('correct', 'incorrect', 'partial');

    if (correct.includes(index)) {
      optionDiv.classList.add('correct');
    } else if (selected.includes(index)) {
      optionDiv.classList.add('incorrect');
    }
  });

  // Build explanation text (prefer explanations.json; fall back to questions.json explanation)
  const short = (question.explanation || '').trim();
  const extra = getExplanationText(question.id);

  if (ua?.submitted && explanationsById.size === 0) {
    ensureExplanationsLoaded().then(() => {
      const currentQuestion = questions[currentIndex];
      if (!currentQuestion || String(currentQuestion.id) !== String(question.id)) return;
      if (!userAnswers[currentIndex]?.submitted) return;
      displayFeedback(currentQuestion);
    });
  }

  let text = '';
  if (extra && short && extra !== short) text = `${short}\n\n${extra}`;
  else text = extra || short;

  if (!explainArea || !explainToggle || !explainPanel || !explainText || !text) {
    if (explainArea) explainArea.hidden = true;
  } else {
    explainText.textContent = text;
    explainArea.hidden = false;

    // Auto-open on incorrect the first time; remember user preference per question
    if (!ua.explainTouched) ua.explainOpen = !isCorrect;

    explainToggle.setAttribute('aria-expanded', String(ua.explainOpen));
    explainPanel.hidden = !ua.explainOpen;
    explainArea.classList.toggle('is-open', ua.explainOpen);
  }

  // Celebration once per correct submission
  if (isCorrect && !ua.celebrated) {
    ua.celebrated = true;
    showCelebration();
  }
}


// Handle submit button click
document.getElementById('submit-btn').addEventListener('click', () => {
    const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked'))
        .map(input => parseInt(input.value)) || [];
    userAnswers[currentIndex] = userAnswers[currentIndex] || { selected: [], submitted: false };
    userAnswers[currentIndex].selected = selectedOptions;
    userAnswers[currentIndex].submitted = true;
    displayQuestion();
});

// Handle previous button click
document.getElementById('prev-btn').addEventListener('click', () => {
    if (currentIndex > 0) {
        currentIndex--;
        displayQuestion();
    }
});

// Handle next button click
document.getElementById('next-btn').addEventListener('click', () => {
    if (currentIndex < questions.length - 1) {
        currentIndex++;
        displayQuestion();
    } else {
        // Show basic results (can be expanded)
        let score = 0;
        for (let i = 0; i < questions.length; i++) {
            if (userAnswers[i]?.submitted && arraysEqual(userAnswers[i].selected.sort(), (questions[i]?.correct || []).sort())) {
                score++;
            }
        }
        alert(`Quiz completed! Your score: ${score} out of ${questions.length}`);
    }
});

window.addEventListener('pageshow', (event) => {
    if (!event.persisted || questionPool.length === 0) return;
    initializeQuizSession();
});

function createQuestionGrid() {
    const gridDiv = document.getElementById('question-grid');
    if (!gridDiv) return;

    if (!gridDiv.querySelector('.grid-container')) {
        gridDiv.innerHTML = '<div class="grid-container" aria-label="Question navigator"></div>';
    }

    const gridContainer = gridDiv.querySelector('.grid-container');
    gridContainer.innerHTML = '';

    const total = Math.min(71, questions.length);

    for (let i = 0; i < total; i++) {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'grid-item unanswered';
        item.textContent = i + 1;
        item.setAttribute('aria-label', `Go to question ${i + 1}`);

        item.addEventListener('click', () => {
            currentIndex = i;
            displayQuestion();
        });

        gridContainer.appendChild(item);
    }

    updateQuestionGrid();
}

function createQuestionCards() {
    const grid = document.getElementById('all-questions-grid');
    if (!grid) return;

    grid.setAttribute('aria-busy', 'false');
    grid.innerHTML = '';

    const fragment = document.createDocumentFragment();

    questionPool.forEach((question, index) => {
        if (!question) return;

        const card = document.createElement('article');
        card.className = 'flip-card';

        const inner = document.createElement('div');
        inner.className = 'flip-card-inner';

        const front = document.createElement('div');
        front.className = 'flip-card-face flip-card-front';

        const frontTop = document.createElement('div');
        frontTop.className = 'flip-card-top';
        const questionNumber = question.id != null ? question.id : index + 1;
        frontTop.textContent = `Küsimus ${questionNumber}`;

        const frontQuestion = document.createElement('div');
        frontQuestion.className = 'flip-card-question';
        frontQuestion.textContent = question.text || 'Küsimus puudub';

        const frontBtn = document.createElement('button');
        frontBtn.type = 'button';
        frontBtn.className = 'flip-card-toggle';
        frontBtn.textContent = 'Vaata vastuseid';

        const backId = `flip-card-${index + 1}-back`;
        frontBtn.setAttribute('aria-controls', backId);
        frontBtn.setAttribute('aria-expanded', 'false');

        front.append(frontTop, frontQuestion, frontBtn);

        const back = document.createElement('div');
        back.className = 'flip-card-face flip-card-back';
        back.id = backId;

        const backTop = document.createElement('div');
        backTop.className = 'flip-card-top';
        backTop.textContent = 'Vastused';

        const answersList = document.createElement('ol');
        answersList.className = 'flip-card-answers';

        const options = Array.isArray(question.options) ? question.options : [];
        const correct = Array.isArray(question.correct) ? question.correct : [];

        if (options.length === 0) {
            const empty = document.createElement('li');
            empty.textContent = 'Vastused puuduvad';
            answersList.appendChild(empty);
        } else {
            options.forEach((option, optIndex) => {
                if (option === null || option === undefined) return;
                const li = document.createElement('li');
                li.textContent = option;
                if (correct.includes(optIndex)) li.classList.add('is-correct');
                answersList.appendChild(li);
            });
        }

        const backBtn = document.createElement('button');
        backBtn.type = 'button';
        backBtn.className = 'flip-card-toggle flip-card-toggle--back';
        backBtn.textContent = 'Tagasi küsimuse juurde';
        backBtn.setAttribute('aria-expanded', 'false');

        back.append(backTop, answersList, backBtn);

        inner.append(front, back);
        card.appendChild(inner);

        const setFlipped = (next) => {
            card.classList.toggle('is-flipped', next);
            frontBtn.setAttribute('aria-expanded', String(next));
            backBtn.setAttribute('aria-expanded', String(next));
        };

        frontBtn.addEventListener('click', () => setFlipped(true));
        backBtn.addEventListener('click', () => setFlipped(false));
        card.addEventListener('click', (event) => {
            if (event.target.closest('.flip-card-toggle')) return;
            setFlipped(!card.classList.contains('is-flipped'));
        });

        fragment.appendChild(card);
    });

    grid.appendChild(fragment);

    syncFlipCardHeights();

    if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(syncFlipCardHeights).catch(() => {});
    }

    if (!flipResizeBound) {
        flipResizeBound = true;
        window.addEventListener('resize', () => {
            if (flipResizeTimer) clearTimeout(flipResizeTimer);
            flipResizeTimer = setTimeout(syncFlipCardHeights, 120);
        });
    }
}

function syncFlipCardHeights() {
    const cards = document.querySelectorAll('.flip-card');
    if (!cards.length) return;

    cards.forEach(card => {
        card.style.height = 'auto';
    });

    let maxHeight = 0;

    cards.forEach(card => {
        maxHeight = Math.max(maxHeight, card.offsetHeight);
    });

    const finalHeight = Math.ceil(maxHeight + 8);

    cards.forEach(card => {
        card.style.height = `${finalHeight}px`;
    });
}

function updateQuestionGrid() {
    if (!questions || questions.length === 0) return;

    const grid = document.getElementById('question-grid');
    if (!grid) return;

    const gridItems = grid.querySelectorAll('.grid-item');
    const total = Math.min(gridItems.length, 71);

    for (let i = 0; i < total; i++) {
        const cell = gridItems[i];

        // Current question highlight
        cell.classList.toggle('current', i === currentIndex);

        // Reset state classes (keep "current")
        cell.classList.remove('correct', 'incorrect', 'partial', 'unanswered');

        if (userAnswers[i] && userAnswers[i].submitted) {
            const question = questions[i] || {};
            const correct = Array.isArray(question.correct) ? question.correct : [];
            const selected = userAnswers[i]?.selected?.sort() || [];

            if (arraysEqual(selected, correct)) {
                cell.classList.add('correct');
            } else if (question.multiple && selected.length > 0 && selected.some(opt => correct.includes(opt))) {
                cell.classList.add('partial');
            } else if (selected.length > 0) {
                cell.classList.add('incorrect');
            } else {
                cell.classList.add('unanswered');
            }
        } else {
            cell.classList.add('unanswered');
        }
    }
    updateProgressHUD();
}



function updateProgressHUD() {
  const total = Math.min(71, questions.length);

  const answeredEl = document.getElementById('hud-answered');
  const totalEl = document.getElementById('hud-total');

  const okFill = document.getElementById('hud-ok');
  const midFill = document.getElementById('hud-partial');
  const badFill = document.getElementById('hud-wrong');

  const okVal = document.getElementById('hud-ok-val');
  const midVal = document.getElementById('hud-partial-val');
  const badVal = document.getElementById('hud-wrong-val');

  if (!answeredEl || !totalEl || !okFill || !midFill || !badFill || !okVal || !midVal || !badVal) return;
  if (total <= 0) return;

  let ok = 0;
  let mid = 0;
  let bad = 0;
  let answered = 0;

  for (let i = 0; i < total; i++) {
    const ua = userAnswers[i];
    const q = questions[i];
    if (!ua?.submitted || !q) continue;

    const correct = Array.isArray(q.correct) ? q.correct : [];
    const selected = (ua.selected || []).slice().sort();

    // Submitted with no selection stays "Vastamata"
    if (selected.length === 0) continue;

    answered++;

    if (arraysEqual(selected, correct)) ok++;
    else if (q.multiple && selected.some(opt => correct.includes(opt))) mid++;
    else bad++;
  }

  answeredEl.textContent = String(answered);
  totalEl.textContent = String(total);

  okVal.textContent = String(ok);
  midVal.textContent = String(mid);
  badVal.textContent = String(bad);

  okFill.style.width = `${(ok / total) * 100}%`;
  midFill.style.width = `${(mid / total) * 100}%`;
  badFill.style.width = `${(bad / total) * 100}%`;

  window.RELV_QUIZ_ANSWERED_COUNT = answered;
  window.dispatchEvent(new CustomEvent('relv:quiz-answered-count', {
    detail: {
      answered,
      total
    }
  }));
}



// Show celebration effect for a fully correct answer
let greenFx = null;

function showCelebration() {
  // Respect reduced motion (keeps it comfy on phones)
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  if (!greenFx) greenFx = new GreenFireworksFX();
  greenFx.fire();
}

class GreenFireworksFX {
  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.id = 'fx-fireworks';
    document.body.appendChild(this.canvas);

    this.ctx = this.canvas.getContext('2d', { alpha: true });
    this.dpr = Math.min(2, window.devicePixelRatio || 1);

    this.w = 0;
    this.h = 0;

    this.particles = [];
    this.shells = [];
    this.waves = [];
    this.scheduled = [];
    this.running = false;
    this.lastT = 0;
    this.endT = 0;
    this.rafId = 0;
    this.palette = [
      { hue: 154, sat: 80, light: 64 },
      { hue: 170, sat: 86, light: 66 },
      { hue: 188, sat: 92, light: 70 },
      { hue: 201, sat: 90, light: 74 },
      { hue: 214, sat: 82, light: 80 }
    ];

    this.resize = this.resize.bind(this);
    this.loop = this.loop.bind(this);

    this.resize();
    window.addEventListener('resize', this.resize);
    window.addEventListener('orientationchange', this.resize);
  }

  resize() {
    this.w = Math.max(1, window.innerWidth);
    this.h = Math.max(1, window.innerHeight);

    this.canvas.width = Math.floor(this.w * this.dpr);
    this.canvas.height = Math.floor(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  fire() {
    const now = performance.now();

    this.running = true;
    this.lastT = now;
    this.endT = now + 2200;

    this.particles.length = 0;
    this.shells.length = 0;
    this.waves.length = 0;
    this.scheduled.length = 0;

    const shellCount = 5;
    for (let i = 0; i < shellCount; i++) {
      const t = now + i * 150;
      const x = this.w * (0.14 + Math.random() * 0.72);
      const targetX = x + (Math.random() * 160 - 80);
      const targetY = this.h * (0.14 + Math.random() * 0.24);
      const scale = 0.92 + Math.random() * 0.4;
      const tone = this.palette[i % this.palette.length];
      this.scheduled.push({ t, x, targetX, targetY, scale, hue: tone.hue });
    }

    this.scheduled.push({
      t: now + 860,
      x: this.w * 0.5,
      targetX: this.w * (0.47 + Math.random() * 0.06),
      targetY: this.h * 0.17,
      scale: 1.28,
      hue: 194
    });

    if (!this.rafId) {
      this.rafId = requestAnimationFrame(this.loop);
    }
  }

  launchShell(config) {
    this.shells.push({
      x: config.x,
      y: this.h + 26,
      vx: (config.targetX - config.x) * 0.75,
      vy: -(860 + Math.random() * 160) * config.scale,
      targetY: config.targetY,
      scale: config.scale,
      hue: config.hue,
      life: 0,
      ttl: 1.2,
      trail: []
    });
  }

  makeParticle(x, y, angle, speed, overrides = {}) {
    const tone = overrides.tone || this.palette[Math.floor(Math.random() * this.palette.length)];
    return {
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 0,
      ttl: overrides.ttl ?? (0.8 + Math.random() * 0.45),
      size: overrides.size ?? (1 + Math.random() * 2.4),
      hue: overrides.hue ?? tone.hue,
      sat: overrides.sat ?? tone.sat,
      light: overrides.light ?? tone.light,
      tw: Math.random() * Math.PI * 2,
      drag: overrides.drag ?? 0.985,
      gravity: overrides.gravity ?? 380,
      trail: [],
      trailLength: overrides.trailLength ?? 8,
      sparkle: overrides.sparkle ?? 0,
      kind: overrides.kind || 'bloom'
    };
  }

  burst(x, y, scale, forcedHue = null) {
    const baseHue = forcedHue ?? this.palette[Math.floor(Math.random() * this.palette.length)].hue;
    const tones = this.palette.map((tone, index) => {
      if (index === 0) {
        return { ...tone, hue: baseHue };
      }
      return tone;
    });

    this.waves.push({
      x,
      y,
      r: 18 * scale,
      life: 0,
      ttl: 0.72,
      hue: baseHue
    });

    const ringCount = Math.floor(36 * scale);
    for (let i = 0; i < ringCount; i++) {
      const angle = (i / ringCount) * Math.PI * 2 + (Math.random() * 0.09 - 0.045);
      const speed = (200 + Math.random() * 180) * scale;
      this.particles.push(this.makeParticle(x, y, angle, speed, {
        tone: tones[i % tones.length],
        ttl: 0.95 + Math.random() * 0.3,
        size: 1.2 + Math.random() * 1.8,
        drag: 0.988,
        gravity: 210,
        trailLength: 9,
        sparkle: 0.18,
        kind: 'ring'
      }));
    }

    const bloomCount = Math.floor(82 * scale);
    for (let i = 0; i < bloomCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (80 + Math.random() * 320) * scale;
      this.particles.push(this.makeParticle(x, y, angle, speed, {
        tone: tones[Math.floor(Math.random() * tones.length)],
        ttl: 1.05 + Math.random() * 0.45,
        size: 1 + Math.random() * 2.6,
        drag: 0.982,
        gravity: 410,
        trailLength: 11,
        sparkle: 0.34,
        kind: 'bloom'
      }));
    }

    const cometCount = Math.max(5, Math.floor(8 * scale));
    for (let i = 0; i < cometCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (250 + Math.random() * 260) * scale;
      this.particles.push(this.makeParticle(x, y, angle, speed, {
        tone: tones[(i + 1) % tones.length],
        ttl: 1.18 + Math.random() * 0.35,
        size: 2.1 + Math.random() * 1.7,
        drag: 0.99,
        gravity: 300,
        trailLength: 14,
        sparkle: 0.5,
        kind: 'comet'
      }));
    }

    const glitterCount = Math.floor(30 * scale);
    for (let i = 0; i < glitterCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = (40 + Math.random() * 180) * scale;
      this.particles.push(this.makeParticle(x, y, angle, speed, {
        tone: tones[Math.floor(Math.random() * tones.length)],
        ttl: 0.6 + Math.random() * 0.35,
        size: 0.75 + Math.random() * 1.1,
        drag: 0.976,
        gravity: 160,
        trailLength: 5,
        sparkle: 0.72,
        kind: 'glitter'
      }));
    }
  }

  drawTrail(path, width, hue, sat, light, alpha) {
    const ctx = this.ctx;
    if (path.length < 2) return;

    ctx.beginPath();
    ctx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) {
      ctx.lineTo(path[i].x, path[i].y);
    }
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`;
    ctx.stroke();
  }

  drawSpark(x, y, size, hue, sat, light, alpha) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x - size, y);
    ctx.lineTo(x + size, y);
    ctx.moveTo(x, y - size);
    ctx.lineTo(x, y + size);
    ctx.lineWidth = Math.max(0.75, size * 0.32);
    ctx.lineCap = 'round';
    ctx.strokeStyle = `hsla(${hue}, ${sat}%, ${Math.min(96, light + 18)}%, ${alpha})`;
    ctx.stroke();
  }

  updateShells(dt) {
    const gravity = 680;

    for (let i = this.shells.length - 1; i >= 0; i--) {
      const shell = this.shells[i];
      shell.life += dt;
      shell.vx *= Math.pow(0.992, dt * 60);
      shell.vy += gravity * dt;

      shell.x += shell.vx * dt;
      shell.y += shell.vy * dt;

      shell.trail.unshift({ x: shell.x, y: shell.y });
      if (shell.trail.length > 14) shell.trail.pop();

      const ascentAlpha = Math.max(0.2, 1 - (shell.life / shell.ttl));
      this.drawTrail(shell.trail, 1.8 + shell.scale, shell.hue, 88, 74, 0.16 * ascentAlpha);

      const glowRadius = 7 * shell.scale;
      this.ctx.beginPath();
      this.ctx.fillStyle = `hsla(${shell.hue}, 90%, 82%, 0.18)`;
      this.ctx.arc(shell.x, shell.y, glowRadius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.fillStyle = `hsla(${shell.hue}, 95%, 92%, 0.95)`;
      this.ctx.arc(shell.x, shell.y, 1.8 + shell.scale * 0.85, 0, Math.PI * 2);
      this.ctx.fill();

      if (shell.y <= shell.targetY || shell.vy >= -24) {
        this.burst(shell.x, shell.y, shell.scale, shell.hue);
        this.shells.splice(i, 1);
      }
    }
  }

  updateWaves(dt) {
    for (let i = this.waves.length - 1; i >= 0; i--) {
      const wave = this.waves[i];
      wave.life += dt;

      if (wave.life >= wave.ttl) {
        this.waves.splice(i, 1);
        continue;
      }

      const t = wave.life / wave.ttl;
      const radius = wave.r + 120 * t;
      const alpha = (1 - t) * 0.2;

      this.ctx.beginPath();
      this.ctx.lineWidth = 2.5 - (t * 1.5);
      this.ctx.strokeStyle = `hsla(${wave.hue}, 88%, 76%, ${alpha})`;
      this.ctx.arc(wave.x, wave.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.fillStyle = `hsla(${wave.hue}, 88%, 72%, ${alpha * 0.28})`;
      this.ctx.arc(wave.x, wave.y, radius * 0.34, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  updateParticles(dt) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.ttl) {
        this.particles.splice(i, 1);
        continue;
      }

      p.vx *= Math.pow(p.drag, dt * 60);
      p.vy *= Math.pow(p.drag, dt * 60);
      p.vy += p.gravity * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      p.trail.unshift({ x: p.x, y: p.y });
      if (p.trail.length > p.trailLength) p.trail.pop();

      const lifeT = p.life / p.ttl;
      const fade = Math.max(0, 1 - lifeT);
      const twinkle = 0.76 + 0.24 * Math.sin((p.life * 20) + p.tw);
      const alpha = fade * twinkle;

      if (p.trail.length > 1) {
        const trailAlpha = alpha * (p.kind === 'glitter' ? 0.08 : 0.16);
        this.drawTrail(
          p.trail,
          Math.max(0.8, p.size * (p.kind === 'comet' ? 0.95 : 0.65)),
          p.hue,
          p.sat,
          Math.min(92, p.light + 10),
          trailAlpha
        );
      }

      const outer = p.size * (3.1 + (1 - fade) * 1.6);
      const inner = p.size * 1.05;

      this.ctx.beginPath();
      this.ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${alpha * 0.2})`;
      this.ctx.arc(p.x, p.y, outer, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.beginPath();
      this.ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${Math.min(96, p.light + 18)}%, ${alpha})`;
      this.ctx.arc(p.x, p.y, inner, 0, Math.PI * 2);
      this.ctx.fill();

      if (p.sparkle > 0.1 && alpha > 0.18) {
        this.drawSpark(
          p.x,
          p.y,
          p.size * (1.4 + p.sparkle),
          p.hue,
          p.sat,
          p.light,
          alpha * (0.16 + p.sparkle * 0.2)
        );
      }
    }
  }

  loop(t) {
    if (!this.running) return;

    const dt = Math.min(0.034, (t - this.lastT) / 1000);
    this.lastT = t;

    const ctx = this.ctx;

    // Keep a soft motion trail without dimming the page.
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.16)';
    ctx.fillRect(0, 0, this.w, this.h);

    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = 'rgba(126, 211, 252, 0.018)';
    ctx.fillRect(0, 0, this.w, this.h * 0.45);

    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      if (t >= this.scheduled[i].t) {
        this.launchShell(this.scheduled[i]);
        this.scheduled.splice(i, 1);
      }
    }

    ctx.globalCompositeOperation = 'lighter';
    this.updateWaves(dt);
    this.updateShells(dt);
    this.updateParticles(dt);

    if (
      t > this.endT &&
      this.particles.length === 0 &&
      this.shells.length === 0 &&
      this.waves.length === 0 &&
      this.scheduled.length === 0
    ) {
      this.running = false;
      this.rafId = 0;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, this.w, this.h);
      return;
    }

    this.rafId = requestAnimationFrame(this.loop);
  }
}


// Helper function to compare arrays
function arraysEqual(a, b) {
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}
