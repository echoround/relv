let questions = [];
let currentIndex = 0;
let userAnswers = [];
let explanations = [];

// Load questions and explanations from JSON files
Promise.all([
  fetch('questions.json').then(response => response.json()),
  fetch('explanations.json').then(response => response.json())
])
  .then(([questionsData, explanationsData]) => {
    questions = questionsData.questions;
    explanations = explanationsData.explanations;
    userAnswers = Array(questions.length).fill(null).map(() => ({ selected: [], submitted: false }));
    displayQuestion();
    createQuestionGrid(); // Ensure grid is recreated
  })
  .catch(error => {
    console.error('Error loading data:', error);
    alert('Failed to load questions or explanations. Please check the JSON files.');
  });

// Display the current question
function displayQuestion() {
  const question = questions[currentIndex];
  document.getElementById('progress').textContent = `Question ${currentIndex + 1} of ${questions.length}`;
  document.getElementById('question-text').textContent = question.text;
  const optionsDiv = document.getElementById('options');
  optionsDiv.innerHTML = '';

  // Create options (radio for single choice, checkboxes for multiple)
  question.options.forEach((option, index) => {
    const inputType = question.multiple ? 'checkbox' : 'radio';
    const input = document.createElement('input');
    input.type = inputType;
    input.name = 'option';
    input.value = index;
    input.id = `option-${index}`;
    input.disabled = userAnswers[currentIndex].submitted;
    if (userAnswers[currentIndex].selected.includes(index)) {
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
  submitBtn.style.display = userAnswers[currentIndex].submitted ? 'none' : 'block';
  displayFeedback();
  updateQuestionGrid();
}

// Display feedback after submission and add question mark button
function displayFeedback() {
  const feedbackDiv = document.getElementById('feedback');
  const feedbackMessage = document.getElementById('feedback-message');
  feedbackMessage.innerHTML = '';
  if (userAnswers[currentIndex].submitted) {
    const question = questions[currentIndex];
    const correct = arraysEqual(userAnswers[currentIndex].selected.sort(), question.correct.sort());
    const message = correct ? 'Correct!' : 'Incorrect.';
    feedbackMessage.textContent = message;

    // Highlight correct and incorrect options
    question.options.forEach((option, index) => {
      const optionDiv = document.querySelector(`#option-${index}`).parentElement;
      if (question.correct.includes(index)) {
        optionDiv.classList.add('correct');
      } else if (userAnswers[currentIndex].selected.includes(index)) {
        optionDiv.classList.add('incorrect');
      }
    });

    // Show explanation
    const explanation = document.createElement('p');
    explanation.textContent = question.explanation || 'No explanation provided.';
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
    const explanationText = explanations.find(exp => exp.id === question.id)?.text || 'No additional explanation available.';
    tooltip.textContent = explanationText;

    // Handle tooltip visibility on hover
    questionMarkBtn.addEventListener('mouseover', () => {
      tooltip.style.display = 'block';
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
  if (correct) {
    showCelebration();
  }
}

// Handle submit button click
document.getElementById('submit-btn').addEventListener('click', () => {
  const selectedOptions = Array.from(document.querySelectorAll('input[name="option"]:checked')).map(input => parseInt(input.value));
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
      if (userAnswers[i].submitted && arraysEqual(userAnswers[i].selected.sort(), questions[i].correct.sort())) {
        score++;
      }
    }
    alert(`Quiz completed! Your score: ${score} out of ${questions.length}`);
  }
});

// Create the question grid
function createQuestionGrid() {
  const gridDiv = document.getElementById('question-grid');
  if (!gridDiv.querySelector('.grid-container')) { // Recreate only if not present
    gridDiv.innerHTML = '<div class="grid-container"></div>';
    const gridContainer = gridDiv.querySelector('.grid-container');

    for (let i = 0; i < questions.length; i++) {
      const item = document.createElement('div');
      item.className = 'grid-item unanswered';
      item.textContent = i + 1;
      item.addEventListener('click', () => {
        currentIndex = i;
        displayQuestion();
      });
      gridContainer.appendChild(item);
    }
  }
}

// Update the question grid based on user answers
function updateQuestionGrid() {
  const gridItems = document.querySelectorAll('.grid-item');
  gridItems.forEach((item, index) => {
    item.classList.remove('correct', 'incorrect', 'partial', 'current', 'unanswered');
    if (index === currentIndex) {
      item.classList.add('current');
    } else if (userAnswers[index].submitted) {
      const question = questions[index];
      const selected = userAnswers[index].selected.sort();
      const correct = question.correct.sort();
      if (arraysEqual(selected, correct)) {
        item.classList.add('correct');
      } else if (question.multiple && selected.length > 0 && selected.some(option => correct.includes(option))) {
        // Partial correct for multiple-choice (at least one correct answer selected, but not all)
        item.classList.add('partial');
      } else {
        item.classList.add('incorrect');
      }
    } else {
      item.classList.add('unanswered');
    }
  });
}

// Show celebration effect for 100% correct answer
function showCelebration() {
  // Green flash
  const flash = document.createElement('div');
  flash.id = 'green-flash';
  document.body.appendChild(flash);

  // Fireworks
  for (let i = 0; i < 10; i++) { // 10 fireworks for a festive effect
    const firework = document.createElement('div');
    firework.className = 'firework';
    firework.style.left = Math.random() * 100 + 'vw';
    firework.style.top = Math.random() * 100 + 'vh';
    document.body.appendChild(firework);
  }

  // Remove flash and fireworks after animation
  setTimeout(() => {
    flash.remove();
    document.querySelectorAll('.firework').forEach(fw => fw.remove());
  }, 400); // Match the 0.4s fade-out duration
}

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}