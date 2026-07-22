window.UIRenderer = {
    async render(data, containerId = 'results-container', targetContext = null) {
        try {
            const targetContainer = document.getElementById(containerId);
            if (!targetContainer) return;

            if (data.error) {
                targetContainer.innerHTML = `<div style="padding:40px; text-align:center;">Word not found</div>`;
                return;
            }

            const { word, dictionary, thesaurus } = data;
            const dictArr = Array.isArray(dictionary) ? dictionary : [];
            const pronunciation = dictArr[0]?.hwi?.prs?.[0]?.mw || '';
            const isPinned = await DBManager.isPinned(word);

            if (containerId === 'results-container') {
                targetContainer.innerHTML = `
                    <div class="word-header">
                        <div class="title-row">
                            <div class="word-info">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <div class="pron-row"></div>
                                    <div style="display: flex; flex-direction: column;">
                                        <h1 class="word-title">${word}</h1>
                                        <span class="pronunciation">/${pronunciation}/</span>
                                    </div>
                                </div>
                            </div>
                            <span class="pin-btn-main"></span>
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
                    let html = this.generateHtml(data, 'thesaurus');
                    html += this.renderWordOrigin(dictionary);
                    body.innerHTML = html;
                }
                // Only scroll to top if we are rendering in the main container
                if (containerId === 'results-container') {
                    window.scrollTo({ top: 0, behavior: 'instant' });
                }
            } else {
                // Micro Window - Restructure header directly into micro-header-top
                const headerTop = document.querySelector('.micro-header-top');
                if (headerTop) {
                    headerTop.innerHTML = `
                        <div class="micro-pron-row" style="flex-shrink: 0; display: flex; align-items: center;"></div>
                        <div style="display: flex; flex-direction: column; min-width: 0; flex: 1; overflow-x: auto; overflow-y: hidden;">
                            <div style="display: flex; width: max-content;">
                                <h2 class="micro-title" style="margin:0; line-height:1.2;">${word}</h2>
                            </div>
                            <div style="display: flex; gap: 6px; font-size: 0.9em; width: max-content;">
                                <span class="micro-pronunciation" style="line-height:1.2;">/${pronunciation}/</span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap:10px; flex-shrink: 0; margin-left: 10px;">
                            <div id="microPin"></div>
                        </div>
                    `;
                    const pronRow = headerTop.querySelector('.micro-pron-row');
                    if (pronRow) pronRow.appendChild(TTSManager.createButton(word));

                    const mPin = headerTop.querySelector('#microPin');
                    if (mPin) {
                        mPin.className = `pin-btn ${isPinned ? 'active' : ''}`;
                        mPin.style.color = isPinned ? '#ff4b6b' : '#8b8b8b';
                        const heartEmpty = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z"/></svg>`;
                        const heartFilled = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="m480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z"/></svg>`;
                        mPin.innerHTML = isPinned ? heartFilled : heartEmpty;
                        mPin.onclick = async () => {
                            const active = await PinManager.togglePin(word);
                            mPin.classList.toggle('active', active);
                            mPin.style.color = active ? '#ff4b6b' : '#8b8b8b';
                            mPin.innerHTML = active ? heartFilled : heartEmpty;
                        };
                    }
                }

                // Hide redundant rows to remove gaps
                const oldTitleRow = document.querySelector('.micro-title-row');
                if (oldTitleRow) oldTitleRow.style.display = 'none';
                const mInfo = document.getElementById('microInfo');
                if (mInfo) mInfo.style.display = 'none';

                let html = this.generateHtml(data, 'dictionary', targetContext, true);
                html += `<button id="full-page-btn" class="view-full-btn">View Full Main Page</button>`;
                targetContainer.innerHTML = html;

                const fullPageBtn = document.getElementById('full-page-btn');
                if (fullPageBtn) {
                    fullPageBtn.onclick = () => {
                        ModalManager.hide();
                        window.AppSearch(word);
                    };
                }
            }

            this.attachInlineTTS(targetContainer);
            PreFetcher.addToQueue(this.extractLinks(data));
        } catch (err) {
            console.error("[UI] Render Error:", err);
        }
    },

    cleanMWText(text) {
        if (!text) return "";
        return text
            .replace(/\{bc\}/g, '')
            .replace(/\{a_link\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{d_link\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{sx\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{it\}|\{\/it\}|\{wi\}|\{\/wi\}/g, '')
            .replace(/\{[^}]+\}/g, '')
            .trim();
    },

    cleanMWExample(text, headword = null) {
        if (!text) return "";
        let cleaned = text
            .replace(/\{bc\}/g, '')
            .replace(/\{a_link\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{d_link\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{sx\|([^}|]+)(?:\|[^}]*)?\}/g, '$1')
            .replace(/\{it\}|\{\/it\}/g, '')
            .replace(/\{wi\}([^}]+)\{\/wi\}/g, '<b>$1</b>');

        if (headword) {
            const base = headword.replace(/\*/g, '').toLowerCase();
            const variants = [base];
            if (base.endsWith('y')) variants.push(base.slice(0, -1) + 'ie');
            else if (base.endsWith('e')) variants.push(base.slice(0, -1));

            variants.forEach(v => {
                // Match the variant followed by any characters that are NOT space or period
                const regex = new RegExp(`(?<!<b>)\\b(${v}[^\\s.]*)\\b(?!<\\/b>)`, 'gi');
                cleaned = cleaned.replace(regex, '<b>$1</b>');
            });
        }

        return cleaned.replace(/\{[^}]+\}/g, '').trim();
    },

    generateHtml(data, type, targetContext = null, isModal = false) {
        const { word, thesaurus, dictionary } = data;
        let html = "";

        if (type === 'thesaurus') {
            if (Array.isArray(thesaurus) && thesaurus.length > 0) {
                thesaurus.forEach(entry => {
                    const entryId = entry.meta?.id.split(':')[0];
                    if (entryId !== word && !entry.meta?.stems?.includes(word)) return;

                    html += `<div class="context-card"><div class="context-type">${entry.fl}</div>`;
                    let senseCounter = 1;
                    entry.def[0].sseq.forEach(sseq => {
                        sseq.forEach(sen => {
                            const sData = sen[1];
                            if (!sData || !sData.dt) return;

                            let def = this.cleanMWText(sData.dt[0][1]);
                            let vis = sData.dt.find(i => i[0] === 'vis');
                            let exHtml = vis ? vis[1].map(v => {
                                const cleanEx = this.cleanMWExample(v.t, word);
                                return `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${cleanEx.replace(/<\/?b>/g, '')}"></span></div>`;
                            }).join('') : "";

                            const syns = sData.syn_list?.[0]?.map(s => s.wd) || [];
                            const ants = sData.ant_list?.[0]?.map(a => a.wd) || [];

                            html += `
                                <div class="sense-block">
                                    <div class="definition">
                                        <span class="sense-num">${senseCounter++}.</span>
                                        <div class="def-content-container">
                                            <div class="def-text">${def} <span class="tts-inline-target" data-text="${def}"></span></div>
                                            ${exHtml}
                                            <div class="tags-section">
                                                ${syns.length ? `<div class="tags-row synonyms-container"><span class="tags-label">Similar:</span>${syns.map(s => `<span class="tag syn-tag" data-word="${s}" tabindex="0">${s}</span>`).join('')}</div>` : ''}
                                                ${ants.length ? `<div class="tags-row antonyms-container"><span class="tags-label">Opposite:</span>${ants.map(a => `<span class="tag ant-tag" data-word="${a}" tabindex="0">${a}</span>`).join('')}</div>` : ''}
                                            </div>
                                        </div>
                                    </div>
                                </div>`;
                        });
                    });
                    html += `</div>`;
                });
            } else {
                html = `<div style="padding:20px; text-align:center; color:var(--text-sub);">Thesaurus data not available for this word.</div>`;
            }
        } else if (type === 'dictionary') {
            if (Array.isArray(dictionary) && dictionary.length > 0) {
                if (isModal) {
                    // Filter and Group for Modal
                    const grouped = {};
                    dictionary.forEach(e => {
                        const fl = e.fl || 'other';
                        if (!grouped[fl]) grouped[fl] = [];
                        grouped[fl].push(e);
                    });

                    const sortedKeys = Object.keys(grouped).sort((a, b) => {
                        if (targetContext) {
                            if (a === targetContext && b !== targetContext) return -1;
                            if (a !== targetContext && b === targetContext) return 1;
                        }
                        return 0;
                    });

                    sortedKeys.forEach(fl => {
                        html += `<div class="context-card"><div class="context-type">${fl}</div>`;
                        const counter = { val: 1 };
                        grouped[fl].forEach(e => {
                            if (e.def && Array.isArray(e.def)) {
                                e.def.forEach(defObj => {
                                    if (defObj.sseq && Array.isArray(defObj.sseq)) {
                                        defObj.sseq.forEach(sseq => {
                                            sseq.forEach(node => {
                                                this.processSenseNode(node, (itemHtml) => {
                                                    html += itemHtml;
                                                }, counter, word);
                                            });
                                        });
                                    }
                                });
                            } else if (e.shortdef) {
                                e.shortdef.forEach(d => {
                                    const sn = `${counter.val++}.`;
                                    html += `
                                        <div class="sense-block">
                                            <div class="definition">
                                                <span class="sense-num">${sn}</span>
                                                <div class="def-content-container">
                                                    <div class="def-text">${d} <span class="tts-inline-target" data-text="${d}"></span></div>
                                                </div>
                                            </div>
                                        </div>`;
                                });
                            }
                        });
                        html += `</div>`;
                    });
                } else {
                    // Standard Non-Modal Rendering
                    const sortedDict = [...dictionary].sort((a, b) => {
                        const flA = (a.fl || '').toLowerCase();
                        const flB = (b.fl || '').toLowerCase();
                        if (targetContext) {
                            if (flA === targetContext && flB !== targetContext) return -1;
                            if (flA !== targetContext && flB === targetContext) return 1;
                        }
                        return 0;
                    });

                    sortedDict.forEach(e => {
                        html += `<div class="context-card"><div class="context-type">${e.fl || ''}</div>`;
                        if (e.def && Array.isArray(e.def)) {
                            e.def.forEach(defObj => {
                                if (defObj.sseq && Array.isArray(defObj.sseq)) {
                                    defObj.sseq.forEach(sseq => {
                                        sseq.forEach(node => {
                                            this.processSenseNode(node, (itemHtml) => {
                                                html += itemHtml;
                                            }, null, word);
                                        });
                                    });
                                }
                            });
                        } else if (e.shortdef) {
                            e.shortdef.forEach(d => {
                                html += `<div class="definition"><div class="sense-num"></div><div class="def-text">${d} <span class="tts-inline-target" data-text="${d}"></span></div></div>`;
                            });
                        }
                        html += `</div>`;
                    });
                }
            } else {
                html = `<div style="padding:20px; text-align:center; color:var(--text-sub);">Dictionary definition not available.</div>`;
            }
        }
        return html;
    },

    processSenseNode(node, callback, counter = null, word = null) {
        const type = node[0];
        const data = node[1];

        if (type === 'sense' || type === 'sdsense') {
            this.renderSense(data, callback, counter, word);
        } else if (type === 'pseq' || type === 'bs') {
            if (Array.isArray(data)) {
                data.forEach(n => this.processSenseNode(n, callback, counter, word));
            }
        }
    },

    renderSense(sData, callback, counter = null, word = null) {
        if (!sData || !sData.dt) return;

        let snValue = sData.sn || "";
        if (!snValue && counter) {
            snValue = `${counter.val++}.`;
        } else if (snValue && counter) {
            // Update counter based on existing sn (try to track the base number)
            const match = snValue.match(/^(\d+)/);
            if (match) {
                counter.val = parseInt(match[1]) + 1;
            }
        }

        const snHtml = snValue ? `<span class="sense-num">${snValue}${snValue.endsWith('.') ? '' : '.'}</span>` : `<span class="sense-num"></span>`;
        const sdHtml = sData.sd ? `<span class="sense-divider">${this.cleanMWText(sData.sd)} </span>` : "";

        let contentHtml = "";

        sData.dt.forEach(node => {
            const type = node[0];
            const content = node[1];

            if (type === 'text') {
                const cleanDef = this.cleanMWText(content);
                if (cleanDef) {
                    const prefix = contentHtml === "" ? sdHtml : "";
                    contentHtml += `<div class="def-text">${prefix}${cleanDef} <span class="tts-inline-target" data-text="${cleanDef}"></span></div>`;
                }
            } else if (type === 'vis' && Array.isArray(content)) {
                content.forEach(v => {
                    const cleanEx = this.cleanMWExample(v.t, word);
                    contentHtml += `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${cleanEx.replace(/<\/?b>/g, '')}"></span></div>`;
                });
            } else if (type === 'uns' && Array.isArray(content)) {
                content.forEach(u => {
                    u.forEach(unode => {
                        const utype = unode[0];
                        const udata = unode[1];
                        if (utype === 'text') {
                            const cleanDef = this.cleanMWText(udata);
                            if (cleanDef) {
                                contentHtml += `<div class="def-text">${cleanDef} <span class="tts-inline-target" data-text="${cleanDef}"></span></div>`;
                            }
                        } else if (utype === 'vis' && Array.isArray(udata)) {
                            udata.forEach(v => {
                                const cleanEx = this.cleanMWExample(v.t, word);
                                contentHtml += `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${cleanEx.replace(/<\/?b>/g, '')}"></span></div>`;
                            });
                        }
                    });
                });
            }
        });

        if (contentHtml) {
            const html = `
                <div class="sense-block">
                    <div class="definition">
                        ${snHtml}
                        <div class="def-content-container">
                            ${contentHtml}
                        </div>
                    </div>
                </div>`;
            callback(html);
        }
    },

    renderRunOns(uros) {
        if (!Array.isArray(uros) || uros.length === 0) return "";
        let html = `<div class="run-ons-section" style="margin-top:20px; padding-top:15px; border-top:1px dashed var(--border-color);">
            <div class="sub-section-title">Related Words</div>
            <div style="display:flex; flex-wrap:wrap; gap:10px;">`;

        uros.forEach(u => {
            const word = u.ure.replace(/\*/g, '');
            const fl = u.fl ? `<span class="run-on-fl">(${u.fl})</span>` : "";
            html += `<span class="tag syn-tag" data-word="${word}" tabindex="0" style="display:flex; align-items:center;">${word}${fl}</span>`;
        });

        html += `</div></div>`;
        return html;
    },

    renderWordOrigin(dictionary) {
        if (!Array.isArray(dictionary) || dictionary.length === 0) return "";

        let etymology = "";
        for (const entry of dictionary) {
            if (entry.et && Array.isArray(entry.et)) {
                // Concatenate text from all nodes in the etymology array
                entry.et.forEach(node => {
                    if (node[1] && typeof node[1] === 'string') {
                        etymology += node[1];
                    }
                });
                if (etymology) break;
            }
        }

        if (!etymology) return "";

        const cleanEt = this.cleanMWText(etymology);

        return `
            <div class="context-card origin-card" style="margin-top: 20px; border-left: 4px solid var(--accent);">
                <div class="context-type">Word Origin</div>
                <div class="definition">${cleanEt}</div>
            </div>
        `;
    },

    attachInlineTTS(container) {
        container.querySelectorAll('.tts-inline-target').forEach(span => {
            const text = span.dataset.text;
            span.appendChild(TTSManager.createButton(text));
        });
    },

    extractLinks(data) {
        const words = new Set();
        const { word, thesaurus, dictionary } = data;

        // 1. Extract from Thesaurus (Merriam-Webster Thesaurus API structure)
        if (Array.isArray(thesaurus)) {
            thesaurus.forEach(entry => {
                // Synonyms & Antonyms from meta
                if (entry.meta) {
                    if (Array.isArray(entry.meta.syns)) {
                        entry.meta.syns.flat().forEach(w => words.add(w));
                    }
                    if (Array.isArray(entry.meta.ants)) {
                        entry.meta.ants.flat().forEach(w => words.add(w));
                    }
                }

                // Related and Near lists inside definitions
                if (Array.isArray(entry.def)) {
                    entry.def.forEach(d => {
                        if (d.sseq) {
                            d.sseq.flat().forEach(sen => {
                                const sData = sen[1];
                                if (!sData) return;

                                // syn_list, ant_list, rel_list, near_list
                                if (sData.syn_list) sData.syn_list.flat().forEach(sw => words.add(sw.wd));
                                if (sData.ant_list) sData.ant_list.flat().forEach(aw => words.add(aw.wd));
                                if (sData.rel_list) sData.rel_list.flat().forEach(rw => words.add(rw.wd));
                                if (sData.near_list) sData.near_list.flat().forEach(nw => words.add(nw.wd));
                            });
                        }
                    });
                }
            });
        }

        // 2. Extract from Dictionary (Merriam-Webster Collegiate Dictionary)
        if (Array.isArray(dictionary)) {
            dictionary.forEach(entry => {
                // Run-on entries (uro)
                if (Array.isArray(entry.uro)) {
                    entry.uro.forEach(u => {
                        if (u.ure) words.add(u.ure.replace(/\*/g, ''));
                    });
                }
                // Cross-references (defined as {sx|word||})
                // These are usually handled by cleanMWText in UI, but we can extract them for pre-fetching
                const entryStr = JSON.stringify(entry);
                const sxMatches = entryStr.match(/\{sx\|([^}|]+)/g);
                if (sxMatches) {
                    sxMatches.forEach(m => {
                        const w = m.split('|')[1];
                        if (w) words.add(w.toLowerCase());
                    });
                }
            });
        }

        // Cleanup: remove original word, empty strings, and long phrases
        words.delete(word.toLowerCase());
        return Array.from(words)
            .map(w => w.toLowerCase().trim())
            .filter(w => w && w.length > 1 && w.length < 30 && !w.includes(' '));
    }
};
