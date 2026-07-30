window.GameManager = {
    state: {
        questions: [],
        currentIndex: 0,
        score: 0,
        wrongQuestions: [],
        isReviewingWrong: false,
        totalQuestions: 0
    },

    init() {
        const btn = document.getElementById('gameToggleBtn');
        const closeBtn = document.getElementById('gameCloseBtn');
        if (btn) btn.onclick = () => this.start();
        if (closeBtn) closeBtn.onclick = () => this.hide();
    },

    async start() {
        const overlay = document.getElementById('gameOverlay');
        const content = document.getElementById('gameContent');
        if (!overlay || !content) return;

        overlay.style.display = 'flex';
        content.innerHTML = '<div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%;"><div class="spinner"></div><p style="margin-top:20px;">Preparing questions...</p></div>';

        const success = await this.prepareQuestions();
        if (!success) {
            content.innerHTML = '<div style="text-align:center; padding:40px;"><h3>Not enough data to start a game.</h3><p>Try searching for some words first or add words to your favorites.</p><button class="game-check-btn" onclick="GameManager.hide()" style="margin-top:20px;">Go Back</button></div>';
            return;
        }

        this.state.currentIndex = 0;
        this.state.score = 0;
        this.state.wrongQuestions = [];
        this.state.isReviewingWrong = false;
        this.state.totalQuestions = this.state.questions.length;

        this.renderCurrentQuestion();
    },

    hide() {
        const overlay = document.getElementById('gameOverlay');
        if (overlay) overlay.style.display = 'none';
        this.state.questions = [];
    },

    async prepareQuestions() {
        // Collect potential words from History, Favorites, and Current Search
        let words = [];
        if (window.StatsManager && window.StatsManager.stats.wordLastActive) {
            words = Object.keys(window.StatsManager.stats.wordLastActive);
        }

        // Add current word if exists
        const currentWord = document.querySelector('.word-title')?.innerText.toLowerCase();
        if (currentWord && !words.includes(currentWord)) words.unshift(currentWord);

        // Filter and shuffle
        words = words.filter(w => w.length > 2);
        if (words.length < 3) {
            // Add some default academic words if not enough
        if (window.AcademicList && window.AcademicList.words) {
            words = words.concat(window.AcademicList.words.slice(0, 20));
        }

        words = this.shuffle([...new Set(words)]).slice(0, 10);
        if (words.length === 0) return false;

        this.state.questions = [];

        for (const word of words) {
            try {
                const data = await APIClient.fetchWordData(word);
                if (!data || data.error) continue;

                const questionType = Math.random() > 0.5 ? 'sentence' : 'word';

                if (questionType === 'word') {
                    const q = await this.createWordQuestion(word, data);
                    if (q) this.state.questions.push(q);
                } else {
                    const q = await this.createSentenceQuestion(word, data);
                    if (q) this.state.questions.push(q);
                    else {
                        const wq = await this.createWordQuestion(word, data);
                        if (wq) this.state.questions.push(wq);
                    }
                }

                if (this.state.questions.length >= 10) break;
            } catch (e) {
                console.error("Error preparing question for", word, e);
            }
        }

        return this.state.questions.length > 0;
    },

    async createWordQuestion(word, data) {
        const targetLang = TranslationManager.targetLanguage || 'tr';
        const translation = await this.getTranslation(word, targetLang);
        if (!translation) return null;

        let distractors = [];
        if (window.AcademicList && window.AcademicList.words) {
            const randomWords = this.shuffle([...window.AcademicList.words]).slice(0, 10);
            for (const rw of randomWords) {
                if (rw === word) continue;
                const trans = await this.getTranslation(rw, targetLang);
                if (trans && trans.toLowerCase() !== translation.toLowerCase()) distractors.push(trans);
                if (distractors.length >= 3) break;
            }
        }

        return {
            type: 'choice',
            question: `How do you say "${word}" in ${this.getLangName(targetLang)}?`,
            srcText: word,
            correctAnswer: translation,
            choices: this.shuffle([translation, ...distractors]),
            audioText: word
        };
    },

    async createSentenceQuestion(word, data) {
        // Find an example sentence
        let example = "";
        const dict = data.dictionary || [];
        for (const entry of dict) {
            if (entry.shortdef) {
                // Try to find an example in sense
                const senses = entry.def?.[0]?.sseq?.[0]?.[0]?.[1]?.dt || [];
                const vis = senses.find(s => s[0] === 'vis');
                if (vis && vis[1]?.[0]?.t) {
                    example = vis[1][0].t.replace(/\{bc\}|\{it\}|\{\/it\}|\{a_link\||\}/g, '').trim();
                    break;
                }
            }
        }

        if (!example) return null;

        const targetLang = TranslationManager.targetLanguage || 'tr';
        const translation = await this.getTranslation(example, targetLang);
        if (!translation) return null;

        // For Duolingo style, we want to translate TO English (usually) or FROM English.
        // Let's do: Show target language sentence, build English sentence.

        const correctWords = example.split(/\s+/).map(w => w.replace(/[.,!?;:]/g, ''));
        let distractors = ["the", "a", "is", "are", "have", "to", "of", "and", "in"].filter(w => !correctWords.includes(w));
        distractors = this.shuffle(distractors).slice(0, 3);

        return {
            type: 'duolingo',
            question: `Translate this sentence to English`,
            srcText: translation,
            correctAnswer: example,
            correctWords: correctWords,
            chips: this.shuffle([...correctWords, ...distractors]),
            audioText: example
        };
    },

    async getTranslation(text, lang) {
        try {
            const url = `/api/translate?lang=${lang}&text=${encodeURIComponent(text)}`;
            const response = await fetch(url);
            const data = await response.json();
            let translatedText = "";
            if (data && data[0]) {
                data[0].forEach(part => { if (part[0]) translatedText += part[0]; });
            }
            return translatedText.trim();
        } catch (e) {
            return null;
        }
    },

    renderCurrentQuestion() {
        const questions = this.state.isReviewingWrong ? this.state.wrongQuestions : this.state.questions;
        const q = questions[this.state.currentIndex];
        if (!q) {
            this.showResults();
            return;
        }

        const content = document.getElementById('gameContent');
        const progressBar = document.getElementById('gameProgressBar');

        let progress = 0;
        if (this.state.isReviewingWrong) {
             progress = (this.state.questions.length / (this.state.questions.length + this.state.wrongQuestions.length)) * 100;
        } else {
             progress = (this.state.currentIndex / this.state.totalQuestions) * 100;
        }
        progressBar.style.width = `${progress}%`;

        if (q.type === 'choice') {
            this.renderChoiceQuestion(q, content);
        } else if (q.type === 'duolingo') {
            this.renderDuolingoQuestion(q, content);
        }
    },

    renderChoiceQuestion(q, container) {
        container.innerHTML = `
            <h2 class="game-question-title">${q.question}</h2>
            <div class="game-src-text-container">
                <div class="game-src-text">${q.srcText}</div>
                ${q.audioText ? `<button class="tts-btn" onclick="TTSManager.play('${q.audioText.replace(/'/g, "\\'")}')" style="background:none; border:none; cursor:pointer; color:var(--accent);">
                    <svg xmlns="http://www.w3.org/2000/svg" height="32px" viewBox="0 -960 960 960" width="32px" fill="currentColor"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z"/></svg>
                </button>` : ''}
            </div>
            <div class="game-choices">
                ${q.choices.map((c, i) => `
                    <div class="game-choice" onclick="GameManager.selectChoice(this, '${c.replace(/'/g, "\\'")}')">
                        <span class="choice-index">${i + 1}</span>
                        <span class="choice-text">${c}</span>
                    </div>
                `).join('')}
            </div>
            <div class="game-footer">
                <button class="game-check-btn disabled" id="checkBtn" onclick="GameManager.checkAnswer()">CHECK</button>
            </div>
            <div id="gameFeedback" class="game-feedback">
                <div class="game-feedback-title" id="feedbackTitle"></div>
                <div id="feedbackText"></div>
                <button class="game-check-btn" id="nextBtn" style="margin-top:20px; width:100%;" onclick="GameManager.nextQuestion()">CONTINUE</button>
            </div>
        `;
        this.state.selectedAnswer = null;
    },

    renderDuolingoQuestion(q, container) {
        container.innerHTML = `
            <h2 class="game-question-title">${q.question}</h2>
            <div class="game-src-text-container">
                <div class="game-src-text">${q.srcText}</div>
            </div>
            <div class="game-target-area" id="targetArea"></div>
            <div class="game-chip-container" id="chipContainer">
                ${q.chips.map(w => `<div class="word-chip" onclick="GameManager.toggleChip(this)">${w}</div>`).join('')}
            </div>
            <div class="game-footer">
                <button class="game-check-btn disabled" id="checkBtn" onclick="GameManager.checkAnswer()">CHECK</button>
            </div>
            <div id="gameFeedback" class="game-feedback">
                <div class="game-feedback-title" id="feedbackTitle"></div>
                <div id="feedbackText" style="margin-bottom:10px;"></div>
                ${q.audioText ? `<button class="tts-btn" onclick="TTSManager.play('${q.audioText.replace(/'/g, "\\'")}')" style="background:none; border:none; cursor:pointer; color:inherit; display:flex; align-items:center; gap:5px; margin-bottom:15px; font-weight:bold;">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z"/></svg>
                    Listen to English
                </button>` : ''}
                <button class="game-check-btn" id="nextBtn" style="width:100%;" onclick="GameManager.nextQuestion()">CONTINUE</button>
            </div>
        `;
        this.state.selectedAnswer = [];
    },

    selectChoice(el, val) {
        document.querySelectorAll('.game-choice').forEach(c => c.classList.remove('selected'));
        el.classList.add('selected');
        this.state.selectedAnswer = val;
        document.getElementById('checkBtn').classList.remove('disabled');
    },

    toggleChip(el) {
        if (el.classList.contains('used')) {
            // Remove from target
            const text = el.innerText;
            el.classList.remove('used');
            const targetArea = document.getElementById('targetArea');
            const chips = targetArea.querySelectorAll('.word-chip');
            for (let c of chips) {
                if (c.innerText === text) {
                    c.remove();
                    break;
                }
            }
        } else {
            // Add to target
            el.classList.add('used');
            const targetArea = document.getElementById('targetArea');
            const newChip = document.createElement('div');
            newChip.className = 'word-chip';
            newChip.innerText = el.innerText;
            newChip.onclick = () => {
                newChip.remove();
                el.classList.remove('used');
                this.updateCheckBtn();
            };
            targetArea.appendChild(newChip);
        }
        this.updateCheckBtn();
    },

    updateCheckBtn() {
        const targetArea = document.getElementById('targetArea');
        const checkBtn = document.getElementById('checkBtn');
        if (targetArea.children.length > 0) {
            checkBtn.classList.remove('disabled');
        } else {
            checkBtn.classList.add('disabled');
        }
    },

    checkAnswer() {
        const questions = this.state.isReviewingWrong ? this.state.wrongQuestions : this.state.questions;
        const q = questions[this.state.currentIndex];
        let isCorrect = false;

        if (q.type === 'choice') {
            isCorrect = this.state.selectedAnswer === q.correctAnswer;
        } else if (q.type === 'duolingo') {
            const targetArea = document.getElementById('targetArea');
            const userWords = Array.from(targetArea.children).map(c => c.innerText.toLowerCase());
            const correctWords = q.correctWords.map(w => w.toLowerCase());
            // Simplistic check: all words in order
            isCorrect = userWords.join(' ') === correctWords.join(' ');
        }

        const feedback = document.getElementById('gameFeedback');
        const title = document.getElementById('feedbackTitle');
        const text = document.getElementById('feedbackText');
        const nextBtn = document.getElementById('nextBtn');

        feedback.style.display = 'block';
        setTimeout(() => feedback.classList.add('show'), 10);

        if (isCorrect) {
            feedback.className = 'game-feedback correct show';
            title.innerText = 'Excellent!';
            text.innerText = '';
            this.state.score++;
        } else {
            feedback.className = 'game-feedback incorrect show';
            title.innerText = 'Correct Answer:';
            text.innerText = q.correctAnswer;
            nextBtn.classList.add('incorrect-btn');

            // Add to wrong questions if not already there
            if (!this.state.isReviewingWrong) {
                this.state.wrongQuestions.push(q);
            } else {
                // If reviewing and still wrong, it stays in wrongQuestions for later?
                // Actually Duolingo keeps it in the queue until correct.
                // Let's just keep it in the list to be tried again.
            }
        }

        if (q.audioText && isCorrect) {
            TTSManager.play(q.audioText);
        }
    },

    nextQuestion() {
        const feedback = document.getElementById('gameFeedback');
        feedback.classList.remove('show');
        setTimeout(() => {
            feedback.style.display = 'none';
            this.state.currentIndex++;

            const questions = this.state.isReviewingWrong ? this.state.wrongQuestions : this.state.questions;

            if (this.state.currentIndex >= questions.length) {
                if (!this.state.isReviewingWrong && this.state.wrongQuestions.length > 0) {
                    this.state.isReviewingWrong = true;
                    this.state.currentIndex = 0;
                    this.renderCurrentQuestion();
                } else if (this.state.isReviewingWrong && this.state.wrongQuestions.length > 0) {
                    // Filter out corrected ones?
                    // For simplicity, let's just finish if we reached the end of review
                    this.showResults();
                } else {
                    this.showResults();
                }
            } else {
                this.renderCurrentQuestion();
            }
        }, 300);
    },

    showResults() {
        const content = document.getElementById('gameContent');
        const progressBar = document.getElementById('gameProgressBar');
        progressBar.style.width = '100%';

        content.innerHTML = `
            <div class="game-results">
                <h1 class="game-results-title">Lesson Complete!</h1>
                <div class="game-results-stats">
                    <div class="game-stat-card">
                        <div class="game-stat-value">${this.state.score}</div>
                        <div class="game-stat-label">Correct</div>
                    </div>
                    <div class="game-stat-card">
                        <div class="game-stat-value">${Math.round((this.state.score / this.state.totalQuestions) * 100)}%</div>
                        <div class="game-stat-label">Accuracy</div>
                    </div>
                </div>
                <button class="game-check-btn" onclick="GameManager.hide()" style="width:100%;">FINISH</button>
            </div>
        `;
    },

    shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    },

    getLangName(code) {
        const lang = TranslationManager.languages.find(l => l.code === code);
        return lang ? lang.name : code;
    }
};

window.addEventListener('DOMContentLoaded', () => GameManager.init());
