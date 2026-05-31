// ============================================================
// MTG Collection Manager - Vue par édition + complétion
// ============================================================

// ============================================================
// FIREBASE CLOUD SYNC — Remplir avec les valeurs de la console Firebase
// Si vide, le site fonctionne normalement en local (localStorage)
// ============================================================
const FIREBASE_CONFIG = {
    apiKey: "AIzaSyBRxSZnwPCh_ig7aEUenSaj__WFHgT3Cp8",
    authDomain: "mtg-collection-56.firebaseapp.com",
    projectId: "mtg-collection-56",
    storageBucket: "mtg-collection-56.firebasestorage.app",
    messagingSenderId: "837857001275",
    appId: "1:837857001275:web:3229510c2dab9dbca6811e"
};

const RefSites = {
    magicville: {
        name: 'Magic-Ville',
        icon: '🏰',
        searchUrl: (name) => `https://www.magic-ville.com/fr/register/search_result.php?cardname=${encodeURIComponent(name)}`,
        color: '#6a4c93'
    },
    playin: {
        name: 'Playin',
        icon: '🛒',
        searchUrl: (name) => `https://www.play-in.com/fr/recherche?s=${encodeURIComponent(name)}`,
        color: '#e63946'
    },
    mtgcards: {
        name: 'MTGCards.fr',
        icon: '📖',
        searchUrl: (name) => `https://www.mtgcards.fr/cards?search=${encodeURIComponent(name)}`,
        color: '#457b9d'
    }
};

const RARITY_ORDER = { common: 0, uncommon: 1, rare: 2, mythic: 3 };

function buildRefLinks(cardName, extraClass = '') {
    return Object.values(RefSites).map(site =>
        `<a href="${site.searchUrl(cardName)}" target="_blank" rel="noopener" class="ref-link ${extraClass}" style="--ref-color: ${site.color}">${site.icon} ${site.name}</a>`
    ).join('');
}

function dn(card) {
    return card.frName || card.printed_name || card.name || '';
}

