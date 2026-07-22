window.UIUtils = {
    cleanMWText(text) {
        if (!text) return "";
        return text
            .replace(/[\s\.]*\{bc\}/g, '; ')
            .replace(/\{[a-z0-9\_]+\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{it\}|\{\/it\}|\{wi\}|\{\/wi\}/g, '')
            .replace(/\{[^}]+\}/g, '')
            .trim()
            .replace(/^;\s*/, '')
            .replace(/^""/, '"')
            .replace(/""$/, '"');
    },

    cleanMWExample(text, headword = null) {
        if (!text) return "";
        let cleaned = text
            .replace(/\{bc\}/g, '')
            .replace(/\{a_link\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{d_link\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{sx\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{it\}|\{\/it\}/g, '')
            .replace(/\{wi\}([^}]+)\{\/wi\}/g, '___BOLD_START___$1___BOLD_END___');

        if (headword) {
            const base = headword.replace(/\*/g, '').toLowerCase();
            const variants = [base];
            if (base.endsWith('y')) variants.push(base.slice(0, -1) + 'ie');
            else if (base.endsWith('e')) variants.push(base.slice(0, -1));

            variants.sort((a, b) => b.length - a.length);

            variants.forEach(v => {
                const escapedV = v.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
                const regex = new RegExp(`\\b(${escapedV}(?:ing|ed|s|es|ly)?)\\b`, 'gi');

                const parts = cleaned.split(/(___BOLD_START___[\s\S]*?___BOLD_END___)/g);
                cleaned = parts.map(part => {
                    if (part.startsWith('___BOLD_START___') && part.endsWith('___BOLD_END___')) {
                        return part;
                    }
                    return part.replace(regex, '___BOLD_START___$1___BOLD_END___');
                }).join('');
            });
        }

        return cleaned
            .replace(/___BOLD_START___/g, '<b>')
            .replace(/___BOLD_END___/g, '</b>')
            .replace(/\{[^}]+\}/g, '')
            .trim();
    },

    stripTags(html) {
        if (!html) return "";
        return html.replace(/<\/?[^>]+(>|$)/g, "").trim();
    },

    attachInlineTTS(container) {
        container.querySelectorAll('.tts-inline-target').forEach(span => {
            const text = span.dataset.text;
            span.appendChild(TTSManager.createButton(text));
        });
        if (window.TranslationManager) {
            window.TranslationManager.attachInlineTranslation(container);
        }
    },

    extractLinks(data) {
        const words = new Set();
        const { word, thesaurus, dictionary } = data;
        if (Array.isArray(thesaurus)) {
            thesaurus.forEach(entry => {
                if (entry.meta) {
                    if (Array.isArray(entry.meta.syns)) entry.meta.syns.flat().forEach(w => words.add(w));
                    if (Array.isArray(entry.meta.ants)) entry.meta.ants.flat().forEach(w => words.add(w));
                }
                if (Array.isArray(entry.def)) {
                    entry.def.forEach(d => {
                        if (d.sseq) {
                            d.sseq.flat().forEach(sen => {
                                const sData = sen[1];
                                if (sData) {
                                    ['syn_list', 'ant_list', 'rel_list', 'near_list', 'sim_list', 'opp_list'].forEach(k => {
                                        if (sData[k]) sData[k].flat().forEach(sw => words.add(sw.wd));
                                    });
                                }
                            });
                        }
                    });
                }
            });
        }
        if (Array.isArray(dictionary)) {
            dictionary.forEach(entry => {
                if (Array.isArray(entry.uro)) {
                    entry.uro.forEach(u => { if (u.ure) words.add(u.ure.replace(/\*/g, '')); });
                }
                const entryStr = JSON.stringify(entry);
                const sxMatches = entryStr.match(/\{sx\|([^}|]+)/g);
                if (sxMatches) sxMatches.forEach(m => {
                    const w = m.split('|')[1];
                    if (w) words.add(w.toLowerCase());
                });
            });
        }
        words.delete(word.toLowerCase());
        return Array.from(words).map(w => w.toLowerCase().trim()).filter(w => w && w.length > 1 && w.length < 30 && !w.includes(' '));
    },

    renderWordOrigin(data) {
        const { dictionary, thesaurus } = data;
        const entries = [...(Array.isArray(dictionary) ? dictionary : []), ...(Array.isArray(thesaurus) ? thesaurus : [])];
        if (entries.length === 0) return "";
        let etymology = "";
        for (const entry of entries) {
            if (entry.et && Array.isArray(entry.et)) {
                const etNode = entry.et.find(node => node[0] === 'text');
                if (etNode && etNode[1]) { etymology = etNode[1]; break; }
                if (entry.et[0] && entry.et[0][1]) { etymology = entry.et[0][1]; break; }
            }
        }
        if (!etymology) return "";
        return `
            <div class="context-card origin-card" style="margin-top: 20px; border-left: 4px solid var(--accent);">
                <div class="context-type">Word Origin</div>
                <div class="definition">${this.cleanMWText(etymology)}</div>
            </div>
        `;
    },

    reclassifyMetadata(sData) {
        if (!sData.near_list && !sData.ant_list) return;
        const superlatives = new Set(['excellent', 'superb', 'wonderful', 'great', 'terrific', 'fantastic', 'outstanding', 'exceptional', 'supreme', 'perfect', 'a1', 'top-notch', 'tip-top', 'first-rate', 'marvelous', 'magnificent', 'stellar', 'superlative', 'preeminent', 'peerless', 'matchless', 'unparalleled', 'exquisite', 'optimum', 'optimal', 'divine', 'heavenly', 'ideal', 'flawless', 'impeccable', 'unsurpassed', 'prime', 'choice', 'prize', 'fabulous', 'grand', 'sensational', 'stellar', 'sterling', 'superior', 'top', 'banner', 'boss', 'capital', 'classic', 'crackerjack', 'dandy', 'groovy', 'keen', 'neat', 'nifty', 'noble', 'terrific']);
        const moveFromList = (listKey, targetKey) => {
            if (!sData[listKey]) return;
            const newSource = [];
            const newTarget = sData[targetKey] ? [...sData[targetKey]] : [];
            let moved = false;
            sData[listKey].forEach(group => {
                if (group.some(w => superlatives.has(w.wd.toLowerCase()))) {
                    newTarget.push(group);
                    moved = true;
                } else {
                    newSource.push(group);
                }
            });
            if (moved) {
                sData[listKey] = newSource.length > 0 ? newSource : null;
                sData[targetKey] = newTarget;
            }
        };
        moveFromList('near_list', 'rel_list');
        moveFromList('ant_list', 'rel_list');
    },

    setupQuickClose(element, callback) {
        if (!element) return;

        element.onclick = (e) => {
            if (e.target === element) {
                e.preventDefault();
                e.stopPropagation();
                if (callback) callback();
                else {
                    if (window.ModalManager) window.ModalManager.hide();
                    if (window.StatsManager && document.getElementById('statsPanel')?.style.display === 'flex') {
                        window.StatsManager.togglePanel();
                    }
                    if (window.AppClosePinnedPanel) window.AppClosePinnedPanel();
                }
            }
        };

        if (!element._swipeInit) {
            element._swipeInit = true;
            let start = 0;
            // Block background scrolling while touching the dimmer
            element.addEventListener('touchmove', (e) => { if (e.cancelable) e.preventDefault(); }, { passive: false });
            element.addEventListener('touchstart', () => { start = Date.now(); }, { passive: true });
            element.addEventListener('touchend', (e) => {
                const duration = Date.now() - start;
                if (start > 0 && duration < 200) {
                    // Prevent ghost click and trigger cleanup
                    if (e.cancelable) e.preventDefault();
                    element.click();
                }
                start = 0;
            }, { passive: false });
        }
    },

    updateSharedDimmer() {
        const dimmer = document.getElementById('microDimmer');
        const loader = document.getElementById('loader');
        if (!dimmer) return;

        const isModalOpen = document.getElementById('microWindow')?.style.display === 'flex';
        const isStatsOpen = document.getElementById('statsPanel')?.style.display === 'flex';
        const isPinnedOpen = document.getElementById('pinnedPanel')?.style.display === 'block';

        if (isModalOpen || isStatsOpen || isPinnedOpen) {
            dimmer.style.display = 'block';
            document.body.classList.add('modal-open');
            // Ensure the dimmer is always clickable when shown
            this.setupQuickClose(dimmer);
        } else {
            dimmer.style.display = 'none';
            // Only remove modal-open if the loader isn't active either
            if (!loader || loader.style.display !== 'flex') {
                document.body.classList.remove('modal-open');
            }
        }
    }
};
