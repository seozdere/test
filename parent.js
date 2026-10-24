// NoTik - Parent View

let students = [];
let records = {};
let classRecords = {};
let notes = {};
let currentView = 'homework';
let currentSubject = 'turkce';
let currentParentToken = null;
let parentSubjectChannel = null;
let parentGlobalChannel = null;

let leaderQuietRender = false;
let parentPollTimer = null;
let parentLocalRealtimeCleanup = null;
let parentRefreshInFlight = false;
let lastParentRefreshAt = 0;

function escQ(s) {
    return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function renderParentNoticeBar() {
    const bar = document.getElementById('parentNoticeBar');
    if (!bar) return;
    const notice = ClassLogData.parentNotice;
    if (!notice?.text) {
        bar.style.display = 'none';
        bar.innerHTML = '';
        delete bar.dataset.noticeText;
        return;
    }
    if (bar.dataset.noticeText === notice.text) {
        bar.style.display = 'flex';
        return;
    }
    bar.dataset.noticeText = notice.text;
    bar.innerHTML = `
        <div class="notice-icon-wrap">
            <span class="notice-icon-anim"><svg class="announcement-comic-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g stroke="#79638E" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4V3a2 2 0 0 1 4 0v1" fill="#F4D5A4"/><path d="M5 16c2-2 1-5 2-8a5.3 5.3 0 0 1 10 0c1 3 0 6 2 8l1 2H4Z" fill="#F7DBAB"/><path d="M10 21q2 2 4 0" fill="none"/><path d="M9 9q0-2 2-3" stroke="#FFFAED"/><path d="m3 7-1 3m19-3 1 3" stroke="#AD97C6"/></g></svg></span>
        </div>
        <span class="notice-text-anim">${_htmlEncode(notice.text)}</span>
    `;
    bar.style.display = 'flex';
}

let parentTickerResizeObserver = null;
function sizeParentTicker() {
    const bar = document.getElementById('parentTickerBar');
    const track = bar?.querySelector('.parent-ticker-track');
    const runner = bar?.querySelector('.parent-ticker-runner');
    if (!track || !runner || !track.clientWidth) return;
    const distance = runner.firstElementChild.getBoundingClientRect().width;
    if (!distance) return;
    const copies = Math.max(2, Math.ceil(track.clientWidth / distance) + 1);
    while (runner.children.length < copies) {
        const copy = runner.firstElementChild.cloneNode(true);
        copy.setAttribute('aria-hidden', 'true');
        runner.appendChild(copy);
    }
    while (runner.children.length > copies) runner.lastElementChild.remove();
    runner.style.setProperty('--ticker-distance', `${distance}px`);
    runner.style.setProperty('--ticker-duration', `${Math.max(8, distance / 32)}s`);
}

function renderParentTickerBar() {
    const bar = document.getElementById('parentTickerBar');
    if (!bar) return;
    const ticker = ClassLogData.parentTicker;
    if (!ticker?.text) {
        parentTickerResizeObserver?.disconnect();
        parentTickerResizeObserver = null;
        bar.style.display = 'none';
        bar.innerHTML = '';
        delete bar.dataset.text;
        return;
    }
    bar.style.display = 'flex';
    // Preserve the animated element across polling, broadcasts and view switches.
    if (bar.dataset.text === ticker.text && bar.querySelector('.parent-ticker-runner')) return;
    parentTickerResizeObserver?.disconnect();
    bar.dataset.text = ticker.text;
    bar.innerHTML = `
        <span class="parent-ticker-icon"><svg class="announcement-comic-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><g stroke="#E9D6A8" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 4V3a2 2 0 0 1 4 0v1" fill="#FFE9B9"/><path d="M5 16c2-2 1-5 2-8a5.3 5.3 0 0 1 10 0c1 3 0 6 2 8l1 2H4Z" fill="#FFF5DC"/><path d="M10 21q2 2 4 0" fill="none"/><path d="M9 9q0-2 2-3" stroke="#FFFFFF"/><path d="m3 7-1 3m19-3 1 3" stroke="#FFF5DC"/></g></svg></span>
        <span class="parent-ticker-track" tabindex="0" aria-label="Duyuru">
            <span class="parent-ticker-runner">
                <span class="parent-ticker-text">${_htmlEncode(ticker.text)}</span>
                <span class="parent-ticker-text" aria-hidden="true">${_htmlEncode(ticker.text)}</span>
            </span>
        </span>
    `;
    sizeParentTicker();
    if (typeof ResizeObserver !== 'undefined') {
        parentTickerResizeObserver = new ResizeObserver(sizeParentTicker);
        parentTickerResizeObserver.observe(bar.querySelector('.parent-ticker-track'));
        parentTickerResizeObserver.observe(bar.querySelector('.parent-ticker-text'));
    }
}

let lastPopupShown = null;
function renderCriticalPopup() {
    const modal = document.getElementById('criticalPopup');
    const content = document.getElementById('criticalPopupContent');
    if (!modal || !content) return;
    const popup = ClassLogData.parentPopup;
    if (!popup?.text) {
        modal.style.display = 'none';
        return;
    }
    if (lastPopupShown === popup.text) return;
    content.textContent = popup.text;
    modal.style.display = 'flex';
    lastPopupShown = popup.text;
}

async function syncParentState() {
    const ok = await ClassLogData.syncParent(currentParentToken);
    if (!ok) return false;
    const visibleSubjects = SUBJECTS.filter(subject => subject.showInParent);
    const selected = visibleSubjects.find(subject => subject.id === currentSubject) || visibleSubjects[0];
    if (selected && selected.id !== currentSubject) {
        currentSubject = selected.id;
        ClassLogData.currentSubject = currentSubject;
        if (!await ClassLogData.syncParent(currentParentToken)) return false;
    }
    if (!selected) {
        students = []; records = {}; classRecords = {}; notes = {};
        return true;
    }
    students = ClassLogData.getStudents();
    records = ClassLogData.getRecords();
    classRecords = ClassLogData.getClassRecords();
    notes = ClassLogData.getNotes();
    return true;
}

let parentLastStateHash = '';
let parentRefreshPending=false,parentEventTimer=null;
const parentChannelHealth={subject:false,global:false};
function queueParentRefresh(){clearTimeout(parentEventTimer);parentEventTimer=setTimeout(()=>{if(!document.hidden)void refreshParentView(true);else parentRefreshPending=true;},100);}
function scheduleParentPoll(){
 clearTimeout(parentPollTimer);parentPollTimer=null;
 if(document.hidden)return;
 parentPollTimer=setTimeout(async()=>{await refreshParentView();scheduleParentPoll();},Object.values(parentChannelHealth).every(Boolean)?30000:3000);
}
function parentChannelStatus(key,status){parentChannelHealth[key]=status==='SUBSCRIBED';scheduleParentPoll();if(status==='SUBSCRIBED')queueParentRefresh();}


async function refreshParentView(force = false) {
    const now = Date.now();
    if (parentRefreshInFlight) { parentRefreshPending=true; return false; }
    if (!force && now - lastParentRefreshAt < 1200) return false;

    parentRefreshInFlight = true;
    try {
        const ok = await syncParentState();
        if (!ok) {
            window.ParentRecovery?.fail();
            return false;
        }
        window.ParentRecovery?.ready();
        lastParentRefreshAt = Date.now();
        const currentStateHash = JSON.stringify({
            students,
            records,
            homeworkDescriptions: ClassLogData.homeworkDescriptions,
            homeworkDescriptionsAvailable: ClassLogData.homeworkDescriptionsAvailable,
            classRecords,
            notes,
            currentSubject,
            subjects: SUBJECTS,
            currentView,
            parentNotice: ClassLogData.parentNotice,
            parentTicker: ClassLogData.parentTicker,
            parentPopup: ClassLogData.parentPopup
        });
        if (!force && currentStateHash === parentLastStateHash) {
            return true;
        }
        parentLastStateHash = currentStateHash;
        renderSubjectTabs();
        updateBranding();
        renderCurrentView();
        if (summaryDialog.open && summaryStudent) {
            if (students.includes(summaryStudent)) renderStudentSummaryCard(summaryStudent);
            else closeStudentSummary();
        }
        renderParentNoticeBar();
        renderParentTickerBar();
        renderCriticalPopup();
        return true;
    } catch (error) {
        window.ParentRecovery?.fail();
        return false;
    } finally {
        parentRefreshInFlight = false;
        if(parentRefreshPending&&!document.hidden){parentRefreshPending=false;queueParentRefresh();}
    }
}

function renderSubjectTabs() {
    const container = document.getElementById('subjectTabsParent');
    if (!container) return;

    const parentSubjects = SUBJECTS.filter(subject => subject.showInParent);
    if (!parentSubjects.find(subject => subject.id === currentSubject) && parentSubjects.length > 0) {
        currentSubject = parentSubjects[0].id;
        ClassLogData.currentSubject = currentSubject;
    }

    container.innerHTML = parentSubjects.map(subject => `
        <button class="subject-tab-parent ${subject.id === currentSubject ? 'active' : ''}"
                style="--tab-color:${subject.color}"
                onclick="switchSubjectParent('${subject.id}')">
            ${renderSubjectIcon(subject)} ${subject.label}
        </button>
    `).join('');
}

window.switchSubjectParent = async function(subjectId) {
    if (!SUBJECTS.some(subject => subject.id === subjectId && subject.showInParent)) return;
    if (currentSubject === subjectId) {
        switchView('homework');
        return;
    }
    hideHomeworkTooltip();
    currentSubject = subjectId;
    ClassLogData.currentSubject = subjectId;
    renderSubjectTabs();
    await refreshParentView(true);
    switchView('homework');
};

function updateBranding() {
    const classBranding = document.getElementById('classBranding');
    const termBranding = document.getElementById('termBranding');
    const subject = SUBJECTS.find(item => item.id === currentSubject) || SUBJECTS[0];
    const upperSubject = subject.label.toLocaleUpperCase('tr-TR');

    if (termBranding) termBranding.textContent = ClassLogData.getAcademicTermHeader();
    if (!classBranding) return;

    if (currentView === 'homework') {
        classBranding.textContent = `${ClassLogData.currentClass} SINIFI - ${upperSubject} ÖDEV TAKİP ÇİZELGESİ`;
    } else if (currentView === 'class') {
        classBranding.textContent = `${ClassLogData.currentClass} SINIFI - ${upperSubject} DERSE KATILIM`;
    } else if (currentView === 'tools') {
        classBranding.textContent = `${ClassLogData.currentClass} SINIFI - ARAÇLAR`;
    } else {
        classBranding.textContent = `${ClassLogData.currentClass} SINIFI - LİDERLİK TABLOSU`;
    }
}

function renderCurrentView() {
    if (currentView === 'homework') renderExcel();
    else if (currentView === 'class') renderClassView();
    else if (currentView === 'leader') renderLeader();
}

window.switchView = function(view) {
    const previousScroll = window.ParentHeader?.beforeSwitch(currentView);
    hideHomeworkTooltip();
    currentView = view;
    document.getElementById('toolsPanel').hidden = view !== 'tools';
    document.body.classList.toggle('tools-view-active', view === 'tools');
    document.getElementById('btnTools').setAttribute('aria-pressed', String(view === 'tools'));
    document.querySelector('.excel-footer').hidden = view === 'tools';
    const homeworkView = document.getElementById('homeworkView');
    const classView = document.getElementById('classView');
    const leaderPanel = document.getElementById('leaderPanel');
    const btnHomework = document.getElementById('btnHomework');
    const btnClass = document.getElementById('btnClass');
    const btnLeader = document.getElementById('btnLeader');
    const legend = document.getElementById('mainLegend');

    [btnHomework, btnClass, btnLeader].forEach(button => button && button.classList.remove('active'));
    if (homeworkView) homeworkView.style.display = 'none';
    if (classView) classView.style.display = 'none';
    if (leaderPanel) leaderPanel.style.display = 'none';

    if (view === 'homework') {
        if (homeworkView) homeworkView.style.display = '';
        if (btnHomework) btnHomework.classList.add('active');
        if (legend) legend.style.display = '';
    } else if (view === 'class') {
        if (classView) classView.style.display = '';
        if (btnClass) btnClass.classList.add('active');
        if (legend) legend.style.display = 'none';
    } else if (view === 'tools') {
        if (legend) legend.style.display = 'none';
    } else {
        if (leaderPanel) leaderPanel.style.display = 'flex';
        if (btnLeader) btnLeader.classList.add('active');
        if (legend) legend.style.display = 'none';
    }

    requestAnimationFrame(positionLatestHomeworkMarker);
    updateBranding();
    renderCurrentView();
    renderParentNoticeBar();
    renderParentTickerBar();
    window.ParentHeader?.afterSwitch(view, previousScroll);
};

window.toggleLeader = function() {
    switchView(currentView === 'leader' ? 'homework' : 'leader');
};

let homeworkDateLayoutFrame = null;
function scheduleHomeworkDateLayout() {
    if (homeworkDateLayoutFrame !== null) cancelAnimationFrame(homeworkDateLayoutFrame);
    homeworkDateLayoutFrame = requestAnimationFrame(() => {
        homeworkDateLayoutFrame = null;
        updateHomeworkDateLayout();
    });
}

function updateHomeworkDateLayout() {
    const wrapper = document.getElementById('homeworkView');
    const table = document.getElementById('excelTable');
    if (!wrapper.clientWidth || !wrapper.getClientRects().length) return;
    const headers = [...table.querySelectorAll('th.date-header')];
    if (!headers.length) {
        table.classList.remove('dates-vertical');
        table.style.removeProperty('--homework-table-width');
        return;
    }
    const context = document.createElement('canvas').getContext('2d');
    if (!context) return;
    const measureText = element => {
        const style = getComputedStyle(element);
        context.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
        const text = element.textContent.trim();
        return context.measureText(text).width + Math.max(0, text.length - 1) * (parseFloat(style.letterSpacing) || 0);
    };
    const horizontalPadding = element => {
        const style = getComputedStyle(element);
        return (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
            + (parseFloat(style.borderLeftWidth) || 0) + (parseFloat(style.borderRightWidth) || 0);
    };
    const nameHeader = table.querySelector('.student-header');
    let nameWidth = Math.max(200, measureText(nameHeader) + horizontalPadding(nameHeader) + 160);
    table.querySelectorAll('td.student-name').forEach(cell => {
        const note = cell.querySelector('.note-indicator');
        nameWidth = Math.max(nameWidth, measureText(cell.querySelector('strong')) + horizontalPadding(cell)
            + (note ? note.offsetWidth + 8 : 0));
    });
    const datesWidth = headers.reduce((total, header) => {
        const heading = header.querySelector('.homework-date-heading');
        const gap = parseFloat(getComputedStyle(heading).columnGap) || 0;
        return total + Math.max(88, Math.ceil(measureText(header.querySelector('.date-label'))
            + header.querySelector('.homework-info-btn').offsetWidth + gap + horizontalPadding(header)));
    }, 0);
    // Measure natural horizontal content, not the current (possibly rotated) table width.
    const compactStrip = document.getElementById('mainDashboard').classList.contains('header-wide-touch');
    if (compactStrip) nameWidth = Math.max(300, Math.min(nameWidth, 320));
    const vertical = !compactStrip && nameWidth + datesWidth + 8 > wrapper.clientWidth;
    // Fixed layout keeps dates compact; only the name column receives spare space.
    const columnWidth = compactStrip ? 76 : vertical ? 44 : Math.max(88, Math.ceil(datesWidth / headers.length));
    table.style.setProperty('--homework-date-width', `${columnWidth}px`);
    table.style.setProperty('--homework-table-width', `${Math.max(wrapper.clientWidth, Math.ceil(nameWidth) + columnWidth * headers.length + 8)}px`);
    if (table.classList.contains('dates-vertical') !== vertical) {
        hideHomeworkTooltip();
        table.classList.toggle('dates-vertical', vertical);
    }
}

let parentStudentQuery = '';
function parentStudentHeading() {
    return `<div class="parent-student-heading"><span>Öğrenciler</span><label class="parent-search-shell">
        <svg class="comic-search" viewBox="0 0 32 32" aria-hidden="true" focusable="false"><path d="m20 20 8 8" stroke="#675080" stroke-width="7" stroke-linecap="round"/><path d="m21 21 7 7" stroke="#F7C49E" stroke-width="4" stroke-linecap="round"/><circle cx="13" cy="13" r="10" fill="#DCDFFA" stroke="#675080" stroke-width="1.8"/><circle cx="13" cy="13" r="7" fill="#EAF5FC" stroke="#A99ACB" stroke-width="1.2"/><path d="M8 12q0-4 4-4" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg>
        <input class="parent-student-search" type="search" placeholder="Öğrenci ara" aria-label="Öğrenci adına göre ara" autocomplete="off"></label></div>`;
}
function setParentTableHeader(table, html) {
    const active = document.activeElement;
    const editing = table.contains(active) && active.classList.contains('parent-student-search');
    table.querySelector('thead').innerHTML = html;
    const input = table.querySelector('.parent-student-search');
    if (input) { input.value = parentStudentQuery; if (editing) input.focus({ preventScroll:true }); }
}
function filterParentStudents() {
    const normalize = value => value.toLocaleLowerCase('tr').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').trim();
    const terms = normalize(parentStudentQuery).split(/\s+/).filter(Boolean);
    document.querySelectorAll('#excelTable tbody tr, #classTable tbody tr').forEach(row => {
        const name = row.querySelector('.student-name strong');
        if (name) row.hidden = !terms.every(term => normalize(name.textContent).includes(term));
    });
}
document.addEventListener('input', event => {
    if (!event.target.matches('.parent-student-search')) return;
    parentStudentQuery = event.target.value;
    document.querySelectorAll('.parent-student-search').forEach(input => { if (input !== event.target) input.value = parentStudentQuery; });
    filterParentStudents();
});

function renderExcel() {
    const table = document.getElementById('excelTable');
    if (!table) return;
    const dates = [...new Set([...Object.keys(records),
        ...Object.keys(ClassLogData.homeworkDescriptions).filter(date => ClassLogData.homeworkDescriptions[date].text)
    ])].sort().reverse();

    let headerHTML = '<tr><th class="sticky-col sticky-header student-header">' + parentStudentHeading() + '</th>';
    dates.forEach((date, index) => {
        headerHTML += `<th class="sticky-header date-header"><div class="homework-date-heading"><span class="date-label">${ClassLogData.formatDate(date)}</span><button type="button" class="homework-info-btn" data-homework-date="${date}" aria-label="${ClassLogData.formatDate(date)} tarihli ödev açıklaması" aria-controls="homeworkTooltip" aria-expanded="false"><svg class="comic-question" style="animation-delay:${[0, 170, 390, 110, 310, 520, 240][index % 7]}ms" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><path d="M14 3C8 3 3 7 3 13c0 4 2 7 5 9l-1 3 5-2c7 1 13-3 13-10C25 7 20 3 14 3Z" fill="#DCDFFA" stroke="#8877B3" stroke-width="1.5" stroke-linejoin="round"/><path d="M6 10q1-5 6-5" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round"/><path d="M10.5 10c0-4 8-4 8 0 0 3-4.5 2.5-4.5 6" fill="none" stroke="#675080" stroke-width="2.5" stroke-linecap="round"/><circle cx="14" cy="20" r="1.4" fill="#675080"/></svg></button></div></th>`;
    });
    headerHTML += '</tr>';
    setParentTableHeader(table, headerHTML);
    scheduleHomeworkDateLayout();
    requestAnimationFrame(positionLatestHomeworkMarker);

    if (!students.length) {
        table.querySelector('tbody').innerHTML = '<tr><td colspan="99" style="text-align:center;padding:60px;color:var(--p-muted);">Öğrenci listesi henüz oluşturulmamış.</td></tr>';
        return;
    }

    let bodyHTML = '';
    students.forEach(student => {
        const hasNote = notes[student];
        bodyHTML += `<tr>
            <td class="sticky-col student-name" tabindex="0" role="button" aria-haspopup="dialog" onclick="showStudentSummary('${escQ(student)}')" style="cursor:pointer;">
                <strong>${_htmlEncode(student)}</strong>${hasNote
                    ? `<span class="note-indicator" onclick="event.stopPropagation();showNote('${escQ(student)}')">📝</span>`
                    : ''}
            </td>`;
        dates.forEach(date => {
            const status = records[date] ? records[date][student] : undefined;
            const meta = ClassLogData.getStatusMeta(status);
            let cellClass = 'cell-empty';
            let dot = '';
            if (status !== undefined) {
                dot = `<span class="hw-text-mark" style="font-weight:900;font-size:1.15rem;color:var(--s-${meta.class})">${meta.label}</span>`;
                cellClass = `cell-active cell-${meta.class}`;
            }
            const statusName = ({'1':'Tamam', '-1':'Eksik', '2':'Yarım', '0':'Kitap yok', '3':'Gelmedi'})[status] || 'Henüz işaretlenmedi';
            bodyHTML += `<td class="${cellClass}" data-homework-status="${statusName}" tabindex="0" role="button" aria-label="${statusName}">${dot}</td>`;
        });
        bodyHTML += '</tr>';
    });
    table.querySelector('tbody').innerHTML = bodyHTML;
    filterParentStudents();
    if (homeworkTooltipDate) {
        const anchor = table.querySelector(`[data-homework-date="${homeworkTooltipDate}"]`);
        if (anchor) showHomeworkTooltip(anchor);
        else hideHomeworkTooltip();
    }
}

let homeworkTooltipDate = null;
let homeworkTooltipPinned = false;
let homeworkTooltipTimer;
const homeworkTooltip = document.getElementById('homeworkTooltip');
function hideHomeworkTooltip() {
    clearTimeout(homeworkTooltipTimer);
    homeworkTooltip.hidden = true;
    homeworkTooltipDate = null;
    homeworkTooltipPinned = false;
    document.querySelectorAll('.homework-info-btn[aria-expanded="true"]').forEach(button => button.setAttribute('aria-expanded', 'false'));
}
function showHomeworkTooltip(button) {
    clearTimeout(homeworkTooltipTimer);
    homeworkTooltipDate = button.dataset.homeworkDate;
    document.querySelectorAll('.homework-info-btn[aria-expanded="true"]').forEach(item => item.setAttribute('aria-expanded', 'false'));
    button.setAttribute('aria-expanded', 'true');
    document.getElementById('homeworkTooltipTitle').textContent = `${ClassLogData.formatDateLong(homeworkTooltipDate)} · Ödev`;
    document.getElementById('homeworkTooltipText').textContent = !ClassLogData.homeworkDescriptionsAvailable
        ? 'Ödev açıklaması şu anda yüklenemiyor.'
        : ClassLogData.homeworkDescriptions[homeworkTooltipDate]?.text || 'Bu tarih için henüz ödev açıklaması eklenmedi.';
    homeworkTooltip.hidden = false;
    const rect = button.getBoundingClientRect();
    const width = homeworkTooltip.offsetWidth;
    const height = homeworkTooltip.offsetHeight;
    homeworkTooltip.style.left = `${Math.max(12, Math.min(rect.left + rect.width / 2 - width / 2, window.innerWidth - width - 12))}px`;
    homeworkTooltip.style.top = `${Math.max(12, Math.min(rect.bottom + 10, window.innerHeight - height - 12))}px`;
}
function scheduleHomeworkTooltipClose() {
    if (homeworkTooltipPinned) return;
    clearTimeout(homeworkTooltipTimer);
    homeworkTooltipTimer = setTimeout(hideHomeworkTooltip, 180);
}
const homeworkTable = document.getElementById('excelTable');
// One shared status bubble; no per-cell listeners or scroll positioning work.
const statusBubble = document.createElement('div');
statusBubble.className = 'homework-status-bubble';
statusBubble.id = 'homeworkStatusBubble';
statusBubble.setAttribute('role', 'status');
statusBubble.hidden = true;
document.body.append(statusBubble);
let statusAnchor = null;
let statusBubbleTimer;
function hideStatusBubble() {
    clearTimeout(statusBubbleTimer);
    statusBubble.hidden = true;
    statusAnchor?.removeAttribute('aria-describedby');
    statusAnchor = null;
}
function showStatusBubble(cell) {
    if (statusAnchor === cell) { hideStatusBubble(); return; }
    hideStatusBubble();
    hideHomeworkTooltip();
    statusAnchor = cell;
    statusBubbleTimer = setTimeout(hideStatusBubble, 2000);
    statusBubble.textContent = cell.dataset.homeworkStatus;
    statusBubble.hidden = false;
    cell.setAttribute('aria-describedby', statusBubble.id);
    const rect = cell.getBoundingClientRect();
    const width = statusBubble.offsetWidth, height = statusBubble.offsetHeight;
    const top = rect.top > height + 12 ? rect.top - height - 7 : rect.bottom + 7;
    statusBubble.style.left = `${Math.max(8, Math.min(rect.left + rect.width / 2 - width / 2, innerWidth - width - 8))}px`;
    statusBubble.style.top = `${Math.max(8, Math.min(top, innerHeight - height - 8))}px`;
}
homeworkTable.addEventListener('click', event => {
    const cell = event.target.closest('[data-homework-status]');
    if (cell) showStatusBubble(cell);
});
homeworkTable.addEventListener('keydown', event => {
    const cell = event.target.closest('[data-homework-status]');
    if (cell && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault(); showStatusBubble(cell);
    }
});
document.addEventListener('click', event => {
    if (!event.target.closest('[data-homework-status]')) hideStatusBubble();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideStatusBubble(); });
document.getElementById('homeworkView').addEventListener('scroll', hideStatusBubble, {passive:true});
window.addEventListener('resize', hideStatusBubble);

homeworkTable.addEventListener('mouseover', event => {
    const button = event.target.closest('.homework-info-btn');
    if (button && !homeworkTooltipPinned) showHomeworkTooltip(button);
});
homeworkTable.addEventListener('mouseout', event => {
    if (event.target.closest('.homework-info-btn')) scheduleHomeworkTooltipClose();
});
homeworkTable.addEventListener('focusin', event => {
    if (event.target.matches('.homework-info-btn')) showHomeworkTooltip(event.target);
});
homeworkTable.addEventListener('focusout', event => {
    if (event.target.matches('.homework-info-btn') && !homeworkTooltip.contains(event.relatedTarget)) scheduleHomeworkTooltipClose();
});
homeworkTable.addEventListener('click', event => {
    const button = event.target.closest('.homework-info-btn');
    if (!button) return;
    if (homeworkTooltipPinned && homeworkTooltipDate === button.dataset.homeworkDate) hideHomeworkTooltip();
    else { homeworkTooltipPinned = true; showHomeworkTooltip(button); }
});
homeworkTooltip.addEventListener('mouseenter', () => clearTimeout(homeworkTooltipTimer));
homeworkTooltip.addEventListener('mouseleave', scheduleHomeworkTooltipClose);
document.getElementById('closeHomeworkTooltip').addEventListener('click', hideHomeworkTooltip);
document.addEventListener('click', event => {
    if (!event.target.closest('.homework-info-btn') && !homeworkTooltip.contains(event.target)) hideHomeworkTooltip();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideHomeworkTooltip(); });
document.getElementById('homeworkView').addEventListener('scroll', hideHomeworkTooltip);
window.addEventListener('resize', hideHomeworkTooltip);
window.addEventListener('resize', scheduleHomeworkDateLayout);
if (typeof ResizeObserver !== 'undefined') {
    const homeworkDateObserver = new ResizeObserver(scheduleHomeworkDateLayout);
    homeworkDateObserver.observe(document.getElementById('homeworkView'));
}
document.fonts?.ready.then(scheduleHomeworkDateLayout);

function renderClassView() {
    const table = document.getElementById('classTable');
    if (!table) return;

    const dates = Object.keys(classRecords).sort().reverse().filter(date =>
        Object.values(classRecords[date] || {}).some(value => {
            const stats = getClassMarkStats(value);
            return stats.pos > 0 || stats.neg > 0;
        })
    );
    const activeStudents = students.filter(student =>
        dates.some(date => {
            const stats = getClassMarkStats(classRecords[date]?.[student]);
            return stats.pos > 0 || stats.neg > 0;
        })
    );

    if (!dates.length || !activeStudents.length) {
        table.querySelector('thead').innerHTML = '';
        table.querySelector('tbody').innerHTML = '<tr><td colspan="2" style="text-align:center;padding:60px 20px;color:var(--p-muted);">Henüz ders içi kaydı bulunmuyor.</td></tr>';
        return;
    }

    let headerHTML = '<tr><th class="sticky-col sticky-header student-header">' + parentStudentHeading() + '</th>';
    dates.forEach(date => {
        const [, month, day] = date.split('-');
        const months = ['Oca','Şub','Mar','Nis','May','Haz','Tem','Ağu','Eyl','Eki','Kas','Ara'];
        headerHTML += `<th class="sticky-header class-date-header"><span style="font-size:.75rem;opacity:.8;">${parseInt(day, 10)} ${months[parseInt(month, 10) - 1]}</span></th>`;
    });
    headerHTML += '<th class="sticky-header total-header">Toplam</th></tr>';
    setParentTableHeader(table, headerHTML);

    let bodyHTML = '';
    activeStudents.forEach(student => {
        const hasNote = notes[student];
        let posCount = 0;
        let negCount = 0;
        let cells = '';

        dates.forEach(date => {
            const stats = getClassMarkStats(classRecords[date]?.[student]);
            posCount += stats.pos;
            negCount += stats.neg;

            if (stats.pos > 0 || stats.neg > 0) {
                const cellClass = stats.pos > 0 && stats.neg > 0
                    ? 'cell-active'
                    : stats.pos > 0 ? 'cell-pos' : 'cell-neg';
                let marks = '';
                if (stats.pos > 0) {
                    marks += `<span class="class-mark pos-mark">+${stats.pos}</span>`;
                }
                if (stats.neg > 0) {
                    marks += `<span class="class-mark neg-mark">${stats.pos > 0 ? ' ' : ''}−${stats.neg}</span>`;
                }
                cells += `<td class="${cellClass} class-cell">${marks}</td>`;
            } else {
                cells += '<td class="class-cell class-cell-empty"></td>';
            }
        });

        let totalBadge = '<span style="color:#94a3b8">-</span>';
        if (posCount > 0 || negCount > 0) {
            totalBadge = '<div style="display:flex;gap:6px;align-items:center;justify-content:center;font-size:0.85rem">';
            if (posCount > 0) totalBadge += `<span style="color:#16a34a;font-weight:800">+${posCount}</span>`;
            if (posCount > 0 && negCount > 0) totalBadge += '<span style="color:#cbd5e1;font-size:0.7rem">|</span>';
            if (negCount > 0) totalBadge += `<span style="color:#dc2626;font-weight:800">−${negCount}</span>`;
            totalBadge += '</div>';
        }

        cells += `<td class="class-cell total-cell"><span class="total-badge" style="background:#f8fafc;border:1px solid #e2e8f0;padding:2px 8px;width:fit-content;margin:0 auto;height:auto">${totalBadge}</span></td>`;
        bodyHTML += `<tr>
            <td class="sticky-col student-name" tabindex="0" role="button" aria-haspopup="dialog" onclick="showStudentSummaryClass('${escQ(student)}')" style="cursor:pointer;">
                <strong>${_htmlEncode(student)}</strong>${hasNote
                    ? `<span class="note-indicator" onclick="event.stopPropagation();showNote('${escQ(student)}')">📝</span>`
                    : ''}
            </td>${cells}</tr>`;
    });

    table.querySelector('tbody').innerHTML = bodyHTML;
    filterParentStudents();
}

function renderLeaderMedal(rank) {
    const colors = [
        ['#F4CC73', '#FFF4CA', '#A97824', '#B8ADF0'],
        ['#C8D5E7', '#F4F8FF', '#657B9A', '#A6CDB8'],
        ['#D99870', '#FFE0BE', '#8E5335', '#D7A8C4']
    ][rank - 1];
    const [fill, light, outline, ribbon] = colors;
    return `<svg class="comic-medal" viewBox="0 0 40 48" role="img" aria-label="${['Altın', 'Gümüş', 'Bronz'][rank - 1]} madalya" focusable="false">
        <path d="M9 3h9l5 16-8 4Z M22 3h9l-6 20-8-4Z" fill="${ribbon}" stroke="#675080" stroke-width="1.7" stroke-linejoin="round"/>
        <path d="m12 5 5 13M27 5l-4 13" stroke="#FFF8F0" stroke-width="1.5" stroke-linecap="round" opacity=".7"/>
        <circle cx="20" cy="30" r="15" fill="${fill}" stroke="${outline}" stroke-width="2"/>
        <circle cx="20" cy="30" r="11" fill="none" stroke="${light}" stroke-width="1.5"/>
        <path d="M10 26q2-6 7-7" fill="none" stroke="${light}" stroke-width="2.4" stroke-linecap="round"/>
        <path d="m34 14 1-3 1 3 3 1-3 1-1 3-1-3-3-1Z" fill="${light}" stroke="${outline}" stroke-width=".8" stroke-linejoin="round"/>
    </svg>`;
}

const leaderMobileOpen = { homework:false, class:false };
window.toggleLeaderSection = function(type) {
    if (!(type in leaderMobileOpen)) return;
    leaderMobileOpen[type] = !leaderMobileOpen[type];
    const section = document.getElementById('leaderSection-' + type);
    section.classList.toggle('is-expanded', leaderMobileOpen[type]);
    section.querySelector('.leader-collapse-toggle').setAttribute('aria-expanded', String(leaderMobileOpen[type]));
    section.querySelector('.leader-disclosure-hint small').textContent = leaderMobileOpen[type] ? 'Gizle' : 'Göster';
};

window.closeLeaderSection = function(type) {
    if (!leaderMobileOpen[type]) return;
    toggleLeaderSection(type);
    const section = document.getElementById('leaderSection-' + type);
    section.scrollIntoView({block:'nearest', behavior:'instant'});
    section.querySelector('.leader-collapse-toggle').focus({preventScroll:true});
};

function leaderBand(score, total) {
    if (score <= 0 || total <= 0) return -1;
    if (score * 100 >= total * 80) return 0;
    if (score * 100 >= total * 50) return 1;
    return 2;
}

function renderLeader() {
    const panel = document.getElementById('leaderPanel');
    if (!panel) return;

    const homeworkScores = {};
    const homeworkChecked = {};
    const classScores = {};
    students.forEach(student => {
        homeworkScores[student] = Object.values(records).reduce((total, day) => total + (day && day[student] === 1 ? 1 : 0), 0);
        homeworkChecked[student] = Object.values(records).reduce((total, day) => total + ([1,-1,0,2,3].includes(day?.[student]) ? 1 : 0), 0);
        classScores[student] = Object.values(classRecords).reduce((total, day) => total + getClassMarkNet(day?.[student]), 0);
    });

    const nameSorter = new Intl.Collator('tr', { sensitivity: 'base', numeric: true });
    const homeworkTop = [...students]
        .filter(student => homeworkScores[student] > 0)
        .sort((a, b) => (homeworkScores[b] / homeworkChecked[b] - homeworkScores[a] / homeworkChecked[a]) || nameSorter.compare(a, b));
    const classTop = [...students]
        .filter(student => classScores[student] > 0)
        .sort((a, b) => (classScores[b] - classScores[a]) || nameSorter.compare(a, b));
    const medals = [1, 2, 3].map(renderLeaderMedal);
    const homeworkIcon = document.querySelector('#btnHomework .comic-homework')?.outerHTML || '';
    const classIcon = document.querySelector('#btnClass .comic-plus')?.outerHTML || '';
    function podiumHTML(list, scores, unit, type) {
        if (!list.length) return '<p class="leader-empty">Henüz pozitif kayıt bulunmuyor.</p>';
        const maximum = Math.max(...list.map(name => scores[name]));
        const groups = [[], [], []];
        list.forEach(name => {
            const denominator = type === 'homework' ? homeworkChecked[name] : maximum;
            const group = leaderBand(scores[name], denominator);
            if (group >= 0) groups[group].push(name);
        });
        return groups.map((names, index) => {
            if (!names.length) return '';
            const tone = ['gold','silver','bronze'][index];
            const title = ['Altın Grup','Gümüş Grup','Bronz Grup'][index];
            const range = ['%80 ve üzeri','%50 – %80 arası','%50’nin altı'][index];
            return '<section class="achievement-group achievement-' + tone + '"><div class="achievement-heading">'
                + medals[index] + '<div><h4>' + title + '</h4></div></div>'
                + '<ul class="achievement-names">' + names.map(name => {
                    const detail = type === 'homework' ? scores[name] + '/' + homeworkChecked[name] + ' ödev' : scores[name] + ' net puan';
                    return '<li><span>' + _htmlEncode(name) + '</span><small class="leader-person-score">' + detail + '</small></li>';
                }).join('') + '</ul></section>';
        }).join('');
    }

    const quietClass = leaderQuietRender ? ' leader-panel-inner-quiet' : '';
    panel.innerHTML = `
        <div class="leader-panel-inner${quietClass}">
            <div id="leaderSection-homework" class="leader-section leader-collapsible ${leaderMobileOpen.homework ? 'is-expanded' : ''}">
                <h3 class="leader-title leader-desktop-title">${homeworkIcon} Ödev Liderliği</h3>
                <h3 class="leader-mobile-title"><button class="leader-collapse-toggle" type="button" aria-expanded="${leaderMobileOpen.homework}" aria-controls="leaderBody-homework" onclick="toggleLeaderSection('homework')">${homeworkIcon}<span>Ödev Liderliği</span><span class="leader-disclosure-hint"><small>${leaderMobileOpen.homework ? 'Gizle' : 'Göster'}</small><i aria-hidden="true"></i></span></button></h3>
                <p class="leader-sub leader-card-description">Bu dönem kontrol edilen ödevlerde tamamlanma oranı</p>
                <div id="leaderBody-homework" class="leader-section-body">
                <div class="leader-list">${podiumHTML(homeworkTop, homeworkScores, 'ödev', 'homework')}</div>
                <p class="leader-sort-note"><em>Altın: en az %80, gümüş: en az %50, bronz: %50’nin altı. İşaretlenmemiş ödevler hesaba katılmaz; Gelmedi tamamlanmamış sayılır. Oranlar eşitse adlar alfabetik sıralanır.</em></p>
                <button type="button" class="leader-bottom-hide" onclick="closeLeaderSection('homework')" aria-label="Ödev liderliğini gizle">Gizle <svg class="leader-hide-arrow" viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false"><path d="M7 16.5 14 9l7 7.5" stroke="#A08ABD" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="m7 15 7-7 7 7" stroke="#79628F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m9.5 12.5 4.5-4.5 4.5 4.5" stroke="#FFF9FF" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                </div>
            </div>
            <div id="leaderSection-class" class="leader-section leader-collapsible ${leaderMobileOpen.class ? 'is-expanded' : ''}">
                <h3 class="leader-title leader-desktop-title">${classIcon} Derse Katılım Liderliği</h3>
                <h3 class="leader-mobile-title"><button class="leader-collapse-toggle" type="button" aria-expanded="${leaderMobileOpen.class}" aria-controls="leaderBody-class" onclick="toggleLeaderSection('class')">${classIcon}<span>Derse Katılım Liderliği</span><span class="leader-disclosure-hint"><small>${leaderMobileOpen.class ? 'Gizle' : 'Göster'}</small><i aria-hidden="true"></i></span></button></h3>
                <p class="leader-sub leader-card-description">Derse katılımı ve çalışmalarını tamamlama düzeyiyle öne çıkan öğrenciler</p>
                <div id="leaderBody-class" class="leader-section-body">
                <div class="leader-list">${podiumHTML(classTop, classScores, 'puan', 'class')}</div>
                <p class="leader-sort-note"><em>Bu dönemin en yüksek pozitif net puanına göre altın: en az %80, gümüş: en az %50, bronz: %50’nin altı. Net puanlar eşitse adlar alfabetik sıralanır.</em></p>
                <button type="button" class="leader-bottom-hide" onclick="closeLeaderSection('class')" aria-label="Derse Katılım liderliğini gizle">Gizle <svg class="leader-hide-arrow" viewBox="0 0 28 28" fill="none" aria-hidden="true" focusable="false"><path d="M7 16.5 14 9l7 7.5" stroke="#A08ABD" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/><path d="m7 15 7-7 7 7" stroke="#79628F" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="m9.5 12.5 4.5-4.5 4.5 4.5" stroke="#FFF9FF" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg></button>
                </div>
            </div>
        </div>
    `;
    leaderQuietRender = false;
}

window.showNote = function(student) {
    const note = notes[student];
    if (!note) return;
    const popup = document.getElementById('notePopup');
    if (!popup) return;
    document.getElementById('notePopupContent').innerHTML = `<strong>📝 ${_htmlEncode(student)}</strong><p>${_htmlEncode(note)}</p>`;
    popup.style.display = 'block';
};

let summaryStudent = null;
let summaryCloseTimer = null;
const summaryDialog = document.getElementById('studentSummaryDialog');
const summaryCounters = new Map();
let summaryPositivePulse = null;
let summaryLastNet = null;

function resetSummaryAnimations() {
    summaryCounters.forEach(state => cancelAnimationFrame(state.frame));
    summaryCounters.clear();
    summaryPositivePulse?.cancel();
    summaryPositivePulse = null;
    summaryLastNet = null;
    document.getElementById('summaryHomework').replaceChildren();
}

function animateSummaryCount(element, target, signed = false, complete = () => {}) {
    const previous = summaryCounters.get(element.id);
    if (previous?.target === target) {
        if (!previous.running) complete();
        return;
    }
    if (previous) cancelAnimationFrame(previous.frame);
    const startValue = previous?.value ?? 0;
    const state = { value: startValue, target, frame: null, running: true };
    summaryCounters.set(element.id, state);
    const write = value => { element.textContent = signed && value > 0 ? `+${value}` : String(value); };
    // Screen readers receive the final value without announcing every animation frame.
    element.setAttribute('aria-label', signed && target > 0 ? `+${target}` : String(target));
    const finish = () => { state.value = target; state.running = false; write(target); complete(); };
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || startValue === target) {
        finish(); return;
    }
    write(startValue);
    const started = performance.now();
    const duration = previous ? 480 : 650;
    const tick = now => {
        const progress = Math.min(1, (now - started) / duration);
        state.value = Math.round(startValue + (target - startValue) * (1 - Math.pow(1 - progress, 3)));
        write(state.value);
        if (progress < 1) state.frame = requestAnimationFrame(tick);
        else finish();
    };
    state.frame = requestAnimationFrame(tick);
}

function renderStudentHistory(student) {
    const descriptions = ClassLogData.homeworkDescriptions || {};
    const dates = [...new Set([...Object.keys(records), ...Object.keys(descriptions).filter(date => descriptions[date].text)])].sort().reverse();
    const statuses = { '1':['Tamam', 'tamam'], '-1':['Eksik', 'eksik'], '2':['Yarım', 'yarim'], '0':['Kitap yok', 'kitap'], '3':['Gelmedi', 'gelmedi'] };
    const homework = dates.map(date => {
        const [label, tone] = statuses[records[date]?.[student]] || ['Henüz işaretlenmedi', 'unmarked'];
        const description = ClassLogData.homeworkDescriptionsAvailable === false
            ? 'Ödev açıklaması şu anda yüklenemiyor.' : descriptions[date]?.text || 'Ödev açıklaması eklenmemiş.';
        return `<article class="summary-history-item"><div><time>${_htmlEncode(ClassLogData.formatDateLong(date))}</time><span class="summary-history-status ss-${tone}">${label}</span></div><p>${_htmlEncode(description)}</p></article>`;
    }).join('');
    const participation = Object.keys(classRecords).sort().reverse().map(date => {
        const { pos, neg } = getClassMarkStats(classRecords[date]?.[student]);
        if (!pos && !neg) return '';
        return `<article class="summary-history-item"><time>${_htmlEncode(ClassLogData.formatDateLong(date))}</time><div class="summary-history-marks">${pos ? `<span class="summary-history-status ss-tamam">+${pos} Olumlu</span>` : ''}${neg ? `<span class="summary-history-status ss-eksik">−${neg} Olumsuz</span>` : ''}</div></article>`;
    }).join('');
    document.getElementById('summaryHomeworkHistory').innerHTML = homework || '<p class="summary-history-empty">Henüz ödev kaydı bulunmuyor.</p>';
    document.getElementById('summaryClassHistory').innerHTML = participation || '<p class="summary-history-empty">Henüz ders içi puan kaydı bulunmuyor.</p>';
}

function renderStudentSummaryCard(student) {
    renderStudentHistory(student);
    const count = { tamam: 0, eksik: 0, yarim: 0, kitap: 0, gelmedi: 0 };
    const statusKeys = { '1': 'tamam', '-1': 'eksik', '2': 'yarim', '0': 'kitap', '3': 'gelmedi' };
    Object.values(records).forEach(day => {
        const key = statusKeys[day?.[student]];
        if (key) count[key]++;
    });
    let pos = 0, neg = 0;
    Object.values(classRecords).forEach(day => {
        const stats = getClassMarkStats(day?.[student]);
        pos += stats.pos;
        neg += stats.neg;
    });
    const total = Object.values(count).reduce((sum, value) => sum + value, 0);
    document.getElementById('summaryStudentName').textContent = student;
    const items = [
        ['tamam', '✓', 'Tamam', count.tamam],
        ['eksik', '−', 'Eksik', count.eksik],
        ['yarim', '◐', 'Yarım', count.yarim],
        ['kitap', '▤', 'Kitap yok', count.kitap],
        ['gelmedi', '•', 'Gelmedi', count.gelmedi]
    ];
    const homeworkStats = document.getElementById('summaryHomework');
    if (!homeworkStats.children.length) {
        homeworkStats.innerHTML = items.map(([key, icon, label]) =>
            `<div class="summary-stat ss-${key}" hidden><span>${icon} ${label}</span><strong id="summaryCount-${key}">0</strong></div>`).join('');
    }
    items.forEach(([key, , , value]) => {
        const element = document.getElementById(`summaryCount-${key}`);
        if (value > 0) element.parentElement.hidden = false;
        animateSummaryCount(element, value, false, () => { element.parentElement.hidden = value === 0; });
    });
    document.getElementById('summaryHomeworkMeta').textContent = total
        ? (count.tamam === total
            ? `${total} ödevin tamamını yaptı.`
            : count.tamam > 0
                ? `${total} ödevden ${count.tamam} tanesini yaptı.`
                : `${total} ödevden henüz hiçbirini tamamlamadı.`)
        : 'Henüz ödev kaydı bulunmuyor.';
    document.getElementById('summaryProgress').style.width = `${total ? count.tamam / total * 100 : 0}%`;
    const netBox = document.getElementById('summaryNetBox');
    const classStats = document.getElementById('summaryClassStats');
    if (pos + neg > 0) { netBox.hidden = false; classStats.hidden = false; }
    const settleClassVisibility = () => {
        const done = ['summaryClassPositive', 'summaryClassNegative', 'summaryClassNet']
            .every(id => !summaryCounters.get(id)?.running);
        if (done && pos + neg === 0) { netBox.hidden = true; classStats.hidden = true; }
    };
    animateSummaryCount(document.getElementById('summaryClassPositive'), pos, false, settleClassVisibility);
    animateSummaryCount(document.getElementById('summaryClassNegative'), neg, false, settleClassVisibility);
    animateSummaryCount(document.getElementById('summaryClassNet'), pos - neg, true, settleClassVisibility);
    if (summaryLastNet !== pos - neg) {
        summaryPositivePulse?.cancel();
        if (pos > neg && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            summaryPositivePulse = netBox.animate([
                { boxShadow: '0 0 0 0 rgba(34,197,94,0)' },
                { boxShadow: '0 0 26px 8px rgba(34,197,94,.22)', offset: .45 },
                { boxShadow: '0 0 0 14px rgba(34,197,94,0)' }
            ], { duration: 1000, easing: 'ease-out', iterations: 1 });
        }
        summaryLastNet = pos - neg;
    }
    summaryDialog.dataset.tone = pos > neg ? 'positive' : pos < neg ? 'negative' : 'neutral';
    document.getElementById('summaryClassMeta').textContent = pos + neg
        ? 'Öğrencinin + ve − puanlarının toplamı.'
        : 'Henüz ders içi puan kaydı bulunmuyor.';
}

window.showStudentSummary = function(student) {
    clearTimeout(summaryCloseTimer);
    summaryDialog.classList.remove('is-closing');
    resetSummaryAnimations();
    summaryStudent = student;
    summaryDialog.querySelectorAll('.summary-history').forEach(details => { details.open = false; });
    renderStudentSummaryCard(student);
    document.getElementById('notePopup').style.display = 'none';
    if (!summaryDialog.open) summaryDialog.showModal();
    const flowers = document.getElementById('summaryFlowers');
    flowers.classList.remove('is-blooming');
    void flowers.offsetWidth;
    flowers.classList.add('is-blooming');
};
window.showStudentSummaryClass = window.showStudentSummary;

window.closeStudentSummary = function() {
    if (!summaryDialog.open || summaryDialog.classList.contains('is-closing')) return;
    summaryDialog.classList.add('is-closing');
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 220;
    summaryCloseTimer = setTimeout(() => {
        const student = summaryStudent;
        summaryDialog.close();
        resetSummaryAnimations();
        summaryDialog.classList.remove('is-closing');
        summaryStudent = null;
        const table = document.getElementById(currentView === 'class' ? 'classTable' : 'excelTable');
        const cell = [...table.querySelectorAll('.student-name')].find(item => item.querySelector('strong')?.textContent === student);
        cell?.focus({ preventScroll: true });
    }, delay);
};
summaryDialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeStudentSummary();
});
summaryDialog.addEventListener('click', event => {
    if (event.target === summaryDialog) {
        const rect = summaryDialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeStudentSummary();
    }
});
document.querySelectorAll('#excelTable, #classTable').forEach(table => {
    table.addEventListener('keydown', event => {
        if (event.target.matches('.student-name') && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            event.target.click();
        }
    });
});
window.manualRefresh = async function() {
    await refreshParentView(true);
};

