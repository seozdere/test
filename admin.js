const adminTeacherIcon='<svg width="26" height="26" viewBox="0 0 32 32" style="vertical-align:middle" aria-hidden="true" fill="none" stroke="#79638E" stroke-width="1.6" stroke-linecap="round"><rect x="12" y="3" width="17" height="19" rx="3" fill="#DDEEE3"/><path d="M18 8h7m-7 5h5"/><circle cx="9" cy="12" r="4" fill="#F6DEB7"/><path d="M2 28v-5a7 7 0 0 1 14 0v5Z" fill="#E7DDF2"/></svg>';
// ═══════════════════════════════════════════════════════════════════════════
//  NoTik — Admin Logic  (admin.js)  v3.1 fixed
// ═══════════════════════════════════════════════════════════════════════════

let students     = [];
let records      = {};
let classRecords = {};
let notes        = {};
let adminTab     = 'homework';

const _urlParams    = new URLSearchParams(window.location.search);
const _urlMode      = _urlParams.get('mode');
const _authReqParam = _urlParams.get('auth_request');
const _isKioskStart = _urlMode === 'kiosk';
let _kioskTimer     = null;
let _kioskSeconds   = 10 * 60;
const BAN_DURATION_MS = 60 * 60 * 1000;
const KIOSK_DURATION_MS = 10 * 60 * 1000;
const KIOSK_REDIRECT_URL = `${window.location.pathname}?mode=board`;
const BOARD_CODE_TTL_MS = 30 * 1000;
let _boardCodeLoop = null;
let _boardCurrentCode = '';
let _boardCodeExpiresAt = 0;

const currentDateInput     = document.getElementById('currentDate');
const homeworkDescriptionDrafts = new Map();
const homeworkDescriptionInput = document.getElementById('homeworkDescriptionInput');
const saveHomeworkDescriptionBtn = document.getElementById('saveHomeworkDescriptionBtn');
const resetHomeworkDescriptionBtn = document.getElementById('resetHomeworkDescriptionBtn');

function homeworkEditorContext() {
    return { id: ClassLogData._dbId(), className: ClassLogData.currentClass,
        subjectId: ClassLogData.currentSubject, termId: ClassLogData._activeTid(),
        date: currentDateInput.value };
}
function homeworkEditorKey(context) { return JSON.stringify([context.id, context.date]); }
function renderHomeworkDescriptionEditor() {
    const box = document.getElementById('homeworkDescriptionEditor');
    box.hidden = adminTab !== 'homework' || ClassLogAuth.isKioskSession();
    const context = homeworkEditorContext();
    const draft = homeworkDescriptionDrafts.get(homeworkEditorKey(context));
    const saved = ClassLogData.homeworkDescriptions[context.date];
    const archive = ClassLogData.viewingTermId !== null && ClassLogData.viewingTermId !== ClassLogData.activeTermId;
    const value = draft ? draft.text : saved?.text || '';
    if (homeworkDescriptionInput.value !== value) homeworkDescriptionInput.value = value;
    homeworkDescriptionInput.dataset.revision = String(draft?.revision ?? saved?.revision ?? 0);
    homeworkDescriptionInput.disabled = archive || !!draft?.saving || !ClassLogData.homeworkDescriptionsAvailable;
    saveHomeworkDescriptionBtn.disabled = homeworkDescriptionInput.disabled || !draft;
    resetHomeworkDescriptionBtn.disabled = !draft || !!draft.saving;
    const subject = SUBJECTS.find(item => item.id === context.subjectId);
    document.getElementById('homeworkDescriptionContext').textContent =
        `${context.className} · ${subject?.label || ''} · ${context.date ? ClassLogData.formatDateLong(context.date) : ''}`;
    document.getElementById('homeworkDescriptionStatus').textContent = archive ? 'Arşiv dönemi: yalnızca görüntülenebilir.'
        : !ClassLogData.homeworkDescriptionsAvailable ? 'Açıklama servisine ulaşılamıyor. Bağlantıyı ve SQL kurulumunu kontrol edin.'
        : draft?.saving ? 'Kaydediliyor…' : draft?.message || (draft ? 'Kaydedilmemiş değişiklik.'
            : saved?.text ? 'Kaydedildi · Veli görünümüyle eşitlenir.' : 'Açıklamayı yazıp Kaydet’e basın.');
}
homeworkDescriptionInput.addEventListener('input', () => {
    const key = homeworkEditorKey(homeworkEditorContext());
    homeworkDescriptionDrafts.set(key, { text: homeworkDescriptionInput.value,
        revision: Number(homeworkDescriptionInput.dataset.revision) || 0 });
    renderHomeworkDescriptionEditor();
});
resetHomeworkDescriptionBtn.addEventListener('click', async () => {
    const key = homeworkEditorKey(homeworkEditorContext());
    if (homeworkDescriptionDrafts.get(key)?.saving) return;
    homeworkDescriptionDrafts.delete(key);
    renderHomeworkDescriptionEditor();
    await ClassLogData.loadHomeworkDescriptions();
    renderHomeworkDescriptionEditor();
});
saveHomeworkDescriptionBtn.addEventListener('click', async () => {
    const context = homeworkEditorContext();
    const key = homeworkEditorKey(context);
    const draft = homeworkDescriptionDrafts.get(key);
    if (!draft || draft.saving || saveHomeworkDescriptionBtn.disabled) return;
    draft.saving = true;
    renderHomeworkDescriptionEditor();
    const result = await ClassLogData.saveHomeworkDescription(context, context.date, draft.text.trim(), draft.revision);
    if (result.ok) homeworkDescriptionDrafts.delete(key);
    else {
        draft.saving = false;
        draft.message = result.reason === 'conflict'
            ? 'Başka bir cihaz açıklamayı değiştirdi. Metninizi koruyup Vazgeç ile güncel kaydı yükleyin.'
            : 'Kaydedilemedi. Metniniz korunuyor; bağlantıyı kontrol edip tekrar deneyin.';
    }
    renderHomeworkDescriptionEditor();
});
const studentListContainer = document.getElementById('studentList');
const classSelector        = document.getElementById('classSelector');
const viewToggle           = document.getElementById('viewToggle');
const saveStatusBadge      = document.getElementById('saveStatusBadge');
const realtimeStatusBadge  = document.getElementById('realtimeStatusBadge');
const syncMetaText         = document.getElementById('syncMetaText');
const parentNoticeInput    = document.getElementById('parentNoticeInput');
const parentNoticeDuration = document.getElementById('parentNoticeDuration');
const saveParentNoticeBtn  = document.getElementById('saveParentNoticeBtn');
const clearParentNoticeBtn = document.getElementById('clearParentNoticeBtn');
const parentNoticeMeta     = document.getElementById('parentNoticeMeta');
const parentTickerInput    = document.getElementById('parentTickerInput');
const parentTickerDuration = document.getElementById('parentTickerDuration');
const saveParentTickerBtn  = document.getElementById('saveParentTickerBtn');
const clearParentTickerBtn = document.getElementById('clearParentTickerBtn');
const parentTickerMeta     = document.getElementById('parentTickerMeta');
const parentPopupInput     = document.getElementById('parentPopupInput');
const parentPopupDuration  = document.getElementById('parentPopupDuration');
const saveParentPopupBtn   = document.getElementById('saveParentPopupBtn');
const clearParentPopupBtn  = document.getElementById('clearParentPopupBtn');
const parentPopupMeta      = document.getElementById('parentPopupMeta');
let _parentNoticeDraftText = null;
let _parentNoticeDraftDuration = '';
let _parentTickerDraftText = null;
let _parentTickerDraftDuration = '';
let _parentPopupDraftText = null;
let _parentPopupDraftDuration = '';

function getDataErrorMessage(fallback = 'Islem tamamlanamadi.') {
    const lastError = typeof ClassLogData.getLastError === 'function'
        ? ClassLogData.getLastError()
        : null;
    return lastError?.message || fallback;
}

function getStoredKioskExpiry() {
    const rawValue = Number(sessionStorage.getItem('cl_kiosk_expires_at') || '0');
    return Number.isFinite(rawValue) ? rawValue : 0;
}

function setStoredKioskExpiry(expiresAt) {
    if (expiresAt && Number.isFinite(expiresAt)) {
        sessionStorage.setItem('cl_kiosk_expires_at', String(expiresAt));
        return;
    }
    sessionStorage.removeItem('cl_kiosk_expires_at');
}

function readKioskContext() {
    try {
        return JSON.parse(sessionStorage.getItem('cl_kiosk_context') || 'null');
    } catch (error) {
        return null;
    }
}

function writeKioskContext(context) {
    if (!context || typeof context !== 'object') {
        sessionStorage.removeItem('cl_kiosk_context');
        return;
    }
    sessionStorage.setItem('cl_kiosk_context', JSON.stringify({
        className: context.className || ClassLogData.currentClass,
        subjectId: context.subjectId || ClassLogData.currentSubject,
        viewingTermId: context.viewingTermId ?? ClassLogData.viewingTermId ?? null,
        activeTermId: context.activeTermId ?? ClassLogData.activeTermId ?? null,
        adminTab: context.adminTab || adminTab
    }));
}

function applyKioskContext(context) {
    if (!context || typeof context !== 'object') return;
    if (context.className) ClassLogData.currentClass = context.className;
    if (context.subjectId) ClassLogData.currentSubject = context.subjectId;
    if (context.viewingTermId !== undefined) ClassLogData.viewingTermId = context.viewingTermId;
    if (context.activeTermId !== undefined) ClassLogData.activeTermId = context.activeTermId;
    if (context.adminTab === 'class' || context.adminTab === 'homework') adminTab = context.adminTab;
}

function getCurrentBoardContext() {
    return {
        className: ClassLogData.currentClass,
        subjectId: ClassLogData.currentSubject,
        viewingTermId: ClassLogData.viewingTermId ?? ClassLogData.activeTermId ?? null,
        activeTermId: ClassLogData.activeTermId ?? null,
        adminTab
    };
}

function persistKioskContext() {
    if (!sessionStorage.getItem('cl_kiosk')) return;
    writeKioskContext(getCurrentBoardContext());
}

function renderKioskContextInfo() {
    const infoEl = document.getElementById('kioskContextInfo');
    if (!infoEl) return;
    if (!sessionStorage.getItem('cl_kiosk')) {
        infoEl.textContent = '';
        infoEl.style.display = 'none';
        return;
    }
    const subjectLabel = SUBJECTS.find(s => s.id === ClassLogData.currentSubject)?.label || 'Ders';
    const modeLabel = adminTab === 'class' ? 'Ders İçi' : 'Ödev';
    infoEl.textContent = `${ClassLogData.currentClass} | ${subjectLabel} | ${modeLabel}`;
    infoEl.style.display = 'inline-flex';
}

function computeParentNoticeExpiry(durationValue) {
    if (!durationValue) return null;
    if (durationValue === 'eod') {
        const now = new Date();
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return end.toISOString();
    }
    const minutes = Number(durationValue);
    return Number.isFinite(minutes) && minutes > 0
        ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
        : null;
}

let parentAnnouncementClass = null;
function renderParentNoticeAdminBar() {
    const context = JSON.stringify([ClassLogData.currentClass, ClassLogData._activeTid()]);
    if (parentAnnouncementClass !== context) {
        parentAnnouncementClass = context;
        _parentNoticeDraftText = _parentTickerDraftText = _parentPopupDraftText = null;
        _parentNoticeDraftDuration = _parentTickerDraftDuration = _parentPopupDraftDuration = '';
    }
    const noticeBar = document.getElementById('parentNoticeAdminBar');
    const tickerBar = document.getElementById('parentTickerAdminBar');
    const popupBar = document.getElementById('parentPopupAdminBar');

    if (!ClassLogAuth.isAdmin()) {
        if (noticeBar) noticeBar.style.display = 'none';
        if (tickerBar) tickerBar.style.display = 'none';
        if (popupBar) popupBar.style.display = 'none';
        return;
    }

    if (noticeBar) noticeBar.style.display = 'flex';
    if (tickerBar) tickerBar.style.display = 'flex';
    if (popupBar) popupBar.style.display = 'flex';

    const notice = ClassLogData.parentNotice;
    if (parentNoticeInput) parentNoticeInput.value = _parentNoticeDraftText ?? notice?.text ?? '';
    if (parentNoticeDuration) parentNoticeDuration.value = _parentNoticeDraftDuration || '';
    if (parentNoticeMeta) {
        if (notice?.text) {
            const expiry = notice.expires_at ? new Date(notice.expires_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Süresiz';
            parentNoticeMeta.textContent = `● Yayında (Bitiş: ${expiry})`;
            parentNoticeMeta.style.color = '#fb923c';
        } else {
            parentNoticeMeta.textContent = '';
        }
    }

    const ticker = ClassLogData.parentTicker;
    if (parentTickerInput) parentTickerInput.value = _parentTickerDraftText ?? ticker?.text ?? '';
    if (parentTickerDuration) parentTickerDuration.value = _parentTickerDraftDuration || '';
    if (parentTickerMeta) {
        if (ticker?.text) {
            const expiry = ticker.expires_at ? new Date(ticker.expires_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Süresiz';
            parentTickerMeta.textContent = `● Yayında (Bitiş: ${expiry})`;
            parentTickerMeta.style.color = '#38bdf8';
        } else {
            parentTickerMeta.textContent = '';
        }
    }

    const popup = ClassLogData.parentPopup;
    if (parentPopupInput) parentPopupInput.value = _parentPopupDraftText ?? popup?.text ?? '';
    if (parentPopupDuration) parentPopupDuration.value = _parentPopupDraftDuration || '';
    if (parentPopupMeta) {
        if (popup?.text) {
            const expiry = popup.expires_at ? new Date(popup.expires_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Süresiz';
            parentPopupMeta.textContent = `● Yayında (Bitiş: ${expiry})`;
            parentPopupMeta.style.color = '#818cf8';
        } else {
            parentPopupMeta.textContent = '';
        }
    }
}

function generateBoardCode() {
    try {
        const values = new Uint32Array(1);
        crypto.getRandomValues(values);
        return String(values[0] % 1000000).padStart(6, '0');
    } catch (error) {
        return String(Math.floor(Math.random() * 1000000)).padStart(6, '0');
    }
}

function normalizeBoardCode(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 6);
}

function getStoredBoardTargetCode() {
    return normalizeBoardCode(sessionStorage.getItem('cl_board_target_code') || localStorage.getItem('cl_last_board_code') || '');
}

function setStoredBoardTargetCode(code) {
    const normalized = normalizeBoardCode(code);
    if (!normalized) {
        sessionStorage.removeItem('cl_board_target_code');
        localStorage.removeItem('cl_last_board_code');
        return;
    }
    sessionStorage.setItem('cl_board_target_code', normalized);
    localStorage.setItem('cl_last_board_code', normalized);
}

function stopBoardCodeLoop() {
    if (_boardCodeLoop) {
        clearInterval(_boardCodeLoop);
        _boardCodeLoop = null;
    }
}

function renderBoardCodeState() {
    const codeEl = document.getElementById('boardCodeValue');
    const countdownEl = document.getElementById('boardCodeCountdown');
    if (codeEl) codeEl.textContent = _boardCurrentCode || '------';
    if (countdownEl) {
        const remainingMs = Math.max(0, _boardCodeExpiresAt - Date.now());
        const remainingSec = Math.max(0, Math.ceil(remainingMs / 1000));
        countdownEl.textContent = _boardCurrentCode
            ? `${remainingSec} sn icinde yenilenir`
            : 'Kod hazirlaniyor';
    }
}

function refreshBoardCode(force = false) {
    if (force || !_boardCurrentCode || Date.now() >= _boardCodeExpiresAt) {
        _boardCurrentCode = generateBoardCode();
        _boardCodeExpiresAt = Date.now() + BOARD_CODE_TTL_MS;
    }
    renderBoardCodeState();
}

function startBoardCodeLoop() {
    stopBoardCodeLoop();
    refreshBoardCode(true);
    _boardCodeLoop = setInterval(() => refreshBoardCode(false), 1000);
}

function promptForBoardCode(message = 'Tahta kodunu girin (6 haneli)') {
    const initialValue = getStoredBoardTargetCode();
    const raw = window.prompt(message, initialValue || '');
    if (raw === null) return null;
    const normalized = normalizeBoardCode(raw);
    if (!/^\d{6}$/.test(normalized)) {
        alert('Geçerli bir 6 haneli tahta kodu girin.');
        return null;
    }
    return normalized;
}

function applyKioskRestrictions() {
    const kioskOnlyHiddenIds = [
        'changePwBtn',
        'manageStudentsBtn',
        'exportBtn',
        'copyLinkBtn',
        'downloadParentBtn',
        'viewToggle',
        'classSelector',
        'classPickerButton',
        'subjectTabs',
        'bulkPosBtn',
        'bulkNegBtn',
        'bulkClearBtn'
    ];
    kioskOnlyHiddenIds.forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });

    const dashboardActions = document.querySelector('.dashboard-actions');
    if (dashboardActions) dashboardActions.style.display = 'none';

    document.querySelectorAll('.note-btn').forEach(button => {
        button.style.display = 'none';
    });
}

