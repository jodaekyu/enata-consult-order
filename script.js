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
  onSnapshot,
  serverTimestamp
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

// ✅ 로그인 함수 추가
window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      alert("로그인 실패: " + error.message);
    });
};

const tableBody = document.getElementById("tableBody");
const nameRow = document.getElementById("nameRow");
const datePicker = document.getElementById("datePicker");
const scoreMap = { general: 1, designated: 1, reserved: 0.5 };
const activeTeachers = [false, false, false, false];
let currentUserName = "";
let role = "";

document.getElementById("datePicker").valueAsDate = new Date();
let currentDate = datePicker.value;

// 🔐 회원가입 함수
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

      if (userEmailDisplay) {
        const idOnly = user.email.split("@")[0];
        userEmailDisplay.innerText = `${idOnly} (로그인성공)`;
      }

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
  const cell = tableBody.rows[row].cells[col + 1]; // col+1은 첫 번째 칸이 번호이기 때문
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
