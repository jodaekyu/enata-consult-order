// Firebase SDK 모듈 임포트
import { signOut } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Firebase 설정값
const firebaseConfig = {
  apiKey: "AIzaSyBCQVBVr9WXt4eK-mr7OZCcs72Y8iKZJBY",
  authDomain: "enata-consult-order.firebaseapp.com",
  projectId: "enata-consult-order",
  storageBucket: "enata-consult-order.firebasestorage.app",
  messagingSenderId: "1049122668305",
  appId: "1:1049122668305:web:06c8b31a31bb4b81e7d6b0"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const tableBody = document.getElementById("tableBody");
const nameRow = document.getElementById("nameRow");
const datePicker = document.getElementById("datePicker");
const scoreMap = { general: 1, designated: 1, reserved: 0.5 };
const activeTeachers = [false, false, false, false];
let currentUserName = "";
let role = "";

// 오늘 날짜 형식 지정
const today = new Date();
const yyyy = today.getFullYear();
const mm = String(today.getMonth() + 1).padStart(2, '0');
const dd = String(today.getDate()).padStart(2, '0');
const formattedToday = `${yyyy}-${mm}-${dd}`;
datePicker.value = formattedToday;
let currentDate = formattedToday;

datePicker.addEventListener("change", () => {
  currentDate = datePicker.value;
  loadSchedule(currentDate);
});

function createTable(rows = 60) {
  tableBody.innerHTML = "";
  for (let i = 0; i < rows; i++) {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = i + 1;
    tr.appendChild(th);
    for (let j = 0; j < 4; j++) {
      const td = document.createElement("td");
      td.dataset.row = i;
      td.dataset.col = j;
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

function createTableFromData(data) {
  let rawSlots = data.slots;

  // 객체 형식이면 배열로 변환
  if (!Array.isArray(rawSlots)) {
    rawSlots = Object.values(rawSlots).map(row =>
      Array.isArray(row) ? row : Object.values(row)
    );
  }

  const rows = rawSlots.length || 60;
  createTable(rows);
  const tableRows = tableBody.rows;

  rawSlots.forEach((rowData, rowIndex) => {
    if (!Array.isArray(rowData)) return;
    rowData.forEach((value, colIndex) => {
      const cell = tableRows[rowIndex]?.cells[colIndex + 1];
      if (cell) {
        cell.textContent = value;
      }
    });
  });
}

async function loadSchedule(dateStr) {
  const ref = doc(db, "schedules", dateStr);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, { slots: [] });
  }
  onSnapshot(ref, (docSnap) => {
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log("불러온 데이터:", data);
      createTableFromData(data);
    } else {
      createTable(60);
    }
  });
}

// ... 이하 생략 (기존 그대로 유지) ...
