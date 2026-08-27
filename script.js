// ===== STORAGE SAFE WRAPPER =====
const memoryStorage = {};

function storageAvailable() {
    try {
        const testKey = '__storage_test__';
        window.localStorage.setItem(testKey, 'test');
        window.localStorage.removeItem(testKey);
        return true;
    } catch (e) {
        return false;
    }
}

const useLocalStorage = storageAvailable();

function storageGet(key, fallback = null) {
    if (useLocalStorage) {
        try {
            const value = window.localStorage.getItem(key);
            return value !== null ? value : fallback;
        } catch (e) {
            return memoryStorage[key] !== undefined ? memoryStorage[key] : fallback;
        }
    } else {
        return memoryStorage[key] !== undefined ? memoryStorage[key] : fallback;
    }
}

function storageSet(key, value) {
    if (useLocalStorage) {
        try {
            window.localStorage.setItem(key, value);
        } catch (e) {
            memoryStorage[key] = value;
        }
    } else {
        memoryStorage[key] = value;
    }
}

function storageRemove(key) {
    if (useLocalStorage) {
        try {
            window.localStorage.removeItem(key);
        } catch (e) {
            delete memoryStorage[key];
        }
    } else {
        delete memoryStorage[key];
    }
}

// ===== SAFE DOM HELPER =====
function getEl(id) {
    return document.getElementById(id);
}

// ===== GLOBALS =====
const STORAGE_KEY = 'shorturlpro_history';
const SHORT_PREFIX = '#s/';
const MAX_HISTORY = 50;

// ===== THEME =====
function getTheme() {
    return storageGet('shorturlpro_theme', 'light');
}

function applyTheme(theme) {
    const moonIcon = document.querySelector('.theme-toggle-desktop i');
    const mobileMoonIcon = document.querySelector('.mobile-theme-toggle i');
    if (theme === 'dark') {
        document.body.classList.add('dark-mode');
        if (moonIcon) moonIcon.className = 'fas fa-sun';
        if (mobileMoonIcon) mobileMoonIcon.className = 'fas fa-sun';
    } else {
        document.body.classList.remove('dark-mode');
        if (moonIcon) moonIcon.className = 'fas fa-moon';
        if (mobileMoonIcon) mobileMoonIcon.className = 'fas fa-moon';
    }
    storageSet('shorturlpro_theme', theme);
}

function toggleTheme() {
    const current = getTheme();
    applyTheme(current === 'dark' ? 'light' : 'dark');
}

// ===== MOBILE MENU =====
function toggleMobileMenu() {
    const menu = getEl('mobileMenu');
    const hamburger = getEl('hamburgerBtn');
    const icon = getEl('hamburgerIcon');
    if (!menu || !hamburger || !icon) return;
    const isOpen = menu.classList.contains('active');
    if (isOpen) {
        closeMobileMenu();
    } else {
        menu.classList.add('active');
        hamburger.classList.add('active');
        icon.className = 'fas fa-times';
        document.body.classList.add('menu-open');
        hamburger.setAttribute('aria-expanded', 'true');
    }
}

function closeMobileMenu() {
    const menu = getEl('mobileMenu');
    const hamburger = getEl('hamburgerBtn');
    const icon = getEl('hamburgerIcon');
    if (menu) menu.classList.remove('active');
    if (hamburger) hamburger.classList.remove('active');
    if (icon) icon.className = 'fas fa-bars';
    document.body.classList.remove('menu-open');
    if (hamburger) hamburger.setAttribute('aria-expanded', 'false');
}

function closeMobileMenuOnOverlay(event) {
    if (event.target === getEl('mobileMenu')) {
        closeMobileMenu();
    }
}

// ===== SERVICE INFO =====
function updateServiceInfo() {
    const select = getEl('serviceSelect');
    const info = getEl('serviceInfo');
    if (!select || !info) return;
    const value = select.value;
    const serviceNames = {
        'clck.ru': 'clck.ru — short domain',
        'local': 'Local — browser-based link'
    };
    info.textContent = serviceNames[value] || 'Select a service';
}

