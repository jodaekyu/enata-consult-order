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
  serverTimestamp  // ✅ 여기에 추가
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

// ✅ 로그인 버튼 이벤트 연결 (모듈 환경 대응용)
document.getElementById("loginBtn").addEventListener("click", () => {
  login(); // 위에 선언한 login() 호출
});

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

  // 유저명 표시
  if (userEmailDisplay) {
    const idOnly = user.email.split("@")[0];
    userEmailDisplay.innerText = `${idOnly} (로그인성공)`;
  }

  // 관리자 패널 표시
  const adminPanel = document.getElementById("adminPanel");
  const revenueBtn = document.getElementById("revenueBtn");

  if (adminPanel) adminPanel.style.display = "block";

  if (role === "owner") {
    if (revenueBtn) revenueBtn.textContent = "전체 매출 보기";
  } else if (role === "admin") {
    if (revenueBtn) revenueBtn.textContent = "매출 보기";
  }


    // 로그아웃 버튼 보이기
    const logoutBtn = document.getElementById("logoutBtn");
      if (logoutBtn) logoutBtn.style.display = "inline-block";

      // ✅ 여기에 정확히 위치시켜야 정상 동작
      createTable(60);
      loadSchedule(currentDate);
      loadTeacherAliases();
    }
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

      // ✅ 1. 클릭해서 일반/지명/예약 상태 바꾸는 이벤트
      td.addEventListener("click", () => toggleType(td));

      // ✅ 2. 꾹 누르면 결제 팝업 띄우는 이벤트
      let pressTimer;
      td.addEventListener("mousedown", () => {
        pressTimer = setTimeout(() => {
          openPaymentPopup(i, j); // i: 행, j: 열
        }, 700); // 0.7초 이상 눌렀을 때 실행
      });
      td.addEventListener("mouseup", () => clearTimeout(pressTimer));
      td.addEventListener("mouseleave", () => clearTimeout(pressTimer));

      // ✅ 3. 모바일 터치 대응
      td.addEventListener("touchstart", () => {
        pressTimer = setTimeout(() => {
          openPaymentPopup(i, j);
        }, 700);
      });
      td.addEventListener("touchend", () => clearTimeout(pressTimer));
      td.addEventListener("touchcancel", () => clearTimeout(pressTimer));

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

  // ✅ 해당 줄에 다른 사람이 입력해둔 셀이 있으면 클릭 무시
  for (let i = 0; i < 4; i++) {
    if (i !== col) {
      const other = tableBody.rows[row].cells[i + 1];
      if (other.className !== "") {
        // ❌ 자동 이동 없이 그냥 막기만 함
        alert("이 순서는 이미 다른 선생님이 입력했습니다. 다음 순서를 선택해 주세요.");
        return;
      }
    }
  }

  // ✅ 정상적인 경우에만 입력 가능
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

// ✅ [여기부터 관리자 함수 붙이기]
window.viewAllRevenue = function () {
  if (role === "owner") {
    alert("🔎 전체 선생님의 매출을 조회합니다 (예시)");
    // TODO: 전체 매출 출력 코드 삽입
  } else if (role === "admin") {
    alert(`🔍 ${currentUserName} 선생님의 매출을 조회합니다 (예시)`);
    // TODO: 본인 매출만 출력하는 코드 삽입
  } else {
    alert("권한이 없습니다.");
  }
};


// 신규 고객 등록 팝업 열기
window.openNewCustomerPopup = function (phone) {
  document.getElementById("newPhone").value = phone;
  document.getElementById("newCustomerPopup").style.display = "block";
};

// 닫기
window.closeNewCustomerPopup = function () {
  document.getElementById("newCustomerPopup").style.display = "none";
};

// ✅ 결제 팝업 닫기 함수
window.closePaymentPopup = function () {
  document.getElementById("paymentPopup").style.display = "none";


  // 입력 초기화 (선택사항)
  ["cashInput", "cardInput", "transferInput", "payInput", "totalAmount", "earnedPoint", "paymentPhone"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });

   document.querySelector('#paymentPopup button[onclick="checkCustomer()"]').style.display = "inline-block";
  document.querySelector('#paymentPopup button[onclick="openNewCustomerPopupFromPayment()"]').style.display = "none";
};


