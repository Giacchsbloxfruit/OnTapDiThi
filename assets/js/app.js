import {
  firebaseReady, authService, database, functionsService, firebaseSdk,
  localDemoQuestions, localDemoExams
} from "./firebase.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const SUBJECTS = [
  { id: "toan", name: "Toán", grade: 11, icon: "∑", subtitle: "Toán học 11" },
  { id: "ngu-van", name: "Ngữ văn", grade: 11, icon: "Aa", subtitle: "Ngữ văn 11" },
  { id: "tieng-anh", name: "Tiếng Anh", grade: 11, icon: "A+", subtitle: "Tiếng Anh 11" },
  { id: "vat-ly", name: "Vật lí", grade: 11, icon: "⚡", subtitle: "Vật lí 11" },
  { id: "hoa-hoc", name: "Hóa học", grade: 11, icon: "⚗", subtitle: "Hóa học 11" },
  { id: "sinh-hoc", name: "Sinh học", grade: 11, icon: "❋", subtitle: "Sinh học 11" },
  { id: "lich-su", name: "Lịch sử", grade: 11, icon: "◷", subtitle: "Lịch sử 11" },
  { id: "dia-ly", name: "Địa lí", grade: 11, icon: "⌖", subtitle: "Địa lí 11" },
  { id: "gdkt-pl", name: "KT & Pháp luật", grade: 11, icon: "§", subtitle: "Kinh tế và Pháp luật 11" },
  { id: "tin-hoc", name: "Tin học", grade: 11, icon: "⌘", subtitle: "Tin học 11" },
  { id: "cong-nghe", name: "Công nghệ", grade: 11, icon: "⚙", subtitle: "Công nghệ cơ khí 11" }
];
const HISTORY_KEY = "ontap_history_v1";
const QUESTIONS_KEY = "ontap_demo_questions_v1";
const EXAMS_KEY = "ontap_demo_exams_v1";
const letters = ["A", "B", "C", "D"];

let questions = [];
let exams = [];
let currentUser = null;
let isAdmin = false;
let accountRole = "guest";
let topMode = "score";
let leaderboardRows = [];
let accountProfile = null;
let authMode = "login";
let activePractice = null;
let activeExam = null;
let examTimer = null;
let importFileContent = null;
let lastResult = null;
let localHistory = readLocal(HISTORY_KEY, []);