function subscribeRealtime() {
    window.removeEventListener('focus', parentWindowFocusRefresh);
    document.removeEventListener('visibilitychange', parentVisibilityRefresh);
    window.removeEventListener('online', parentWindowFocusRefresh);
    if (parentSubjectChannel) {
        _supabase.removeChannel(parentSubjectChannel);
        parentSubjectChannel = null;
    }
    if (parentGlobalChannel) {
        _supabase.removeChannel(parentGlobalChannel);
        parentGlobalChannel = null;
    }
    if (parentPollTimer) {
        clearInterval(parentPollTimer);
        parentPollTimer = null;
    }
    if (parentLocalRealtimeCleanup) {
        parentLocalRealtimeCleanup();
        parentLocalRealtimeCleanup = null;
    }
    if (!currentParentToken) return;

    parentChannelHealth.subject=false;parentChannelHealth.global=false;
    const handler = queueParentRefresh;

    parentSubjectChannel = _supabase
        .channel(_parentSyncChannelName(currentParentToken))
        .on('broadcast', { event: 'refresh' }, handler)
        .subscribe(status=>parentChannelStatus('subject',status));

    parentGlobalChannel = _supabase
        .channel(CLASSLOG_PARENT_GLOBAL_CHANNEL)
        .on('broadcast', { event: 'refresh' }, handler)
        .subscribe(status=>parentChannelStatus('global',status));

    parentLocalRealtimeCleanup = _listenLocalRealtime(CLASSLOG_LOCAL_PARENT_EVENT, payload => {
        if (!payload) return;
        const matchesToken = payload.parentToken && payload.parentToken === currentParentToken;
        const matchesClass = payload.className && payload.className === ClassLogData.currentClass;
        if (!payload.settings && !matchesToken && !matchesClass) return;
        queueParentRefresh();
    });

    window.addEventListener('focus', parentWindowFocusRefresh);
    document.addEventListener('visibilitychange', parentVisibilityRefresh);
    window.addEventListener('online', parentWindowFocusRefresh);

    scheduleParentPoll();
}

