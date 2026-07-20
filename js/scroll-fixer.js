window.ScrollFixer = {
    scrollPos: 0,
    save() {
        this.scrollPos = window.pageYOffset || document.documentElement.scrollTop;
    },
    restore() {
        window.scrollTo(0, this.scrollPos);
    }
};