function readLocal(key, fallback) {
  try { const value = JSON.parse(localStorage.getItem(key)); return value ?? fallback; }
  catch { return fallback; }
}
function writeLocal(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
function uid(prefix = "q") { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}
function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
function toast(message, type = "success") {
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  $("#toastRegion").append(node);
  setTimeout(() => node.remove(), 3600);
}
function setStatus(text, connected = false) {
  const pill = $("#connectionStatus");
  pill.innerHTML = `<i></i> ${escapeHtml(text)}`;
  pill.classList.toggle("connected", connected);
}
function getLocalQuestions() {
  const stored = readLocal(QUESTIONS_KEY, null);
  return stored && Array.isArray(stored) ? stored : [...localDemoQuestions];
}
function getLocalExams() {
  const stored = readLocal(EXAMS_KEY, null);
  return stored && Array.isArray(stored) ? stored : [...localDemoExams];
}

async function loadData() {
  if (!firebaseReady) {
    questions = getLocalQuestions();
    exams = getLocalExams();
    setStatus("Đang ở chế độ demo", false);
    return;
  }
  try {
    const { ref, get } = firebaseSdk;
    const [qSnap, eSnap] = await Promise.all([
      get(ref(database, "questionsPublic")),
      get(ref(database, "exams"))
    ]);
    const publicQuestions = qSnap.exists() ? qSnap.val() : {};
    questions = Object.entries(publicQuestions).map(([id, q]) => ({ id, ...q }));
    const remoteExams = eSnap.exists() ? Object.entries(eSnap.val()).map(([id, exam]) => ({ id, ...exam })) : [];
    exams = remoteExams;
    setStatus("Đã kết nối Firebase", true);
    if (!questions.length) toast("Firebase đã kết nối nhưng kho câu hỏi đang trống. Hãy đăng nhập quản trị để nhập dữ liệu.", "error");
  } catch (error) {
    console.error(error);
    questions = getLocalQuestions();
    exams = getLocalExams();
    setStatus("Không đọc được dữ liệu Firebase", false);
    toast("Không tải được dữ liệu Firebase. Hãy kiểm tra Database URL và Security Rules.", "error");
  }
}

function availableSubjects() {
  const known = new Set(SUBJECTS.map(s => s.id));
  const extra = [...new Set(questions.map(q => q.subject).filter(id => id && !known.has(id)))].map(id => ({ id, name: questions.find(q => q.subject === id)?.subjectName || id, grade: 11, icon: "▣", subtitle: questions.find(q => q.subject === id)?.subjectName || id }));
  return [...SUBJECTS, ...extra];
}
function updateSubjectSelects() {
  const subjectOptions = availableSubjects().map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join("");
  for (const id of ["#practiceSubject", "#examSubjectFilter", "#qSubject", "#newExamSubject"]) {
    const el = $(id);
    if (!el) continue;
    const previous = el.value;
    const all = id === "#practiceSubject" || id === "#examSubjectFilter";
    el.innerHTML = (all ? `<option value="all">Tất cả môn học</option>` : "") + subjectOptions;
    if ([...el.options].some(option => option.value === previous)) el.value = previous;
    else if (!all) el.value = "cong-nghe";
  }
  updateTopicSelects();
}
function getTopics(subject = "all") {
  const subset = questions.filter(q => subject === "all" || q.subject === subject);
  return [...new Set(subset.map(q => q.topic).filter(Boolean))].sort((a, b) => a.localeCompare(b, "vi"));
}
function updateTopicSelects() {
  const pSubject = $("#practiceSubject")?.value || "all";
  const eSubject = $("#newExamSubject")?.value || "cong-nghe";
  const opts = (items) => `<option value="all">Tất cả chủ đề</option>${items.map(t => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join("")}`;
  if ($("#practiceTopic")) $("#practiceTopic").innerHTML = opts(getTopics(pSubject));
  if ($("#newExamTopic")) $("#newExamTopic").innerHTML = opts(getTopics(eSubject));
}
function renderSubjectCards() {
  const populated = availableSubjects().filter(s => questions.some(q => q.subject === s.id));
  $("#subjectCards").innerHTML = populated.map(s => {
    const total = questions.filter(q => q.subject === s.id).length;
    return `<button class="subject-card" data-subject-card="${s.id}"><span class="subject-icon">${s.icon}</span><strong>${escapeHtml(s.name)}</strong><small>${escapeHtml(s.subtitle)} · ${total} câu hỏi</small><span class="subject-arrow">↗</span></button>`;
  }).join("") || `<div class="panel empty-list" style="grid-column:1/-1">Kho câu hỏi chưa có dữ liệu. Quản trị viên có thể nhập câu hỏi từ file JSON.</div>`;
}
function renderStats() {
  const history = getHistory();
  const attempts = history.reduce((sum, item) => sum + (item.total || 0), 0);
  const examCount = history.filter(item => item.kind === "exam").length;
  const streak = Math.max(0, Number(accountProfile?.stats?.streak) || 0);
  $("#statAnswered").textContent = attempts;
  $("#statStreak").textContent = `${streak} ngày`;
  $("#statExams").textContent = examCount;
  $("#demoHint").hidden = firebaseReady;
}
function switchView(name) {
  const viewNames = ["home", "practice", "exams", "history", "top", "community", "admin"];
  if (!viewNames.includes(name)) name = "home";
  if (name === "admin" && (!firebaseReady || !currentUser || !isAdmin)) {
    toast("Khu vực quản trị chỉ dành cho tài khoản có quyền Admin.", "error");
    if (!currentUser) openAuth();
    return;
  }
  $$(".view").forEach(v => v.classList.toggle("active", v.id === `view-${name}`));
  $$(".nav-item[data-view]").forEach(b => b.classList.toggle("active", b.dataset.view === name));
  const titles = { home: "Tổng quan", practice: "Luyện tập", exams: "Thi thử", history: "Lịch sử học", top: "TOP", community: "Cộng đồng", admin: "Quản trị câu hỏi" };
  $("#pageTitle").textContent = titles[name];
  $("#sidebar").classList.remove("open");
  if (name === "history") renderHistory();
  if (name === "exams") renderExams();
  if (name === "admin") renderAdminQuestions();
  if (name === "top") loadTop();
  if (name === "community") loadCommunity();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function getHistory() { return readLocal(HISTORY_KEY, localHistory); }
async function refreshHistory() {
  if (firebaseReady && currentUser) {
    try {
      const snapshot = await firebaseSdk.get(firebaseSdk.ref(database, `users/${currentUser.uid}/history`));
      if (snapshot.exists()) {
        const remote = Object.entries(snapshot.val()).map(([id, row]) => ({ id, ...row }));
        localHistory = remote.sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
        writeLocal(HISTORY_KEY, localHistory);
      }
    } catch (error) { console.warn("History sync failed", error); }
  }
  renderStats();
  if ($("#view-history").classList.contains("active")) renderHistory();
}
async function saveHistory(entry) {
  const record = { id: uid("history"), submittedAt: Date.now(), ...entry };
  localHistory = [record, ...getHistory()].slice(0, 100);
  writeLocal(HISTORY_KEY, localHistory);
  if (firebaseReady && currentUser) {
    try {
      const safe = { ...record };
      delete safe.id;
      await firebaseSdk.set(firebaseSdk.ref(database, `users/${currentUser.uid}/history/${record.id}`), safe);
      if (functionsService) {
        const callable = firebaseSdk.httpsCallable(functionsService, "recordLearningActivity");
        const activity = await callable({ scorePercent: Number(record.scorePercent || 0), correct: Number(record.correct || 0), total: Number(record.total || 0) });
        accountProfile = { ...(accountProfile || {}), ...(activity.data || {}) };
      }
    } catch (error) { console.warn("Could not sync profile stats", error); }
  }
  renderStats();
  return record;
}
function renderHistory() {
  const history = getHistory().sort((a, b) => (b.submittedAt || 0) - (a.submittedAt || 0));
  const total = history.length;
  const scores = history.filter(h => typeof h.scorePercent === "number").map(h => h.scorePercent);
  $("#historyTotal").textContent = total;
  $("#historyAverage").textContent = scores.length ? `${Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)}%` : "—";
  $("#historyBest").textContent = scores.length ? `${Math.max(...scores)}%` : "—";
  $("#historyList").innerHTML = total ? history.map(h => `<div class="history-row"><div class="history-type">${h.kind === "exam" ? "▤" : "✎"}</div><div class="history-copy"><strong>${escapeHtml(h.title || (h.kind === "exam" ? "Bài thi" : "Luyện tập"))}</strong><small>${new Date(h.submittedAt || Date.now()).toLocaleString("vi-VN")} · ${h.total || 0} câu</small></div><span class="history-score">${typeof h.scorePercent === "number" ? `${h.scorePercent}%` : `${h.correct || 0}/${h.total || 0}`}</span></div>`).join("") : `<div class="empty-list">Chưa có lịch sử học tập. Hãy hoàn thành một lượt luyện tập để xem tiến độ tại đây.</div>`;
}
function renderExams() {
  const subject = $("#examSubjectFilter").value || "all";
  const grade = Number($("#examGradeFilter").value || 11);
  const list = exams.filter(e => (subject === "all" || e.subject === subject) && Number(e.grade || 11) === grade);
  $("#examCount").textContent = `${list.length} đề thi`;
  $("#examCards").innerHTML = list.length ? list.map(exam => `<article class="exam-card"><div class="exam-card-top"><span class="exam-tag">${escapeHtml(availableSubjects().find(s => s.id === exam.subject)?.name || "Công nghệ")}</span><span class="subtle-text">Lớp ${exam.grade || 11}</span></div><h3>${escapeHtml(exam.title)}</h3><div class="exam-meta"><span>◷ ${exam.durationMinutes || 45} phút</span><span>▤ ${(exam.questionIds || []).length} câu</span><span>${exam.demo ? "Đề demo" : "Đề chính thức"}</span></div><button class="btn btn-secondary start-exam" data-exam-id="${escapeHtml(exam.id)}">Vào thi thử <span>→</span></button></article>`).join("") : `<div class="panel empty-list" style="grid-column:1/-1">Chưa có đề thi phù hợp. Quản trị viên có thể tạo đề mới trong mục Quản trị câu hỏi.</div>`;
}

function startPractice() {
  const subject = $("#practiceSubject").value;
  const topic = $("#practiceTopic").value;
  const countValue = $("#practiceCount").value;
  let pool = questions.filter(q => (subject === "all" || q.subject === subject) && (topic === "all" || q.topic === topic));
  if (!pool.length) { toast("Chưa có câu hỏi phù hợp. Hãy thêm câu hỏi vào kho.", "error"); return; }
  pool = shuffle(pool);
  if (countValue !== "all") pool = pool.slice(0, Number(countValue));
  activePractice = { pool, index: 0, correct: 0, answered: 0, locked: false, startedAt: Date.now() };
  renderPracticeQuestion();
}
function renderPracticeQuestion() {
  if (!activePractice) return;
  const state = activePractice;
  if (state.index >= state.pool.length) { finishPractice(); return; }
  const q = state.pool[state.index];
  const options = Object.entries(q.options || {});
  $("#practiceStage").innerHTML = `
    <div class="question-head"><span class="eyebrow muted">${escapeHtml(q.topic || "ÔN TẬP")}</span><span class="question-count">Câu ${state.index + 1} / ${state.pool.length}</span></div>
    <div class="question-progress"><span style="width:${(state.index / state.pool.length) * 100}%"></span></div>
    <h2 class="question-text">${escapeHtml(q.question)}</h2>
    <div class="answer-options">${options.map(([letter, text]) => `<button class="answer-option" data-answer="${escapeHtml(letter)}"><span class="answer-letter">${escapeHtml(letter)}</span><span>${escapeHtml(text)}</span></button>`).join("")}</div>
    <div id="practiceFeedback"></div>
    <div class="question-footer"><span class="subtle-text">Đã trả lời đúng: ${state.correct}</span><button class="btn btn-primary" id="nextPractice" disabled>${state.index === state.pool.length - 1 ? "Hoàn thành" : "Câu tiếp theo"} →</button></div>`;
  $$(".answer-option", $("#practiceStage")).forEach(button => button.addEventListener("click", () => answerPractice(button.dataset.answer)));
  $("#nextPractice").addEventListener("click", () => { state.index++; state.locked = false; renderPracticeQuestion(); });
}
function answerPractice(answer) {
  if (!activePractice || activePractice.locked) return;
  activePractice.locked = true;
  activePractice.answered++;
  const q = activePractice.pool[activePractice.index];
  const correct = answer === q.correctAnswer;
  if (correct) activePractice.correct++;
  $$(".answer-option", $("#practiceStage")).forEach(button => {
    button.disabled = true;
    if (button.dataset.answer === q.correctAnswer) button.classList.add("correct");
    else if (button.dataset.answer === answer) button.classList.add("wrong");
  });
  $("#practiceFeedback").innerHTML = `<div class="feedback-box ${correct ? "good" : "bad"}"><strong>${correct ? "✓ Chính xác!" : "✕ Chưa chính xác"} · Đáp án ${escapeHtml(q.correctAnswer)}</strong><p>${escapeHtml(q.explanation || "Chưa có lời giải thích cho câu hỏi này.")}</p></div>`;
  $("#nextPractice").disabled = false;
}
async function finishPractice() {
  const state = activePractice;
  activePractice = null;
  const percent = state.answered ? Math.round(state.correct / state.answered * 100) : 0;
  await saveHistory({ kind: "practice", title: "Luyện tập ngẫu nhiên · Công nghệ 11", total: state.answered, correct: state.correct, scorePercent: percent, durationSeconds: Math.round((Date.now() - state.startedAt) / 1000) });
  $("#practiceStage").innerHTML = `<div class="empty-state"><div class="empty-illustration">✦</div><h3>Hoàn thành lượt luyện tập!</h3><p>Bạn đã trả lời đúng ${state.correct}/${state.answered} câu.</p><div class="result-score">${percent}%</div><button class="btn btn-primary" id="practiceAgain">Luyện tập lượt mới ↗</button></div>`;
  $("#practiceAgain").addEventListener("click", startPractice);
}

function getExamQuestions(exam) {
  return (exam.questionIds || []).map(id => questions.find(q => q.id === id)).filter(Boolean);
}
function startExam(examId) {
  const exam = exams.find(e => e.id === examId);
  if (!exam) { toast("Không tìm thấy đề thi.", "error"); return; }
  if (!exam.demo && firebaseReady && !currentUser) { toast("Đăng nhập trước khi làm đề thi chính thức để lưu kết quả.", "error"); openAuth(); return; }
  const selected = getExamQuestions(exam);
  if (!selected.length) { toast("Đề thi chưa có câu hỏi hoặc dữ liệu không đầy đủ.", "error"); return; }
  activeExam = { exam, selected, answers: {}, startedAt: Date.now(), remaining: Math.max(1, Number(exam.durationMinutes || 45)) * 60, submitted: false };
  renderExamWorkspace();
  clearInterval(examTimer);
  examTimer = setInterval(() => {
    if (!activeExam || activeExam.submitted) return;
    activeExam.remaining--;
    const timer = $("#examTimer");
    if (timer) timer.textContent = formatTime(activeExam.remaining);
    if (activeExam.remaining <= 0) submitExam(true);
  }, 1000);
  $("#examWorkspace").scrollIntoView({ behavior: "smooth", block: "start" });
}
function formatTime(seconds) { const m = Math.floor(seconds / 60).toString().padStart(2, "0"); const s = (seconds % 60).toString().padStart(2, "0"); return `${m}:${s}`; }
function renderExamWorkspace() {
  const { exam, selected, remaining } = activeExam;
  const html = selected.map((q, index) => `<div class="exam-question"><h3>Câu ${index + 1}. ${escapeHtml(q.question)}</h3><div class="exam-options">${Object.entries(q.options || {}).map(([letter, label]) => `<label class="exam-radio"><input type="radio" name="exam-${index}" value="${escapeHtml(letter)}" data-exam-answer="${escapeHtml(q.id)}"><span><b>${escapeHtml(letter)}.</b> ${escapeHtml(label)}</span></label>`).join("")}</div></div>`).join("");
  $("#examWorkspace").hidden = false;
  $("#examWorkspace").innerHTML = `<div class="panel-title"><div><span class="eyebrow muted">ĐANG LÀM BÀI</span><h2>${escapeHtml(exam.title)}</h2><span class="subtle-text">${selected.length} câu · ${exam.durationMinutes || 45} phút</span></div><span class="timer-pill" id="examTimer">${formatTime(remaining)}</span></div><div class="exam-all-questions">${html}</div><div class="exam-submit-row"><span class="subtle-text">Hãy kiểm tra đáp án trước khi nộp bài.</span><button class="btn btn-primary" id="submitExam">Nộp bài thi</button></div>`;
  $$('[data-exam-answer]', $("#examWorkspace")).forEach(input => input.addEventListener("change", () => { activeExam.answers[input.dataset.examAnswer] = input.value; }));
  $("#submitExam").addEventListener("click", () => submitExam(false));
}
async function submitExam(autoSubmitted = false) {
  if (!activeExam || activeExam.submitted) return;
  const state = activeExam;
  if (!autoSubmitted && !confirm("Bạn chắc chắn muốn nộp bài thi?")) return;
  state.submitted = true;
  clearInterval(examTimer);
  const exam = state.exam;
  let result;
  if (exam.demo || !firebaseReady) {
    let correct = 0;
    const review = state.selected.map(q => {
      const userAnswer = state.answers[q.id] || "";
      const isCorrect = userAnswer === q.correctAnswer;
      if (isCorrect) correct++;
      return { question: q.question, userAnswer, correctAnswer: q.correctAnswer, explanation: q.explanation || "", isCorrect, options: q.options };
    });
    result = { correct, total: state.selected.length, scorePercent: Math.round(correct / state.selected.length * 100), review };
  } else {
    try {
      const callable = firebaseSdk.httpsCallable(functionsService, "submitExam");
      const response = await callable({ examId: exam.id, answers: state.answers, durationSeconds: Math.round((Date.now() - state.startedAt) / 1000) });
      result = response.data;
    } catch (error) {
      console.error(error);
      toast(`Không thể nộp bài an toàn: ${error.message || error.code || "Lỗi máy chủ"}`, "error");
      state.submitted = false;
      return;
    }
  }
  const percent = Number(result.scorePercent ?? Math.round((result.correct / Math.max(1, result.total)) * 100));
  const review = result.review || [];
  lastResult = { ...result, scorePercent: percent, review, examTitle: exam.title };
  if (exam.demo || !firebaseReady) {
    await saveHistory({ kind: "exam", title: exam.title, total: result.total, correct: result.correct, scorePercent: percent, durationSeconds: Math.round((Date.now() - state.startedAt) / 1000) });
  } else {
    // Secure Cloud Function records the result in the authenticated user's history.
    await refreshHistory();
  }
  activeExam = null;
  renderExamResult(lastResult, autoSubmitted);
}
function renderExamResult(result, autoSubmitted = false) {
  const reviewHtml = result.review.map((item, index) => `<article class="review-item"><strong>${item.isCorrect ? "✓" : "✕"} Câu ${index + 1} · ${item.isCorrect ? "Đúng" : "Sai / chưa trả lời"}</strong><p>${escapeHtml(item.question)}</p><p>Đáp án của bạn: ${escapeHtml(item.userAnswer || "Chưa chọn")} · Đáp án đúng: ${escapeHtml(item.correctAnswer || "—")}</p><p>${escapeHtml(item.explanation || "Chưa có giải thích.")}</p></article>`).join("");
  $("#examWorkspace").innerHTML = `<div class="result-banner"><div><span class="eyebrow muted">${autoSubmitted ? "HẾT GIỜ · ĐÃ TỰ ĐỘNG NỘP" : "KẾT QUẢ BÀI THI"}</span><h2>${escapeHtml(result.examTitle || "Hoàn thành bài thi")}</h2><span class="subtle-text">Bạn trả lời đúng ${result.correct}/${result.total} câu.</span></div><div class="result-score">${result.scorePercent}%</div></div><div class="result-review">${reviewHtml || `<div class="empty-list">Không có dữ liệu xem lại câu trả lời.</div>`}</div><div class="form-actions"><button class="btn btn-primary" id="backToExamList">Quay lại danh sách đề</button><button class="btn btn-secondary" id="goHistory">Xem lịch sử</button></div>`;
  $("#backToExamList").addEventListener("click", () => { $("#examWorkspace").hidden = true; $("#examWorkspace").innerHTML = ""; renderExams(); });
  $("#goHistory").addEventListener("click", () => switchView("history"));
}

async function saveQuestionRecord(question) {
  if (!firebaseReady || !currentUser || !isAdmin) throw new Error("Chỉ tài khoản Admin đã đăng nhập mới được quản lý câu hỏi.");
  if (!firebaseReady) {
    const index = questions.findIndex(q => q.id === question.id);
    if (index >= 0) questions[index] = question; else questions.unshift(question);
    writeLocal(QUESTIONS_KEY, questions);
    return;
  }
  if (!isAdmin) throw new Error("Bạn không có quyền quản trị.");
  const { ref, set } = firebaseSdk;
  const publicData = { subject: question.subject, subjectName: question.subjectName, grade: question.grade, topic: question.topic, type: question.type, question: question.question, options: question.options, updatedAt: Date.now() };
  const keyData = { correctAnswer: question.correctAnswer, explanation: question.explanation || "" };
  await Promise.all([
    set(ref(database, `questionsPublic/${question.id}`), publicData),
    set(ref(database, `questionKeys/${question.id}`), keyData)
  ]);
  const index = questions.findIndex(q => q.id === question.id);
  if (index >= 0) questions[index] = question; else questions.unshift(question);
}
async function deleteQuestionRecord(id) {
  if (!firebaseReady || !currentUser || !isAdmin) throw new Error("Chỉ tài khoản Admin đã đăng nhập mới được xóa câu hỏi.");
  if (!firebaseReady) {
    questions = questions.filter(q => q.id !== id);
    writeLocal(QUESTIONS_KEY, questions);
    return;
  }
  if (!isAdmin) throw new Error("Bạn không có quyền quản trị.");
  await Promise.all([
    firebaseSdk.remove(firebaseSdk.ref(database, `questionsPublic/${id}`)),
    firebaseSdk.remove(firebaseSdk.ref(database, `questionKeys/${id}`))
  ]);
  questions = questions.filter(q => q.id !== id);
}
function renderAdminQuestions() {
  if (!firebaseReady || !currentUser || !isAdmin) {
    $("#questionTotal").textContent = "—";
    $("#exportQuestionCount").textContent = "—";
    $("#adminQuestionList").innerHTML = '<div class="empty-list">Khu vực này chỉ hiển thị với tài khoản Admin.</div>';
    return;
  }
  $("#questionTotal").textContent = questions.length;
  $("#exportQuestionCount").textContent = `${questions.length} câu hỏi`;
  const keyword = ($("#questionSearch").value || "").trim().toLocaleLowerCase("vi");
  const filtered = questions.filter(q => `${q.question} ${q.topic}`.toLocaleLowerCase("vi").includes(keyword));
  $("#adminQuestionList").innerHTML = filtered.length ? filtered.map(q => `<div class="question-list-item"><div><strong>${escapeHtml(q.question)}</strong><small>${escapeHtml(q.topic || "Chưa phân chủ đề")} · ${escapeHtml(q.correctAnswer || "?")} · ${escapeHtml(q.id)}</small></div><div class="mini-actions"><button data-edit-question="${escapeHtml(q.id)}">Sửa</button><button class="delete" data-delete-question="${escapeHtml(q.id)}">×</button></div></div>`).join("") : `<div class="empty-list">Không tìm thấy câu hỏi.</div>`;
}
function resetQuestionForm() {
  $("#questionForm").reset();
  $("#editQuestionId").value = "";
  $("#questionFormTitle").textContent = "Thêm câu hỏi mới";
  $("#qSubject").value = "cong-nghe";
  $("#qCorrect").value = "A";
}
function editQuestion(id) {
  if (!firebaseReady || !currentUser || !isAdmin) return;
  const q = questions.find(item => item.id === id);
  if (!q) return;
  $("#editQuestionId").value = id;
  $("#questionFormTitle").textContent = "Chỉnh sửa câu hỏi";
  $("#qSubject").value = q.subject || "cong-nghe";
  $("#qTopic").value = q.topic || "";
  $("#qText").value = q.question || "";
  for (const letter of letters) $(`#opt${letter}`).value = q.options?.[letter] || "";
  $("#qCorrect").value = q.correctAnswer || "A";
  $("#qExplanation").value = q.explanation || "";
  $("#questionForm").scrollIntoView({ behavior: "smooth", block: "start" });
}
async function handleQuestionSubmit(event) {
  event.preventDefault();
  if (!firebaseReady || !currentUser || !isAdmin) { toast("Chỉ tài khoản Admin đã đăng nhập mới được lưu câu hỏi.", "error"); return; }
  const options = Object.fromEntries(letters.filter(letter => $(`#opt${letter}`).value.trim()).map(letter => [letter, $(`#opt${letter}`).value.trim()]));
  const correctAnswer = $("#qCorrect").value;
  if (!options[correctAnswer]) { toast("Đáp án đúng phải có nội dung.", "error"); return; }
  const subject = $("#qSubject").value;
  const question = { id: $("#editQuestionId").value || uid("q"), subject, subjectName: availableSubjects().find(s => s.id === subject)?.name || subject, grade: 11, topic: $("#qTopic").value.trim(), type: "mcq", question: $("#qText").value.trim(), options, correctAnswer, explanation: $("#qExplanation").value.trim() };
  try {
    await saveQuestionRecord(question);
    updateSubjectSelects(); renderSubjectCards(); renderAdminQuestions(); renderExams(); resetQuestionForm(); toast("Đã lưu câu hỏi.");
  } catch (error) { toast(error.message || "Không thể lưu câu hỏi.", "error"); }
}
async function makeExam(event) {
  event.preventDefault();
  if (!firebaseReady || !currentUser || !isAdmin) { toast("Chỉ tài khoản Admin đã đăng nhập mới được tạo đề thi.", "error"); return; }
  const subject = $("#newExamSubject").value;
  const topic = $("#newExamTopic").value;
  const count = Number($("#newExamCount").value);
  const durationMinutes = Number($("#newExamMinutes").value);
  const pool = shuffle(questions.filter(q => q.subject === subject && (topic === "all" || q.topic === topic)));
  if (!pool.length) { toast("Kho câu hỏi chưa có dữ liệu phù hợp.", "error"); return; }
  if (count > pool.length) { toast(`Chỉ có ${pool.length} câu phù hợp với điều kiện này.`, "error"); return; }
  const selected = pool.slice(0, count);
  const id = uid("exam");
  const exam = { id, title: $("#newExamTitle").value.trim(), subject, grade: 11, durationMinutes, questionIds: selected.map(q => q.id), createdAt: Date.now(), published: true };
  try {
    if (firebaseReady) {
      const publicExam = { ...exam }; delete publicExam.id;
      const examKey = Object.fromEntries(selected.map(q => [q.id, { correctAnswer: q.correctAnswer, explanation: q.explanation || "" }]));
      await Promise.all([
        firebaseSdk.set(firebaseSdk.ref(database, `exams/${id}`), publicExam),
        firebaseSdk.set(firebaseSdk.ref(database, `examKeys/${id}`), examKey)
      ]);
    } else {
      exam.demo = true;
      exams.unshift(exam);
      writeLocal(EXAMS_KEY, exams);
    }
    if (firebaseReady) exams.unshift(exam);
    renderExams(); toast("Đã tạo đề thi mới."); $("#newExamTitle").value = "";
    switchView("exams");
  } catch (error) { toast(error.message || "Không thể tạo đề thi.", "error"); }
}

function normalizeQuestion(raw, index) {
  const question = String(raw.question || raw.text || "").trim();
  const options = raw.options || raw.choices || {};
  const normalizedOptions = Array.isArray(options)
    ? Object.fromEntries(options.slice(0, 4).map((text, i) => [letters[i], String(text)]))
    : Object.fromEntries(letters.filter(letter => options[letter] != null && String(options[letter]).trim()).map(letter => [letter, String(options[letter]).trim()]));
  const correctAnswer = String(raw.correctAnswer || raw.answer || "").trim().toUpperCase();
  if (!question || Object.keys(normalizedOptions).length < 2 || !normalizedOptions[correctAnswer]) throw new Error(`Câu ${index + 1}: thiếu nội dung, đáp án lựa chọn hoặc đáp án đúng hợp lệ.`);
  return { id: raw.id || uid("import"), subject: raw.subject || "cong-nghe", subjectName: raw.subjectName || "Công nghệ", grade: Number(raw.grade || 11), topic: raw.topic || "Chưa phân chủ đề", type: raw.type || "mcq", question, options: normalizedOptions, correctAnswer, explanation: String(raw.explanation || "") };
}
async function runImport() {
  if (!importFileContent) return;
  if (!firebaseReady || !currentUser || !isAdmin) { toast("Chỉ tài khoản Admin đã đăng nhập mới được nhập dữ liệu.", "error"); return; }
  const status = $("#importStatus");
  try {
    const parsed = JSON.parse(importFileContent);
    const list = Array.isArray(parsed) ? parsed : parsed.questions;
    if (!Array.isArray(list) || !list.length) throw new Error("File cần chứa một mảng câu hỏi hoặc thuộc tính questions.");
    const normalized = list.map(normalizeQuestion);
    for (const question of normalized) await saveQuestionRecord(question);
    updateSubjectSelects(); renderSubjectCards(); renderAdminQuestions(); renderExams();
    status.textContent = `Đã nhập thành công ${normalized.length} câu hỏi.`;
    toast(`Đã nhập ${normalized.length} câu hỏi.`);
    importFileContent = null; $("#importFile").value = ""; $("#runImport").disabled = true;
  } catch (error) { status.textContent = error.message; toast(error.message, "error"); }
}
function exportQuestions() {
  if (!firebaseReady || !currentUser || !isAdmin) { toast("Chỉ tài khoản Admin mới được xuất kho câu hỏi.", "error"); return; }
  const payload = { app: "OnTap", version: 1, exportedAt: new Date().toISOString(), questions };
  downloadFile("ontap-question-bank.json", JSON.stringify(payload, null, 2), "application/json");
}
function downloadFile(name, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = name; a.click(); URL.revokeObjectURL(url);
}
function downloadTemplate() {
  const sample = { questions: [{ subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Vật liệu cơ khí", type: "mcq", question: "Nội dung câu hỏi?", options: { A: "Đáp án A", B: "Đáp án B", C: "Đáp án C", D: "Đáp án D" }, correctAnswer: "A", explanation: "Giải thích đáp án." }] };
  downloadFile("ontap-import-template.json", JSON.stringify(sample, null, 2), "application/json");
}

function deviceSummary() {
  const ua = navigator.userAgent || "Unknown device";
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : "Trình duyệt khác";
  const platform = /Android/i.test(ua) ? "Android" : /iPhone|iPad|iPod/i.test(ua) ? "iOS" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : "Thiết bị khác";
  return { browser, platform, language: navigator.language || "vi", updatedAt: Date.now() };
}
async function ensureUserProfile(user) {
  if (!firebaseReady || !user) return null;
  const profileRef = firebaseSdk.ref(database, `users/${user.uid}/profile`);
  const snap = await firebaseSdk.get(profileRef);
  const device = deviceSummary();
  const base = { uid: user.uid, email: user.email || "", displayName: user.displayName || (user.email || "Học sinh").split("@")[0], role: "member", stats: { streak: 0, totalScore: 0, totalCorrect: 0, totalAnswered: 0, lastStudyDate: "" }, createdAt: Date.now() };
  if (!snap.exists()) await firebaseSdk.set(profileRef, base);
  await firebaseSdk.update(profileRef, { lastLogin: { timestamp: Date.now(), device } });
  const fresh = await firebaseSdk.get(profileRef);
  return fresh.val() || base;
}
function renderTop() {
  const scoreMode = topMode === "score";
  const rows = [...leaderboardRows].sort((a, b) => {
    const primary = scoreMode ? (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0) : (Number(b.streak) || 0) - (Number(a.streak) || 0);
    if (primary) return primary;
    const secondary = scoreMode ? (Number(b.streak) || 0) - (Number(a.streak) || 0) : (Number(b.totalScore) || 0) - (Number(a.totalScore) || 0);
    return secondary || String(a.displayName || "").localeCompare(String(b.displayName || ""), "vi");
  }).slice(0, 50);
  $("#topHeading").textContent = scoreMode ? "TOP điểm tích lũy" : "TOP chuỗi ngày học";
  $("#topDescription").textContent = scoreMode
    ? "Xếp hạng theo tổng điểm tích lũy. Khi bằng điểm, thành viên có chuỗi dài hơn được xếp trước."
    : "Xếp hạng theo số ngày học liên tiếp. Khi bằng chuỗi, thành viên có tổng điểm cao hơn được xếp trước.";
  $("#topList").innerHTML = rows.length ? rows.map((row, index) => {
    const primary = scoreMode ? (Number(row.totalScore) || 0) : (Number(row.streak) || 0);
    const secondary = scoreMode ? `${Number(row.streak) || 0} ngày liên tiếp` : `${Number(row.totalScore) || 0} điểm tích lũy`;
    const position = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : `#${index + 1}`;
    const isYou = currentUser && row.uid === currentUser.uid;
    return `<div class="top-row${isYou ? " is-you" : ""}">
      <div class="top-position">${position}</div>
      <div class="top-user"><strong>${escapeHtml(row.displayName || "Học sinh")}${isYou ? '<span class="you-tag">Bạn</span>' : ""}</strong><small>${secondary}</small></div>
      <div class="top-value"><strong>${primary.toLocaleString("vi-VN")}</strong><small>${scoreMode ? "điểm" : "ngày"}</small></div>
    </div>`;
  }).join("") : '<div class="empty-list">Chưa có thành viên trên bảng xếp hạng. Hãy hoàn thành một lượt học để ghi nhận thành tích.</div>';
}
async function loadTop() {
  if (!firebaseReady) {
    leaderboardRows = [];
    $("#topList").innerHTML = '<div class="empty-list">Bảng TOP trực tuyến sẽ hiển thị sau khi kết nối Firebase.</div>';
    return;
  }
  $("#topList").innerHTML = '<div class="empty-list">Đang tải bảng xếp hạng...</div>';
  try {
    const boardSnap = await firebaseSdk.get(firebaseSdk.ref(database, "leaderboard"));
    leaderboardRows = boardSnap.exists()
      ? Object.entries(boardSnap.val()).map(([uid, row]) => ({ uid, ...row }))
      : [];
    renderTop();
  } catch (error) {
    console.warn("Leaderboard load failed", error);
    $("#topList").innerHTML = '<div class="empty-list">Không tải được TOP. Hãy kiểm tra quyền đọc leaderboard trong Firebase Rules.</div>';
  }
}
async function loadCommunity() {
  if (!firebaseReady || !currentUser) {
    $("#profileStreak").textContent = "0";
    $("#profileScore").textContent = "0";
    $("#profileRank").textContent = "—";
    $("#profileDetails").textContent = "Đăng nhập để xem UID, thông tin phiên và đồng bộ hồ sơ.";
    return;
  }
  try {
    const [boardSnap, profileSnap] = await Promise.all([
      firebaseSdk.get(firebaseSdk.ref(database, "leaderboard")),
      firebaseSdk.get(firebaseSdk.ref(database, `users/${currentUser.uid}/profile`))
    ]);
    const rows = boardSnap.exists()
      ? Object.entries(boardSnap.val()).map(([uid, row]) => ({ uid, ...row })).sort((a, b) => (Number(b.rankingScore) || 0) - (Number(a.rankingScore) || 0))
      : [];
    if (profileSnap.exists()) {
      const profile = profileSnap.val();
      const stats = profile.stats || {};
      accountProfile = { ...(accountProfile || {}), ...profile };
      $("#profileStreak").textContent = Number(stats.streak) || 0;
      $("#profileScore").textContent = Number(stats.totalScore) || 0;
      const rank = rows.findIndex(row => row.uid === currentUser.uid);
      $("#profileRank").textContent = rank >= 0 ? `#${rank + 1}` : "—";
      const last = profile.lastLogin || {};
      const device = last.device || {};
      $("#profileDetails").innerHTML = `<div><b>Email:</b> ${escapeHtml(profile.email || currentUser.email || "")}</div><div><b>UID:</b> <code>${escapeHtml(currentUser.uid)}</code></div><div><b>Quyền:</b> ${escapeHtml(accountRole)}</div><div><b>Đăng nhập gần nhất:</b> ${last.timestamp ? new Date(last.timestamp).toLocaleString("vi-VN") : "—"}</div><div><b>Thiết bị:</b> ${escapeHtml([device.platform, device.browser].filter(Boolean).join(" · ") || "Chưa có dữ liệu")}</div>`;
      renderStats();
    } else {
      $("#profileDetails").textContent = "Chưa tìm thấy hồ sơ tài khoản.";
    }
  } catch (error) {
    console.warn("Community profile load failed", error);
    $("#profileDetails").textContent = "Không tải được hồ sơ. Hãy kiểm tra Firebase Rules.";
  }
}
async function createBattleRoom() {
  if (!currentUser || !firebaseReady) { toast("Bạn cần đăng nhập để tạo phòng đấu.", "error"); openAuth(); return; }
  const code = Math.random().toString(36).slice(2,8).toUpperCase(); const mode = $("#battleMode").value;
  try {
    await firebaseSdk.set(firebaseSdk.ref(database, `battles/${code}`), { code, mode, status: "waiting", hostUid: currentUser.uid, hostName: currentUser.email || "Thành viên", createdAt: Date.now(), participants: { [currentUser.uid]: { name: currentUser.email || "Thành viên", joinedAt: Date.now() } } });
    $("#battleStatus").textContent = `Đã tạo phòng ${code}. Gửi mã này cho bạn bè để tham gia.`; $("#battleCode").value = code;
  } catch (e) { $("#battleStatus").textContent = "Không tạo được phòng. Kiểm tra quyền Firebase Database."; }
}
async function joinBattleRoom() {
  if (!currentUser || !firebaseReady) { toast("Bạn cần đăng nhập để tham gia phòng đấu.", "error"); openAuth(); return; }
  const code = $("#battleCode").value.trim().toUpperCase(); if (!code) return;
  try {
    const roomRef = firebaseSdk.ref(database, `battles/${code}`); const snap = await firebaseSdk.get(roomRef);
    if (!snap.exists()) { $("#battleStatus").textContent = "Không tìm thấy phòng này."; return; }
    await firebaseSdk.update(firebaseSdk.ref(database, `battles/${code}/participants/${currentUser.uid}`), { name: currentUser.email || "Thành viên", joinedAt: Date.now() });
    $("#battleStatus").textContent = snap.val().mode === "async" ? `Đã vào phòng ${code}. Hai người làm cùng đề rồi gửi kết quả để so sánh.` : `Đã vào phòng ${code}. Phòng trực tiếp đã được tạo; đồng bộ câu hỏi sẽ được mở khi triển khai bộ máy trận đấu.`;
  } catch (e) { $("#battleStatus").textContent = "Không thể tham gia. Kiểm tra Firebase Rules."; }
}

function openAuth() {
  if (!firebaseReady) { toast("Hãy điền Firebase config trong assets/js/config.js trước khi đăng nhập.", "error"); return; }
  $("#authModal").hidden = false;
  $("#authEmail").focus();
}
function closeAuth() { $("#authModal").hidden = true; $("#authStatus").textContent = ""; }
function setAuthMode(mode) {
  authMode = mode;
  $("#authTitle").textContent = mode === "login" ? "Chào mừng trở lại" : "Tạo tài khoản OnTap";
  $("#authSubmit").textContent = mode === "login" ? "Đăng nhập" : "Tạo tài khoản";
  $("#authSwitchText").textContent = mode === "login" ? "Chưa có tài khoản?" : "Đã có tài khoản?";
  $("#authSwitch").textContent = mode === "login" ? "Tạo tài khoản" : "Đăng nhập";
  $("#authPassword").autocomplete = mode === "login" ? "current-password" : "new-password";
}
async function handleAuth(event) {
  event.preventDefault();
  const email = $("#authEmail").value.trim();
  const password = $("#authPassword").value;
  $("#authSubmit").disabled = true;
  $("#authStatus").textContent = "Đang xử lý...";
  try {
    if (authMode === "login") await firebaseSdk.signInWithEmailAndPassword(authService, email, password);
    else await firebaseSdk.createUserWithEmailAndPassword(authService, email, password);
    closeAuth(); toast(authMode === "login" ? "Đăng nhập thành công." : "Tài khoản đã được tạo.");
  } catch (error) {
    $("#authStatus").textContent = authErrorMessage(error.code);
  } finally { $("#authSubmit").disabled = false; }
}
function authErrorMessage(code) {
  const messages = { "auth/invalid-credential": "Email hoặc mật khẩu chưa đúng.", "auth/email-already-in-use": "Email này đã được sử dụng.", "auth/weak-password": "Mật khẩu cần có ít nhất 6 ký tự.", "auth/invalid-email": "Địa chỉ email không hợp lệ.", "auth/too-many-requests": "Đã thử quá nhiều lần. Hãy thử lại sau." };
  return messages[code] || `Không thể xác thực (${code || "unknown"}). Hãy kiểm tra cấu hình Firebase.`;
}
async function handleSignOut() {
  if (!firebaseReady || !currentUser) { openAuth(); return; }
  try { await firebaseSdk.signOut(authService); toast("Đã đăng xuất."); }
  catch (error) { toast(error.message || "Không thể đăng xuất.", "error"); }
}
async function onUserChanged(user) {
  currentUser = user;
  isAdmin = false;
  accountRole = user ? "member" : "guest";
  accountProfile = null;

  if (user && firebaseReady) {
    try {
      accountProfile = await ensureUserProfile(user);
      const [adminSnap, vipSnap] = await Promise.all([
        firebaseSdk.get(firebaseSdk.ref(database, `admins/${user.uid}`)),
        firebaseSdk.get(firebaseSdk.ref(database, `vips/${user.uid}`))
      ]);
      isAdmin = adminSnap.val() === true;
      accountRole = isAdmin ? "admin" : vipSnap.val() === true ? "vip" : "member";
      if (isAdmin) {
        const keysSnapshot = await firebaseSdk.get(firebaseSdk.ref(database, "questionKeys"));
        const keys = keysSnapshot.val() || {};
        questions = questions.map(question => ({ ...question, ...(keys[question.id] || {}) }));
      }
    } catch (error) {
      isAdmin = false;
      accountRole = "member";
      console.warn("Account role verification failed", error);
      toast("Không xác minh được quyền tài khoản. Khu vực quản trị đã bị khóa.", "error");
    }
  }

  const name = accountProfile?.displayName || user?.email || "Khách học tập";
  const roleNames = { admin: "Quản trị viên", vip: "Thành viên VIP", member: "Thành viên", guest: "Chế độ khách" };
  $("#userName").textContent = name;
  $("#userRole").textContent = roleNames[accountRole] || "Thành viên";
  $("#avatar").textContent = name.slice(0, 1).toUpperCase();
  $("#topAuthButton").textContent = name.slice(0, 1).toUpperCase();
  $("#authButton").textContent = user ? "↪" : "↗";
  $("#authButton").title = user ? "Đăng xuất" : "Đăng nhập";

  $("#adminNavLabel").hidden = !isAdmin;
  $("#adminNavContainer").hidden = !isAdmin;
  $("#adminNavLabel").style.display = isAdmin ? "" : "none";
  $("#adminNavContainer").style.display = isAdmin ? "" : "none";
  $("#adminNav").hidden = !isAdmin;
  $("#view-admin").hidden = !isAdmin;
  $("#adminWarning").hidden = true;

  if (!isAdmin && $("#view-admin").classList.contains("active")) switchView("home");
  renderAdminQuestions();
  renderStats();
  if (firebaseReady && user) await refreshHistory();
  if ($("#view-top")?.classList.contains("active")) await loadTop();
  if ($("#view-community")?.classList.contains("active")) await loadCommunity();
}

function wireEvents() {
  $(".nav-item[data-view]").forEach(button => button.addEventListener("click", event => {
    event.preventDefault();
    switchView(button.dataset.view);
  }));
  $("#sidebar").addEventListener("click", event => {
    const button = event.target.closest(".nav-item[data-view]");
    if (button && !button.hidden && button.dataset.view !== "admin") {
      event.preventDefault();
      switchView(button.dataset.view);
    }
  });
  $$('[data-go]').forEach(button => button.addEventListener("click", () => switchView(button.dataset.go)));
  $("#menuButton").addEventListener("click", () => $("#sidebar").classList.toggle("open"));
  $("#authButton").addEventListener("click", () => currentUser ? handleSignOut() : openAuth());
  $("#topAuthButton").addEventListener("click", () => currentUser ? handleSignOut() : openAuth());
  $("#closeAuth").addEventListener("click", closeAuth);
  $("#authModal").addEventListener("click", event => { if (event.target.id === "authModal") closeAuth(); });
  $("#authSwitch").addEventListener("click", () => setAuthMode(authMode === "login" ? "signup" : "login"));
  $("#authForm").addEventListener("submit", handleAuth);
  $("#startPractice").addEventListener("click", startPractice);
  $("#createBattle").addEventListener("click", createBattleRoom);
  $("#joinBattle").addEventListener("click", joinBattleRoom);
  $$("[data-top-mode]").forEach(button => button.addEventListener("click", () => {
    topMode = button.dataset.topMode === "streak" ? "streak" : "score";
    $$("[data-top-mode]").forEach(tab => {
      const active = tab === button;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", String(active));
    });
    renderTop();
  }));
  $("#practiceSubject").addEventListener("change", updateTopicSelects);
  $("#newExamSubject").addEventListener("change", updateTopicSelects);
  $("#examSubjectFilter").addEventListener("change", renderExams);
  $("#examGradeFilter").addEventListener("change", renderExams);
  $("#examCards").addEventListener("click", event => { const button = event.target.closest(".start-exam"); if (button) startExam(button.dataset.examId); });
  $$(".admin-tab").forEach(button => button.addEventListener("click", () => {
    $$(".admin-tab").forEach(b => b.classList.toggle("active", b === button));
    $$(".admin-pane").forEach(p => p.classList.toggle("active", p.id === `admin-${button.dataset.adminTab}`));
  }));
  $("#questionForm").addEventListener("submit", handleQuestionSubmit);
  $("#resetQuestionForm").addEventListener("click", resetQuestionForm);
  $("#questionSearch").addEventListener("input", renderAdminQuestions);
  $("#adminQuestionList").addEventListener("click", async event => {
    const edit = event.target.closest("[data-edit-question]");
    const del = event.target.closest("[data-delete-question]");
    if (edit) editQuestion(edit.dataset.editQuestion);
    if (del && confirm("Xóa câu hỏi này khỏi kho?")) {
      try { await deleteQuestionRecord(del.dataset.deleteQuestion); renderAdminQuestions(); updateSubjectSelects(); renderSubjectCards(); toast("Đã xóa câu hỏi."); }
      catch (error) { toast(error.message || "Không thể xóa câu hỏi.", "error"); }
    }
  });
  $("#createExamForm").addEventListener("submit", makeExam);
  $("#roleForm")?.addEventListener("submit", async event => {
    event.preventDefault(); if (!isAdmin || !firebaseReady) return;
    const targetUid = $("#roleUid").value.trim(); const role = $("#roleValue").value; $("#roleStatus").textContent = "Đang cập nhật...";
    try { const call = firebaseSdk.httpsCallable(functionsService, "setAccountRole"); await call({ uid: targetUid, role }); $("#roleStatus").textContent = `Đã cập nhật quyền ${role} cho UID ${targetUid}.`; }
    catch (e) { $("#roleStatus").textContent = e.message || "Không thể cập nhật quyền."; }
  });
  $("#importFile").addEventListener("change", async event => {
    const file = event.target.files?.[0];
    if (!file) return;
    try { importFileContent = await file.text(); $("#runImport").disabled = false; $("#importStatus").textContent = `Đã chọn ${file.name}.`; }
    catch { importFileContent = null; $("#runImport").disabled = true; $("#importStatus").textContent = "Không thể đọc file."; }
  });
  $("#runImport").addEventListener("click", runImport);
  $("#downloadTemplate").addEventListener("click", downloadTemplate);
  $("#exportQuestions").addEventListener("click", exportQuestions);
  $("#clearLocalHistory").addEventListener("click", () => {
    if (!confirm("Xóa lịch sử học tập đã lưu trên thiết bị này?")) return;
    localHistory = []; writeLocal(HISTORY_KEY, []); renderHistory(); renderStats(); toast("Đã xóa lịch sử trên thiết bị.");
  });
  $("#setupHintButton").addEventListener("click", () => toast("Mở README.md trong gói OnTap để xem hướng dẫn cấu hình Firebase từng bước."));
  $("#subjectCards").addEventListener("click", event => {
    const card = event.target.closest("[data-subject-card]");
    if (card) { switchView("practice"); $("#practiceSubject").value = card.dataset.subjectCard; updateTopicSelects(); }
  });
}

async function init() {
  $("#year").textContent = new Date().getFullYear();
  await loadData();
  updateSubjectSelects();
  renderSubjectCards();
  renderExams();
  renderStats();
  renderAdminQuestions();
  wireEvents();
  resetQuestionForm();
  if (firebaseReady) {
    firebaseSdk.onAuthStateChanged(authService, onUserChanged);
  } else {
    await onUserChanged(null);
  }
}

init().catch(error => {
  console.error(error);
  toast("OnTap gặp lỗi khi khởi động. Hãy kiểm tra kết nối và console trình duyệt.", "error");
});