function parentWindowFocusRefresh() {
    scheduleParentPoll();
    if(!document.hidden)queueParentRefresh();
}

function parentVisibilityRefresh() {
    scheduleParentPoll();
    if (!document.hidden) {parentRefreshPending=false;void refreshParentView(true);}
}

function scheduleParentScrollHint() {
    const scroller = document.getElementById('homeworkView');
    let dismissed = false;
    let hint = null;
    const dismiss = () => { dismissed = true; hint?.remove(); };
    setTimeout(() => {
        const down = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop > 16;
        const right = window.innerWidth <= 640 && scroller.scrollWidth - scroller.clientWidth - scroller.scrollLeft > 16;
        if (dismissed || currentView !== 'homework' || !scroller.clientHeight || (!down && !right)
            || document.querySelector('dialog[open]') || document.getElementById('criticalPopup').style.display === 'flex') return;
        hint = document.createElement('div');
        hint.className = 'parent-scroll-hint';
        hint.setAttribute('aria-hidden', 'true');
        const arrow = '<svg viewBox="0 0 40 44" focusable="false"><path d="M14 5q6-3 12 0v16h8q3 0 1 3L23 39q-3 3-6 0L5 24q-2-3 1-3h8Z" fill="#DCDFFA" stroke="#8877B3" stroke-width="2" stroke-linejoin="round"/><path d="M18 8v15h-7M18 32l3 3" fill="none" stroke="#FFFDF8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
        const label = down && right ? 'Aşağı ve sağa kaydırabilirsiniz' : right ? 'Sağa kaydırabilirsiniz' : 'Aşağı kaydırabilirsiniz';
        hint.innerHTML = '<span>' + label + '</span><div class="scroll-hint-arrows">' + (down ? arrow : '') + (right ? '<div class="scroll-hint-right">' + arrow + '</div>' : '') + '</div>';
        const footer = document.querySelector('.excel-footer');
        hint.style.bottom = (footer.getBoundingClientRect().height + 12) + 'px';
        document.body.appendChild(hint);
        hint.addEventListener('animationend', dismiss, { once:true });
        setTimeout(dismiss, 2000);
    }, 2000);
}

