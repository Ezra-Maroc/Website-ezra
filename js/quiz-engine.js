// js/quiz-engine.js — Shared quiz engine for all languages
// Reads configuration from window.QUIZ_CONFIG = { lang, dataUrl, quizLength }
// Loads quiz data (questions + UI strings) from a JSON file

(function () {
    'use strict';

    const config = window.QUIZ_CONFIG || {};
    const QUIZ_LENGTH = config.quizLength || 10;

    let quizData = null;

    // State
    let currentTheme = '';
    let currentQuestionIndex = 0;
    let score = 0;
    let questionsForCurrentQuiz = [];

    // DOM references (initialized on DOMContentLoaded)
    let els = {};

    // --- Utility ---
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    function getThemeDisplayName(themeKey) {
        return (quizData.themeDisplayNames && quizData.themeDisplayNames[themeKey]) || themeKey;
    }

    // --- Rendering ---
    function renderThemeButtons() {
        const container = els.themeSelector;
        if (!container || !quizData.themeButtons) return;
        container.innerHTML = '';

        quizData.themeButtons.forEach(function (theme) {
            const btn = document.createElement('button');
            btn.className = 'theme-btn';
            btn.setAttribute('data-theme', theme.key);
            if (theme.key === 'mixte') btn.id = 'theme-btn-mixte';

            const icon = document.createElement('i');
            icon.className = theme.icon;
            icon.setAttribute('aria-hidden', 'true');
            btn.appendChild(icon);
            btn.appendChild(document.createTextNode(' ' + theme.label));

            container.appendChild(btn);
        });
    }

    function populateUIStrings() {
        const ui = quizData.ui;
        if (!ui) return;

        // Quiz titles (inside the quiz container)
        if (els.quizTitle) els.quizTitle.textContent = ui.quizTitle || '';
        if (els.quizSubtitle) els.quizSubtitle.textContent = ui.quizSubtitle || '';
        if (els.themePrompt) els.themePrompt.textContent = ui.themePrompt || '';
        if (els.completionTitle) els.completionTitle.textContent = ui.completionTitle || '';

        // Score board labels
        if (els.scoreLabel) els.scoreLabel.textContent = (ui.scoreLabel || 'Score') + ': ';
        if (els.questionLabel) els.questionLabel.textContent = ui.questionLabel || 'Question';
        if (els.ofLabel) els.ofLabel.textContent = ui.ofLabel || 'of';

        // Buttons
        if (els.nextBtn) {
            const textNode = els.nextBtn.lastChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' ' + (ui.nextButton || '');
            }
        }
        // Restart buttons (quiz section + final section)
        document.querySelectorAll('[data-action="restart"]').forEach(function (btn) {
            const textNode = btn.lastChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' ' + (ui.restartButton || '');
            }
        });
        document.querySelectorAll('[data-action="retry"]').forEach(function (btn) {
            const textNode = btn.lastChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' ' + (ui.retryButton || '');
            }
        });
        document.querySelectorAll('[data-action="mixed"]').forEach(function (btn) {
            const textNode = btn.lastChild;
            if (textNode && textNode.nodeType === Node.TEXT_NODE) {
                textNode.textContent = ' ' + (ui.mixedQuizButton || '');
            }
        });
    }

    // --- Quiz Logic ---
    function loadQuestionsForTheme(themeName) {
        questionsForCurrentQuiz = [];
        const questions = quizData.questions;

        if (themeName === 'mixte') {
            const allMixed = [];
            for (const key in questions) {
                if (Array.isArray(questions[key])) {
                    questions[key].forEach(function (q) {
                        allMixed.push(Object.assign({}, q, { originalTheme: key }));
                    });
                }
            }
            shuffleArray(allMixed);
            questionsForCurrentQuiz = allMixed.slice(0, Math.min(QUIZ_LENGTH, allMixed.length));
        } else if (questions[themeName] && Array.isArray(questions[themeName])) {
            const themeQ = questions[themeName].map(function (q) {
                return Object.assign({}, q, { originalTheme: themeName });
            });
            shuffleArray(themeQ);
            questionsForCurrentQuiz = themeQ.slice(0, Math.min(QUIZ_LENGTH, themeQ.length));
        }

        if (els.totalQuestionsInQuiz) els.totalQuestionsInQuiz.textContent = questionsForCurrentQuiz.length;
        if (els.totalQCount) els.totalQCount.textContent = questionsForCurrentQuiz.length;
    }

    function selectTheme(themeName) {
        currentTheme = themeName;

        // Highlight selected button
        const allBtns = els.themeSelector ? els.themeSelector.querySelectorAll('.theme-btn') : [];
        allBtns.forEach(function (btn) {
            btn.classList.toggle('selected', btn.getAttribute('data-theme') === themeName);
        });

        loadQuestionsForTheme(themeName);

        currentQuestionIndex = 0;
        score = 0;
        updateScoreDisplay();

        if (els.themeSelection) els.themeSelection.style.display = 'none';
        if (els.finalSection) els.finalSection.classList.remove('active');
        if (els.quizSection) els.quizSection.classList.add('active');

        const ui = quizData.ui;
        if (els.themeInfoDisplay) {
            els.themeInfoDisplay.textContent = (ui.themeLabel || 'Theme') + ': ' + getThemeDisplayName(currentTheme);
        }

        displayQuestion();
        clearConfetti();
    }

    function displayQuestion() {
        if (!els.question || !els.answers || !els.explanationContainer || !els.nextBtn) return;

        const ui = quizData.ui;

        if (questionsForCurrentQuiz.length === 0) {
            els.question.textContent = ui.noQuestionsLoaded || 'No questions loaded.';
            els.answers.innerHTML = '';
            els.nextBtn.style.display = 'none';
            return;
        }

        if (currentQuestionIndex < questionsForCurrentQuiz.length) {
            const q = questionsForCurrentQuiz[currentQuestionIndex];
            els.question.textContent = q.question;
            els.answers.innerHTML = '';

            q.answers.forEach(function (answer, index) {
                const btn = document.createElement('button');
                btn.className = 'answer';
                btn.setAttribute('data-index', index);

                const iconSpan = document.createElement('span');
                iconSpan.className = 'icon';
                const iconI = document.createElement('i');
                iconI.className = 'fas fa-circle';
                iconI.setAttribute('aria-hidden', 'true');
                iconSpan.appendChild(iconI);

                btn.appendChild(iconSpan);
                btn.appendChild(document.createTextNode(' ' + answer));
                els.answers.appendChild(btn);
            });

            els.explanationContainer.style.display = 'none';
            els.nextBtn.style.display = 'none';
            if (els.currentQNum) els.currentQNum.textContent = currentQuestionIndex + 1;
            updateProgressBar();
        } else {
            showFinalScore();
        }
    }

    function selectAnswer(selectedIndex) {
        if (!els.answers || !els.explanationContainer || !els.explanationText || !els.nextBtn) return;
        if (currentQuestionIndex >= questionsForCurrentQuiz.length) return;

        const q = questionsForCurrentQuiz[currentQuestionIndex];
        const correctIndex = q.correct;
        const answerButtons = els.answers.querySelectorAll('.answer');

        answerButtons.forEach(function (btn, idx) {
            btn.classList.add('disabled');
            // Remove click ability
            btn.removeAttribute('data-index');
            if (idx === correctIndex) btn.classList.add('correct');
        });

        if (selectedIndex === correctIndex) {
            score++;
            answerButtons[selectedIndex].classList.add('correct');
        } else {
            answerButtons[selectedIndex].classList.add('incorrect');
        }

        updateScoreDisplay();

        // Show explanation
        const ui = quizData.ui;
        els.explanationText.innerHTML = '';
        const strong = document.createElement('strong');
        strong.textContent = ui.explanationLabel || 'Explanation:';
        els.explanationText.appendChild(strong);
        els.explanationText.appendChild(document.createTextNode(' ' + q.explanation));

        els.explanationContainer.style.display = 'block';
        els.nextBtn.style.display = 'inline-flex';
    }

    function nextQuestion() {
        currentQuestionIndex++;
        displayQuestion();
    }

    function updateScoreDisplay() {
        if (els.score) els.score.textContent = score;
    }

    function showFinalScore() {
        if (els.quizSection) els.quizSection.classList.remove('active');
        if (els.finalSection) els.finalSection.classList.add('active');

        const ui = quizData.ui;
        const totalQuestions = questionsForCurrentQuiz.length;

        if (totalQuestions === 0) {
            if (els.finalScoreText) els.finalScoreText.textContent = ui.noQuestionsPlayed || '';
            if (els.finalMessage) els.finalMessage.textContent = ui.selectAnotherTheme || '';
            return;
        }

        const percentage = (score / totalQuestions) * 100;

        if (els.finalScoreText) {
            els.finalScoreText.textContent = (ui.yourScoreLabel || 'Score') + ' : ' + score + ' / ' + totalQuestions;
        }

        const msgs = ui.finalMessages || {};
        let message = '';
        if (percentage === 100) {
            message = msgs.perfect || '';
            triggerConfetti();
        } else if (percentage >= 75) {
            message = msgs.excellent || '';
            triggerConfetti();
        } else if (percentage >= 50) {
            message = msgs.good || '';
        } else if (percentage >= 25) {
            message = msgs.fair || '';
        } else {
            message = msgs.low || '';
        }

        if (els.finalMessage) els.finalMessage.textContent = message;
    }

    function restartQuiz() {
        if (els.themeSelection) els.themeSelection.style.display = 'block';
        if (els.quizSection) els.quizSection.classList.remove('active');
        if (els.finalSection) els.finalSection.classList.remove('active');

        const allBtns = els.themeSelector ? els.themeSelector.querySelectorAll('.theme-btn') : [];
        allBtns.forEach(function (btn) { btn.classList.remove('selected'); });

        currentQuestionIndex = 0;
        score = 0;
        questionsForCurrentQuiz = [];

        updateScoreDisplay();
        if (els.progress) els.progress.style.width = '0%';
        if (els.totalQuestionsInQuiz) els.totalQuestionsInQuiz.textContent = '0';
        if (els.totalQCount) els.totalQCount.textContent = '0';
        if (els.currentQNum) els.currentQNum.textContent = '0';

        clearConfetti();
    }

    function updateProgressBar() {
        const totalQuestions = questionsForCurrentQuiz.length;
        if (totalQuestions === 0) {
            if (els.progress) els.progress.style.width = '0%';
            return;
        }
        const pct = ((currentQuestionIndex + 1) / totalQuestions) * 100;
        if (els.progress) els.progress.style.width = pct + '%';
    }

    // --- Confetti ---
    function triggerConfetti() {
        if (!els.confettiContainer) return;
        clearConfetti();
        const numConfetti = 150;
        const colors = ['#FFC107', '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#E91E63'];
        for (let i = 0; i < numConfetti; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDuration = (Math.random() * 3 + 2) + 's';
            confetti.style.animationDelay = Math.random() * 0.5 + 's';
            const type = Math.floor(Math.random() * 3);
            if (type === 0) {
                confetti.style.width = (Math.random() * 10 + 5) + 'px';
                confetti.style.height = confetti.style.width;
            } else if (type === 1) {
                confetti.style.width = (Math.random() * 15 + 8) + 'px';
                confetti.style.height = (Math.random() * 8 + 4) + 'px';
            } else {
                const size = (Math.random() * 10 + 5) + 'px';
                confetti.style.width = size;
                confetti.style.height = size;
                confetti.style.borderRadius = '50%';
            }
            confetti.style.transform = 'rotate(' + (Math.random() * 360) + 'deg)';
            els.confettiContainer.appendChild(confetti);
            confetti.addEventListener('animationend', function () {
                if (this.parentNode) this.remove();
            });
        }
    }

    function clearConfetti() {
        if (els.confettiContainer) els.confettiContainer.innerHTML = '';
    }

    // --- Event Delegation ---
    function setupEventDelegation() {
        // Theme buttons
        if (els.themeSelector) {
            els.themeSelector.addEventListener('click', function (e) {
                const btn = e.target.closest('.theme-btn');
                if (!btn) return;
                const themeName = btn.getAttribute('data-theme');
                if (themeName) selectTheme(themeName);
            });
        }

        // Answer buttons (delegated on answers container)
        if (els.answers) {
            els.answers.addEventListener('click', function (e) {
                const btn = e.target.closest('.answer');
                if (!btn || btn.classList.contains('disabled')) return;
                const index = btn.getAttribute('data-index');
                if (index !== null) selectAnswer(parseInt(index, 10));
            });
        }

        // Action buttons (next, restart, retry, mixed)
        document.querySelectorAll('[data-action]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                const action = this.getAttribute('data-action');
                if (action === 'next') nextQuestion();
                else if (action === 'restart' || action === 'retry') restartQuiz();
                else if (action === 'mixed') selectTheme('mixte');
            });
        });
    }

    // --- Initialization ---
    function initDOM() {
        els = {
            themeSelection: document.getElementById('theme-selection'),
            themeSelector: document.getElementById('theme-selector'),
            quizSection: document.getElementById('quiz-section'),
            finalSection: document.getElementById('final-section'),
            score: document.getElementById('score'),
            totalQuestionsInQuiz: document.getElementById('total-questions-in-quiz'),
            currentQNum: document.getElementById('current-q-num'),
            totalQCount: document.getElementById('total-q-count'),
            progress: document.getElementById('progress'),
            themeInfoDisplay: document.getElementById('theme-info-display'),
            question: document.getElementById('question'),
            answers: document.getElementById('answers'),
            explanationContainer: document.getElementById('explanation-container'),
            explanationText: document.getElementById('explanation-text'),
            nextBtn: document.getElementById('next-btn'),
            confettiContainer: document.getElementById('confetti-container'),
            finalScoreText: document.getElementById('final-score-text'),
            finalMessage: document.getElementById('final-message'),
            quizTitle: document.getElementById('quiz-title'),
            quizSubtitle: document.getElementById('quiz-subtitle'),
            themePrompt: document.getElementById('theme-prompt'),
            completionTitle: document.getElementById('completion-title'),
            scoreLabel: document.getElementById('score-label'),
            questionLabel: document.getElementById('question-label'),
            ofLabel: document.getElementById('of-label')
        };
    }

    async function initQuiz() {
        initDOM();

        if (!config.dataUrl) {
            if (els.question) els.question.textContent = 'Quiz configuration error: no dataUrl specified.';
            return;
        }

        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(function () { controller.abort(); }, 10000);
            const response = await fetch(config.dataUrl, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!response.ok) throw new Error('HTTP ' + response.status);
            quizData = await response.json();
        } catch (e) {
            if (els.themeSelection) {
                els.themeSelection.textContent = '';
                const errorEl = document.createElement('p');
                errorEl.style.color = 'red';
                errorEl.style.textAlign = 'center';
                errorEl.textContent = 'Unable to load quiz data. Please refresh the page.';
                els.themeSelection.appendChild(errorEl);
            }
            return;
        }

        renderThemeButtons();
        populateUIStrings();
        setupEventDelegation();
        restartQuiz();
    }

    document.addEventListener('DOMContentLoaded', initQuiz);
})();
