/**
 * Feedback & Support Manager for SophDict
 */
window.FeedbackSupport = {
    init() {
        this.injectGlobalStyles();
        window.addEventListener('popstate', () => this.handleRoute());
        this.handleRoute();
    },

    injectGlobalStyles() {
        const style = document.createElement('style');
        style.textContent = `
            #feedback-support-link {
                color: #70757a;
                font-size: 13px;
                font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
                text-decoration: none;
                margin-left: 15px;
                cursor: pointer;
                display: inline-block;
            }
            #feedback-support-link:hover {
                text-decoration: underline;
            }
        `;
        document.head.appendChild(style);
    },

    handleRoute() {
        const path = window.location.pathname;
        if (path === '/feedbackandsupport') {
            this.render();
            this.updateSEO();
        }
    },

    updateSEO() {
        document.title = "Feedback & Support - SophDict";
        const description = "Get in touch with the SophDict team for support or to provide feedback.";

        let metaDesc = document.querySelector('meta[name="description"]');
        if (metaDesc) metaDesc.setAttribute('content', description);

        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.setAttribute('content', "Feedback & Support - SophDict");

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.setAttribute('content', description);

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.setAttribute('content', window.location.origin + "/feedbackandsupport");
    },

    open() {
        window.history.pushState({ feedback: true }, "", "/feedbackandsupport");
        this.render();
        this.updateSEO();
    },

    render() {
        const container = document.getElementById('results-container');
        if (!container) return;

        document.body.classList.remove('home-state');
        if (window.RestoreSearchUI) window.RestoreSearchUI();

        const html = `
            <style>
                .feedback-container {
                max-width: 600px;
                color: var(--text-main);
                flex-grow: 1;
                margin: 0 auto;
                display: flex;
                flex-direction: column;
                }
                .feedback-header {
                    margin-bottom: 20px;
                }
                .feedback-header h2 {
                    margin: 0;
                    font-weight: 500;
                    color: var(--text-main);
                }
                .feedback-header p {
                    margin: 10px 0 0 0;
                    color: var(--text-sub);
                    font-size: 15px !important;
                }
                .feedback-form {
                    display: flex;
                    flex-direction: column;
                    gap: 15px;
                    background: var(--card-bg);
                    padding: 25px;
                    border-radius: 12px;
                    box-shadow: 0 4px 20px var(--shadow-color, rgba(0,0,0,0.05));
                    border: 1px solid var(--border-color);
                }
                .form-group {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .form-group label {
                    font-weight: 500;
                    font-size: 14px;
                    color: var(--text-main);
                }
                .form-group input, .form-group textarea {
                    padding: 12px;
                    border-radius: 8px;
                    border: 1px solid var(--border-color);
                    background: var(--bg-color);
                    color: var(--text-main);
                    font-family: inherit;
                    font-size: 13px !important;
                    outline: none;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .form-group textarea {
                    border-radius: 18px;
                }
                .form-group input:focus, .form-group textarea:focus {
                    border-color: var(--primary-color);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                }
                .submit-btn {
                    padding: 12px;
                    background: var(--primary-color, #1a73e8);
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-weight: bold;
                    cursor: pointer;
                    transition: opacity 0.2s;
                    margin-top: 10px;
                    font-size: 14px;
                }
                .submit-btn:hover {
                    opacity: 0.9;
                }

                /* Dark/Light contrast support */
                body.dark-mode .feedback-form {
                    background: #202124;
                    --shadow-color: rgba(0,0,0,0.3);
                }
                body.dark-mode .form-group input,
                body.dark-mode .form-group textarea {
                    background: #2d2e31;
                    border-color: #3c4043;
                }

                .feedback-footer-link {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 12px;
                }
                .feedback-footer-link a {
                    color: var(--accent, #1a73e8);
                    text-decoration: none;
                }
            </style>
            <div class="feedback-container">
                <div class="feedback-header">
                    <h2>Feedback & Support</h2>
                    <p>We value your input. Please fill out the form below to reach us.</p>
                </div>

                <form class="feedback-form" action="https://formspree.io/f/mqergdrp" method="POST">
                    <div class="form-group">
                        <label for="fb-name">Name (Optional)</label>
                        <input type="text" id="fb-name" name="name" placeholder="Your name" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="fb-email">Email Address</label>
                        <input type="email" id="fb-email" name="email" required placeholder="your@email.com" autocomplete="off">
                    </div>
                    <div class="form-group">
                        <label for="fb-message">Message</label>
                        <textarea id="fb-message" name="message" rows="4" required placeholder="How can we help?" autocomplete="off"></textarea>
                    </div>
                    <button type="submit" class="submit-btn">Send Feedback</button>
                </form>
            </div>
        `;

        container.innerHTML = html;
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
};