async function init() {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('id');
    const loading = document.getElementById('loadingScreen');
    const dashboard = document.getElementById('mainDashboard');
    const invalid = document.getElementById('invalidScreen');

    if (!token) {
        if (loading) loading.style.display = 'none';
        if (invalid) invalid.style.display = 'flex';
        return;
    }

    currentParentToken = token;
    ClassLogData.parentToken = token;
    ClassLogData.currentSubject = currentSubject;

    const ok = await syncParentState();
    if (!ok) {
        window.ParentRecovery?.fail();
        return;
    }

    if (loading) loading.style.display = 'none';
    if (dashboard) dashboard.style.display = 'flex';
    renderSubjectTabs();
    switchView(currentView);
    renderParentNoticeBar();
    renderParentTickerBar();
    renderCriticalPopup();
    parentLastStateHash = JSON.stringify({
        students,
        records,
        classRecords,
        notes,
        currentSubject,
        currentView,
        parentNotice: ClassLogData.parentNotice,
        parentTicker: ClassLogData.parentTicker,
        parentPopup: ClassLogData.parentPopup
    });
    lastParentRefreshAt = Date.now();
    subscribeRealtime();
    scheduleParentScrollHint();
    window.ParentRecovery?.ready();
}

init().catch(() => window.ParentRecovery?.fail());

