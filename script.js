let questions = [];
let currentIndex = 0;
let userAnswers = [];
let explanations = [];

// Load questions and explanations from JSON files
Promise.all([
    fetch('questions.json').then(response => {
        if (!response.ok) throw new Error('Failed to load questions.json');
        return response.json();
    }),
    fetch('explanations.json').then(response => {
        if (!response.ok) throw new Error('Failed to load explanations.json');
        return response.json();
    })
])
.then(([questionsData, explanationsData]) => {
    questions = questionsData.questions || [];
    explanations = explanationsData.explanations || [];
    console.log('Questions loaded:', questions);
    console.log('Explanations loaded:', explanations);

    if (questions.length === 0) {
        console.error('No questions found in questions.json');
        alert('No questions loaded. Please check questions.json and ensure it is properly formatted.');
        return;
    }
    if (explanations.length === 0) {
        console.error('No explanations found in explanations.json');
    }

    userAnswers = Array(questions.length).fill(null).map(() => ({ selected: [], submitted: false, celebrated: false }));
    displayQuestion();
    createQuestionGrid();
})
.catch(error => {
    console.error('Error loading data:', error);
    alert(`Failed to load questions or explanations: ${error.message}`);
});

// Display the current question
function displayQuestion() {
    if (currentIndex < 0 || currentIndex >= questions.length || !questions[currentIndex]) {
        console.error('Invalid currentIndex or question not found:', currentIndex);
        alert('Error: Question not found. Please check questions.json for proper formatting.');
        return; // Prevent out-of-bounds access or undefined questions
    }

    const question = questions[currentIndex];
    console.log('Displaying question:', question);
    document.getElementById('progress').textContent = `Question ${currentIndex + 1} of ${questions.length}`;
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
        label.htmlFor = `option-${index}`;
        label.textContent = option;
        const div = document.createElement('div');
        div.className = 'option';
        div.appendChild(input);
        div.appendChild(label);
        optionsDiv.appendChild(div);
    });

    // Show/hide submit button based on submission status
    const submitBtn = document.getElementById('submit-btn');
    submitBtn.style.display = userAnswers[currentIndex]?.submitted ? 'none' : 'block';
    displayFeedback(question); // Pass the question object
    updateQuestionGrid();
}

