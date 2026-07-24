window.UIDictionary = {
    generateHtml(data, targetContext = null, isModal = false) {
        const { dictionary, thesaurus, word } = data;
        let html = "";

        const hasDictionary = Array.isArray(dictionary) && dictionary.length > 0;
        const hasThesaurus = Array.isArray(thesaurus) && thesaurus.length > 0;

        if (hasDictionary || hasThesaurus) {
            if (isModal) {
                // Filter and Group for Modal
                const grouped = {};
                const dictTypes = new Set();
                const typeHasExamples = {};

                if (hasDictionary) {
                    dictionary.forEach(e => {
                        let fl = e.fl || 'other';

                        // Supplement missing fl from thesaurus data if available
                        if ((!e.fl || e.fl === 'other') && Array.isArray(thesaurus)) {
                            const thesMatch = thesaurus.find(te => te.fl && te.fl !== 'other');
                            if (thesMatch) fl = thesMatch.fl;
                        }

                        if (!grouped[fl]) grouped[fl] = [];
                        grouped[fl].push(e);
                        dictTypes.add(fl.toLowerCase());
                        if (!typeHasExamples[fl]) {
                            if ((e.vis && e.vis.length > 0) || this.extractVisFromEntry(e).length > 0) {
                                typeHasExamples[fl] = true;
                            }
                        }
                    });
                }

                // Supplement with thesaurus entries
                if (hasThesaurus) {
                    const searchTerm = word.toLowerCase();
                    thesaurus.forEach(entry => {
                        const entryId = (entry.meta?.id || "").split(':')[0].toLowerCase();
                        const stems = entry.meta?.stems?.map(s => s?.toLowerCase()) || [];
                        if (!entryId.includes(searchTerm) && !stems.some(s => s?.includes(searchTerm))) return;

                        const fl = entry.fl || 'other';
                        const flLower = fl.toLowerCase();
                        const hasEx = this.extractVisFromEntry(entry).length > 0;

                        // Missing context types OR (Existing type has no examples AND this entry has examples)
                        if (!dictTypes.has(flLower) || (!typeHasExamples[fl] && hasEx)) {
                            // De-duplication check
                            const entryShortDef = entry.shortdef || [];
                            const isDuplicate = grouped[fl]?.some(existing => {
                                if (!existing.shortdef) return false;
                                return entryShortDef.some(d => existing.shortdef.includes(d));
                            });

                            if (!isDuplicate) {
                                if (!grouped[fl]) grouped[fl] = [];
                                entry._isSupplementary = true;
                                grouped[fl].push(entry);
                                if (hasEx) typeHasExamples[fl] = true;
                                dictTypes.add(flLower);
                            }
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
                        const skipTags = isModal; // Tags are not allowed in modal
                        let defRendered = false;
                        if (e.def && Array.isArray(e.def)) {
                            const htmlBefore = html.length;
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
                            defRendered = html.length > htmlBefore;
                        }
                        if (!defRendered && e.shortdef) {
                            // Extract vis examples from deep within the entry's def/sseq/dt structure
                            const deepVis = this.extractVisFromEntry(e);
                            e.shortdef.forEach((d, idx) => {
                                const sn = `${counter.val++}.`;
                                const escapedD = UIUtils.stripTags(d).replace(/"/g, '&quot;');

                                let examplesHtml = "";

                                // First check entry-level vis (rare but possible)
                                if (e.vis && Array.isArray(e.vis)) {
                                    e.vis.forEach(ex => {
                                        const cleanedEx = UIUtils.cleanMWExample(ex.t || "", word);
                                        const ttsText = UIUtils.stripTags(cleanedEx);
                                        const escapedEx = ttsText.replace(/"/g, '&quot;');
                                        if (cleanedEx) {
                                            examplesHtml += `<div class="example">"${cleanedEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                                        }
                                    });
                                }

                                // Then append examples extracted from nested def/dt structures
                                if (deepVis.length > 0 && idx === 0) {
                                    deepVis.forEach(ex => {
                                        const cleanedEx = UIUtils.cleanMWExample(ex.t || "", word);
                                        const ttsText = UIUtils.stripTags(cleanedEx);
                                        const escapedEx = ttsText.replace(/"/g, '&quot;');
                                        if (cleanedEx) {
                                            examplesHtml += `<div class="example">"${cleanedEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                                        }
                                    });
                                }

                                html += `
                                    <div class="sense-block">
                                        <div class="definition">
                                            <span class="sense-num"><span class="sn-main">${sn}</span></span>
                                            <div class="def-content-container">
                                                <div class="def-text">${d} <span class="tts-inline-target" data-text="${escapedD}"></span></div>
                                                ${examplesHtml}
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
                        const entryId = (entry.meta?.id || "").split(':')[0].toLowerCase();
                        const stems = entry.meta?.stems?.map(s => s?.toLowerCase()) || [];
                        if (!entryId.includes(searchTerm) && !stems.some(s => s?.includes(searchTerm))) return;

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
                    let defRendered = false;
                    if (e.def && Array.isArray(e.def)) {
                        const htmlBefore = html.length;
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
                        defRendered = html.length > htmlBefore;
                    }
                    if (!defRendered && e.shortdef) {
                        const deepVis = this.extractVisFromEntry(e);
                        e.shortdef.forEach((d, idx) => {
                            const escapedD = UIUtils.stripTags(d).replace(/"/g, '&quot;');

                            let examplesHtml = "";
                            if (e.vis && Array.isArray(e.vis)) {
                                e.vis.forEach(ex => {
                                    const cleanedEx = UIUtils.cleanMWExample(ex.t || "", word);
                                    const ttsText = UIUtils.stripTags(cleanedEx);
                                    const escapedEx = ttsText.replace(/"/g, '&quot;');
                                    if (cleanedEx) {
                                        examplesHtml += `<div class="example">"${cleanedEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                                    }
                                });
                            }

                            if (deepVis.length > 0 && idx === 0) {
                                deepVis.forEach(ex => {
                                    const cleanedEx = UIUtils.cleanMWExample(ex.t || "", word);
                                    const ttsText = UIUtils.stripTags(cleanedEx);
                                    const escapedEx = ttsText.replace(/"/g, '&quot;');
                                    if (cleanedEx) {
                                        examplesHtml += `<div class="example">"${cleanedEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                                    }
                                });
                            }

                            html += `<div class="definition"><div class="sense-num"></div><div class="def-text">${d} <span class="tts-inline-target" data-text="${escapedD}"></span></div>${examplesHtml}</div>`;
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
        } else if (type === 'vis' && Array.isArray(data)) {
            let examplesHtml = "";
            data.forEach(v => {
                const cleanEx = UIUtils.cleanMWExample(v.t, word);
                const ttsText = UIUtils.stripTags(cleanEx);
                const escapedEx = ttsText.replace(/"/g, '&quot;');
                examplesHtml += `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
            });
            if (examplesHtml) {
                callback(`<div class="sense-block"><div class="definition"><div class="def-content-container">${examplesHtml}</div></div></div>`);
            }
        }
    },

    extractVisFromEntry(entry) {
        const vis = [];
        if (!entry.def || !Array.isArray(entry.def)) return vis;
        entry.def.forEach(defObj => {
            if (!defObj.sseq || !Array.isArray(defObj.sseq)) return;
            defObj.sseq.forEach(sseq => {
                sseq.forEach(node => {
                    const type = node[0];
                    const data = node[1];
                    if ((type === 'sense' || type === 'sdsense') && data && data.dt) {
                        data.dt.forEach(dtNode => {
                            if (dtNode[0] === 'vis' && Array.isArray(dtNode[1])) {
                                dtNode[1].forEach(v => { if (v && v.t) vis.push(v); });
                            }
                            // Also check inside uns (usage notes) for vis
                            if (dtNode[0] === 'uns' && Array.isArray(dtNode[1])) {
                                dtNode[1].forEach(u => {
                                    if (Array.isArray(u)) {
                                        u.forEach(unode => {
                                            if (unode[0] === 'vis' && Array.isArray(unode[1])) {
                                                unode[1].forEach(v => { if (v && v.t) vis.push(v); });
                                            }
                                        });
                                    }
                                });
                            }
                        });
                    }
                    // Also handle pseq/bs containers
                    if ((type === 'pseq' || type === 'bs') && Array.isArray(data)) {
                        this._extractVisFromNodes(data, vis);
                    }
                });
            });
        });
        return vis;
    },

    _extractVisFromNodes(nodes, vis) {
        nodes.forEach(node => {
            const type = node[0];
            const data = node[1];
            if ((type === 'sense' || type === 'sdsense') && data && data.dt) {
                data.dt.forEach(dtNode => {
                    if (dtNode[0] === 'vis' && Array.isArray(dtNode[1])) {
                        dtNode[1].forEach(v => { if (v && v.t) vis.push(v); });
                    }
                    if (dtNode[0] === 'uns' && Array.isArray(dtNode[1])) {
                        dtNode[1].forEach(u => {
                            if (Array.isArray(u)) {
                                u.forEach(unode => {
                                    if (unode[0] === 'vis' && Array.isArray(unode[1])) {
                                        unode[1].forEach(v => { if (v && v.t) vis.push(v); });
                                    }
                                });
                            }
                        });
                    }
                });
            }
            if ((type === 'pseq' || type === 'bs') && Array.isArray(data)) {
                this._extractVisFromNodes(data, vis);
            }
        });
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
            const renderTags = (list, tagClass) => {
                let res = "";
                const academic = [];
                const slang = [];
                const others = [];
                list.forEach(item => {
                    const word = typeof item === 'string' ? item : item.wd;
                    const isSlang = typeof item === 'object' && item.isSlang;
                    if (!word) return;

                    const clean = word.toLowerCase().trim();
                    const isAcademic = window.ACADEMIC_WORDS && window.ACADEMIC_WORDS.has(clean);

                    if (isAcademic) academic.push(word);
                    else if (isSlang) slang.push(word);
                    else others.push(word);
                });

                if (academic.length) {
                    res += academic.map(w => `<span class="tag ${tagClass} ielts-match" data-word="${w}" tabindex="0">${w}</span>`).join('');
                    res += `<span class="academic-tag-label">&lt;academic</span>`;
                }
                res += others.map(w => `<span class="tag ${tagClass}" data-word="${w}" tabindex="0">${w}</span>`).join('');
                res += slang.map(w => `<span class="tag ${tagClass}" data-word="${w}" tabindex="0">${w}</span>`).join('');
                return res;
            };

            const mapTagData = (list) => {
                if (!list) return [];
                return list.flat().map(s => {
                    if (!s || !s.wd) return null;
                    const labels = (s.wsls || []).map(l => l.toLowerCase());
                    return { wd: s.wd, isSlang: labels.includes('slang') };
                }).filter(Boolean);
            };

            if (sData.syn_list) {
                const syns = mapTagData(sData.syn_list);
                if (syns.length) {
                    tagsHtml += `<div class="tags-row synonyms-container"><span class="tags-label">similar:</span>${renderTags(syns, 'syn-tag')}</div>`;
                }
            }
            if (sData.rel_list) {
                const rels = mapTagData(sData.rel_list);
                if (rels.length) {
                    tagsHtml += `<div class="tags-row synonyms-container"><span class="tags-label">related:</span>${renderTags(rels, 'syn-tag')}</div>`;
                }
            }
            if (sData.phrase_list) {
                const phrases = mapTagData(sData.phrase_list);
                if (phrases.length) {
                    tagsHtml += `<div class="tags-row synonyms-container"><span class="tags-label">phrases:</span>${renderTags(phrases, 'syn-tag')}</div>`;
                }
            }
            if (sData.near_list) {
                const nears = mapTagData(sData.near_list);
                if (nears.length) {
                    tagsHtml += `<div class="tags-row antonyms-container"><span class="tags-label">near:</span>${renderTags(nears, 'ant-tag')}</div>`;
                }
            }
            if (sData.ant_list) {
                const ants = mapTagData(sData.ant_list);
                if (ants.length) {
                    tagsHtml += `<div class="tags-row antonyms-container"><span class="tags-label">opposite:</span>${renderTags(ants, 'ant-tag')}</div>`;
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