let toolsPreviousView = 'homework';
window.toggleTools = function() {
 if(currentView === 'tools') switchView(toolsPreviousView);
 else { toolsPreviousView = currentView; switchView('tools'); }
};
let speechElapsed = 0, speechStarted = null, speechInterval = null, speechAccepted = false;
function updateSpeechControl(label,running){
 const button=document.getElementById('speechToggle');button.setAttribute('aria-label',label);button.title=label;
 button.dataset.running=String(running);
}
function paintSpeechTimer() {
 const ms = speechElapsed + (speechStarted === null ? 0 : performance.now() - speechStarted);
 const seconds = Math.floor(ms / 1000);
 document.getElementById('speechTime').textContent = String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0');
 document.getElementById('speechCentiseconds').textContent = '.' + String(Math.floor(ms % 1000 / 10)).padStart(2,'0');
 if(ms >= 60000 && !speechAccepted) {
  speechAccepted = true;
  document.getElementById('speechDialog').classList.add('speech-accepted');
  document.getElementById('speechStatus').textContent = '1 dakika tamamlandı';
 }
}
window.openSpeechTimer = function() {
 const dialog = document.getElementById('speechDialog');
 dialog.showModal();
 updateSpeechControl(speechStarted!==null?'Durdur':speechElapsed>0?'Devam et':'Başlat',speechStarted!==null);
 if(dialog.requestFullscreen) dialog.requestFullscreen().catch(() => {});
 paintSpeechTimer();
 window.syncSpeechTopicControls?.();
};
window.stopSpeechTimer = function() {
 if(speechStarted !== null) { speechElapsed += performance.now() - speechStarted; speechStarted = null; }
 clearInterval(speechInterval);
 updateSpeechControl(speechElapsed > 0 ? 'Devam et' : 'Başlat',false);
 paintSpeechTimer();
 window.syncSpeechTopicControls?.();
};
window.toggleSpeechTimer = function() {
 if(speechStarted !== null) { stopSpeechTimer(); return; }
 speechStarted = performance.now();
 speechInterval = setInterval(paintSpeechTimer,16);
 window.syncSpeechTopicControls?.();
 updateSpeechControl('Durdur',true);
};
window.resetSpeechTimer = function() {
 clearInterval(speechInterval); speechStarted = null; speechElapsed = 0; speechAccepted = false;
 document.getElementById('speechDialog').classList.remove('speech-accepted');
 document.getElementById('speechStatus').textContent = '';
 updateSpeechControl('Başlat',false);
 paintSpeechTimer();
 window.syncSpeechTopicControls?.();
};
window.closeSpeechTimer = function() {
 const dialog = document.getElementById('speechDialog');
 if(!dialog.open || dialog.classList.contains('speech-closing')) return;
 stopSpeechTimer();
 dialog.classList.add('speech-closing');
 const finish = () => {
  dialog.close();
  dialog.classList.remove('speech-closing');
  if(document.fullscreenElement === dialog) document.exitFullscreen().catch(() => {});
 };
 setTimeout(finish, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260);
};
document.getElementById('speechDialog').addEventListener('cancel', event => { event.preventDefault(); closeSpeechTimer(); });

