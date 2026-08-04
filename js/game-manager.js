window.GameManager = {
    examples: [],
    fullPool: [],
    usedIndices: new Set(),
    currentIdx: 0,
    userWords: [],
    correctWords: [],
    score: 0,
    targetLang: 'tr',
    currentMode: 'to-translation', // 'to-translation' or 'to-example'

    init() {
        this.targetLang = localStorage.getItem('translation_target_lang') || 'tr';
        this.createOverlay();
        window.addEventListener('popstate', () => this.handleRoute());

        // Wait for AppSearch to be ready before handling the initial route
        if (window.AppSearch) {
            this.handleRoute();
        } else {
            const check = setInterval(() => {
                if (window.AppSearch) {
                    clearInterval(check);
                    this.handleRoute();
                }
            }, 50);
        }
    },

    handleRoute() {
        const path = window.location.pathname;
        const match = path.match(/^\/([^/]+)\/cardsgame\/?$/);
        if (match) {
            const word = decodeURIComponent(match[1]);
            const currentData = window._lastData;

            if (currentData && currentData.word === word) {
                this.start(currentData, this.currentMode, false, true);
            } else {
                // Fetch data first using AppSearch to ensure UI states are set
                if (window.AppSearch) {
                    window.AppSearch(word, true, true).then(success => {
                        if (success) {
                            this.start(window._lastData, this.currentMode, false, true);
                        }
                    });
                }
            }
        } else {
            if (document.getElementById('gameOverlay')?.style.display === 'flex') {
                this.close(true);
            }
        }
    },

    createOverlay() {
        if (document.getElementById('gameOverlay')) return;
        const overlay = document.createElement('div');
        overlay.id = 'gameOverlay';
        overlay.className = 'game-overlay';
        document.body.appendChild(overlay);
    },

    async start(data, mode = 'to-translation', isAppend = false, isHistoryNav = false) {
        // 1. Determine the active translation language (only if not appending)
        if (!isAppend) {
            let activeLang = null;
            if (window.TranslationManager && window.TranslationManager.isEnabled) {
                activeLang = window.TranslationManager.targetLanguage;
            }

            if (!activeLang) {
                const browserLang = (navigator.language || navigator.userLanguage).split('-')[0];
                activeLang = browserLang;
            }

            if (activeLang === 'en') {
                alert("Practice mode is only available when translating to a non-English language.");
                return;
            }

            this.targetLang = activeLang;
            this.currentMode = mode;
            this.usedIndices = new Set();
        }

        if (!isAppend && !isHistoryNav) {
            const word = data?.word || localStorage.getItem('lastWord');
            if (word) {
                window.history.pushState({ game: true, word, mode }, "", `/${encodeURIComponent(word)}/cardsgame`);
            }
        }

        const loader = document.getElementById('loader');
        const loaderText = document.getElementById('loaderText');
        if (loader) {
            loaderText.innerText = isAppend ? "Loading more..." : "Preparing practice...";
            loader.style.display = 'flex';
        }

        try {
            if (!isAppend) {
                this.fullPool = await this.preparePool(data);
                if (this.fullPool.length === 0) {
                    alert("Not enough examples found to practice! Try searching for common words first.");
                    return;
                }
            }

            // Pick 10 unused examples
            const available = this.fullPool.filter((_, i) => !this.usedIndices.has(i));
            if (available.length === 0) {
                alert("No more new examples found for this session!");
                if (isAppend) return;
            }

            this.examples = this.shuffle(available).slice(0, 10);

            // Mark as used
            this.fullPool.forEach((item, i) => {
                if (this.examples.some(ex => ex.english === item.english)) {
                    this.usedIndices.add(i);
                }
            });

            this.currentIdx = 0;
            if (!isAppend) this.score = 0;

            document.getElementById('gameOverlay').style.display = 'flex';
            if (window.UIUtils) UIUtils.updateSharedDimmer();
            this.renderQuestion();
        } finally {
            if (loader) loader.style.display = 'none';
        }
    },

    async preparePool(data) {
        let allEnglishExamples = [];

        // 1. Get from current data (Dictionary and Thesaurus)
        if (data) {
            allEnglishExamples = this.extractExamples(data);
        }

        // 2. If less than 10, pull from history/stats to meet the requirement
        if (allEnglishExamples.length < 10) {
            const recentWords = Object.keys(window.StatsManager?.stats?.wordCounts || {})
                .filter(w => !data || w !== data.word)
                .sort((a,b) => (window.StatsManager.stats.wordLastActive[b] || 0) - (window.StatsManager.stats.wordLastActive[a] || 0));
        }

        // 3. Ensure we have translations (Prefetch if missing)
        const pool = [];
        // Limit to first 20 potential candidates to translate
        const candidates = allEnglishExamples.slice(0, 20);

        const translationPromises = candidates.map(async (eng) => {
            const trans = await this.getTranslation(eng);
            if (trans) {
                return {
                    english: eng,
                    translation: trans,
                    engWords: this.splitText(eng),
                    transWords: this.splitText(trans)
                };
            }
            return null;
        });

        const results = await Promise.all(translationPromises);
        return results.filter(r => r !== null);
    },

    extractExamples(data) {
        const examples = new Set();
        const word = data.word;
        if (data.dictionary) {
            data.dictionary.forEach(entry => {
                const vis = UIDictionary.extractVisFromEntry(entry);
                vis.forEach(v => {
                    if (v.t) {
                        const clean = UIUtils.cleanMWExample(v.t, word);
                        const stripped = UIUtils.stripTags(clean);
                        examples.add(stripped);
                    }
                });
            });
        }
        if (data.thesaurus) {
            data.thesaurus.forEach(entry => {
                if (entry.def) {
                    entry.def.forEach(def => {
                        if (def.sseq) {
                            def.sseq.forEach(sseq => {
                                sseq.forEach(node => {
                                    if (node[1] && node[1].dt) {
                                        const visNode = node[1].dt.find(i => i[0] === 'vis');
                                        if (visNode && visNode[1]) {
                                            visNode[1].forEach(v => {
                                                if (v.t) {
                                                    const clean = UIUtils.cleanMWExample(v.t, word);
                                                    const stripped = UIUtils.stripTags(clean);
                                                    examples.add(stripped);
                                                }
                                            });
                                        }
                                    }
                                });
                            });
                        }
                    });
                }
            });
        }
        return Array.from(examples);
    },

    async getTranslation(text) {
        const lang = this.targetLang;
        const cacheKey = `${lang}:${text}`;

        if (window.TranslationManager && window.TranslationManager.cache && window.TranslationManager.cache[cacheKey]) {
            return window.TranslationManager.cache[cacheKey];
        }

        const localCache = JSON.parse(localStorage.getItem('translation_cache') || '{}');
        if (localCache[cacheKey]) {
            if (window.TranslationManager) window.TranslationManager.cache[cacheKey] = localCache[cacheKey];
            return localCache[cacheKey];
        }

        try {
            const res = await fetch(`${CONFIG.TRANSLATE_API_URL}?lang=${lang}&text=${encodeURIComponent(text)}`);
            if (res.ok) {
                const data = await res.json();
                let translated = "";
                if (data && data[0]) {
                    data[0].forEach(part => { if (part[0]) translated += part[0]; });
                }
                if (translated) {
                    localCache[cacheKey] = translated;
                    localStorage.setItem('translation_cache', JSON.stringify(localCache));
                    if (window.TranslationManager) {
                        window.TranslationManager.cache[cacheKey] = translated;
                    }
                    return translated;
                }
            }
        } catch (e) {}
        return null;
    },

    splitText(text) {
        if (!text) return [];
        // DUOLINGO-STYLE: Preserve internal hyphens (cd-game) and apostrophes (don't)
        // Also strips horizontal ellipsis (…) and ensures result is an actual word
        return text.split(/\s+/)
            .filter(w => w.length > 0)
            .map(w => w.replace(/^[.,!?;:"'()[\]{}]+|[.,!?;:"'()[\]{}]+$/g, '').trim())
            .filter(w => w.length > 0);
            .map(w => w.replace(/^[.,!?;:"'()[\]{}\u2026]+|[.,!?;:"'()[\]{}\u2026]+$/g, '').trim())
            .filter(w => w.length > 0 && /[a-zA-Z0-9\u00C0-\u017F]/.test(w));
    },

    shuffle(array) {
        const newArr = [...array];
        for (let i = newArr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
        }
        return newArr;
    },

    renderQuestion() {
        const item = this.examples[this.currentIdx];
        const overlay = document.getElementById('gameOverlay');
        const progress = ((this.currentIdx) / this.examples.length) * 100;

        const isToTrans = this.currentMode === 'to-translation';
        const questionText = isToTrans ? UIUtils.cleanMWExample(item.english) : UIUtils.cleanMWExample(item.translation);
        this.correctWords = isToTrans ? item.transWords : item.engWords;

        this.userWords = [];
        const bankWords = this.shuffle([...this.correctWords]);

        // Detect RTL languages to fix backward sentence building
        const rtlLangs = ['ar', 'fa', 'he', 'ur'];
        const isRTL = rtlLangs.includes(this.targetLang);
        const questionDir = (!isToTrans && isRTL) ? 'rtl' : 'ltr';
        const answerDir = (isToTrans && isRTL) ? 'rtl' : 'ltr';

        overlay.innerHTML = `
            <div class="game-header">
                <div style="display:flex; flex-direction:column;">
                    <div style="font-weight:bold; color:var(--text-main);">Practice Mode</div>
                    <div style="font-size:1em; color:var(--text-sub);">
                        ${isToTrans ? 'English ➔ ' + this.targetLang.toUpperCase() : this.targetLang.toUpperCase() + ' ➔ English'}
                    </div>
                </div>
                <div style="display:flex; gap:10px; align-items:left;">
                    <button class="add-lang-btn" style="margin:0; padding:5px 10px; font-size:12px; border:1px solid var(--border-color); background:none; color:var(--text-main); cursor:pointer; border-radius:5px;" onclick="GameManager.toggleMode()">Switch Mode</button>
                    <button class="game-close-btn" onclick="GameManager.close()">&times;</button>
                </div>
            </div>
            <div class="game-progress-container">
                <div class="game-progress-bar" style="width: ${progress}%"></div>
            </div>
            <div class="game-content">
                <div class="game-question" dir="${questionDir}" style="display:flex; justify-content:center; align-items:left; text-align:center; margin: 0 0 5px 0;">
                    <span>${questionText}</span>
                </div>
                <div class="game-answer-area" id="gameAnswerArea" dir="${answerDir}"></div>
                <div class="game-word-bank" dir="${answerDir}">
                    ${bankWords.map((w, i) => {
                        const escapedW = w.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
                        return `<div class="game-word" onclick="GameManager.addWord('${escapedW}', this, ${i})">${w}</div>`;
                    }).join('')}
                </div>
            </div>
            <div class="game-footer">
                <div class="game-feedback" id="gameFeedback"></div>
                <div class="game-controls">
                    <button class="game-check-btn" id="gameCheckBtn" onclick="GameManager.check()" disabled>CHECK</button>
                </div>
            </div>
        `;

        // Integrate with the pre-existing TTSManager for questions
        if (window.TTSManager) {
            const qContainer = overlay.querySelector('.game-question');
            const ttsText = isToTrans ? item.english : item.translation;
            const ttsLang = isToTrans ? 'en' : this.targetLang;
            const ttsBtn = window.TTSManager.createButton(ttsText, "tts-btn", ttsLang);
            if (ttsBtn) {
                ttsBtn.style.marginLeft = "10px";
                ttsBtn.style.display = "inline-flex";
                ttsBtn.style.alignItems = "center";
                ttsBtn.style.cursor = "pointer";
                ttsBtn.style.verticalAlign = "middle";
                qContainer.appendChild(ttsBtn);
            }
        }
    },

    addWord(word, el, idx) {
        if (el.classList.contains('selected')) return;
        el.classList.add('selected');
        
        const answerArea = document.getElementById('gameAnswerArea');
        const wordEl = document.createElement('div');
        wordEl.className = 'game-word placed';
        wordEl.innerText = word;
        wordEl.dataset.idx = idx;
        wordEl.onclick = () => {
            el.classList.remove('selected');
            
            wordEl.remove();
            
            this.userWords = this.userWords.filter(w => w.idx !== idx);
            document.getElementById('gameCheckBtn').disabled = this.userWords.length === 0;
        };

        answerArea.appendChild(wordEl);
        this.userWords.push({ word, idx });
        document.getElementById('gameCheckBtn').disabled = false;
    },

    check() {
        const userStr = this.userWords.map(w => w.word.toLowerCase()).join(' ');
        const correctStr = this.correctWords.map(w => w.toLowerCase()).join(' ');

        const feedback = document.getElementById('gameFeedback');
        const checkBtn = document.getElementById('gameCheckBtn');

        const isToTrans = this.currentMode === 'to-translation';
        const item = this.examples[this.currentIdx];

        feedback.innerHTML = "";
        const textSpan = document.createElement('span');

        if (userStr === correctStr) {
            textSpan.innerText = "CORRECT!";
            feedback.className = "game-feedback correct";
            this.score++;
            checkBtn.innerText = "NEXT";
            checkBtn.style.background = "#4caf50";
            checkBtn.onclick = () => this.next();
        } else {
            textSpan.innerText = `WRONG! Correct: ${this.correctWords.join(' ')}`;
            feedback.className = "game-feedback wrong";
            checkBtn.innerText = "GOT IT";
            checkBtn.style.background = "#f44336";
            checkBtn.onclick = () => this.next();
        }
        feedback.appendChild(textSpan);

        // Integrate with TTSManager for correct sentence revelation
        if (window.TTSManager) {
            const ttsText = isToTrans ? item.translation : item.english;
            const ttsLang = isToTrans ? this.targetLang : 'en';
            const ttsBtn = window.TTSManager.createButton(ttsText, "tts-btn", ttsLang);
            if (ttsBtn) {
                ttsBtn.style.marginLeft = "10px";
                ttsBtn.style.display = "inline-flex";
                ttsBtn.style.alignItems = "center";
                ttsBtn.style.cursor = "pointer";
                ttsBtn.style.verticalAlign = "middle";
                feedback.appendChild(ttsBtn);
            }
        }
    },

    next() {
        this.currentIdx++;
        if (this.currentIdx < this.examples.length) {
            this.renderQuestion();
        } else {
            this.renderFinished();
        }
    },

    renderFinished() {
        const overlay = document.getElementById('gameOverlay');
        const hasMore = this.fullPool.length > this.usedIndices.size;

        overlay.innerHTML = `
            <div class="game-header">
                <button class="game-close-btn" onclick="GameManager.close()">&times;</button>
            </div>
            <div class="game-content" style="justify-content: center;">
                <div class="game-finished">
                    <h2 style="color:var(--text-main);">Practice Finished!</h2>
                    <div class="game-score">${this.score} / ${this.usedIndices.size}</div>
                    <div style="margin-bottom:30px; color:var(--text-sub);">Great job! You are improving your vocabulary.</div>
                </div>
            </div>
            <div class="game-footer">
                <div style="display:flex; flex-direction:column; gap:10px; width:100%;">
                    ${hasMore ? `<button class="game-check-btn" onclick="GameManager.start(null, '${this.currentMode}', true)">PRACTICE 10 MORE</button>` : ''}
                    <button class="game-check-btn" style="background:var(--bg-color); color:var(--text-main); border:1px solid var(--border-color);" onclick="GameManager.close()">RETURN TO DICTIONARY</button>
                </div>
            </div>
        `;
    },

    close(isHistoryNav = false) {
        document.getElementById('gameOverlay').style.display = 'none';
        if (window.UIUtils) UIUtils.updateSharedDimmer();
        if (!isHistoryNav) {
            const word = localStorage.getItem('lastWord');
            if (window.history.state?.game) {
                window.history.back();
            } else if (word) {
                window.history.pushState({ word }, "", `/${encodeURIComponent(word)}`);
            } else {
                window.history.pushState({}, "", "/");
            }
        }
    },

    toggleMode() {
        this.currentMode = this.currentMode === 'to-translation' ? 'to-example' : 'to-translation';
        this.renderQuestion();
    }
};

window.GameManager.init();

