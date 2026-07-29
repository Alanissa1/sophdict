window.ExploreLists = {
    icon: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m300-300 280-80 80-280-280 80-80 280Zm180-120q-25 0-42.5-17.5T420-480q0-25 17.5-42.5T480-540q25 0 42.5 17.5T540-480q0 25-17.5 42.5T480-420Zm0 340q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Zm0-320Z"/></svg>`,

    renderSetting(currentValue = 'link', isNew = true) {
        const nameAttr = isNew ? 'newListVisibility' : 'editListVisibility';
        const icons = window.CustomLists.icons;

        return `
            <div class="input-group" style="margin-top: 15px;">
                <label>Visibility</label>
                <div class="visibility-group">
                    <label class="visibility-chip">
                        <input type="radio" name="${nameAttr}" value="public" ${currentValue === 'public' ? 'checked' : ''}>
                        ${icons.public} Public
                    </label>
                    <label class="visibility-chip">
                        <input type="radio" name="${nameAttr}" value="link" ${currentValue === 'link' ? 'checked' : ''}>
                        ${icons.link} Unlisted
                    </label>
                    <label class="visibility-chip">
                        <input type="radio" name="${nameAttr}" value="private" ${currentValue === 'private' ? 'checked' : ''}>
                        ${icons.private} Private
                    </label>
                </div>
            </div>
        `;
    },

    async renderExploreUI() {
        const container = document.getElementById('results-container');
        if (!container) return;

        if (window.RestoreSearchUI) window.RestoreSearchUI();
        document.body.classList.remove('home-state');

        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 20px;">
                    ${this.icon}
                    <h2 style="color: var(--text-main); margin: 0;">Explore Public Lists</h2>
                </div>
                <div id="explore-lists-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 15px;">
                    <div style="color: var(--text-sub);">Loading public lists...</div>
                </div>
            </div>
        `;

        try {
            const resp = await fetch('/api/custom-lists?action=explore');
            const lists = await resp.json();
            this.renderGrid(lists);
        } catch (e) {
            document.getElementById('explore-lists-grid').innerHTML = `<div style="color: #ff4b6b;">Failed to load public lists.</div>`;
        }
    },

    renderGrid(lists) {
        const grid = document.getElementById('explore-lists-grid');
        if (!grid) return;

        if (!lists || lists.length === 0) {
            grid.innerHTML = `<div style="color: var(--text-sub);">No public lists found.</div>`;
            return;
        }

        grid.innerHTML = lists.map(list => `
            <div class="list-card" onclick="window.history.pushState({}, '', '/listname/${encodeURIComponent(list.name)}'); window.CustomLists.handleRoute();"
                 style="background: var(--card-bg); border: 1px solid var(--border-color); padding: 20px; border-radius: 12px; cursor: pointer; transition: all 0.2s ease;">
                <div style="font-weight: bold; color: var(--text-main); font-size: 16px; margin-bottom: 8px;">${list.name}</div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 13px; color: var(--text-sub);">${list.wordCount || 0} words</span>
                    <span style="color: var(--accent); font-size: 12px; font-weight: 500;">View List →</span>
                </div>
            </div>
        `).join('');
    }
};
