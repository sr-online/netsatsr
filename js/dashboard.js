const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];
const THAI_MONTHS_SHORT = [
  "ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.",
  "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค.",
];

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function keyToDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function thaiFullDate(d) {
  return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}
function thaiShortDate(d) {
  return `${d.getDate()} ${THAI_MONTHS_SHORT[d.getMonth()]}`;
}
function thaiTime(d) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

const ROSTER = Object.entries(STUDENTS).map(([id, s]) => ({ id, name: s.name, class: s.class }));
const todayKey = dateKey(new Date());

// ---------------- PASSWORD GATE ----------------
// กันไม่ให้คนทั่วไปเปิดดูง่ายเกินไป (ไม่ใช่ระบบความปลอดภัยจริงจัง เพราะข้อมูลไม่ได้อ่อนไหวมาก)
// แก้ไขรหัสผ่านได้ที่ตัวแปรนี้
const GATE_PASSWORD = "netsat2569";
const GATE_SESSION_KEY = "netsatDashboardUnlocked";

const gateShell = document.getElementById("gateShell");
const dashShell = document.getElementById("dashShell");
const gateBtn = document.getElementById("gateBtn");
const gatePasswordInput = document.getElementById("gatePassword");
const gateError = document.getElementById("gateError");

function unlockDashboard() {
  gateShell.classList.add("hidden");
  dashShell.classList.remove("hidden");
  boot();
}

function tryUnlock() {
  const value = gatePasswordInput.value;
  if (value === GATE_PASSWORD) {
    sessionStorage.setItem(GATE_SESSION_KEY, "1");
    gateError.textContent = "";
    unlockDashboard();
  } else {
    gateError.textContent = "รหัสผ่านไม่ถูกต้อง";
  }
}

gateBtn.addEventListener("click", tryUnlock);
gatePasswordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") tryUnlock();
});

// ---------------- STATE ----------------
let selectedDateStr = todayKey;
let viewMode = "checked"; // checked | absent
let searchKw = "";
let dayRecords = [];

document.getElementById("datePicker").value = todayKey;
document.getElementById("dashDate").textContent = thaiFullDate(new Date());

function boot() {
  bindStaticEvents();
  loadDay();
}

function bindStaticEvents() {
  document.getElementById("datePicker").addEventListener("change", (e) => {
    selectedDateStr = e.target.value || todayKey;
    loadDay();
  });
  document.getElementById("refreshBtn").addEventListener("click", loadDay);
  document.getElementById("tableSearch").addEventListener("input", (e) => {
    searchKw = e.target.value.trim();
    renderTable();
  });
  document.getElementById("exportBtn").addEventListener("click", exportExcel);
}

// ---------------- DATA LOADING ----------------
async function loadDay() {
  const snap = await db.collection(CHECKINS_COLLECTION).where("date", "==", selectedDateStr).get();
  dayRecords = snap.docs.map((d) => normalizeRecord(d));
  dayRecords.sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));
  renderStatGrid();
  renderTable();
}

function normalizeRecord(doc) {
  const data = doc.data();
  const createdAtMs = data.createdAt && data.createdAt.toDate ? data.createdAt.toDate().getTime() : 0;
  return {
    id: doc.id,
    studentId: data.studentId,
    name: data.name,
    class: data.class,
    date: data.date,
    createdAtMs,
  };
}

// ---------------- STAT GRID ----------------
function renderStatGrid() {
  const grid = document.getElementById("statGrid");
  grid.innerHTML = "";
  const total = ROSTER.length;
  const checked = dayRecords.length;
  const pct = total ? Math.round((checked / total) * 100) : 0;
  grid.appendChild(statCard("ลงชื่อแล้ว", `${checked}`, dateLabelShort()));
  grid.appendChild(statCard("นักเรียนทั้งหมด", `${total}`, "คน"));
  grid.appendChild(statCard("อัตราการเข้าร่วม", `${pct}%`, `${checked}/${total} คน`));
}

function statCard(label, value, sub) {
  const div = document.createElement("div");
  div.className = "stat-card";
  div.innerHTML = `
    <div class="stat-label">${label}</div>
    <div class="stat-value">${value}</div>
    <div class="stat-sub">${sub}</div>
  `;
  return div;
}

function dateLabelShort() {
  return selectedDateStr === todayKey ? "วันนี้" : thaiShortDate(keyToDate(selectedDateStr));
}

