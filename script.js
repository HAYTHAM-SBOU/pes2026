const ADMIN_PASSWORD = "Haytham@2004";

// تحميل البيانات من localStorage أو إنشاء كائن جديد
let store = JSON.parse(localStorage.getItem('tourney_final_v4')) || {
    mode: 'groups',
    groups: [],
    matches: { qf: [], sf: [], f: [] },
    isAdmin: false
};

/**
 * وظيفة التحكم في دخول وخروج المسؤول
 */
function toggleAdmin() {
    if (!store.isAdmin) {
        let pass = prompt("أدخل كلمة السر للدخول إلى الإدارة:");
        if (pass === ADMIN_PASSWORD) {
            store.isAdmin = true;
            document.getElementById('adminBtn').innerText = "خروج المسؤول 🔓";
        } else {
            alert("كلمة السر خاطئة!");
            return;
        }
    } else {
        store.isAdmin = false;
        document.getElementById('adminBtn').innerText = "الإدارة 🔐";
    }
    render();
}

/**
 * إنشاء البطولة وتقسيم المجموعات
 */
function initTournament() {
    const teams = document.getElementById('teamsInput').value.split('\n').filter(t => t.trim());
    
    if (teams.length < 6) {
        return alert("تحتاج 6 فرق على الأقل لعمل المجموعات!");
    }

    store.groups = [];
    // ترتيب عشوائي للفرق
    const shuffled = teams.sort(() => Math.random() - 0.5);

    // تقسيم الفرق (3 فرق لكل مجموعة)
    for (let i = 0; i < shuffled.length; i += 3) {
        store.groups.push({
            name: `المجموعة ${String.fromCharCode(65 + i/3)}`,
            teams: shuffled.slice(i, i+3).map(n => ({ 
                name: n, 
                w: 0, 
                d: 0, 
                l: 0, 
                pts: 0 
            })),
            nextMatch: { 
                teams: "لم تحدد بعد", 
                date: "2026-01-01", 
                time: "00:00" 
            }
        });
    }
    
    store.mode = 'groups';
    save(); 
    render();
}

/**
 * تحديث نتائج المجموعات
 */
function updateScore(gIdx, tIdx, field, val) {
    let t = store.groups[gIdx].teams[tIdx];
    t[field] = parseInt(val) || 0;
    
    // حساب النقاط تلقائياً (فوز=3، تعادل=1)
    t.pts = (t.w * 3) + (t.d * 1);
    
    // إعادة ترتيب فرق المجموعة حسب النقاط (من الأعلى للأقل)
    store.groups[gIdx].teams.sort((a,b) => b.pts - a.pts);
    
    save(); 
    render();
}

/**
 * تحديث معلومات المباراة القادمة
 */
function updateMatchInfo(gIdx, field, val) {
    store.groups[gIdx].nextMatch[field] = val;
    save();
}

/**
 * الانتقال إلى مرحلة خروج المغلوب
 */
function startKnockoutPhase() {
    if (!confirm("هل أنت متأكد من إنهاء مرحلة المجموعات وبدء الأدوار الإقصائية؟")) return;

    const qualified = [];
    store.groups.forEach(g => { 
        if(g.teams[0]) qualified.push(g.teams[0].name); // الأول
        if(g.teams[1]) qualified.push(g.teams[1].name); // الثاني
    });

    // إعداد مباريات ربع النهائي
    store.matches.qf = [];
    for (let i = 0; i < qualified.length; i += 2) {
        if(qualified[i+1]) {
            store.matches.qf.push({ 
                id: i/2, 
                t1: qualified[i], 
                t2: qualified[i+1], 
                s1: 0, 
                s2: 0 
            });
        }
    }

    // إعداد الهيكل الفارغ لنصف النهائي والنهائي
    store.matches.sf = [
        {id:0, t1:'??', t2:'??', s1:0, s2:0}, 
        {id:1, t1:'??', t2:'??', s1:0, s2:0}
    ];
    store.matches.f = [{id:0, t1:'??', t2:'??', s1:0, s2:0}];

    store.mode = 'knockout';
    save(); 
    render();
}

/**
 * تحديث نتائج الأدوار الإقصائية وتصعيد الفائز تلقائياً
 */
function updateKM(stage, mIdx, field, val) {
    let m = store.matches[stage][mIdx];
    m[field] = parseInt(val) || 0;

    // منطق تصعيد الفائز
    if (stage === 'qf') {
        let nextIdx = Math.floor(mIdx / 2);
        let teamPos = mIdx % 2 === 0 ? 't1' : 't2';
        if (store.matches.sf[nextIdx]) {
            store.matches.sf[nextIdx][teamPos] = m.s1 > m.s2 ? m.t1 : (m.s2 > m.s1 ? m.t2 : '??');
        }
    } else if (stage === 'sf') {
        let teamPos = mIdx === 0 ? 't1' : 't2';
        store.matches.f[0][teamPos] = m.s1 > m.s2 ? m.t1 : (m.s2 > m.s1 ? m.t2 : '??');
    }
    
    save(); 
    render();
}

