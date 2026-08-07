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

    escapeJS(str) {
        if (!str) return "";
        return str.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/"/g, "&quot;");
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

    tagSentence(text) {
        if (!text) return "";
        // Split by whitespace but keep punctuation attached to words for display,
        // while using cleaned words for data-word.
        return text.split(/(\s+)/).map(part => {
            if (/^\s+$/.test(part)) return part;
            const clean = part.replace(/[^a-zA-Z0-9']/g, '').toLowerCase();
            if (clean) {
                return `<span class="tag syn-tag" data-word="${clean}" tabindex="0">${part}</span>`;
            }
            return part;
        }).join('');
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
                                        if (sData[k]) sData[k].flat().forEach(sw => { if (sw?.wd) words.add(sw.wd); });
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
            <div class="context-card origin-card">
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
                // Close any open heart menu first
                const heartMenu = document.querySelector('.heart-menu');
                if (heartMenu) heartMenu.remove();

                e.stopPropagation();
                if (callback) callback();
                else {
                    if (window.closeSideList) window.closeSideList();
                    if (window.ModalManager) window.ModalManager.hide();
                    if (window.StatsManager) window.StatsManager.hide();
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

    getTagClass(word) {
        if (!word) return "";
        const clean = word.toLowerCase().trim();
        const classes = [];
        // Removed level-specific match classes as requested
        return classes.join(" ");
    },

    renderTaggedGroups(list, tagClass, isThesaurus = false) {
        let res = "";
        const groups = {
            academic: [],
            c2: [], c1: [], b2: [], b1: [], a2: [], a1: [],
            others: [],
            slang: []
        };

        list.forEach(item => {
            const word = isThesaurus ? item.wd : (typeof item === 'string' ? item : item.wd);
            if (!word) return;
            const clean = word.toLowerCase().trim();
            const isSlang = isThesaurus ? item.isSlang : (typeof item === 'object' && item.isSlang);

            if (window.ACADEMIC_WORDS && window.ACADEMIC_WORDS.has(clean)) groups.academic.push(item);
            else if (window.C2_WORDS && window.C2_WORDS.has(clean)) groups.c2.push(item);
            else if (window.C1_WORDS && window.C1_WORDS.has(clean)) groups.c1.push(item);
            else if (window.B2_WORDS && window.B2_WORDS.has(clean)) groups.b2.push(item);
            else if (window.B1_WORDS && window.B1_WORDS.has(clean)) groups.b1.push(item);
            else if (window.A2_WORDS && window.A2_WORDS.has(clean)) groups.a2.push(item);
            else if (window.A1_WORDS && window.A1_WORDS.has(clean)) groups.a1.push(item);
            else if (isSlang) groups.slang.push(item);
            else groups.others.push(item);
        });

        const renderBatch = (items, label, matchClass) => {
            if (!items.length) return "";
            let html = items.map(item => {
                const wd = isThesaurus ? item.wd : (typeof item === 'string' ? item : item.wd);
                const content = isThesaurus ? item.html : wd;
                return `<span class="tag ${tagClass} ${matchClass}" data-word="${wd}" tabindex="0">${content}</span>`;
            }).join('');
            if (label) html += `<span class="academic-tag-label">&lt;${label}</span>`;
            return html;
        };

        res += renderBatch(groups.academic, "academic", "");
        res += renderBatch(groups.c2, "c2", "");
        res += renderBatch(groups.c1, "c1", "");
        res += renderBatch(groups.b2, "b2", "");
        res += renderBatch(groups.b1, "b1", "");
        res += renderBatch(groups.a2, "a2", "");
        res += renderBatch(groups.a1, "a1", "");
        res += renderBatch(groups.others, null, "");
        res += renderBatch(groups.slang, null, "");

        return res;
    },

    updateSharedDimmer() {
        const dimmer = document.getElementById('microDimmer');
        const loader = document.getElementById('loader');
        const microWin = document.getElementById('microWindow');
        if (!dimmer) return;

        let isModalOpen = false;
        if (microWin) {
            if (microWin.classList.contains('sliding-enabled')) {
                isModalOpen = microWin.classList.contains('show');
            } else {
                isModalOpen = microWin.style.display === 'flex';
            }
        }

        const isStatsOpen = document.getElementById('statsPanel')?.style.display === 'flex';
        const isPinnedOpen = document.getElementById('pinnedPanel')?.style.display === 'block';
        const isListSettingsOpen = document.getElementById('listSettingsPanel')?.classList.contains('active');
        const isVideoModalOpen = document.getElementById('videoModal')?.classList.contains('active');
        const isLicenseModalOpen = document.getElementById('licenseModal')?.classList.contains('active');
        const isGameOpen = document.getElementById('gameOverlay')?.style.display === 'flex';
        const isSideListOpen = document.getElementById('sideListPanel')?.classList.contains('active');

        if (isModalOpen || isStatsOpen || isPinnedOpen || isListSettingsOpen || isVideoModalOpen || isLicenseModalOpen || isGameOpen || isSideListOpen) {
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
