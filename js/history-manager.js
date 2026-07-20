window.HistoryManager = {
    searchRAM: [],
    currentIndex: -1,

    init() {
        this.createDetailPanel();
    },

    addToRAM(word) {
        if (this.searchRAM[this.currentIndex] === word) return;
        this.searchRAM.push(word);
        this.currentIndex = this.searchRAM.length - 1;
    },

    goBack() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            const prevWord = this.searchRAM[this.currentIndex];
            window.AppSearch(prevWord, true, true);
        }
    },

    goForward() {
        if (this.currentIndex < this.searchRAM.length - 1) {
            this.currentIndex++;
            const nextWord = this.searchRAM[this.currentIndex];
            window.AppSearch(nextWord, true, true);
        }
    },

    createDetailPanel() {
        const panel = document.createElement('div');
        panel.id = 'historyDetailPanel';
        panel.style.display = 'none';
        document.body.appendChild(panel);
    },

    showDetails(title, list) {
        const panel = document.getElementById('historyDetailPanel');
        if (!panel) return;

        panel.innerHTML = `
            <div class="history-header">
                <h3 class="history-title">${title}</h3>
                <button class="history-close-btn" onclick="HistoryManager.hideDetails()">&times;</button>
            </div>
            <div id="historyList">
                ${list.length > 0 ?
                    list.map(w => `<div class="history-item" onclick="HistoryManager.onItemClick('${w}')">${w}</div>`).reverse().join('') :
                    '<div style="text-align:center; padding:20px; color:#999;">No items yet</div>'
                }
            </div>
        `;

        panel.style.display = 'flex';
    },

    hideDetails() {
        const panel = document.getElementById('historyDetailPanel');
        if (panel) panel.style.display = 'none';
    },

    onItemClick(word) {
        this.hideDetails();
        if (window.StatsManager) window.StatsManager.togglePanel();
        const wordInput = document.getElementById('wordInput');
        if (wordInput) wordInput.focus();
        if (window.AppSearch) window.AppSearch(word, false);
    }
};

HistoryManager.init();