function positionLatestHomeworkMarker() {
 if(document.getElementById('mainDashboard')?.dataset.headerAnimating) return;
 let marker = document.getElementById('latestHomeworkMarker');
 if (!marker) {
  marker = document.createElement('span');
  marker.id = 'latestHomeworkMarker';
  marker.className = 'latest-homework-marker';
  marker.textContent = 'Son ödev!';
  document.body.appendChild(marker);
 }
 const wrapper = document.getElementById('homeworkView');
 const cell = document.querySelector('#excelTable th.date-header');
 if (!cell || currentView !== 'homework' || !wrapper.getClientRects().length) { marker.style.visibility = 'hidden'; return; }
 const rect = cell.getBoundingClientRect();
 const bounds = wrapper.getBoundingClientRect();
 const nameCell = document.querySelector('#excelTable .student-header');
 const nameStyle = nameCell && getComputedStyle(nameCell);
 const leftEdge = nameCell && nameStyle.left !== 'auto' ? Math.max(bounds.left, nameCell.getBoundingClientRect().right) : bounds.left;
 const half = marker.offsetWidth / 2;
 const targetX = rect.left + rect.width / 2 + (window.innerWidth > 640 ? 5 : 0);
 // Keep the marker attached to its date; never pin it to a viewport edge.
 const visible = bounds.width > 0 && rect.right > leftEdge && rect.left < bounds.right
     && targetX - half >= Math.max(0, leftEdge) && targetX + half <= Math.min(window.innerWidth, bounds.right);
 marker.style.visibility = visible ? 'visible' : 'hidden';
 marker.style.left = targetX + 'px';
 marker.style.top = (rect.top - (window.innerWidth <= 640 ? 13 : 14)) + 'px';
}
// Track layout changes as well as scrolling: the mobile header animates above the table.
let latestMarkerFrame = 0;
function scheduleLatestHomeworkMarker() {
 if (latestMarkerFrame) return;
 latestMarkerFrame = requestAnimationFrame(() => { latestMarkerFrame = 0; positionLatestHomeworkMarker(); });
}
window.addEventListener('resize', scheduleLatestHomeworkMarker);
document.getElementById('homeworkView').addEventListener('scroll', scheduleLatestHomeworkMarker, { passive:true });
const latestMarkerLayoutObserver = new ResizeObserver(scheduleLatestHomeworkMarker);
['homeworkView', 'excelTable', 'mainDashboard'].forEach(id => {
 const element = document.getElementById(id); if (element) latestMarkerLayoutObserver.observe(element);
});
latestMarkerLayoutObserver.observe(document.querySelector('#mainDashboard .excel-header'));
document.fonts?.ready.then(scheduleLatestHomeworkMarker);
window.addEventListener('pageshow', scheduleLatestHomeworkMarker);
window.visualViewport?.addEventListener('resize', scheduleLatestHomeworkMarker);