function renderKioskCountdown() {
    const banner = document.getElementById('kioskBanner');
    const countdown = document.getElementById('kioskCountdown');
    const expiresAt = getStoredKioskExpiry();
    const remainingSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));

    _kioskSeconds = remainingSeconds;
    if (banner) banner.style.display = 'flex';
    document.querySelectorAll('.no-kiosk').forEach(el => el.style.display = 'none');
    applyKioskRestrictions();

    if (countdown) {
        const m = Math.floor(remainingSeconds / 60);
        const s = remainingSeconds % 60;
        countdown.textContent = `${m}:${s.toString().padStart(2,'0')}`;
        countdown.style.color = remainingSeconds <= 60 ? '#F87171' : '#4ADE80';
    }

    if (remainingSeconds <= 0) kioskExpire();
}

async function closeKioskSession(redirectUrl = KIOSK_REDIRECT_URL) {
    clearInterval(_kioskTimer);
    _kioskTimer = null;
    ClassLogAuth.logout();
    location.replace(redirectUrl);
}

// ─── Global yardımcı fonksiyonlar (HTML onclick'lerde kullanılıyor) ───────────
window.performLogout = function() {
    clearInterval(_kioskTimer);
    ClassLogAuth.logout();
    location.replace('admin.html');
};

// ─── Kiosk ───────────────────────────────────────────────────────────────────
function startKioskTimer(options = {}) {
    const storedExpiry = getStoredKioskExpiry();
    const requestedExpiry = Number(options.expiresAt || 0);
    const expiresAt = requestedExpiry > Date.now()
        ? requestedExpiry
        : (storedExpiry > Date.now() ? storedExpiry : Date.now() + KIOSK_DURATION_MS);

    sessionStorage.setItem('cl_kiosk', '1');
    setStoredKioskExpiry(expiresAt);
    if (options.context) writeKioskContext(options.context);
    if (_kioskTimer) clearInterval(_kioskTimer);
    renderKioskCountdown();
    ensureBoardControlChannel();
    _kioskTimer = setInterval(renderKioskCountdown, 1000);
}

function kioskExpire() {
    void closeKioskSession();
}

window.manualKioskLogout = function() {
    void closeKioskSession();
};

// ─── Auth ─────────────────────────────────────────────────────────────────────
function checkAuth() {
    const ban = localStorage.getItem('classlog_ban_until');
    if (ban && Date.now() < parseInt(ban)) { showBannedScreen(); return; }
    if (ClassLogAuth.isLoggedIn()) {
        if (sessionStorage.getItem('cl_kiosk')) applyKioskContext(readKioskContext());
        document.getElementById('loginOverlay').style.display = 'none';
        updateTeacherUI();
        if (sessionStorage.getItem('cl_kiosk')) startKioskTimer();
    }
}

function showBannedScreen() {
    const card = document.querySelector('.login-card');
    if (card) card.innerHTML = `
        <span class="lock-icon">🚫</span>
        <h2 style="color:var(--s-neg)">Erişim Engellendi</h2>
        <p>Giriş yetkiniz geçici olarak askıya alındı.<br>1 saat sonra tekrar deneyin.</p>`;
}

function updateTeacherUI() {
    const t = ClassLogAuth.getTeacher();
    if (!t) return;
    const nameEl = document.getElementById('teacherName');
    if (nameEl) {
        if (ClassLogAuth.isKioskSession()) {
            nameEl.innerHTML = `<span class="teacher-identity">Tahta oturumu: ${_htmlEncode(t.name || t.username || 'Öğretmen')}</span>`;
        }
        else if (ClassLogAuth.isAdmin()) {
            nameEl.innerHTML = `<span class="admin-identity"><svg class="admin-comic-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><use href="#admin-icon-crown"/></svg> ${_htmlEncode(t.name || 'Sistem Yöneticisi')}</span>`;
        } else {
            nameEl.innerHTML = `<span class="teacher-identity">${adminTeacherIcon} ${_htmlEncode(t.name || t.username)}</span>`;
        }
    }
    document.querySelectorAll('.admin-only').forEach(el => {
        el.style.display = ClassLogAuth.isAdmin() ? '' : 'none';
    });
    renderParentNoticeAdminBar();
    if (sessionStorage.getItem('cl_kiosk')) {
        document.querySelectorAll('.no-kiosk').forEach(el => el.style.display = 'none');
        applyKioskRestrictions();
        const banner = document.getElementById('kioskBanner');
        if (banner) banner.style.display = 'flex';
    }
    renderKioskContextInfo();
}

// ─── Giriş Butonu ─────────────────────────────────────────────────────────────
const loginBtn = document.getElementById('loginBtn');
if (loginBtn) loginBtn.onclick = performLogin;

const adminPasswordEl = document.getElementById('adminPassword');
if (adminPasswordEl) adminPasswordEl.onkeypress = e => { if (e.key === 'Enter') performLogin(); };

async function performLogin() {
    const usernameEl = document.getElementById('adminUsername');
    const input      = document.getElementById('adminPassword');
    const error      = document.getElementById('loginError');
    const card       = document.querySelector('.login-card');
    const btn        = document.getElementById('loginBtn');

    const ban = localStorage.getItem('classlog_ban_until');
    if (ban && Date.now() < parseInt(ban)) return;

    const username = usernameEl?.value.trim() || '';
    const password = input.value.trim();
    if (!username) { error.textContent = 'Kullanıcı adı boş olamaz.'; error.style.visibility = 'visible'; return; }
    if (!password) { error.textContent = 'Şifre boş bırakılamaz.';   error.style.visibility = 'visible'; return; }

    btn.textContent = 'Giriş yapılıyor...'; btn.disabled = true;
    const result = await ClassLogAuth.login(username, password);
    btn.textContent = 'Giriş Yap'; btn.disabled = false;

    if (result.ok) {
        localStorage.removeItem('classlog_login_attempts');
        localStorage.removeItem('classlog_ban_until');
        document.getElementById('loginOverlay').style.display = 'none';
        updateTeacherUI();
        if (_isKioskStart) startKioskTimer({ context: getCurrentBoardContext() });
        if (_authReqParam) {
            await handleRemoteAuthIfNeeded();
            return;
        }
        init();
    } else {
        let attempts = parseInt(localStorage.getItem('classlog_login_attempts') || 0) + 1;
        localStorage.setItem('classlog_login_attempts', attempts);
        if (attempts >= 5) {
            localStorage.setItem('classlog_ban_until', Date.now() + BAN_DURATION_MS);
            showBannedScreen();
        } else {
            const msg = result.reason === 'inactive'
                ? 'Hesabınız devre dışı. Yönetici ile iletişime geçin.'
                : `Hatalı kullanıcı adı veya şifre! (${attempts}/5)`;
            error.textContent = msg; error.style.visibility = 'visible';
            if (card) { card.classList.add('shake'); setTimeout(() => card.classList.remove('shake'), 450); }
            input.value = ''; input.focus();
        }
    }
}

// ─── Logout Butonu ─────────────────────────────────────────────────────────────
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) logoutBtn.onclick = window.performLogout;

// ─── Tarih ───────────────────────────────────────────────────────────────────
currentDateInput.value = new Date().toISOString().split('T')[0];
const today = currentDateInput.value;

// ─── Avatar ──────────────────────────────────────────────────────────────────
const AVATAR_COLORS = ['#6366F1','#8B5CF6','#EC4899','#F43F5E','#F59E0B','#10B981','#0EA5E9','#14B8A6','#EF4444','#3B82F6','#84CC16','#F97316'];
function getAvatarColor(name) { let h=0; for(let i=0;i<name.length;i++) h=name.charCodeAt(i)+((h<<5)-h); return AVATAR_COLORS[Math.abs(h)%AVATAR_COLORS.length]; }
function getInitials(name) { return name.trim().split(/\s+/).map(w=>w[0]||'').join('').substring(0,2).toLocaleUpperCase('tr-TR'); }

// ─── Ders Sekmesi ─────────────────────────────────────────────────────────────
function getTeacherSubjects() {
    const teacher = ClassLogAuth.getTeacher();
    if (!teacher || teacher.role === 'admin') return SUBJECTS;
    if (!teacher.subjects || teacher.subjects.length === 0) return SUBJECTS;
    const allowed = SUBJECTS.filter(s => teacher.subjects.includes(s.id));
    return allowed.length > 0 ? allowed : SUBJECTS;
}

function renderSubjectTabs() {
    const container = document.getElementById('subjectTabs');
    if (!container) return;
    const visibleSubjects = getTeacherSubjects();
    // Eğer mevcut ders erişilemiyor ise, ilk izin verilen derse geç
    if (!visibleSubjects.find(s => s.id === ClassLogData.currentSubject)) {
        ClassLogData.currentSubject = visibleSubjects[0]?.id || 'turkce';
    }
    container.innerHTML = visibleSubjects.map(s => `
        <button class="subject-tab ${s.id === ClassLogData.currentSubject ? 'active' : ''}"
                style="--tab-color:${s.color}"
                onclick="switchSubject('${s.id}')">
            ${renderSubjectIcon(s)} ${s.label}
        </button>`).join('');
}

window.switchSubject = async function(subjectId) {
    // Erişim kontrolü: admin değilse sadece kendi dersleri
    const teacher = ClassLogAuth.getTeacher();
    if (teacher && teacher.role !== 'admin' && teacher.subjects && teacher.subjects.length > 0) {
        if (!teacher.subjects.includes(subjectId)) return;
    }
    ClassLogData.currentSubject = subjectId;
    persistKioskContext();
    renderSubjectTabs();
    await ClassLogData.sync();
    await loadData();
    renderKioskContextInfo();
    renderMarkingInfo();
    renderStudents();
    setupAdminRealtime();
};

// ─── Admin Sekme ──────────────────────────────────────────────────────────────
window.switchAdminTab = function(tab) {
    adminTab = tab;
    const tH = document.getElementById('tabHomework');
    const tC = document.getElementById('tabClass');
    if (tH) tH.classList.toggle('active', tab === 'homework');
    if (tC) tC.classList.toggle('active', tab === 'class');
    renderKioskContextInfo();
    renderMarkingInfo();
    renderStudents();
};

// ─── Öğrenci Listesi ──────────────────────────────────────────────────────────
// Admin-only, device-local numbers. Never included in the shared data layer.
function studentNumberKey(student) {
    return 'classlog.student-number.v1:' + JSON.stringify([ClassLogData._activeTid(), ClassLogData.currentClass, student]);
}
function renderStudentNumber(student) {
    const key = studentNumberKey(student);
    let value = '';
    try { value = localStorage.getItem(key) || ''; } catch (_) {}
    const readonly = ClassLogAuth.isKioskSession() || (ClassLogData.viewingTermId !== null && ClassLogData.viewingTermId !== ClassLogData.activeTermId);
    return `<input class="student-number" type="text" inputmode="numeric" maxlength="12" placeholder="No"
        aria-label="${_htmlEncode(student)} öğrenci numarası" title="Yalnızca bu tarayıcıda saklanır"
        data-number-key="${_htmlEncode(key)}" value="${_htmlEncode(value)}" ${readonly ? 'readonly' : ''}
        oninput="saveLocalStudentNumber(this)" autocomplete="off">`;
}
window.saveLocalStudentNumber = function(input) {
    if (input.readOnly) return;
    input.value = input.value.replace(/[^0-9]/g, '').slice(0, 12);
    try {
        if (input.value) localStorage.setItem(input.dataset.numberKey, input.value);
        else localStorage.removeItem(input.dataset.numberKey);
        input.setCustomValidity('');
        input.title = 'Yalnızca bu tarayıcıda saklanır';
    } catch (_) {
        input.title = 'Numara kaydedilemedi. Tarayıcı depolama iznini kontrol edin.';
        input.setCustomValidity(input.title);
        input.reportValidity();
    }
};