// ✅ 결제 저장 함수
window.savePayment = async function () {
  const phone = document.getElementById("paymentPhone").value.trim();
  const total = ["cashInput", "cardInput", "transferInput", "payInput"].reduce((sum, id) => {
    return sum + parseInt(document.getElementById(id).value || "0", 10);
  }, 0);
  const point = Math.floor(total * 0.05);

  if (!phone || total === 0) {
    alert("고객 연락처와 결제 금액을 입력해주세요.");
    return;
  }

  try {
    // 결제 정보 저장
    await setDoc(doc(db, "payments", `${Date.now()}_${phone}`), {
      phone,
      date: new Date().toISOString(),
      cash: parseInt(document.getElementById("cashInput").value || "0"),
      card: parseInt(document.getElementById("cardInput").value || "0"),
      transfer: parseInt(document.getElementById("transferInput").value || "0"),
      pay: parseInt(document.getElementById("payInput").value || "0"),
      total,
      point
    });

    // 포인트 누적
    const ref = doc(db, "customers", phone);
    const snap = await getDoc(ref);
    if (snap.exists()) {
      const prev = snap.data().point || 0;
      await setDoc(ref, { point: prev + point }, { merge: true });
    }

    alert("결제가 저장되었습니다.");
    closePaymentPopup();
  } catch (err) {
    alert("저장 실패: " + err.message);
  }
};

// 저장
window.saveNewCustomer = async function () {
  const phone = document.getElementById("newPhone").value;
  const birth = document.getElementById("newBirth").value;
  const hour = document.getElementById("birthHour").value;
  const minute = document.getElementById("birthMinute").value;
  const kakao = document.getElementById("kakaoEmail").value;
  const gender = document.getElementById("gender").value;

  if (!phone || !birth || !gender) {
    alert("연락처, 생년월일, 성별은 필수입니다.");
    return;
  }

  const bornTime = (minute === "모름") ? "모름" : `${hour}:${minute}`;

  try {
    await setDoc(doc(db, "customers", phone), {
      phone,
      birth,
      bornTime,
      kakao,
      gender,
     createdAt: serverTimestamp()  // ✅ Firebase 서버 기준 시간
});
    alert("고객 정보가 등록되었습니다.");
    closeNewCustomerPopup();
    // 이후 기존 입력창 자동 리프레시 연결 필요 시 콜백 추가
  } catch (err) {
    alert("저장 실패: " + err.message);
  }
};


window.openPaymentPopup = function (row, col) {
  const cell = tableBody.rows[row].cells[col + 1];
  if (!cell || cell.className === "") {
    alert("일반/지명/예약으로 먼저 선택해주세요.");
    return;
  }

  // 💡 모바일 기본 메뉴 방지
  event?.preventDefault();

  // 💳 팝업 띄우기
  document.getElementById("paymentPopup").style.display = "block";

  // 선택한 셀 정보 저장 (필요시 전역 변수로 저장 가능)
  document.getElementById("paymentPopup").dataset.row = row;
  document.getElementById("paymentPopup").dataset.col = col;

  // 셀의 클래스 기반으로 결제 유형 힌트 (예: 일반/지명/예약)
  const type = cell.className;
  const typeText = type === "general" ? "일반" :
                   type === "designated" ? "지명" :
                   type === "reserved" ? "예약" : "미정";

  document.getElementById("paymentPopup").querySelector("h3").textContent = `💳 결제창`;

};

