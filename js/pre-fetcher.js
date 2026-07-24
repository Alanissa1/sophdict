window.PreFetcher = {
    queue: new Set(),
    activeWorkers: 0,
    totalFetched: 0,
    maxWorkers: window.CONFIG?.MAX_CONCURRENT_PREFETCH || 3,
    sessionID: 0,

    // Batch specific state
    isBatchActive: false,
    batchTotal: 0,
    batchCurrent: 0,

    reset() {
        this.sessionID++;
        this.queue.clear();
        this.totalFetched = 0;
        this.isBatchActive = false;
        console.log('[PreFetcher] Stopped all background fetching.');
    },

    addToQueue(words) {
        if (!Array.isArray(words)) return;

        const limit = window.CONFIG?.PREFETCH_LIMIT || 1;
        if (this.totalFetched >= limit) return;

        let addedCount = 0;
        words.forEach(word => {
            const cleanWord = word.toLowerCase().trim();
            if (cleanWord && !this.queue.has(cleanWord) && (this.totalFetched + addedCount < limit)) {
                this.queue.add(cleanWord);
                addedCount++;
            }
        });

        if (addedCount > 0) {
            console.log(`[PreFetcher] Added ${addedCount} words. Queue size: ${this.queue.size}`);
            this.startWorkers();
        }
    },

    startWorkers() {
        const currentSession = this.sessionID;
        while (this.activeWorkers < this.maxWorkers && this.queue.size > 0) {
            this.activeWorkers++;
            this.runWorker(currentSession);
        }
    },

    async runWorker(currentSession) {
        const limit = window.CONFIG?.PREFETCH_LIMIT || 1;

        while (this.queue.size > 0 && this.sessionID === currentSession) {
            if (this.totalFetched >= limit && !this.isBatchActive) {
                this.queue.clear();
                break;
            }

            const word = Array.from(this.queue)[0];
            if (!word) break;
            this.queue.delete(word);

            try {
                const exists = await DBManager.getWord(word);
                if (!exists) {
                    console.log(`[PreFetcher] Worker processing: ${word}`);
                    await APIClient.fetchWordData(word);

                    if (this.sessionID !== currentSession) return;

                    this.totalFetched++;
                    this.updatePageStatus();
                    await new Promise(r => setTimeout(r, 1000));
                }
            } catch (e) {
                console.warn(`[PreFetcher] Skip: ${word}`, e);
            }
        }

        this.activeWorkers--;
    },

    showInput() {
        const container = document.getElementById('fetch-ui-container');
        const statusEl = document.getElementById('page-fetch-status');
        if (!container || !statusEl) return;

        // Instant calculation from the meter text (e.g., "10 / 300")
        const statusText = statusEl.innerText.trim();
        if (!statusText) return;

        const parts = statusText.split('/').map(p => parseInt(p.trim()));
        if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1])) return;

        const missingCount = parts[1] - parts[0];
        if (missingCount <= 0) {
            alert("All words from tags are already downloaded.");
            return;
        }

        container.innerHTML = `
            <div style="position: absolute; bottom: 100%; right: 0; background: var(--card-bg); border: 1px solid var(--border-color); padding: 8px 12px; border-radius: 8px; box-shadow: var(--shadow); white-space: nowrap; margin-bottom: 8px; font-size: 12px; color: var(--text-sub); z-index: 10;">
                Type how many words to store offline
            </div>
            <div class="fetch-input-wrapper">
                <input type="number" class="fetch-input" id="fetch-qty-input"
                       value="${missingCount}" min="1" max="${missingCount}"
                       placeholder="Qty">
                <button class="fetch-search-btn" id="fetch-start-btn" aria-label="Start Download">
                    <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                </button>
            </div>
        `;
        const input = document.getElementById('fetch-qty-input');
        const startBtn = document.getElementById('fetch-start-btn');
        input.focus();

        const triggerStart = async () => {
            const count = parseInt(input.value);
            if (!isNaN(count) && count > 0) {
                // Expense deferred until user actually clicks download
                const missing = await this.getMissingWordsFromTags();
                this.startBatch(count, missing);
            }
        };

        startBtn.onclick = triggerStart;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                triggerStart();
            } else if (e.key === 'Escape') {
                this.resetUI();
            }
        };
        // Close if clicked outside
        const outsideClick = (e) => {
            if (!container.contains(e.target)) {
                this.resetUI();
                document.removeEventListener('click', outsideClick);
            }
        };
        setTimeout(() => document.addEventListener('click', outsideClick), 100);
    },

    async getMissingWordsFromTags() {
        const tagElements = document.querySelectorAll('.tag');
        const uniqueWords = new Set();
        tagElements.forEach(el => {
            const w = el.dataset.word || el.innerText;
            if (w) uniqueWords.add(w.toLowerCase().trim());
        });

        const missing = [];
        for (const word of uniqueWords) {
            const exists = await DBManager.getWord(word);
            if (!exists) missing.push(word);
        }
        return missing;
    },

    async startBatch(count, missingList) {
        this.isBatchActive = true;
        this.batchTotal = Math.min(count, missingList.length);
        this.batchCurrent = 0;
        const toFetch = missingList.slice(0, this.batchTotal);
        const currentSession = this.sessionID;

        this.updateBatchUI();

        for (const word of toFetch) {
            if (!this.isBatchActive || this.sessionID !== currentSession) break;

            try {
                const exists = await DBManager.getWord(word);
                if (!exists) {
                    await APIClient.fetchWordData(word);
                }
            } catch (e) { console.error("Batch fetch error", e); }

            if (this.sessionID !== currentSession) return;

            this.batchCurrent++;
            this.updateBatchUI();
            this.updatePageStatus();

            await new Promise(r => setTimeout(r, 500));
        }

        if (this.sessionID === currentSession) this.stopBatch();
    },

    stopBatch() {
        this.isBatchActive = false;
        setTimeout(() => this.resetUI(), 1000); // Small delay to show final progress
    },

    updateBatchUI() {
        const container = document.getElementById('fetch-ui-container');
        if (!container) return;

        container.innerHTML = `
            <div class="fetch-loading-icon" onclick="PreFetcher.stopBatch()" title="Stop"></div>
        `;
    },

    resetUI() {
        const container = document.getElementById('fetch-ui-container');
        if (!container) return;

        container.innerHTML = `
            <button class="icon-btn fetch-btn" title="Download all words from tags" onclick="PreFetcher.showInput()">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
            </button>
        `;
    },

    async updatePageStatus() {
        const statusEl = document.getElementById('page-fetch-status');
        if (!statusEl) return;

        const tagElements = document.querySelectorAll('.tag');
        const uniqueWords = new Set();
        tagElements.forEach(el => {
            const w = el.dataset.word || el.innerText;
            if (w) uniqueWords.add(w.toLowerCase().trim());
        });

        if (uniqueWords.size === 0) {
            statusEl.innerText = "";
            return;
        }

        let cachedCount = 0;
        for (const word of uniqueWords) {
            const exists = await DBManager.getWord(word);
            if (exists) cachedCount++;
        }

        statusEl.innerText = `${cachedCount} / ${uniqueWords.size}`;
    }
};