function normalizeStudentSearch(value) {
    return String(value).toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').trim();
}
function filterStudentList() {
    const homework = adminTab === 'homework';
    const day = records[currentDateInput.value] || {};
    const isMarked = name => [1, -1, 0, 2, 3].includes(day[name]);
    const checked = students.filter(isMarked).length;
    const onlyUnchecked = homework && document.getElementById('onlyUncheckedStudents').checked;
    document.getElementById('homeworkCheckBar').hidden = !homework;
    const count = document.getElementById('homeworkCheckCount');
    count.hidden = !checked;
    count.textContent = `${students.length} öğrenci · ${checked} işaretlendi · ${students.length - checked} kontrol edilmedi`;
    const query = normalizeStudentSearch(document.getElementById('studentSearch').value);
    const terms = query.split(/\s+/).filter(Boolean);
    let visible = 0;
    studentListContainer.querySelectorAll('.student-card').forEach(card => {
        const name = normalizeStudentSearch(card.querySelector('.s-name').textContent);
        const number = card.querySelector('.student-number')?.value || '';
        const match = terms.every(term => `${name} ${number}`.includes(term))
            && (!onlyUnchecked || !isMarked(students[Number(card.dataset.index)]));
        card.hidden = !match;
        if (match) visible++;
    });
    document.getElementById('clearStudentSearch').hidden = !query;
    document.getElementById('studentSearchResult').textContent = query || onlyUnchecked
        ? (visible ? '' : onlyUnchecked && checked === students.length && students.length
            ? 'Tüm öğrencilerin kontrolü tamamlandı.' : 'Eşleşen öğrenci bulunamadı.') : '';
}
document.getElementById('onlyUncheckedStudents').addEventListener('change', filterStudentList);
document.getElementById('studentSearch').addEventListener('input', filterStudentList);
document.getElementById('clearStudentSearch').onclick = () => {
    const input = document.getElementById('studentSearch');
    input.value = '';
    filterStudentList();
    input.focus();
};

function updateSelectedDateNotice() {
    const notice = document.getElementById('selectedDateNotice');
    const value = currentDateInput.value;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    notice.hidden = !value || value === today;
    if (notice.hidden) return;
    const [year, month, day] = value.split('-').map(Number);
    const formatted = new Date(year, month - 1, day).toLocaleDateString('tr-TR', { day:'numeric', month:'long', year:'numeric' });
    document.getElementById('selectedDateNoticeText').textContent = `${formatted} tarihine işaretleme yapıyorsunuz.`;
}
window.addEventListener('focus', updateSelectedDateNotice);
document.addEventListener('visibilitychange', () => { if (!document.hidden) updateSelectedDateNotice(); });

function renderStudents() {
    updateHomeworkDateJumps();
    updateSelectedDateNotice();
    renderHomeworkDescriptionEditor();
    const date   = currentDateInput.value;
    const dayRec = adminTab === 'homework' ? (records[date] || {}) : (classRecords[date] || {});

    if (!students.length) {
        studentListContainer.innerHTML = `
            <div style="text-align:center;padding:60px 20px;color:var(--a-muted2);">
                <div style="font-size:3rem;margin-bottom:16px;">👥</div>
                <p style="font-size:1rem;font-weight:500;">Henüz öğrenci eklenmedi.</p>
                <p style="font-size:0.85rem;margin-top:6px;">Sağ alttaki 👥 butonuna tıklayın.</p>
            </div>`;
        filterStudentList();
        return;
    }

    if (adminTab === 'homework') {
        studentListContainer.innerHTML = students.map((student, idx) => {
            const color    = getAvatarColor(student);
            const initials = getInitials(student);
            const status   = dayRec[student];
            const hasNote  = notes[student] ? 'note-active' : '';
            const esc      = student.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
            return `
            <div class="student-card" data-index="${idx}">
                ${renderStudentNumber(student)}
                <div class="s-avatar" style="background:${color};">${initials}</div>
                <span class="s-name">${_htmlEncode(student)}</span>
                <button class="note-btn ${hasNote}" onclick="openNote('${esc}')" aria-label="${notes[student] ? 'Veli notunu düzenle' : 'Veli notu ekle'}" title="Veli notu"><svg width="22" height="22" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><path d="M5 4h18a3 3 0 0 1 3 3v12a3 3 0 0 1-3 3H12l-6 4v-4H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z" fill="${notes[student] ? '#F8E5B8' : '#E4DCF4'}" stroke="#907AAA" stroke-width="1.5" stroke-linejoin="round"/><path d="M8 10h12M8 15h8" stroke="#79638E" stroke-width="1.7" stroke-linecap="round"/><path d="M6 7h5" stroke="#FFFFFF" stroke-width="1.6" stroke-linecap="round"/></svg></button>
                <div class="controls">
                    <button class="btn btn-pos     ${status===1  ?'active':''}" onclick="setMark('${esc}',1)"  title="Tamam (+)">+</button>
                    <button class="btn btn-neg     ${status===-1 ?'active':''}" onclick="setMark('${esc}',-1)" title="Eksik (-)">−</button>
                    <button class="btn btn-half    ${status===2  ?'active':''}" onclick="setMark('${esc}',2)"  title="Yarım (●)">●</button>
                    <button class="btn btn-neutral ${status===0  ?'active':''}" onclick="setMark('${esc}',0)"  title="Kitap Yok">●</button>
                    <button class="btn btn-absent  ${status===3  ?'active':''}" onclick="setMark('${esc}',3)"  title="Gelmedi">●</button>
                </div>
            </div>`;
        }).join('');
    } else {
        studentListContainer.innerHTML = students.map((student, idx) => {
            const color    = getAvatarColor(student);
            const initials = getInitials(student);
            const dayStats = getClassMarkStats(dayRec[student]);
            const posCount = countClassStatus(student, 1);
            const negCount = countClassStatus(student, -1);
            const esc      = student.replace(/\\/g,'\\\\').replace(/'/g,"\\'");
            return `
            <div class="student-card" data-index="${idx}">
                ${renderStudentNumber(student)}
                <div class="s-avatar" style="background:${color};">${initials}</div>
                <span class="s-name">${_htmlEncode(student)}</span>
                <div class="class-score-mini">
                    <span class="csm-pos">+${posCount}</span>
                    <span class="csm-neg">−${negCount}</span>
                </div>
                <div class="controls">
                    <button class="btn btn-pos ${dayStats.pos > 0 ? 'active' : ''}" onclick="setClassMark('${esc}',1)"  title="Artı ekle (+)" style="width:52px;font-size:1.2rem;">+${dayStats.pos > 0 ? dayStats.pos : ''}</button>
                    <button class="btn btn-neg ${dayStats.neg > 0 ? 'active' : ''}" onclick="setClassMark('${esc}',-1)" title="Eksi ekle (−)" style="width:52px;font-size:1.2rem;">−${dayStats.neg > 0 ? dayStats.neg : ''}</button>
                </div>
            </div>`;
        }).join('');
    }
    filterStudentList();
}

function updateCardButtons(studentName, newStatus) {
    const idx  = students.indexOf(studentName);
    const cards = studentListContainer.querySelectorAll('.student-card');
    const card  = cards[idx];
    if (!card) { renderStudents(); return; }
    if (adminTab === 'homework') {
        const marks = [1, -1, 2, 0, 3];
        card.querySelectorAll('.btn').forEach((btn, i) => btn.classList.toggle('active', newStatus === marks[i]));
    } else {
        const stats = getClassMarkStats(newStatus);
        const [posBtn, negBtn] = card.querySelectorAll('.btn');
        if (posBtn) {
            posBtn.classList.toggle('active', stats.pos > 0);
            posBtn.textContent = `+${stats.pos > 0 ? stats.pos : ''}`;
        }
        if (negBtn) {
            negBtn.classList.toggle('active', stats.neg > 0);
            negBtn.textContent = `−${stats.neg > 0 ? stats.neg : ''}`;
        }
        const posEl = card.querySelector('.csm-pos');
        const negEl = card.querySelector('.csm-neg');
        if (posEl) posEl.textContent = '+' + countClassStatus(studentName, 1);
        if (negEl) negEl.textContent = '−' + countClassStatus(studentName, -1);
    }
    filterStudentList();
}

function countClassStatus(student, val) {
    return Object.values(classRecords).reduce((total, day) => total + getClassMarkCount(day?.[student], val), 0);
}

function applyClassMarkDelta(currentValue, status) {
    const stats = getClassMarkStats(currentValue);
    if (status === 1) {
        if (stats.neg > 0) stats.neg -= 1;
        else stats.pos += 1;
    } else if (status === -1) {
        if (stats.pos > 0) stats.pos -= 1;
        else stats.neg += 1;
    }
    return (stats.pos > 0 || stats.neg > 0) ? stats : undefined;
}

function cloneDataValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') {
        try { return structuredClone(value); } catch (error) {}
    }
    return JSON.parse(JSON.stringify(value));
}

let _saveStatusTimer = null;
let _adminRealtimeFlags = { base: 'idle', subject: 'idle', global: 'idle', local: 'idle' };
let _isApplyingLocalMark = false;

