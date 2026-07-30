window.GameManager = {
    currentWord: '',
    questions: [],
    currentQuestionIndex: 0,
    score: 0,
    wrongQuestions: [],
    maxWrongQuestions: 5,
    gameActive: false,
    sourceLanguage: 'en',
    targetLanguage: 'tr',
    selectedWords: [],
    poolWords: [],

    init() {
        window.addEventListener('popstate', (e) => {
            if (e.state && e.state.game) {
                this.renderGame();
            } else if (this.gameActive) {
                this.gameActive = false;
            }
        });
    },

    async start(word) {
        this.currentWord = word;
        this.renderLanguageSelection();
    },

    renderLanguageSelection() {
        const container = document.getElementById('results-container');
        if (!container) return;

        container.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <button class="icon-btn" onclick="window.AppSearch('${this.currentWord}')">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg>
                    </button>
                    <h2>Select Target Language</h2>
                </div>
                <div class="question-card">
                    <div style="margin-bottom: 20px; text-align: center;">
                        <p>Learn <strong>${this.currentWord}</strong> by translating example sentences.</p>
                        <div style="display: flex; align-items: center; justify-content: center; gap: 15px; margin-top: 20px;">
                            <span>English</span>
                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m700-300-42-42 108-108H160v-60h606L658-618l42-42 180 180-180 180Z"/></svg>
                            <select id="target-lang-select" style="padding: 8px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-main); font-size: 16px;">
                                <option value="tr">Turkish</option>
                                <option value="es">Spanish</option>
                                <option value="fr">French</option>
                                <option value="de">German</option>
                                <option value="it">Italian</option>
                                <option value="ru">Russian</option>
                                <option value="ar">Arabic</option>
                            </select>
                        </div>
                    </div>
                    <button class="check-btn" onclick="GameManager.initGame()">Start Game</button>
                </div>
            </div>
        `;
    },

    async initGame() {
        const langSelect = document.getElementById('target-lang-select');
        this.targetLanguage = langSelect ? langSelect.value : 'tr';

        this.questions = [];
        this.currentQuestionIndex = 0;
        this.score = 0;
        this.wrongQuestions = [];
        this.gameActive = true;

        this.showLoader();
        try {
            const data = await this.fetchGameData(this.currentWord);
            if (!data) {
                alert('Could not fetch game data for this word.');
                this.hideLoader();
                return;
            }

            const rawQuestions = await this.generateQuestions(data);
            if (rawQuestions.length === 0) {
                alert('No sentences found for this word to play.');
                this.hideLoader();
                return;
            }

            this.questions = rawQuestions;
            this.hideLoader();
            this.renderGame();
        } catch (e) {
            console.error(e);
            alert('An error occurred while starting the game.');
            this.hideLoader();
        }
    },

    async fetchGameData(word) {
        try {
            const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`);
            if (!response.ok) return null;
            const data = await response.json();
            return data[0];
        } catch (e) {
            console.error(e);
            return null;
        }
    },

    async translateText(text) {
        try {
            const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=${this.targetLanguage}&dt=t&q=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            const data = await response.json();
            return data[0][0][0];
        } catch (e) {
            console.error('Translation error:', e);
            return text; // Fallback to original
        }
    },

    async generateQuestions(data) {
        const sentences = [];
        const word = data.word;

        // Extract examples from definitions
        data.meanings.forEach(meaning => {
            meaning.definitions.forEach(def => {
                if (def.example && def.example.length < 100) {
                    sentences.push(def.example);
                }
            });
        });

        // Add synonyms as well to find more sentences if needed
        // (Optional: can be expanded)

        // Shuffle sentences and take up to 5
        const selectedSentences = sentences.sort(() => 0.5 - Math.random()).slice(0, 5);

        const questions = [];
        for (const s of selectedSentences) {
            const tr = await this.translateText(s);
            questions.push({
                text: s,
                translation: tr,
                word: word
            });
        }
        return questions;
    },

    renderGame() {
        const container = document.getElementById('results-container');
        if (!container) return;

        container.innerHTML = `
            <div class="game-container">
                <div class="game-header">
                    <button class="icon-btn" onclick="window.AppSearch('${this.currentWord}')">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z"/></svg>
                    </button>
                    <h2>Translation Game: ${this.currentWord}</h2>
                    <div class="game-progress">${this.currentQuestionIndex + 1} / ${this.questions.length}</div>
                </div>
                <div id="game-content">
                    ${this.renderQuestion()}
                </div>
            </div>
        `;

        this.setupQuestionUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    renderQuestion() {
        const question = this.questions[this.currentQuestionIndex];
        return `
            <div class="question-card">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                    <div class="question-text">${question.text}</div>
                    <button class="audio-btn" onclick="GameManager.playAudio('${question.text.replace(/'/g, "\\'")}')">
                        <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="currentColor"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z"/></svg>
                    </button>
                </div>
                <div style="color: var(--text-sub); margin-bottom: 10px; font-size: 14px;">Translate into ${this.getTargetLangName()}:</div>
                <div class="answer-area" id="answer-slots"></div>
                <div class="word-options" id="word-pool"></div>
                <div id="game-feedback" class="feedback"></div>
                <div class="game-actions">
                    <button id="check-btn" class="check-btn" onclick="GameManager.checkAnswer()">Check Answer</button>
                    <button id="next-btn" class="check-btn" style="display:none;" onclick="GameManager.nextQuestion()">Next</button>
                </div>
            </div>
        `;
    },

    getTargetLangName() {
        const names = { tr: 'Turkish', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian', ru: 'Russian', ar: 'Arabic' };
        return names[this.targetLanguage] || this.targetLanguage;
    },

    setupQuestionUI() {
        const question = this.questions[this.currentQuestionIndex];
        // Normalize translation: remove some punctuation for easier matching if needed,
        // but for tag game, we keep them as provided in split.
        const words = question.translation.split(/\s+/).filter(w => w.length > 0);
        this.poolWords = [...words].sort(() => 0.5 - Math.random());
        this.selectedWords = [];

        this.renderPool();
        this.renderSlots();
    },

    renderPool() {
        const pool = document.getElementById('word-pool');
        pool.innerHTML = this.poolWords.map((w, i) => `
            <div class="game-word-tag" onclick="GameManager.selectWord(${i})">${w}</div>
        `).join('');
    },

    renderSlots() {
        const slots = document.getElementById('answer-slots');
        slots.innerHTML = this.selectedWords.map((w, i) => `
            <div class="game-word-tag" onclick="GameManager.deselectWord(${i})">${w}</div>
        `).join('');
    },

    selectWord(index) {
        const word = this.poolWords.splice(index, 1)[0];
        this.selectedWords.push(word);
        this.renderPool();
        this.renderSlots();
    },

    deselectWord(index) {
        const word = this.selectedWords.splice(index, 1)[0];
        this.poolWords.push(word);
        this.renderPool();
        this.renderSlots();
    },

    checkAnswer() {
        const question = this.questions[this.currentQuestionIndex];
        const userAnswer = this.selectedWords.join(' ');
        const feedback = document.getElementById('game-feedback');
        const checkBtn = document.getElementById('check-btn');
        const nextBtn = document.getElementById('next-btn');

        if (userAnswer === question.translation) {
            feedback.innerText = 'Correct! Well done.';
            feedback.className = 'feedback correct';
            this.score++;
        } else {
            feedback.innerText = `Incorrect. Correct answer: ${question.translation}`;
            feedback.className = 'feedback wrong';
            this.wrongQuestions.push(question);
        }

        checkBtn.style.display = 'none';
        nextBtn.style.display = 'block';
    },

    nextQuestion() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.questions.length) {
            this.renderGame();
        } else if (this.wrongQuestions.length > 0 && this.wrongQuestions.length <= this.maxWrongQuestions) {
            // Start repeat mode for wrong questions
            this.questions = [...this.wrongQuestions];
            this.wrongQuestions = [];
            this.currentQuestionIndex = 0;
            alert('Now let\'s repeat the questions you missed!');
            this.renderGame();
        } else {
            this.showResults();
        }
    },

    showResults() {
        const container = document.getElementById('results-container');
        container.innerHTML = `
            <div class="game-container">
                <div class="question-card">
                    <h2 style="margin-bottom: 20px;">Game Over!</h2>
                    <div style="font-size: 48px; font-weight: bold; color: var(--accent); margin-bottom: 20px;">${this.score} / ${this.questions.length + (this.wrongQuestions.length || 0)}</div>
                    <p style="margin-bottom: 30px;">Performance evaluated. ${this.score === (this.questions.length + (this.wrongQuestions.length || 0)) ? 'Perfect score!' : 'Keep practicing!'}</p>
                    <div style="display: flex; flex-direction: column; gap: 10px; width: 100%;">
                        <button class="check-btn" onclick="window.AppSearch('${this.currentWord}')">Back to Dictionary</button>
                        <button class="check-btn" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);" onclick="GameManager.start('${this.currentWord}')">Play Again</button>
                    </div>
                </div>
            </div>
        `;
    },

    playAudio(text) {
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-US';
            window.speechSynthesis.speak(utterance);
        }
    },

    showLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
    },

    hideLoader() {
        const loader = document.getElementById('loader');
        if (loader) {
            loader.style.display = 'none';
            document.body.classList.remove('modal-open');
        }
    }
};
