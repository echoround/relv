let questions = [];
let currentIndex = 0;
let userAnswers = [];

// Load questions from JSON file
fetch('questions.json')
  .then(response => response.json())
  .then(data => {
    questions = data.questions;
    userAnswers = Array(questions.length).fill(null).map(() => ({ selected: [], submitted: false }));
    displayQuestion();
  })
  .catch(error => {
    console.error('Error loading questions:', error);
    alert('Failed to load questions. Please check the JSON file.');
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
}

// Display feedback after submission
function displayFeedback() {
  const feedbackDiv = document.getElementById('feedback');
  feedbackDiv.innerHTML = '';
  if (userAnswers[currentIndex].submitted) {
    const question = questions[currentIndex];
    const correct = arraysEqual(userAnswers[currentIndex].selected.sort(), question.correct.sort());
    const message = correct ? 'Correct!' : 'Incorrect.';
    feedbackDiv.textContent = message;

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
    explanation.textContent = question.explanation;
    feedbackDiv.appendChild(explanation);
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

// Helper function to compare arrays
function arraysEqual(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}