function formatClock(value) {
    if (!value) return '—';
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function setBadgeState(element, text, state) {
    if (!element) return;
    if (element === realtimeStatusBadge) {
        element.dataset.fullStatus = text;
        element.dataset.statusState = state;
        if (text.startsWith('Canlı bağlantı:')) {
            text = text.replace('Canlı bağlantı: canlı', 'Canlı').replace('Canlı bağlantı:', 'Canlı:');
        }
    }
    element.textContent = text;
    element.className = `status-pill ${state}`;
}

matchMedia('(min-width:1100px)').addEventListener('change', () => {
    if (realtimeStatusBadge?.dataset.fullStatus) {
        setBadgeState(realtimeStatusBadge, realtimeStatusBadge.dataset.fullStatus, realtimeStatusBadge.dataset.statusState);
    }
});

function renderSyncMeta() {
    if (!syncMetaText) return;
    const meta = ClassLogData.getSyncMeta();
    // source identifies the view reader, not the person who made the change.
    const time = formatClock(meta.serverTs || meta.subjectUpdatedAt || meta.baseUpdatedAt || meta.lastSyncAt);
    const text = `Son güncelleme: ${time}`;
    let track=syncMetaText.querySelector('.sync-meta-loop');
    if(!track){track=document.createElement('span');track.className='sync-meta-loop';track.setAttribute('aria-hidden','true');for(let i=0;i<8;i++)track.append(document.createElement('span'));syncMetaText.replaceChildren(track);}
    for(const copy of track.children)if(copy.textContent!==text)copy.textContent=text;
    syncMetaText.setAttribute('aria-label',text);
    syncMetaText.title = text;
}

function setSaveStatus(text, state, sticky = false) {
    if(ClassLogMarkQueue.state().pending)return;
    setBadgeState(saveStatusBadge, text, state);
    if (_saveStatusTimer) {
        clearTimeout(_saveStatusTimer);
        _saveStatusTimer = null;
    }
    if (!sticky) {
        _saveStatusTimer = setTimeout(() => {
            setBadgeState(saveStatusBadge, 'Hazır', 'status-idle');
        }, 2200);
    }
}

function setRealtimeFlag(channel, status) {
    _adminRealtimeFlags[channel] = status;
    const values = Object.values(_adminRealtimeFlags);
    const liveCount = values.filter(value => value === 'SUBSCRIBED').length;
    const hasError = values.some(value => ['CHANNEL_ERROR', 'TIMED_OUT', 'CLOSED'].includes(value));

    if (liveCount > 0) {
        setBadgeState(realtimeStatusBadge, `Canlı bağlantı: canlı (${liveCount})`, 'status-live');
        return;
    }
    if (hasError) {
        setBadgeState(realtimeStatusBadge, 'Canlı bağlantı: sorun var', 'status-error');
        return;
    }
    setBadgeState(realtimeStatusBadge, 'Canlı bağlantı: bağlanıyor', 'status-muted');
}

function markRealtimeEvent(source) {
    setBadgeState(realtimeStatusBadge, `Canlı bağlantı: olay alındı (${source})`, 'status-live');
}

function renderMarkingInfo() {
    const infoEl = document.getElementById('markingInfoBar');
    if (!infoEl) return;
    if (adminTab === 'homework') {
        infoEl.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;justify-content:center;">
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.24);color:#dcfce7;font-weight:700;">
                    <span style="width:12px;height:12px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18);"></span>
                    Yeşil: Tamam
                </span>
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.24);color:#fee2e2;font-weight:700;">
                    <span style="width:12px;height:12px;border-radius:999px;background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.18);"></span>
                    Kırmızı: Eksik
                </span>
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(234,179,8,.14);border:1px solid rgba(250,204,21,.24);color:#fef3c7;font-weight:700;">
                    <span style="width:12px;height:12px;border-radius:999px;background:#eab308;box-shadow:0 0 0 3px rgba(234,179,8,.18);"></span>
                    Sarı: Yarım
                </span>
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(168,85,247,.14);border:1px solid rgba(196,181,253,.24);color:#ede9fe;font-weight:700;">
                    <span style="width:12px;height:12px;border-radius:999px;background:#a855f7;box-shadow:0 0 0 3px rgba(168,85,247,.18);"></span>
                    Mor: Kitap Yok
                </span>
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(148,163,184,.16);border:1px solid rgba(203,213,225,.22);color:#e2e8f0;font-weight:700;">
                    <span style="width:12px;height:12px;border-radius:999px;background:#94a3b8;box-shadow:0 0 0 3px rgba(148,163,184,.18);"></span>
                    Gri: Gelmedi
                </span>
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(148,163,184,.16);border:1px solid rgba(203,213,225,.22);color:#e2e8f0;font-weight:700;">
                    Tümünü Sıfırla : Seçili günün işaretlerini temizler
                </span>
            </div>`;
    } else {
        infoEl.innerHTML = `
            <div style="display:flex;flex-wrap:wrap;gap:8px 10px;align-items:center;justify-content:center;">
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(34,197,94,.14);border:1px solid rgba(74,222,128,.24);color:#dcfce7;font-weight:700;">
                    <span style="width:12px;height:12px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18);"></span>
                    Yeşil + : Önce eksiyi azaltır, yoksa artı ekler
                </span>
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(239,68,68,.14);border:1px solid rgba(248,113,113,.24);color:#fee2e2;font-weight:700;">
                    <span style="width:12px;height:12px;border-radius:999px;background:#ef4444;box-shadow:0 0 0 3px rgba(239,68,68,.18);"></span>
                    Kırmızı − : Önce artıyı azaltır, yoksa eksi ekler
                </span>
                <span style="display:inline-flex;align-items:center;gap:8px;padding:6px 10px;border-radius:999px;background:rgba(148,163,184,.16);border:1px solid rgba(203,213,225,.22);color:#e2e8f0;font-weight:700;">
                    Tümünü Sıfırla : Seçili günün işaretlerini temizler
                </span>
            </div>`;
    }
    infoEl.style.display = 'block';
}

async function resyncAdminState() {
    await ClassLogData.sync();
    await loadData();
    renderStudents();
    renderMarkingInfo();
    renderSyncMeta();
}

// ─── Ödev İşareti ─────────────────────────────────────────────────────────────
function enqueueMarks(kind,names,status,bulk=false,clear=false){
 if(!names.length)return;
 if(ClassLogData.viewingTermId!==null&&ClassLogData.viewingTermId!==ClassLogData.activeTermId)return;
 const date=currentDateInput.value,next=cloneDataValue(kind==='records'?records:classRecords)||{};next[date] ||= {};
 names.forEach(name=>{if(clear)delete next[date][name];else if(kind==='classRecords'){const value=applyClassMarkDelta(next[date][name],status);if(value)next[date][name]=value;else delete next[date][name];}else if(!bulk&&next[date][name]===status)delete next[date][name];else next[date][name]=status;});
 if(!Object.keys(next[date]).length)delete next[date];
 if(kind==='records')records=next;else classRecords=next;
 if(bulk||clear)renderStudents();else {updateCardButtons(names[0],next[date]?.[names[0]]);playCardAnimation(names[0],status);}
 filterStudentList();
 void ClassLogData[kind==='records'?'saveRecords':'saveClassRecords'](next,{date,students:names});
}
window.setMark=(name,status)=>enqueueMarks('records',[name],status);
window.setClassMark=(name,status)=>enqueueMarks('classRecords',[name],status);
window.bulkSetMark=status=>enqueueMarks(adminTab==='homework'?'records':'classRecords',[...students],status,true);
window.bulkClearMarks=()=>enqueueMarks(adminTab==='homework'?'records':'classRecords',[...students],null,true,true);

function playCardAnimation(studentName, newStatus) {
    if (newStatus !== 1 && newStatus !== -1) return;
    const idx  = students.indexOf(studentName);
    const card = studentListContainer.querySelectorAll('.student-card')[idx];
    if (!card) return;
    card.classList.remove('card-anim-plus', 'card-anim-minus');
    void card.offsetWidth;
    if (newStatus === 1)  card.classList.add('card-anim-plus');
    if (newStatus === -1) card.classList.add('card-anim-minus');
    setTimeout(() => {
        card.classList.remove('card-anim-plus', 'card-anim-minus');
    }, 1000);
}

// ─── Veli Notu ───────────────────────────────────────────────────────────────
let _noteStudent = null;
const noteModal  = document.getElementById('noteModal');
const noteInput  = document.getElementById('noteInput');

window.openNote = function(studentName) {
    if (ClassLogAuth.isKioskSession()) return;
    _noteStudent = studentName;
    const descEl = document.getElementById('noteModalDesc');
    if (descEl) descEl.textContent = `"${studentName}" için veli portalında görünecek not:`;
    if (noteInput) noteInput.value = notes[studentName] || '';
    if (noteModal) { noteModal.style.display = 'flex'; setTimeout(() => noteInput && noteInput.focus(), 100); }
};

const closeNoteModalBtn = document.getElementById('closeNoteModal');
if (closeNoteModalBtn) closeNoteModalBtn.onclick = () => { if (noteModal) noteModal.style.display = 'none'; };

const saveNoteBtn = document.getElementById('saveNoteBtn');
if (saveNoteBtn) saveNoteBtn.onclick = async () => {
    if (ClassLogAuth.isKioskSession()) return;
    if (!_noteStudent) return;
    notes[_noteStudent] = noteInput.value;
    setSaveStatus('Not kaydediliyor...', 'status-saving', true);
    const ok = await ClassLogData.saveNotes(notes);
    if (!ok) {
        setSaveStatus('Not kaydi hatali', 'status-error');
        alert(`${getDataErrorMessage('Not kaydedilemedi.')}\nVeri yeniden yukleniyor.`);
        await resyncAdminState();
        return;
    }
    notes = ClassLogData.getNotes();
    if (noteModal) noteModal.style.display = 'none';
    renderStudents();
    renderSyncMeta();
    setSaveStatus('Not kaydedildi', 'status-ok');
};

// ─── Öğrenci Yönetimi ────────────────────────────────────────────────────────
const manageModal     = document.getElementById('manageModal');
const manageBtn       = document.getElementById('manageStudentsBtn');
const closeManageBtn  = document.getElementById('closeManageModal');
const saveStudentsBtn = document.getElementById('saveStudentsBtn');
const bulkInput       = document.getElementById('bulkInput');

if (manageBtn)      manageBtn.onclick      = () => { prepareStudentRename(); if (bulkInput) bulkInput.value = students.join('\n'); if (manageModal) manageModal.style.display = 'flex'; };
if (closeManageBtn) closeManageBtn.onclick = () => { if (manageModal) manageModal.style.display = 'none'; };

window.onclick = e => {
    if (e.target === manageModal)  manageModal.style.display  = 'none';
    if (e.target === noteModal)    noteModal.style.display    = 'none';
    const teacherModal = document.getElementById('teacherModal');
    const pwModal      = document.getElementById('pwModal');
    if (teacherModal && e.target === teacherModal) teacherModal.style.display = 'none';
    if (pwModal      && e.target === pwModal)      pwModal.style.display      = 'none';
    const qrM = document.getElementById('qrModal');
    if (qrM && e.target === qrM) qrM.style.display = 'none';
    const subjectModal = document.getElementById('subjectManageModal');
    if (subjectModal && e.target === subjectModal) subjectModal.style.display = 'none';
    const termModal = document.getElementById('termManageModal');
    if (termModal && e.target === termModal) termModal.style.display = 'none';
};

if (saveStudentsBtn) saveStudentsBtn.onclick = async () => {
    const newStudents = bulkInput.value.split('\n').map(s=>s.trim()).filter(s=>s.length);
    if (students.some(name => !newStudents.includes(name)) && !confirm('İsim değiştiriyorsanız iptal edip Öğrenci adını değiştir alanını kullanın. Liste güncellemesi kayıtları yeni ada taşımaz. Devam edilsin mi?')) return;
    if (confirm(`${newStudents.length} öğrenci kaydedilecek. Onaylıyor musunuz?`)) {
        students = newStudents;
        setSaveStatus('Liste kaydediliyor...', 'status-saving', true);
        const ok = await ClassLogData.saveStudents(students);
        if (!ok) {
            setSaveStatus('Liste kaydı hatalı', 'status-error');
            alert(`${getDataErrorMessage('Öğrenci listesi kaydedilemedi.')}\nVeri yeniden yükleniyor.`);
            await resyncAdminState();
            return;
        }
        renderStudents();
        if (manageModal) manageModal.style.display = 'none';
        renderSyncMeta();
        setSaveStatus('Liste kaydedildi', 'status-ok');
    }
};

// ─── CSV Export ──────────────────────────────────────────────────────────────
// ─── Tarih Navigasyon ─────────────────────────────────────────────────────────
if (currentDateInput) currentDateInput.onchange = renderStudents;

const prevDateBtn = document.getElementById('prevDate');
const nextDateBtn = document.getElementById('nextDate');
if (prevDateBtn) prevDateBtn.onclick = () => {
    const d = new Date(currentDateInput.value); d.setDate(d.getDate()-1);
    currentDateInput.value = d.toISOString().split('T')[0]; renderStudents();
};
if (nextDateBtn) nextDateBtn.onclick = () => {
    const d = new Date(currentDateInput.value); d.setDate(d.getDate()+1);
    currentDateInput.value = d.toISOString().split('T')[0]; renderStudents();
};

function homeworkRecordedDates() {
    return [...new Set([
        ...Object.keys(records).filter(date => Object.values(records[date] || {}).some(value => [1, -1, 0, 2, 3].includes(value))),
        ...Object.keys(ClassLogData.homeworkDescriptions || {}).filter(date => ClassLogData.homeworkDescriptions[date]?.text)
    ])].sort();
}
function updateHomeworkDateJumps() {
    const dates = homeworkRecordedDates();
    const previous = document.getElementById('previousHomeworkDate');
    const next = document.getElementById('nextHomeworkDate');
    const latest = document.getElementById('latestHomeworkDate');
    previous.hidden = next.hidden = latest.hidden = adminTab !== 'homework';
    previous.disabled = !dates.some(date => date < currentDateInput.value);
    next.disabled = !dates.some(date => date > currentDateInput.value);
    latest.disabled = !dates.length || dates[dates.length - 1] === currentDateInput.value;
}
document.getElementById('previousHomeworkDate').onclick = () => {
    const date = homeworkRecordedDates().filter(date => date < currentDateInput.value).pop();
    if (date) { currentDateInput.value = date; renderStudents(); }
};
document.getElementById('latestHomeworkDate').onclick = () => {
    const date = homeworkRecordedDates().pop();
    if (date) { currentDateInput.value = date; renderStudents(); }
};
document.getElementById('nextHomeworkDate').onclick = () => {
    const date = homeworkRecordedDates().find(date => date > currentDateInput.value);
    if (date) { currentDateInput.value = date; renderStudents(); }
};

// ─── Link Kopyala ─────────────────────────────────────────────────────────────
async function updateParentViewHref(className = ClassLogData.currentClass) {
    if (!viewToggle) return;
    const token = await ClassLogData.ensureParentToken(className);
    viewToggle.href = token ? `parent.html?id=${encodeURIComponent(token)}` : 'parent.html';
}

const copyLinkBtn = document.getElementById('copyLinkBtn');
if (copyLinkBtn) copyLinkBtn.onclick = async () => {
    const token = await ClassLogData.ensureParentToken(ClassLogData.currentClass);
    if (!token) { alert(getDataErrorMessage('Veli linki üretilemedi.')); return; }
    const url = `${window.location.origin}${window.location.pathname.replace('admin.html','parent.html')}?id=${encodeURIComponent(token)}`;
    navigator.clipboard.writeText(url).then(() => {
        const orig = copyLinkBtn.textContent;
        copyLinkBtn.textContent = "✅ Kopyalandı!";
        setTimeout(() => copyLinkBtn.textContent = orig, 2200);
    });
};

// ─── Tahta / Cihaz Eşleştirme ────────────────────────────────────────────────
// ─── Tahtayı Aç: telefon butonuyla sabit kanala kimlik gönder ────────────────
async function buildBoardUnlockPayload(boardCode, contextOverride = null) {
    const normalizedBoardCode = normalizeBoardCode(boardCode);
    if (!/^\d{6}$/.test(normalizedBoardCode)) {
        throw new Error('Geçerli bir tahta kodu girin.');
    }
    const context = contextOverride || getCurrentBoardContext();
    const kioskSession = await ClassLogAuth.createKioskSession(context);
    if (!kioskSession?.sessionToken) {
        throw new Error('Kiosk oturumu olusturulamadi.');
    }
    setStoredBoardTargetCode(normalizedBoardCode);
    return {
        token: kioskSession.sessionToken,
        teacher: kioskSession.teacher || ClassLogAuth.getTeacher(),
        context,
        expiresAt: kioskSession.expiresAt ? new Date(kioskSession.expiresAt).getTime() : (Date.now() + KIOSK_DURATION_MS),
        sessionKind: kioskSession.sessionKind || 'kiosk',
        boardCode: normalizedBoardCode
    };
}

async function sendBoardCommand(eventName, payload = {}) {
    const ch = await _getBroadcastChannel(CLASSLOG_BOARD_CHANNEL);
    await ch.send({
        type: 'broadcast',
        event: eventName,
        payload: {
            ts: Date.now(),
            ...payload
        }
    });
}

const pushToBoardBtn = document.getElementById('pushToBoardBtn');
if (pushToBoardBtn) pushToBoardBtn.onclick = async () => {
    const orig = pushToBoardBtn.textContent;
    const boardCode = promptForBoardCode();
    if (!boardCode) return;
    pushToBoardBtn.textContent = '⏳ Bağlanıyor...';
    pushToBoardBtn.disabled = true;
    try {
        await sendBoardCommand('unlock', await buildBoardUnlockPayload(boardCode));
        pushToBoardBtn.textContent = '✅ Tahta Açıldı!';
        setTimeout(() => {
            pushToBoardBtn.textContent = orig;
            pushToBoardBtn.disabled = false;
        }, 4000);
    } catch (err) {
        console.error('Push to board error:', err);
        alert(err?.message || 'Tahta bağlantısı kurulurken bir sorun oluştu.');
        pushToBoardBtn.textContent = '❌ Bağlanamadı';
        setTimeout(() => {
            pushToBoardBtn.textContent = orig;
            pushToBoardBtn.disabled = false;
        }, 2500);
    }
};

const closeBoardBtn = document.getElementById('closeBoardBtn');
if (closeBoardBtn) closeBoardBtn.onclick = async () => {
    const orig = closeBoardBtn.textContent;
    const boardCode = getStoredBoardTargetCode() || promptForBoardCode('Kapatilacak tahta kodunu girin');
    if (!boardCode) return;
    closeBoardBtn.textContent = 'Kapatiliyor...';
    closeBoardBtn.disabled = true;
    try {
        await sendBoardCommand('lock', {
            teacher: ClassLogAuth.getTeacher(),
            reason: 'manual',
            boardCode
        });
        setStoredBoardTargetCode('');
        closeBoardBtn.textContent = 'Kapandi';
        setTimeout(() => {
            closeBoardBtn.textContent = orig;
            closeBoardBtn.disabled = false;
        }, 2500);
    } catch (err) {
        console.error('Close board error:', err);
        closeBoardBtn.textContent = 'Baglanamadi';
        setTimeout(() => {
            closeBoardBtn.textContent = orig;
            closeBoardBtn.disabled = false;
        }, 2500);
    }
};

async function handleRemoteAuthIfNeeded() {
    const authReq = _authReqParam;
    if (!authReq || !ClassLogAuth.isLoggedIn()) return false;

    await ClassLogData.syncSettings();
    const teacher = ClassLogAuth.getTeacher() || {};
    const allowedClasses = teacher.classes?.length
        ? ClassLogData.availableClasses.filter(className => teacher.classes.includes(className))
        : ClassLogData.availableClasses;
    const allowedSubjects = getTeacherSubjects();
    const defaultClass = allowedClasses.includes(ClassLogData.currentClass)
        ? ClassLogData.currentClass
        : (allowedClasses[0] || '5A');
    const defaultSubject = allowedSubjects.find(subject => subject.id === ClassLogData.currentSubject)?.id
        || allowedSubjects[0]?.id
        || 'turkce';
    const defaultView = adminTab === 'class' ? 'class' : 'homework';

    document.body.innerHTML = `
        <div style="min-height:100vh;background:var(--a-bg);display:flex;align-items:center;justify-content:center;padding:24px;">
            <div style="width:100%;max-width:460px;background:rgba(15,23,42,.96);border:1px solid rgba(148,163,184,.22);border-radius:24px;padding:28px;box-shadow:0 28px 60px rgba(2,6,23,.45);">
                <div style="font-size:2.8rem;text-align:center;margin-bottom:10px;">📱</div>
                <h2 style="font-family:'Segoe UI','DM Sans',sans-serif;color:#f8fafc;font-size:1.5rem;text-align:center;margin-bottom:8px;">Tahtayı Aç</h2>
                <p style="color:#94a3b8;font-size:.92rem;line-height:1.6;text-align:center;margin-bottom:22px;">Tahtada görünen 6 haneli kodu girin, sınıfı seçin ve sadece o tahtayı açın.</p>
                <label style="display:block;color:#cbd5e1;font-size:.82rem;font-weight:700;margin-bottom:6px;">Tahta kodu</label>
                <input id="remoteBoardCode" inputmode="numeric" maxlength="6" placeholder="Örn: 482731" style="width:100%;padding:14px 16px;border-radius:14px;border:1px solid rgba(148,163,184,.2);background:#081120;color:#f8fafc;font-size:1.2rem;letter-spacing:.24em;text-align:center;margin-bottom:14px;">
                <label style="display:block;color:#cbd5e1;font-size:.82rem;font-weight:700;margin-bottom:6px;">Sınıf</label>
                <select id="remoteBoardClass" style="width:100%;padding:13px 14px;border-radius:14px;border:1px solid rgba(148,163,184,.2);background:#081120;color:#f8fafc;margin-bottom:14px;">${allowedClasses.map(className => `<option value="${className}" ${className === defaultClass ? 'selected' : ''}>${className}</option>`).join('')}</select>
                <label style="display:block;color:#cbd5e1;font-size:.82rem;font-weight:700;margin-bottom:6px;">Ders</label>
                <select id="remoteBoardSubject" style="width:100%;padding:13px 14px;border-radius:14px;border:1px solid rgba(148,163,184,.2);background:#081120;color:#f8fafc;margin-bottom:14px;">${allowedSubjects.map(subject => `<option value="${subject.id}" ${subject.id === defaultSubject ? 'selected' : ''}>${_htmlEncode(subject.label)}</option>`).join('')}</select>
                <label style="display:block;color:#cbd5e1;font-size:.82rem;font-weight:700;margin-bottom:6px;">Görünüm</label>
                <select id="remoteBoardView" style="width:100%;padding:13px 14px;border-radius:14px;border:1px solid rgba(148,163,184,.2);background:#081120;color:#f8fafc;margin-bottom:18px;">
                    <option value="homework" ${defaultView === 'homework' ? 'selected' : ''}>Ödev Takip</option>
                    <option value="class" ${defaultView === 'class' ? 'selected' : ''}>Derse Katılım</option>
                </select>
                <button id="remoteBoardOpenBtn" style="width:100%;padding:14px 16px;border:none;border-radius:16px;background:linear-gradient(135deg,#2563eb,#38bdf8);color:#fff;font-weight:800;font-size:1rem;cursor:pointer;">Tahtayı Aç</button>
                <p id="remoteBoardError" style="min-height:20px;margin-top:12px;color:#fca5a5;font-size:.82rem;text-align:center;"></p>
            </div>
        </div>`;

    const codeInput = document.getElementById('remoteBoardCode');
    const classSelect = document.getElementById('remoteBoardClass');
    const subjectSelect = document.getElementById('remoteBoardSubject');
    const viewSelect = document.getElementById('remoteBoardView');
    const errorEl = document.getElementById('remoteBoardError');
    const openBtn = document.getElementById('remoteBoardOpenBtn');

    if (codeInput) {
        codeInput.value = getStoredBoardTargetCode();
        codeInput.focus();
        codeInput.addEventListener('input', () => {
            codeInput.value = normalizeBoardCode(codeInput.value);
        });
    }

    if (openBtn) openBtn.onclick = async () => {
        const boardCode = normalizeBoardCode(codeInput?.value || '');
        if (!/^\d{6}$/.test(boardCode)) {
            if (errorEl) errorEl.textContent = 'Tahtadaki geçerli 6 haneli kodu girin.';
            return;
        }

        const context = {
            className: classSelect?.value || defaultClass,
            subjectId: subjectSelect?.value || defaultSubject,
            viewingTermId: ClassLogData.viewingTermId ?? ClassLogData.activeTermId ?? null,
            activeTermId: ClassLogData.activeTermId ?? null,
            adminTab: viewSelect?.value === 'class' ? 'class' : 'homework'
        };

        openBtn.disabled = true;
        openBtn.textContent = 'Bağlanıyor...';
        if (errorEl) errorEl.textContent = '';

        try {
            const payload = await buildBoardUnlockPayload(boardCode, context);
            await sendBoardCommand('unlock', payload);
            document.body.innerHTML = `
                <div style="position:fixed;inset:0;background:var(--a-bg);display:flex;align-items:center;justify-content:center;flex-direction:column;gap:24px;text-align:center;padding:40px;">
                    <div style="font-size:5rem;">✅</div>
                    <h2 style="font-family:'Segoe UI','DM Sans',sans-serif;color:#4ade80;font-size:1.5rem;">Tahta Açıldı</h2>
                    <p style="color:#94a3b8;">${context.className} sınıfı için bağlantı kuruldu.</p>
                    <p style="color:#64748b;font-size:.82rem;margin-top:8px;">Bu sekme 3 saniyede kapanacak...</p>
                </div>`;
            setTimeout(() => {
                try { window.close(); } catch (error) {}
                setTimeout(() => { window.location.href = window.location.pathname; }, 600);
            }, 2800);
        } catch (error) {
            console.error('Remote board connect error:', error);
            if (errorEl) errorEl.textContent = error?.message || 'Tahta bağlantısı kurulurken bir sorun oluştu.';
            openBtn.disabled = false;
            openBtn.textContent = 'Tahtayı Aç';
        }
    };

    return true;
}

// ─── QR Kodu ──────────────────────────────────────────────────────────────────
const qrBtn = document.getElementById('qrBtn');
if (qrBtn) qrBtn.onclick = showBoardQR;

function showBoardQR() {
    const modal   = document.getElementById('qrModal');
    const label   = document.getElementById('qrClassLabel');
    const img     = document.getElementById('qrImage');
    const infoEl  = document.getElementById('qrInfo');
    const countEl = document.getElementById('qrCountdown');
    if (!modal) return;

    // ── Sabit auth_request URL (QR asla değişmez) ──
    const boardAuthUrl = `${window.location.origin}${window.location.pathname}?auth_request=${CLASSLOG_BOARD_FIXED_ID}`;
    const boardUrl     = `${window.location.origin}${window.location.pathname}?mode=board`;

    if (label)   label.textContent = '🖥️ Tahta QR — Telefon ile Tarat';
    if (img)     img.src = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&margin=10&color=F1F5FF&bgcolor=0D1525&data=${encodeURIComponent(boardAuthUrl)}`;
    if (countEl) countEl.textContent = '♾️ Sabit QR — Asla değişmez';
    if (infoEl)  infoEl.innerHTML = `
        <div style="margin-top:12px;padding:12px 14px;background:rgba(99,102,241,.1);border-radius:10px;font-size:.82rem;line-height:1.7;color:var(--a-muted2);text-align:left;">
            <strong style="color:var(--a-accent)">📋 İki Yöntemden Biri:</strong><br>
            <strong style="color:#4ade80;">① Telefon Butonu (Önerilen):</strong><br>
            &nbsp;&nbsp;Panel'de <em>"📱→🖥️ Tahtayı Aç"</em> butonuna bas<br><br>
            <strong style="color:#60a5fa;">② QR Tarat:</strong><br>
            &nbsp;&nbsp;Tahtaya <a style="color:#818cf8;" href="${boardUrl}" target="_blank">bu bağlantıyı</a> aç → QR görünür<br>
            &nbsp;&nbsp;Telefonunla o QR'ı tara → bağlan<br><br>
            <strong style="color:#F59E0B;">🔒 Güvenlik:</strong> Öğrenciler QR'ı okutsa da şifre bilmeden giremez.
        </div>`;
    modal.style.display = 'flex';
}