// Display feedback after submission and add question mark button
function displayFeedback(question) {
    if (!question) {
        console.error('Question is undefined in displayFeedback');
        return;
    }
    const feedbackDiv = document.getElementById('feedback');
    const feedbackMessage = document.getElementById('feedback-message');
    feedbackMessage.innerHTML = '';
    if (currentIndex >= 0 && currentIndex < questions.length && userAnswers[currentIndex]?.submitted) {
        console.log('Feedback for question:', question);
        const correct = Array.isArray(question.correct) ? question.correct : []; // Default to empty array if correct is missing
        const selected = userAnswers[currentIndex]?.selected?.sort() || [];
        const message = arraysEqual(selected, correct) ? 'Correct!' : 'Incorrect.';
        feedbackMessage.textContent = message;

        // Highlight correct and incorrect options
        (question.options || []).forEach((option, index) => {
            if (!option) return; // Skip invalid options
            const optionDiv = document.querySelector(`#option-${index}`)?.parentElement;
            if (optionDiv) {
                if (correct.includes(index)) {
                    optionDiv.classList.add('correct');
                } else if (selected.includes(index)) {
                    optionDiv.classList.add('incorrect');
                }
            }
        });

        // Show explanation from question or default message
        const questionExplanation = question.explanation || 'No explanation provided.';
        const explanation = document.createElement('p');
        explanation.textContent = questionExplanation;
        feedbackMessage.appendChild(explanation);

        // Add question mark button for additional explanation from explanations.json
        let questionMarkBtn = document.getElementById('question-mark-btn');
        if (!questionMarkBtn) {
            questionMarkBtn = document.createElement('button');
            questionMarkBtn.id = 'question-mark-btn';
            questionMarkBtn.textContent = '?';
            feedbackDiv.appendChild(questionMarkBtn);
        }
        questionMarkBtn.style.display = 'inline-block'; // Show the button

        // Create or update tooltip with explanation
        let tooltip = document.getElementById('explanation-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'explanation-tooltip';
            document.body.appendChild(tooltip);
        }

        // Find explanation for this question, if it exists
        const explanationText = explanations.find(exp => exp.id === question.id)?.text || 'No additional explanation available.';
        tooltip.textContent = explanationText;

        // Handle tooltip visibility on hover
        questionMarkBtn.addEventListener('mouseover', () => {
            // Position tooltip over the grid
            const grid = document.getElementById('question-grid');
            if (grid) {
                const rect = grid.getBoundingClientRect();
                tooltip.style.position = 'absolute';
                tooltip.style.left = `${rect.left}px`;
                tooltip.style.top = `${rect.top}px`;
                tooltip.style.width = `${rect.width}px`;
                tooltip.style.height = `${rect.height}px`;
                tooltip.style.zIndex = '200'; // Above the grid and everything else
                tooltip.style.display = 'block';
            }
        });
        questionMarkBtn.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
    } else {
        const questionMarkBtn = document.getElementById('question-mark-btn');
        if (questionMarkBtn) questionMarkBtn.style.display = 'none';
        const tooltip = document.getElementById('explanation-tooltip');
        if (tooltip) tooltip.style.display = 'none';
    }

    // Trigger celebration if 100% correct
    // Trigger celebration ONCE when the submitted answer is correct
    const isCorrect =
      arraysEqual(userAnswers[currentIndex]?.selected?.sort() || [], question.correct?.sort() || []);

    if (userAnswers[currentIndex]?.submitted && isCorrect && !userAnswers[currentIndex].celebrated) {
      userAnswers[currentIndex].celebrated = true;
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
}


// Show celebration effect for 100% correct answer
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
    this.scheduled = [];
    this.running = false;
    this.lastT = 0;
    this.endT = 0;

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

    // Extend / restart
    this.running = true;
    this.lastT = now;
    this.endT = now + 1100;

    // Schedule 4 bursts, mostly near the top half (over-the-top feel)
    this.scheduled.length = 0;

    const burstCount = 4;
    for (let i = 0; i < burstCount; i++) {
      const t = now + i * 120;
      const x = this.w * (0.15 + Math.random() * 0.70);
      const y = this.h * (0.14 + Math.random() * 0.26);
      const scale = 0.9 + Math.random() * 0.45;
      this.scheduled.push({ t, x, y, scale });
    }

    // Soft “energy sweep” burst near the center-top (shader-ish vibe)
    this.scheduled.push({
      t: now + 80,
      x: this.w * (0.35 + Math.random() * 0.30),
      y: this.h * 0.22,
      scale: 1.15
    });

    requestAnimationFrame(this.loop);
  }

  burst(x, y, scale) {
    // Palette: mostly greens (bright + deep), slight variance for richness
    const baseHue = 105 + Math.random() * 45; // 105..150 (green range)

    // Core “spark ring”
    const count = Math.floor(64 * scale);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (180 + Math.random() * 420) * scale;

      const hue = baseHue + (Math.random() * 12 - 6);
      const sat = 70 + Math.random() * 30;
      const light = 38 + Math.random() * 30;

      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        ttl: 0.65 + Math.random() * 0.55,
        r: 1.0 + Math.random() * 2.2,
        hue, sat, light,
        tw: Math.random() * 10
      });
    }

    // Extra “sparkles” for crispness
    const sparkleCount = Math.floor(22 * scale);
    for (let i = 0; i < sparkleCount; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (90 + Math.random() * 260) * scale;

      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 0,
        ttl: 0.45 + Math.random() * 0.35,
        r: 0.7 + Math.random() * 1.2,
        hue: baseHue + (Math.random() * 18 - 9),
        sat: 85 + Math.random() * 15,
        light: 55 + Math.random() * 20,
        tw: Math.random() * 12
      });
    }
  }

  loop(t) {
    if (!this.running) return;

    const dt = Math.min(0.034, (t - this.lastT) / 1000);
    this.lastT = t;

    const ctx = this.ctx;

    // Fade previous frame toward transparency (no page-dimming)
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.fillRect(0, 0, this.w, this.h);

    // Spawn scheduled bursts
    for (let i = this.scheduled.length - 1; i >= 0; i--) {
      if (t >= this.scheduled[i].t) {
        const b = this.scheduled[i];
        this.burst(b.x, b.y, b.scale);
        this.scheduled.splice(i, 1);
      }
    }

    // Draw with additive blending for glow
    ctx.globalCompositeOperation = 'lighter';

    const gravity = 520;   // px/s^2
    const drag = 0.985;    // velocity damping

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life += dt;

      if (p.life >= p.ttl) {
        this.particles.splice(i, 1);
        continue;
      }

      // Motion
      p.vx *= Math.pow(drag, dt * 60);
      p.vy *= Math.pow(drag, dt * 60);
      p.vy += gravity * dt;

      p.x += p.vx * dt;
      p.y += p.vy * dt;

      // Alpha curve + subtle twinkle
      const k = 1 - (p.life / p.ttl);
      const twinkle = 0.75 + 0.25 * Math.sin((p.life * 18) + p.tw);
      const a = Math.max(0, Math.min(1, k * 0.95 * twinkle));

      // Draw glow + core
      const outer = p.r * (3.2 + (1 - k) * 1.2);
      const inner = p.r * 1.05;

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.light}%, ${a * 0.22})`;
      ctx.arc(p.x, p.y, outer, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${Math.min(92, p.light + 22)}%, ${a})`;
      ctx.arc(p.x, p.y, inner, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stop when done
    if (t > this.endT && this.particles.length === 0 && this.scheduled.length === 0) {
      this.running = false;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, this.w, this.h);
      return;
    }

    requestAnimationFrame(this.loop);
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



