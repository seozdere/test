// Shared data layer for NoTik

const SUPABASE_URL = "https://hshpppvwuuklewinvjeu.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhzaHBwcHZ3dXVrbGV3aW52amV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxODE1NTcsImV4cCI6MjA5MTc1NzU1N30.gW2UC46GwVUfDMnxceAP_vslXsNRnAuQMqcofhwqsmA";

const _supabase = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
const CLASSLOG_CLIENT_ID = (() => {
    try {
        const existing = sessionStorage.getItem('classlog_client_id');
        if (existing) return existing;
        const next = `cl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
        sessionStorage.setItem('classlog_client_id', next);
        return next;
    } catch (error) {
        return `cl_${Math.random().toString(36).slice(2, 10)}`;
    }
})();
if (typeof window !== 'undefined') window.CLASSLOG_CLIENT_ID = CLASSLOG_CLIENT_ID;

const SCHOOL_NAME = "Büyükşehir Belediyesi Gazi Mustafa Kemal Ortaokulu";
const SCHOOL_SHORT = "BBGMKO";

const SUBJECTS = [
    { id: 'turkce', label: 'Türkçe',        emoji: '📖', color: '#6366F1', showInParent: true  },
    { id: 'mat',    label: 'Matematik',     emoji: '📐', color: '#0EA5E9', showInParent: true  },
    { id: 'fen',    label: 'Fen Bilimleri', emoji: '🔬', color: '#10B981', showInParent: true  },
    { id: 'sosyal', label: 'Sosyal Bilgiler', emoji: '🌍', color: '#F59E0B', showInParent: true  },
];

const CLASSLOG_PARENT_GLOBAL_CHANNEL = 'classlog_parent_global_v33';
const CLASSLOG_TEACHER_GLOBAL_CHANNEL = 'classlog_teacher_global_v33';
const CLASSLOG_LOCAL_PARENT_EVENT = 'classlog_parent_refresh_local_v34';
const CLASSLOG_LOCAL_TEACHER_EVENT = 'classlog_teacher_refresh_local_v34';

// Sabit tahta kanalı — QR kodu hiç değişmez
const CLASSLOG_BOARD_FIXED_ID = 'CLASSLOG_BOARD_BBGMKO_V1';
const CLASSLOG_BOARD_CHANNEL  = 'board_auth_' + CLASSLOG_BOARD_FIXED_ID;

// Shared subject illustrations; persisted subject identifiers stay unchanged.
function renderSubjectIcon(subject) {
 const name=(subject.id+' '+subject.label).toLocaleLowerCase('tr-TR');
 let art='<path d="M4 6q6-3 12 0 6-3 12 0v20q-6-3-12 0-6-3-12 0Z"/><path d="M16 6v20M8 11h4m-4 5h4m8-5h4m-4 5h4"/>';
 if (/mat|geometri/.test(name)) art='<path d="M5 5h22v22H5Z"/><path d="M9 11h6m-3-3v6m7-3h4M9 20h6m5-2 4 4m0-4-4 4"/>';
 else if (/fen|kimya|bilim/.test(name)) art='<path d="M12 4h8m-6 0v9L6 25q-1 3 3 3h14q4 0 3-3l-8-12V4M10 21h12"/><circle cx="16" cy="18" r="1"/>';
 else if (/sosyal|coğraf|tarih/.test(name)) art='<circle cx="16" cy="16" r="12"/><ellipse cx="16" cy="16" rx="5" ry="12"/><path d="M4 16h24M7 9h18M7 23h18"/>';
 else if (/ingiliz|dil/.test(name)) art='<rect x="3" y="4" width="20" height="17" rx="5" fill="#DDEEF5"/><path d="m8 16 3-7 3 7m-5-2h4" fill="none"/><path d="M15 12h10a4 4 0 0 1 4 4v7a4 4 0 0 1-4 4h-2l-5 3v-3h-3a4 4 0 0 1-4-4v-7a4 4 0 0 1 4-4Z" fill="#F8E5BE"/><path d="M17 18h7m-7 4h5" fill="none"/>';
 else if (/müzik/.test(name)) art='<path d="M12 23V7l14-3v17M12 11l14-3"/><ellipse cx="8" cy="24" rx="4" ry="3"/><ellipse cx="22" cy="22" rx="4" ry="3"/>';
 else if (/beden|spor/.test(name)) art='<circle cx="16" cy="16" r="12"/><path d="m12 10 8 0 3 8-7 5-7-5Z M16 4v6m12 10-5-2M8 26l3-6M4 12l5 3"/>';
 return '<svg width="26" height="26" viewBox="0 0 32 32" style="vertical-align:middle;flex-shrink:0" aria-hidden="true" fill="#E7E1F5" stroke="#79638E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">'+art+'</svg>';
}

function _htmlEncode(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function _safeChannelId(value) {
    return encodeURIComponent(String(value)).replace(/%/g, '_');
}

function _adminSyncChannelName(id) {
    return `cl_sync_${_safeChannelId(id)}`;
}

function _parentSyncChannelName(token) {
    return `parent_sync_${_safeChannelId(token)}`;
}

const _channelCache = new Map();
const _browserChannelCache = new Map();

function _cloneData(value) {
    if (value === null || value === undefined) return value;
    if (typeof structuredClone === 'function') {
        try { return structuredClone(value); } catch (error) {}
    }
    return JSON.parse(JSON.stringify(value));
}

function getClassMarkStats(value) {
    if (value === null || value === undefined || value === '') {
        return { pos: 0, neg: 0 };
    }

    const fromNumber = typeof value === 'string' ? Number(value) : value;
    if (typeof fromNumber === 'number' && Number.isFinite(fromNumber)) {
        if (fromNumber === 1) return { pos: 1, neg: 0 };
        if (fromNumber === -1) return { pos: 0, neg: 1 };
        return { pos: 0, neg: 0 };
    }

    if (typeof value !== 'object') {
        return { pos: 0, neg: 0 };
    }

    const posRaw = Number(value.pos ?? value.plus ?? 0);
    const negRaw = Number(value.neg ?? value.minus ?? 0);
    const pos = Number.isFinite(posRaw) ? Math.max(0, Math.floor(posRaw)) : 0;
    const neg = Number.isFinite(negRaw) ? Math.max(0, Math.floor(negRaw)) : 0;
    return { pos, neg };
}

function normalizeClassMarkEntry(value) {
    const stats = getClassMarkStats(value);
    if (!stats.pos && !stats.neg) return undefined;
    return { pos: stats.pos, neg: stats.neg };
}

function getClassMarkCount(value, status) {
    const stats = getClassMarkStats(value);
    if (status === 1) return stats.pos;
    if (status === -1) return stats.neg;
    return 0;
}

function getClassMarkNet(value) {
    const stats = getClassMarkStats(value);
    return stats.pos - stats.neg;
}

function _getBrowserChannel(name) {
    if (typeof window === 'undefined' || typeof window.BroadcastChannel === 'undefined') return null;
    if (_browserChannelCache.has(name)) return _browserChannelCache.get(name);
    const channel = new BroadcastChannel(name);
    _browserChannelCache.set(name, channel);
    return channel;
}

function _emitLocalRealtime(name, payload = {}) {
    if (typeof window === 'undefined') return;
    const eventPayload = { ts: Date.now(), ...payload };
    try {
        localStorage.setItem(name, JSON.stringify(eventPayload));
        localStorage.removeItem(name);
    } catch (error) {}

    try {
        const channel = _getBrowserChannel(name);
        if (channel) channel.postMessage(eventPayload);
    } catch (error) {}
}

function _listenLocalRealtime(name, handler) {
    if (typeof window === 'undefined') return () => {};

    const onStorage = event => {
        if (event.key !== name || !event.newValue) return;
        try { handler(JSON.parse(event.newValue)); }
        catch (error) { handler({ ts: Date.now() }); }
    };

    window.addEventListener('storage', onStorage);

    const channel = _getBrowserChannel(name);
    let onMessage = null;
    if (channel) {
        onMessage = event => handler(event.data || { ts: Date.now() });
        channel.addEventListener('message', onMessage);
    }

    return () => {
        window.removeEventListener('storage', onStorage);
        if (channel && onMessage) channel.removeEventListener('message', onMessage);
    };
}

async function _getBroadcastChannel(name) {
    if (_channelCache.has(name)) return _channelCache.get(name);

    const channel = _supabase.channel(name);
    const ready = new Promise((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => {
            if (!settled) {
                settled = true;
                reject(new Error(`Broadcast subscribe timeout: ${name}`));
            }
        }, 8000);

        channel.subscribe(status => {
            if (settled) return;
            if (status === 'SUBSCRIBED') {
                settled = true;
                clearTimeout(timeout);
                resolve(channel);
            }
            if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
                settled = true;
                clearTimeout(timeout);
                reject(new Error(`Broadcast subscribe failed: ${name} (${status})`));
            }
        });
    });

    _channelCache.set(name, ready);
    return ready;
}

async function _broadcastRefresh(name, payload = {}) {
    try {
        const channel = await _getBroadcastChannel(name);
        await channel.send({
            type: 'broadcast',
            event: 'refresh',
            payload: { ts: Date.now(), ...payload }
        });
        return true;
    } catch (error) {
        console.error('Broadcast error:', name, error);
        return false;
    }
}

const ClassLogAuth = {
    async login(username, password) {
        try {
            const { data, error } = await _supabase.rpc('cl_authenticate', {
                p_username: username.trim().toLowerCase(),
                p_password: password.trim()
            });
            if (error) {
                console.error('Auth RPC error:', error);
                return { ok: false, reason: 'error' };
            }
            if (!data || !data.ok) return { ok: false, reason: data?.reason || 'wrong' };
            sessionStorage.setItem('cl_session', data.session_token);
            sessionStorage.setItem('cl_teacher', JSON.stringify(data.teacher));
            sessionStorage.setItem('cl_session_kind', data.session_kind || 'teacher');
            return { ok: true, teacher: data.teacher };
        } catch (error) {
            console.error('Login error:', error);
            return { ok: false, reason: 'error' };
        }
    },

    logout() {
        const token = this.getSessionToken();
        if (token) {
            try {
                _supabase.rpc('cl_logout', { p_token: token }).catch(() => {});
            } catch (error) {
                console.error('Logout error:', error);
            }
        }
        sessionStorage.removeItem('cl_session');
        sessionStorage.removeItem('cl_teacher');
        sessionStorage.removeItem('cl_session_kind');
        sessionStorage.removeItem('cl_kiosk');
        sessionStorage.removeItem('cl_kiosk_expires_at');
        sessionStorage.removeItem('cl_kiosk_context');
        sessionStorage.removeItem('cl_board_target_code');
    },

    getSessionToken() {
        return sessionStorage.getItem('cl_session') || null;
    },

    getTeacher() {
        try {
            return JSON.parse(sessionStorage.getItem('cl_teacher') || 'null');
        } catch {
            return null;
        }
    },

    getSessionKind() {
        return sessionStorage.getItem('cl_session_kind') || 'teacher';
    },

    isLoggedIn() {
        return !!this.getTeacher() && !!this.getSessionToken();
    },

    isKioskSession() {
        return this.getSessionKind() === 'kiosk' || sessionStorage.getItem('cl_kiosk') === '1';
    },

    isAdmin() {
        const teacher = this.getTeacher();
        return !!teacher && !this.isKioskSession() && teacher.role === 'admin';
    },

    hasFullTeacherSession() {
        return this.isLoggedIn() && !this.isKioskSession();
    },

    canAccessClass(className) {
        const teacher = this.getTeacher();
        if (!teacher) return false;
        if (teacher.role === 'admin' || !teacher.classes || teacher.classes.length === 0) return true;
        return teacher.classes.includes(className);
    },

    canAccessSubject(subjectId) {
        const teacher = this.getTeacher();
        if (!teacher) return false;
        if (teacher.role === 'admin' || !teacher.subjects || teacher.subjects.length === 0) return true;
        return teacher.subjects.includes(subjectId);
    },

    async changePassword(newPassword) {
        const { data, error } = await _supabase.rpc('cl_change_password', {
            p_token: this.getSessionToken(),
            p_new_password: newPassword.trim()
        });
        return !error && data === true;
    },

    async createKioskSession(context = {}) {
        try {
            const { data, error } = await _supabase.rpc('cl_issue_kiosk_session', {
                p_token: this.getSessionToken(),
                p_class_name: context.className || null,
                p_subject_id: context.subjectId || null,
                p_term_id: context.viewingTermId ?? context.activeTermId ?? null
            });
            if (error) {
                const rawMessage = String(error.message || error.details || error.hint || '').toLowerCase();
                console.error('createKioskSession error:', error);
                if (rawMessage.includes('cl_issue_kiosk_session') && (rawMessage.includes('could not find') || rawMessage.includes('does not exist'))) {
                    throw new Error('Supabase tahta güvenlik güncellemesi eksik. `supabase_v36_scoped_kiosk_security.sql` dosyasını uygulayın.');
                }
                throw new Error(error.message || 'Tahta oturumu oluşturulamadı.');
            }
            if (!data?.ok || !data.session_token) {
                console.error('createKioskSession error:', data);
                if (data?.reason === 'forbidden') {
                    throw new Error('Bu sınıf veya ders için tahta açma yetkiniz yok.');
                }
                if (data?.reason === 'unauthorized') {
                    throw new Error('Oturum geçersiz. Lütfen yeniden giriş yapın.');
                }
                throw new Error('Tahta oturumu oluşturulamadı.');
            }
            return {
                sessionToken: data.session_token,
                sessionKind: data.session_kind || 'kiosk',
                teacher: data.teacher || null,
                expiresAt: data.expires_at || null
            };
        } catch (error) {
            console.error('createKioskSession exception:', error);
            throw error;
        }
    },

    async listTeachers() {
        const { data, error } = await _supabase.rpc('cl_list_teachers', {
            p_token: this.getSessionToken()
        });
        if (error) {
            console.error('listTeachers error:', error);
            return [];
        }
        return data || [];
    },

    async saveTeacher(teacher) {
        const { data, error } = await _supabase.rpc('cl_save_teacher', {
            p_token: this.getSessionToken(),
            p_teacher: teacher
        });
        return !error && data === true;
    },

    async deleteTeacher(id) {
        const { data, error } = await _supabase.rpc('cl_delete_teacher', {
            p_token: this.getSessionToken(),
            p_id: parseInt(id, 10)
        });
        return !error && data === true;
    }
};

const ClassLogData = {
    students: [],
    records: {},
    classRecords: {},
    notes: {},
    parentNotice: null,
    parentTicker: null,
    parentPopup: null,
    currentClass: '5A',
    currentSubject: 'turkce',
    termString: null,
    activeTermId: null,
    viewingTermId: null,
    terms: [],
    parentToken: null,
    parentTokenCache: {},
    syncMeta: {
        source: 'idle',
        lastSyncAt: null,
        serverTs: null,
        baseUpdatedAt: null,
        subjectUpdatedAt: null
    },
    lastError: null,
    availableClasses: [
        '5A','5B','5C','5D','5E','5F','5G','5H','5I','5İ','5J',
        '6A','6B','6C','6D','6E','6F','6G','6H','6I','6İ','6J',
        '7A','7B','7C','7D','7E','7F','7G','7H','7I','7İ','7J',
        '8A','8B','8C','8D','8E','8F','8G','8H','8I','8İ','8J'
    ],

    _allowedHomeworkStatuses: new Set([1, -1, 0, 2, 3]),
    _allowedClassStatuses: new Set([1, -1]),

    _activeTid() {
        return this.viewingTermId !== null && this.viewingTermId !== undefined
            ? this.viewingTermId
            : (this.activeTermId || null);
    },

    _termPfx() {
        const termId = this._activeTid();
        return termId ? `${termId}__` : '';
    },

    _baseId(cls) {
        return this._termPfx() + (cls || this.currentClass);
    },

    _dbId(cls, subj) {
        return this._termPfx() + (cls || this.currentClass) + '_' + (subj || this.currentSubject);
    },

    getToken(className = this.currentClass) {
        return this.parentTokenCache[className] || null;
    },

    _teacherTermId() {
        return this.viewingTermId !== null && this.viewingTermId !== undefined
            ? this.viewingTermId
            : null;
    },

    _clearError() {
        this.lastError = null;
    },

    _setError(message, detail = null) {
        this.lastError = {
            message: String(message || 'Bilinmeyen hata'),
            detail: detail || null,
            at: new Date().toISOString()
        };
        return this.lastError;
    },

    getLastError() {
        return _cloneData(this.lastError);
    },

    _applySettings(settings) {
        if (!settings || typeof settings !== 'object') return;

        if (Array.isArray(settings.subjects)) {
            SUBJECTS.splice(0, SUBJECTS.length, ...settings.subjects);
            SUBJECTS.forEach(subject => {
                if (subject.showInParent === undefined || subject.showInParent === null) {
                    subject.showInParent = true;
                }
                if (subject.label === 'Fen Bilgisi') subject.label = 'Fen Bilimleri';
            });
        }

        this.termString = settings.termString || null;
        this.activeTermId = settings.activeTermId || null;
        this.terms = Array.isArray(settings.terms) ? settings.terms : [];
    },

    _normalizeStatusValue(value, kind) {
        if (value === null || value === undefined || value === '') return undefined;
        const parsed = typeof value === 'string' ? Number(value) : value;
        if (!Number.isFinite(parsed)) return undefined;
        const normalized = Number(parsed);
        const allowed = kind === 'class' ? this._allowedClassStatuses : this._allowedHomeworkStatuses;
        return allowed.has(normalized) ? normalized : undefined;
    },

    _sanitizeStatusMap(source, kind) {
        const out = {};
        for (const [date, row] of Object.entries(source || {})) {
            if (!row || typeof row !== 'object') continue;
            const cleanRow = {};
            for (const [student, value] of Object.entries(row)) {
                const normalized = kind === 'class'
                    ? normalizeClassMarkEntry(value)
                    : this._normalizeStatusValue(value, kind);
                if (normalized !== undefined) cleanRow[student] = normalized;
            }
            if (Object.keys(cleanRow).length) out[date] = cleanRow;
        }
        return out;
    },

    _sanitizeStudents(students) {
        return Array.from(new Set((students || []).map(item => String(item || '').trim()).filter(Boolean)));
    },

    _sanitizeNotes(notes) {
        const out = {};
        for (const [student, note] of Object.entries(notes || {})) {
            const cleanStudent = String(student || '').trim();
            const cleanNote = String(note || '').trim();
            if (cleanStudent && cleanNote) out[cleanStudent] = cleanNote;
        }
        return out;
    },

    _normalizeParentNotice(notice) {
        if (!notice || typeof notice !== 'object') return null;
        const text = String(notice.text || '').trim();
        if (!text) return null;
        const expiresAt = notice.expires_at || notice.expiresAt || null;
        if (expiresAt) {
            const parsed = new Date(expiresAt);
            if (Number.isNaN(parsed.getTime()) || parsed.getTime() <= Date.now()) return null;
        }
        return {
            text,
            expires_at: expiresAt || null
        };
    },

    _applySyncMeta(payload, source) {
        this.syncMeta = {
            source: source || 'unknown',
            lastSyncAt: new Date().toISOString(),
            serverTs: payload?.server_ts || null,
            baseUpdatedAt: payload?.base_updated_at || null,
            subjectUpdatedAt: payload?.subject_updated_at || null
        };
    },

    _applyViewPayload(payload) {
        this.students = this._sanitizeStudents(payload?.students || []);
        this.notes = this._sanitizeNotes(payload?.notes || {});
        this.records = this._sanitizeStatusMap(payload?.records || {}, 'homework');
        this.classRecords = this._sanitizeStatusMap(payload?.classRecords || {}, 'class');
        this.parentNotice = this._normalizeParentNotice(payload?.parent_notice || payload?.parentNotice || null);
        this.parentTicker = this._normalizeParentNotice(payload?.parent_ticker || payload?.parentTicker || null);
        this.parentPopup = this._normalizeParentNotice(payload?.parent_popup || payload?.parentPopup || null);
        if (payload?.class_name) this.currentClass = payload.class_name;
        if (payload?.settings) this._applySettings(payload.settings);
    },

    homeworkDescriptions: {},
    homeworkDescriptionContext: null,
    homeworkDescriptionsAvailable: false,

    async loadHomeworkDescriptions(parentToken = null) {
        const context = this._dbId();
        if (context !== this.homeworkDescriptionContext) {
            this.homeworkDescriptions = {};
            this.homeworkDescriptionContext = context;
        }
        try {
            const { data, error } = await _supabase.rpc(parentToken
                ? 'cl_get_parent_homework_descriptions' : 'cl_get_homework_descriptions', parentToken
                ? { p_parent_token: parentToken, p_subject_id: this.currentSubject }
                : { p_token: ClassLogAuth.getSessionToken(), p_class_name: this.currentClass,
                    p_subject_id: this.currentSubject, p_term_id: this._teacherTermId() });
            if (context !== this._dbId()) return;
            this.homeworkDescriptionsAvailable = !error && data?.ok === true;
            if (this.homeworkDescriptionsAvailable) {
                const clean = {};
                for (const [date, item] of Object.entries(data.descriptions || {})) {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && typeof item?.text === 'string') {
                        clean[date] = { text: item.text.slice(0, 1500), revision: Number(item.revision) || 0 };
                    }
                }
                this.homeworkDescriptions = clean;
            }
        } catch (_) {
            if (context === this._dbId()) this.homeworkDescriptionsAvailable = false;
        }
    },

    async saveHomeworkDescription(context, date, text, revision) {
        let result;
        try {
            const { data, error } = await _supabase.rpc('cl_save_homework_description', {
                p_token: ClassLogAuth.getSessionToken(), p_class_name: context.className,
                p_subject_id: context.subjectId, p_term_id: context.termId,
                p_date: date, p_text: text, p_expected_revision: revision
            });
            if (error || !data?.ok) return { ok: false, reason: data?.reason || 'unavailable' };
            result = data;
        } catch (_) { return { ok: false, reason: 'unavailable' }; }
        if (context.id === this._dbId()) {
            this.homeworkDescriptions[date] = { text, revision: result.revision };
        }
        // Use the same broadcasts as marks; failed delivery is covered by parent polling.
        await Promise.allSettled([
            this._notifyTeacher([context.id], { className: context.className,
                subjectId: context.subjectId, date, description: true }),
            this._notifyParents(context.className)
        ]);
        return { ok: true, revision: result.revision };
    },

    async _loadTeacherParentNotice(className = this.currentClass) {
        if (!ClassLogAuth.isAdmin()) {
            this.parentNotice = null;
            return false;
        }
        try {
            const { data, error } = await _supabase.rpc('cl_get_parent_notice', {
                p_token: ClassLogAuth.getSessionToken(),
                p_class_name: className
            });
            if (error) {
                console.error('loadTeacherParentNotice error:', error);
                return false;
            }
            if (data?.ok) {
                this.parentNotice = this._normalizeParentNotice(data.parent_notice || null);
                return true;
            }
        } catch (error) {
            console.error('loadTeacherParentNotice exception:', error);
        }
        return false;
    },

    async _loadTeacherParentTicker(className = this.currentClass) {
        if (!ClassLogAuth.isAdmin()) {
            this.parentTicker = null;
            return false;
        }
        try {
            const { data, error } = await _supabase.rpc('cl_get_parent_ticker', {
                p_token: ClassLogAuth.getSessionToken(),
                p_class_name: className
            });
            if (error) {
                console.error('loadTeacherParentTicker error:', error);
                return false;
            }
            if (data?.ok) {
                this.parentTicker = this._normalizeParentNotice(data.parent_ticker || null);
                return true;
            }
        } catch (error) {
            console.error('loadTeacherParentTicker exception:', error);
        }
        return false;
    },

    async _loadParentNoticeByToken(parentToken = this.parentToken) {
        try {
            const { data, error } = await _supabase.rpc('cl_get_parent_notice_by_token', {
                p_parent_token: parentToken
            });
            if (error) {
                console.error('loadParentNoticeByToken error:', error);
                return false;
            }
            if (data?.ok) {
                this.parentNotice = this._normalizeParentNotice(data.parent_notice || null);
                return true;
            }
        } catch (error) {
            console.error('loadParentNoticeByToken exception:', error);
        }
        return false;
    },

    async _loadParentTickerByToken(parentToken = this.parentToken) {
        try {
            const { data, error } = await _supabase.rpc('cl_get_parent_ticker_by_token', {
                p_parent_token: parentToken
            });
            if (error) {
                console.error('loadParentTickerByToken error:', error);
                return false;
            }
            if (data?.ok) {
                this.parentTicker = this._normalizeParentNotice(data.parent_ticker || null);
                return true;
            }
        } catch (error) {
            console.error('loadParentTickerByToken exception:', error);
        }
        return false;
    },

    async setClass(className) {
        this.currentClass = className;
        return this.sync();
    },

    async sync() {
        if (!ClassLogAuth.isLoggedIn()) {
            this._setError('Oturum bulunamadı. Lütfen yeniden giriş yapın.');
            return false;
        }
        try {
            const { data, error } = await _supabase.rpc('cl_get_teacher_view', {
                p_token: ClassLogAuth.getSessionToken(),
                p_class_name: this.currentClass,
                p_subject_id: this.currentSubject,
                p_term_id: this._teacherTermId()
            });
            if (error || !data?.ok) {
                console.error('Teacher sync error:', error || data);
                this._setError('Öğretmen verileri yüklenemedi.', error || data);
                return false;
            }
            this._applyViewPayload(data);
            await this._loadTeacherParentNotice(this.currentClass);
            await this._loadTeacherParentTicker(this.currentClass);
            await this.loadHomeworkDescriptions();
            this._applySyncMeta(data, 'teacher');
            this._clearError();
            return true;
        } catch (error) {
            console.error('Sync error:', error);
            this._setError('Öğretmen verileri senkronize edilemedi.', error);
            return false;
        }
    },

    async syncParent(parentToken = this.parentToken) {
        if (!parentToken) {
            this._setError('Veli baglantisi eksik.');
            return false;
        }
        try {
            const { data, error } = await _supabase.rpc('cl_get_parent_view', {
                p_parent_token: parentToken,
                p_subject_id: this.currentSubject
            });
            if (error || !data?.ok) {
                console.error('Parent sync error:', error || data);
                this._setError('Veli verileri yuklenemedi.', error || data);
                return false;
            }
            this.parentToken = parentToken;
            this._applyViewPayload(data);
            await this._loadParentNoticeByToken(parentToken);
            await this._loadParentTickerByToken(parentToken);
            await this.loadHomeworkDescriptions(parentToken);
            this._applySyncMeta(data, 'parent');
            this._clearError();
            return true;
        } catch (error) {
            console.error('Parent sync exception:', error);
            this._setError('Veli verileri senkronize edilemedi.', error);
            return false;
        }
    },

    async saveParentNotice(notice) {
        if (!ClassLogAuth.isAdmin()) return false;
        try {
            const { data, error } = await _supabase.rpc('cl_save_parent_notice', {
                p_token: ClassLogAuth.getSessionToken(),
                p_class_name: notice.className || this.currentClass,
                p_notice: {
                    text: notice.text || '',
                    expires_at: notice.expiresAt || null
                }
            });
            if (error) {
                console.error('saveParentNotice error:', error);
                this._setError('Duyuru kaydedilemedi.', error);
                return false;
            }
            if (data === true) {
                this.parentNotice = this._normalizeParentNotice({
                    text: notice.text,
                    expires_at: notice.expiresAt
                });
                await this._notifyParents(notice.className || this.currentClass);
                return true;
            }
            return false;
        } catch (error) {
            console.error('saveParentNotice exception:', error);
            this._setError('Duyuru kaydedilemedi.', error);
            return false;
        }
    },

    async saveParentTicker(ticker) {
        if (!ClassLogAuth.isAdmin()) return false;
        try {
            const { data, error } = await _supabase.rpc('cl_save_parent_ticker', {
                p_token: ClassLogAuth.getSessionToken(),
                p_class_name: ticker.className || this.currentClass,
                p_ticker: {
                    text: ticker.text || '',
                    expires_at: ticker.expiresAt || null
                }
            });
            if (error) {
                console.error('saveParentTicker error:', error);
                this._setError('Kayan yazı kaydedilemedi.', error);
                return false;
            }
            if (data === true) {
                this.parentTicker = this._normalizeParentNotice({
                    text: ticker.text,
                    expires_at: ticker.expiresAt
                });
                await this._notifyParents(ticker.className || this.currentClass);
                return true;
            }
            return false;
        } catch (error) {
            console.error('saveParentTicker exception:', error);
            this._setError('Kayan yazı kaydedilemedi.', error);
            return false;
        }
    },

    async saveParentPopup(popup) {
        if (!ClassLogAuth.isAdmin()) return false;
        try {
            const { data, error } = await _supabase.rpc('cl_save_parent_popup', {
                p_token: ClassLogAuth.getSessionToken(),
                p_class_name: popup.className || this.currentClass,
                p_popup: {
                    text: popup.text || '',
                    expires_at: popup.expiresAt || null
                }
            });
            if (error) {
                console.error('saveParentPopup error:', error);
                this._setError('Pop-up kaydedilemedi.', error);
                return false;
            }
            if (data === true) {
                this.parentPopup = this._normalizeParentNotice({
                    text: popup.text,
                    expires_at: popup.expiresAt
                });
                await this._notifyParents(popup.className || this.currentClass);
                return true;
            }
            return false;
        } catch (error) {
            console.error('saveParentPopup exception:', error);
            this._setError('Pop-up kaydedilemedi.', error);
            return false;
        }
    },

    async syncSettings() {
        if (!ClassLogAuth.isLoggedIn()) {
            this._setError('Ayarlar yuklenemedi; oturum bulunamadi.');
            return false;
        }
        try {
            const { data, error } = await _supabase.rpc('cl_get_settings', {
                p_token: ClassLogAuth.getSessionToken()
            });
            if (error || !data?.ok) {
                console.error('syncSettings error:', error || data);
                this._setError('Ayarlar yuklenemedi.', error || data);
                return false;
            }
            this._applySettings(data.settings || {});
            this._clearError();
            return true;
        } catch (error) {
            console.error('syncSettings exception:', error);
            this._setError('Ayarlar senkronize edilemedi.', error);
            return false;
        }
    },

    async ensureParentToken(className = this.currentClass, forceRefresh = false) {
        if (!forceRefresh && this.parentTokenCache[className]) {
            return this.parentTokenCache[className];
        }
        const { data, error } = await _supabase.rpc('cl_get_parent_link', {
            p_token: ClassLogAuth.getSessionToken(),
            p_class_name: className
        });
        if (error || !data?.ok || !data.parent_token) {
            console.error('ensureParentToken error:', error || data);
            this._setError('Veli linki olusturulamadi.', error || data);
            return null;
        }
        this.parentTokenCache[className] = data.parent_token;
        if (className === this.currentClass) this.parentToken = data.parent_token;
        this._clearError();
        return data.parent_token;
    },

    _clean(recs) {
        return this._sanitizeStatusMap(recs, 'homework');
    },

    async _pushBase(cls) {
        const { data, error } = await _supabase.rpc('cl_save_base', {
            p_token: ClassLogAuth.getSessionToken(),
            p_id: this._baseId(cls),
            p_students: this.students,
            p_notes: this.notes
        });
        if (error || data !== true) {
            console.error('pushBase error:', error || data);
            this._setError('Öğrenci listesi veya notlar kaydedilemedi.', error || data);
            return false;
        }
        this._clearError();
        return true;
    },

    async _pushRecords(cls, subj) {
        const id = this._dbId(cls, subj);
        const { data: existing, error: readError } = await _supabase.rpc('cl_get_teacher_view', {
            p_token: ClassLogAuth.getSessionToken(),
            p_class_name: cls || this.currentClass,
            p_subject_id: subj || this.currentSubject,
            p_term_id: this._teacherTermId()
        });
        if (readError || !existing?.ok) {
            console.error('pushRecords prefetch error:', readError || existing);
            this._setError('Kayıt öncesi mevcut ders verisi okunamadı.', readError || existing);
            return false;
        }
        const { data, error } = await _supabase.rpc('cl_save_records', {
            p_token: ClassLogAuth.getSessionToken(),
            p_id: id,
            p_records: this.records,
            p_class_records: existing.classRecords || this.classRecords
        });
        if (error || data !== true) {
            console.error('pushRecords error:', error || data);
            this._setError('Ödev kaydı kaydedilemedi.', error || data);
            return false;
        }
        this._clearError();
        return true;
    },

    async _pushClassRecords(cls, subj) {
        const id = this._dbId(cls, subj);
        const { data: existing, error: readError } = await _supabase.rpc('cl_get_teacher_view', {
            p_token: ClassLogAuth.getSessionToken(),
            p_class_name: cls || this.currentClass,
            p_subject_id: subj || this.currentSubject,
            p_term_id: this._teacherTermId()
        });
        if (readError || !existing?.ok) {
            console.error('pushClassRecords prefetch error:', readError || existing);
            this._setError('Kayıt öncesi ders içi verisi okunamadı.', readError || existing);
            return false;
        }
        const { data, error } = await _supabase.rpc('cl_save_records', {
            p_token: ClassLogAuth.getSessionToken(),
            p_id: id,
            p_records: existing.records || this.records,
            p_class_records: this.classRecords
        });
        if (error || data !== true) {
            console.error('pushClassRecords error:', error || data);
            this._setError('Ders içi kaydı kaydedilemedi.', error || data);
            return false;
        }
        this._clearError();
        return true;
    },

    async _notifyTeacher(ids, payload = {}) {
        const eventPayload = {
            clientId: CLASSLOG_CLIENT_ID,
            className: this.currentClass,
            subjectId: this.currentSubject,
            ...payload
        };
        const channels = [...new Set(ids.map(id => _adminSyncChannelName(id)).concat(CLASSLOG_TEACHER_GLOBAL_CHANNEL))];
        await Promise.all(channels.map(name => _broadcastRefresh(name, eventPayload)));
        _emitLocalRealtime(CLASSLOG_LOCAL_TEACHER_EVENT, { ids, ...eventPayload });
    },

    async _notifyParents(cls = this.currentClass) {
        const token = await this.ensureParentToken(cls);
        if (!token) return false;
        await Promise.all([
            _broadcastRefresh(_parentSyncChannelName(token), { clientId: CLASSLOG_CLIENT_ID, className: cls }),
            _broadcastRefresh(CLASSLOG_PARENT_GLOBAL_CHANNEL, { clientId: CLASSLOG_CLIENT_ID, className: cls })
        ]);
        _emitLocalRealtime(CLASSLOG_LOCAL_PARENT_EVENT, {
            clientId: CLASSLOG_CLIENT_ID,
            className: cls,
            parentToken: token,
            subjectId: this.currentSubject
        });
        return true;
    },

    async _afterWrite(ids, cls = this.currentClass, payload = {}) {
        await this._notifyTeacher(ids, payload);
        await this._notifyParents(cls);
    },

    getStudents() { return _cloneData(this.students) || []; },
    getRecords() { return _cloneData(this.records) || {}; },
    getClassRecords() { return _cloneData(this.classRecords) || {}; },
    getNotes() { return _cloneData(this.notes) || {}; },
    getSyncMeta() { return _cloneData(this.syncMeta) || {}; },

    async saveStudents(students) {
        this.students = this._sanitizeStudents(students);
        const ok = await this._pushBase();
        if (ok) await this._afterWrite([this._baseId()]);
        return ok;
    },

    async saveRecords(records, payload = {}) {
        this.records = this._sanitizeStatusMap(records, 'homework');
        const ok = await this._pushRecords();
        if (ok) await this._afterWrite([this._dbId()], this.currentClass, payload);
        return ok;
    },

    async saveClassRecords(classRecords, payload = {}) {
        this.classRecords = this._sanitizeStatusMap(classRecords, 'class');
        const ok = await this._pushClassRecords();
        if (ok) await this._afterWrite([this._dbId()], this.currentClass, payload);
        return ok;
    },

    async saveNotes(notes) {
        this.notes = this._sanitizeNotes(notes);
        const ok = await this._pushBase();
        if (ok) await this._afterWrite([this._baseId()]);
        return ok;
    },

    async saveSettings() {
        const payload = {
            subjects: SUBJECTS,
            termString: this.termString || '',
            activeTermId: this.activeTermId || null,
            terms: this.terms || []
        };
        const { data, error } = await _supabase.rpc('cl_save_settings_v2', {
            p_token: ClassLogAuth.getSessionToken(),
            p_settings: payload
        });
        if (error || data !== true) {
            console.error('saveSettings error:', error || data);
            this._setError('Sistem ayarlari kaydedilemedi.', error || data);
            return false;
        }
        await Promise.all([
            _broadcastRefresh(CLASSLOG_PARENT_GLOBAL_CHANNEL, { settings: true }),
            _broadcastRefresh(CLASSLOG_TEACHER_GLOBAL_CHANNEL, { settings: true })
        ]);
        _emitLocalRealtime(CLASSLOG_LOCAL_PARENT_EVENT, { settings: true, className: this.currentClass });
        _emitLocalRealtime(CLASSLOG_LOCAL_TEACHER_EVENT, { settings: true, className: this.currentClass });
        this._clearError();
        return true;
    },

    formatDate(dateStr) {
        const [, month, day] = dateStr.split('-');
        return `${day}/${month}`;
    },

    formatDateLong(dateStr) {
        const [, month, day] = dateStr.split('-');
        const months = ['Oca','Sub','Mar','Nis','May','Haz','Tem','Agu','Eyl','Eki','Kas','Ara'];
        return `${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]}`;
    },

    getStatusMeta(status) {
        const metas = {
            '1':  { label: '+', class: 'pos', text: 'Tamam' },
            '-1': { label: '−', class: 'neg', text: 'Eksik' },
            '0':  { label: '●', class: 'neutral', text: 'Kitap Yok' },
            '2':  { label: '●', class: 'half', text: 'Yarım' },
            '3':  { label: '●', class: 'absent', text: 'Gelmedi' }
        };
        return metas[String(status)] || { label: '', class: '', text: '' };
    },

    updateStatusDot() {},

    getAcademicTermHeader() {
        if (this.termString) return this.termString;
        const d = new Date();
        const m = d.getMonth() + 1;
        const y = d.getFullYear();
        let ac;
        let t;
        if (m >= 9) {
            ac = `${y}-${y + 1}`;
            t = '1. Donem';
        } else if (m === 1) {
            ac = `${y - 1}-${y}`;
            t = '1. Donem';
        } else {
            ac = `${y - 1}-${y}`;
            t = '2. Donem';
        }
        return `${ac} Egitim Ogretim Yili ${t}`;
    }
};