// ─── Sınıf Değiştir ───────────────────────────────────────────────────────────
const classPickerButton = document.getElementById('classPickerButton');
const classPickerDialog = document.createElement('dialog');
classPickerDialog.id = 'classPickerDialog';
classPickerDialog.className = 'class-picker-dialog';
classPickerDialog.setAttribute('aria-labelledby', 'classPickerTitle');
document.body.appendChild(classPickerDialog);
function syncClassPickerLabel() {
    classPickerButton.textContent = `${classSelector.value || ClassLogData.currentClass} ▾`;
    classPickerButton.setAttribute('aria-label', `Sınıf seç: ${classSelector.value || ClassLogData.currentClass}`);
}
classPickerButton.onclick = () => {
    if (ClassLogAuth.isKioskSession() || classSelector.disabled) return;
    const groups = new Map();
    [...classSelector.options].forEach(option => {
        if (option.disabled) return;
        const grade = option.value.match(/^\d+/)?.[0] || 'Diğer';
        if (!groups.has(grade)) groups.set(grade, []);
        groups.get(grade).push(option.value);
    });
    classPickerDialog.innerHTML = `<div class="class-picker-heading"><h2 id="classPickerTitle">Sınıf Seç</h2><button type="button" data-close aria-label="Kapat"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button></div>`
        + [...groups].sort(([a], [b]) => a.localeCompare(b, 'tr', { numeric:true })).map(([grade, classes]) =>
            `<section><h3>${_htmlEncode(grade)}${grade === 'Diğer' ? '' : '. Sınıflar'}</h3><div class="class-picker-grid">${classes.map(name =>
                `<button type="button" data-class="${_htmlEncode(name)}" aria-pressed="${name === classSelector.value}">${_htmlEncode(name)}</button>`).join('')}</div></section>`).join('');
    classPickerDialog.showModal();
    (classPickerDialog.querySelector('[aria-pressed="true"]') || classPickerDialog.querySelector('button')).focus();
};
classPickerDialog.addEventListener('click', async event => {
    if (event.target.closest('[data-close]')) { classPickerDialog.close(); return; }
    const button = event.target.closest('[data-class]');
    if (!button) {
        const rect = classPickerDialog.getBoundingClientRect();
        if (event.target === classPickerDialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) classPickerDialog.close();
        return;
    }
    const value = button.dataset.class;
    classPickerDialog.close();
    if (value === classSelector.value) return;
    const previous = classSelector.value;
    classSelector.value = value;
    classPickerButton.disabled = true;
    syncClassPickerLabel();
    try { await classSelector.onchange({ target:classSelector }); }
    catch (error) {
        classSelector.value = ClassLogData.currentClass || previous;
        alert('Sınıf yüklenemedi. Bağlantınızı kontrol edip tekrar deneyin.');
    } finally { classPickerButton.disabled = false; syncClassPickerLabel(); }
});
if (classSelector) classSelector.onchange = async e => {
    const newClass = e.target.value;
    document.getElementById('studentSearch').value = '';
    await ClassLogData.setClass(newClass);
    persistKioskContext();
    await loadData();
    await updateParentViewHref(newClass);
    renderKioskContextInfo();
    renderMarkingInfo();
    renderStudents();
    renderSubjectTabs();
    setupAdminRealtime();
};

// ─── Öğretmen Yönetimi ────────────────────────────────────────────────────────
const teacherModal = document.getElementById('teacherModal');

window.openTeacherManager = async function() {
    if (!ClassLogAuth.isAdmin()) return;
    if (teacherModal) teacherModal.style.display = 'flex';
    await refreshTeacherList();
};

async function refreshTeacherList() {
    const teachers = await ClassLogAuth.listTeachers();
    const list = document.getElementById('teacherList');
    if (!list) return;
    if (!teachers.length) {
        list.innerHTML = '<p style="color:var(--a-muted2);text-align:center;padding:24px;">Henüz öğretmen yok.</p>';
        return;
    }
    list.innerHTML = teachers.map(t => `
        <div class="teacher-row" data-id="${t.id}">
            <div class="teacher-info">
                <strong>${_htmlEncode(t.name)}</strong>
                <span class="teacher-username">@${_htmlEncode(t.username)}</span>
                <span class="teacher-role ${t.role}">${t.role === 'admin' ? '👑 Admin' : adminTeacherIcon + ' Öğretmen'}</span>
                ${!t.active ? '<span class="teacher-inactive">Pasif</span>' : ''}
            </div>
            <div class="teacher-actions">
                <button class="tbtn tbtn-accent" onclick="editTeacher('${t.id}')">✏️ Düzenle</button>
                ${t.id !== ClassLogAuth.getTeacher()?.id ? `<button class="tbtn" onclick="deleteTeacher(${t.id},'${_htmlEncode(t.name)}')">🗑️</button>` : ''}
            </div>
        </div>`).join('');
}

let _editTeacherId = null;

