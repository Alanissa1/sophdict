/**
 * AuthManager - Handles Firebase Authentication and Cloud Sync
 */

window.AuthManager = {
    user: null,
    db: null,
    isInitialized: false,

    // Firebase configuration - USER SHOULD REPLACE THIS WITH THEIR OWN
    config: {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    },

    init() {
        if (this.isInitialized) return;

        // Initialize Firebase
        if (!firebase.apps.length) {
            firebase.initializeApp(this.config);
        }
        this.db = firebase.firestore();

        const authBtn = document.getElementById('authBtn');
        if (authBtn) {
            authBtn.onclick = () => this.handleAuthClick();
        }

        firebase.auth().onAuthStateChanged(async (user) => {
            this.user = user;
            this.updateUI();
            if (user) {
                console.log('[Auth] User signed in:', user.displayName);
                await this.syncDataFromCloud();
            } else {
                console.log('[Auth] User signed out');
            }
            this.isInitialized = true;
        });
    },

    async handleAuthClick() {
        if (this.user) {
            if (confirm('Do you want to sign out?')) {
                await firebase.auth().signOut();
            }
        } else {
            const provider = new firebase.auth.GoogleAuthProvider();
            try {
                await firebase.auth().signInWithPopup(provider);
            } catch (error) {
                console.error('[Auth] Login failed:', error);
                alert('Login failed: ' + error.message);
            }
        }
    },

    updateUI() {
        const authBtn = document.getElementById('authBtn');
        if (!authBtn) return;

        if (this.user) {
            authBtn.title = `Signed in as ${this.user.displayName}`;
            if (this.user.photoURL) {
                authBtn.innerHTML = `<img src="${this.user.photoURL}" style="width: 24px; height: 24px; border-radius: 50%; border: 1px solid var(--border-color);" alt="User">`;
            } else {
                authBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#1a73e8"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>`;
            }
        } else {
            authBtn.title = 'Sign In';
            authBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="currentColor"><path d="M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q66 0 130 15.5T736-378q29 15 46.5 43.5T800-272v112H160Zm80-80h480v-32q0-11-5.5-20T700-306q-54-27-109-40.5T480-360q-56 0-111 13.5T260-306q-9 5-14.5 14t-5.5 20v32Zm240-320q33 0 56.5-23.5T560-640q0-33-23.5-56.5T480-720q-33 0-56.5 23.5T400-640q0 33 23.5 56.5T480-560Zm0-80Zm0 400Z"/></svg>`;
        }
    },

    _syncTimeout: null,
    async syncDataToCloud() {
        if (!this.user) return;

        // Debounce sync to avoid too many writes
        if (this._syncTimeout) clearTimeout(this._syncTimeout);
        this._syncTimeout = setTimeout(async () => {
            try {
                const pinned = await DBManager.getPinned();
                const stats = StatsManager.stats;
                const customLists = CustomLists.lists;

                await this.db.collection('users').doc(this.user.uid).set({
                    pinned: pinned,
                    stats: stats,
                    customLists: customLists,
                    lastSync: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                console.log('[Auth] Data synced to cloud');
            } catch (e) {
                console.error('[Auth] Failed to sync to cloud:', e);
            }
        }, 5000); // 5 second debounce
    },

    async syncDataFromCloud() {
        if (!this.user) return;

        try {
            const doc = await this.db.collection('users').doc(this.user.uid).get();
            if (doc.exists) {
                const cloudData = doc.data();

                // Sync Pinned Words
                if (cloudData.pinned) {
                    for (const pin of cloudData.pinned) {
                        await DBManager.addPin(pin.word);
                    }
                }

                // Sync Stats
                if (cloudData.stats) {
                    // Simple merge strategy: keep the one with more totalTime or just overwrite?
                    // Usually we want to merge, but overwrite is simpler for first version.
                    Object.assign(StatsManager.stats, cloudData.stats);
                    StatsManager.save();
                }

                // Sync Custom Lists
                if (cloudData.customLists) {
                    Object.assign(CustomLists.lists, cloudData.customLists);
                    CustomLists.saveLocalLists();
                }

                console.log('[Auth] Data synced from cloud');

                // Refresh UI if necessary
                if (window.renderHomeLists) window.renderHomeLists();
                if (window.PinManager) PinManager.renderList();
            } else {
                // First time user, sync local data to cloud
                await this.syncDataToCloud();
            }
        } catch (e) {
            console.error('[Auth] Failed to sync from cloud:', e);
        }
    }
};
