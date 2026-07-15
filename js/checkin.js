const THAI_DAYS = ["อาทิตย์", "จันทร์", "อังคาร", "พุธ", "พฤหัสบดี", "ศุกร์", "เสาร์"];
const THAI_MONTHS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function thaiFullDate(d) {
  return `วัน${THAI_DAYS[d.getDay()]}ที่ ${d.getDate()} ${THAI_MONTHS[d.getMonth()]} ${d.getFullYear() + 543}`;
}

function thaiTime(d) {
  return d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
}

function initials(name) {
  const cleaned = name.replace(/^(เด็กชาย|เด็กหญิง|นาย|นางสาว|นาง)/, "");
  return cleaned.trim().charAt(0) || "?";
}

document.getElementById("todayLabel").textContent = thaiFullDate(new Date());
document.getElementById("eventName").textContent = EVENT.name;
document.getElementById("eventPlace").textContent = EVENT.place;
document.getElementById("eventPeriod").textContent = `ช่วงเวลาปัจจุบัน: ${periodLabel(currentPeriodKey(new Date()))}`;

// ---------- state ----------
let selectedId = null;
let selectedStudent = null;
let selectedPeriod = null;
let submitting = false;

// ---------- steps ----------
const steps = {
  checkin: document.getElementById("step-checkin"),
  confirm: document.getElementById("step-confirm"),
  success: document.getElementById("step-success"),
};

function showStep(name) {
  Object.values(steps).forEach((s) => s.classList.remove("active"));
  steps[name].classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ---------- id lookup ----------
const idInput = document.getElementById("idInput");
const idError = document.getElementById("idError");

idInput.addEventListener("input", () => {
  idInput.value = idInput.value.replace(/[^0-9]/g, "");
});

idInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") lookupId();
});

document.getElementById("submitIdBtn").addEventListener("click", lookupId);

function lookupId() {
  const id = idInput.value.trim();
  idError.textContent = "";

  if (!id) {
    idError.textContent = "กรุณากรอกรหัสประจำตัวนักเรียน";
    return;
  }

  const student = STUDENTS[id];
  if (!student) {
    idError.textContent = "ไม่พบรหัสนี้ในระบบ กรุณาตรวจสอบรหัสประจำตัวอีกครั้ง";
    return;
  }

  selectedId = id;
  selectedStudent = student;

  const now = new Date();
  selectedPeriod = currentPeriodKey(now);
  document.getElementById("confirmAvatar").textContent = initials(student.name);
  document.getElementById("confirmName").textContent = student.name;
  document.getElementById("confirmClass").textContent = student.class;
  document.getElementById("confirmId").textContent = selectedId;
  document.getElementById("confirmDate").textContent = thaiFullDate(now);
  document.getElementById("confirmPeriod").textContent = periodLabel(selectedPeriod);
  document.getElementById("confirmTime").textContent = thaiTime(now);

  showStep("confirm");
}

document.getElementById("reselectBtn").addEventListener("click", () => {
  showStep("checkin");
  idInput.value = "";
  idInput.focus();
});

// ใช้รหัสเอกสารที่คำนวณได้แน่นอนจาก รหัสนักเรียน+วันที่+ช่วงเวลา แล้วเขียนด้วย .set() แทน .add()
// เพื่อให้ Firestore Rules (allow update: if false) เป็นตัวกันการลงชื่อซ้ำให้แบบ atomic
// จริงๆ ในระดับฐานข้อมูล ไม่ใช่แค่เช็กฝั่งหน้าเว็บ (กันกรณีกดยืนยันซ้ำๆ เร็วๆ หรือลงชื่อพร้อมกันจากหลายเครื่อง)
function makeCheckinId(studentId, dateStr, period) {
  return `${studentId}_${dateStr}_${period}`;
}

document.getElementById("confirmBtn").addEventListener("click", async () => {
  if (submitting || !selectedStudent) return;
  submitting = true;
  const btn = document.getElementById("confirmBtn");
  const originalText = btn.textContent;
  btn.innerHTML = `<span class="spinner"></span>`;
  btn.disabled = true;

  try {
    const today = dateKey(new Date());
    const checkinId = makeCheckinId(selectedId, today, selectedPeriod);

    await db.collection(CHECKINS_COLLECTION).doc(checkinId).set({
      studentId: selectedId,
      name: selectedStudent.name,
      class: selectedStudent.class,
      date: today,
      period: selectedPeriod,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    });
    showSuccess();
  } catch (err) {
    if (err && err.code === "permission-denied") {
      // เขียนไม่ผ่านเพราะเอกสารนี้มีอยู่แล้ว (ลงชื่อไปแล้ววันนี้)
      await showAlreadyDone();
    } else {
      console.error(err);
      showToast("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
    submitting = false;
  }
});

function showSuccess() {
  document.getElementById("successBadge").className = "success-badge";
  document.getElementById("successBadge").textContent = "✓";
  document.getElementById("successTitle").textContent = "ลงชื่อสำเร็จ";
  document.getElementById("successDetail").innerHTML =
    `<strong>${selectedStudent.name}</strong> (${selectedStudent.class})<br/>` +
    `รหัสประจำตัว ${selectedId}<br/>ช่วง${periodLabel(selectedPeriod)} เวลา ${thaiTime(new Date())} น.`;
  showStep("success");
}

async function showAlreadyDone() {
  let timeText = "";
  try {
    const today = dateKey(new Date());
    const doc = await db.collection(CHECKINS_COLLECTION).doc(makeCheckinId(selectedId, today, selectedPeriod)).get();
    if (doc.exists && doc.data().createdAt && doc.data().createdAt.toDate) {
      timeText = `<br/>เวลาที่ลงชื่อไว้ ${thaiTime(doc.data().createdAt.toDate())} น.`;
    }
  } catch (e) {
    // ไม่เป็นไรถ้าอ่านเวลาเดิมไม่ได้ แค่ไม่แสดงเวลา
  }
  document.getElementById("successBadge").className = "success-badge warn";
  document.getElementById("successBadge").textContent = "!";
  document.getElementById("successTitle").textContent = `ลงชื่อช่วง${periodLabel(selectedPeriod)}ไปแล้ว`;
  document.getElementById("successDetail").innerHTML =
    `<strong>${selectedStudent.name}</strong> (${selectedStudent.class})<br/>` +
    `ได้ลงชื่อเข้าร่วมช่วง${periodLabel(selectedPeriod)}ของวันนี้ไปแล้ว${timeText}`;
  showStep("success");
}

document.getElementById("doneBtn").addEventListener("click", () => {
  selectedId = null;
  selectedStudent = null;
  selectedPeriod = null;
  idInput.value = "";
  idError.textContent = "";
  showStep("checkin");
  idInput.focus();
});

// ---------- toast ----------
let toastTimer = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}