window.editTeacher = async function(id) {
    const teachers = await ClassLogAuth.listTeachers();
    const t = id === 'new'
        ? { id:null, name:'', username:'', password:'', role:'teacher', classes:[], active:true }
        : teachers.find(x => String(x.id) === String(id));
    if (!t && id !== 'new') return;
    _editTeacherId = t?.id || null;

    const formTitle = document.getElementById('teacherFormTitle');
    const tName     = document.getElementById('tName');
    const tUsername = document.getElementById('tUsername');
    const tPassword = document.getElementById('tPassword');
    const tRole     = document.getElementById('tRole');
    const tActive   = document.getElementById('tActive');
    const tClasses  = document.getElementById('tClasses');
    const tForm     = document.getElementById('teacherForm');
    const tList     = document.getElementById('teacherList');
    const addBtn    = document.getElementById('addTeacherBtn');

    if (formTitle) formTitle.textContent = t.id ? 'Öğretmeni Düzenle' : 'Yeni Öğretmen Ekle';
    if (tName)     tName.value     = t.name     || '';
    if (tUsername) tUsername.value = t.username || '';
    if (tPassword) { tPassword.value = ''; tPassword.placeholder = t.id ? 'Değiştirmek için girin (boş = aynı kalır)' : 'Şifre belirleyin'; }
    if (tRole)     tRole.value     = t.role     || 'teacher';
    if (tActive)   tActive.checked = t.active !== false;
    if (tClasses)  tClasses.innerHTML = ClassLogData.availableClasses.map(c => `
        <label class="class-check">
            <input type="checkbox" value="${c}" ${(t.classes||[]).includes(c)?'checked':''}> ${c}
        </label>`).join('');

    // Ders seçimi
    const tSubjects = document.getElementById('tSubjects');
    if (tSubjects) tSubjects.innerHTML = SUBJECTS.map(s => `
        <label class="class-check" style="--chk-color:${s.color}20;border-color:${s.color}40;">
            <input type="checkbox" name="tSubject" value="${s.id}" ${(t.subjects||[]).includes(s.id)?'checked':''}> ${renderSubjectIcon(s)} ${_htmlEncode(s.label)}
        </label>`).join('');

    if (tForm) tForm.style.display = 'block';
    if (tList) tList.style.display = 'none';
    if (addBtn) addBtn.style.display = 'none';
};

// ─── Ders Yönetimi ────────────────────────────────────────────────────────────
window.openSubjectManager = function() {
    if (!ClassLogAuth.isAdmin()) return;
    const modal = document.getElementById('subjectManageModal');
    if (modal) modal.style.display = 'flex';
    renderSubjectManager();
};

// ─── Dönem Yönetimi ───────────────────────────────────────────────────────────
window.openTermManager = function() {
    if (!ClassLogAuth.isAdmin()) return;
    const modal = document.getElementById('termManageModal');
    if (modal) modal.style.display = 'flex';
    renderTermManager();
};

window.renderTermManager = function() {
    const input = document.getElementById('termStringInput');
    if (input) input.value = ClassLogData.termString || '';

    const container = document.getElementById('termListContainer');
    if (!container) return;

    const terms = ClassLogData.terms || [];
    if (!terms.length) {
        container.innerHTML = '<p style="color:var(--a-muted2);text-align:center;padding:20px;font-size:.85rem;">Henüz arşivlenmiş dönem yok.</p>';
        return;
    }

    const viewing = ClassLogData.viewingTermId;
    const active  = ClassLogData.activeTermId;

    container.innerHTML = terms.map(t => {
        const isActive  = t.id === active || (t.id === null && active === null);
        const isViewing = t.id === viewing || (t.id === null && viewing === null);
        return `
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--a-surface);padding:12px 16px;border-radius:10px;border:1px solid ${isActive ? 'rgba(129,140,248,.5)' : 'var(--a-border2)'};">
            <div>
                <strong style="color:var(--a-text);font-size:.88rem;">${_htmlEncode(t.label)}</strong>
                ${isActive ? '<span style="margin-left:8px;font-size:.68rem;background:rgba(129,140,248,.2);color:var(--a-accent);padding:2px 8px;border-radius:4px;font-weight:700;">AKTİF</span>' : ''}
                <div style="font-size:.72rem;color:var(--a-muted2);margin-top:2px;">${t.created || ''}</div>
            </div>
            <button class="tbtn ${isViewing ? 'tbtn-accent' : 'tbtn-ghost'}" onclick="switchViewingTerm(${JSON.stringify(t.id)})" style="font-size:.75rem;">
                ${isViewing ? '👁️ Görüntüleniyor' : (isActive ? '✏️ Düzenle' : '👁️ Arşivi Gör')}
            </button>
        </div>`;
    }).join('');
};

// Sadece dönem adını güncelle (veri temizleme yok)
window.updateTermString = async function() {
    const input = document.getElementById('termStringInput');
    const label = input?.value.trim();
    if (!label) { alert('Dönem adı boş olamaz.'); return; }
    ClassLogData.termString = label;
    // Aktif dönem varsa label güncelle
    const terms = ClassLogData.terms || [];
    const idx = terms.findIndex(t => t.id === ClassLogData.activeTermId ||
        (t.id === null && ClassLogData.activeTermId === null));
    if (idx >= 0) terms[idx].label = label;
    ClassLogData.terms = terms;
    setSaveStatus('Donem ayari kaydediliyor...', 'status-saving', true);
    if (!await ClassLogData.saveSettings()) { setSaveStatus('Donem ayari hatali', 'status-error'); alert('Donem ayari kaydedilemedi.'); return; }
    renderSyncMeta();
    setSaveStatus('Donem ayari kaydedildi', 'status-ok');
    alert('✅ Dönem adı güncellendi.');
    renderTermManager();
};

// Yeni dönem başlat: veriyi arşivle, temiz başla
window.createNewTerm = async function() {
    const input = document.getElementById('newTermLabelInput');
    const label = input?.value.trim();
    if (!label) { alert('Yeni dönem için bir ad girin.'); return; }

    if (!confirm(
        `"${label}" adında yeni bir dönem başlatılacak.\n\n` +
        `• Mevcut tüm sınıf verileri arşivlenecek\n` +
        `• Yeni dönem için temiz, boş sayfalar açılacak\n` +
        `• Eski veriler admin panelinde görünmeye devam edecek\n\n` +
        `Devam etmek istiyor musunuz?`
    )) return;

    const now      = new Date();
    const pad      = n => String(n).padStart(2,'0');
    const newTermId = `T${now.getFullYear()}${pad(now.getMonth()+1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;

    // Mevcut aktif terimi arşive ekle
    const terms = ClassLogData.terms || [];
    if (!terms.length) {
        // İlk defa yeni dönem oluşturuluyor: mevcut veriyi "Başlangıç" olarak arşivle
        terms.push({
            id:      null,
            label:   ClassLogData.termString || 'Başlangıç Dönemi',
            created: 'Başlangıç'
        });
    }
    // Yeni dönem ekle
    terms.push({
        id:      newTermId,
        label:   label,
        created: `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()}`
    });

    ClassLogData.terms        = terms;
    ClassLogData.activeTermId = newTermId;
    ClassLogData.termString   = label;
    ClassLogData.viewingTermId = null;
    persistKioskContext();

    setSaveStatus('Yeni donem hazirlaniyor...', 'status-saving', true);
    if (!await ClassLogData.saveSettings()) { setSaveStatus('Yeni donem hatasi', 'status-error'); alert('Yeni donem baslatilamadi.'); return; }
    await ClassLogData.sync();  // yeni dönem → boş veri
    await loadData();

    _updateTermBanner();
    if (input) input.value = '';
    renderTermManager();
    renderStudents();
    renderSubjectTabs();
    renderSyncMeta();
    setSaveStatus('Yeni donem baslatildi', 'status-ok');
    document.getElementById('termManageModal').style.display = 'none';
    alert(`✅ "${label}" dönemi başlatıldı!\nMevcut veriler arşivlendi.`);
};

// Admin arşiv dönemi görüntüleme
window.switchViewingTerm = async function(termId) {
    ClassLogData.viewingTermId = (termId === 'null' || termId === undefined) ? null : termId;
    persistKioskContext();
    document.getElementById('termManageModal').style.display = 'none';
    await ClassLogData.sync();
    await loadData();
    _updateTermBanner();
    renderStudents();
    renderSubjectTabs();
    setupAdminRealtime();
};

function _updateTermBanner() {
    const banner = document.getElementById('termViewBanner');
    const label  = document.getElementById('termBannerLabel');
    if (!banner) return;
    const isArchive = ClassLogData.viewingTermId !== null &&
                      ClassLogData.viewingTermId !== ClassLogData.activeTermId;
    if (isArchive) {
        const term = (ClassLogData.terms || []).find(t => t.id === ClassLogData.viewingTermId);
        if (label) label.textContent = `📦 Arşiv: ${term?.label || 'Eski Dönem'} — Salt Okunur Mod`;
        banner.style.display = 'flex';
        document.body.classList.add('viewing-archive');
    } else {
        banner.style.display = 'none';
        document.body.classList.remove('viewing-archive');
    }
}

window.renderSubjectManager = function() {
    const container = document.getElementById('subjectListContainer');
    if (!container) return;
    container.innerHTML = SUBJECTS.map((s, idx) => `
        <div style="display:flex;align-items:center;justify-content:space-between;background:var(--a-surface);padding:10px 14px;border-radius:8px;border:1px solid var(--a-border2);">
            <div style="display:flex;align-items:center;gap:10px;">
                <div style="width:24px;height:24px;border-radius:50%;background:${s.color};display:flex;align-items:center;justify-content:center;font-size:.8rem;">${renderSubjectIcon(s)}</div>
                <strong style="color:var(--a-text);font-size:.9rem;">${_htmlEncode(s.label)}</strong>
            </div>
            <label style="font-size:.78rem;color:var(--a-muted);display:flex;align-items:center;gap:6px;cursor:pointer;" title="Veli panelinde göster/gizle">
                <input type="checkbox" onchange="toggleSubjectParentVisibility(${idx})" ${s.showInParent ? 'checked' : ''}>
                Veli Görebilir
            </label>
        </div>`).join('');
};

window.toggleSubjectParentVisibility = async function(idx) {
    SUBJECTS[idx].showInParent = !SUBJECTS[idx].showInParent;
    setSaveStatus('Ders ayari kaydediliyor...', 'status-saving', true);
    if (!await ClassLogData.saveSettings()) { setSaveStatus('Ders ayari hatali', 'status-error'); alert('Ders gorunum ayari kaydedilemedi.'); return; }
    renderSubjectManager();
    renderSyncMeta();
    setSaveStatus('Ders ayari kaydedildi', 'status-ok');
};

window.addNewSubject = async function() {
    const emojiInput = document.getElementById('newSubjEmoji');
    const labelInput = document.getElementById('newSubjLabel');
    const colorInput = document.getElementById('newSubjColor');
    const emoji = (emojiInput?.value.trim()) || '📚';
    const label = labelInput?.value.trim();
    const color = colorInput?.value || '#6366F1';
    if (!label) { alert("Ders adı boş olamaz."); return; }
    const id = label.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (SUBJECTS.find(s => s.id === id)) { alert("Bu isimde bir ders zaten var."); return; }
    SUBJECTS.push({ id, label, emoji, color, showInParent: true });
    setSaveStatus('Ders ekleniyor...', 'status-saving', true);
    if (!await ClassLogData.saveSettings()) { setSaveStatus('Ders kaydi hatali', 'status-error'); alert('Ders kaydedilemedi.'); return; }
    if (emojiInput) emojiInput.value = '';
    if (labelInput) labelInput.value = '';
    renderSubjectManager();
    renderSubjectTabs();
    renderSyncMeta();
    setSaveStatus('Ders eklendi', 'status-ok');
};

// ─── Öğretmen Kaydet / İptal ─────────────────────────────────────────────────
const saveTeacherBtn   = document.getElementById('saveTeacherBtn');
const cancelTeacherBtn = document.getElementById('cancelTeacherBtn');

function _teacherFormBack() {
    const tForm  = document.getElementById('teacherForm');
    const tList  = document.getElementById('teacherList');
    const addBtn = document.getElementById('addTeacherBtn');
    if (tForm)  tForm.style.display  = 'none';
    if (tList)  tList.style.display  = 'block';
    if (addBtn) addBtn.style.display = '';
}

if (saveTeacherBtn) saveTeacherBtn.onclick = async () => {
    const name     = document.getElementById('tName')?.value.trim();
    const username = document.getElementById('tUsername')?.value.trim();
    const password = document.getElementById('tPassword')?.value.trim();
    const role     = document.getElementById('tRole')?.value;
    const active   = document.getElementById('tActive')?.checked;
    const classes  = Array.from(document.querySelectorAll('#tClasses input:checked')).map(i=>i.value);
    const subjects = Array.from(document.querySelectorAll('#tSubjects input:checked')).map(i=>i.value);
    if (!name || !username) { alert('Ad ve kullanıcı adı zorunludur.'); return; }
    if (!_editTeacherId && !password) { alert('Yeni öğretmen için şifre zorunludur.'); return; }
    const payload = { name, username, role, active, classes, subjects };
    if (_editTeacherId) { payload.id = _editTeacherId; if (password) payload.password = password; }
    else { payload.password = password; }
    const ok = await ClassLogAuth.saveTeacher(payload);
    if (ok) { _teacherFormBack(); await refreshTeacherList(); }
    else alert('Kayıt hatası. Kullanıcı adı zaten kullanılıyor olabilir.');
};

if (cancelTeacherBtn) cancelTeacherBtn.onclick = _teacherFormBack;

window.deleteTeacher = async function(id, name) {
    if (!confirm(`"${name}" adlı öğretmeni silmek istiyor musunuz?`)) return;
    const ok = await ClassLogAuth.deleteTeacher(id);
    if (ok) await refreshTeacherList();
    else alert('Silme başarısız. Kendinizi silemezsiniz.');
};

const addTeacherBtn    = document.getElementById('addTeacherBtn');
const closeTeacherModal = document.getElementById('closeTeacherModal');
if (addTeacherBtn)     addTeacherBtn.onclick = () => editTeacher('new');
if (closeTeacherModal) closeTeacherModal.onclick = () => {
    if (teacherModal) teacherModal.style.display = 'none';
    _teacherFormBack();
};

// ─── Şifre Değiştirme ────────────────────────────────────────────────────────
const pwModal     = document.getElementById('pwModal');
const changePwBtn = document.getElementById('changePwBtn');
const closePwModal = document.getElementById('closePwModal');
const savePwBtn   = document.getElementById('savePwBtn');

if (changePwBtn) changePwBtn.onclick = () => {
    const p1 = document.getElementById('newPwInput');
    const p2 = document.getElementById('newPw2Input');
    const er = document.getElementById('pwError');
    if (p1) p1.value = '';
    if (p2) p2.value = '';
    if (er) er.textContent = '';
    if (pwModal) pwModal.style.display = 'flex';
};
if (closePwModal) closePwModal.onclick = () => { if (pwModal) pwModal.style.display = 'none'; };
if (savePwBtn) savePwBtn.onclick = async () => {
    const pw1 = document.getElementById('newPwInput')?.value.trim();
    const pw2 = document.getElementById('newPw2Input')?.value.trim();
    const err = document.getElementById('pwError');
    if (pw1.length < 8) { if (err) err.textContent = 'Şifre en az 8 karakter olmalıdır.'; return; }
    if (pw1 !== pw2)    { if (err) err.textContent = 'Şifreler eşleşmiyor.'; return; }
    const ok = await ClassLogAuth.changePassword(pw1);
    if (ok) { if (pwModal) pwModal.style.display = 'none'; alert('Şifreniz başarıyla güncellendi.'); }
    else { if (err) err.textContent = 'Şifre güncellenemedi. Oturum süresi dolmuş olabilir.'; }
};

// ─── Veli HTML İndir ─────────────────────────────────────────────────────────
const downloadParentBtn = document.getElementById('downloadParentBtn');
if (downloadParentBtn) downloadParentBtn.onclick = async function() {
    const original = this.textContent;
    this.textContent = 'Hazirlaniyor...';
    this.disabled = true;
    try {
        const token = await ClassLogData.ensureParentToken(ClassLogData.currentClass);
        if (!token) throw new Error('Veli linki olusturulamadi.');
        const url = `${window.location.origin}${window.location.pathname.replace('admin.html','parent.html')}?id=${encodeURIComponent(token)}`;
        const html = buildParentRedirectHTML(ClassLogData.currentClass, url);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
        const link = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(blob),
            download: `Veli_${ClassLogData.currentClass}.html`
        });
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        await updateParentViewHref(ClassLogData.currentClass);
    } catch (error) {
        alert('İndirme hatası: ' + error.message);
    } finally {
        this.textContent = original;
        this.disabled = false;
    }
};

function buildParentRedirectHTML(className, url) {
    return `<!DOCTYPE html>
