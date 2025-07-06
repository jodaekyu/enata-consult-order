// Firebase SDK 모듈 임포트
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";

// 🔐 여기에 본인의 Firebase 설정값 입력
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "SENDER_ID",
  appId: "APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

let currentUserName = "";

// 로그인 함수
window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .then((userCredential) => {
      document.getElementById("loginStatus").innerText = "로그인 성공!";
    })
    .catch((error) => {
      alert("로그인 실패: " + error.message);
    });
};

// 로그인 상태 체크
onAuthStateChanged(auth, (user) => {
  if (user) {
    const email = user.email;
    if (email === "kyunghee@email.com") currentUserName = "경희";
    if (email === "anna@email.com") currentUserName = "안나";
    if (email === "kara@email.com") currentUserName = "카라";

    document.getElementById("loginStatus").innerText = `${currentUserName}님 로그인됨`;
  }
});
