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

    userAnswers = Array(questions.length).fill(null).map(() => ({ selected: [], submitted: false }));
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
    if (arraysEqual(userAnswers[currentIndex]?.selected?.sort() || [], question.correct?.sort() || [])) {
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

// Create the question grid
function createQuestionGrid() {
    const gridDiv = document.getElementById('question-grid');
    console.log('Creating grid for questions:', questions);
    if (!gridDiv.querySelector('.grid-container')) { // Recreate only if not present
        gridDiv.innerHTML = '<div class="grid-container"></div>';
        const gridContainer = gridDiv.querySelector('.grid-container');

        // Create a grid for all 71 questions (7x11 layout, limited to 71)
        for (let i = 0; i < Math.min(71, questions.length); i++) {
            const item = document.createElement('div');
            item.className = 'grid-item unanswered';
            item.textContent = i + 1;
            item.addEventListener('click', () => {
                if (i < questions.length) {
                    currentIndex = i;
                    displayQuestion();
                }
            });
            gridContainer.appendChild(item);
        }
    } else {
        console.log('Grid container already exists, updating instead');
        updateQuestionGrid();
    }
}

// Update the question grid based on user answers
function updateQuestionGrid() {
    if (!questions || questions.length === 0) {
        console.error('No questions available to update grid');
        return;
    }
    const grid = document.getElementById('question-grid');
    if (!grid) return;

    // Update all grid items, limited to 71 questions
    const gridItems = grid.querySelectorAll('.grid-item');
    for (let i = 0; i < Math.min(gridItems.length, 71); i++) { // Limit to 71 items for 7x11 grid
        const cell = gridItems[i];
        if (userAnswers[i] && userAnswers[i].submitted) {
            const question = questions[i] || {};
            const correct = Array.isArray(question.correct) ? question.correct : [];
            const selected = userAnswers[i]?.selected?.sort() || [];
            if (arraysEqual(selected, correct)) {
                cell.classList.remove('incorrect', 'partial', 'unanswered');
                cell.classList.add('correct');
            } else if (question.multiple && selected.length > 0 && selected.some(opt => correct.includes(opt))) {
                // Partial correct for multiple-choice (at least one correct answer selected, but not all)
                cell.classList.remove('correct', 'incorrect', 'unanswered');
                cell.classList.add('partial');
            } else if (selected.length > 0) {
                // Incorrect if any options are selected but not fully correct
                cell.classList.remove('correct', 'partial', 'unanswered');
                cell.classList.add('incorrect');
            } else {
                // Unanswered if no options selected
                cell.classList.remove('correct', 'incorrect', 'partial');
                cell.classList.add('unanswered');
            }
        } else {
            // Unanswered if not submitted
            cell.classList.remove('correct', 'incorrect', 'partial');
            cell.classList.add('unanswered');
        }
    }
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
    if (!Array.isArray(a) || !Array.isArray(b)) return false;
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) return false;
    }
    return true;
}