<html lang="tr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${_htmlEncode(className)} Veli Girişi</title>
    <meta http-equiv="refresh" content="0;url=${_htmlEncode(url)}">
    <style>
        body { font-family: system-ui, sans-serif; background:#0f172a; color:#e2e8f0; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0; padding:24px; }
        .card { max-width:520px; width:100%; background:#111c35; border:1px solid rgba(148,163,184,.25); border-radius:20px; padding:28px; box-shadow:0 24px 60px rgba(0,0,0,.35); }
        h1 { margin:0 0 10px; font-size:1.35rem; }
        p { line-height:1.6; color:#cbd5e1; }
        a { color:#93c5fd; word-break:break-all; }
    </style>
</head>
<body>
    <div class="card">
        <h1>${_htmlEncode(className)} Veli Görünümü</h1>
        <p>Bu dosya güvenli canlı veli ekranına yönlendirir.</p>
        <p>Yönlendirme başlamazsa bu bağlantıyı açın:</p>
        <p><a href="${_htmlEncode(url)}">${_htmlEncode(url)}</a></p>
    </div>
</body>
</html>`;
}

let _adminBaseChannel = null;
let _adminSubjectChannel = null;
let _adminGlobalChannel = null;
let _adminLocalRealtimeCleanup = null;

function setupAdminRealtime() {
    if (_adminBaseChannel) { _supabase.removeChannel(_adminBaseChannel); _adminBaseChannel = null; }
    if (_adminSubjectChannel) { _supabase.removeChannel(_adminSubjectChannel); _adminSubjectChannel = null; }
    if (_adminGlobalChannel) { _supabase.removeChannel(_adminGlobalChannel); _adminGlobalChannel = null; }
    if (_adminLocalRealtimeCleanup) { _adminLocalRealtimeCleanup(); _adminLocalRealtimeCleanup = null; }
    _adminRealtimeFlags = { base: 'idle', subject: 'idle', global: 'idle', local: 'idle' };
    setRealtimeFlag('base', 'CONNECTING');
    setRealtimeFlag('subject', 'CONNECTING');
    setRealtimeFlag('global', 'CONNECTING');
    // Arşiv görüntülemede realtime gereksiz
    if (ClassLogData.viewingTermId !== null && ClassLogData.viewingTermId !== ClassLogData.activeTermId) {
        setBadgeState(realtimeStatusBadge, 'Canlı bağlantı: arşiv modunda kapalı', 'status-muted');
        return;
    }

    const baseId = ClassLogData._baseId();
    const subjId = ClassLogData._dbId();

    const handler = async (source = 'remote', payload = {}) => {
        if (_isApplyingLocalMark) return;
        if (payload?.clientId && payload.clientId === window.CLASSLOG_CLIENT_ID) return;
        markRealtimeEvent(source);
        const oldLen = students.length;
        await ClassLogData.sync();
        await loadData();
        const payloadDate = payload?.date || null;
        const payloadView = payload?.view || null;
        const payloadStudents = Array.isArray(payload?.students) ? payload.students : [];
        const canPatchRows =
            students.length === oldLen &&
            payloadDate &&
            payloadView === adminTab &&
            currentDateInput?.value === payloadDate &&
            payloadStudents.length > 0;

        if (students.length !== oldLen) {
            renderStudents();
            return;
        }

        if (canPatchRows) {
            payloadStudents.forEach(studentName => {
                const status = adminTab === 'homework'
                    ? (records[payloadDate]?.[studentName])
                    : (classRecords[payloadDate]?.[studentName]);
                updateCardButtons(studentName, status);
            });
            return;
        }

        students.forEach(s => {
            const date   = currentDateInput.value;
            const status = adminTab === 'homework' ? (records[date]?.[s]) : (classRecords[date]?.[s]);
            updateCardButtons(s, status);
        });
    };

    _adminBaseChannel = _supabase
        .channel(_adminSyncChannelName(baseId))
        .on('broadcast', { event: 'refresh' }, payload => handler('base', payload?.payload || {}))
        .subscribe(status => setRealtimeFlag('base', status));

    _adminSubjectChannel = _supabase
        .channel(_adminSyncChannelName(subjId))
        .on('broadcast', { event: 'refresh' }, payload => handler('subject', payload?.payload || {}))
        .subscribe(status => setRealtimeFlag('subject', status));

    _adminGlobalChannel = _supabase
        .channel(CLASSLOG_TEACHER_GLOBAL_CHANNEL)
        .on('broadcast', { event: 'refresh' }, payload => handler('global', payload?.payload || {}))
        .subscribe(status => setRealtimeFlag('global', status));

    _adminLocalRealtimeCleanup = _listenLocalRealtime(CLASSLOG_LOCAL_TEACHER_EVENT, payload => {
        if (!payload) return;
        const relevantIds = [baseId, subjId];
        const matchesId = Array.isArray(payload.ids) && payload.ids.some(id => relevantIds.includes(id));
        const matchesClass = payload.className && payload.className === ClassLogData.currentClass;
        if (!payload.settings && !matchesId && !matchesClass) return;
        setRealtimeFlag('local', 'SUBSCRIBED');
        void handler('local', payload);
    });
}

// ─── Başlatma ─────────────────────────────────────────────────────────────────
async function saveParentNoticeFromAdmin() {
    if (!parentNoticeInput) return;
    if (!ClassLogAuth.isAdmin()) {
        alert('Bu alanı yalnızca admin kullanabilir.');
        return;
    }
    const text = parentNoticeInput.value.trim();
    const duration = parentNoticeDuration?.value || '';
    _parentNoticeDraftText = text;
    _parentNoticeDraftDuration = duration;
    if (text && !duration) {
        alert('Veli uyarısı için bir süre seçin.');
        return;
    }
    const expiresAt = text ? computeParentNoticeExpiry(duration) : null;
    setSaveStatus('Veli uyarısı yayınlanıyor...', 'status-saving', true);
    const ok = await ClassLogData.saveParentNotice({
        className: ClassLogData.currentClass,
        text,
        expiresAt
    });
    if (!ok) {
        setSaveStatus('Veli uyarısı hatası', 'status-error');
        if (parentNoticeMeta) parentNoticeMeta.textContent = text
            ? 'Kaydetme başarısız oldu. SQL güncellemesini kontrol edin.'
            : 'Kaldırma başarısız oldu.';
        alert(getDataErrorMessage('Veli uyarısı kaydedilemedi.'));
        return;
    }
    _parentNoticeDraftText = null;
    _parentNoticeDraftDuration = '';
    renderParentNoticeAdminBar();
    renderSyncMeta();
    setSaveStatus(text ? 'Veli uyarısı yayında' : 'Veli uyarısı kaldırıldı', 'status-ok');
}

async function saveParentPopupFromAdmin() {
    if (!parentPopupInput) return;
    if (!ClassLogAuth.isAdmin()) {
        alert('Bu alanı yalnızca admin kullanabilir.');
        return;
    }
    const text = parentPopupInput.value.trim();
    const duration = parentPopupDuration?.value || '';
    _parentPopupDraftText = text;
    _parentPopupDraftDuration = duration;
    if (text && !duration) {
        alert('Pop-up mesajı için bir süre seçin.');
        return;
    }
    const expiresAt = text ? computeParentNoticeExpiry(duration) : null;
    setSaveStatus('Pop-up güncelleniyor...', 'status-saving', true);
    const ok = await ClassLogData.saveParentPopup({
        className: ClassLogData.currentClass,
        text,
        expiresAt
    });
    if (!ok) {
        setSaveStatus('Pop-up hatası', 'status-error');
        alert(getDataErrorMessage('Pop-up mesajı kaydedilemedi.'));
        return;
    }
    _parentPopupDraftText = null;
    _parentPopupDraftDuration = '';
    setSaveStatus(text ? 'Pop-up yayında' : 'Pop-up kapatıldı', 'status-ok');
    renderParentNoticeAdminBar();
}

async function saveParentTickerFromAdmin() {
    if (!parentTickerInput) return;
    if (!ClassLogAuth.isAdmin()) {
        alert('Bu alanı yalnızca admin kullanabilir.');
        return;
    }
    const text = parentTickerInput.value.trim();
    const duration = parentTickerDuration?.value || '';
    _parentTickerDraftText = text;
    _parentTickerDraftDuration = duration;
    if (text && !duration) {
        alert('Kayan yazı için bir süre seçin.');
        return;
    }
    const expiresAt = text ? computeParentNoticeExpiry(duration) : null;
    setSaveStatus('Kayan yazı yayınlanıyor...', 'status-saving', true);
    const ok = await ClassLogData.saveParentTicker({
        className: ClassLogData.currentClass,
        text,
        expiresAt
    });
    if (!ok) {
        setSaveStatus('Kayan yazı hatası', 'status-error');
        if (parentTickerMeta) parentTickerMeta.textContent = text
            ? 'Kaydetme başarısız oldu. SQL güncellemesini kontrol edin.'
            : 'Kaldırma başarısız oldu.';
        alert(getDataErrorMessage('Kayan yazı kaydedilemedi.'));
        return;
    }
    _parentTickerDraftText = null;
    _parentTickerDraftDuration = '';
    renderParentNoticeAdminBar();
    renderSyncMeta();
    setSaveStatus(text ? 'Kayan yazı yayında' : 'Kayan yazı kaldırıldı', 'status-ok');
}

if (parentNoticeInput) parentNoticeInput.addEventListener('input', () => { _parentNoticeDraftText = parentNoticeInput.value; });
if (parentNoticeDuration) parentNoticeDuration.addEventListener('change', () => { _parentNoticeDraftDuration = parentNoticeDuration.value; });
if (parentTickerInput) parentTickerInput.addEventListener('input', () => { _parentTickerDraftText = parentTickerInput.value; });
if (parentTickerDuration) parentTickerDuration.addEventListener('change', () => { _parentTickerDraftDuration = parentTickerDuration.value; });
if (parentPopupInput) parentPopupInput.addEventListener('input', () => { _parentPopupDraftText = parentPopupInput.value; });
if (parentPopupDuration) parentPopupDuration.addEventListener('change', () => { _parentPopupDraftDuration = parentPopupDuration.value; });
if (saveParentNoticeBtn) saveParentNoticeBtn.onclick = saveParentNoticeFromAdmin;
if (clearParentNoticeBtn) {
    clearParentNoticeBtn.onclick = async () => {
        if (parentNoticeInput) parentNoticeInput.value = '';
        if (parentNoticeDuration) parentNoticeDuration.value = '';
        await saveParentNoticeFromAdmin();
    };
}
if (saveParentTickerBtn) saveParentTickerBtn.onclick = saveParentTickerFromAdmin;
if (clearParentTickerBtn) {
    clearParentTickerBtn.onclick = async () => {
        if (parentTickerInput) parentTickerInput.value = '';
        if (parentTickerDuration) parentTickerDuration.value = '';
        await saveParentTickerFromAdmin();
    };
}
if (saveParentPopupBtn) saveParentPopupBtn.onclick = saveParentPopupFromAdmin;
if (clearParentPopupBtn) {
    clearParentPopupBtn.onclick = async () => {
        if (parentPopupInput) parentPopupInput.value = '';
        if (parentPopupDuration) parentPopupDuration.value = '';
        await saveParentPopupFromAdmin();
    };
}

async function loadData() {
    renderParentNoticeAdminBar();
    renderHomeworkDescriptionEditor();
    students     = cloneDataValue(ClassLogData.getStudents()) || [];
    records      = cloneDataValue(ClassLogData.getRecords()) || {};
    classRecords = cloneDataValue(ClassLogData.getClassRecords()) || {};
    notes        = cloneDataValue(ClassLogData.getNotes()) || {};
    renderSyncMeta();
}

async function init() {
    if (!ClassLogAuth.isKioskSession()) {
        await ClassLogData.syncSettings();
    }
    if (sessionStorage.getItem('cl_kiosk')) applyKioskContext(readKioskContext());

    const teacher = ClassLogAuth.getTeacher();
    const allowedClasses = teacher?.classes?.length
        ? ClassLogData.availableClasses.filter(c => teacher.classes.includes(c))
        : ClassLogData.availableClasses;

    if (classSelector) {
        classSelector.innerHTML = allowedClasses
            .map(c => `<option value="${c}" ${c===ClassLogData.currentClass?'selected':''}>${c}</option>`).join('');
    }

    if (!allowedClasses.includes(ClassLogData.currentClass)) {
        ClassLogData.currentClass = allowedClasses[0] || '5A';
        if (classSelector) classSelector.value = ClassLogData.currentClass;
    }
    syncClassPickerLabel();

    // Admin değilse ilk erişilebilir dersi ayarla
    if (teacher && teacher.role !== 'admin' && teacher.subjects && teacher.subjects.length > 0) {
        if (!teacher.subjects.includes(ClassLogData.currentSubject)) {
            ClassLogData.currentSubject = teacher.subjects[0];
        }
    }

    await ClassLogData.sync();
    await loadData();

    await updateParentViewHref(ClassLogData.currentClass);
    renderSubjectTabs();
    renderKioskContextInfo();
    renderParentNoticeAdminBar();
    renderMarkingInfo();
    renderStudents();
    _updateTermBanner();
    persistKioskContext();
    setupAdminRealtime();
}

// ─── Board Modu: Akıllı Tahta Bekleme Ekranı ─────────────────────────────────
let _boardControlChannel = null;

function showBoardWaitingState() {
    stopBoardCodeLoop();
    sessionStorage.removeItem('cl_board_target_code');
    const overlay = document.getElementById('loginOverlay');
    if (overlay) overlay.style.display = 'none';

    const boardScreen = document.getElementById('boardScreen');
    if (boardScreen) {
        boardScreen.style.display = 'flex';
        boardScreen.style.background = '';
    }

    const statusText = document.getElementById('boardStatusText');
    if (statusText) statusText.textContent = 'Öğretmen bekleniyor...';

    const boardAuthUrl = `${window.location.origin}${window.location.pathname}?auth_request=${CLASSLOG_BOARD_FIXED_ID}`;
    const qrImg = document.getElementById('boardScreenQr');
    if (qrImg) qrImg.src = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&margin=12&color=EEF2FF&bgcolor=0D1525&data=${encodeURIComponent(boardAuthUrl)}`;
    startBoardCodeLoop();
}

function handleBoardUnlock(payload = {}) {
    const { token, teacher, context, expiresAt, sessionKind, boardCode } = payload;
    if (!token) return;
    if (!/^\d{6}$/.test(normalizeBoardCode(boardCode))) return;
    if (normalizeBoardCode(boardCode) !== normalizeBoardCode(_boardCurrentCode)) return;

    const teacherObj = typeof teacher === 'object' ? teacher : JSON.parse(teacher || '{}');
    const safeTeacher = sessionKind === 'kiosk'
        ? {
            ...teacherObj,
            role: teacherObj?.role === 'admin' ? 'teacher' : (teacherObj?.role || 'teacher'),
            classes: context?.className ? [context.className] : (teacherObj?.classes || []),
            subjects: context?.subjectId ? [context.subjectId] : (teacherObj?.subjects || [])
        }
        : teacherObj;

    sessionStorage.setItem('cl_session', token);
    sessionStorage.setItem('cl_teacher', JSON.stringify(safeTeacher));
    sessionStorage.setItem('cl_session_kind', sessionKind || 'kiosk');
    sessionStorage.setItem('cl_board_target_code', normalizeBoardCode(boardCode));
    applyKioskContext(context);
    stopBoardCodeLoop();
    startKioskTimer({ expiresAt, context });
    renderKioskContextInfo();

    const statusText = document.getElementById('boardStatusText');
    if (statusText) {
        statusText.textContent = `${safeTeacher.name || 'Öğretmen'} bağlandı. Panel açılıyor...`;
    }

    const boardScreen = document.getElementById('boardScreen');
    if (boardScreen) {
        boardScreen.style.background = 'linear-gradient(135deg, #052e16, #064e3b)';
    }

    setTimeout(() => {
        location.replace(`${window.location.pathname}?mode=kiosk_ready`);
    }, 1600);
}

function handleBoardLock(payload = {}) {
    const incomingCode = normalizeBoardCode(payload.boardCode || '');
    const activeCode = normalizeBoardCode(sessionStorage.getItem('cl_board_target_code') || '');
    const waitingCode = normalizeBoardCode(_boardCurrentCode);
    if (incomingCode && incomingCode !== activeCode && incomingCode !== waitingCode) return;
    if (!sessionStorage.getItem('cl_kiosk') && incomingCode !== waitingCode) return;
    const statusText = document.getElementById('boardStatusText');
    if (statusText) statusText.textContent = 'Tahta kapatildi. Bekleme ekranina donuluyor...';
    void closeKioskSession();
}

function ensureBoardControlChannel() {
    if (_boardControlChannel) return _boardControlChannel;

    _boardControlChannel = _supabase.channel(CLASSLOG_BOARD_CHANNEL);
    _boardControlChannel
        .on('broadcast', { event: 'unlock' }, payload => handleBoardUnlock(payload.payload || {}))
        .on('broadcast', { event: 'lock' }, payload => handleBoardLock(payload.payload || {}))
        .subscribe();

    return _boardControlChannel;
}

function initBoardMode() {
    showBoardWaitingState();
    ensureBoardControlChannel();
}

// ─── Başlangıç ────────────────────────────────────────────────────────────────
(async () => {
    // ── Tahta modu: QR göster, auth kanalını dinle ──────────────────────────
    if (_urlMode === 'board') {
        initBoardMode();
        return;
    }

    // ── Kiosk Ready: tahta, token'ı aldı ve yönlendi ─────────────────────────
    if (_urlMode === 'kiosk_ready') {
        const overlay = document.getElementById('loginOverlay');
        if (overlay) overlay.style.display = 'none';
        if (!ClassLogAuth.isLoggedIn() || !sessionStorage.getItem('cl_kiosk')) {
            location.replace(KIOSK_REDIRECT_URL);
            return;
        }
        applyKioskContext(readKioskContext());
        updateTeacherUI();
        startKioskTimer({
            expiresAt: getStoredKioskExpiry(),
            context: readKioskContext()
        });
        await init();
        return;
    }

    // ── Auth request: telefon kamera QR tarattı ──────────────────────────────
    if (_authReqParam) {
        if (ClassLogAuth.isLoggedIn()) {
            // Zaten giriş yapılmış (aynı sekmede) → direkt gönder
            await handleRemoteAuthIfNeeded();
        } else {
            // Giriş yoksa: login ekranını göster, başarılı girişten sonra gönder
            const subtitle = document.getElementById('loginSubtitle');
            if (subtitle) subtitle.textContent = '📱 Akıllı tahtaya bağlanmak için giriş yapın';
            const hint = document.getElementById('kioskLoginHint');
            if (hint) {
                hint.style.display = 'block';
                hint.innerHTML = '🖥️ <strong>Tahta Bağlantısı</strong> — Giriş yapınca kimliğiniz tahtaya otomatik iletilecek.';
            }
            // performLogin() içinde _authReqParam'ı zaten kontrol edecek
        }
        return;
    }

    // ── Normal akış ───────────────────────────────────────────────────────────
    checkAuth();
    const ban = localStorage.getItem('classlog_ban_until');
    if (ClassLogAuth.isLoggedIn() && !(ban && Date.now() < parseInt(ban))) {
        init();
    }
})();
let renameContext=null;
function prepareStudentRename(){
 const select=document.getElementById('renameStudentSelect');select.replaceChildren();students.forEach(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;select.append(o);});
 document.getElementById('renameStudentName').value='';document.getElementById('renameStudentStatus').textContent='';
 renameContext={className:ClassLogData.currentClass,term:ClassLogData._activeTid()};
 document.getElementById('renameStudentBtn').disabled=ClassLogAuth.isKioskSession()||ClassLogData._activeTid()!==ClassLogData.activeTermId||!students.length;
}
document.getElementById('renameStudentBtn').onclick=async()=>{
 const status=document.getElementById('renameStudentStatus'),button=document.getElementById('renameStudentBtn');
 const oldName=document.getElementById('renameStudentSelect').value,newName=document.getElementById('renameStudentName').value.trim();
 if(!renameContext||renameContext.className!==ClassLogData.currentClass||renameContext.term!==ClassLogData._activeTid()){status.textContent='Sınıf veya dönem değişti. Öğrenci Yönetimi’ni yeniden açın.';return;}
 if(!newName||newName===oldName){status.textContent='Farklı bir yeni ad yazın.';return;}
 if(students.includes(newName)){status.textContent='Bu ad zaten listede var.';return;}
 if(!confirm(oldName+' → '+newName+'\nAktif dönemde tüm ders kayıtlarıyla birlikte değiştirilsin mi?'))return;
 const context={...renameContext};button.disabled=true;saveStudentsBtn.disabled=true;status.textContent='Güncelleniyor…';
 try{
 const {data,error}=await _supabase.rpc('cl_rename_student',{p_token:ClassLogAuth.getSessionToken(),p_class_name:context.className,p_term_id:context.term,p_old_name:oldName,p_new_name:newName});
 if(error||!data?.ok){status.textContent=data?.reason==='conflict'?'Yeni ad altında kayıt var. İşlem yapılmadı.':'Ad değiştirilemedi. Bağlantıyı, yetkinizi ve 29 numaralı SQL kurulumunu kontrol edin.';return;}
 let warning='';try{const key=name=>'classlog.student-number.v1:'+JSON.stringify([context.term,context.className,name]);const value=localStorage.getItem(key(oldName));if(value!==null){if(localStorage.getItem(key(newName))===null){localStorage.setItem(key(newName),value);localStorage.removeItem(key(oldName));}else warning=' Yerel öğrenci numarasını kontrol edin.';}}catch(_){warning=' Yerel öğrenci numarasını kontrol edin.';}
 status.textContent='Ad ve kayıtlar güncellendi.'+warning;
 await ClassLogData._afterWrite(data.ids||[],context.className);await resyncAdminState();bulkInput.value=students.join('\n');
 document.getElementById('renameStudentSelect').replaceChildren(...students.map(name=>{const o=document.createElement('option');o.value=name;o.textContent=name;return o;}));
 }catch(_){status.textContent='Sonuç doğrulanamadı. Tekrar denemeden önce listeyi yenileyin.';}
 finally{button.disabled=false;saveStudentsBtn.disabled=false;}
};

// Successful local saves, retained only for this tab in sessionStorage. Native popover provides outside-click and Escape dismissal.
(() => {
 const badge=saveStatusBadge,pop=document.createElement('div');pop.id='markSaveHistory';pop.setAttribute('popover','auto');pop.style.cssText='position:fixed;inset:auto;margin:0;width:min(340px,calc(100vw - 32px));padding:14px;border:1px solid #536080;border-radius:14px;background:#202b42;color:#eef2ff;font:13px "Plus Jakarta Sans",sans-serif;z-index:9999';document.body.append(pop);
 badge.tabIndex=0;badge.setAttribute('role','button');badge.setAttribute('aria-label','Son kayıt işlemleri');badge.setAttribute('aria-controls',pop.id);
 function render(){pop.replaceChildren();const title=document.createElement('strong');title.textContent='Son 5 işlem';pop.append(title);const state=ClassLogMarkQueue.state();state.history.forEach(op=>{const row=document.createElement('p');row.style.cssText='margin:10px 0 0;padding-top:10px;border-top:1px solid #35415b;line-height:1.6';row.textContent=op.student+' · '+(op.kind==='records'?'Ödev':'Ders içi')+' · '+op.change+' · '+op.time;pop.append(row);});if(state.error){const retry=document.createElement('button');retry.textContent='Tekrar dene';retry.className='tbtn';retry.onclick=()=>ClassLogMarkQueue.retry();pop.append(retry);}}
 function positionHistory(){
  if(!pop.matches(':popover-open'))return;
  const anchor=badge.closest('.admin-status-strip')||badge;
  const rect=anchor.getBoundingClientRect();
  const width=Math.min(340,rect.width,document.documentElement.clientWidth-24);
  pop.style.width=width+'px';
  pop.style.left=Math.max(12,Math.min(rect.left,document.documentElement.clientWidth-width-12))+'px';
  const top=Math.max(12,rect.bottom+8);
  if(top>=window.innerHeight-32){pop.hidePopover();return;}
  pop.style.top=top+'px';
  pop.style.maxHeight=Math.max(0,window.innerHeight-top-12)+'px';
 }
 window.addEventListener('resize',positionHistory,{passive:true});
 document.addEventListener('scroll',event=>{if(!pop.contains(event.target))positionHistory();},{passive:true,capture:true});
 function toggle(){render();pop.togglePopover();positionHistory();}badge.onclick=toggle;badge.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();toggle();}};
 pop.addEventListener('toggle',()=>badge.setAttribute('aria-expanded',String(pop.matches(':popover-open'))));
 badge.setAttribute('aria-expanded','false');
 badge.style.cursor='pointer';
 badge.setAttribute('aria-live','polite');
 pop.setAttribute('aria-label','Son kayıt işlemleri');
 pop.style.maxHeight='calc(100dvh - 100px)';
 pop.style.overflowY='auto';
 pop.style.boxSizing='border-box';
 pop.style.overflowWrap='anywhere';
 ClassLogMarkQueue.subscribe(state=>{
  const wasPending=_isApplyingLocalMark;
  clearTimeout(_saveStatusTimer);_saveStatusTimer=null;
  _isApplyingLocalMark=state.pending>0;
  setBadgeState(badge,state.error?'Kayıt hatası':state.pending?'Kaydediliyor ('+state.pending+')':'Kaydedildi',state.error?'status-error':state.pending?'status-saving':'status-ok');
  if(pop.matches(':popover-open')){render();positionHistory();}
  // Reconcile remote events deferred while local changes were pending.
  if(wasPending&&!state.pending)void resyncAdminState();
 });
})();
