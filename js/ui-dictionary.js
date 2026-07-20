window.UIDictionary = {
    generateHtml(data, targetContext = null, isModal = false) {
        const { dictionary, thesaurus, word } = data;
        let html = "";

        if (Array.isArray(dictionary) && dictionary.length > 0) {
            if (isModal) {
                // Filter and Group for Modal
                const grouped = {};
                dictionary.forEach(e => {
                    let fl = e.fl || 'other';

                    // Supplement missing fl from thesaurus data if available
                    if ((!e.fl || e.fl === 'other') && Array.isArray(thesaurus)) {
                        const thesMatch = thesaurus.find(te => te.fl && te.fl !== 'other');
                        if (thesMatch) fl = thesMatch.fl;
                    }

                    if (!grouped[fl]) grouped[fl] = [];
                    grouped[fl].push(e);
                });

                // Supplement with missing types from thesaurus
                const dictTypes = new Set(dictionary.map(e => (e.fl || 'other').toLowerCase()));
                if (Array.isArray(thesaurus)) {
                    const searchTerm = word.toLowerCase();
                    thesaurus.forEach(entry => {
                        const entryId = entry.meta?.id.split(':')[0].toLowerCase();
                        const stems = entry.meta?.stems?.map(s => s.toLowerCase()) || [];
                        if (!entryId.includes(searchTerm) && !stems.some(s => s.includes(searchTerm))) return;

                        const fl = entry.fl || 'other';
                        if (!dictTypes.has(fl.toLowerCase())) {
                            if (!grouped[fl]) grouped[fl] = [];
                            entry._isSupplementary = true;
                            grouped[fl].push(entry);
                        }
                    });
                }

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
                        const skipTags = e._isSupplementary || false;
                        if (e.def && Array.isArray(e.def)) {
                            e.def.forEach(defObj => {
                                if (defObj.sseq && Array.isArray(defObj.sseq)) {
                                    defObj.sseq.forEach(sseq => {
                                        sseq.forEach(node => {
                                            this.processSenseNode(node, (itemHtml) => {
                                                html += itemHtml;
                                            }, counter, skipTags, word);
                                        });
                                    });
                                }
                            });
                        } else if (e.shortdef) {
                            e.shortdef.forEach(d => {
                                const sn = `${counter.val++}.`;
                                const escapedD = UIUtils.stripTags(d).replace(/"/g, '&quot;');
                                html += `
                                    <div class="sense-block">
                                        <div class="definition">
                                            <span class="sense-num"><span class="sn-main">${sn}</span></span>
                                            <div class="def-content-container">
                                                <div class="def-text">${d} <span class="tts-inline-target" data-text="${escapedD}"></span></div>
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
                const dictTypes = new Set(dictionary.map(e => (e.fl || 'other').toLowerCase()));
                const augmentedDict = [...dictionary];

                if (Array.isArray(thesaurus)) {
                    const searchTerm = word.toLowerCase();
                    thesaurus.forEach(entry => {
                        const entryId = entry.meta?.id.split(':')[0].toLowerCase();
                        const stems = entry.meta?.stems?.map(s => s.toLowerCase()) || [];
                        if (!entryId.includes(searchTerm) && !stems.some(s => s.includes(searchTerm))) return;

                        const fl = entry.fl || 'other';
                        if (!dictTypes.has(fl.toLowerCase())) {
                            entry._isSupplementary = true;
                            augmentedDict.push(entry);
                        }
                    });
                }

                const sortedDict = augmentedDict.sort((a, b) => {
                    const flA = (a.fl || '').toLowerCase();
                    const flB = (b.fl || '').toLowerCase();
                    if (targetContext) {
                        if (flA === targetContext && flB !== targetContext) return -1;
                        if (flA !== targetContext && flB === targetContext) return 1;
                    }
                    return 0;
                });

                sortedDict.forEach(e => {
                    const skipTags = e._isSupplementary || false;
                    let fl = e.fl || '';

                    // Supplement missing fl from thesaurus data if available
                    if (!fl && Array.isArray(thesaurus)) {
                        const thesMatch = thesaurus.find(te => te.fl && te.fl !== 'other');
                        if (thesMatch) fl = thesMatch.fl;
                    }

                    html += `<div class="context-card"><div class="context-type">${fl}</div>`;
                    if (e.def && Array.isArray(e.def)) {
                        e.def.forEach(defObj => {
                            if (defObj.sseq && Array.isArray(defObj.sseq)) {
                                defObj.sseq.forEach(sseq => {
                                    sseq.forEach(node => {
                                        this.processSenseNode(node, (itemHtml) => {
                                            html += itemHtml;
                                        }, null, skipTags, word);
                                    });
                                });
                            }
                        });
                    } else if (e.shortdef) {
                        e.shortdef.forEach(d => {
                            const escapedD = UIUtils.stripTags(d).replace(/"/g, '&quot;');
                            html += `<div class="definition"><div class="sense-num"></div><div class="def-text">${d} <span class="tts-inline-target" data-text="${escapedD}"></span></div></div>`;
                        });
                    }
                    html += `</div>`;
                });
            }
        } else {
            html = `<div style="padding:20px; text-align:center; color:var(--text-sub);">Dictionary definition not available.</div>`;
        }
        return html;
    },

    processSenseNode(node, callback, counter = null, skipTags = false, word = null) {
        const type = node[0];
        const data = node[1];

        if (type === 'sense' || type === 'sdsense') {
            this.renderSense(data, callback, counter, skipTags, word);
        } else if (type === 'pseq' || type === 'bs') {
            if (Array.isArray(data)) {
                data.forEach(n => this.processSenseNode(n, callback, counter, skipTags, word));
            }
        }
    },

    renderSense(sData, callback, counter = null, skipTags = false, word = null) {
        if (!sData || !sData.dt) return;

        let snValue = sData.sn || "";
        if (!snValue && counter) {
            snValue = `${counter.val++}.`;
        } else if (snValue && counter) {
            const match = snValue.match(/^(\d+)/);
            if (match) {
                counter.val = parseInt(match[1]) + 1;
            }
        }

        let snContent = "";
        if (snValue) {
            let val = snValue.trim();
            // Add trailing dot if missing and not ending with parenthesis
            if (!val.endsWith('.') && !val.endsWith(')')) val += ".";

            const parts = val.split(/\s+/);
            let hasDigit = false;
            let hasLetter = false;

            parts.forEach(p => {
                const cleanP = p.replace(/\.$/, '');

                // Combined case handling
                const comb = p.match(/^(\d+)([a-z])\.?$/i);
                if (comb) {
                    const n = parseInt(comb[1]);
                    const l = comb[2];
                    if (!counter || counter.lastShownMain !== n) {
                        snContent += `<span class="sn-main">${n}.</span>`;
                        if (counter) counter.lastShownMain = n;
                    } else {
                        snContent += `<span class="sn-main-hidden">${n}.</span>`;
                    }
                    snContent += `<span class="sn-letter">${l}.</span>`;
                    hasDigit = true;
                    hasLetter = true;
                    return;
                }

                if (/^\d+$/.test(cleanP)) {
                    const n = parseInt(cleanP);
                    if (!counter || counter.lastShownMain !== n) {
                        snContent += `<span class="sn-main">${n}.</span>`;
                        if (counter) counter.lastShownMain = n;
                    } else {
                        snContent += `<span class="sn-main-hidden">${n}.</span>`;
                    }
                    hasDigit = true;
                } else if (/^[a-z]$/.test(cleanP)) {
                    if (!hasDigit && counter) {
                        const num = Math.max(1, counter.val - 1);
                        if (counter.lastShownMain !== num) {
                            snContent += `<span class="sn-main">${num}.</span>`;
                            counter.lastShownMain = num;
                        } else {
                            snContent += `<span class="sn-main-hidden">${num}.</span>`;
                        }
                        hasDigit = true;
                    }
                    let letter = p;
                    if (!letter.endsWith('.')) letter += ".";
                    snContent += `<span class="sn-letter">${letter}</span>`;
                    hasLetter = true;
                } else if (/^\(\d+\)$/.test(cleanP) || /^\d+\)$/.test(cleanP)) {
                    if (!hasDigit && counter) {
                        const num = Math.max(1, counter.val - 1);
                        if (counter.lastShownMain !== num) {
                            snContent += `<span class="sn-main">${num}.</span>`;
                            counter.lastShownMain = num;
                        } else {
                            snContent += `<span class="sn-main-hidden">${num}.</span>`;
                        }
                        hasDigit = true;
                    }
                    if (!hasLetter) {
                         snContent += `<span class="sn-letter-hidden">a.</span>`;
                    }
                    snContent += `<span class="sn-sub">${p}</span>`;
                } else {
                    snContent += `<span>${p}</span>`;
                }
            });
        }
        const snHtml = `<span class="sense-num">${snContent}</span>`;
        const sdHtml = sData.sd ? `<span class="sense-divider">${UIUtils.cleanMWText(sData.sd)} </span>` : "";

        let contentHtml = "";
        let fullDefText = "";
        let examplesHtml = "";

        sData.dt.forEach(node => {
            const type = node[0];
            const content = node[1];

            if (type === 'text') {
                const cleaned = UIUtils.cleanMWText(content);
                if (cleaned) {
                    if (fullDefText) {
                        fullDefText = fullDefText.trim().replace(/\.*$/, '');
                        if (!fullDefText.endsWith(';') && !cleaned.startsWith(';')) {
                            fullDefText += "; ";
                        } else if (!fullDefText.endsWith(' ')) {
                            fullDefText += " ";
                        }
                    }
                    fullDefText += cleaned;
                }
            } else if (type === 'vis' && Array.isArray(content)) {
                content.forEach(v => {
                    const cleanEx = UIUtils.cleanMWExample(v.t, word);
                    const ttsText = UIUtils.stripTags(cleanEx);
                    const escapedEx = ttsText.replace(/"/g, '&quot;');
                    examplesHtml += `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                });
            } else if (type === 'uns' && Array.isArray(content)) {
                content.forEach(u => {
                    u.forEach(unode => {
                        const utype = unode[0];
                        const udata = unode[1];
                        if (utype === 'text') {
                            const cleaned = UIUtils.cleanMWText(udata);
                            if (cleaned) {
                                fullDefText += ` (${cleaned})`;
                            }
                        } else if (utype === 'vis' && Array.isArray(udata)) {
                            udata.forEach(v => {
                                const cleanEx = UIUtils.cleanMWExample(v.t, word);
                                const ttsText = UIUtils.stripTags(cleanEx);
                                const escapedEx = ttsText.replace(/"/g, '&quot;');
                                examplesHtml += `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                            });
                        }
                    });
                });
            }
        });

        fullDefText = fullDefText.trim().replace(/^;\s*/, '');
        if (fullDefText) {
            const escapedDef = UIUtils.stripTags(fullDefText).replace(/"/g, '&quot;');
            contentHtml += `<div class="def-text">${sdHtml}${fullDefText} <span class="tts-inline-target" data-text="${escapedDef}"></span></div>`;
        }
        contentHtml += examplesHtml;

        // Add similar/opposite from dictionary API if present
        let tagsHtml = "";
        if (!skipTags) {
            if (sData.syn_list) {
                const syns = sData.syn_list.flat().map(s => s.wd);
                if (syns.length) {
                    tagsHtml += `<div class="tags-row synonyms-container"><span class="tags-label">Similar:</span>${syns.map(s => `<span class="tag syn-tag" data-word="${s}" tabindex="0">${s}</span>`).join('')}</div>`;
                }
            }
            if (sData.rel_list) {
                const rels = sData.rel_list.flat().map(r => r.wd);
                if (rels.length) {
                    tagsHtml += `<div class="tags-row synonyms-container"><span class="tags-label">Related:</span>${rels.map(r => `<span class="tag syn-tag" data-word="${r}" tabindex="0">${r}</span>`).join('')}</div>`;
                }
            }
            if (sData.phrase_list) {
                const phrases = sData.phrase_list.flat().map(p => p.wd);
                if (phrases.length) {
                    tagsHtml += `<div class="tags-row synonyms-container"><span class="tags-label">Phrases:</span>${phrases.map(p => `<span class="tag syn-tag" data-word="${p}" tabindex="0">${p}</span>`).join('')}</div>`;
                }
            }
            if (sData.near_list) {
                const nears = sData.near_list.flat().map(n => n.wd);
                if (nears.length) {
                    tagsHtml += `<div class="tags-row antonyms-container"><span class="tags-label">Near:</span>${nears.map(n => `<span class="tag ant-tag" data-word="${n}" tabindex="0">${n}</span>`).join('')}</div>`;
                }
            }
            if (sData.ant_list) {
                const ants = sData.ant_list.flat().map(a => a.wd);
                if (ants.length) {
                    tagsHtml += `<div class="tags-row antonyms-container"><span class="tags-label">Opposite:</span>${ants.map(a => `<span class="tag ant-tag" data-word="${a}" tabindex="0">${a}</span>`).join('')}</div>`;
                }
            }
        }

        if (tagsHtml) {
            contentHtml += `<div class="tags-section">${tagsHtml}</div>`;
        }

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
    }
};
