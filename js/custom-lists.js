window.CustomLists = {
    icons: {
        public: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-7-.5-14.5T799-507q-5 29-27 48t-52 19h-80q-33 0-56.5-23.5T560-520v-40H400v-80q0-33 23.5-56.5T480-720h40q0-23 12.5-40.5T563-789q-20-5-40.5-8t-42.5-3q-134 0-227 93t-93 227h200q66 0 113 47t47 113v40H400v110q20 5 39.5 7.5T480-160Z"/></svg>`,
        link: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z"/></svg>`,
        private: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm296.5-143.5Q560-327 560-360t-23.5-56.5Q513-440 480-440t-56.5 23.5Q400-393 400-360t23.5 56.5Q447-280 480-280t56.5-23.5ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/></svg>`,
        editOnly: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m604.69-469.92-42.15-42.16 97.38-97.38-50.46-50.46-97.38 97.38-42.16-42.15 197.7-198.08q8.92-8.92 19.96-13.07 11.04-4.16 23.19-4.16 11.77 0 23.11 4.27 11.35 4.27 20.04 13.58l48.85 49.46q9.31 8.69 13.27 20.04 3.96 11.34 3.96 22.88 0 11.77-4.16 22.81-4.15 11.04-13.07 19.96L604.69-469.92ZM200-200h50.46l212.31-212.31-24.92-25.54-25.54-24.92L200-250.46V-200ZM791.23-84.46l-285.69-284.7L275.38-140H140v-134.77l229.77-230.15L84.46-791.23 127.23-834 834-127.23l-42.77 42.77Zm-30.85-625.69-50.23-50.23 50.23 50.23Zm-150.92 50.23 50.46 50.46-50.46-50.46ZM437.85-437.85l-25.54-24.92 50.46 50.46-24.92-25.54Z"/></svg>`,
        explore: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m300-300 280-80 80-280-280 80-80 280Zm180-120q-25 0-42.5-17.5T420-480q0-25 17.5-42.5T480-540q25 0 42.5 17.5T540-480q0 25-17.5 42.5T480-420Zm0 340q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Zm0-320Z"/></svg>`,
        trash: `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/></svg>`
    },
    lists: {}, // name -> { type: 'local'|'online', words: [], locked: bool, hidden: bool, hasPassword: bool, visibility: 'public'|'link' }
    deleteMode: false,

    async init() {
        this.loadLocalLists();
        await this._migratePasswords();
        window.addEventListener('popstate', () => this.handleRoute());

        // If on home page, refresh to show list buttons
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            if (window.AppClearSearch) window.AppClearSearch(true);
        }

        this.handleRoute();
    },

    // --- Crypto helpers for local list password hashing ---
    _generateSalt() {
        return Array.from(crypto.getRandomValues(new Uint8Array(16))).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    async _hashLocal(password, salt) {
        const data = new TextEncoder().encode(salt + password);
        const buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    },

    // Migrate legacy plain-text passwords out of localStorage
    async _migratePasswords() {
        let dirty = false;
        for (const name of Object.keys(this.lists)) {
            const list = this.lists[name];
            if (list.password !== undefined) {
                if (list.type === 'local' && list.password) {
                    const salt = this._generateSalt();
                    list.passwordHash = await this._hashLocal(list.password, salt);
                    list.passwordSalt = salt;
                }
                list.hasPassword = !!list.password;
                delete list.password;
                dirty = true;
            }
        }
        if (dirty) this.saveLocalLists();
    },

    // Get the stored auth token for an online list
    _getToken(name) {
        return sessionStorage.getItem(`auth_token_${name}`);
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

    // --- Check if current user can edit ---
    canEditList(name) {
        const list = this.lists[name];
        if (!list) return false;
        
        // If it's not locked, anyone can edit
        if (!list.locked) return true;
        
        // If locked with a password, check for valid session token
        if (!list.hasPassword) return false;
        if (list.type === 'online') return !!this._getToken(name);
        return sessionStorage.getItem(`auth_local_${name}`) === 'true';
    },

    // --- NEW HELPER: Trigger unlock modal for owners ---
    triggerUnlock(name) {
        const list = this.lists[name];
        if (list) {
            this.renderPasswordPrompt(name, list);
        }
    },

    createSettingsPanel() {
        // Now using standard licenseModal from LicenseManager
    },

    handleRoute() {
        const path = window.location.pathname;
        if (path === '/create-list' || path === '/create-list/online' || path === '/create-list/local') {
            this.renderCreationUI();
        } else if (path === '/list/explore') {
            if (window.ExploreLists) window.ExploreLists.renderExploreUI();
        } else if (path.startsWith('/listname/') || path.startsWith('/llistname/')) {
            const prefix = path.startsWith('/llistname/') ? '/llistname/' : '/listname/';
            const modalIndex = path.indexOf('/modal/');
            const actualListName = modalIndex !== -1
                ? decodeURIComponent(path.substring(prefix.length, modalIndex))
                : decodeURIComponent(path.substring(prefix.length));

            if (!document.querySelector('.list-page') || this._currentLoadedList !== actualListName) {
                this.renderListView(actualListName);
            }

            if (modalIndex !== -1) {
                const modalWord = decodeURIComponent(path.substring(modalIndex + 7));
                if (window.ModalManager) window.ModalManager.show(modalWord, null, true);
            }
        }
    },

    renderCreationUI() {
        const container = document.getElementById('results-container');
        if (!container) return;

        this.closeSettings();
        if (window.RestoreSearchUI) window.RestoreSearchUI();

        document.body.classList.remove('home-state');

        const path = window.location.pathname;
        const isStep2 = path === '/create-list/local' || path === '/create-list/online';

        container.innerHTML = `
            <div class="list-creation-container">
                <h2 style="color: var(--text-main); margin-bottom: 20px;">Create New List</h2>
                <div id="creation-step-1" style="display: ${isStep2 ? 'none' : 'block'};">
                    <button class="list-option-btn" onclick="window.history.pushState({}, '', '/create-list/local'); CustomLists.handleRoute();">
                        <strong>Locally</strong><br>
                        <span style="font-size: 12px; color: var(--text-sub);">Saved on this device only.</span>
                    </button>
                    <button class="list-option-btn" onclick="window.history.pushState({}, '', '/create-list/online'); CustomLists.handleRoute();">
                        <strong>Online</strong><br>
                        <span style="font-size: 12px; color: var(--text-sub);">Saved on Upstash, accessible anywhere.</span>
                    </button>
                    <button class="list-option-btn" onclick="window.history.pushState({}, '', '/list/explore'); CustomLists.handleRoute();" style="border-color: var(--accent); margin-top: 10px;">
                        <div style="display: flex; align-items: center; justify-content: center; gap: 10px; color: var(--accent);">
                            ${this.icons.explore} <strong>Explore Lists</strong>
                        </div>
                    </button>
                </div>
                <div id="creation-step-2" style="display: ${isStep2 ? 'block' : 'none'};">
                    <div class="input-group" id="pathInputGroup">
                        <label>List Name</label>
                        <input type="text" id="newListPath" placeholder="my-awesome-list" autocomplete="off">
                    </div>
                    <div id="visibilityInputGroup" style="display: none;">
                        ${window.ExploreLists ? window.ExploreLists.renderSetting('link', true) : ''}
                    </div>
                    <div class="input-group">
                        <label>Password (optional)</label>
                        <input type="password" id="newListPass" placeholder="Leave empty for no password" autocomplete="new-password">
                    </div>
                    <div class="input-group checkbox-row" id="lockInputGroup">
                        <label for="newListLock">Lock list (Read-only)</label>
                        <input type="checkbox" id="newListLock" onchange="if(window.CustomLists.updateFormState) window.CustomLists.updateFormState(true)">
                    </div>
                    <div id="creation-error" style="color: #ff4b6b; margin-bottom: 10px; font-size: 14px;"></div>
                    <div style="display: flex; gap: 10px;">
                        <button class="action-btn" id="confirmCreateBtn" onclick="CustomLists.confirmCreate()">Create List</button>
                        <button class="action-btn" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);" onclick="window.history.pushState({}, '', '/create-list'); CustomLists.handleRoute();">Back</button>
                    </div>
                </div>
            </div>
        `;

        if (isStep2) {
            const type = path === '/create-list/local' ? 'local' : 'online';
            this.showDetailsForm(type);
        }
    },

    currentType: null,
    showDetailsForm(type) {
        this.currentType = type;
        document.getElementById('creation-step-1').style.display = 'none';
        document.getElementById('creation-step-2').style.display = 'block';

        const pathGroup = document.getElementById('pathInputGroup');
        const lockGroup = document.getElementById('lockInputGroup');
        const visibilityGroup = document.getElementById('visibilityInputGroup');

        if (type === 'local') {
            pathGroup.style.display = 'block'; 
            lockGroup.style.display = 'flex';
            if (visibilityGroup) visibilityGroup.style.display = 'none';
            document.getElementById('newListPath').value = `Local List ${Object.keys(this.lists).length + 1}`;
        } else {
            pathGroup.style.display = 'block';
            lockGroup.style.display = 'flex';
            if (visibilityGroup) visibilityGroup.style.display = 'block';
            document.getElementById('newListPath').value = '';
        }
        
        setTimeout(() => this.updateFormState(true), 0);
    },

    updateFormState(isNew) {
        const prefix = isNew ? 'new' : 'edit';
        const visInput = document.querySelector(`input[name="${prefix}ListVisibility"]:checked`);
        const vis = visInput ? visInput.value : (this.currentType === 'local' ? 'local' : null);
        const lockCb = document.getElementById(`${prefix}ListLock`);
        const passInput = document.getElementById(`${prefix}ListPass`);
        
        const passLabel = isNew ? passInput?.previousElementSibling : document.getElementById('editListPassLabel');
        const hasExistingPassword = !isNew && this.lists[this._currentLoadedList]?.hasPassword;
        
        if (vis === 'private') {
            if (lockCb) {
                lockCb.checked = true;
                lockCb.disabled = true;
            }
            if (passLabel) passLabel.innerText = hasExistingPassword ? 'New Password (Required if changing, blank to keep)' : 'Password (Required for Private)';
        } else {
            if (lockCb) {
                lockCb.disabled = false;
            }
            if (lockCb && lockCb.checked) {
                if (passLabel) passLabel.innerText = hasExistingPassword ? 'New Password (Required if changing, blank to keep)' : 'Password (Required to lock)';
            } else {
                if (passLabel) passLabel.innerText = hasExistingPassword ? 'New Password (Optional)' : 'Password (Optional)';
            }
        }
    },

    async confirmCreate() {
        const name = document.getElementById('newListPath').value.trim();
        const pass = document.getElementById('newListPass').value;
        const lockCb = document.getElementById('newListLock');
        const lock = lockCb ? lockCb.checked : false;
        const visibility = document.querySelector('input[name="newListVisibility"]:checked')?.value || 'link';
        const hide = (visibility === 'private');
        const finalLock = lock || hide;
        const errorDiv = document.getElementById('creation-error');

        if (!name) {
            errorDiv.innerText = "Please enter a name.";
            return;
        }

        if ((hide || finalLock) && !pass) {
            errorDiv.innerText = "A password is required for private or locked lists.";
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

            // Send plain password to backend — it will hash it server-side
            const result = await this.saveOnlineList(name, {
                type: 'online',
                words: [],
                password: pass,
                hidden: hide,
                locked: finalLock,
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

            // Store locally WITHOUT the password — only the flag
            this.lists[name] = {
                type: 'online',
                words: [],
                hasPassword: !!pass,
                hidden: hide,
                locked: finalLock,
                visibility: visibility
            };
        } else {
            // Local list — hash password client-side
            const listData = {
                type: 'local',
                words: [],
                hasPassword: !!pass,
                hidden: hide,
                locked: finalLock,
                visibility: visibility
            };
            if (pass) {
                const salt = this._generateSalt();
                listData.passwordHash = await this._hashLocal(pass, salt);
                listData.passwordSalt = salt;
                sessionStorage.setItem(`auth_local_${name}`, 'true');
            }
            this.lists[name] = listData;
        }

        this.saveLocalLists();

        if (document.body.classList.contains('home-state')) {
            window.AppClearSearch(true);
        }

        const prefix = this.currentType === 'local' ? '/llistname/' : '/listname/';
        window.history.pushState({}, "", `${prefix}${encodeURIComponent(name)}`);
        this.handleRoute();
    },

    async checkOnlineName(name) {
        try {
            const resp = await fetch(`/api/custom-lists?action=check&name=${encodeURIComponent(name)}`);
            if (!resp.ok) return true; 
            const data = await resp.json();
            return data.available !== false;
        } catch (e) {
            return true;
        }
    },

    async saveOnlineList(name, data) {
         try {
            const headers = { 'Content-Type': 'application/json' };
            // Attach session token for protected lists
            const token = this._getToken(name);
            if (token) headers['Authorization'] = `Bearer ${token}`;

            const resp = await fetch(`/api/custom-lists`, {
                method: 'POST',
                headers,
                body: JSON.stringify({ name, data })
            });
            if (!resp.ok) {
                const errData = await resp.json().catch(() => ({}));
                return { success: false, message: errData.error || "Server error" };
            }
            const result = await resp.json();
            // Store token returned on create (or password change)
            if (result.token) {
                sessionStorage.setItem(`auth_token_${name}`, result.token);
            }
            return { success: true };
        } catch (e) {
            return { success: false, message: "Network error" };
        }
    },

    async renderListView(name) {
        const container = document.getElementById('results-container');
        if (!container) return;

        if (window.RestoreSearchUI) window.RestoreSearchUI();

        let list = this.lists[name];

        const lastSave = this._lastSaveTime || 0;
        const recentlySaved = (Date.now() - lastSave) < 2000;

        if (!list || (list.type === 'online' && !recentlySaved)) {
            if (!list) {
                container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">Loading list...</div>`;
            }
            const fresh = await this.fetchOnlineList(name);
            if (fresh) {
                this.lists[name] = fresh;
                list = fresh;
                this.saveLocalLists();
            }
        }

        if (!list) {
            container.innerHTML = `<div style="padding: 40px; text-align: center; color: var(--text-sub);">List not found.</div>`;
            return;
        }

        // Only lock list view if explicitly hidden (private)
        if (list.hasPassword && list.hidden) {
            const hasToken = list.type === 'online' ? !!this._getToken(name) : sessionStorage.getItem(`auth_local_${name}`) === 'true';
            if (!hasToken) {
                this.renderPasswordPrompt(name, list);
                return;
            }
        }

        const canEdit = this.canEditList(name);
        const isAuth = list.type === 'online' ? !!this._getToken(name) : sessionStorage.getItem(`auth_local_${name}`) === 'true';
        this._currentLoadedList = name;

        // Unlock button for owner to edit read-only lists
        const unlockBtn = (list.locked && list.hasPassword && !isAuth) ? 
            `<button class="action-btn" style="background: var(--card-bg); color: var(--accent); border: 1px solid var(--accent); margin-right: 10px;" onclick="CustomLists.triggerUnlock('${name}')">Unlock Edit</button>` : '';

        const visIcon = list.type === 'online' ? (list.visibility === 'public' ? this.icons.public : (list.visibility === 'private' ? this.icons.private : this.icons.link)) : this.icons.private;
        const lockIcon = (list.locked && list.visibility !== 'private') ? `<span style="color: var(--text-sub); opacity: 0.6; display: flex;" title="Read-only">${this.icons.editOnly}</span>` : '';

        document.body.classList.remove('home-state');
        container.innerHTML = `
            <div class="list-page" style="padding: 20px 0;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;flex-wrap: wrap;">
                    <div class="list-name-display" style="margin: 0; display: flex; align-items: center; gap: 10px; font-weight: 500; font-size: 24px;">
                        ${visIcon}
                        ${name}
                        ${lockIcon}
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
                        <button class="action-btn" style="padding: 7px 5px;background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); height: 30px; width: 62px; padding: 0;" onclick="CustomLists.renderSettingsUI('${name}')">Settings</button>
                    </div>
                </div>

                ${canEdit ? `
                <div class="search-container manual-add-container" style="width: 100%; margin-bottom: 15px;">
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

    setupManualInput(name) {
        const wi = document.getElementById('manualWordInput');
        if (!wi) return;

        wi.onfocus = () => {
            wi.removeAttribute('readonly');
            wi.closest('.search-container')?.classList.add('input-focused');
        };
        wi.onblur = () => {
            wi.setAttribute('readonly', true);
            setTimeout(() => wi.closest('.search-container')?.classList.remove('input-focused'), 150);
        };

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

    async removeWordFromList(word, name, event) {
        if (event) event.stopPropagation();
        const list = this.lists[name];
        
        // Changed to use Edit permission check
        if (!list || !this.canEditList(name)) return;
        
        list.words = list.words.filter(w => w !== word);
        this.saveLocalLists();

        this._lastSaveTime = Date.now();
        if (list.type === 'online') await this.saveOnlineList(name, list);

        const modal = document.getElementById('licenseModal');
        const isSettingsOpen = modal && modal.classList.contains('active');

        if (!isSettingsOpen && (window.location.pathname === `/listname/${encodeURIComponent(name)}` || window.location.pathname === `/llistname/${encodeURIComponent(name)}`)) {
            this.renderListView(name);
        }
    },

    renderSettingsUI(name) {
        const list = this.lists[name];
        if (!list) return;

        // Lock settings if list has a password and user is not authenticated
        const isAuth = list.type === 'online' ? !!this._getToken(name) : sessionStorage.getItem(`auth_local_${name}`) === 'true';
        if (list.hasPassword && !isAuth) {
            this.renderPasswordPrompt(name, list);
            return;
        }

        const modal = document.getElementById('licenseModal');
        const dimmer = document.getElementById('microDimmer');
        if (!modal || !dimmer) return;

        modal.querySelector('.license-title').innerText = `List Settings: ${name}`;
        
        let footer = modal.querySelector('.license-footer');
        if (!footer) {
            footer = document.createElement('div');
            footer.className = 'license-footer';
            modal.appendChild(footer);
        }

        modal.querySelector('#licenseTextContent').innerHTML = `
            <div style="padding-top: 20px;">
                ${list.type === 'online' && window.ExploreLists ? window.ExploreLists.renderSetting(list.visibility, false) : ''}

                <div class="input-group checkbox-row" style="margin-top: 15px;">
                    <label for="editListLock">Lock list (Read-only)</label>
                    <input type="checkbox" id="editListLock" ${list.locked ? 'checked' : ''} onchange="if(window.CustomLists.updateFormState) window.CustomLists.updateFormState(false)">
                </div>

                <div class="input-group" style="margin-top: 15px;">
                    <label id="editListPassLabel">${list.hasPassword ? 'New Password (leave blank to keep current)' : 'Set Password'}</label>
                    <input type="password" id="editListPass" name="sophdict_list_password" placeholder="${list.hasPassword ? 'Leave blank to keep current' : 'Optional'}" autocomplete="new-password">
                </div>
                
                <div id="settings-error" style="color: #ff4b6b; margin-top: 10px; font-size: 14px;"></div>

                <div style="margin-top: 30px; margin-bottom: 20px;">
                    <h3 style="color: var(--text-main); font-size: 16px; margin-bottom: 10px;">Manage Words</h3>
                    <div>
                        ${list.words.length === 0 ? '<div style="color: var(--text-sub); text-align: center;">No words in list.</div>' :
                            list.words.map(w => `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 5px 0px 5px 0px; border-bottom: 1px solid var(--border-color);">
                                    <span style="color: var(--text-main); font-weight: 500;">${w}</span>
                                    ${this.canEditList(name) ? `<button class="action-btn" style="background: #ff4b6b; padding: 4px 10px; font-size: 12px;" onclick="CustomLists.handleRemoveFromSettings('${w}', '${name}', event)">Remove</button>` : ''}
                                </div>
                            `).join('')}
                    </div>
                </div>
            </div>
        `;

        footer.style.display = 'flex';
        footer.innerHTML = `
            <div style="display: flex; gap: 10px; justify-content: flex-end; width: 100%;">
                <button class="action-btn" onclick="CustomLists.saveSettings('${name}')">Save</button>
                <button class="action-btn" style="background: #ff4b6b;" onclick="CustomLists.deleteList('${name}')">Delete</button>
                <button class="license-close-btn" style="margin: 0;" onclick="CustomLists.closeSettings()">Close</button>
            </div>
        `;

        modal.classList.add('active');
        UIUtils.updateSharedDimmer();
        UIUtils.setupQuickClose(dimmer, () => this.closeSettings());
        setTimeout(() => this.updateFormState(false), 0);
    },

    closeSettings() {
        const modal = document.getElementById('licenseModal');
        if (modal) {
            modal.classList.remove('active');
            const footer = modal.querySelector('.license-footer');
            if (footer) footer.style.display = 'none';
        }
        UIUtils.updateSharedDimmer();
    },

    async saveSettings(name) {
        const list = this.lists[name];
        const newPass = document.getElementById('editListPass').value;
        const errorDiv = document.getElementById('settings-error');
        
        const visInput = document.querySelector('input[name="editListVisibility"]:checked');
        const visibility = visInput ? visInput.value : list.visibility;
        const hide = (visibility === 'private');
        const lockCb = document.getElementById('editListLock');
        const lock = lockCb ? lockCb.checked : list.locked;
        const finalLock = lock || hide;

        if ((hide || finalLock) && !list.hasPassword && !newPass) {
            if (errorDiv) errorDiv.innerText = "A password is required for private or locked lists.";
            return;
        }

        list.locked = finalLock;
        if (visInput) {
            list.visibility = visibility;
            list.hidden = hide;
        }

        // Handle password change
        if (newPass) {
            if (list.type === 'online') {
                // Change password via backend endpoint
                const headers = { 'Content-Type': 'application/json' };
                const token = this._getToken(name);
                if (token) headers['Authorization'] = `Bearer ${token}`;
                try {
                    const resp = await fetch('/api/custom-lists?action=change-password', {
                        method: 'POST',
                        headers,
                        body: JSON.stringify({ name, newPassword: newPass })
                    });
                    if (resp.ok) {
                        const result = await resp.json();
                        if (result.token) sessionStorage.setItem(`auth_token_${name}`, result.token);
                        list.hasPassword = true;
                    } else {
                        const errData = await resp.json().catch(() => ({}));
                        if (errorDiv) errorDiv.innerText = errData.error || 'Failed to change password.';
                        return; // Stop saving settings
                    }
                } catch (e) {
                    if (errorDiv) errorDiv.innerText = 'Network error during password change.';
                    return;
                }
            } else {
                // Local list: hash and store client-side
                const salt = this._generateSalt();
                list.passwordHash = await this._hashLocal(newPass, salt);
                list.passwordSalt = salt;
                list.hasPassword = true;
                sessionStorage.setItem(`auth_local_${name}`, 'true');
            }
        }

        // Build a clean copy for online save (strip local-only fields)
        const saveData = { ...list };
        delete saveData.password; // ensure no legacy field leaks

        this.saveLocalLists();
        this._lastSaveTime = Date.now();
        if (list.type === 'online') await this.saveOnlineList(name, saveData);
        this.closeSettings();
        this.renderListView(name);
    },

    async handleRemoveFromSettings(word, name, event) {
        await this.removeWordFromList(word, name, event);
        this.renderSettingsUI(name);
    },

    deleteList(name) {
        delete this.lists[name];
        if (!this.deleteMode) {
            this.saveLocalLists();
        }
        this.closeSettings();
        if (window.AppClearSearch) window.AppClearSearch(true);
    },

    toggleDeleteMode() {
        if (!this.deleteMode) {
            // Entering delete mode, backup current lists
            this._backupLists = JSON.parse(JSON.stringify(this.lists));
        } else {
            // Exiting delete mode (Save), persist changes
            this.saveLocalLists();
            this._backupLists = null;
        }
        this.deleteMode = !this.deleteMode;
        if (window.AppClearSearch) window.AppClearSearch(true);
    },

    cancelDeleteMode() {
        if (this.deleteMode && this._backupLists) {
            // Restore from backup
            this.lists = this._backupLists;
            this._backupLists = null;
        }
        this.deleteMode = false;
        if (window.AppClearSearch) window.AppClearSearch(true);
    },

    renderPasswordPrompt(name, list) {
        const container = document.getElementById('results-container');
        container.innerHTML = `
            <div class="password-prompt">
                <h3 style="color: var(--text-main);">${list.hidden ? 'Private List' : 'Password Protected'}</h3>
                <p style="color: var(--text-sub);">This list is protected. Enter password to ${list.hidden ? 'view' : 'edit'}.</p>
                <div class="input-group" style="max-width: 300px; margin: 20px auto;">
                    <input type="password" id="listPassInput" placeholder="Password" autocomplete="current-password"
                        onkeydown="if(event.key==='Enter') CustomLists.checkPassword('${name}')">
                </div>
                <div id="passError" style="color: #ff4b6b; text-align: center; margin-bottom: 10px; font-size: 14px;"></div>
                <div style="display: flex; justify-content: center; gap: 10px;">
                    <button class="action-btn" id="unlockBtn" onclick="CustomLists.checkPassword('${name}')">Unlock</button>
                    ${!list.hidden ? `<button class="action-btn" style="background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color);" onclick="CustomLists.renderListView('${name}')">Cancel</button>` : ''}
                </div>
            </div>
        `;
    },

    async checkPassword(name) {
        const input = document.getElementById('listPassInput').value;
        const list = this.lists[name];
        const errorDiv = document.getElementById('passError');
        const unlockBtn = document.getElementById('unlockBtn');
        if (!input) { if (errorDiv) errorDiv.innerText = 'Please enter a password.'; return; }

        // Disable button during verification
        if (unlockBtn) { unlockBtn.disabled = true; unlockBtn.innerText = 'Verifying...'; }

        try {
            if (list.type === 'online') {
                // Backend verification
                const resp = await fetch('/api/custom-lists?action=verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, password: input })
                });
                if (resp.ok) {
                    const data = await resp.json();
                    sessionStorage.setItem(`auth_token_${name}`, data.token);
                    this.renderListView(name);
                } else {
                    const errData = await resp.json().catch(() => ({}));
                    if (errorDiv) errorDiv.innerText = errData.error || 'Incorrect password.';
                }
            } else {
                // Local list: verify against stored hash
                if (list.passwordHash && list.passwordSalt) {
                    const hash = await this._hashLocal(input, list.passwordSalt);
                    if (hash === list.passwordHash) {
                        sessionStorage.setItem(`auth_local_${name}`, 'true');
                        this.renderListView(name);
                    } else {
                        if (errorDiv) errorDiv.innerText = 'Incorrect password.';
                    }
                } else {
                    if (errorDiv) errorDiv.innerText = 'Password data missing.';
                }
            }
        } catch (e) {
            if (errorDiv) errorDiv.innerText = 'Network error. Please try again.';
        } finally {
            if (unlockBtn) { unlockBtn.disabled = false; unlockBtn.innerText = 'Unlock'; }
        }
    },

    async fetchOnlineList(name) {
         try {
            const resp = await fetch(`/api/custom-lists?action=get&name=${encodeURIComponent(name)}&t=${Date.now()}`);
            if (resp.ok) return await resp.json();
        } catch (e) {}
        return null;
    },

    async showHeartMenu(word, element) {
        const listNames = Object.keys(this.lists);
        const cleanWord = (word || "").trim().toLowerCase();
        const isPinned = await DBManager.isPinned(cleanWord);

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
                const canEdit = this.canEditList(name);

                if (inList) {
                    return `<div class="heart-menu-item" style="color: #ff4b6b;" onclick="${!canEdit ? '' : `CustomLists.removeWordFromList('${cleanWord}', '${name}');`} document.querySelector('.heart-menu')?.remove();">Remove from ${name}${!canEdit ? ' (Locked)' : ''}</div>`;
                } else {
                    return `<div class="heart-menu-item" style="${!canEdit ? 'opacity: 0.5; cursor: not-allowed;' : ''}" onclick="${!canEdit ? '' : `CustomLists.addWordToList('${cleanWord}', '${name}')`}">${name}${!canEdit ? ' (Locked)' : ''}</div>`;
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
        
        // Changed to use Edit permission check
        if (!list || !this.canEditList(listName)) return;

        if (list.words.includes(cleanWord)) return;

        const data = await APIClient.fetchWordData(cleanWord);
        if (!data || data.error || !data.dictionary || data.dictionary.length === 0) {
            return;
        }

        list.words.push(cleanWord);

        if (list.type === 'online') {
            await this.saveOnlineList(listName, list);
        }

        this.saveLocalLists();
        this._lastSaveTime = Date.now();

        if (window.location.pathname === `/listname/${encodeURIComponent(listName)}` || window.location.pathname === `/llistname/${encodeURIComponent(listName)}`) {
            this.renderListView(listName);
        }

        document.querySelector('.heart-menu')?.remove();
    }
};
