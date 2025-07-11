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
  const rows = data.slots?.length || 60;
  createTable(rows);
  const tableRows = tableBody.rows;
  data.slots.forEach((rowData, rowIndex) => {
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

async function loadTeacherAliases() {
  const querySnapshot = await getDocs(collection(db, "users"));
  const aliases = [];

  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.alias && !data.hidden) {
      aliases.push(data.alias);
    }
  });

  document.querySelectorAll("select.name").forEach(select => {
    select.innerHTML = '<option>이름</option>';
    aliases.forEach(alias => {
      const option = document.createElement("option");
      option.textContent = alias;
      option.value = alias;
      if (role === "admin" && alias !== currentUserName) {
        option.disabled = true;
      }
      select.appendChild(option);
    });
  });
}

// 로그인 함수
window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      alert("로그인 실패: " + error.message);
    });
};

// 회원가입 함수
window.signup = function () {
  const email = document.getElementById("signupEmail").value;
  const password = document.getElementById("signupPassword").value;
  const alias = document.getElementById("signupAlias").value;

  if (!email || !password || !alias) {
    alert("이메일, 비밀번호, 별칭을 모두 입력해주세요.");
    return;
  }

  createUserWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      const uid = userCredential.user.uid;
      return setDoc(doc(db, "users", uid), { email, alias });
    })
    .then(() => {
      document.getElementById("signupStatus").innerText = "회원가입 성공! 로그인해주세요.";
    })
    .catch((error) => {
      alert("회원가입 실패: " + error.message);
    });
};

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const loginBox = document.getElementById("loginBox");
    const signupBox = document.getElementById("signupBox");
    const loginStatus = document.getElementById("loginStatus");
    const userEmailDisplay = document.getElementById("userEmailDisplay");

    if (loginBox) loginBox.style.display = "none";
    if (signupBox) signupBox.style.display = "none";
    if (loginStatus) loginStatus.style.display = "none";

    if (userEmailDisplay) {
      const idOnly = user.email.split("@")[0];
      userEmailDisplay.innerText = `${idOnly} (로그인성공)`;
    }

    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentUserName = data.alias || "";
      role = data.role || "admin";

      const adminPanel = document.getElementById("adminPanel");
      const revenueBtn = document.getElementById("revenueBtn");
      if (adminPanel) adminPanel.style.display = "block";
      if (role === "owner") {
        if (revenueBtn) revenueBtn.textContent = "전체 매출 보기";
      } else if (role === "admin") {
        if (revenueBtn) revenueBtn.textContent = "매출 보기";
      }

      const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) logoutBtn.style.display = "inline-block";

      createTable(60);
      loadSchedule(currentDate);
      loadTeacherAliases();
    }
  }
});

// 💳 결제 팝업 열기 함수
window.openPaymentPopup = function (row, col) {
  const cell = tableBody.rows[row].cells[col + 1];
  if (!cell || cell.className === "") {
    alert("일반/지명/예약으로 먼저 선택해주세요.");
    return;
  }

  window.currentPaymentRow = row;
  window.currentPaymentCol = col;

  document.getElementById("paymentPhone").value = "";
  document.getElementById("cashInput").value = "";
  document.getElementById("cardInput").value = "";
  document.getElementById("transferInput").value = "";
  document.getElementById("payInput").value = "";
  document.getElementById("totalAmount").value = "";
  document.getElementById("earnedPoint").value = "";
  document.getElementById("pointInfo").innerHTML = "";

  document.getElementById("paymentPopup").style.display = "block";
};
