window.StatsManager = {
    stats: { totalTime: 0, wordCounts: {}, tagCounts: {}, wordTime: {}, tagTime: {}, wordLastActive: {}, tagLastActive: {}, ignoredWords: [], sessionStartTime: Date.now(), currentWord: null, currentWordStartTime: null, currentTag: null, currentTagStartTime: null },
    currentOpenSection: null,

    init() {
        this.load(); this.createPanel();
        window.addEventListener('beforeunload', () => this.stopAllTracking());
        window.addEventListener('pagehide', () => this.stopAllTracking());
        setInterval(() => this.save(), 30000);
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

    createPanel() { const p = document.createElement('div'); p.id = 'statsPanel'; document.body.appendChild(p); },

    lastTriggerElement: null,

    togglePanel() {
        const panel = document.getElementById('statsPanel'), dimmer = document.getElementById('microDimmer');
        if (!panel || !dimmer) return;

        if (panel.style.display === 'flex') {
            panel.style.display = 'none';
            if (window.ScrollFixer) window.ScrollFixer.restore();
            UIUtils.updateSharedDimmer();
            if (this.lastTriggerElement) this.lastTriggerElement.focus({ preventScroll: true });
        } else {
            this.lastTriggerElement = document.activeElement;
            this.currentOpenSection = null;
            if (window.ScrollFixer) window.ScrollFixer.save();
            this.render();
            panel.style.display = 'flex';
            UIUtils.updateSharedDimmer();
            UIUtils.setupQuickClose(dimmer);
        }
    },

    toggleSection(s) { this.currentOpenSection = (this.currentOpenSection === s ? null : s); this.render(); },

    render() {
        const panel = document.getElementById('statsPanel'); if (!panel) return; this.updateActiveTimers();
        const words = Object.entries(this.stats.wordCounts).filter(([w]) => !this.stats.ignoredWords.includes(w)).sort((a, b) => (this.stats.wordLastActive[b[0]] || 0) - (this.stats.wordLastActive[a[0]] || 0));
        const tags = Object.entries(this.stats.tagCounts).sort((a, b) => (this.stats.tagLastActive[b[0]] || 0) - (this.stats.tagLastActive[a[0]] || 0));
        const trophyIcon = `<div class="prize-icon-container"><svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px"><path d="M19,5h-2V3H7v2H5C3.9,5,3,5.9,3,7v1c0,2.55,1.92,4.63,4.39,4.94c0.63,1.5,1.98,2.63,3.61,2.96V19H7v2h10v-2h-4v-3.1 c1.63-0.33,2.98-1.46,3.61-2.96C19.08,12.63,21,10.55,21,8V7C21,5.9,20.1,5,19,5z M5,8V7h2v3.82C5.84,10.4,5,9.3,5,8z M12,14 c-1.65,0-3-1.35-3-3V5h6v6C15,12.65,13.65,14,12,14z M19,8c0,1.3-0.84,2.4-2,2.82V7h2V8z"/></svg></div>`;
        const arrowIcon = `<div class="arrow-icon-container"><svg class="ignore-dark-override" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 0 24 24" width="24px" fill="currentColor"><path d="M16.59 8.59L12 13.17 7.41 8.59 6 10l6 6 6-6-1.41-1.41z"/></svg></div>`;
        panel.innerHTML = `
            <div class="stats-header"><span class="stats-title">Usage Statistics</span><button class="stats-close-btn" onclick="StatsManager.togglePanel()">&times;</button></div>
            <div style="padding: 0 24px; width: 100%; box-sizing: border-box; flex-shrink: 0;">
                <div class="stat-card" style="width:100%; margin-bottom:15px;"><div class="stat-info-group"><span class="stat-value">${this.getTotalTimeDisplay()}</span><span class="stat-label">Total Time Spent</span></div>${trophyIcon}</div>
            </div>
            <div style="width:100%; overflow-y:auto; flex-grow:1; display:flex; flex-direction:column; gap:10px; padding: 0 24px; box-sizing: border-box;">
                <div class="stat-card clickable-stat" onclick="StatsManager.toggleSection('words')"><div class="stat-info-group"><span class="stat-value">${words.length}</span><span class="stat-label">Words Searched</span></div>${arrowIcon}</div>
                ${this.currentOpenSection === 'words' ? `<div class="stats-list" style="padding:0 10px 10px 10px;">${words.map(([w, c]) => `<div class="history-list-item" onclick="window.AppSearch('${w}'); StatsManager.togglePanel();"><div class="history-word-info"><span style="font-weight:600;">${w}</span><span class="history-word-count">(${c}x, ${this.getFormattedTime(this.stats.wordTime[w])})</span></div><button class="remove-history-btn" onclick="StatsManager.removeWord('${w}', event)">&times;</button></div>`).join('')}</div>` : ''}
                <div class="stat-card clickable-stat" onclick="StatsManager.toggleSection('tags')"><div class="stat-info-group"><span class="stat-value">${tags.length}</span><span class="stat-label">Tags Opened</span></div>${arrowIcon}</div>
                ${this.currentOpenSection === 'tags' ? `<div class="stats-list" style="padding:0 10px 10px 10px;">${tags.map(([t, c]) => `<div class="history-list-item" onclick="window.ModalManager.show('${t}'); StatsManager.togglePanel();"><div class="history-word-info"><span style="font-weight:600;">${t}</span><span class="history-word-count">(${c}x, ${this.getFormattedTime(this.stats.tagTime[t])})</span></div><button class="remove-history-btn" onclick="StatsManager.removeTag('${t}', event)">&times;</button></div>`).join('')}</div>` : ''}
            </div>
            <button class="reset-stats-btn" onclick="StatsManager.showResetConfirm()">Reset All Statistics</button>
            <div id="stats-confirm-overlay" style="display:none; position:absolute; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:100; flex-direction:column; justify-content:center; align-items:center; padding:20px; text-align:center; border-radius:10px;"><div style="color:white; margin-bottom:20px; font-weight:bold;">Reset all usage statistics? This cannot be undone.</div><div style="display:flex; gap:10px; width:100%;"><button class="reset-stats-btn" style="flex:1; background:#ff4b6b; margin:0;" onclick="StatsManager.resetAll()">Yes, Reset</button><button class="add-lang-btn" style="flex:1; border-color:white; color:white; margin:0;" onclick="StatsManager.hideResetConfirm()">Cancel</button></div></div>
        `;
    },

    removeWord(w, e) { if (e) e.stopPropagation(); if (!this.stats.ignoredWords.includes(w)) { this.stats.ignoredWords.push(w); this.save(); this.render(); if (window.renderHomeLists) window.renderHomeLists(); } },
    removeTag(t, e) { if (e) e.stopPropagation(); delete this.stats.tagCounts[t]; delete this.stats.tagTime[t]; delete this.stats.tagLastActive[t]; this.save(); this.render(); if (window.renderHomeLists) window.renderHomeLists(); },
    showResetConfirm() { const o = document.getElementById('stats-confirm-overlay'); if (o) o.style.display = 'flex'; },
    hideResetConfirm() { const o = document.getElementById('stats-confirm-overlay'); if (o) o.style.display = 'none'; },
    resetAll() { localStorage.removeItem('sophdict_stats_detailed'); this.stats = { totalTime: 0, wordCounts: {}, tagCounts: {}, wordTime: {}, tagTime: {}, wordLastActive: {}, tagLastActive: {}, ignoredWords: [], sessionStartTime: Date.now(), currentWord: null, currentWordStartTime: null, currentTag: null, currentTagStartTime: null }; this.render(); }
};
StatsManager.init();