// ---------------- TABLE ----------------
function renderTable() {
  const head = document.getElementById("tableHead");
  const body = document.getElementById("tableBody");
  const title = document.getElementById("tableTitle");
  const viewTabsWrap = document.getElementById("viewTabs");

  title.textContent = `รายชื่อ ${selectedDateStr === todayKey ? "วันนี้" : "วันที่ " + thaiShortDate(keyToDate(selectedDateStr))}`;

  const checkedIds = new Set(dayRecords.map((r) => r.studentId));
  const absentList = ROSTER.filter((s) => !checkedIds.has(s.id));

  viewTabsWrap.innerHTML = "";
  const checkedTab = document.createElement("button");
  checkedTab.className = "tab-btn" + (viewMode === "checked" ? " active" : "");
  checkedTab.textContent = `ลงชื่อแล้ว (${checkedIds.size})`;
  checkedTab.addEventListener("click", () => {
    viewMode = "checked";
    renderTable();
  });
  const absentTab = document.createElement("button");
  absentTab.className = "tab-btn" + (viewMode === "absent" ? " active" : "");
  absentTab.textContent = `ยังไม่ลงชื่อ (${absentList.length})`;
  absentTab.addEventListener("click", () => {
    viewMode = "absent";
    renderTable();
  });
  viewTabsWrap.appendChild(checkedTab);
  viewTabsWrap.appendChild(absentTab);

  if (viewMode === "checked") {
    renderCheckedTable(head, body, dayRecords);
  } else {
    renderAbsentTable(head, body, absentList);
  }
}

function renderCheckedTable(head, body, records) {
  head.innerHTML = `<tr><th>เวลา</th><th>รหัสประจำตัว</th><th>ชื่อ-สกุล</th><th>ชั้น</th></tr>`;
  const kw = normalizeSearch(searchKw);
  const filtered = records.filter((r) => !kw || normalizeSearch(r.name).includes(kw) || r.studentId.includes(kw));
  body.innerHTML = "";

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="4"><div class="empty-row">ยังไม่มีการลงชื่อ</div></td></tr>`;
    return;
  }

  filtered
    .slice()
    .sort((a, b) => b.createdAtMs - a.createdAtMs)
    .forEach((r) => {
      const tr = document.createElement("tr");
      const timeStr = r.createdAtMs ? thaiTime(new Date(r.createdAtMs)) : "-";
      tr.innerHTML = `
        <td>${timeStr}</td>
        <td>${r.studentId}</td>
        <td>${r.name}</td>
        <td>${r.class}</td>
      `;
      body.appendChild(tr);
    });
}

function renderAbsentTable(head, body, list) {
  head.innerHTML = `<tr><th>รหัสประจำตัว</th><th>ชื่อ-สกุล</th><th>ชั้น</th></tr>`;
  const kw = normalizeSearch(searchKw);
  const filtered = list.filter((s) => !kw || normalizeSearch(s.name).includes(kw) || s.id.includes(kw));
  body.innerHTML = "";

  if (filtered.length === 0) {
    body.innerHTML = `<tr><td colspan="3"><div class="empty-row">ลงชื่อครบทุกคนแล้ว 🎉</div></td></tr>`;
    return;
  }

  filtered.forEach((s) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${s.id}</td><td>${s.name}</td><td>${s.class}</td>`;
    body.appendChild(tr);
  });
}

function normalizeSearch(str) {
  return (str || "").replace(/\s+/g, "").toLowerCase();
}

// ---------------- EXPORT TO EXCEL ----------------
function exportExcel() {
  let rows;
  let sheetName;

  if (viewMode === "checked") {
    rows = [["เวลา", "รหัสประจำตัว", "ชื่อ-สกุล", "ชั้น", "วันที่"]];
    dayRecords
      .slice()
      .sort((a, b) => a.createdAtMs - b.createdAtMs)
      .forEach((r) => {
        rows.push([r.createdAtMs ? thaiTime(new Date(r.createdAtMs)) : "", r.studentId, r.name, r.class, r.date]);
      });
    sheetName = "ลงชื่อแล้ว";
  } else {
    rows = [["รหัสประจำตัว", "ชื่อ-สกุล", "ชั้น"]];
    const checkedIds = new Set(dayRecords.map((r) => r.studentId));
    ROSTER.filter((s) => !checkedIds.has(s.id)).forEach((s) => rows.push([s.id, s.name, s.class]));
    sheetName = "ยังไม่ลงชื่อ";
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = rows[0].map((_, i) => ({ wch: i === 2 ? 28 : 14 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `เช็กชื่อติวNetsat-${selectedDateStr}-${sheetName}.xlsx`);
}

// ---------------- GATE AUTO-CHECK ----------------
// วางไว้ท้ายไฟล์ เพื่อให้ตัวแปร/ฟังก์ชันด้านบนถูกประกาศครบก่อน unlockDashboard() จะถูกเรียก
if (sessionStorage.getItem(GATE_SESSION_KEY) === "1") {
  unlockDashboard();
} else {
  gatePasswordInput.focus();
}
