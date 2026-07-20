window.ScrollManager = {
    last: 0,
    init() {
        const h = document.getElementById('appHeader');
        window.onscroll = () => {
            if (window.scrollY > this.last && window.scrollY > 100) h.classList.add('hidden');
            else h.classList.remove('hidden');
            this.last = window.scrollY;
        };
    }
};
