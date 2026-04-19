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
let quizAvatarModulePromise = null;
let quizAccountStripExpanded = false;

function getApiUrl(path) {
    if (typeof window.relvApiUrl === 'function') {
        return window.relvApiUrl(path);
    }

    const base = String(window.RELV_CONFIG?.apiBase || '').replace(/\/$/, '');
    return base ? `${base}${String(path || '').startsWith('/') ? path : `/${path || ''}`}` : '';
}

function loadQuizAvatarModule() {
    if (!quizAvatarModulePromise) {
        quizAvatarModulePromise = import('./forum-animal-avatars.js').catch((error) => {
            quizAvatarModulePromise = null;
            throw error;
        });
    }

    return quizAvatarModulePromise;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function getQuizAccountStatsSnapshot(snapshot) {
    return {
        answeredCount: Math.max(0, Number(snapshot?.quizStats?.answeredCount) || 0),
        correctCount: Math.max(0, Number(snapshot?.quizStats?.correctCount) || 0),
        partialCount: Math.max(0, Number(snapshot?.quizStats?.partialCount) || 0),
        incorrectCount: Math.max(0, Number(snapshot?.quizStats?.incorrectCount) || 0),
        currentCorrectStreak: Math.max(0, Number(snapshot?.quizStats?.currentCorrectStreak) || 0),
        bestCorrectStreak: Math.max(0, Number(snapshot?.quizStats?.bestCorrectStreak) || 0),
        questionProgress: Array.isArray(snapshot?.quizStats?.questionProgress) ? snapshot.quizStats.questionProgress : []
    };
}

function getQuizQuestionLookup() {
    return new Map(
        (Array.isArray(questionPool) ? questionPool : [])
            .filter((question) => question && question.id != null)
            .map((question) => [String(question.id), question])
    );
}

function getQuestionExcerpt(question) {
    const text = String(question?.text || '').trim();
    if (!text) return '';
    return text.length > 92 ? `${text.slice(0, 89).trimEnd()}...` : text;
}

function getToughestQuestionEntries(progressEntries) {
    return progressEntries
        .filter((entry) => entry && entry.resultType !== 'correct')
        .map((entry) => ({
            ...entry,
            severityScore:
                (entry.resultType === 'incorrect' ? 300 : 200) +
                ((Number(entry.attemptCount) || 0) * 10) +
                (Number(entry.incorrectSelectedCount) || 0) * 3 +
                (Number(entry.missedCorrectCount) || 0)
        }))
        .sort((left, right) => {
            if (right.severityScore !== left.severityScore) {
                return right.severityScore - left.severityScore;
            }

            return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
        })
        .slice(0, 4);
}

function getStrongestQuestionEntries(progressEntries) {
    return progressEntries
        .filter((entry) => entry && entry.resultType === 'correct')
        .sort((left, right) => {
            if ((left.attemptCount || 0) !== (right.attemptCount || 0)) {
                return (left.attemptCount || 0) - (right.attemptCount || 0);
            }

            return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
        })
        .slice(0, 4);
}

function getUnansweredQuestionEntries(progressEntries) {
    const answeredIds = new Set(
        progressEntries
            .map((entry) => String(entry?.questionId || ''))
            .filter(Boolean)
    );

    return (Array.isArray(questionPool) ? questionPool : [])
        .filter((question) => question && question.id != null && !answeredIds.has(String(question.id)))
        .slice(0, 6)
        .map((question) => ({
            questionId: String(question.id),
            resultType: 'unanswered',
            attemptCount: 0
        }));
}

function renderQuizQuestionList(listTitle, entries, lookup, emptyText) {
    const safeEntries = Array.isArray(entries) ? entries : [];
    const itemsMarkup = safeEntries.length > 0
        ? safeEntries.map((entry) => {
            const question = lookup.get(String(entry.questionId || ''));
            const excerpt = getQuestionExcerpt(question);
            const badge = String(entry.questionId || '?');
            return `
                <button type="button" class="quiz-account-list-item" data-quiz-account-question-id="${escapeHtml(entry.questionId)}">
                    <span class="quiz-account-list-badge">${escapeHtml(badge)}</span>
                    <span class="quiz-account-list-copy">
                        <span class="quiz-account-list-text">${escapeHtml(excerpt || `Küsimus ${badge}`)}</span>
                        <span class="quiz-account-list-meta">${
                            entry.resultType === 'unanswered'
                                ? 'Veel vastamata'
                                : entry.resultType === 'correct'
                                    ? `${Math.max(1, Number(entry.attemptCount) || 1)} katsega õigeks`
                                    : entry.resultType === 'partial'
                                        ? `Osaline · ${Math.max(1, Number(entry.attemptCount) || 1)} katset`
                                        : `Vale · ${Math.max(1, Number(entry.attemptCount) || 1)} katset`
                        }</span>
                    </span>
                </button>
            `;
        }).join('')
        : `<div class="quiz-account-empty">${escapeHtml(emptyText)}</div>`;

    return `
        <section class="quiz-account-section">
            <div class="quiz-account-section-title">${escapeHtml(listTitle)}</div>
            <div class="quiz-account-list">${itemsMarkup}</div>
        </section>
    `;
}

function jumpToQuestionById(questionId) {
    const targetId = String(questionId || '');
    if (!targetId) return;

    const nextIndex = questions.findIndex((question) => String(question?.id || '') === targetId);
    if (nextIndex === -1) return;

    currentIndex = nextIndex;
    displayQuestion();
    document.getElementById('quiz')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderQuizAccountStrip(snapshot) {
    const strip = document.getElementById('quiz-account-strip');
    if (!strip) return;

    const user = snapshot?.user || null;
    if (!user?.sub) {
        strip.hidden = true;
        strip.innerHTML = '';
        return;
    }

    const stats = getQuizAccountStatsSnapshot(snapshot);
    const lookup = getQuizQuestionLookup();
    const toughestQuestions = getToughestQuestionEntries(stats.questionProgress);
    const strongestQuestions = getStrongestQuestionEntries(stats.questionProgress);
    const unansweredQuestions = getUnansweredQuestionEntries(stats.questionProgress);
    strip.hidden = false;
    strip.innerHTML = `
        <div class="quiz-account-strip-shell" data-open="${quizAccountStripExpanded ? 'true' : 'false'}">
            <button type="button" class="quiz-account-strip-toggle" aria-expanded="${quizAccountStripExpanded ? 'true' : 'false'}">
                <span class="quiz-account-strip-avatar" data-quiz-account-avatar data-avatar-size="42" aria-hidden="true"></span>
                <span class="quiz-account-strip-stats">
                    <span class="quiz-account-chip">
                        <span class="quiz-account-chip-label">Vastatud</span>
                        <span class="quiz-account-chip-value">${stats.answeredCount}</span>
                    </span>
                    <span class="quiz-account-chip quiz-account-chip--correct">
                        <span class="quiz-account-chip-label">Õiged</span>
                        <span class="quiz-account-chip-value">${stats.correctCount}</span>
                    </span>
                    <span class="quiz-account-chip quiz-account-chip--partial">
                        <span class="quiz-account-chip-label">Osalised</span>
                        <span class="quiz-account-chip-value">${stats.partialCount}</span>
                    </span>
                    <span class="quiz-account-chip quiz-account-chip--incorrect">
                        <span class="quiz-account-chip-label">Valed</span>
                        <span class="quiz-account-chip-value">${stats.incorrectCount}</span>
                    </span>
                </span>
                <span class="quiz-account-strip-chevron" aria-hidden="true">${quizAccountStripExpanded ? '−' : '+'}</span>
            </button>
            <div class="quiz-account-strip-panel" ${quizAccountStripExpanded ? '' : 'hidden'}>
                <div class="quiz-account-summary-grid">
                    <div class="quiz-account-summary-card">
                        <span class="quiz-account-summary-label">Praegune õigete seeria</span>
                        <span class="quiz-account-summary-value">${stats.currentCorrectStreak}</span>
                    </div>
                    <div class="quiz-account-summary-card">
                        <span class="quiz-account-summary-label">Parim õigete seeria</span>
                        <span class="quiz-account-summary-value">${stats.bestCorrectStreak}</span>
                    </div>
                    <div class="quiz-account-summary-card">
                        <span class="quiz-account-summary-label">Veel vastamata</span>
                        <span class="quiz-account-summary-value">${Math.max(0, questionPool.length - stats.answeredCount)}</span>
                    </div>
                    <div class="quiz-account-summary-card">
                        <span class="quiz-account-summary-label">Läbitud osa</span>
                        <span class="quiz-account-summary-value">${questionPool.length > 0 ? Math.round((stats.answeredCount / questionPool.length) * 100) : 0}%</span>
                    </div>
                </div>
                <div class="quiz-account-section-grid">
                    ${renderQuizQuestionList('Praegu keerulisemad', toughestQuestions, lookup, 'Praegu ei paista ühtki keerulist kohta.')}
                    ${renderQuizQuestionList('Kõige kindlamad', strongestQuestions, lookup, 'Ühtegi kindlat lemmikut veel pole.')}
                    ${renderQuizQuestionList('Veel vastamata', unansweredQuestions, lookup, 'Kõik küsimused on juba vähemalt korra vastatud.')}
                </div>
            </div>
        </div>
    `;

    strip.querySelector('.quiz-account-strip-toggle')?.addEventListener('click', () => {
        quizAccountStripExpanded = !quizAccountStripExpanded;
        renderQuizAccountStrip(snapshot);
    });

    strip.querySelectorAll('[data-quiz-account-question-id]').forEach((button) => {
        button.addEventListener('click', () => {
            jumpToQuestionById(button.dataset.quizAccountQuestionId || '');
        });
    });

    const avatarHost = strip.querySelector('[data-quiz-account-avatar]');
    if (!avatarHost) return;

    avatarHost.innerHTML = '<span class="quiz-account-avatar-fallback"></span>';
    loadQuizAvatarModule()
        .then((module) => {
            if (!avatarHost.isConnected) return;

            avatarHost.innerHTML = module.renderForumAnimalAvatarSvg(user.name || 'konto', {
                size: Number(avatarHost.dataset.avatarSize) || 42,
                seedKey: user.sub || user.email || user.name || 'konto',
                avatarId: snapshot?.preferences?.avatarId || '',
                label: 'quiz'
            });
        })
        .catch(() => {
            avatarHost.innerHTML = '<span class="quiz-account-avatar-fallback"></span>';
        });
}

function setupQuizAccountStrip() {
    const strip = document.getElementById('quiz-account-strip');
    const auth = window.RELV_SITE_AUTH;
    if (!strip || !auth?.subscribe || !auth?.getState) {
        return;
    }

    auth.subscribe((snapshot) => {
        renderQuizAccountStrip(snapshot);
    });

    renderQuizAccountStrip(auth.getState());
}

function getQuizAnswerReview(question, selectedOptions) {
    const correct = Array.isArray(question?.correct) ? question.correct.slice().sort((a, b) => a - b) : [];
    const selected = Array.isArray(selectedOptions) ? selectedOptions.slice().sort((a, b) => a - b) : [];

    const selectedCorrectCount = selected.filter((index) => correct.includes(index)).length;
    const missedCorrectCount = correct.filter((index) => !selected.includes(index)).length;
    const incorrectSelectedCount = selected.filter((index) => !correct.includes(index)).length;
    const isCorrect = arraysEqual(selected, correct);
    const isPartial = !isCorrect && question?.multiple && selectedCorrectCount > 0;

    return {
        questionId: question?.id != null ? String(question.id) : String(currentIndex + 1),
        resultType: isCorrect ? 'correct' : (isPartial ? 'partial' : 'incorrect'),
        selectedCount: selected.length,
        selectedCorrectCount,
        missedCorrectCount,
        incorrectSelectedCount
    };
}

async function trackQuizAnswerProgress(question, selectedOptions) {
    const auth = window.RELV_SITE_AUTH;
    if (!auth?.ready || !auth?.getAuthHeaders) {
        return;
    }

    if (!auth.readAuthToken || !auth.readAuthToken()) {
        return;
    }

    const endpoint = getApiUrl('/quiz/progress');
    if (!endpoint) {
        return;
    }

    try {
        const authState = await auth.ready();
        if (!authState?.user?.sub || !authState.user.email) {
            return;
        }

        const payload = getQuizAnswerReview(question, selectedOptions);
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: auth.getAuthHeaders({
                'Content-Type': 'application/json'
            }),
            body: JSON.stringify(payload),
            keepalive: true
        });

        const result = await response.json().catch(() => ({}));
        if (response.ok && result?.ok && result.quizStats && typeof auth.ingestAccountData === 'function') {
            auth.ingestAccountData(result);
        }
    } catch (error) {
        console.error('Quiz progress tracking error:', error);
    }
}

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
  setupQuizAccountStrip();
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

        const copy = document.createElement('span');
        copy.className = 'option-copy';

        const text = document.createElement('span');
        text.className = 'option-text';
        text.textContent = option;

        const reviewTag = document.createElement('span');
        reviewTag.className = 'option-review-tag';
        reviewTag.hidden = true;

        input.addEventListener('change', () => {
            syncOptionSelectionState(optionsDiv);
        });

        label.appendChild(input);
        copy.appendChild(text);
        copy.appendChild(reviewTag);
        label.appendChild(copy);
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
  feedbackMessage.classList.remove('is-correct', 'is-partial', 'is-incorrect');

  const ua = userAnswers[currentIndex];
  if (!ua?.submitted) {
    if (explainArea) explainArea.hidden = true;
    if (explainPanel) explainPanel.hidden = true;
    if (explainToggle) explainToggle.setAttribute('aria-expanded', 'false');

    (question.options || []).forEach((option, index) => {
      if (!option) return;
      const optionDiv = document.querySelector(`#option-${index}`)?.parentElement;
      const reviewTag = optionDiv?.querySelector('.option-review-tag');
      if (!optionDiv) return;

      optionDiv.classList.remove(
        'correct',
        'incorrect',
        'partial',
        'has-review',
        'answer-correct-picked',
        'answer-correct-missed',
        'answer-incorrect-picked'
      );

      if (reviewTag) {
        reviewTag.hidden = true;
        reviewTag.textContent = '';
      }
    });

    return;
  }

  const correct = Array.isArray(question.correct) ? question.correct : [];
  const selected = ua.selected?.slice().sort() || [];
  const selectedCorrectCount = selected.filter((index) => correct.includes(index)).length;
  const missedCorrectCount = correct.filter((index) => !selected.includes(index)).length;
  const incorrectSelectedCount = selected.filter((index) => !correct.includes(index)).length;

  const isCorrect = arraysEqual(selected, correct);
  const isPartial = !isCorrect && question.multiple && selectedCorrectCount > 0;

  if (isCorrect) {
    feedbackMessage.textContent = question.multiple
      ? 'Correct. All correct answers are marked below.'
      : 'Correct.';
    feedbackMessage.classList.add('is-correct');
  } else if (isPartial) {
    const summaryBits = [];

    if (selectedCorrectCount > 0) {
      summaryBits.push(`${selectedCorrectCount} correct ${selectedCorrectCount === 1 ? 'choice is' : 'choices are'} selected`);
    }

    if (missedCorrectCount > 0) {
      summaryBits.push(`${missedCorrectCount} correct ${missedCorrectCount === 1 ? 'answer was' : 'answers were'} missed`);
    }

    if (incorrectSelectedCount > 0) {
      summaryBits.push(`${incorrectSelectedCount} incorrect ${incorrectSelectedCount === 1 ? 'choice was' : 'choices were'} selected`);
    }

    feedbackMessage.textContent = `Partially correct. ${summaryBits.join(', ')}.`;
    feedbackMessage.classList.add('is-partial');
  } else {
    feedbackMessage.textContent = question.multiple
      ? 'Incorrect. The correct answers are marked below.'
      : 'Incorrect. The correct answer is marked below.';
    feedbackMessage.classList.add('is-incorrect');
  }

  // Highlight options with explicit review states
  (question.options || []).forEach((option, index) => {
    if (!option) return;
    const optionDiv = document.querySelector(`#option-${index}`)?.parentElement;
    const reviewTag = optionDiv?.querySelector('.option-review-tag');
    if (!optionDiv) return;

    optionDiv.classList.remove(
      'correct',
      'incorrect',
      'partial',
      'has-review',
      'answer-correct-picked',
      'answer-correct-missed',
      'answer-incorrect-picked'
    );

    if (reviewTag) {
      reviewTag.hidden = true;
      reviewTag.textContent = '';
    }

    const selectedThis = selected.includes(index);
    const correctThis = correct.includes(index);

    if (selectedThis && correctThis) {
      optionDiv.classList.add('has-review', 'answer-correct-picked');
      if (reviewTag) {
        reviewTag.textContent = 'Correct choice';
        reviewTag.hidden = false;
      }
    } else if (correctThis) {
      optionDiv.classList.add('has-review', 'answer-correct-missed');
      if (reviewTag) {
        reviewTag.textContent = 'Correct answer';
        reviewTag.hidden = false;
      }
    } else if (selectedThis) {
      optionDiv.classList.add('has-review', 'answer-incorrect-picked');
      if (reviewTag) {
        reviewTag.textContent = 'Incorrect choice';
        reviewTag.hidden = false;
      }
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
    const question = questions[currentIndex];
    userAnswers[currentIndex] = userAnswers[currentIndex] || { selected: [], submitted: false };
    userAnswers[currentIndex].selected = selectedOptions;
    userAnswers[currentIndex].submitted = true;
    trackQuizAnswerProgress(question, selectedOptions);
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

    if (window.innerWidth <= 720) {
        return;
    }

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



// Show celebration effect for 100% correct answer
let greenFx = null;
let correctFlashEl = null;
let correctFlashTimer = 0;

function getCorrectFlashEl() {
  if (!correctFlashEl) {
    correctFlashEl = document.createElement('div');
    correctFlashEl.id = 'fx-correct-flash';
    document.body.appendChild(correctFlashEl);
  }

  return correctFlashEl;
}

function showCorrectAnswerFlash() {
  const flashEl = getCorrectFlashEl();
  flashEl.classList.remove('is-active');
  void flashEl.offsetWidth;
  flashEl.classList.add('is-active');

  window.clearTimeout(correctFlashTimer);
  correctFlashTimer = window.setTimeout(() => {
    flashEl.classList.remove('is-active');
  }, 340);
}

function showCelebration() {
  // Respect reduced motion (keeps it comfy on phones)
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  showCorrectAnswerFlash();

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
    const shouldStartLoop = !this.running;

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

    if (shouldStartLoop) {
      requestAnimationFrame(this.loop);
    }
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
