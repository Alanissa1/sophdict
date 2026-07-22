window.UIThesaurus = {
    generateHtml(data) {
        const { word, thesaurus, dictionary } = data;
        let html = "";
        const searchWord = (word || "").toLowerCase();

        const filterFn = (entry) => {
            const entryId = entry.meta?.id ? entry.meta.id.split(":")[0].toLowerCase() : "";
            const stems = entry.meta?.stems?.map(s => s.toLowerCase()) || [];
            return !entryId || entryId.includes(searchWord) || stems.some(s => s.includes(searchWord));
        };

        const renderDefGroup = (entry, senseCounter) => {
            let defHtml = "";
            if (!entry.def || !entry.def[0] || !entry.def[0].sseq) {
                return { html: defHtml, senseCounter };
            }

            entry.def[0].sseq.forEach(sseq => {
                sseq.forEach(node => {
                    const sData = node[1];
                    if (!sData || !sData.dt) return;

                    UIUtils.reclassifyMetadata(sData);

                    const rawDef = sData.dt[0][1];
                    const cleanedDef = UIUtils.cleanMWText(rawDef);
                    const escapedDef = UIUtils.stripTags(cleanedDef).replace(/"/g, '&quot;');

                    const visNode = sData.dt.find(t => t[0] === 'vis');
                    const examplesHtml = visNode ? visNode[1].map(v => {
                        const cleanEx = UIUtils.cleanMWExample(v.t, word);
                        const escapedEx = UIUtils.stripTags(cleanEx).replace(/"/g, '&quot;');
                        return `<div class="example">"${cleanEx}" <span class="tts-inline-target" data-text="${escapedEx}"></span></div>`;
                    }).join('') : "";

                    const extractWords = (list) => list?.flat().map(item => ({
                        wd: item.wd,
                        html: `${item.wd}${item.wsls ? ' <small style="opacity:0.6; font-style:italic;">(' + item.wsls.join(', ') + ')</small>' : ''}`
                    })) || [];

                    const syns = extractWords(sData.syn_list);
                    const sims = extractWords(sData.sim_list);
                    const rels = extractWords(sData.rel_list);
                    const nears = extractWords(sData.near_list);
                    const ants = extractWords(sData.ant_list);
                    const opps = extractWords(sData.opp_list);
                    const phrases = sData.phrase_list?.flat().map(item => ({ wd: item.wd, html: item.wd })) || [];

                    const similarWords = [...syns, ...sims, ...phrases];
                    const oppositeWords = [...ants, ...opps];

                    const hasTags = similarWords.length || rels.length || oppositeWords.length || nears.length;
                    const tagsSection = hasTags ? `
                        <div class="tags-section expandable-wrapper">
                            <div class="tags-rows-container">
                                ${similarWords.length ? `<div class="tags-row Similar-row"><span class="tags-label">Similar:</span>${similarWords.map(t => `<span class="tag syn-tag" data-word="${t.wd}" tabindex="0">${t.html}</span>`).join('')}</div>` : ''}
                                ${rels.length ? `<div class="tags-row"><span class="tags-label">Related:</span>${rels.map(t => `<span class="tag syn-tag" data-word="${t.wd}" tabindex="0">${t.html}</span>`).join('')}</div>` : ''}
                                ${oppositeWords.length ? `<div class="tags-row"><span class="tags-label">Opposite:</span>${oppositeWords.map(t => `<span class="tag ant-tag" data-word="${t.wd}" tabindex="0">${t.html}</span>`).join('')}</div>` : ''}
                                ${nears.length ? `<div class="tags-row"><span class="tags-label">Near:</span>${nears.map(t => `<span class="tag ant-tag" data-word="${t.wd}" tabindex="0">${t.html}</span>`).join('')}</div>` : ''}
                                <button class="tag-expand-btn" onclick="UIThesaurus.toggleExpand(this)" aria-label="Expand tags">
                                    <svg class="ignore-dark-override" xmlns="http://www.w3.org/2000/svg" height="40px" viewBox="0 -960 960 960" width="40px" fill="currentColor"><path d="m480-347.33 175.33-175.34-47.66-46.66L480-441.67 352.33-569.33l-47.66 46.66L480-347.33ZM480-80q-82.33 0-155.33-31.5-73-31.5-127.34-85.83Q143-251.67 111.5-324.67T80-480q0-83 31.5-156t85.83-127q54.34-54 127.34-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 82.33-31.5 155.33-31.5 73-85.5 127.34Q709-143 636-111.5T480-80Zm0-66.67q139.33 0 236.33-97.33t97-236q0-139.33-97-236.33t-236.33-97q-138.67 0-236 97-97.33 97-97.33 236.33 0 138.67 97.33 236 97.33 97.33 236 97.33ZM480-480Z"/></svg>
                                </button>
                            </div>
                        </div>` : "";

                    defHtml += `
                        <div class="sense-block">
                            <div class="definition">
                                <span class="sense-num">${senseCounter++}.</span>
                                <div class="def-content-container">
                                    <div class="def-text">${cleanedDef} <span class="tts-inline-target" data-text="${escapedDef}"></span></div>
                                    ${examplesHtml}
                                    ${tagsSection}
                                </div>
                            </div>
                        </div>`;
                });
            });

            return { html: defHtml, senseCounter };
        };

        const isThesArray = Array.isArray(thesaurus) && thesaurus.length > 0;
        const stringSuggestions = isThesArray ? thesaurus.filter(item => typeof item === 'string') : [];
        const entryObjects = isThesArray ? thesaurus.filter(item => typeof item === 'object' && item !== null) : [];

        const grouped = {};
        entryObjects.forEach(entry => {
            if (!filterFn(entry)) return;
            let fl = entry.fl || "other";
            if ((!entry.fl || entry.fl === "other") && Array.isArray(dictionary)) {
                const dictMatch = dictionary.find(d => d.fl && d.fl !== "other");
                if (dictMatch) fl = dictMatch.fl;
            }
            if (!grouped[fl]) grouped[fl] = [];
            grouped[fl].push(entry);
        });

        const knownTypes = new Set(Object.keys(grouped));
        if (Array.isArray(dictionary)) {
            dictionary.forEach(entry => {
                const fl = entry.fl;
                if (fl && fl !== 'other' && !knownTypes.has(fl) && filterFn(entry)) {
                    if (!grouped[fl]) grouped[fl] = [];
                    grouped[fl].push(entry);
                    knownTypes.add(fl);
                }
            });
        }

        Object.keys(grouped).forEach(fl => {
            let contextHtml = "";
            let counter = 1;
            grouped[fl].forEach(entry => {
                const res = renderDefGroup(entry, counter);
                contextHtml += res.html;
                counter = res.senseCounter;
            });
            if (contextHtml) {
                html += `<div class="context-card"><div class="context-type">${fl}</div>${contextHtml}</div>`;
            }
        });

        if (stringSuggestions.length > 0) {
            html += `<div class="context-card suggestions-card"><div class="context-type">Related</div><div class="tags-row" style="padding: 10px 0;">${stringSuggestions.map(w => `<span class="tag syn-tag" data-word="${w}" tabindex="0">${w}</span>`).join('')}</div></div>`;
        }

        if (!html) {
            return '<div style="padding:20px; text-align:center; color:var(--text-sub);">No relevant dictionary or thesaurus data found.</div>';
        }
        return html;
    },

    toggleExpand(btn) {
        const wrapper = btn.closest('.expandable-wrapper');
        if (!wrapper) return;
        const rect = btn.getBoundingClientRect();
        const pageY = window.pageYOffset;
        const expanded = wrapper.classList.toggle('expanded');
        btn.style.transform = expanded ? 'rotate(180deg)' : 'rotate(0deg)';
        if (!expanded) {
            const diff = btn.getBoundingClientRect().top - rect.top;
            if (Math.abs(diff) > 1) {
                const modalContent = document.getElementById('microContent');
                if (modalContent && modalContent.contains(btn)) {
                    modalContent.scrollTop += diff;
                } else {
                    window.scrollTo(0, pageY + diff);
                }
            }
        }
    }
};
