(function() {
    const host = window.location.hostname;
    if (host.split('.').length === 2 && !host.startsWith('www.') && !['localhost', '127.0.0.1'].includes(host)) {
        window.location.replace(window.location.protocol + '//www.' + host + window.location.pathname + window.location.search);
    }
})();

window.toggleSideList = () => {
    const p = document.getElementById('sideListPanel'), md = document.getElementById('microDimmer');
    if (!p) return;
    const isActive = p.classList.toggle('active');
    UIUtils.updateSharedDimmer();
    if (isActive && md) UIUtils.setupQuickClose(md, window.closeSideList);
};
window.closeSideList = () => {
    const p = document.getElementById('sideListPanel');
    if (p) p.classList.remove('active');
    UIUtils.updateSharedDimmer();
};

window.renderSideListContent = () => {
    const content = document.getElementById('sideListContent');
    if (!content) return;

    const isDeleteMode = window.CustomLists?.deleteMode;
    const customListsHtml = Object.entries(window.CustomLists?.lists || {})
        .map(([name]) => {
            if (isDeleteMode) {
                return `
                    <button class="academic-list-trigger list-btn-delete" onclick="CustomLists.deleteList('${name}')">
                        ${name} <span style="font-size: 16px;">&times;</span>
                    </button>
                `;
            }
            const list = window.CustomLists?.lists[name];
            const prefix = list?.type === 'local' ? '/llistname/' : '/listname/';
            return `
                <button class="academic-list-trigger list-btn-custom" onclick="window.closeSideList(); window.history.pushState({}, '', '${prefix}${encodeURIComponent(name)}'); CustomLists.handleRoute();">${name}</button>
            `;
        }).join('');

    const deleteControl = isDeleteMode ? `
        <div style="display: flex; gap: 5px; width: 100%; margin-top: 10px;">
            <button class="action-btn" onclick="CustomLists.toggleDeleteMode()" style="flex: 1; padding: 10px; border-radius: 12px; background: var(--accent);">Save</button>
            <button class="action-btn" onclick="CustomLists.cancelDeleteMode()" style="flex: 1; padding: 10px; border-radius: 12px; background: var(--card-bg); color: var(--text-main); border: 1px solid var(--border-color); border-radius: 15px;">Cancel</button>
        </div>
    ` : `
        <div style="display: flex; gap: 5px; margin-top: 10px;">
            <button class="academic-list-trigger" onclick="CustomLists.toggleDeleteMode()" title="Remove Lists" style="flex: 1; background: var(--card-bg); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; padding: 12px; border-radius: 12px;">
                ${window.CustomLists?.icons?.trash || ''}
            Delete</button>
            <button class="academic-list-trigger" onclick="window.closeSideList(); window.history.pushState({}, '', '/create-list'); CustomLists.handleRoute();" title="Create Custom List" style="flex: 1; background: var(--card-bg); border: 1px solid var(--border-color); display: flex; align-items: center; justify-content: center; padding: 12px; border-radius: 12px;">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M440-440H200v-80h240v-240h80v240h240v80H520v240h-80v-240Z"/></svg>
            Add</button>
        </div>
    `;

    content.innerHTML = `
        <button class="academic-list-trigger list-btn-academic" onclick="window.closeSideList(); AcademicList.open('academic')">570 Academic Words</button>
        <button class="academic-list-trigger list-btn-c2" onclick="window.closeSideList(); FormalList.open('c2')">C2 Words</button>
        <button class="academic-list-trigger list-btn-c1" onclick="window.closeSideList(); FormalList.open('c1')">C1 Words</button>
        <button class="academic-list-trigger list-btn-b2" onclick="window.closeSideList(); FormalList.open('b2')">B2 Words</button>
        <button class="academic-list-trigger list-btn-b1" onclick="window.closeSideList(); FormalList.open('b1')">B1 Words</button>
        <button class="academic-list-trigger list-btn-a2" onclick="window.closeSideList(); FormalList.open('a2')">A2 Words</button>
        <button class="academic-list-trigger list-btn-a1" onclick="window.closeSideList(); FormalList.open('a1')">A1 Words</button>
        ${customListsHtml}
        ${deleteControl}
    `;
};

