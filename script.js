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

    // 유저명 표시
    if (userEmailDisplay) {
      const idOnly = user.email.split("@")[0];
      userEmailDisplay.innerText = `${idOnly} (로그인성공)`;
    }

    // 사용자 정보 가져오기
    const docSnap = await getDoc(doc(db, "users", user.uid));
    if (docSnap.exists()) {
      const data = docSnap.data();
      currentUserName = data.alias || "";

 role = data.role || "admin";  // 기본값은 admin

      // 👉 관리자 여부 확인
      const isAdmin = data.role === "admin";

      // (선택) 관리자 여부 UI에 표시
      if (userEmailDisplay && isAdmin) {
        userEmailDisplay.innerText += " - 관리자";
      }

      // 관리자 전용 UI 보이기
      const adminPanel = document.getElementById("adminPanel");
      if (isAdmin && adminPanel) {
        adminPanel.style.display = "block";
      }
    }

    // 로그아웃 버튼 보이기
    const logoutBtn = document.getElementById("logoutBtn");
    if (logoutBtn) logoutBtn.style.display = "inline-block";
  }
});



nameRow.querySelectorAll("select.name").forEach((select, idx) => {
  select.addEventListener("change", function () {
    const selected = this.value;

    // ✅ admin인 경우, 본인 이름 외 선택 즉시 차단
    if (role === "admin" && selected !== currentUserName) {
      this.value = "이름"; // 초기화
      return;
    }

    // ✅ 정상 선택인 경우만 반영
    activeTeachers[idx] = (selected !== "이름");
    this.classList.toggle("selected", selected !== "이름");
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

  // ✅ 대표(owner)는 전체 열 편집 가능, admin은 자기 열만
  if (role !== "owner" && (!activeTeachers[col] || currentUserName !== selectedName)) {
    alert("본인 이름의 칸만 선택할 수 있어요.");
    return;
  }

  // ✅ 현재 행에 이미 다른 사람 예약이 있다면 입력 금지 → 다음 빈 줄로 자동 이동
  for (let i = 0; i < 4; i++) {
    if (i !== col) {
      const other = tableBody.rows[row].cells[i + 1];
      if (other.className !== "") {
        const nextRow = findNextEmptyRow(col);
        if (nextRow === -1) {
          alert("입력 가능한 빈 순서가 없습니다.");
          return;
        }
        // 다음 빈 줄로 이동해서 다시 입력 시도
        toggleType(tableBody.rows[nextRow].cells[col + 1]);
        return;
      }
    }
  }

  // ✅ 셀 상태 변경
  const states = ["", "general", "designated", "reserved"];
  const current = cell.className;
  const next = states[(states.indexOf(current) + 1) % states.length];
  cell.className = next;
  cell.textContent =
    next === "" ? "" :
    next === "general" ? "일반" :
    next === "designated" ? "지명" :
    "예약";

  updateScores();
  updateNextSuggestions();
  saveSchedule();
}

function findNextEmptyRow(col) {
  for (let i = 0; i < tableBody.rows.length; i++) {
    let isRowEmpty = true;
    for (let j = 1; j <= 4; j++) {
      const cell = tableBody.rows[i].cells[j];
      if (cell.className !== "") {
        isRowEmpty = false;
        break;
      }
    }
    if (isRowEmpty) return i;
  }
  return -1; // 없으면 -1 반환
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

// ✅ admin인 경우, 본인 이름 외에는 선택 불가능하게 설정
      if (role === "admin" && alias !== currentUserName) {
        option.disabled = true;
      }

      select.appendChild(option);
    });
  });
}

createTable(60);
loadSchedule(currentDate);
loadTeacherAliases();

// ✅ [여기부터 관리자 함수 붙이기]
window.viewAllRevenue = function () {
  alert("전체 매출 데이터를 불러옵니다 (예시)");
};

window.openUserDeletion = async function () {
  const uidToDelete = prompt("삭제할 선생님 UID를 입력하세요");
  if (uidToDelete) {
    try {
      await deleteDoc(doc(db, "users", uidToDelete));
      alert("삭제 완료!");
    } catch (e) {
      alert("삭제 실패: " + e.message);
    }
  }
};

window.logout = function () {
  signOut(auth)
    .then(() => {
      location.reload();  // 새로고침으로 초기화
    })
    .catch((error) => {
      alert("로그아웃 실패: " + error.message);
    });
};