/**
 * حفظ البيانات في ذاكرة المتصفح
 */
function save() { 
    localStorage.setItem('tourney_final_v4', JSON.stringify(store)); 
}

/**
 * مسح كل بيانات البطولة
 */
function resetAll() { 
    if(confirm("هل تريد حقاً مسح كافة بيانات البطولة؟ لا يمكن التراجع!")) { 
        localStorage.clear(); 
        location.reload(); 
    } 
}

/**
 * الوظيفة الأساسية لرسم الواجهة بناءً على البيانات
 */
function render() {
    // إخفاء/إظهار لوحة الإدارة
    document.getElementById('adminPanel').classList.toggle('hidden', !store.isAdmin);
    
    const groupView = document.getElementById('groupView');
    const knockoutView = document.getElementById('knockoutView');

    if (store.mode === 'groups') {
        knockoutView.classList.add('hidden');
        groupView.classList.remove('hidden');
        document.getElementById('groupActions').classList.toggle('hidden', store.groups.length === 0);
        
        groupView.innerHTML = store.groups.map((g, gIdx) => `
            <div class="card">
                <h3>${g.name}</h3>
                <table>
                    <tr><th style="text-align:right">الفريق</th><th>W</th><th>D</th><th>L</th><th>PTS</th></tr>
                    ${g.teams.map((t, tIdx) => `
                        <tr>
                            <td style="text-align:right"><b>${t.name}</b></td>
                            <td>${store.isAdmin ? `<input type="number" class="input-neon" value="${t.w}" onchange="updateScore(${gIdx},${tIdx},'w',this.value)">` : t.w}</td>
                            <td>${store.isAdmin ? `<input type="number" class="input-neon" value="${t.d}" onchange="updateScore(${gIdx},${tIdx},'d',this.value)">` : t.d}</td>
                            <td>${store.isAdmin ? `<input type="number" class="input-neon" style="background:#ff4444" value="${t.l}" onchange="updateScore(${gIdx},${tIdx},'l',this.value)">` : t.l}</td>
                            <td style="color:var(--blue-neon); font-weight:bold">${t.pts}</td>
                        </tr>
                    `).join('')}
                </table>

                <div class="match-info-box">
                    <h4>⚔️ المباراة القادمة</h4>
                    <div class="info-row">
                        <span>المواجهة:</span>
                        ${store.isAdmin ? `<input type="text" class="info-input" value="${g.nextMatch.teams}" onchange="updateMatchInfo(${gIdx},'teams',this.value)">` : `<span>${g.nextMatch.teams}</span>`}
                    </div>
                    <div class="info-row">
                        <span>التاريخ:</span>
                        ${store.isAdmin ? `<input type="date" class="info-input" value="${g.nextMatch.date}" onchange="updateMatchInfo(${gIdx},'date',this.value)">` : `<span>${g.nextMatch.date}</span>`}
                    </div>
                    <div class="info-row">
                        <span>الوقت:</span>
                        ${store.isAdmin ? `<input type="time" class="info-input" value="${g.nextMatch.time}" onchange="updateMatchInfo(${gIdx},'time',this.value)">` : `<span>${g.nextMatch.time}</span>`}
                    </div>
                </div>
            </div>
        `).join('');
    } else {
        groupView.classList.add('hidden');
        knockoutView.classList.remove('hidden');
        
        const createBox = (m, stage, idx) => `
            <div class="match-box">
                <div class="team-row">
                    <span>${m.t1}</span>
                    ${store.isAdmin ? `<input type="number" class="input-neon" value="${m.s1}" onchange="updateKM('${stage}',${idx},'s1',this.value)">` : `<b>${m.s1}</b>`}
                </div>
                <div class="team-row">
                    <span>${m.t2}</span>
                    ${store.isAdmin ? `<input type="number" class="input-neon" value="${m.s2}" onchange="updateKM('${stage}',${idx},'s2',this.value)">` : `<b>${m.s2}</b>`}
                </div>
            </div>`;

        document.getElementById('qf-col').innerHTML = `<h4>ربع النهائي</h4>` + store.matches.qf.map((m, i) => createBox(m, 'qf', i)).join('');
        document.getElementById('sf-col').innerHTML = `<h4>نصف النهائي</h4>` + store.matches.sf.map((m, i) => createBox(m, 'sf', i)).join('');
        document.getElementById('f-col').innerHTML = `<h4>النهائي 🏆</h4>` + store.matches.f.map((m, i) => createBox(m, 'f', i)).join('');
    }
}

// التشغيل الأول عند تحميل الصفحة
render();