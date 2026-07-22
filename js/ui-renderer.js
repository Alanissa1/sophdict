window.UIRenderer = {
    async render(data, containerId = 'results-container', targetContext = null) {
        if (window.UIEntry) {
            return window.UIEntry.render(data, containerId, targetContext);
        }
    },
    cleanMWText(text) {
        return window.UIUtils ? window.UIUtils.cleanMWText(text) : (text || '');
    },
    cleanMWExample(text, headword = null) {
        return window.UIUtils ? window.UIUtils.cleanMWExample(text, headword) : (text || '');
    }
};
