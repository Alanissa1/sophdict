window.StatsManager = {
    stats: { totalTime: 0, wordCounts: {}, tagCounts: {}, wordTime: {}, tagTime: {}, wordLastActive: {}, tagLastActive: {}, ignoredWords: [], sessionStartTime: Date.now(), currentWord: null, currentWordStartTime: null, currentTag: null, currentTagStartTime: null },
    currentOpenSection: 'words',
    currentPage: 1,

    init() {
        this.load();
        window.addEventListener('beforeunload', () => this.stopAllTracking());
        window.addEventListener('pagehide', () => this.stopAllTracking());
        setInterval(() => this.save(), 30000);
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    },

    load() {
        const saved = localStorage.getItem('sophdict_stats_detailed');
        if (saved) { try { Object.assign(this.stats, JSON.parse(saved)); } catch (e) {} }
    },

    save() {
        this.updateActiveTimers();
        localStorage.setItem('sophdict_stats_detailed', JSON.stringify({ totalTime: this.stats.totalTime, wordCounts: this.stats.wordCounts, tagCounts: this.stats.tagCounts, wordTime: this.stats.wordTime, tagTime: this.stats.tagTime, wordLastActive: this.stats.wordLastActive, tagLastActive: this.stats.tagLastActive, ignoredWords: this.stats.ignoredWords }));
    },

    updateActiveTimers() {
        const now = Date.now();
        this.stats.totalTime += Math.floor((now - this.stats.sessionStartTime) / 1000);
        this.stats.sessionStartTime = now;
        if (this.stats.currentWord && this.stats.currentWordStartTime) { this.stats.wordTime[this.stats.currentWord] = (this.stats.wordTime[this.stats.currentWord] || 0) + Math.floor((now - this.stats.currentWordStartTime) / 1000); this.stats.currentWordStartTime = now; }
        if (this.stats.currentTag && this.stats.currentTagStartTime) { this.stats.tagTime[this.stats.currentTag] = (this.stats.tagTime[this.stats.currentTag] || 0) + Math.floor((now - this.stats.currentTagStartTime) / 1000); this.stats.currentTagStartTime = now; }
    },

    stopAllTracking() { this.save(); this.stats.currentWord = null; this.stats.currentTag = null; },
    recordSearch(word) { if (!word) return; const w = word.toLowerCase().trim(); this.stats.wordCounts[w] = (this.stats.wordCounts[w] || 0) + 1; this.stats.wordLastActive[w] = Date.now(); this.updateActiveTimers(); this.stats.currentWord = w; this.stats.currentWordStartTime = Date.now(); const idx = this.stats.ignoredWords.indexOf(w); if (idx > -1) this.stats.ignoredWords.splice(idx, 1); this.save(); },
    recordTagOpen(tag) { if (!tag) return; const t = tag.toLowerCase().trim(); this.stats.tagCounts[t] = (this.stats.tagCounts[t] || 0) + 1; this.stats.tagLastActive[t] = Date.now(); this.updateActiveTimers(); this.stats.currentTag = t; this.stats.currentTagStartTime = Date.now(); this.save(); },
    recordTagClose() { this.updateActiveTimers(); this.stats.currentTag = null; this.save(); },

    getFormattedTime(s) { if (!s || s <= 0) return "0s"; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sc = s % 60; return h > 0 ? `${h}h ${m}m` : (m > 0 ? `${m}m ${sc}s` : `${sc}s`); },
    getTotalTimeDisplay() { const total = this.stats.totalTime + Math.floor((Date.now() - this.stats.sessionStartTime) / 1000); const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60); return h > 0 ? `${h}h ${m}m` : `${m}m`; },

    handleRoute() {
        const path = window.location.pathname;
        if (path.startsWith('/statistics_page')) {
            const parts = path.split('/');
            const idx = parts.indexOf('statistics_page');
            const page = parseInt(parts[idx + 1]) || 1;
            this.render(page);
        }
    },

    open(page = 1) {
        const path = `/statistics_page/${page}`;
        window.history.pushState({ stats: true, page }, "", path);
        this.render(page);
    },

    togglePanel() {
        if (window.location.pathname.startsWith('/statistics_page')) {
            window.AppClearSearch();
        } else {
            this.open(1);
        }
    },

    hide(isSilent = false) {
        if (window.location.pathname.startsWith('/statistics_page') && !isSilent) {
            window.AppClearSearch();
        }
    },

    render(page = 1) {
        const container = document.getElementById('results-container');
        if (!container) return;
        this.currentPage = page;
        this.updateActiveTimers();

        document.body.classList.remove('home-state');
        if (window.RestoreSearchUI) window.RestoreSearchUI();

        const words = Object.entries(this.stats.wordCounts)
            .filter(([w]) => !this.stats.ignoredWords.includes(w))
            .sort((a, b) => b[1] - a[1]);
        const tags = Object.entries(this.stats.tagCounts)
            .sort((a, b) => b[1] - a[1]);

        const items = this.currentOpenSection === 'words' ? words : tags;
        const perPage = 20;
        const totalPages = Math.ceil(items.length / perPage);
        const pageItems = items.slice((page - 1) * perPage, page * perPage);

        const trophyIcon = `<div class="prize-icon-container"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120v-80h160v-124q-49-11-87.5-41.5T296-442q-75-9-125.5-61T120-630v-90q0-33 23.5-56.5T200-800h120v-40h320v40h120q33 0 56.5 23.5T840-720v90q0 75-50.5 127T664-442q-18 46-56.5 76.5T520-324v124h160v80H280Zm0-408v-192H200v90q0 42 31 71t69 31Zm400 0q38 0 69-31t31-71v-90h-80v192ZM480-400q58 0 99-41t41-99v-180H340v180q0 58 41 99t99 41Z"/></svg></div>`;

        let html = `
            <div class="list-page stats-page" style="padding: 20px 0;">
                <div class="stats-header" style="padding: 0; margin-bottom: 20px;">
                    <h2 style="margin: 0; color: var(--text-main); font-weight: 500;">Usage Statistics</h2>
                </div>

                <div class="stat-card" style="width:100%; margin-bottom:25px; box-sizing: border-box;">
                    <div class="stat-info-group">
                        <span class="stat-value">${this.getTotalTimeDisplay()}</span>
                        <span class="stat-label">Total Time Spent</span>
                    </div>
                    ${trophyIcon}
                </div>

                <div class="stats-tabs" style="display: flex; gap: 10px; margin-bottom: 20px;">
                    <button class="page-btn ${this.currentOpenSection === 'words' ? 'active' : ''}" onclick="StatsManager.setSection('words')" style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid ${this.currentOpenSection === 'words' ? '#e1364f' : 'var(--border-color)'}; background: ${this.currentOpenSection === 'words' ? '#e1364f' : 'var(--card-bg)'}; color: ${this.currentOpenSection === 'words' ? '#fff' : 'var(--text-main)'}; cursor: pointer;">Words (${words.length})</button>
                    <button class="page-btn ${this.currentOpenSection === 'tags' ? 'active' : ''}" onclick="StatsManager.setSection('tags')" style="flex: 1; padding: 10px; border-radius: 12px; border: 1px solid ${this.currentOpenSection === 'tags' ? '#e1364f' : 'var(--border-color)'}; background: ${this.currentOpenSection === 'tags' ? '#e1364f' : 'var(--card-bg)'}; color: ${this.currentOpenSection === 'tags' ? '#fff' : 'var(--text-main)'}; cursor: pointer;">Tags (${tags.length})</button>
                </div>

                ${this.renderPagination(page, totalPages)}

                <div class="stats-list" style="display: flex; flex-direction: column; gap: 10px; margin-top: 20px;">
                    ${pageItems.map(([item, count]) => {
                        const time = this.currentOpenSection === 'words' ? this.stats.wordTime[item] : this.stats.tagTime[item];
                        const onClick = this.currentOpenSection === 'words' ? `window.AppSearch('${UIUtils.escapeJS(item)}');` : `window.ModalManager.show('${UIUtils.escapeJS(item)}');`;
                        const onRemove = this.currentOpenSection === 'words' ? `window.promptHomeRemoval(this, '${UIUtils.escapeJS(item)}', 'word', event)` : `window.promptHomeRemoval(this, '${UIUtils.escapeJS(item)}', 'tag', event)`;
                        return `
                            <div class="history-list-item" onclick="${onClick}" style="cursor: pointer; padding: 12px 15px; background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 15px;">
                                <div class="history-word-info">
                                    <span style="font-weight:600; color: var(--text-main);">${item}</span>
                                    <span class="history-word-count" style="color: var(--text-sub);">(${count}x, ${this.getFormattedTime(time)})</span>
                                </div>
                                <button class="remove-history-btn" onclick="${onRemove}">&times;</button>
                            </div>
                        `;
                    }).join('')}
                    ${pageItems.length === 0 ? `<div style="text-align: center; color: var(--text-sub); padding: 40px 0;">No items found in this section.</div>` : ''}
                </div>

                <button class="reset-stats-btn" onclick="StatsManager.showResetConfirm()" style="margin: 40px 0 20px 0; width: 100%;">Reset All Statistics</button>

                <div id="stats-confirm-overlay" style="display:none; position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:10000; flex-direction:column; justify-content:center; align-items:center; padding:20px; text-align:center; backdrop-filter: blur(5px);">
                    <div style="color:white; margin-bottom:20px; font-weight:bold; font-size: 18px;">Reset all usage statistics? This cannot be undone.</div>
                    <div style="display:flex; gap:15px; width:100%; max-width: 400px;">
                        <button class="reset-stats-btn" style="flex:1; background:#ff4b6b; margin:0; border: none; color: white;" onclick="StatsManager.resetAll()">Yes, Reset</button>
                        <button class="page-btn" style="flex:1; border-color:white; color:white; margin:0; background: transparent;" onclick="StatsManager.hideResetConfirm()">Cancel</button>
                    </div>
                </div>
            </div>
        `;

        container.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'instant' });
    },

    setSection(s) {
        this.currentOpenSection = s;
        this.open(1);
    },

    renderPagination(current, total) {
        if (total <= 1) return '';
        let html = `<div class="pagination" style="display: flex; align-items: center; justify-content: center; gap: 10px; margin-bottom: 10px; flex-wrap: wrap;">`;

        if (current > 1) {
            html += `<button class="page-btn" onclick="StatsManager.open(${current - 1})" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-main); cursor: pointer;">Before</button>`;
        }
        const range = 2;
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - range && i <= current + range)) {
                let activeColor = '#e1364f';
                let textColor = '#fff';
                const isActive = i === current;
                html += `<button class="page-btn ${isActive ? 'active' : ''}" onclick="StatsManager.open(${i})" style="padding: 8px 12px; border-radius: 8px; border: 1px solid ${isActive ? activeColor : 'var(--border-color)'}; background: ${isActive ? activeColor : 'var(--card-bg)'}; color: ${isActive ? textColor : 'var(--text-main)'}; cursor: pointer;">${i}</button>`;
            } else if (i === current - range - 1 || i === current + range + 1) {
                html += `<span style="color: var(--text-sub);">...</span>`;
            }
        }

        if (current < total) {
            html += `<button class="page-btn" onclick="StatsManager.open(${current + 1})" style="padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-main); cursor: pointer;">Next</button>`;
        }

        html += `</div>`;
        return html;
    },

    removeWord(w, e) { if (e) e.stopPropagation(); if (!this.stats.ignoredWords.includes(w)) { this.stats.ignoredWords.push(w); this.save(); this.render(this.currentPage); if (window.renderHomeLists) window.renderHomeLists(); } },
    removeTag(t, e) { if (e) e.stopPropagation(); delete this.stats.tagCounts[t]; delete this.stats.tagTime[t]; delete this.stats.tagLastActive[t]; this.save(); this.render(this.currentPage); if (window.renderHomeLists) window.renderHomeLists(); },
    showResetConfirm() { const o = document.getElementById('stats-confirm-overlay'); if (o) o.style.display = 'flex'; },
    hideResetConfirm() { const o = document.getElementById('stats-confirm-overlay'); if (o) o.style.display = 'none'; },
    resetAll() { localStorage.removeItem('sophdict_stats_detailed'); this.stats = { totalTime: 0, wordCounts: {}, tagCounts: {}, wordTime: {}, tagTime: {}, wordLastActive: {}, tagLastActive: {}, ignoredWords: [], sessionStartTime: Date.now(), currentWord: null, currentWordStartTime: null, currentTag: null, currentTagStartTime: null }; this.hideResetConfirm(); if (window.location.pathname.startsWith('/statistics_page')) this.render(1); if (window.renderHomeLists) window.renderHomeLists(); }
};
StatsManager.init();
