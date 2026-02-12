const API_URL_BASE = 'https://opentdb.com/api.php?amount=50&category=9&type=multiple';
let allQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let sessionToken = null;

// DOM Elements
const startScreen = document.getElementById('start-screen');
const quizScreen = document.getElementById('quiz-screen');
const resultScreen = document.getElementById('result-screen');

const startBtn = document.getElementById('start-btn');
const nextBtn = document.getElementById('next-btn');
const restartBtn = document.getElementById('restart-btn');
const homeBtn = document.getElementById('home-btn');

const questionText = document.getElementById('question-text');
const optionsContainer = document.getElementById('options-container');
const questionCountDisplay = document.getElementById('question-count');
const scoreDisplay = document.getElementById('score-display');
const progressFill = document.getElementById('progress-fill');
const feedbackMsg = document.getElementById('feedback-msg');

const finalScoreDisplay = document.getElementById('final-score');
const totalQuestionsDisplay = document.getElementById('total-questions-display');
const resultMessage = document.getElementById('result-message');

// Event Listeners
startBtn.addEventListener('click', startQuiz);
nextBtn.addEventListener('click', handleNextButton);
restartBtn.addEventListener('click', startQuiz);
homeBtn.addEventListener('click', showHome);

// Functions
async function getSessionToken() {
    if (!sessionToken) {
        try {
            const res = await fetch('https://opentdb.com/api_token.php?command=request');
            const data = await res.json();
            if (data.response_code === 0) {
                sessionToken = data.token;
            }
        } catch (e) {
            console.warn("Could not get session token, duplicates may occur.");
        }
    }
    return sessionToken;
}

async function startQuiz() {
    startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    startBtn.disabled = true;

    try {
        await getSessionToken();
        await fetchQuestions(); // Fetch first batch
        score = 0;
        currentQuestionIndex = 0;

        switchScreen(quizScreen);
        showQuestion();
    } catch (error) {
        console.error('Failed to load questions:', error);
        alert('Failed to load questions. Please check your internet connection.');
    } finally {
        startBtn.innerHTML = 'Start Quiz <i class="fas fa-play"></i>';
        startBtn.disabled = false;
    }
}

async function fetchQuestions() {
    let url = API_URL_BASE;
    if (sessionToken) {
        url += `&token=${sessionToken}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.response_code === 0) {
        const newQuestions = data.results.map(q => ({
            question: q.question,
            correct_answer: q.correct_answer,
            options: shuffleArray([...q.incorrect_answers, q.correct_answer])
        }));
        // If starting fresh, replace. If continuing, append? 
        // For simplicity in this logical flow, we will append if we implementing "Endless", 
        // but to keep game loops clean, let's replace and just track "Total Score" if we wanted.
        // ACTUALLY, simplicity: Just replace properly for now, or append if we want "Question 51".
        // Let's Append.
        allQuestions = allQuestions.concat(newQuestions);
    } else {
        throw new Error('Failed to fetch questions or API limits reached.');
    }
}

function handleNextButton() {
    currentQuestionIndex++;
    if (currentQuestionIndex < allQuestions.length) {
        showQuestion();
    } else {
        // End of current batch.
        // Ideally we fetch more efficiently, but for now let's just end the round
        // Or we could auto-fetch. Let's auto-fetch for the "500 questions" feel.
        startBtn.innerHTML = 'Loading more...';
        fetchQuestions().then(() => {
            showQuestion();
        }).catch(() => {
            endQuiz(); // If can't fetch more, end it.
        });
    }
}

function showQuestion() {
    resetState();
    const currentQuestion = allQuestions[currentQuestionIndex];

    questionText.innerHTML = currentQuestion.question; // InnerHTML for entities
    questionCountDisplay.innerText = `Question ${currentQuestionIndex + 1}`;
    scoreDisplay.innerText = `Score: ${score}`;

    // Update Progress - Logic changed for infinite/large sets
    // Let's just show progress within the current batch of 50 for visual context, or % of 500?
    // Let's do % of 50 for the bar loop.
    const batchSize = 50;
    const progress = ((currentQuestionIndex % batchSize) / batchSize) * 100;
    progressFill.style.width = `${progress}%`;

    currentQuestion.options.forEach(option => {
        const button = document.createElement('button');
        button.innerHTML = option; // InnerHTML for entities
        button.classList.add('option-btn');
        button.addEventListener('click', () => selectAnswer(button, currentQuestion.correct_answer));
        optionsContainer.appendChild(button);
    });
}

function resetState() {
    nextBtn.classList.add('hidden');
    feedbackMsg.innerHTML = '';
    while (optionsContainer.firstChild) {
        optionsContainer.removeChild(optionsContainer.firstChild);
    }
}

function selectAnswer(selectedBtn, correctAnswer) {
    // Decode correct answer for comparison text content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = correctAnswer;
    const correctText = tempDiv.textContent || tempDiv.innerText;

    // Check against the clicked button's text (which is also decoded by browser when set as innerHTML)
    // Actually, safer to compare innerHTML if we set innerHTML, but order might differ?
    // Simplest: Compare textContent

    const isCorrect = selectedBtn.textContent === correctText;

    const allButtons = optionsContainer.querySelectorAll('.option-btn');

    // Disable all buttons
    allButtons.forEach(btn => {
        btn.classList.add('disabled');
        if (btn.textContent === correctText) {
            btn.classList.add('correct');
            btn.innerHTML += ' <i class="fas fa-check"></i>';
        }
    });

    if (isCorrect) {
        score += 10;
        scoreDisplay.innerText = `Score: ${score}`;
        feedbackMsg.innerHTML = '<span style="color: var(--accent-color)">Correct!</span>';
    } else {
        selectedBtn.classList.add('wrong');
        selectedBtn.innerHTML += ' <i class="fas fa-times"></i>';
        feedbackMsg.innerHTML = '<span style="color: var(--secondary-color)">Wrong!</span>';
    }

    nextBtn.classList.remove('hidden');
}

function endQuiz() {
    switchScreen(resultScreen);
    finalScoreDisplay.innerText = score;
    totalQuestionsDisplay.innerText = `out of ${currentQuestionIndex + 1} played`;

    const percentage = (score / ((currentQuestionIndex + 1) * 10)) * 100;
    if (percentage >= 80) {
        resultMessage.innerText = "Outstanding! You're a Genius!";
    } else if (percentage >= 50) {
        resultMessage.innerText = "Great Job! Keep learning.";
    } else {
        resultMessage.innerText = "Good try! Practice makes perfect.";
    }

    // Reset for next game
    allQuestions = [];
}

function showHome() {
    switchScreen(startScreen);
    allQuestions = [];
}

function switchScreen(screenToShow) {
    [startScreen, quizScreen, resultScreen].forEach(screen => {
        screen.classList.remove('active');
        screen.classList.add('hidden');
    });
    screenToShow.classList.remove('hidden');
    screenToShow.classList.add('active');
}

// Utility: Shuffle Array
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}