window.collapseStudentHistory = function(button) {
 const details = button.closest('details');
 if (!details) return;
 details.open = false;
 const summary = details.querySelector('summary');
 summary.focus({ preventScroll:true });
 summary.scrollIntoView({ behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'nearest' });
};

// Swipe only on the subject strip, leaving table and game gestures untouched.
(() => {
 const strip=document.getElementById('subjectTabsParent');if(!strip)return;
 let start=null;
 strip.addEventListener('touchstart',e=>{start=e.touches.length===1?{x:e.touches[0].clientX,y:e.touches[0].clientY}:null;},{passive:true});
 strip.addEventListener('touchend',e=>{
  if(!start||!e.changedTouches.length)return;
  const dx=e.changedTouches[0].clientX-start.x,dy=e.changedTouches[0].clientY-start.y;start=null;
  const active=SUBJECTS.filter(s=>s.showInParent);
  if(active.length<2||Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy)*1.5||parentRefreshInFlight)return;
  const index=active.findIndex(s=>s.id===currentSubject),next=index+(dx<0?1:-1);
  if(next>=0&&next<active.length)window.switchSubjectParent(active[next].id);
 },{passive:true});
 strip.addEventListener('touchcancel',()=>{start=null;},{passive:true});
})();

// Overflow hint stays outside the scrolling strip so it remains at its right edge.
(() => {
 const strip=document.getElementById('subjectTabsParent');if(!strip)return;
 const hint=document.createElement('button');hint.type='button';hint.className='subject-scroll-hint';hint.hidden=true;
 hint.setAttribute('aria-label','Sağdaki dersleri göster');
 hint.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>';
 strip.parentElement.append(hint);
 const update=()=>{
  const remaining=strip.scrollWidth-strip.clientWidth-strip.scrollLeft;
  hint.hidden=strip.clientWidth===0||remaining<=2;
  hint.style.top=(strip.offsetTop+strip.offsetHeight/2)+'px';
 };
 hint.onclick=()=>strip.scrollBy({left:Math.max(100,strip.clientWidth*.65),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 strip.addEventListener('scroll',update,{passive:true});
 new ResizeObserver(update).observe(strip);
 new MutationObserver(update).observe(strip,{childList:true,subtree:true,attributes:true});
 update();
})();
