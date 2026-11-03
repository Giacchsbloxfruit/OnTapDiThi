const { initializeApp } = require("firebase-admin/app");
const { getDatabase } = require("firebase-admin/database");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { logger } = require("firebase-functions");
const crypto = require("node:crypto");

const databaseURL = process.env.FIREBASE_DATABASE_URL;
if (!databaseURL) {
  logger.warn("FIREBASE_DATABASE_URL is not configured. Create functions/.env.<project-id> before deploying.");
}
const app = initializeApp(databaseURL ? { databaseURL } : undefined);
const db = getDatabase(app);

/**
 * Securely grades a published exam.
 * Public exam documents contain question IDs and timing only. Answer keys live at
 * /examKeys/<examId>, which client Security Rules deny. The Admin SDK reads keys
 * only after this callable receives an authenticated submission.
 */
exports.submitExam = onCall({ region: "asia-southeast1", enforceAppCheck: false }, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Bạn cần đăng nhập trước khi nộp đề thi.");
  }

  const examId = typeof request.data?.examId === "string" ? request.data.examId : "";
  const submittedAnswers = request.data?.answers;
  if (!examId || examId.length > 120 || !submittedAnswers || typeof submittedAnswers !== "object" || Array.isArray(submittedAnswers)) {
    throw new HttpsError("invalid-argument", "Dữ liệu bài thi không hợp lệ.");
  }

  const examSnapshot = await db.ref(`exams/${examId}`).get();
  if (!examSnapshot.exists()) {
    throw new HttpsError("not-found", "Không tìm thấy đề thi.");
  }
  const exam = examSnapshot.val();
  if (exam.published !== true || !Array.isArray(exam.questionIds) || exam.questionIds.length < 1 || exam.questionIds.length > 120) {
    throw new HttpsError("failed-precondition", "Đề thi chưa được xuất bản hoặc có cấu trúc không hợp lệ.");
  }

  const [questionsSnapshot, keysSnapshot] = await Promise.all([
    db.ref("questionsPublic").get(),
    db.ref(`examKeys/${examId}`).get()
  ]);
  const publicQuestions = questionsSnapshot.val() || {};
  const answerKeys = keysSnapshot.val() || {};
  let correct = 0;
  const review = [];

  for (const questionId of exam.questionIds) {
    const question = publicQuestions[questionId];
    const key = answerKeys[questionId];
    if (!question || !key || typeof key.correctAnswer !== "string") {
      throw new HttpsError("failed-precondition", `Câu hỏi ${questionId} đang thiếu dữ liệu đáp án.`);
    }
    const userAnswer = typeof submittedAnswers[questionId] === "string" ? submittedAnswers[questionId] : "";
    const isCorrect = userAnswer === key.correctAnswer;
    if (isCorrect) correct += 1;
    review.push({
      question: String(question.question || ""),
      options: question.options || {},
      userAnswer,
      correctAnswer: key.correctAnswer,
      explanation: String(key.explanation || ""),
      isCorrect
    });
  }

  const total = review.length;
  const scorePercent = Math.round((correct / total) * 100);
  const resultId = crypto.randomUUID();
  const result = {
    kind: "exam",
    title: String(exam.title || "Bài thi OnTap"),
    total,
    correct,
    scorePercent,
    submittedAt: Date.now(),
    durationSeconds: Math.max(0, Math.min(86400, Number(request.data?.durationSeconds) || 0))
  };

  await db.ref(`users/${request.auth.uid}/history/${resultId}`).set(result);
  logger.info("Exam submitted", { examId, uid: request.auth.uid, total, correct });

  // Return answer review only after the server has accepted the submission.
  return { ...result, review };
});

/**
 * Checks one practice answer without exposing the complete question-key collection.
 * The answer and explanation for only the requested question are returned.
 */
exports.checkPracticeAnswer = onCall({ region: "asia-southeast1", enforceAppCheck: false }, async (request) => {
  const questionId = typeof request.data?.questionId === "string" ? request.data.questionId : "";
  const answer = typeof request.data?.answer === "string" ? request.data.answer : "";
  if (!questionId || questionId.length > 160 || !["A", "B", "C", "D"].includes(answer)) {
    throw new HttpsError("invalid-argument", "Câu trả lời không hợp lệ.");
  }
  const [questionSnapshot, keySnapshot] = await Promise.all([
    db.ref(`questionsPublic/${questionId}`).get(),
    db.ref(`questionKeys/${questionId}`).get()
  ]);
  if (!questionSnapshot.exists() || !keySnapshot.exists()) {
    throw new HttpsError("not-found", "Không tìm thấy câu hỏi hoặc đáp án.");
  }
  const key = keySnapshot.val();
  return {
    isCorrect: answer === key.correctAnswer,
    correctAnswer: key.correctAnswer,
    explanation: String(key.explanation || "")
  };
});
