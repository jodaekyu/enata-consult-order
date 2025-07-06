// Firebase SDK 모듈 임포트
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

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

const tableBody = document.getElementById("tableBody");
const nameRow = document.getElementById("nameRow");
const datePicker = document.getElementById("datePicker");
const scoreMap = { general: 1, designated: 1, reserved: 0.5 };
const activeTeachers = [false, false, false, false];
let currentUserName = "";

document.getElementById("datePicker").valueAsDate = new Date();
let currentDate = datePicker.value;

// 로그인 함수
window.login = function () {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  signInWithEmailAndPassword(auth, email, password)
    .catch((error) => {
      alert("로그인 실패: " + error.message);
    });
};

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

// 로그인 상태 감지
onAuthStateChanged(auth, async (user) => {
  if (user) {
    const email = user.email;
    const idOnly = email.split("@")[0];  // 여기! '@' 앞부분만 추출

   // 화면 UI 갱신
    document.getElementById("loginBox").style.display = "none";
    document.getElementById("signupBox").style.display = "none";
    document.getElementById("loginStatus").style.display = "none";

    // 오른쪽 위에 아이디만 + '로그인 성공' 표시
    document.getElementById("userEmailDisplay").innerText = `${idOnly} (로그인 성공)`;

    // 로그아웃 버튼 보이게
    document.getElementById("logoutBtn").style.display = "inline-block";

    // 별칭 가져와서 currentUserName 설정
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      currentUserName = docSnap.data().alias || "";
    }
  }
});


nameRow.querySelectorAll("select.name").forEach((select, idx) => {
  select.addEventListener("change", function () {
    const value = this.value;
    activeTeachers[idx] = (value !== "이름");
    this.classList.toggle("selected", value !== "이름");
    updateScores();
    updateNextSuggestions();
  });
});

datePicker.addEventListener("change", (e) => {
  currentDate = e.target.value;
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
      td.addEventListener("click", () => toggleType(td));
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
  }
}

function toggleType(cell) {
  const row = parseInt(cell.dataset.row);
  const col = parseInt(cell.dataset.col);

  const selectedName = nameRow.querySelectorAll("select.name")[col].value;
  if (!activeTeachers[col] || currentUserName !== selectedName) {
    alert("본인 이름의 칸만 선택할 수 있어요.");
    return;
  }

  for (let i = 0; i < 4; i++) {
    if (i !== col) {
      const other = tableBody.rows[row].cells[i + 1];
      if (other.className !== "") return;
    }
  }

  const states = ["", "general", "designated", "reserved"];
  const current = cell.className;
  const next = states[(states.indexOf(current) + 1) % states.length];
  cell.className = next;
  cell.textContent = next === "" ? "" :
                     next === "general" ? "일반" :
                     next === "designated" ? "지명" :
                     "예약";
  updateScores();
  updateNextSuggestions();
  saveSchedule();
}

function updateScores() {
  const scores = [0, 0, 0, 0];
  for (let row of tableBody.rows) {
    for (let i = 0; i < 4; i++) {
      const cls = row.cells[i + 1].className;
      if (scoreMap[cls] && activeTeachers[i]) scores[i] += scoreMap[cls];
    }
  }
  nameRow.querySelectorAll("th").forEach((th, i) => {
    const scoreSpan = th.querySelector(".score");
    if (scoreSpan && activeTeachers[i - 1]) {
      scoreSpan.textContent = `(${scores[i - 1]}점)`;
    } else if (scoreSpan) {
      scoreSpan.textContent = "";
    }
  });
}

function updateNextSuggestions() {
  const scores = [0, 0, 0, 0];
  for (let row of tableBody.rows) {
    for (let i = 0; i < 4; i++) {
      const cls = row.cells[i + 1].className;
      if (scoreMap[cls] && activeTeachers[i]) scores[i] += scoreMap[cls];
    }
  }

  for (let i = 0; i < tableBody.rows.length; i++) {
    const row = tableBody.rows[i];
    const th = row.cells[0];
    let isFilled = false;
    for (let j = 1; j <= 4; j++) {
      if (row.cells[j].className !== "") {
        isFilled = true;
        break;
      }
    }
    if (!isFilled) {
      const active = scores.map((score, idx) => ({ idx, score }))
                           .filter(t => activeTeachers[t.idx])
                           .sort((a, b) => a.score - b.score);
      if (active.length > 0) {
        th.textContent = nameRow.querySelectorAll("select.name")[active[0].idx].value;
      }
      break;
    } else {
      th.textContent = i + 1;
    }
  }
}

async function saveSchedule() {
  const ref = doc(db, "schedules", currentDate);
  const slots = [];

  Array.from(tableBody.rows).forEach((row, rowIndex) => {
    Array.from(row.cells).slice(1).forEach((td, colIndex) => {
      slots.push({
        row: rowIndex + 1,
        col: colIndex,
        type: td.className || ""
      });
    });
  });

  const teacherNames = Array.from(nameRow.querySelectorAll("select.name"))
                            .map(select => select.value);

  await setDoc(ref, { slots, teacherNames });
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
      restoreTable(data.slots, data.teacherNames);
    }
  });
}

function restoreTable(slots, teacherNames = []) {
  createTable(60);

  nameRow.querySelectorAll("select.name").forEach((select, i) => {
    const value = teacherNames[i] || "이름";
    select.value = value;
    activeTeachers[i] = (value !== "이름");
    select.classList.toggle("selected", value !== "이름");
  });

  slots.forEach(item => {
    const cell = tableBody.rows[item.row - 1]?.cells?.[item.col + 1];
    if (!cell) return;
    const type = item.type;
    cell.className = type;
    cell.textContent =
      type === "general" ? "일반" :
      type === "designated" ? "지명" :
      type === "reserved" ? "예약" : "";
  });

  updateScores();
  updateNextSuggestions();
}

async function loadTeacherAliases() {
  const querySnapshot = await getDocs(collection(db, "users"));
  const aliases = [];
  querySnapshot.forEach((doc) => {
    const data = doc.data();
    if (data.alias) aliases.push(data.alias);
  });

  document.querySelectorAll("select.name").forEach(select => {
    select.innerHTML = '<option>이름</option>';
    aliases.forEach(alias => {
      const option = document.createElement("option");
      option.textContent = alias;
      select.appendChild(option);
    });
  });
}

createTable(60);
loadSchedule(currentDate);
loadTeacherAliases();
