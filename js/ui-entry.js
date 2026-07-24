window.UIEntry = {
    async render(data, containerId = 'results-container', targetContext = null) {
        try {
            const targetContainer = document.getElementById(containerId);
            if (!targetContainer) return;

            if (data.error) {
                const word = data.word || "";
                if (containerId === 'results-container') {
                    targetContainer.innerHTML = `
                        <div class="word-header">
                            <div class="title-row">
                                <div class="word-info">
                                    <div style="display: flex; align-items: center; ">
                                        <div class="pron-row"></div>
                                        <div style="display: flex; flex-direction: column;">
                                            <h1 class="word-title">${word}</h1>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div style="padding:40px; text-align:center; color:var(--text-sub);">
                            ${data.error === 'Network error' ? 'Network error. Please check your connection.' : 'Word not found in dictionary.'}
                        </div>
                    `;
                    const pronRow = targetContainer.querySelector('.pron-row');
                    if (pronRow && word) pronRow.appendChild(TTSManager.createButton(word));
                } else {
                    targetContainer.innerHTML = `<div style="padding:40px; text-align:center;">Word not found</div>`;
                }
                return;
            }

            const { word, dictionary, thesaurus } = data;
            const dictArr = Array.isArray(dictionary) ? dictionary : [];
            const mainEntry = dictArr.find(e => e.meta?.id?.split(':')[0] === word) || dictArr[0];
            const pronunciation = mainEntry?.hwi?.prs?.[0]?.mw || '';
            const isPinned = await DBManager.isPinned(word);
            const isAcademic = window.ACADEMIC_WORDS && window.ACADEMIC_WORDS.has(word.toLowerCase());

            if (containerId === 'results-container') {
                targetContainer.innerHTML = `
                    <div class="word-header">
                        <div class="title-row">
                            <div class="word-info">
                                <div style="display: flex; align-items: center; ">
                                    <div class="pron-row"></div>
                                    <div style="display: flex; flex-direction: column;">
                                        <div style="display: flex; align-items: center;">
                                            <h1 class="word-title">${word}</h1>
                                            ${isAcademic ? `<span class="ielts-header-tag header-tag-academic" style="background-color:#e1364f; box-shadow: 0 2px 4px rgba(225, 54, 79, 0.3);">Academic</span>` : ''}
                                        </div>
                                        <div style="display: flex; align-items: baseline; flex-wrap: wrap; gap: 5px;">
                                            <span class="pronunciation">/${pronunciation}/</span>
                                            ${this.renderHeaderVariants(mainEntry)}
                                            ${this.renderHeaderInflections(mainEntry)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div style="display:flex; flex-direction:column; align-items:flex-end;">
                                <div id="offline-status-container" style="display:flex; align-items:baseline; gap:5px;">
                                    <div id="page-fetch-status" class="fetch-progress-meter" style="font-weight: bold; font-size: 10px; margin: -10px 0 -10px 0"></div>
                                    <span style="font-size:12px; color:var(--text-sub);">words offline</span>
                                </div>
                                <div style="display:flex; align-items:center;">
                                    <div id="fetch-ui-container" class="fetch-ui-container">
                                        <button class="icon-btn fetch-btn" title="Download all words from tags" onclick="PreFetcher.showInput()">
                                            <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1f1f1f"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/></svg>
                                        </button>
                                    </div>
                                    <span class="pin-btn-main"></span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div id="content-body"></div>
                `;
                const pronRow = targetContainer.querySelector('.pron-row');
                if (pronRow) pronRow.appendChild(TTSManager.createButton(word));

                const pinMain = targetContainer.querySelector('.pin-btn-main');
                if (pinMain) {
                    const pinBtn = document.createElement('span');
                    pinBtn.className = `pin-btn ${isPinned ? 'active' : ''}`;
                    pinBtn.setAttribute('tabindex', '0');
                    pinBtn.style.color = isPinned ? '#ff4b6b' : '#8b8b8b';
                    const heartEmpty = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/></svg>`;
                    const heartFilled = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"/></svg>`;
                    pinBtn.innerHTML = isPinned ? heartFilled : heartEmpty;
                    pinBtn.onclick = async () => {
                        const active = await PinManager.togglePin(word);
                        pinBtn.classList.toggle('active', active);
                        pinBtn.style.color = active ? '#ff4b6b' : '#8b8b8b';
                        pinBtn.innerHTML = active ? heartFilled : heartEmpty;
                    };
                    pinMain.appendChild(pinBtn);
                }

                const body = document.getElementById('content-body');
                if (body) {
                    let html = UIThesaurus.generateHtml(data);
                    html += UIUtils.renderWordOrigin(data);
                    body.innerHTML = html;
                    PreFetcher.updatePageStatus(); // Initialize persistent meter
                }
                if (containerId === 'results-container') {
                    window.scrollTo({ top: 0, behavior: 'instant' });
                }
            } else {
                const headerTop = document.querySelector('.micro-header-top');
                if (headerTop) {
                    const dictArr = Array.isArray(dictionary) ? dictionary : [];
                    const mainEntry = dictArr.find(e => e.meta?.id?.split(':')[0] === word) || dictArr[0];
                    const pronunciation = mainEntry?.hwi?.prs?.[0]?.mw || '';
                    const stems = mainEntry?.meta?.stems?.filter(s => s !== word) || [];

                    headerTop.innerHTML = `
                        <div class="micro-pron-row" style="flex-shrink: 0; display: flex; align-items: center;"></div>
                        <div style="display: flex; flex-direction: column; min-width: 0; flex: 1; overflow-x: auto; overflow-y: hidden;">
                            <div style="display: flex; width: max-content;">
                                <h2 class="micro-title" style="margin:0; line-height:1.2;">${word}</h2>
                                ${this.renderStemsColumns(stems)}
                            </div>
                            <div style="display: flex; gap: 5px; font-size: 0.9em; width: max-content;">
                                <span class="micro-pronunciation" style="line-height:1.2;">/${pronunciation}/</span>
                                ${this.renderHeaderVariants(mainEntry, true)}
                                ${this.renderHeaderInflections(mainEntry)}
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap: 8px; flex-shrink: 0; margin-left: 10px;">
                            <div id="microPin"></div>
                        </div>
                    `;
                    const pronRow = headerTop.querySelector('.micro-pron-row');
                    if (pronRow) {
                        const newTTS = TTSManager.createButton(word);
                        pronRow.appendChild(newTTS);
                    }

                    const mPin = headerTop.querySelector('#microPin');

                    if (mPin) {
                        mPin.className = `pin-btn ${isPinned ? 'active' : ''}`;
                        mPin.setAttribute('tabindex', '0');
                        mPin.style.color = isPinned ? '#ff4b6b' : '#8b8b8b';
                        const heartEmpty = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/></svg>`;
                        const heartFilled = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/></svg>`;
                        mPin.innerHTML = isPinned ? heartFilled : heartEmpty;
                        mPin.onclick = async () => {
                            const active = await PinManager.togglePin(word);
                            mPin.classList.toggle('active', active);
                            mPin.style.color = active ? '#ff4b6b' : '#8b8b8b';
                            mPin.innerHTML = active ? heartFilled : heartEmpty;
                        };
                    }
                    UIUtils.attachInlineTTS(headerTop);
                }

                const oldTitleRow = document.querySelector('.micro-title-row');
                if (oldTitleRow) oldTitleRow.style.display = 'none';
                const mInfo = document.getElementById('microInfo');
                if (mInfo) mInfo.style.display = 'none';

                if (typeof UIDictionary === 'undefined') {
                    console.error("UIDictionary is not defined");
                    targetContainer.innerHTML = `<div style="padding:40px; text-align:center;">Error: UI components not loaded properly.</div>`;
                    return;
                }

                let html = UIDictionary.generateHtml(data, targetContext, true);
                html += `<button id="full-page-btn" class="view-full-btn">View Full Main Page</button>`;
                targetContainer.innerHTML = html;
                PreFetcher.updatePageStatus(); // Initialize persistent meter

                const fullPageBtn = document.getElementById('full-page-btn');
                if (fullPageBtn) {
                    fullPageBtn.onclick = () => {
                        // Close modal without history.back() to avoid navigation conflicts
                        if (window.ModalManager) {
                            if (window.ModalManager.win) window.ModalManager.win.style.display = 'none';
                            UIUtils.updateSharedDimmer();
                            if (window.ScrollFixer) window.ScrollFixer.restore();
                        }
                        // Perform the main search which will update the URL to /word
                        window.AppSearch(word);
                    };
                }
            }

            UIUtils.attachInlineTTS(targetContainer);
            PreFetcher.addToQueue(UIUtils.extractLinks(data));
        } catch (err) {
            console.error("[UI] Render Error:", err);
            const targetContainer = document.getElementById(containerId);
            if (targetContainer) {
                targetContainer.innerHTML = `<div style="padding:40px; text-align:center;">An error occurred while rendering.</div>`;
            }
        }
    },

    renderHeaderVariants(entry, isMicro = false) {
        if (!entry?.vrs) return "";
        return entry.vrs.map(v => {
            const label = v.vl ? `<span style="color:var(--text-sub); margin-right:4px;">${v.vl}</span>` : "";
            const style = isMicro ? "font-weight:500; color:var(--text-main);" : "font-weight:600; color:var(--accent);";
            return `<span style="${style}">${label}${v.va}</span>`;
        }).join(" ");
    },

    renderHeaderInflections(entry) {
        if (!entry?.ins) return "";
        return entry.ins.map(i => {
            const label = i.il ? `<span style="color:var(--text-sub); margin-right:4px;">${i.il}</span>` : "";
            return `<span style="color:var(--text-main); font-weight:500;">${label}${i.if}</span>`;
        }).join(", ");
    },

    renderStemsColumns(stems) {
        if (!stems || stems.length === 0) return "";

        let html = `<div class="micro-stems-container">`;

        for (let i = 0; i < stems.length; i += 3) {
            const column = stems.slice(i, i + 3);
            html += `<div style="display: flex; flex-direction: column;">
                ${column.map(s => `<span>${s}</span>`).join('')}
            </div>`;
        }

        html += `</div>`;
        return html;
    }
};
