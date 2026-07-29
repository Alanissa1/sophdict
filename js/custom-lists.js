window.CustomLists = {
    icons: { /* unchanged, keep your existing SVG icons */ },

    lists: {},
    _passwords: {},        // <-- NEW: remembers entered passwords per list
    deleteMode: false,

    async init() {
        this.loadLocalLists();
        window.addEventListener('popstate', () => this.handleRoute());
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            if (window.AppClearSearch) window.AppClearSearch(true);
        }
        this.handleRoute();
    },

    // --- NEW helper: get list metadata without password ---
    async getListMeta(name) {
        try {
            const resp = await fetch(`/api/custom-lists?action=check&name=${encodeURIComponent(name)}`);
            if (!resp.ok) return { exists: false };
            return await resp.json(); // { available, passwordProtected, hidden }
        } catch (e) {
            return { exists: false };
        }
    },

    loadLocalLists() { /* unchanged */ },
    saveLocalLists() { /* unchanged */ },
    canEditList(name) { /* unchanged */ },
    triggerUnlock(name) { /* unchanged */ },
    createSettingsPanel() { /* unchanged */ },

    handleRoute() {
        const path = window.location.pathname;
        if (path === '/create-list') {
            this.renderCreationUI();
        } else if (path === '/list/explore') {
            if (window.ExploreLists) window.ExploreLists.renderExploreUI();
        } else if (path.startsWith('/listname/')) {
            const listName = decodeURIComponent(path.replace('/listname/', ''));
            const modalIndex = path.indexOf('/modal/');
            const actualListName = modalIndex !== -1 ? decodeURIComponent(path.substring(10, modalIndex)) : listName;

            if (!document.querySelector('.list-page') || this._currentLoadedList !== actualListName) {
                this.renderListView(actualListName);
            }

            if (modalIndex !== -1) {
                const modalWord = decodeURIComponent(path.substring(modalIndex + 7));
                if (window.ModalManager) window.ModalManager.show(modalWord, null, true);
            }
        }
    },

    renderCreationUI() { /* unchanged */ },
    currentType: null,
    showDetailsForm(type) { /* unchanged */ },

    async confirmCreate() {
        const name = document.getElementById('newListPath').value.trim();
        const pass = document.getElementById('newListPass').value;
        const lock = document.getElementById('newListLock').checked;
        const visibility = document.querySelector('input[name="newListVisibility"]:checked')?.value || 'link';
        const hide = (visibility === 'private');
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
                locked: lock,
                visibility: visibility
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
            locked: lock,
            visibility: visibility
        };

        this.saveLocalLists();

        // Store password for future API calls + set auth flag
        if (pass) {
            this._passwords[name] = pass;
            localStorage.setItem(`auth_${name}`, 'true');
        }

        if (document.body.classList.contains('home-state')) {
            window.AppClearSearch(true);
        }

        window.history.pushState({}, "", `/listname/${encodeURIComponent(name)}`);
        this.handleRoute();
    },

    async checkOnlineName(name) { /* unchanged */ },
    async saveOnlineList(name, data) { /* unchanged */ },

    // --- MODIFIED: renderListView with password‑aware loading ---
    async renderListView(name) {
        const container = document.getElementById('results-container');
        if (!container) return;

        if (window.RestoreSearchUI) window.RestoreSearchUI();

        let list = this.lists[name];
        const lastSave = this._lastSaveTime || 0;
        const recentlySaved = (Date.now() - lastSave) < 2000;

        // If we don't have the list locally (or it's online and may be stale)
        if (!list || (list.type === 'online' && !recentlySaved)) {
            if (!list) {
                container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">Loading list...</div>`;
            }

            // Get metadata first
            const meta = await this.getListMeta(name);
            if (!meta || !meta.exists) {
                container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">List not found.</div>`;
                return;
            }

            // If hidden (private) list, we need a password
            if (meta.hidden && meta.passwordProtected) {
                const savedPw = this._passwords[name];
                if (savedPw) {
                    // We have a password from earlier – try to fetch directly
                    const fresh = await this.fetchOnlineList(name, savedPw);
                    if (fresh) {
                        this.lists[name] = fresh;
                        list = fresh;
                        this.saveLocalLists();
                    } else {
                        // Password may be wrong – prompt again
                        this.renderPasswordPrompt(name, null);
                        return;
                    }
                } else {
                    // No password known yet – show prompt
                    this.renderPasswordPrompt(name, null);
                    return;
                }
            } else {
                // Public / link‑only list – fetch without password
                const fresh = await this.fetchOnlineList(name);
                if (fresh) {
                    this.lists[name] = fresh;
                    list = fresh;
                    this.saveLocalLists();
                } else {
                    container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">Could not load list.</div>`;
                    return;
                }
            }
        }

        // If still no list, stop
        if (!list) {
            container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">List not found.</div>`;
            return;
        }

        // Password check for viewing (only if list.hidden is true and we have a password)
        // (This should already be handled by the fetch above, but keep as safety)
        if (list.password && list.hidden) {
            const authenticated = localStorage.getItem(`auth_${name}`);
            if (!authenticated) {
                this.renderPasswordPrompt(name, list);
                return;
            }
        }

        const canEdit = this.canEditList(name);
        const isAuth = localStorage.getItem(`auth_${name}`) === 'true';
        this._currentLoadedList = name;

        const unlockBtn = (list.locked && list.password && !isAuth) ? 
            `<button class="action-btn" style="background: var(--card-bg); color: var(--accent); border: 1px solid var(--accent); margin-right: 10px;" onclick="CustomLists.triggerUnlock('${name}')">Unlock Edit</button>` : '';

        document.body.classList.remove('home-state');
        container.innerHTML = `
            <div class="list-page" style="padding: 20px 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div class="list-name-display" style="margin: 0; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 24px;">
                        ${list.locked ? this.icons.editOnly : (list.type === 'online' ? (list.visibility === 'public' ? this.icons.public : (list.visibility === 'private' ? this.icons.private : this.icons.link)) : this.icons.private)}
                        ${name}
                    </div>
                    <div style="display:flex; flex-direction:column; align-items:flex-end; margin-left: auto; margin-right: 10px;">
                        <div id="offline-status-container" style="display:flex; align-items:baseline; gap:5px;">
                            <div id="page-fetch-status" class="fetch-progress-meter" style="font-weight: bold; font-size: 14px;"></div>
                            <span style=" color:var(--text-sub);">words offline</span>
                        </div>
                        <div id="fetch-ui-container" class="fetch-ui-container">
                            <button class="icon-btn fetch-btn" title="Download all words from tags" onclick="PreFetcher.showInput()">
                                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                            </button>
                        </div>
                    </div>
                    <div style="display: flex;">
                        ${unlockBtn}
                        <button class="action-btn" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); height: 30px; width: 62px; padding: 0;" onclick="CustomLists.renderSettingsUI('${name}')">Settings</button>
                    </div>
                </div>

                ${canEdit ? `
                <div class="search-container manual-add-container" style="width: 100%; max-width: 100%; margin-bottom: 30px;">
                    <input type="text" id="manualWordInput" placeholder="Add word manually..." autocomplete="off" readonly style="flex: 1;">
                    <button class="icon-btn" onclick="CustomLists.addManualWord('${name}')" aria-label="Add Word">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
                    </button>
                    <div id="manual-suggestions-box" class="suggestions-container"></div>
                </div>
                ` : ''}

                <div style="margin-bottom: 20px; color: var(--text-sub);">
                    Type: ${list.type} | Words: ${list.words.length}
                    ${list.locked ? (canEdit ? ' | <span style="">READ ONLY (UNLOCKED FOR EDITING)</span>' : ' | <span>READ ONLY</span>') : ''}
                </div>
                <div class="tags-row" style="display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px; margin-top: 20px;">
                    ${list.words.length === 0 ? '<div style="color: var(--text-sub);">No words added yet. Search a word or add it manually above!</div>' :
                        list.words.map(w => `<span class="tag syn-tag ${window.UIUtils ? UIUtils.getTagClass(w) : ''}" data-word="${w}" tabindex="0" onclick="window.ModalManager.show('${w}'); event.stopPropagation();">${w}</span>`).join('')}
                </div>
            </div>
        `;
        if (canEdit) this.setupManualInput(name);
        if (window.PreFetcher) PreFetcher.updatePageStatus();
        window.scrollTo({ top: 0, behavior: 'instant' });
    },

    // --- MODIFIED: fetchOnlineList now accepts optional password ---
    async fetchOnlineList(name, password = null) {
        try {
            let url = `/api/custom-lists?action=get&name=${encodeURIComponent(name)}&t=${Date.now()}`;
            if (password) {
                url += `&password=${encodeURIComponent(password)}`;
            }
            const resp = await fetch(url);
            if (resp.ok) return await resp.json();
            return null;   // include 401 / 404
        } catch (e) {
            return null;
        }
    },

    // --- NEW: submit password and then try to fetch the list ---
    async submitPasswordAndFetch(name) {
        const input = document.getElementById('listPassInput').value;
        if (!input) return;
        // Try to fetch with this password
        const fresh = await this.fetchOnlineList(name, input);
        if (fresh) {
            // Success: store password and set auth
            this._passwords[name] = input;
            localStorage.setItem(`auth_${name}`, 'true');
            this.lists[name] = fresh;
            this.saveLocalLists();
            this.renderListView(name);
        } else {
            alert("Incorrect password.");
        }
    },

    // --- MODIFIED: password prompt works with or without list object ---
    renderPasswordPrompt(name, list) {
        const container = document.getElementById('results-container');
        const isHidden = list ? list.hidden : true;   // if no list, assume private
        const title = isHidden ? 'Private List' : 'Password Protected';
        const message = isHidden ? 'This list is protected. Enter password to view.' : 'Enter password to unlock editing.';
        container.innerHTML = `
            <div class="password-prompt">
                <h3 style="color: var(--text-main);">${title}</h3>
                <p style="color: var(--text-sub);">${message}</p>
                <div class="input-group" style="max-width: 300px; margin: 20px auto;">
                    <input type="password" id="listPassInput" placeholder="Password" autocomplete="current-password">
                </div>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    <button class="action-btn" onclick="CustomLists.submitPasswordAndFetch('${name}')">Unlock</button>
                    ${!isHidden ? `<button class="action-btn" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);" onclick="window.history.back()">Cancel</button>` : ''}
                </div>
            </div>
        `;
    },

    // checkPassword remains for when the list is already loaded locally
    checkPassword(name) {
        const input = document.getElementById('listPassInput').value;
        const list = this.lists[name];
        if (!list || input !== list.password) {
            alert("Incorrect password");
            return;
        }
        localStorage.setItem(`auth_${name}`, 'true');
        this._passwords[name] = input;
        this.renderListView(name);
    },

    setupManualInput(name) { /* unchanged */ },
    showManualSuggestions(words, listName) { /* unchanged */ },
    hideManualSuggestions() { /* unchanged */ },
    async addManualWord(name) { /* unchanged */ },
    async removeWordFromList(word, name, event) { /* unchanged */ },
    renderSettingsUI(name) { /* unchanged, but now relies on backend for updates */ },
    closeSettings() { /* unchanged */ },
    async saveSettings(name) { /* unchanged */ },
    async handleRemoveFromSettings(word, name, event) { /* unchanged */ },
    deleteList(name) { /* unchanged */ },
    toggleDeleteMode() { /* unchanged */ },
    cancelDeleteMode() { /* unchanged */ },
    async showHeartMenu(word, element) { /* unchanged */ },
    async toggleFavorite(word) { /* unchanged */ },
    showListSelection(word) { /* unchanged */ },
    async addWordToList(word, listName) { /* unchanged */ }
};