window.RestoreSearchUI = () => {
    const sc = document.querySelector('.search-container'), h = document.getElementById('appHeader');
    if (!sc || !h) return;
    sc.classList.remove('input-focused');
    if (sc.parentElement !== h) h.appendChild(sc);
    const wi = document.getElementById('wordInput'), st = document.getElementById('statsToggleBtn'), ts = document.getElementById('textScaleToggleBtn'), pt = document.getElementById('pinnedToggleBtn'), bx = document.getElementById('suggestions-box');
    if (st && wi) sc.insertBefore(st, wi);
    if (ts) sc.appendChild(ts); if (pt) sc.appendChild(pt); if (bx) sc.appendChild(bx);
};

window.AppSearch = async (target, isSilent = false, isHistoryNav = false) => {
    const wordInput = document.getElementById('wordInput');
    const word = (target || wordInput?.value || "").trim().toLowerCase();
    if (!word) return false;
    const loader = document.getElementById('loader');
    if (window.PreFetcher) window.PreFetcher.reset();
    if (!isSilent) {
        if (loader) {
            loader.style.display = 'flex';
            document.body.classList.add('modal-open');
        }
        ModalManager.hide(true);
        if (window.StatsManager) window.StatsManager.hide(true);
    }
    try {
        const data = await APIClient.fetchWordData(word);
        if (data && !data.error) {
            window.RestoreSearchUI();
            if (window.StatsManager) window.StatsManager.recordSearch(word);
            document.body.classList.remove('home-state');
            await UIEntry.render(data);
            localStorage.setItem('lastWord', word);
            if (wordInput) wordInput.value = word;
            if (window.HistoryManager && !isHistoryNav) window.HistoryManager.addToRAM(word);
            return true;
        } else if (!isSilent) {
            window.RestoreSearchUI();
            document.body.classList.remove('home-state');
            await UIEntry.render({ ...(data || {}), word: word });
            UIUtils.updateSharedDimmer();
            if (isHistoryNav) window.AppClearSearch();
        } else if (isSilent && !isHistoryNav) {
            window.AppClearSearch();
        }
    } catch (e) {
        console.error(e);
        window.AppClearSearch();
    }
    finally {
        if (!isSilent && loader) loader.style.display = 'none';
        UIUtils.updateSharedDimmer();
    }
    return false;
};

