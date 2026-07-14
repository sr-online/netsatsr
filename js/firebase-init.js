// การตั้งค่า Firebase ของโปรเจกต์ (Firestore ใช้เก็บข้อมูลการลงชื่อ)
// ใช้ Firebase project เดียวกับ "เว็บไซต์เช็กชื่อนักเรียนพิเศษ" แต่แยกคอลเล็กชันกัน
// (ระบบนี้เก็บที่ collection "netsat_checkins" ส่วนอีกระบบเก็บที่ "checkins")
// ไม่ได้ใช้ระบบล็อกอิน (Firebase Authentication) เพราะข้อมูลที่เก็บไม่จำเป็นต้องมีความปลอดภัยสูง
// ใช้ Firebase SDK แบบ compat (global script) เพื่อให้เปิดไฟล์ .html แบบดับเบิลคลิกได้โดยตรง
const firebaseConfig = {
  apiKey: "AIzaSyCw_6bCyWYgCBFtpw1kKrRv5j4ndnX73PA",
  authDomain: "check-in-7989c.firebaseapp.com",
  projectId: "check-in-7989c",
  storageBucket: "check-in-7989c.firebasestorage.app",
  messagingSenderId: "788248288651",
  appId: "1:788248288651:web:c729ebb161e168bb9ce38e",
  measurementId: "G-8VRJ9MZVS6",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const CHECKINS_COLLECTION = "netsat_checkins";
