window.PinManager = {
    async togglePin(word) {
        const isPinned = await DBManager.isPinned(word);
        if (isPinned) {
            await DBManager.removePin(word);
            return false;
        } else {
            await DBManager.addPin(word);
            return true;
        }
    },

    async renderList(onWordClick) {
        const listContainer = document.getElementById('pinnedList');
        const pinned = await DBManager.getPinned();

        if (pinned.length === 0) {
            listContainer.innerHTML = '<div style="padding:10px; color:#70757a;">Favorites list is empty</div>';
            return;
        }

        listContainer.innerHTML = pinned.map(p => `
            <div class="pinned-item" data-word="${p.word}">
                <span class="pinned-word-link">${p.word}</span>
                <span class="untap-pin" style="color:#d93025; padding: 0 5px;">✕</span>
            </div>
        `).join('');

        listContainer.querySelectorAll('.pinned-item').forEach(item => {
            const word = item.dataset.word;
            item.querySelector('.pinned-word-link').onclick = () => onWordClick(word);
            item.querySelector('.untap-pin').onclick = async (e) => {
                e.stopPropagation();
                await this.togglePin(word);
                this.renderList(onWordClick);
            };
        });
    }
};
