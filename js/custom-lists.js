window.CustomLists = {
    lists: {}, // name -> { type: 'local'|'online', words: [], locked: bool, hidden: bool, password: string }

    async init() {
        this.loadLocalLists();
        window.addEventListener('popstate', () => this.handleRoute());

        // If on home page, refresh to show list buttons
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            if (window.AppClearSearch) window.AppClearSearch(true);
        }

        this.handleRoute();
    },

    loadLocalLists() {
        const saved = localStorage.getItem('sophdict_custom_lists');
        if (saved) {
            try {
                this.lists = JSON.parse(saved);
            } catch (e) {
                console.error("Failed to load local lists", e);
            }
        }
    },

    saveLocalLists() {
        localStorage.setItem('sophdict_custom_lists', JSON.stringify(this.lists));
    },

    createSettingsPanel() {
        // Now using standard licenseModal from LicenseManager
    },

    handleRoute() {
        const path = window.location.pathname;
        if (path === '/create-list') {
            this.renderCreationUI();
        } else if (path.startsWith('/listname/')) {
            const listName = decodeURIComponent(path.replace('/listname/', ''));
            this.renderListView(listName);
        }
    },

    renderCreationUI() {
        const container = document.getElementById('results-container');
        if (!container) return;

        this.closeSettings();
        if (window.RestoreSearchUI) window.RestoreSearchUI();

        document.body.classList.remove('home-state');
        container.innerHTML = `
            <div class="list-creation-container">
                <h2 style="color: var(--text-main); margin-bottom: 20px;">Create New List</h2>
                <div id="creation-step-1">
                    <button class="list-option-btn" onclick="CustomLists.showDetailsForm('local')">
                        <strong>Locally</strong><br>
                        <span style="font-size: 12px; color: var(--text-sub);">Saved on this device only.</span>
                    </button>
                    <button class="list-option-btn" onclick="CustomLists.showDetailsForm('online')">
                        <strong>Online</strong><br>
                        <span style="font-size: 12px; color: var(--text-sub);">Saved on Upstash, accessible anywhere.</span>
                    </button>
                </div>
                <div id="creation-step-2" style="display: none;">
                    <div class="input-group" id="pathInputGroup">
                        <label>List Name</label>
                        <input type="text" id="newListPath" placeholder="my-awesome-list" autocomplete="off">
                    </div>
                    <div class="input-group">
                        <label>Password (optional)</label>
                        <input type="password" id="newListPass" placeholder="Leave empty for no password" autocomplete="off">
                    </div>
                    <div class="input-group checkbox-row">
                        <label for="newListHide">Hide list completely</label>
                        <input type="checkbox" id="newListHide">
                    </div>
                    <div class="input-group checkbox-row" id="lockInputGroup">
                        <label for="newListLock">Lock list (Read-only)</label>
                        <input type="checkbox" id="newListLock">
                    </div>
                    <div id="creation-error" style="color: #ff4b6b; margin-bottom: 10px; font-size: 14px;"></div>
                    <div style="display: flex; gap: 10px;">
                        <button class="action-btn" id="confirmCreateBtn" onclick="CustomLists.confirmCreate()">Create List</button>
                        <button class="action-btn" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);" onclick="CustomLists.renderCreationUI()">Back</button>
                    </div>
                </div>
            </div>
        `;
    },

    currentType: null,
    showDetailsForm(type) {
        this.currentType = type;
        document.getElementById('creation-step-1').style.display = 'none';
        document.getElementById('creation-step-2').style.display = 'block';

        const pathGroup = document.getElementById('pathInputGroup');
        const lockGroup = document.getElementById('lockInputGroup');

        if (type === 'local') {
            pathGroup.style.display = 'block'; // Changed to allow name
            lockGroup.style.display = 'none';
            document.getElementById('newListPath').value = `Local List ${Object.keys(this.lists).length + 1}`;
        } else {
            pathGroup.style.display = 'block';
            lockGroup.style.display = 'flex';
            document.getElementById('newListPath').value = '';
        }
    },

    async confirmCreate() {
        const name = document.getElementById('newListPath').value.trim();
        const pass = document.getElementById('newListPass').value;
        const hide = document.getElementById('newListHide').checked;
        const lock = document.getElementById('newListLock').checked;
        const errorDiv = document.getElementById('creation-error');

        if (!name) {
            errorDiv.innerText = "Please enter a name.";
            return;
        }

        if (this.lists[name]) {
            errorDiv.innerText = "A local list with this name already exists.";
            return;
        }

        if (this.currentType === 'online') {
            const available = await this.checkOnlineName(name);
            if (!available) {
                errorDiv.innerText = "This name is already taken online.";
                return;
            }

            const result = await this.saveOnlineList(name, {
                type: 'online',
                words: [],
                password: pass,
                hidden: hide,
                locked: lock
            });

            if (!result.success) {
                if (result.message.includes('Database configuration missing')) {
                    errorDiv.innerText = "Upstash database not configured in Vercel settings.";
                } else {
                    errorDiv.innerText = result.message || "Failed to connect to Upstash.";
                }
                return;
            }
        }

        this.lists[name] = {
            type: this.currentType,
            words: [],
            password: pass,
            hidden: hide,
            locked: lock
        };

        this.saveLocalLists();

        // Refresh home screen if we are on it
        if (document.body.classList.contains('home-state')) {
            window.AppClearSearch(true);
        }

        window.history.pushState({}, "", `/listname/${encodeURIComponent(name)}`);
        this.handleRoute();
    },

    async checkOnlineName(name) {
        try {
            const resp = await fetch(`/api/custom-lists?action=check&name=${encodeURIComponent(name)}`);
            if (!resp.ok) return true; // Let saveOnlineList handle the descriptive error
            const data = await resp.json();
            return data.available !== false;
        } catch (e) {
            return true;
        }
    },

    async saveOnlineList(name, data) {
         try {
            const resp = await fetch(`/api/custom-lists`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, data })
            });
            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                return { success: false, message: errData.error || "Server error" };
            }
            return { success: true };
        } catch (e) {
            return { success: false, message: "Network error" };
        }
    },

    renderListView(name) {
        const container = document.getElementById('results-container');
        if (!container) return;

        this.closeSettings();
        if (window.RestoreSearchUI) window.RestoreSearchUI();

        let list = this.lists[name];

        // If not in local cache, try fetching online
        if (!list) {
            this.fetchOnlineList(name).then(list => {
                if (list) {
                    this.lists[name] = list;
                    this.saveLocalLists();
                    this.renderListView(name);
                }
            });
            // Show loading or not found while waiting
            container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">Loading list...</div>`;
            return;
        }

        if (!list) {
            container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">List not found.</div>`;
            return;
        }

        if (list.hidden || list.locked || list.password) {
            const authenticated = sessionStorage.getItem(`auth_${name}`);
            if (!authenticated && list.password) {
                this.renderPasswordPrompt(name, list);
                return;
            }
        }

        document.body.classList.remove('home-state');
        container.innerHTML = `
            <div style="padding: 20px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <div class="list-name-display" style="margin: 0;">${name}</div>
                    <button class="action-btn" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);" onclick="CustomLists.renderSettingsUI('${name}')">Settings</button>
                </div>

                <div class="search-container manual-add-container" style="width: 100%; max-width: 100%; margin-bottom: 30px;">
                    <input type="text" id="manualWordInput" placeholder="Add word manually..." autocomplete="off" style="flex: 1;">
                    <button class="icon-btn" onclick="CustomLists.addManualWord('${name}')" aria-label="Add Word">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                    </button>
                    <div id="manual-suggestions-box" class="suggestions-container"></div>
                </div>

                <div style="margin-bottom: 20px; color: var(--text-sub);">
                    Type: ${list.type} | Words: ${list.words.length}
                    ${list.locked ? ' | <span style="color: #ff4b6b;">Locked</span>' : ''}
                </div>
                <div class="tags-row">
                    ${list.words.length === 0 ? '<div style="color: var(--text-sub);">No words added yet. Search a word or add it manually above!</div>' :
                        list.words.map(w => `<span class="tag" onclick="window.ModalManager.show('${w}')">${w}</span>`).join('')}
                </div>
            </div>
        `;
        this.setupManualInput(name);
    },

    setupManualInput(name) {
        const wi = document.getElementById('manualWordInput');
        if (!wi) return;

        wi.onfocus = () => wi.closest('.search-container')?.classList.add('input-focused');
        wi.onblur = () => setTimeout(() => wi.closest('.search-container')?.classList.remove('input-focused'), 150);

        wi.onkeydown = (e) => {
            if (e.key === 'Enter') {
                e.stopPropagation();
                this.addManualWord(name);
                this.hideManualSuggestions();
            }
        };

        wi.oninput = async () => {
            const q = wi.value.trim().toLowerCase();
            if (q.length < 1) { this.hideManualSuggestions(); return; }
            try {
                const res = await fetch(`https://api.datamuse.com/sug?s=${q}&max=7`);
                const words = await res.json();
                this.showManualSuggestions(words.map(i => i.word), name);
            } catch (e) { this.hideManualSuggestions(); }
        };
    },

    showManualSuggestions(words, listName) {
        const box = document.getElementById('manual-suggestions-box');
        if (!box || words.length === 0) { this.hideManualSuggestions(); return; }
        box.innerHTML = words.map(w => `<div class="suggestion-item" onclick="document.getElementById('manualWordInput').value='${w}'; CustomLists.addManualWord('${listName}'); CustomLists.hideManualSuggestions();"><span>${w}</span></div>`).join('');
        box.style.display = 'block';
    },

    hideManualSuggestions() {
        const box = document.getElementById('manual-suggestions-box');
        if (box) box.style.display = 'none';
    },

    async addManualWord(name) {
        const input = document.getElementById('manualWordInput');
        const word = input.value.trim().toLowerCase();
        if (!word) return;

        await this.addWordToList(word, name);
        input.value = '';
        this.renderListView(name);
    },

    removeWordFromList(word, name, event) {
        if (event) event.stopPropagation();
        const list = this.lists[name];
        if (!list) return;
        list.words = list.words.filter(w => w !== word);
        this.saveLocalLists();
        if (list.type === 'online') this.saveOnlineList(name, list);

        // Only refresh UI if we are currently viewing this list
        if (window.location.pathname === `/listname/${encodeURIComponent(name)}`) {
            this.renderListView(name);
        }
    },

    renderSettingsUI(name) {
        const modal = document.getElementById('licenseModal');
        const dimmer = document.getElementById('microDimmer');
        if (!modal || !dimmer) return;

        const list = this.lists[name];

        modal.querySelector('.license-title').innerText = `List Settings: ${name}`;
        modal.querySelector('#licenseTextContent').innerHTML = `
            <div style="padding-top: 20px;">
                <div class="input-group">
                    <label>Password</label>
                    <input type="password" id="editListPass" value="${list.password || ''}" autocomplete="off">
                </div>
                <div class="input-group checkbox-row">
                    <label for="editListHide">Hide list completely</label>
                    <input type="checkbox" id="editListHide" ${list.hidden ? 'checked' : ''}>
                </div>
                ${list.type === 'online' ? `
                <div class="input-group checkbox-row">
                    <label for="editListLock">Lock list (Read-only)</label>
                    <input type="checkbox" id="editListLock" ${list.locked ? 'checked' : ''}>
                </div>` : ''}

                <div style="margin-top: 30px; margin-bottom: 20px;">
                    <h3 style="color: var(--text-main); font-size: 16px; margin-bottom: 10px;">Manage Words</h3>
                    <div style="max-height: 250px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; background: var(--bg-color);">
                        ${list.words.length === 0 ? '<div style="color: var(--text-sub); text-align: center;">No words in list.</div>' :
                            list.words.map(w => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid var(--border-color);">
                                    <span style="color: var(--text-main); font-weight: 500;">${w}</span>
                                    <button class="action-btn" style="background: #ff4b6b; padding: 4px 10px; font-size: 12px;" onclick="CustomLists.removeWordFromList('${w}', '${name}', event); CustomLists.renderSettingsUI('${name}');">Remove</button>
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;

        modal.querySelector('.license-footer').innerHTML = `
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button class="action-btn" onclick="CustomLists.saveSettings('${name}')">Save</button>
                <button class="action-btn" style="background: #ff4b6b;" onclick="CustomLists.deleteList('${name}')">Delete</button>
                <button class="license-close-btn" style="margin: 0;" onclick="CustomLists.closeSettings()">Close</button>
            </div>
        `;

        modal.classList.add('active');
        UIUtils.updateSharedDimmer();
        UIUtils.setupQuickClose(dimmer, () => this.closeSettings());
    },

    closeSettings() {
        const modal = document.getElementById('licenseModal');
        if (modal) {
            modal.classList.remove('active');
        }
        UIUtils.updateSharedDimmer();
    },

    saveSettings(name) {
        const list = this.lists[name];
        list.password = document.getElementById('editListPass').value;
        list.hidden = document.getElementById('editListHide').checked;
        if (list.type === 'online') {
            list.locked = document.getElementById('editListLock').checked;
        }

        this.saveLocalLists();
        if (list.type === 'online') this.saveOnlineList(name, list);
        this.closeSettings();
        this.renderListView(name);
    },

    deleteList(name) {
        delete this.lists[name];
        this.saveLocalLists();
        this.closeSettings();
        // In a real app, you might want to delete from Upstash too
        window.AppClearSearch();
    },

    renderPasswordPrompt(name, list) {
        const container = document.getElementById('results-container');
        container.innerHTML = `
            <div class="password-prompt">
                <h3 style="color: var(--text-main);">${list.hidden ? 'Private List' : 'Locked List'}</h3>
                <p style="color: var(--text-sub);">This list is protected. Enter password to view.</p>
                <div class="input-group" style="max-width: 300px; margin: 20px auto;">
                    <input type="password" id="listPassInput" placeholder="Password" autocomplete="off">
                </div>
                <button class="action-btn" onclick="CustomLists.checkPassword('${name}')">Unlock</button>
            </div>
        `;
    },

    checkPassword(name) {
        const input = document.getElementById('listPassInput').value;
        const list = this.lists[name];
        if (input === list.password) {
            sessionStorage.setItem(`auth_${name}`, 'true');
            this.renderListView(name);
        } else {
            // Incorrect password - messageless
        }
    },

    async fetchOnlineList(name) {
         try {
            const resp = await fetch(`/api/custom-lists?action=get&name=${encodeURIComponent(name)}`);
            if (resp.ok) return await resp.json();
        } catch (e) {}
        return null;
    },

    async showHeartMenu(word, element) {
        const listNames = Object.keys(this.lists);
        const cleanWord = (word || "").trim().toLowerCase();
        const isPinned = await DBManager.isPinned(cleanWord);

        // Remove existing menu
        const existing = document.querySelector('.heart-menu');
        if (existing) existing.remove();

        const menu = document.createElement('div');
        menu.className = 'heart-menu';

        const rect = element.getBoundingClientRect();
        menu.style.top = `${rect.bottom + window.scrollY + 5}px`;
        menu.style.left = `${rect.left + window.scrollX - 100}px`;

        let listHtml = '';
        if (listNames.length === 0) {
            listHtml = `<div class="heart-menu-item" style="color: var(--text-sub); font-size: 12px;">No custom lists found.</div>
                        <div class="heart-menu-item" onclick="window.history.pushState({}, '', '/create-list'); CustomLists.handleRoute();" style="color: var(--accent); font-weight: bold;">+ Create List</div>`;
        } else {
            listHtml = listNames.map(name => {
                const inList = this.lists[name].words.includes(cleanWord);
                if (inList) {
                    return `<div class="heart-menu-item" style="color: #ff4b6b;" onclick="CustomLists.removeWordFromList('${cleanWord}', '${name}'); document.querySelector('.heart-menu')?.remove();">Remove from ${name}</div>`;
                } else {
                    return `<div class="heart-menu-item" onclick="CustomLists.addWordToList('${cleanWord}', '${name}')">${name}</div>`;
                }
            }).join('');
        }

        menu.innerHTML = `
            <div class="heart-menu-item" onclick="CustomLists.toggleFavorite('${cleanWord}')">
                ${isPinned ? '<span style="color: #ff4b6b;">Remove from Favorites</span>' : 'Add to Favorites'}
            </div>
            <div style="padding: 10px; font-weight: bold; border-bottom: 1px solid var(--border-color); color: var(--text-sub); font-size: 12px; background: var(--hover-bg);">SAVE TO LIST</div>
            ${listHtml}
        `;

        document.body.appendChild(menu);

        const closeMenu = (e) => {
            const isClickInside = menu.contains(e.target) || (element && element.contains(e.target));
            if (!isClickInside) {
                menu.remove();
                document.removeEventListener('click', closeMenu, true);
                document.removeEventListener('touchstart', closeMenu, true);
            }
        };
        setTimeout(() => {
            document.addEventListener('click', closeMenu, true);
            document.addEventListener('touchstart', closeMenu, true);
        }, 10);
    },

    async toggleFavorite(word) {
        const active = await PinManager.togglePin(word);
        // Refresh heart icons in UI
        const pins = document.querySelectorAll('.pin-btn, #microPin');
        const heartEmpty = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/></svg>`;
        const heartFilled = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"/></svg>`;

        pins.forEach(p => {
            p.classList.toggle('active', active);
            p.style.color = active ? '#ff4b6b' : '#8b8b8b';
            p.innerHTML = active ? heartFilled : heartEmpty;
        });

        document.querySelector('.heart-menu')?.remove();
    },

    showListSelection(word) {
        const menu = document.querySelector('.heart-menu');
        if (!menu) return;

        const listNames = Object.keys(this.lists);
        if (listNames.length === 0) {
            menu.innerHTML = `
                <div class="heart-menu-item" style="color: var(--text-sub);">No lists found.</div>
                <div class="heart-menu-item" onclick="window.history.pushState({}, '', '/create-list'); CustomLists.handleRoute();">Create List</div>
            `;
            return;
        }

        menu.innerHTML = `
            <div style="padding: 10px; font-weight: bold; border-bottom: 1px solid var(--border-color); color: var(--text-sub); font-size: 12px;">SELECT LIST</div>
            ${listNames.map(name => `
                <div class="heart-menu-item" onclick="CustomLists.addWordToList('${word}', '${name}')">${name}</div>
            `).join('')}
        `;
    },

    async addWordToList(word, listName) {
        const cleanWord = (word || "").trim().toLowerCase();
        if (!cleanWord) return;

        const list = this.lists[listName];
        if (!list || list.locked) return;

        if (list.words.includes(cleanWord)) return;

        // Verify word exists and has content
        const data = await APIClient.fetchWordData(cleanWord);
        if (!data || data.error || !data.dictionary || data.dictionary.length === 0) {
            return;
        }

        list.words.push(cleanWord);

        if (list.type === 'online') {
            await this.saveOnlineList(listName, list);
        }

        this.saveLocalLists();
        document.querySelector('.heart-menu')?.remove();
    }
};