window.renderHomeLists = () => {
    const root = document.getElementById('home-lists-root');
    if (!root || !window.StatsManager) return;
    const stats = window.StatsManager.stats;
    const ls = Object.entries(stats.wordLastActive || {}).filter(([w]) => !stats.ignoredWords.includes(w)).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
    const lt = Object.entries(stats.tagLastActive || {}).sort((a, b) => b[1] - a[1]).slice(0, 10).map(e => e[0]);
    let h = '';
    const esc = (s) => (s || '').replace(/'/g, "\\'");
    if (ls.length > 0) h += `<div class="home-list-section"><div class="home-list-title">Last Searched</div><div class="home-list-items">${ls.map(w => `<div class="home-list-item" data-word="${esc(w)}" onclick="window.AppSearch('${esc(w)}')"><span>${w}</span><span class="home-list-remove-btn" onclick="window.promptHomeRemoval(this, '${esc(w)}', 'word', event)">&times;</span></div>`).join('')}</div></div>`;
    if (lt.length > 0) h += `<div class="home-list-section"><div class="home-list-title">Last Opened Tags</div><div class="home-list-items">${lt.map(t => `<div class="home-list-item" data-word="${esc(t)}" onclick="window.ModalManager.show('${esc(t)}')"><span>${t}</span><span class="home-list-remove-btn" onclick="window.promptHomeRemoval(this, '${esc(t)}', 'tag', event)">&times;</span></div>`).join('')}</div></div>`;
    root.innerHTML = h;
    if (window.PreFetcher) window.PreFetcher.updatePageStatus();
};

window.promptHomeRemoval = (btn, item, type, event) => {
    if (event) event.stopPropagation();
    if (btn.dataset.confirm === "true") { if (type === 'word') StatsManager.removeWord(item); else StatsManager.removeTag(item); }
    else {
        btn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor"><path d="m400-325 80-80 80 80 51-51-80-80 80-80-51-51-80 80-80-80-51 51 80 80-80 80 51 51Zm-88 181q-29.7 0-50.85-21.15Q240-186.3 240-216v-480h-48v-72h192v-48h192v48h192v72h-48v479.57Q720-186 698.85-165T648-144H312Zm336-552H312v480h336v-480Zm-336 0v480-480Z"/></svg>`;
        btn.dataset.confirm = "true";
        const reset = () => { if (btn && btn.parentNode) { btn.innerHTML = '&times;'; delete btn.dataset.confirm; } document.removeEventListener('click', reset); };
        setTimeout(() => document.addEventListener('click', reset), 10);
    }
};

window.AppClearSearch = (skipPush = false) => {
    if (window.PreFetcher) {
        window.PreFetcher.stopBatch();
        window.PreFetcher.reset();
    }
    const wordInput = document.getElementById('wordInput'),
          rc = document.getElementById('results-container'),
          mw = document.getElementById('microWindow'),
          pp = document.getElementById('pinnedPanel'),
          md = document.getElementById('microDimmer');

    window.RestoreSearchUI();

    if (wordInput) wordInput.value = '';
    if (rc) {
        rc.innerHTML = `
            <button class="side-list-toggle-btn" onclick="window.toggleSideList()" aria-label="Word Lists">
                <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M120-240v-80h720v80H120Zm0-200v-80h720v80H120Zm0-200v-80h720v80H120Z"/></svg>
            </button>
            <div class="welcome-screen">
                <div class="home-settings-bar"></div>
                <img src="sophdict.svg" alt="SophDict" class="welcome-logo"><p class="welcome-text">The Sophisticated Dictionary</p><div class="welcome-hint">Search for definitions, synonyms, and more</div><div id="home-lists-root" class="home-lists-container"></div>
            </div>`;

        const ws = rc.querySelector('.welcome-screen'), currentSc = document.querySelector('.search-container');
        if (ws && currentSc) {
            const logo = ws.querySelector('.welcome-logo');
            if (logo) logo.after(currentSc);

            const hsb = ws.querySelector('.home-settings-bar'),
                  st = document.getElementById('statsToggleBtn'),
                  ts = document.getElementById('textScaleToggleBtn'),
                  pt = document.getElementById('pinnedToggleBtn');
            if (hsb) {
                if (st) hsb.appendChild(st);
                if (pt) hsb.appendChild(pt);
                if (ts) hsb.appendChild(ts);
            }
        }
        window.renderHomeLists();
        window.renderSideListContent();
    }
    localStorage.removeItem('lastWord');
    if (!skipPush && window.location.pathname !== '/') {
        window.history.pushState({}, "", "/");
    }
    document.title = 'SophDict - The Sophisticated Dictionary';
    if (window.StatsManager) window.StatsManager.stopAllTracking();
    if (mw) mw.style.display = 'none';
    if (pp) pp.style.display = 'none';
    if (window.CustomLists) window.CustomLists.closeSettings();
    UIUtils.updateSharedDimmer();
    document.body.classList.add('home-state');
}

(async () => {
    await DBManager.init();
    if (window.TextScaler) window.TextScaler.init();
    if (window.WallpaperManager) await window.WallpaperManager.init();
    if (window.ThemeManager) window.ThemeManager.init();

    // Init CustomLists BEFORE AppClearSearch so buttons appear
    if (window.CustomLists) await window.CustomLists.init();

    TTSManager.init(); ModalManager.init(); KeyboardNavigator.init(); ScrollManager.init();
    const wi = document.getElementById('wordInput'), sb = document.getElementById('search-button'), ll = document.querySelector('.logo-link'), pt = document.getElementById('pinnedToggleBtn'), st = document.getElementById('statsToggleBtn'), ts = document.getElementById('textScaleToggleBtn');

    if (sb) sb.onclick = () => {
        if (document.querySelector('.search-container')?.classList.contains('input-focused')) {
            window.AppSearch(); window.hideSuggestions();
        } else {
            wi.focus();
        }
    };
    if (st && window.StatsManager) st.onclick = () => window.StatsManager.togglePanel();
    if (ts && window.TextScaler) ts.onclick = () => window.TextScaler.show();

    let activeIdx = -1;
    if (wi) {
        wi.onfocus = () => document.querySelector('.search-container')?.classList.add('input-focused');
        wi.onblur = () => setTimeout(() => document.querySelector('.search-container')?.classList.remove('input-focused'), 150);

        wi.onkeydown = (e) => {
            const items = document.querySelectorAll('.suggestion-item');
            if (e.key === 'ArrowDown') {
                e.preventDefault(); e.stopPropagation();
                activeIdx = (activeIdx + 1) % items.length;
                updateSel(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault(); e.stopPropagation();
                activeIdx = (activeIdx - 1 + items.length) % items.length;
                updateSel(items);
            } else if (['Enter', ' ', 'Tab'].includes(e.key)) {
                if (activeIdx > -1 && items[activeIdx]) {
                    e.preventDefault(); e.stopPropagation();
                    const w = items[activeIdx].innerText.trim();
                    wi.value = w;
                    window.AppSearch(w);
                    window.hideSuggestions();
                } else if (e.key === 'Enter') {
                    e.stopPropagation();
                    window.AppSearch();
                    window.hideSuggestions();
                }
            } else if (e.key === 'Escape') {
                e.stopPropagation();
                window.hideSuggestions();
            }
        };
        let inputTimeout;
        wi.oninput = async () => {
            activeIdx = -1;
            const q = wi.value.trim().toLowerCase();
            if (q.length < 1) { window.hideSuggestions(); return; }

            clearTimeout(inputTimeout);
            inputTimeout = setTimeout(async () => {
                const suggestions = await getOnlineSuggestions(q);
                window.showSuggestions(suggestions);
            }, 100);
        };

        function updateSel(items) {
            items.forEach((it, i) => it.classList.toggle('selected', i === activeIdx));
            if (items[activeIdx]) items[activeIdx].scrollIntoView({ block: 'nearest' });
        }

        const hideOnOutside = (e) => { if (!e.target.closest('.search-container')) window.hideSuggestions(); };
        document.addEventListener('click', hideOnOutside);
        document.addEventListener('focusin', hideOnOutside);
    }
    async function getOnlineSuggestions(q) {
        const target = window.TranslationManager?.targetLanguage || 'tr';
        const isEnabled = window.TranslationManager?.isEnabled || false;
        try {
            const res = await fetch(`/api/suggestions?q=${encodeURIComponent(q)}&target=${target}&enabled=${isEnabled}`);
            return await res.json();
        } catch (e) {
            return [];
        }
    }
    window.showSuggestions = (items) => {
        const box = document.getElementById('suggestions-box');
        if (!box || items.length === 0) { window.hideSuggestions(); return; }

        box.innerHTML = items.map(item => {
            let word, label, icon = '';
            if (typeof item === 'string') {
                word = item; label = item;
            } else {
                word = item.word || item.translated || item.original;
                label = item.word || (item.type === 'translation' ? `Translate: ${item.translated}` : item.original);

                if (item.type === 'translation') icon = '<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor" style="margin-right:8px;"><path d="m480-80-40-120H160q-33 0-56.5-23.5T80-280v-520q0-33 23.5-56.5T160-880h240l35 120h365q35 0 57.5 22.5T880-680v520q0 33-22.5 56.5T800-80H480ZM286-376q69 0 113.5-44.5T444-536q0-8-.5-14.5T441-564H283v62h89q-8 28-30.5 43.5T287-443q-39 0-67-28t-28-69q0-41 28-69t67-28q18 0 34 6.5t29 19.5l49-47q-21-22-50.5-34T286-704q-67 0-114.5 47.5T124-540q0 69 47.5 116.5T286-376Zm268 20 22-21q-14-17-25.5-33T528-444l26 88Zm50-51q28-33 42.5-63t19.5-47H507l12 42h40q8 15 19 32.5t26 35.5Zm-84 287h280q18 0 29-11.5t11-28.5v-520q0-18-11-29t-29-11H447l47 162h79v-42h41v42h146v41h-51q-10 38-30 74t-47 67l109 107-29 29-108-108-36 37 32 111-80 80Z"/></svg>';
                else if (item.type === 'sentence') icon = '<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor" style="margin-right:8px;"><path d="M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z"/></svg>';
                else if (item.type === 'dictionary') icon = '<svg xmlns="http://www.w3.org/2000/svg" height="18px" viewBox="0 -960 960 960" width="18px" fill="currentColor" style="margin-right:8px;"><path d="M560-320h160v-80H560v80Zm0-160h160v-80H560v80ZM240-160q-33 0-56.5-23.5T160-240v-560q0-33 23.5-56.5T240-880h480q33 0 56.5 23.5T800-800v560q0 33-23.5 56.5T720-160H240Zm0-80h480v-560H240v560Zm0 0v-560 560Z"/></svg>';
            }

            return `<div class="suggestion-item" onclick="window.AppSearch('${word.replace(/'/g, "\\'")}'); window.hideSuggestions();"><span style="display:flex; align-items:center;">${icon}${label}</span></div>`;
        }).join('');
        box.style.display = 'block';
    };
    window.hideSuggestions = () => { const box = document.getElementById('suggestions-box'); if (box) box.style.display = 'none'; };
    if (ll) ll.onclick = (e) => { e.preventDefault(); window.AppClearSearch(); };
    let pinnedTrigger = null;
    window.AppClosePinnedPanel = (fromHistory = false) => {
        if (fromHistory instanceof Event) fromHistory = false;
        const pp = document.getElementById('pinnedPanel');
        if (pp && pp.style.display !== 'none') {
            pp.style.display = 'none';
            UIUtils.updateSharedDimmer();
            if (window.ScrollFixer) window.ScrollFixer.restore();
            if (pinnedTrigger) pinnedTrigger.focus({ preventScroll: true });

            if (!fromHistory && window.history.state?.favorites) {
                window.history.back();
            }
        }
    };
    if (pt) pt.onclick = () => {
        const pp = document.getElementById('pinnedPanel'), md = document.getElementById('microDimmer');
        if (pp.style.display === 'block') window.AppClosePinnedPanel();
        else {
            pinnedTrigger = document.activeElement;
            pp.style.display = 'block';
            UIUtils.updateSharedDimmer();
            if (md) UIUtils.setupQuickClose(md, () => window.AppClosePinnedPanel());
            PinManager.renderList(w => { window.AppClosePinnedPanel(); window.AppSearch(w); });
            window.history.pushState({ favorites: true }, "");
        }
    };
    document.addEventListener('click', (e) => {
        const tag = e.target.closest('.tag');
        if (tag) ModalManager.show(tag.dataset.word, tag.closest('.context-card')?.querySelector('.context-type')?.innerText.trim().toLowerCase());
    });
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.AppClearSearch();
    }

    if (window.PinManager) PinManager.init();
    if (window.AcademicList) AcademicList.init();
    if (window.FormalList) FormalList.init();
    if (window.FeedbackSupport) FeedbackSupport.init();

    window.updateNetworkStatus = () => {
        const isOffline = !navigator.onLine;
        document.body.classList.toggle('is-offline', isOffline);
        if (window.PreFetcher) window.PreFetcher.updatePageStatus();
    };
    window.addEventListener('online', window.updateNetworkStatus);
    window.addEventListener('offline', window.updateNetworkStatus);
    window.updateNetworkStatus();
})();