// ===== HISTORY =====
function getHistory() {
    const data = storageGet(STORAGE_KEY, null);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch {
        return [];
    }
}

function saveHistory(history) {
    storageSet(STORAGE_KEY, JSON.stringify(history));
}

function addToHistory(originalURL, shortURL, method) {
    const history = getHistory();
    history.unshift({
        id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
        originalURL: originalURL,
        shortURL: shortURL,
        method: method,
        clicks: 0,
        createdAt: new Date().toISOString()
    });
    if (history.length > MAX_HISTORY) history.length = MAX_HISTORY;
    saveHistory(history);
    renderHistory();
}

function deleteHistoryItem(id) {
    const history = getHistory().filter(item => item.id !== id);
    saveHistory(history);
    renderHistory();
    showToast('Link removed from history', 'success');
}

function clearHistory() {
    saveHistory([]);
    renderHistory();
    showToast('All history cleared', 'success');
}

function copyHistoryURL(shortURL) {
    navigator.clipboard.writeText(shortURL).then(() => {
        showToast('Short URL copied!', 'success');
    }).catch(() => {
        showToast('Failed to copy', 'error');
    });
}

function renderHistory() {
    const history = getHistory();
    const listEl = getEl('historyList');
    const clearBtn = getEl('clearHistoryBtn');
    if (!listEl) return;
    if (history.length === 0) {
        listEl.innerHTML = '<div class="history-empty">No links shortened yet. Start by shortening your first URL above!</div>';
        if (clearBtn) clearBtn.style.display = 'none';
        return;
    }
    if (clearBtn) clearBtn.style.display = 'inline-flex';
    listEl.innerHTML = history.map(item => `
        <div class="history-item">
            <span class="short-url" onclick="copyHistoryURL('${escapeHTML(item.shortURL)}')" title="Click to copy">${escapeHTML(item.shortURL)}</span>
            <span class="original-url" title="${escapeHTML(item.originalURL)}">${escapeHTML(truncateURL(item.originalURL, 45))}</span>
            <div class="history-actions">
                <button class="btn-icon" onclick="copyHistoryURL('${escapeHTML(item.shortURL)}')"><i class="fas fa-copy"></i></button>
                <button class="btn-icon" onclick="deleteHistoryItem('${item.id}')"><i class="fas fa-trash"></i></button>
            </div>
        </div>
    `).join('');
}

