(function() {
    const host = window.location.hostname;
    if (host.split('.').length === 2 && !host.startsWith('www.') && !['localhost', '127.0.0.1'].includes(host)) {
        window.location.replace(window.location.protocol + '//www.' + host + window.location.pathname + window.location.search);
    }
})();

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
    }
    try {
        const data = await APIClient.fetchWordData(word);
        if (data && !data.error) {
            const sc = document.querySelector('.search-container'), h = document.getElementById('appHeader');
            if (sc && h && sc.parentElement !== h) h.appendChild(sc);
            if (window.StatsManager) window.StatsManager.recordSearch(word);
            document.body.classList.remove('home-state');
            await UIEntry.render(data);
            localStorage.setItem('lastWord', word);
            if (wordInput) wordInput.value = word;
            if (window.HistoryManager && !isHistoryNav) window.HistoryManager.addToRAM(word);
            return true;
        } else if (!isSilent) {
            alert('Word not found.');
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
    if (ls.length > 0) h += `<div class="home-list-section"><div class="home-list-title">Last Searched</div><div class="home-list-items">${ls.map(w => `<div class="home-list-item" onclick="window.AppSearch('${w}')"><span>${w}</span><span class="home-list-remove-btn" onclick="window.promptHomeRemoval(this, '${w}', 'word', event)">&times;</span></div>`).join('')}</div></div>`;
    if (lt.length > 0) h += `<div class="home-list-section"><div class="home-list-title">Last Opened Tags</div><div class="home-list-items">${lt.map(t => `<div class="home-list-item" onclick="window.ModalManager.show('${t}')"><span>${t}</span><span class="home-list-remove-btn" onclick="window.promptHomeRemoval(this, '${t}', 'tag', event)">&times;</span></div>`).join('')}</div></div>`;
    root.innerHTML = h;
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
    const wordInput = document.getElementById('wordInput'), rc = document.getElementById('results-container'), mw = document.getElementById('microWindow'), pp = document.getElementById('pinnedPanel'), md = document.getElementById('microDimmer'), sc = document.querySelector('.search-container');
    if (wordInput) wordInput.value = '';
    if (rc) {
        rc.innerHTML = `<div class="welcome-screen"><img src="SophDict.png" alt="SophDict" class="welcome-logo"><p class="welcome-text">The Sophisticated Dictionary</p><div class="welcome-hint">Search for definitions, synonyms, and more</div><div id="home-lists-root" class="home-lists-container"></div></div>`;
        const ws = rc.querySelector('.welcome-screen'), wt = rc.querySelector('.welcome-text');
        if (ws && sc && wt) ws.insertBefore(sc, wt);
        window.renderHomeLists();
    }
    localStorage.removeItem('lastWord');
    if (!skipPush && window.location.pathname !== '/') {
        window.history.pushState({}, "", "/");
    }
    document.title = 'SophDict - The Sophisticated Dictionary';
    if (window.StatsManager) window.StatsManager.stopAllTracking();
    if (mw) mw.style.display = 'none';
    if (pp) pp.style.display = 'none';
    UIUtils.updateSharedDimmer();
    document.body.classList.add('home-state');
    if (window.ScrollFixer) window.ScrollFixer.restore();
};

(async () => {
    await DBManager.init();
    if (window.TextScaler) window.TextScaler.init();
    if (window.WallpaperManager) await window.WallpaperManager.init();
    if (window.ThemeManager) window.ThemeManager.init();
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
        wi.oninput = async () => {
            activeIdx = -1;
            const q = wi.value.trim().toLowerCase();
            if (q.length < 1) { window.hideSuggestions(); return; }
            window.showSuggestions(await getOnlineSuggestions(q));
        };

        function updateSel(items) {
            items.forEach((it, i) => it.classList.toggle('selected', i === activeIdx));
            if (items[activeIdx]) items[activeIdx].scrollIntoView({ block: 'nearest' });
        }

        const hideOnOutside = (e) => { if (!e.target.closest('.search-container')) window.hideSuggestions(); };
        document.addEventListener('click', hideOnOutside);
        document.addEventListener('focusin', hideOnOutside);
    }
    async function getOnlineSuggestions(q) { try { const res = await fetch(`https://api.datamuse.com/sug?s=${q}&max=7`); const d = await res.json(); return d.map(i => i.word); } catch (e) { return []; } }
    window.showSuggestions = (words) => {
        const box = document.getElementById('suggestions-box');
        if (!box || words.length === 0) { window.hideSuggestions(); return; }
        box.innerHTML = words.map(w => `<div class="suggestion-item" onclick="window.AppSearch('${w}'); window.hideSuggestions();"><span>${w}</span></div>`).join('');
        box.style.display = 'block';
    };
    window.hideSuggestions = () => { const box = document.getElementById('suggestions-box'); if (box) box.style.display = 'none'; };
    if (ll) ll.onclick = (e) => { e.preventDefault(); window.AppClearSearch(); };
    let pinnedTrigger = null;
    window.AppClosePinnedPanel = (fromHistory = false) => {
        const pp = document.getElementById('pinnedPanel');
        if (pp) pp.style.display = 'none';
        UIUtils.updateSharedDimmer();
        if (window.ScrollFixer) window.ScrollFixer.restore();
        if (pinnedTrigger) pinnedTrigger.focus({ preventScroll: true });
        if (!fromHistory && window.history.state?.panel) window.history.back();
    };
    if (pt) pt.onclick = () => {
        const pp = document.getElementById('pinnedPanel'), md = document.getElementById('microDimmer');
        if (pp.style.display === 'block') window.AppClosePinnedPanel();
        else {
            pinnedTrigger = document.activeElement;
            pp.style.display = 'block';
            UIUtils.updateSharedDimmer();
            if (md) UIUtils.setupQuickClose(md);
            window.history.pushState({ panel: true }, "");
            PinManager.renderList(w => { window.AppClosePinnedPanel(); window.AppSearch(w); });
        }
    };
    document.addEventListener('click', (e) => {
        const tag = e.target.closest('.tag');
        if (tag) ModalManager.show(tag.dataset.word, tag.closest('.context-card')?.querySelector('.context-type')?.innerText.trim().toLowerCase());
    });
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        window.AppClearSearch();
    }
})();