// 확인 버튼 클릭 시
window.checkCustomer = async function () {
  const phone = document.getElementById("paymentPhone").value.trim();
  const pointInfo = document.getElementById("pointInfo");
  const confirmBtn = document.querySelector('#paymentPopup button[onclick="checkCustomer()"]');
  const signupBtn = document.querySelector('#paymentPopup button[onclick="openNewCustomerPopupFromPayment()"]');

  if (!phone) {
    alert("전화번호를 입력해주세요.");
    return;
  }

  try {
    const ref = doc(db, "customers", phone);
    const snap = await getDoc(ref);

    confirmBtn.style.display = "none"; // 확인 버튼 숨김

    if (snap.exists()) {
      const data = snap.data();
      const point = data.point || 0;


// ✅ 포인트 텍스트 영역에 출력
  document.getElementById("currentPointText").innerText = `[현재 포인트 ${point.toLocaleString()}]`;

  // ✅ 고객 등급 표시 (등급 로직은 추후 반영)
  const levelEl = document.getElementById("customerLevel");
  levelEl.style.display = "inline";
  levelEl.innerText = "[고객 등급]"; // 또는 "[VIP]", "[일반]" 등 추후 설정

      pointInfo.innerHTML = `<strong>[현재 포인트 ${point.toLocaleString()}]</strong>`;
    } else {
      pointInfo.innerHTML = `
        <label>생년월일: 
    <select id="birthYear">
      ${Array.from({length: 100}, (_, i) => {
        const year = new Date().getFullYear() - i;
        return `<option value="${year}">${year}년</option>`;
      }).join('')}
    </select>
    <select id="birthMonth">
      ${Array.from({length: 12}, (_, i) => `<option value="${i + 1}">${String(i + 1).padStart(2, '0')}월</option>`).join('')}
    </select>
    <select id="birthDay">
      ${Array.from({length: 31}, (_, i) => `<option value="${i + 1}">${String(i + 1).padStart(2, '0')}일</option>`).join('')}
    </select>
  </label><br/><br/>

  <label>출생 시간: 
    <span style="display: inline-flex; gap: 4px;">
      <select id="birthHour2" style="width: 80px;">
        <option value="모름">모름</option>
        ${[...Array(24).keys()].map(h => `<option value="${h}">${String(h).padStart(2, '0')}시</option>`).join('')}
      </select>
      <select id="birthMinute2" style="width: 80px;">
        <option value="모름">모름</option>
        ${[...Array(60).keys()].map(m => `<option value="${m}">${String(m).padStart(2, '0')}분</option>`).join('')}
      </select>
    </span>
  </label><br/><br/>

  <label>성별: 
    <select id="gender2">
      <option value="">선택</option>
      <option value="남">남</option>
      <option value="여">여</option>
    </select>
  </label><br/><br/>
`;
      signupBtn.textContent = "신규";
      signupBtn.style.display = "inline-block";
document.getElementById("birthInfoSection").style.display = "block";
document.getElementById("customerLevel").style.display = "none";
document.getElementById("currentPointText").innerText = "";


// 신규 버튼 기능 연결
signupBtn.onclick = async () => {
  const year = document.getElementById("birthYear").value;
  const month = document.getElementById("birthMonth").value.padStart(2, '0');
  const day = document.getElementById("birthDay").value.padStart(2, '0');
  const birth = `${year}-${month}-${day}`;

  const hour = document.getElementById("birthHour2").value;
  const minute = document.getElementById("birthMinute2").value;

  // 🔧 여기만 1번 선언
  const bornTime = (hour === "모름" || minute === "모름") ? "모름" : `${hour}:${minute}`;

  const gender = document.getElementById("gender2").value;

  if (!birth || !gender) {
    alert("생년월일과 성별은 필수입니다.");
    return;
  }

  await setDoc(ref, {
    phone,
    birth,
    bornTime,
    gender,
    point: 0,
    createdAt: serverTimestamp()
  });

  pointInfo.innerHTML = `<strong>[현재 포인트 0]</strong>`;
  signupBtn.style.display = "none";
};

    }
  } catch (err) {
    alert("고객 조회 오류: " + err.message);
  }
};

// 합계 및 포인트 계산
["cashInput", "cardInput", "transferInput", "payInput"].forEach(id => {
  document.getElementById(id).addEventListener("input", calculateTotalAndPoint);
});

function calculateTotalAndPoint() {
  const getNum = id => parseInt(document.getElementById(id).value || "0", 10);
  const total = getNum("cashInput") + getNum("cardInput") + getNum("transferInput") + getNum("payInput");
  document.getElementById("totalAmount").value = total.toLocaleString();
  document.getElementById("earnedPoint").value = Math.floor(total * 0.05).toLocaleString(); // 5% 적립
}

// 결제 저장
window.savePayment = async function () {
  const phone = document.getElementById("paymentPhone").value.trim();
  if (!phone) {
    alert("고객 연락처를 입력해주세요.");
    return;
  }

  const getNum = id => parseInt(document.getElementById(id).value || "0", 10);
  const total = getNum("cashInput") + getNum("cardInput") + getNum("transferInput") + getNum("payInput");
  const point = Math.floor(total * 0.05);

  try {
    // 저장
    await setDoc(doc(db, "payments", `${Date.now()}_${phone}`), {
      phone,
      date: new Date().toISOString(),
      cash: getNum("cashInput"),
      card: getNum("cardInput"),
      transfer: getNum("transferInput"),
      pay: getNum("payInput"),
      total,
      point
    });

    // 포인트 누적
    const customerRef = doc(db, "customers", phone);
    const snap = await getDoc(customerRef);
    if (snap.exists()) {
      const prev = snap.data().point || 0;
      await setDoc(customerRef, { point: prev + point }, { merge: true });
    }

    alert("결제가 저장되었습니다.");
    closePaymentPopup();
  } catch (err) {
    alert("저장 실패: " + err.message);
  }
};