function truncateURL(url, maxLength) {
    return url.length <= maxLength ? url : url.substring(0, maxLength) + '...';
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ===== CUSTOM SLUG =====
function toggleCustomSlug() {
    const toggle = getEl('customSlugToggle');
    const container = getEl('customSlugContainer');
    if (!toggle || !container) return;
    container.classList.toggle('visible', toggle.checked);
    if (!toggle.checked) {
        const input = getEl('customSlugInput');
        if (input) input.value = '';
    }
}

// ===== URL VALIDATION =====
function isValidURL(url) {
    try {
        const parsed = new URL(url);
        return parsed.protocol === 'http:' || parsed.protocol === 'https:';
    } catch { return false; }
}

function normalizeURL(url) {
    url = url.trim();
    if (!url.match(/^https?:\/\//i)) url = 'https://' + url;
    return url;
}

// ===== AI ANALYSIS =====
function analyzeURL(url) {
    const analysis = { type: 'unknown', risk: 'low', suggestions: [] };
    try {
        const parsed = new URL(url);
        const domain = parsed.hostname.toLowerCase();
        if (domain.includes('facebook.com') || domain.includes('fb.com')) analysis.type = 'Social Media - Facebook';
        else if (domain.includes('twitter.com') || domain.includes('x.com')) analysis.type = 'Social Media - Twitter/X';
        else if (domain.includes('instagram.com')) analysis.type = 'Social Media - Instagram';
        else if (domain.includes('linkedin.com')) analysis.type = 'Professional - LinkedIn';
        else if (domain.includes('youtube.com') || domain.includes('youtu.be')) analysis.type = 'Video - YouTube';
        else if (domain.includes('github.com')) analysis.type = 'Developer - GitHub';
        else if (domain.includes('amazon.com')) analysis.type = 'E-commerce - Amazon';
        else if (domain.includes('wikipedia.org')) analysis.type = 'Educational - Wikipedia';
        else if (domain.includes('reddit.com')) analysis.type = 'Community - Reddit';
        else if (domain.includes('google.com')) analysis.type = 'Google Service';
        else if (domain.endsWith('.edu')) analysis.type = 'Educational Institution';
        else if (domain.endsWith('.gov')) analysis.type = 'Government Website';
        else if (domain.endsWith('.org')) analysis.type = 'Organization';
        else analysis.type = 'General Website';

        const suspicious = [/bit\.ly\/.*redirect/i, /free.*gift.*card/i, /verify.*account/i, /\.tk\//i, /\.ml\//i];
        for (const p of suspicious) {
            if (p.test(url)) {
                analysis.risk = 'high';
                analysis.suggestions.push('⚠️ Potential phishing pattern detected.');
                break;
            }
        }
        if (url.length > 100) analysis.suggestions.push('📏 Very long URL — shortening will help.');
        else if (url.length > 50) analysis.suggestions.push('📏 Moderately long URL.');
        else analysis.suggestions.push('✅ URL looks safe and normal.');
    } catch {
        analysis.type = 'Unknown';
        analysis.risk = 'medium';
        analysis.suggestions.push('⚠️ Unable to analyze fully.');
    }
    return analysis;
}

function displayAIAnalysis(analysis) {
    const el = getEl('aiAnalysis');
    if (!el) return;
    const riskColor = analysis.risk === 'low' ? '#10b981' : analysis.risk === 'medium' ? '#f59e0b' : '#ef4444';
    const riskText = analysis.risk === 'low' ? 'Low Risk' : analysis.risk === 'medium' ? 'Medium Risk' : 'High Risk';
    el.innerHTML = `<div class="ai-header"><i class="fas fa-robot"></i> AI: ${analysis.type} | <span style="color:${riskColor};">${riskText}</span></div><div class="ai-detail">${analysis.suggestions.join('<br>')}</div>`;
    el.classList.add('visible');
}

function hideAIAnalysis() {
    const el = getEl('aiAnalysis');
    if (el) el.classList.remove('visible');
}

// ===== SHORT URL GENERATION =====
function generateShortCode(length = 7) {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length));
    return result;
}

function generateHashShortURL(code) {
    return window.location.origin + window.location.pathname + SHORT_PREFIX + code;
}

const serviceBuilders = {
    'clck.ru': (url) => `https://clck.ru/--?url=${encodeURIComponent(url)}`
};

async function shortenWithService(url, serviceName) {
    if (serviceName === 'local') return null;
    const builder = serviceBuilders[serviceName];
    if (!builder) return null;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        const response = await fetch(builder(url), {
            method: 'GET',
            headers: { 'Accept': 'text/plain, */*' },
            mode: 'cors',
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (!response.ok) return null;
        const text = (await response.text()).trim();
        if (text && text.startsWith('http') && !text.includes('error') && !text.includes('invalid')) {
            return { shortURL: text, method: serviceName };
        }
    } catch { return null; }
    return null;
}

function storeLocalShortURL(originalURL, customCode) {
    const code = customCode || generateShortCode();
    const shortURL = generateHashShortURL(code);
    const mappings = storageGet('shorturlpro_mappings', '{}');
    let mappingObj;
    try {
        mappingObj = JSON.parse(mappings);
    } catch {
        mappingObj = {};
    }
    mappingObj[code] = originalURL;
    storageSet('shorturlpro_mappings', JSON.stringify(mappingObj));

    const clicks = storageGet('shorturlpro_clicks', '{}');
    let clickObj;
    try {
        clickObj = JSON.parse(clicks);
    } catch {
        clickObj = {};
    }
    clickObj[code] = 0;
    storageSet('shorturlpro_clicks', JSON.stringify(clickObj));

    return { shortURL, method: 'Local' };
}

// ===== MAIN SHORTEN =====
async function shortenURL() {
    const urlInput = getEl('urlInput');
    const errorEl = getEl('errorMessage');
    const shortenBtn = getEl('shortenBtn');
    const btnText = getEl('btnText');
    const resultSection = getEl('resultSection');
    const resultURL = getEl('resultURL');
    const serviceSelect = getEl('serviceSelect');
    const customSlugToggle = getEl('customSlugToggle');
    const customSlugInput = getEl('customSlugInput');

    if (!urlInput || !errorEl || !shortenBtn || !btnText || !resultSection || !resultURL || !serviceSelect) return;

    errorEl.classList.remove('visible');
    errorEl.textContent = '';
    resultSection.classList.remove('visible');
    hideAIAnalysis();
    urlInput.classList.remove('error');

    let rawURL = urlInput.value.trim();
    if (!rawURL) {
        errorEl.textContent = 'Please enter a URL to shorten.';
        errorEl.classList.add('visible');
        urlInput.classList.add('error');
        urlInput.focus();
        return;
    }

    const originalURL = normalizeURL(rawURL);
    if (!isValidURL(originalURL)) {
        errorEl.textContent = 'Please enter a valid URL.';
        errorEl.classList.add('visible');
        urlInput.classList.add('error');
        return;
    }

    let customCode = null;
    if (customSlugToggle && customSlugToggle.checked) {
        customCode = customSlugInput ? customSlugInput.value.trim() : '';
        if (customCode && !/^[a-zA-Z0-9-_]{3,20}$/.test(customCode)) {
            errorEl.textContent = 'Custom code must be 3-20 chars.';
            errorEl.classList.add('visible');
            return;
        }
        if (customCode) {
            const mappings = storageGet('shorturlpro_mappings', '{}');
            let mappingObj;
            try {
                mappingObj = JSON.parse(mappings);
            } catch {
                mappingObj = {};
            }
            if (mappingObj[customCode]) {
                errorEl.textContent = 'Custom code already in use.';
                errorEl.classList.add('visible');
                return;
            }
        }
    }

    const selectedService = serviceSelect.value;
    shortenBtn.disabled = true;
    btnText.innerHTML = '<span class="spinner"></span> Shortening...';

    try {
        const analysis = analyzeURL(originalURL);
        displayAIAnalysis(analysis);

        let result = null;
        if (customCode) {
            result = storeLocalShortURL(originalURL, customCode);
        } else if (selectedService === 'clck.ru') {
            result = await shortenWithService(originalURL, 'clck.ru');
        } else if (selectedService === 'local') {
            result = storeLocalShortURL(originalURL, null);
        }

        if (!result) {
            result = storeLocalShortURL(originalURL, null);
            showToast('clck.ru failed. Used local link.', 'error');
        }

        resultURL.value = result.shortURL;
        resultSection.classList.add('visible');
        addToHistory(originalURL, result.shortURL, result.method);
        showToast(`Shortened via ${result.method}!`, 'success');
        generateQRCode(result.shortURL);

    } catch (err) {
        console.error('Error:', err);
        try {
            const localResult = storeLocalShortURL(originalURL, null);
            resultURL.value = localResult.shortURL;
            resultSection.classList.add('visible');
            addToHistory(originalURL, localResult.shortURL, 'Local');
            generateQRCode(localResult.shortURL);
            showToast('Used local fallback.', 'success');
        } catch {
            errorEl.textContent = 'Failed to shorten. Try again.';
            errorEl.classList.add('visible');
        }
    } finally {
        shortenBtn.disabled = false;
        btnText.textContent = 'Shorten URL';
    }
}

// ===== QR CODE =====
function generateQRCode(shortURL) {
    const qrContainer = getEl('qrContainer');
    const qrImage = getEl('qrImage');
    if (!qrContainer || !qrImage) return;
    qrImage.src = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(shortURL)}`;
    qrContainer.classList.add('visible');
}

async function downloadQR() {
    const qrImage = getEl('qrImage');
    if (!qrImage || !qrImage.src) return;
    try {
        const response = await fetch(qrImage.src);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `shorturl-qr-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        showToast('QR code downloaded!', 'success');
    } catch (err) {
        window.open(qrImage.src, '_blank');
        showToast('QR download failed, opened in new tab.', 'error');
    }
}

// ===== COPY & SHARE =====
function copyResult() {
    const resultURL = getEl('resultURL');
    if (!resultURL || !resultURL.value) return;
    navigator.clipboard.writeText(resultURL.value).then(() => {
        showToast('Short URL copied!', 'success');
    }).catch(() => {
        resultURL.select();
        document.execCommand('copy');
        showToast('Short URL copied!', 'success');
    });
}

function shareResult() {
    const resultURL = getEl('resultURL');
    if (!resultURL || !resultURL.value) return;
    if (navigator.share) {
        navigator.share({ title: 'ShortURL Pro', text: 'Shortened link:', url: resultURL.value })
            .then(() => showToast('Shared!', 'success')).catch(() => {});
    } else {
        copyResult();
    }
}

// ===== TOAST =====
function showToast(message, type) {
    const existing = document.querySelector('.toast');
    if (existing) existing.remove();
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'success' : 'error'}`;
    toast.innerHTML = `<i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i> ${message}`;
    document.body.appendChild(toast);
    setTimeout(() => { if (toast.parentNode) toast.remove(); }, 3000);
}

// ===== REDIRECT HANDLER =====
function handleRedirect() {
    const hash = window.location.hash;
    if (!hash || !hash.startsWith(SHORT_PREFIX)) return;
    const code = hash.substring(SHORT_PREFIX.length);
    const mappings = storageGet('shorturlpro_mappings', '{}');
    let mappingObj;
    try {
        mappingObj = JSON.parse(mappings);
    } catch {
        mappingObj = {};
    }
    const clicks = storageGet('shorturlpro_clicks', '{}');
    let clickObj;
    try {
        clickObj = JSON.parse(clicks);
    } catch {
        clickObj = {};
    }
    if (mappingObj[code]) {
        clickObj[code] = (clickObj[code] || 0) + 1;
        storageSet('shorturlpro_clicks', JSON.stringify(clickObj));
        window.location.replace(mappingObj[code]);
    }
}

// ===== COOKIE CONSENT =====
function initCookieConsent() {
    const consent = storageGet('cookie_consent', null);
    const banner = getEl('cookieConsent');
    if (!banner) return;
    if (consent === null) {
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function acceptCookies() {
    storageSet('cookie_consent', 'accepted');
    const banner = getEl('cookieConsent');
    if (banner) banner.style.display = 'none';
}

function declineCookies() {
    storageSet('cookie_consent', 'declined');
    const banner = getEl('cookieConsent');
    if (banner) banner.style.display = 'none';
}

// ===== DYNAMIC YEAR =====
function setDynamicYear() {
    const yearEl = getEl('copyrightYear');
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }
}

// ===== INIT =====
function init() {
    applyTheme(getTheme());
    renderHistory();
    handleRedirect();
    updateServiceInfo();
    setDynamicYear();
    initCookieConsent();

    const urlInput = getEl('urlInput');
    const customSlugInput = getEl('customSlugInput');
    if (urlInput) {
        urlInput.addEventListener('keydown', e => { if (e.key === 'Enter') shortenURL(); });
        urlInput.addEventListener('input', function() {
            this.classList.remove('error');
            const errorEl = getEl('errorMessage');
            if (errorEl) errorEl.classList.remove('visible');
        });
    }
    if (customSlugInput) {
        customSlugInput.addEventListener('keydown', e => { if (e.key === 'Enter') shortenURL(); });
    }

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') closeMobileMenu();
    });
}

document.addEventListener('DOMContentLoaded', init);
if (document.readyState === 'complete' || document.readyState === 'interactive') init();