// ============================================================
const App = {
    collection: [],
    setsCache: {},         // code -> { name, card_count, icon_svg_uri, released_at }
    setCardsCache: {},     // code -> [ card objects from scryfall ]

    fbAuth: null,
    fbDb: null,
    _syncUid: null,
    _unsubscribe: null,
    _cloudSaveTimer: null,

    init() {
        this.loadData();
        this.bindEvents();
        this.initFirebase();
        this.loadSetsCache().then(() => {
            this.renderCollection();
            this.updateStats();
        });
    },

    // --- Persistence ---
    loadData() {
        try { this.collection = JSON.parse(localStorage.getItem('mtg-collection')) || []; } catch { this.collection = []; }
        try { this.setsCache = JSON.parse(localStorage.getItem('mtg-sets-cache')) || {}; } catch { this.setsCache = {}; }
    },

    saveCollection() {
        localStorage.setItem('mtg-collection', JSON.stringify(this.collection));
        this.updateStats();
        this.showSaveStatus();
        this.saveToCloud();
    },

    showSaveStatus() {
        const el = document.getElementById('save-status');
        if (!el) return;
        const now = new Date();
        el.textContent = `Sauvegardé ${now.toLocaleTimeString('fr-FR')}`;
        el.classList.add('saved');
        clearTimeout(this._saveTimeout);
        this._saveTimeout = setTimeout(() => el.classList.remove('saved'), 3000);
    },

    saveSetsCache() {
        localStorage.setItem('mtg-sets-cache', JSON.stringify(this.setsCache));
    },

    // --- Scryfall Sets Cache ---
    async loadSetsCache() {
        const cacheAge = localStorage.getItem('mtg-sets-cache-ts');
        const oneDay = 24 * 60 * 60 * 1000;
        if (cacheAge && Date.now() - parseInt(cacheAge) < oneDay && Object.keys(this.setsCache).length > 0) return;

        try {
            const resp = await fetch('https://api.scryfall.com/sets');
            if (!resp.ok) return;
            const data = await resp.json();
            this.setsCache = {};
            for (const s of data.data) {
                this.setsCache[s.code.toUpperCase()] = {
                    name: s.name,
                    card_count: s.card_count,
                    icon: s.icon_svg_uri,
                    released: s.released_at,
                    type: s.set_type
                };
            }
            this.saveSetsCache();
            localStorage.setItem('mtg-sets-cache-ts', Date.now().toString());
        } catch (e) {}
    },

    getSetInfo(code) {
        return this.setsCache[code?.toUpperCase()] || null;
    },

    // --- Fetch all cards of a set (for missing cards / import) ---
    async loadSetCards(setCode, includeAllLangs = false) {
        const key = setCode.toUpperCase() + (includeAllLangs ? '_ALL' : '');
        if (this.setCardsCache[key]) return this.setCardsCache[key];

        const allCards = [];

        // First try French
        let url = `https://api.scryfall.com/cards/search?q=set:${setCode.toLowerCase()}+lang:fr&order=collector_number&unique=prints`;
        try {
            while (url) {
                const resp = await fetch(url);
                if (!resp.ok) break;
                const data = await resp.json();
                allCards.push(...data.data);
                url = data.has_more ? data.next_page : null;
                if (url) await new Promise(r => setTimeout(r, 100));
            }
        } catch (e) {}

        // If includeAllLangs or FR returned nothing, also fetch EN
        if (allCards.length === 0 || includeAllLangs) {
            url = `https://api.scryfall.com/cards/search?q=set:${setCode.toLowerCase()}&order=collector_number&unique=prints`;
            const enCards = [];
            try {
                while (url) {
                    const resp = await fetch(url);
                    if (!resp.ok) break;
                    const data = await resp.json();
                    enCards.push(...data.data);
                    url = data.has_more ? data.next_page : null;
                    if (url) await new Promise(r => setTimeout(r, 100));
                }
            } catch (e) {}
            // Merge: add EN cards not already present by name
            const existingNames = new Set(allCards.map(c => c.name));
            for (const ec of enCards) {
                if (!existingNames.has(ec.name)) allCards.push(ec);
            }
        }

        this.setCardsCache[key] = allCards;
        return allCards;
    },

    // --- Events ---
    bindEvents() {
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchView(btn.dataset.view));
        });

        document.getElementById('filter-name').addEventListener('input', () => this.renderCollection());
        document.getElementById('filter-color').addEventListener('change', () => this.renderCollection());
        document.getElementById('filter-rarity').addEventListener('change', () => this.renderCollection());

        document.getElementById('btn-search').addEventListener('click', () => this.searchScryfall());
        document.getElementById('scryfall-search').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.searchScryfall(); });
        this.setupAutocomplete('scryfall-search');

        document.getElementById('manual-form').addEventListener('submit', (e) => { e.preventDefault(); this.addManualCard(); });

        const dropZone = document.getElementById('drop-zone');
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
        dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault(); dropZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.handleFileImport(e.dataTransfer.files[0]);
        });
        document.getElementById('file-input').addEventListener('change', (e) => {
            if (e.target.files.length) this.handleFileImport(e.target.files[0]);
        });
        document.getElementById('btn-confirm-import').addEventListener('click', () => this.confirmImport());
        document.getElementById('btn-cancel-import').addEventListener('click', () => this.cancelImport());
        document.getElementById('btn-export').addEventListener('click', () => this.exportCSV());
        document.getElementById('btn-backup').addEventListener('click', () => this.backupJSON());
        document.getElementById('btn-refresh-prices').addEventListener('click', () => this.refreshPrices());
        document.getElementById('btn-remove-duplicates').addEventListener('click', () => this.removeDuplicates());

        const excelZone = document.getElementById('excel-drop-zone');
        excelZone.addEventListener('dragover', (e) => { e.preventDefault(); excelZone.classList.add('dragover'); });
        excelZone.addEventListener('dragleave', () => excelZone.classList.remove('dragover'));
        excelZone.addEventListener('drop', (e) => {
            e.preventDefault(); excelZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.importExcelJSON(e.dataTransfer.files[0]);
        });
        document.getElementById('excel-file-input').addEventListener('change', (e) => {
            if (e.target.files.length) this.importExcelJSON(e.target.files[0]);
        });

        const backupZone = document.getElementById('backup-drop-zone');
        backupZone.addEventListener('dragover', (e) => { e.preventDefault(); backupZone.classList.add('dragover'); });
        backupZone.addEventListener('dragleave', () => backupZone.classList.remove('dragover'));
        backupZone.addEventListener('drop', (e) => {
            e.preventDefault(); backupZone.classList.remove('dragover');
            if (e.dataTransfer.files.length) this.restoreBackup(e.dataTransfer.files[0]);
        });
        document.getElementById('backup-file-input').addEventListener('change', (e) => {
            if (e.target.files.length) this.restoreBackup(e.target.files[0]);
        });


        document.getElementById('btn-start-camera').addEventListener('click', () => this.startCamera());
        document.getElementById('btn-capture').addEventListener('click', () => this.captureCard());
        document.getElementById('btn-stop-camera').addEventListener('click', () => this.stopCamera());
        document.getElementById('btn-scan-search').addEventListener('click', () => this.scanSearch());
        document.getElementById('scan-name-input').addEventListener('keydown', (e) => { if (e.key === 'Enter') this.scanSearch(); });
        this.setupAutocomplete('scan-name-input');

        document.getElementById('btn-sign-in').addEventListener('click', () => this.signIn());
        document.getElementById('btn-sign-out').addEventListener('click', () => this.signOut());

        document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => this.closeModals()));
        document.querySelectorAll('.modal').forEach(m => m.addEventListener('click', (e) => { if (e.target === m) this.closeModals(); }));
        document.getElementById('modal-quantity').addEventListener('change', (e) => this.updateCardQuantity(e));
        document.getElementById('modal-foil').addEventListener('change', (e) => this.updateCardFoil(e));
        document.getElementById('btn-modal-remove').addEventListener('click', () => this.removeCard());
    },

    setupAutocomplete(inputId) {
        const input = document.getElementById(inputId);
        let timeout = null;
        const listEl = document.createElement('div');
        listEl.className = 'autocomplete-list';
        input.parentElement.style.position = 'relative';
        input.parentElement.appendChild(listEl);
        input.addEventListener('input', () => {
            clearTimeout(timeout);
            const q = input.value.trim();
            if (q.length < 2) { listEl.innerHTML = ''; return; }
            timeout = setTimeout(() => this.fetchAutocomplete(q, listEl, input), 300);
        });
        input.addEventListener('blur', () => setTimeout(() => listEl.innerHTML = '', 200));
    },

    async fetchAutocomplete(query, listEl, input) {
        try {
            const resp = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
            if (!resp.ok) return;
            const data = await resp.json();
            listEl.innerHTML = data.data.slice(0, 8).map(n => `<div class="autocomplete-item">${n}</div>`).join('');
            listEl.querySelectorAll('.autocomplete-item').forEach(el => {
                el.addEventListener('mousedown', (e) => { e.preventDefault(); input.value = el.textContent; listEl.innerHTML = ''; });
            });
        } catch (e) {}
    },

    switchView(view) {
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        document.querySelector(`[data-view="${view}"]`).classList.add('active');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');
        if (view !== 'scanner' && this.cameraStream) this.stopCamera();
        if (view === 'collection') this.renderCollection();
    },

    // ================================================================
    // COLLECTION PAR EDITION
    // ================================================================
    renderCollection() {
        const grid = document.getElementById('editions-grid');
        const nameFilter = document.getElementById('filter-name').value.toLowerCase();
        const colorFilter = document.getElementById('filter-color').value;
        const rarityFilter = document.getElementById('filter-rarity').value;

        // Grouper par set
        const groups = {};
        for (const card of this.collection) {
            const key = card.set || 'UNKNOWN';
            if (!groups[key]) groups[key] = [];
            groups[key].push(card);
        }

        if (Object.keys(groups).length === 0) {
            grid.innerHTML = `<div class="empty-state"><p>Aucune carte dans votre collection</p><small>Ajoutez des cartes via "Scanner", "Ajouter" ou "Importer"</small></div>`;
            return;
        }

        // Trier les sets par date de sortie (récent d'abord)
        const sortedKeys = Object.keys(groups).sort((a, b) => {
            const sa = this.getSetInfo(a), sb = this.getSetInfo(b);
            if (sa?.released && sb?.released) return sb.released.localeCompare(sa.released);
            return a.localeCompare(b);
        });

        grid.innerHTML = sortedKeys.map(setCode => {
            const cards = groups[setCode];
            const setInfo = this.getSetInfo(setCode);
            const setName = setInfo?.name || cards[0]?.setName || setCode;
            const totalInSet = setInfo?.card_count || '?';
            const ownedUnique = new Set(cards.map(c => c.name)).size;
            const ownedCount = cards.reduce((s, c) => s + (c.quantity || 1), 0);
            const value = cards.reduce((s, c) => s + ((c.foil && c.priceFoil ? c.priceFoil : c.price) || 0) * (c.quantity || 1), 0);
            const pct = totalInSet !== '?' ? Math.round((ownedUnique / totalInSet) * 100) : 0;
            const missing = totalInSet !== '?' ? totalInSet - ownedUnique : '?';
            const pctClass = pct >= 80 ? 'high' : pct >= 40 ? 'mid' : 'low';
            const iconHtml = setInfo?.icon ? `<img class="edition-icon" src="${setInfo.icon}" alt="${setCode}">` : '';
            const isComplete = totalInSet !== '?' && ownedUnique >= totalInSet;

            return `<div class="edition-block" data-set="${setCode}">
                <div class="edition-header">
                    ${iconHtml}
                    <span class="edition-title">${setName}</span>
                    <span class="edition-code">${setCode}</span>
                    <div class="edition-stats">
                        <span class="edition-count"><strong>${ownedUnique}</strong> / ${totalInSet}</span>
                        ${isComplete
                            ? '<span class="edition-complete">COMPLETE</span>'
                            : `<span class="edition-missing">${missing} manquante${missing !== 1 && missing !== '?' ? 's' : ''}</span>`}
                        <span class="edition-value">${value.toFixed(2)} €</span>
                    </div>
                    <span class="edition-toggle">▼</span>
                </div>
                <div class="edition-progress"><div class="edition-progress-fill ${pctClass}" style="width:${pct}%"></div></div>
                <div class="edition-body" data-set-code="${setCode}">
                    <div class="edition-actions">
                        <a href="${RefSites.playin.searchUrl(setName)}" target="_blank" rel="noopener" class="edition-playin-link">🛒 Voir sur Playin</a>
                        <a href="${RefSites.mtgcards.searchUrl(setName)}" target="_blank" rel="noopener" class="edition-playin-link" style="background:#457b9d">📖 MTGCards.fr</a>
                        <button class="btn-secondary btn-load-missing" data-set="${setCode}" style="font-size:0.75rem;padding:0.3rem 0.6rem">Voir les cartes manquantes</button>
                    </div>
                    <div class="edition-section-title">Mes cartes (${ownedCount})</div>
                    <div class="edition-cards">${this.renderEditionCards(cards, nameFilter, colorFilter, rarityFilter)}</div>
                    <div class="edition-missing-cards" data-set="${setCode}"></div>
                </div>
            </div>`;
        }).join('');

        // Bind toggle (fermé par défaut, ouvre au clic)
        grid.querySelectorAll('.edition-header').forEach(header => {
            header.addEventListener('click', () => {
                header.parentElement.classList.toggle('open');
            });
        });

        // Bind card clicks
        this.bindCardClicks(grid);

        // Bind "voir manquantes"
        grid.querySelectorAll('.btn-load-missing').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.loadMissingCards(btn.dataset.set);
            });
        });
    },

    renderEditionCards(cards, nameFilter, colorFilter, rarityFilter) {
        let filtered = cards;
        if (nameFilter) filtered = filtered.filter(c => dn(c).toLowerCase().includes(nameFilter) || (c.name || '').toLowerCase().includes(nameFilter));
        if (colorFilter) {
            if (colorFilter === 'M') filtered = filtered.filter(c => c.colors?.length > 1);
            else if (colorFilter === 'C') filtered = filtered.filter(c => !c.colors?.length);
            else filtered = filtered.filter(c => c.colors?.includes(colorFilter));
        }
        if (rarityFilter) filtered = filtered.filter(c => c.rarity === rarityFilter);

        if (filtered.length === 0) return '<p style="color:var(--text-secondary);font-size:0.8rem;">Aucune carte avec ces filtres.</p>';
        filtered.sort((a, b) => (RARITY_ORDER[a.rarity] ?? 0) - (RARITY_ORDER[b.rarity] ?? 0));
        return filtered.map(c => this.renderCardItem(c)).join('');
    },

    async loadMissingCards(setCode) {
        const container = document.querySelector(`.edition-missing-cards[data-set="${setCode}"]`);
        const btn = document.querySelector(`.btn-load-missing[data-set="${setCode}"]`);
        if (!container) return;

        if (container.dataset.loaded === 'true') {
            container.classList.toggle('hidden');
            return;
        }

        btn.textContent = 'Chargement...';
        btn.disabled = true;

        const allCards = await this.loadSetCards(setCode);
        const ownedNames = new Set(this.collection.filter(c => c.set === setCode).map(c => c.name));

        const missing = allCards.filter(c => !ownedNames.has(c.name));

        if (missing.length === 0) {
            container.innerHTML = '<p class="edition-section-title" style="color:var(--success)">Edition complète !</p>';
        } else {
            container.innerHTML = `
                <div class="edition-section-title">Cartes manquantes (${missing.length})</div>
                <div class="edition-cards">
                    ${missing.map(c => {
                        const frName = c.printed_name || c.name;
                        const img = c.image_uris?.small || c.card_faces?.[0]?.image_uris?.small || '';
                        const price = c.prices?.eur || c.prices?.usd || '?';
                        return `<div class="card-item missing-card rarity-${c.rarity || 'common'}">
                            ${img ? `<img src="${img}" alt="${frName}" loading="lazy">` : `<div class="no-image">${frName}</div>`}
                            <div class="card-info">
                                <div class="card-name">${frName}</div>
                                <div class="card-meta"><span>${price} €</span>
                                    <a href="${RefSites.playin.searchUrl(frName)}" target="_blank" rel="noopener" style="color:var(--accent);font-size:0.65rem;text-decoration:none;">Playin</a>
                                </div>
                            </div>
                        </div>`;
                    }).join('')}
                </div>`;
        }

        container.dataset.loaded = 'true';
        btn.textContent = 'Masquer/Afficher manquantes';
        btn.disabled = false;
    },

    renderCardItem(card) {
        const displayName = dn(card);
        const imgHtml = card.image
            ? `<img src="${card.image}" alt="${displayName}" loading="lazy">`
            : `<div class="no-image">${displayName}</div>`;
        const qtyBadge = card.quantity > 1 ? `<div class="card-quantity">x${card.quantity}</div>` : '';
        const foilBadge = card.foil ? '<div class="card-foil-badge">FOIL</div>' : '';
        const displayPrice = card.foil && card.priceFoil > 0 ? card.priceFoil : (card.price || 0);
        const priceHtml = displayPrice > 0 ? `<span class="card-price">${displayPrice.toFixed(2)} €</span>` : '';

        return `<div class="card-item rarity-${card.rarity || 'common'}${card.foil ? ' foil' : ''}" data-id="${card.id}">
            ${qtyBadge}${foilBadge}
            ${imgHtml}
            <div class="card-hover-links">${buildRefLinks(displayName, 'ref-link-small')}</div>
            <div class="card-info">
                <div class="card-name">${displayName}</div>
                <div class="card-meta"><span>${card.set || ''}</span>${priceHtml}</div>
            </div>
        </div>`;
    },

    bindCardClicks(container) {
        container.querySelectorAll('.card-item:not(.missing-card)').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.ref-link')) return;
                this.showCardModal(el.dataset.id);
            });
        });
    },

    updateStats() {
        const total = this.collection.reduce((s, c) => s + (c.quantity || 1), 0);
        const value = this.collection.reduce((s, c) => s + ((c.foil && c.priceFoil > 0 ? c.priceFoil : c.price) || 0) * (c.quantity || 1), 0);
        const sets = new Set(this.collection.map(c => c.set).filter(Boolean)).size;
        document.getElementById('total-cards').textContent = `${total} carte${total !== 1 ? 's' : ''} · ${sets} édition${sets !== 1 ? 's' : ''}`;
        document.getElementById('total-value').textContent = `${value.toFixed(2)} €`;
    },

    async refreshPrices() {
        const btn = document.getElementById('btn-refresh-prices');
        if (btn) { btn.disabled = true; btn.textContent = 'Mise à jour...'; }
        let updated = 0;
        for (const card of this.collection) {
            if (!card.name) continue;
            try {
                const prices = await this.fetchPriceEN(card.name);
                if (prices && (prices.price > 0 || prices.priceFoil > 0)) {
                    card.price = prices.price;
                    card.priceFoil = prices.priceFoil;
                    updated++;
                }
                await new Promise(r => setTimeout(r, 100));
            } catch {}
        }
        this.saveCollection();
        this.renderCollection();
        this.updateStats();
        if (btn) { btn.disabled = false; btn.textContent = 'Rafraîchir les prix'; }
        this.showToast(`${updated} prix mis à jour !`);
    },

    async removeDuplicates() {
        // Étape 1 : fusionner les entrées séparées pour la même carte
        const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
        const cardKeys = card => {
            const set = (card.set || '').toUpperCase();
            const foil = card.foil ? '1' : '0';
            const keys = new Set();
            if (card.name) keys.add(norm(card.name) + '||' + set + '||' + foil);
            if (card.frName) keys.add(norm(card.frName) + '||' + set + '||' + foil);
            return [...keys];
        };
        const n = this.collection.length;
        const parent = Array.from({ length: n }, (_, i) => i);
        const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
        const union = (i, j) => { parent[find(i)] = find(j); };
        const lookup = new Map();
        for (let i = 0; i < n; i++) {
            for (const key of cardKeys(this.collection[i])) {
                if (lookup.has(key)) union(i, lookup.get(key));
                else lookup.set(key, i);
            }
        }
        const groups = new Map();
        for (let i = 0; i < n; i++) {
            const root = find(i);
            if (!groups.has(root)) groups.set(root, []);
            groups.get(root).push(this.collection[i]);
        }
        const dupeGroups = [...groups.values()].filter(g => g.length > 1);
        let mergedEntries = 0;
        const afterMerge = [];
        const seen = new Set();
        for (let i = 0; i < n; i++) {
            const root = find(i);
            if (seen.has(root)) continue;
            seen.add(root);
            const group = groups.get(root);
            if (group.length === 1) { afterMerge.push({ ...group[0] }); continue; }
            mergedEntries += group.length - 1;
            const best = group.reduce((a, b) => {
                let score = 0;
                if (b.image && !a.image) score++;
                if ((b.price || 0) > 0 && !(a.price > 0)) score++;
                if (b.id && !b.id.startsWith('manual-') && !b.id.startsWith('import-')) score++;
                return score >= 2 ? b : a;
            });
            afterMerge.push({ ...best, quantity: group.reduce((s, c) => s + (c.quantity || 1), 0) });
        }

        // Étape 2 : cartes avec quantity > 1 (exemplaires en double)
        const withQty = afterMerge.filter(c => (c.quantity || 1) > 1);

        if (mergedEntries === 0 && withQty.length === 0) {
            this.showToast('Aucun doublon trouve !');
            return;
        }

        let msg = '';
        if (mergedEntries > 0) msg += `${mergedEntries} entree(s) dupliquee(s) a fusionner.\n`;
        if (withQty.length > 0) msg += `${withQty.length} carte(s) ont plusieurs exemplaires (x2, x3...).\nRemettre toutes les quantites a 1 ?`;

        if (!confirm(msg + '\n\nContinuer ?')) return;

        // Bloquer le listener Firebase pour éviter qu'il réécrase nos changements
        this._ignoringSnapshot = true;
        clearTimeout(this._cloudSaveTimer);

        // Appliquer fusion des entrées
        this.collection = afterMerge;

        // Remettre les quantités à 1
        if (withQty.length > 0) {
            for (const card of this.collection) card.quantity = 1;
        }

        localStorage.setItem('mtg-collection', JSON.stringify(this.collection));
        this.updateStats();
        this.renderCollection();

        // Pousser immédiatement sans attendre le debounce
        await this._pushToCloud();
        this._ignoringSnapshot = false;

        const total = mergedEntries + withQty.length;
        this.showToast(`${total} doublon(s) supprimes !`);
    },

    // ================================================================
    // SCRYFALL FR SEARCH
    // ================================================================
    async scryfallSearch(query) {
        try {
            const resp = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(query)}&order=name`);
            if (!resp.ok) return null;
            return (await resp.json()).data || null;
        } catch { return null; }
    },

    async searchScryfall() {
        const query = document.getElementById('scryfall-search').value.trim();
        if (!query) return;
        const container = document.getElementById('search-results');
        container.innerHTML = '<div class="loading">Recherche en français</div>';
        let cards = await this.scryfallSearch(`${query} lang:fr`);
        if (!cards) cards = await this.scryfallSearch(`${query} lang:any`);
        if (!cards) cards = await this.scryfallSearch(query);
        if (!cards || !cards.length) { container.innerHTML = '<p style="color:var(--text-secondary)">Aucun résultat.</p>'; return; }
        this.renderSearchResults(cards.slice(0, 20), container);
    },

    renderSearchResults(cards, container) {
        container.innerHTML = cards.map(card => {
            const cardData = this.scryfallToCard(card);
            const displayName = dn(cardData);
            const img = card.image_uris?.normal || card.card_faces?.[0]?.image_uris?.normal || '';
            const price = cardData.price > 0 ? cardData.price.toFixed(2) : '?';
            return `<div class="search-result-item" data-scryfall='${JSON.stringify(cardData).replace(/'/g, "&#39;")}'>
                ${img ? `<img src="${img}" alt="${displayName}" loading="lazy">` : ''}
                <div class="result-info"><span class="result-name">${displayName}</span><span class="result-price">${price} €</span></div>
                <div class="result-ref-links">${buildRefLinks(displayName, 'ref-link-small')}</div>
            </div>`;
        }).join('');
        container.querySelectorAll('.search-result-item').forEach(el => {
            el.addEventListener('click', (e) => {
                if (e.target.closest('.ref-link')) return;
                const cardData = JSON.parse(el.dataset.scryfall);
                this.addToCollection(cardData);
                this.showToast(`${dn(cardData)} ajoutée !`);
            });
        });
    },

    scryfallToCard(sc) {
        return {
            id: sc.id,
            name: sc.name,
            frName: sc.printed_name || sc.name,
            set: sc.set?.toUpperCase(),
            setName: sc.set_name,
            colors: sc.colors || sc.card_faces?.[0]?.colors || [],
            type: sc.printed_type_line || sc.type_line,
            rarity: sc.rarity,
            price: parseFloat(sc.prices?.eur || sc.prices?.usd || 0),
            priceFoil: parseFloat(sc.prices?.eur_foil || sc.prices?.usd_foil || 0),
            image: sc.image_uris?.normal || sc.card_faces?.[0]?.image_uris?.normal || '',
            quantity: 1,
            foil: false,
            lang: sc.lang
        };
    },

    async fetchPriceEN(cardName) {
        try {
            const resp = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}`);
            if (!resp.ok) return null;
            const data = await resp.json();
            return {
                price: parseFloat(data.prices?.eur || data.prices?.usd || 0),
                priceFoil: parseFloat(data.prices?.eur_foil || data.prices?.usd_foil || 0)
            };
        } catch { return null; }
    },

    // --- Add to Collection ---
    addToCollection(card) {
        const existing = this.collection.find(c => c.id === card.id);
        if (existing) {
            existing.quantity = (existing.quantity || 1) + 1;
        } else {
            if (!card.id) card.id = 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
            this.collection.push(card);
        }
        if (card.set) delete this.setCardsCache[card.set];
        this.saveCollection();
        this.renderCollection();
        if (!card.price && card.name) this.fillPriceEN(card);
    },

    async fillPriceEN(card) {
        const prices = await this.fetchPriceEN(card.name);
        if (!prices) return;
        card.price = prices.price;
        card.priceFoil = prices.priceFoil;
        this.saveCollection();
        this.renderCollection();
        this.updateStats();
    },

    addManualCard() {
        const card = {
            id: 'manual-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8),
            name: document.getElementById('manual-name').value.trim(),
            frName: document.getElementById('manual-name').value.trim(),
            set: document.getElementById('manual-set').value.trim().toUpperCase(),
            colors: document.getElementById('manual-color').value ? [document.getElementById('manual-color').value] : [],
            type: document.getElementById('manual-type').value,
            rarity: document.getElementById('manual-rarity').value,
            quantity: parseInt(document.getElementById('manual-quantity').value) || 1,
            foil: document.getElementById('manual-foil').checked,
            price: 0, priceFoil: 0, image: ''
        };
        if (!card.name) return;
        this.collection.push(card);
        this.saveCollection();
        this.renderCollection();
        this.showToast(`${card.frName} ajoutée !`);
        document.getElementById('manual-form').reset();
        document.getElementById('manual-quantity').value = '1';
        this.enrichCardFromScryfall(card);
    },

    async enrichCardFromScryfall(card) {
        try {
            let resp = await fetch(`https://api.scryfall.com/cards/search?q=${encodeURIComponent(card.name)}+lang:fr&order=name`);
            let data;
            if (resp.ok) data = (await resp.json()).data?.[0];
            if (!data) {
                resp = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(card.name)}`);
                if (!resp.ok) return;
                data = await resp.json();
            }
            const idx = this.collection.findIndex(c => c.id === card.id);
            if (idx === -1) return;
            const c = this.collection[idx];
            c.image = data.image_uris?.normal || data.card_faces?.[0]?.image_uris?.normal || c.image;
            c.colors = data.colors || data.card_faces?.[0]?.colors || c.colors;
            c.type = data.printed_type_line || data.type_line || c.type;
            c.rarity = data.rarity || c.rarity;
            c.frName = data.printed_name || data.name || c.frName;
            if (!c.set) c.set = data.set?.toUpperCase();
            c.setName = data.set_name || c.setName;
            // Prix : la version FR a souvent les prix null, on prend la version EN
            const enName = data.name || card.name;
            const prices = await this.fetchPriceEN(enName);
            c.price = prices?.price || parseFloat(data.prices?.eur || data.prices?.usd || 0);
            c.priceFoil = prices?.priceFoil || parseFloat(data.prices?.eur_foil || data.prices?.usd_foil || 0);
            this.saveCollection();
            this.renderCollection();
        } catch {}
    },

    // --- Card Modal ---
    showCardModal(cardId) {
        const card = this.collection.find(c => c.id === cardId);
        if (!card) return;
        const displayName = dn(card);

        document.getElementById('modal-image').src = card.image || '';
        document.getElementById('modal-image').style.display = card.image ? 'block' : 'none';
        document.getElementById('modal-name').textContent = displayName;
        document.getElementById('modal-type').textContent = `Type: ${card.type || 'Inconnu'}`;
        document.getElementById('modal-set').textContent = `Extension: ${card.setName || card.set || 'Inconnue'}`;
        document.getElementById('modal-rarity').textContent = `Rareté: ${this.rarityLabel(card.rarity)}`;
        const displayPrice = card.foil && card.priceFoil > 0 ? card.priceFoil : (card.price || 0);
        document.getElementById('modal-price').textContent = `Prix: ${displayPrice > 0 ? displayPrice.toFixed(2) + ' €' : 'Inconnu'}${card.foil ? ' (Foil)' : ''}`;
        document.getElementById('modal-quantity').value = card.quantity || 1;
        document.getElementById('modal-foil').checked = card.foil || false;

        let ref = document.getElementById('modal-ref-links');
        if (!ref) { ref = document.createElement('div'); ref.id = 'modal-ref-links'; ref.className = 'ref-links-bar'; document.getElementById('modal-price').after(ref); }
        ref.innerHTML = `<span class="ref-links-label">Voir prix sur :</span>${buildRefLinks(displayName)}`;

        document.getElementById('card-modal').classList.remove('hidden');
        document.getElementById('card-modal').dataset.cardId = cardId;
    },

    updateCardQuantity(e) {
        const card = this.collection.find(c => c.id === document.getElementById('card-modal').dataset.cardId);
        if (card) { card.quantity = parseInt(e.target.value) || 1; this.saveCollection(); this.renderCollection(); }
    },

    updateCardFoil(e) {
        const card = this.collection.find(c => c.id === document.getElementById('card-modal').dataset.cardId);
        if (!card) return;
        card.foil = e.target.checked;
        const displayPrice = card.foil && card.priceFoil > 0 ? card.priceFoil : (card.price || 0);
        document.getElementById('modal-price').textContent = `Prix: ${displayPrice > 0 ? displayPrice.toFixed(2) + ' €' : 'Inconnu'}${card.foil ? ' (Foil)' : ''}`;
        this.saveCollection();
        this.renderCollection();
    },

    removeCard() {
        const id = document.getElementById('card-modal').dataset.cardId;
        const card = this.collection.find(c => c.id === id);
        if (card?.set) delete this.setCardsCache[card.set];
        this.collection = this.collection.filter(c => c.id !== id);
        this.saveCollection();
        this.renderCollection();
        this.closeModals();
        this.showToast('Carte retirée.');
    },

    // --- Import/Export ---
    pendingImport: null,
    handleFileImport(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const cards = this.parseCSV(e.target.result);
            if (!cards.length) { this.showToast('Aucune carte.', true); return; }
            this.pendingImport = cards; this.showImportPreview(cards);
        };
        reader.readAsText(file);
    },
    parseCSV(text) {
        const lines = text.trim().split('\n'); if (lines.length < 2) return [];
        const sep = lines[0].includes('\t') ? '\t' : ',';
        const h = lines[0].split(sep).map(x => x.trim().replace(/"/g, '').toLowerCase());
        const ni = h.findIndex(x => ['name', 'nom', 'card_name', 'cardname'].includes(x)); if (ni === -1) return [];
        const si = h.findIndex(x => ['set', 'edition', 'set_code', 'extension'].includes(x));
        const qi = h.findIndex(x => ['quantity', 'qty', 'count', 'quantité'].includes(x));
        const pi = h.findIndex(x => ['price', 'prix', 'purchase_price'].includes(x));
        const cards = [];
        for (let i = 1; i < lines.length; i++) {
            const v = this.parseCSVLine(lines[i], sep); const name = v[ni]?.trim(); if (!name) continue;
            cards.push({ id: 'import-' + Date.now() + '-' + i, name, frName: name,
                set: si >= 0 ? (v[si]?.trim().toUpperCase() || '') : '',
                quantity: qi >= 0 ? (parseInt(v[qi]) || 1) : 1,
                price: pi >= 0 ? (parseFloat(v[pi]) || 0) : 0,
                colors: [], type: '', rarity: '', image: '' });
        }
        return cards;
    },
    parseCSVLine(line, sep) { const v = []; let c = '', q = false; for (const ch of line) { if (ch === '"') q = !q; else if (ch === sep && !q) { v.push(c.trim()); c = ''; } else c += ch; } v.push(c.trim()); return v; },
    showImportPreview(cards) {
        const d = cards.slice(0, 20);
        document.getElementById('import-preview-content').innerHTML = `<p>${cards.length} carte(s)</p><table><thead><tr><th>Nom</th><th>Set</th><th>Qté</th></tr></thead><tbody>${d.map(c => `<tr><td>${c.name}</td><td>${c.set}</td><td>${c.quantity}</td></tr>`).join('')}${cards.length > 20 ? `<tr><td colspan="3">...et ${cards.length - 20} autres</td></tr>` : ''}</tbody></table>`;
        document.getElementById('import-preview').classList.remove('hidden');
    },
    async confirmImport() {
        if (!this.pendingImport) return;
        for (const c of this.pendingImport) this.addToCollection(c);
        this.showToast(`${this.pendingImport.length} carte(s) importée(s) !`);
        this.pendingImport = null; document.getElementById('import-preview').classList.add('hidden');
        for (const c of this.collection.filter(x => !x.image)) { await new Promise(r => setTimeout(r, 100)); await this.enrichCardFromScryfall(c); }
    },
    cancelImport() { this.pendingImport = null; document.getElementById('import-preview').classList.add('hidden'); },
    exportCSV() {
        if (!this.collection.length) { this.showToast('Collection vide.', true); return; }
        const rows = this.collection.map(c => [`"${dn(c)}"`, `"${c.name || ''}"`, c.set || '', c.quantity || 1, c.price || 0, c.rarity || '', `"${c.type || ''}"`, (c.colors || []).join('')]);
        const csv = ['Nom FR,Nom EN,Set,Quantity,Price,Rarity,Type,Colors', ...rows.map(r => r.join(','))].join('\n');
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
        a.download = `mtg-collection-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); this.showToast('Export téléchargé !');
    },

    backupJSON() {
        const backup = {
            version: 1,
            date: new Date().toISOString(),
            collection: this.collection,
            setsCache: this.setsCache
        };
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `mtg-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        this.showToast('Backup téléchargé !');
    },

    restoreBackup(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                if (!backup.collection || !Array.isArray(backup.collection)) {
                    this.showToast('Fichier invalide.', true);
                    return;
                }
                if (!confirm(`Restaurer ${backup.collection.length} cartes du ${new Date(backup.date).toLocaleDateString('fr-FR')} ? Cela remplacera la collection actuelle.`)) return;
                this.collection = backup.collection;
                if (backup.setsCache) { this.setsCache = backup.setsCache; this.saveSetsCache(); }
                this.saveCollection();
                this.renderCollection();
                this.showToast(`${this.collection.length} cartes restaurées !`);
            } catch { this.showToast('Erreur de lecture du backup.', true); }
        };
        reader.readAsText(file);
    },

    // --- Excel JSON Import ---
    async importExcelJSON(file) {
        const text = await file.text();
        let cards;
        try { cards = JSON.parse(text); } catch { this.showToast('Fichier JSON invalide.', true); return; }
        if (!Array.isArray(cards) || !cards.length) { this.showToast('Aucune carte dans le fichier.', true); return; }

        // Bloquer le listener Firebase pendant tout l'import pour éviter qu'il réécrase la collection
        this._ignoringSnapshot = true;
        clearTimeout(this._cloudSaveTimer);

        const progressEl = document.getElementById('excel-import-progress');
        const fillEl = document.getElementById('excel-progress-fill');
        const textEl = document.getElementById('excel-progress-text');
        const logEl = document.getElementById('excel-import-log');
        progressEl.classList.remove('hidden');
        logEl.innerHTML = '';

        // Group by set
        const bySet = {};
        for (const c of cards) {
            if (!bySet[c.set]) bySet[c.set] = [];
            bySet[c.set].push(c);
        }

        const sets = Object.keys(bySet);
        let totalAdded = 0, totalNotFound = 0;
        const notFoundList = [];

        for (let si = 0; si < sets.length; si++) {
            const setCode = sets[si];
            const setCards = bySet[setCode];
            const setInfo = this.getSetInfo(setCode);
            const setName = setInfo?.name || setCode;
            textEl.textContent = `Chargement de ${setName} (${si + 1}/${sets.length})...`;
            fillEl.style.width = `${((si) / sets.length) * 100}%`;

            // Fetch all cards of this set from Scryfall (FR + EN)
            const allSetCards = await this.loadSetCards(setCode, true);
            await new Promise(r => setTimeout(r, 150));

            // Build a name lookup map (normalized French name -> scryfall card)
            const nameMap = new Map();
            for (const sc of allSetCards) {
                const frName = (sc.printed_name || sc.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
                const enName = (sc.name || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
                if (frName) nameMap.set(frName, sc);
                if (enName && enName !== frName) nameMap.set(enName, sc);
                // Also store printed_name without normalization for exact match
                const frExact = (sc.printed_name || '').toLowerCase().trim();
                if (frExact) nameMap.set(frExact, sc);
                const enExact = (sc.name || '').toLowerCase().trim();
                if (enExact) nameMap.set(enExact, sc);
            }

            // Match each card from Excel
            for (const exCard of setCards) {
                const searchName = exCard.name.trim();
                const normalized = searchName.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9\s]/g, '').trim();
                const exact = searchName.toLowerCase().trim();

                let match = nameMap.get(exact) || nameMap.get(normalized);

                // Fuzzy: try without trailing 's' or with 'e' variants
                if (!match) {
                    for (const [key, val] of nameMap) {
                        if (key.startsWith(normalized.slice(0, Math.max(6, normalized.length - 3)))) {
                            match = val; break;
                        }
                    }
                }

                if (match) {
                    const cardData = this.scryfallToCard(match);
                    cardData.quantity = exCard.qty || 1;
                    // Check if already in collection
                    const existing = this.collection.find(c => c.id === cardData.id);
                    if (existing) {
                        existing.quantity = (existing.quantity || 1) + cardData.quantity;
                    } else {
                        this.collection.push(cardData);
                    }
                    totalAdded++;
                } else {
                    notFoundList.push({ name: searchName, set: setCode });
                    totalNotFound++;
                }
            }

            logEl.innerHTML += `<div>✅ ${setName}: ${setCards.length - notFoundList.filter(x => x.set === setCode).length} trouvées, ${notFoundList.filter(x => x.set === setCode).length} non trouvées</div>`;
            logEl.scrollTop = logEl.scrollHeight;
        }

        // Save & render
        this.saveCollection();
        this.renderCollection();

        fillEl.style.width = '100%';
        textEl.textContent = `Terminé ! ${totalAdded} cartes ajoutées, ${totalNotFound} non trouvées.`;

        if (notFoundList.length > 0) {
            logEl.innerHTML += `<div class="not-found-header">❌ Cartes non trouvées (${notFoundList.length}) :</div>`;
            logEl.innerHTML += notFoundList.map(c => `<div class="not-found-item">${c.name} (${c.set})</div>`).join('');
        }

        // Fetch EN prices for cards with price 0
        textEl.textContent += ' Récupération des prix...';
        let priceCount = 0;
        const newCards = this.collection.filter(c => !c.price || c.price === 0);
        for (const card of newCards) {
            if (!card.name) continue;
            try {
                const prices = await this.fetchPriceEN(card.name);
                if (prices && (prices.price > 0 || prices.priceFoil > 0)) {
                    card.price = prices.price;
                    card.priceFoil = prices.priceFoil;
                    priceCount++;
                }
            } catch {}
            await new Promise(r => setTimeout(r, 80));
        }
        localStorage.setItem('mtg-collection', JSON.stringify(this.collection));
        this.updateStats();
        this.renderCollection();
        // Pousser vers le cloud puis réactiver le listener
        await this._pushToCloud();
        this._ignoringSnapshot = false;
        textEl.textContent = `✅ Import terminé ! ${totalAdded} cartes ajoutées, ${priceCount} prix récupérés, ${totalNotFound} non trouvées.`;
        this.showToast(`${totalAdded} cartes importées depuis Excel !`);
    },

    // --- Scanner ---
    cameraStream: null,
    async startCamera() {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } });
            document.getElementById('camera-feed').srcObject = this.cameraStream;
            document.getElementById('btn-start-camera').classList.add('hidden');
            document.getElementById('btn-capture').classList.remove('hidden');
            document.getElementById('btn-stop-camera').classList.remove('hidden');
            this.setScanStatus('Placez la carte dans le cadre et cliquez Capturer.', '');
        } catch { this.setScanStatus('Impossible d\'accéder à la caméra.', 'error'); }
    },
    stopCamera() {
        if (this.cameraStream) { this.cameraStream.getTracks().forEach(t => t.stop()); this.cameraStream = null; }
        document.getElementById('camera-feed').srcObject = null;
        document.getElementById('btn-start-camera').classList.remove('hidden');
        document.getElementById('btn-capture').classList.add('hidden');
        document.getElementById('btn-stop-camera').classList.add('hidden');
    },
    async captureCard() {
        const video = document.getElementById('camera-feed'), canvas = document.getElementById('camera-canvas'), ctx = canvas.getContext('2d');
        canvas.width = video.videoWidth; canvas.height = video.videoHeight; ctx.drawImage(video, 0, 0);
        const gf = document.querySelector('.guide-frame'), cz = document.querySelector('.camera-zone'), vr = cz.getBoundingClientRect();
        const sx = video.videoWidth / vr.width, sy = video.videoHeight / vr.height, fr = gf.getBoundingClientRect();
        const cX = Math.max(0, Math.floor((fr.left - vr.left) * sx)), cY = Math.max(0, Math.floor((fr.top - vr.top) * sy));
        const cW = Math.min(Math.floor(fr.width * sx), video.videoWidth - cX), cH = Math.min(Math.floor(fr.height * sy), video.videoHeight - cY);
        const cc = document.createElement('canvas'); cc.width = cW; cc.height = cH; cc.getContext('2d').drawImage(canvas, cX, cY, cW, cH, 0, 0, cW, cH);
        document.getElementById('scan-preview').src = cc.toDataURL(); document.getElementById('scan-preview').classList.remove('hidden');
        // Step 1: Collector number (bottom of card — standardized font)
        this.setScanStatus('Lecture du numéro de collecteur...', 'processing');
        const collectorInfo = await this.ocrCollectorZone(cc, cW, cH);

        if (collectorInfo && collectorInfo.number && collectorInfo.set) {
            this.setScanStatus(`N° ${collectorInfo.number} (${collectorInfo.set.toUpperCase()}) — Recherche...`, 'processing');
            const scryfallCard = await this.fetchByCollectorNumber(collectorInfo.number, collectorInfo.set);
            if (scryfallCard) {
                const displayName = scryfallCard.printed_name || scryfallCard.name;
                this.setScanStatus(`Carte identifiée : ${displayName}`, 'success');
                document.getElementById('scan-detected-name').classList.remove('hidden');
                document.getElementById('scan-name-input').value = displayName;
                this.showScanRefLinks(displayName);
                this.renderSearchResults([scryfallCard], document.getElementById('scan-candidates'));
                return;
            }
        }

        // Step 2: Title OCR (fallback)
        this.setScanStatus('Lecture du titre (OCR français)...', 'processing');
        const det = await this.ocrTitleZone(cc, cW, cH);

        document.getElementById('scan-detected-name').classList.remove('hidden');
        document.getElementById('scan-name-input').value = det;
        document.getElementById('scan-name-input').focus();

        if (det.length >= 2) {
            this.setScanStatus(`Détecté : "${det}" — corrigez si besoin`, 'success');
            this.showScanRefLinks(det);
            this.scanSearchFR(det);
        } else {
            this.setScanStatus('Nom non reconnu. Tapez le nom ou le n° collecteur (ex: 42 MKM).', 'error');
        }
    },
    extractCardName(t) {
        for (const l of t.trim().split('\n').map(x => x.trim()).filter(x => x.length > 1)) {
            const c = l.replace(/[^a-zA-ZàâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ\s',\-\.]/g, '').trim();
            if (c.length >= 3 && /[a-zA-ZàâäéèêëïîôùûüçœæÀÂÄÉÈÊËÏÎÔÙÛÜÇŒÆ]{2,}/.test(c)) return c;
        }
        return '';
    },

    async ocrCollectorZone(cardCanvas, w, h) {
        const zX = Math.floor(w * 0.03), zY = Math.floor(h * 0.87);
        const zW = Math.floor(w * 0.60), zH = Math.floor(h * 0.09);
        const sc = 6;
        const tc = document.createElement('canvas');
        tc.width = zW * sc; tc.height = zH * sc;
        const ctx = tc.getContext('2d');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(cardCanvas, zX, zY, zW, zH, 0, 0, zW * sc, zH * sc);
        this.preprocessForOCR(tc);
        try {
            const r = await Tesseract.recognize(tc.toDataURL(), 'eng', { logger: () => {} });
            return this.parseCollectorInfo(r.data.text);
        } catch {}
        return null;
    },

    preprocessForOCR(canvas) {
        const ctx = canvas.getContext('2d');
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const px = imgData.data;
        const gs = [];
        for (let i = 0; i < px.length; i += 4) {
            const g = Math.round(0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]);
            gs.push(g); px[i] = px[i + 1] = px[i + 2] = g;
        }
        const th = this.otsuThreshold(gs);
        for (let i = 0; i < gs.length; i++) {
            const v = gs[i] > th ? 255 : 0;
            px[i * 4] = px[i * 4 + 1] = px[i * 4 + 2] = v;
        }
        ctx.putImageData(imgData, 0, 0);
    },

    otsuThreshold(grays) {
        let mn = 255, mx = 0;
        for (const g of grays) { if (g < mn) mn = g; if (g > mx) mx = g; }
        const rg = mx - mn || 1;
        const hist = new Array(256).fill(0);
        for (const g of grays) hist[Math.round(((g - mn) / rg) * 255)]++;
        let total = 0;
        for (let i = 0; i < 256; i++) total += i * hist[i];
        let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
        for (let i = 0; i < 256; i++) {
            wB += hist[i]; if (!wB) continue;
            const wF = grays.length - wB; if (!wF) break;
            sumB += i * hist[i];
            const diff = (sumB / wB) - ((total - sumB) / wF);
            const v = wB * wF * diff * diff;
            if (v > maxVar) { maxVar = v; threshold = i; }
        }
        return Math.round(mn + (threshold / 255) * rg);
    },

    parseCollectorInfo(text) {
        if (!text) return null;
        const clean = text.replace(/[^0-9a-zA-Z\/\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const numMatch = clean.match(/(\d{1,4}[a-zA-Z]?)\s*[\/\\]\s*(\d{1,4})/);
        const words = clean.match(/\b([a-zA-Z]{3,5})\b/g) || [];
        const set = words.map(w => w.toUpperCase()).find(w => this.setsCache[w]);
        if (numMatch && set) {
            return { number: numMatch[1].toLowerCase(), total: numMatch[2], set: set.toLowerCase() };
        }
        const simpleMatch = clean.match(/(\d{1,4}[a-zA-Z]?)\s+([a-zA-Z]{3,5})/);
        if (simpleMatch) {
            const s = simpleMatch[2].toUpperCase();
            if (this.setsCache[s]) return { number: simpleMatch[1].toLowerCase(), total: null, set: s.toLowerCase() };
        }
        return null;
    },

    async fetchByCollectorNumber(number, setCode) {
        try {
            let resp = await fetch(`https://api.scryfall.com/cards/${setCode}/${number}/fr`);
            if (resp.ok) return await resp.json();
            resp = await fetch(`https://api.scryfall.com/cards/${setCode}/${number}`);
            if (resp.ok) return await resp.json();
        } catch {}
        return null;
    },

    async ocrTitleZone(cardCanvas, w, h) {
        const tX = Math.floor(w * 0.08), tY = Math.floor(h * 0.03);
        const tW = Math.floor(w * 0.82), tH = Math.floor(h * 0.09);
        const sc = 4;
        const tc = document.createElement('canvas');
        tc.width = tW * sc; tc.height = tH * sc;
        const ctx = tc.getContext('2d');
        ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(cardCanvas, tX, tY, tW, tH, 0, 0, tW * sc, tH * sc);
        this.preprocessForOCR(tc);
        try {
            let r = await Tesseract.recognize(tc.toDataURL(), 'fra', { logger: () => {} });
            let name = this.extractCardName(r.data.text);
            if (name.length >= 3) return name;
            r = await Tesseract.recognize(cardCanvas.toDataURL(), 'fra', { logger: () => {} });
            return this.extractCardName(r.data.text);
        } catch {}
        return '';
    },

    showScanRefLinks(name) { document.getElementById('scan-ref-links').innerHTML = `<span class="ref-links-label">Chercher sur :</span>${buildRefLinks(name)}`; },
    async scanSearch() {
        const n = document.getElementById('scan-name-input').value.trim();
        if (!n) return;
        const collectorMatch = n.match(/^(\d{1,4}[a-zA-Z]?)(?:\s*\/\s*\d{1,4})?\s+([a-zA-Z]{3,5})$/);
        if (collectorMatch) {
            const num = collectorMatch[1].toLowerCase(), set = collectorMatch[2].toLowerCase();
            this.setScanStatus(`Recherche n°${num} dans ${set.toUpperCase()}...`, 'processing');
            const card = await this.fetchByCollectorNumber(num, set);
            if (card) {
                const displayName = card.printed_name || card.name;
                this.setScanStatus(`Carte identifiée : ${displayName}`, 'success');
                this.showScanRefLinks(displayName);
                this.renderSearchResults([card], document.getElementById('scan-candidates'));
                return;
            }
        }
        this.showScanRefLinks(n);
        this.scanSearchFR(n);
    },
    async scanSearchFR(name) {
        const c = document.getElementById('scan-candidates');
        c.innerHTML = '<div class="loading">Recherche FR</div>';
        let cards = await this.scryfallSearch(`${name} lang:fr`);
        if (!cards) cards = await this.scryfallSearch(`${name} lang:any`);
        if (!cards) cards = await this.scryfallSearch(name);
        if (!cards?.length) { c.innerHTML = '<p style="color:var(--text-secondary)">Aucun résultat.</p>'; return; }
        this.renderSearchResults(cards.slice(0, 8), c);
    },
    setScanStatus(t, cls) { const el = document.getElementById('scan-status'); el.textContent = t; el.className = 'scan-status' + (cls ? ' ' + cls : ''); },

    // --- Utils ---
    closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden')); },
    showToast(msg, err = false) { const t = document.createElement('div'); t.className = `toast${err ? ' error' : ''}`; t.textContent = msg; document.body.appendChild(t); setTimeout(() => t.remove(), 3000); },
    rarityLabel(r) { return { common: 'Commune', uncommon: 'Peu commune', rare: 'Rare', mythic: 'Mythique' }[r] || r || 'Inconnue'; },

    // ================================================================
    // FIREBASE — Sync cloud entre appareils
    // ================================================================
    initFirebase() {
        if (!FIREBASE_CONFIG.apiKey || typeof firebase === 'undefined') {
            const authBar = document.getElementById('auth-bar');
            if (authBar) authBar.classList.add('hidden');
            return;
        }
        try {
            firebase.initializeApp(FIREBASE_CONFIG);
            this.fbAuth = firebase.auth();
            this.fbDb = firebase.firestore();
            this.fbDb.enablePersistence({ synchronizeTabs: true }).catch(() => {});
            this.fbAuth.onAuthStateChanged(user => this.onAuthChanged(user));
        } catch (e) {
            console.warn('Firebase init error:', e);
            const authBar = document.getElementById('auth-bar');
            if (authBar) authBar.classList.add('hidden');
        }
    },

    onAuthChanged(user) {
        const signInBtn = document.getElementById('btn-sign-in');
        const userInfo = document.getElementById('user-info');
        if (user) {
            signInBtn.classList.add('hidden');
            userInfo.classList.remove('hidden');
            const avatar = document.getElementById('user-avatar');
            if (user.photoURL) { avatar.src = user.photoURL; avatar.style.display = ''; }
            else { avatar.style.display = 'none'; }
            document.getElementById('user-name').textContent = user.displayName || user.email || 'Utilisateur';
            this.startCloudSync(user.uid);
        } else {
            signInBtn.classList.remove('hidden');
            userInfo.classList.add('hidden');
            this.stopCloudSync();
        }
    },

    async signIn() {
        if (!this.fbAuth) return;
        try {
            const provider = new firebase.auth.GoogleAuthProvider();
            await this.fbAuth.signInWithPopup(provider);
        } catch (e) {
            if (e.code !== 'auth/popup-closed-by-user' && e.code !== 'auth/cancelled-popup-request') {
                this.showToast('Erreur de connexion Google.', true);
                console.warn('Sign-in error:', e);
            }
        }
    },

    async signOut() {
        if (!this.fbAuth) return;
        this.stopCloudSync();
        await this.fbAuth.signOut();
        this.showToast('Deconnecte.');
    },

    async startCloudSync(uid) {
        this._syncUid = uid;
        this.showSyncStatus('saving');

        try {
            const docRef = this.fbDb.collection('users').doc(uid);
            const doc = await docRef.get();

            if (doc.exists) {
                const cloudManifest = doc.data().collection || [];
                const localCards = this.collection;

                if (cloudManifest.length > 0) {
                    if (localCards.length > 0) {
                        // Fusion : appliquer les quantités/foil du cloud sur les cartes locales
                        // + ajouter les IDs cloud absents en local (avec données minimales)
                        this.collection = this.mergeCollections(cloudManifest, localCards);
                    } else {
                        // Pas de données locales : reconstruire depuis le manifest cloud
                        // On garde les entrées slim — les images seront chargées à l'affichage
                        this.collection = cloudManifest;
                    }
                    localStorage.setItem('mtg-collection', JSON.stringify(this.collection));
                    this.renderCollection();
                    this.updateStats();
                }
            }

            // Pousser l'etat courant vers le cloud
            await this._pushToCloud();

            // Ecouter les changements en temps reel (depuis un autre appareil)
            this._unsubscribe = docRef.onSnapshot(snapshot => {
                if (!snapshot.exists) return;
                if (this._ignoringSnapshot) return;
                if (snapshot.metadata.hasPendingWrites) return;

                const cloudManifest = snapshot.data().collection || [];
                // Comparer uniquement les IDs+quantités pour détecter un vrai changement
                const localManifest = this.collection.map(c => ({ id: c.id, quantity: c.quantity || 1, foil: c.foil || false }));
                const cloudStr = JSON.stringify(cloudManifest.map(c => c.id + c.quantity + c.foil).sort());
                const localStr = JSON.stringify(localManifest.map(c => c.id + c.quantity + c.foil).sort());
                if (cloudStr === localStr) return;

                // Changement venant d'un autre appareil : fusionner
                this.collection = this.mergeCollections(cloudManifest, this.collection);
                localStorage.setItem('mtg-collection', JSON.stringify(this.collection));
                this.renderCollection();
                this.updateStats();
                this.showSyncStatus('synced');
                this.showToast('Collection synchronisee !');
            });

            this.showSyncStatus('synced');
        } catch (e) {
            console.warn('Cloud sync error:', e);
            this.showSyncStatus('error');
        }
    },

    stopCloudSync() {
        if (this._unsubscribe) {
            this._unsubscribe();
            this._unsubscribe = null;
        }
        this._syncUid = null;
        clearTimeout(this._cloudSaveTimer);
    },

    mergeCollections(cloudManifest, local) {
        // cloudManifest = [{id, quantity, foil}] (slim, depuis Firebase)
        // local = collection complète avec images, noms, prix...
        const localMap = new Map(local.map(c => [c.id, c]));
        const cloudIds = new Set(cloudManifest.map(c => c.id));

        // Pour chaque entrée cloud, prendre les données complètes du local si dispo
        const merged = cloudManifest.map(c => {
            const loc = localMap.get(c.id);
            if (loc) return { ...loc, quantity: c.quantity ?? loc.quantity, foil: c.foil ?? loc.foil };
            return c; // carte absente en local : garder l'entrée slim (sera enrichie à l'affichage)
        });

        // Ajouter les cartes locales absentes du cloud (nouvelles cartes pas encore syncées)
        for (const card of local) {
            if (!cloudIds.has(card.id)) merged.push(card);
        }
        return merged;
    },

    // Debounce : attend 1.5s apres le dernier changement avant d'envoyer au cloud
    saveToCloud() {
        if (!this.fbDb || !this._syncUid) return;
        clearTimeout(this._cloudSaveTimer);
        this._cloudSaveTimer = setTimeout(() => this._pushToCloud(), 1500);
    },

    async _pushToCloud() {
        if (!this.fbDb || !this._syncUid) return;
        this.showSyncStatus('saving');
        try {
            // Strip image/type/setName/lang before push — URLs are re-fetchées depuis Scryfall
            // Réduit la taille : ~350 bytes/carte → ~120 bytes/carte (limite Firestore = 1MB)
            // Stocker uniquement {id, quantity, foil} — ~60 bytes/carte vs ~350
            // 10000 cartes x 60 bytes = ~600KB, bien sous la limite Firestore de 1MB
            const manifest = this.collection.map(c => ({ id: c.id, quantity: c.quantity || 1, foil: c.foil || false }));
            await this.fbDb.collection('users').doc(this._syncUid).set({
                collection: manifest,
                lastModified: firebase.firestore.FieldValue.serverTimestamp(),
                cardCount: manifest.length
            });
            this.showSyncStatus('synced');
        } catch (e) {
            console.warn('Cloud save error:', e);
            this.showSyncStatus('error');
        }
    },

    showSyncStatus(status) {
        const el = document.getElementById('sync-status');
        if (!el) return;
        if (status === 'synced') {
            el.textContent = '☁ Sync';
            el.className = 'sync-status synced';
            el.title = 'Synchronise avec le cloud';
        } else if (status === 'saving') {
            el.textContent = '⏳ Sync...';
            el.className = 'sync-status saving';
            el.title = 'Synchronisation en cours...';
        } else {
            el.textContent = '⚠ Erreur';
            el.className = 'sync-status error';
            el.title = 'Erreur de synchronisation';
        }
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
