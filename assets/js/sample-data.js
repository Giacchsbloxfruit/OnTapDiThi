// Starter questions are drawn from the supplied Công nghệ cơ khí 11 review papers.
// Add the rest of your class question bank via Admin > Nhập / Xuất.
export const demoQuestions = [
  {
    id: "ct11-001", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Tổng quan cơ khí",
    type: "mcq", question: "Sản phẩm nào của cơ khí chế tạo giúp nâng cao chất lượng cuộc sống?",
    options: { A: "Máy thêu công nghiệp", B: "Máy khai thác khoáng sản", C: "Máy điều hòa không khí", D: "Máy thi công đường" },
    correctAnswer: "C", explanation: "Máy điều hòa không khí là sản phẩm cơ khí góp phần nâng cao chất lượng cuộc sống."
  },
  {
    id: "ct11-002", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Tổng quan cơ khí",
    type: "mcq", question: "Đặc điểm giúp phân biệt cơ khí chế tạo với các ngành nghề khác là gì?",
    options: { A: "Sử dụng bản vẽ kĩ thuật để chế tạo sản phẩm", B: "Các thiết bị sản xuất chủ yếu là máy tính", C: "Vật liệu chế tạo chủ yếu là gỗ", D: "Quy trình có thể tự điều chỉnh, không cần bản vẽ" },
    correctAnswer: "A", explanation: "Bản vẽ kĩ thuật là cơ sở quan trọng để thiết kế và chế tạo sản phẩm cơ khí."
  },
  {
    id: "ct11-003", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Vật liệu cơ khí",
    type: "mcq", question: "Vật liệu mới là loại vật liệu nào trong các lựa chọn sau?",
    options: { A: "Hợp kim nhôm", B: "Cao su", C: "Vật liệu nano", D: "Nhựa thông thường" },
    correctAnswer: "C", explanation: "Vật liệu nano thuộc nhóm vật liệu mới được nghiên cứu và ứng dụng nhờ các tính năng đặc biệt."
  },
  {
    id: "ct11-004", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Vật liệu cơ khí",
    type: "mcq", question: "Tính chất cơ học của vật liệu không được đặc trưng bởi yếu tố nào?",
    options: { A: "Độ bền", B: "Độ dẻo", C: "Độ cứng", D: "Độ ăn mòn hóa học" },
    correctAnswer: "D", explanation: "Độ ăn mòn hóa học thuộc tính chất hóa học, không phải tính chất cơ học."
  },
  {
    id: "ct11-005", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Vật liệu cơ khí",
    type: "mcq", question: "Tính chất thể hiện khả năng gia công của vật liệu là gì?",
    options: { A: "Tính chất cơ học", B: "Tính chất vật lí", C: "Tính chất hóa học", D: "Tính chất công nghệ" },
    correctAnswer: "D", explanation: "Tính công nghệ thể hiện khả năng đúc, hàn, rèn và gia công cắt gọt của vật liệu."
  },
  {
    id: "ct11-006", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Vật liệu cơ khí",
    type: "mcq", question: "Đâu là một hợp kim màu?",
    options: { A: "Gang", B: "Thép carbon", C: "Thép hợp kim", D: "Kẽm hợp kim" },
    correctAnswer: "D", explanation: "Hợp kim kẽm không lấy sắt làm kim loại cơ bản nên thuộc nhóm hợp kim màu."
  },
  {
    id: "ct11-007", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Vật liệu cơ khí",
    type: "mcq", question: "Loại vật liệu có thể ghi nhớ được hình dạng ban đầu của nó là gì?",
    options: { A: "Vật liệu nano", B: "Vật liệu composite", C: "Vật liệu có cơ tính biến thiên", D: "Hợp kim nhớ hình" },
    correctAnswer: "D", explanation: "Hợp kim nhớ hình có khả năng trở về hình dạng đã ghi nhớ khi được kích thích trong điều kiện thích hợp."
  },
  {
    id: "ct11-008", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Gia công cơ khí",
    type: "mcq", question: "Phương pháp gia công có phoi là phương pháp nào?",
    options: { A: "Tiện", B: "Đúc", C: "Rèn", D: "Cán" },
    correctAnswer: "A", explanation: "Tiện là phương pháp gia công cắt gọt, trong quá trình gia công có tạo phoi."
  },
  {
    id: "ct11-009", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Gia công cơ khí",
    type: "mcq", question: "Để gia công các chi tiết có dạng trụ, thường chọn phương pháp gia công trên máy nào?",
    options: { A: "Máy tiện", B: "Máy phay", C: "Máy bào", D: "Máy chuốt" },
    correctAnswer: "A", explanation: "Máy tiện phù hợp để gia công các bề mặt tròn xoay như trục, ống và mặt côn."
  },
  {
    id: "ct11-010", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Gia công cơ khí",
    type: "mcq", question: "Phương pháp hàn là gì?",
    options: { A: "Rót vật liệu lỏng vào khuôn", B: "Gia công lỗ từ phôi", C: "Nối các chi tiết bằng cách nung nóng vùng nối để tạo thành mối hàn", D: "Dùng dao quay và phôi tịnh tiến để cắt gọt" },
    correctAnswer: "C", explanation: "Hàn là phương pháp nối các chi tiết; vùng nối được nung nóng hoặc dùng cách thích hợp để tạo mối hàn."
  },
  {
    id: "ct11-011", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Gia công cơ khí",
    type: "mcq", question: "Để gia công sản phẩm cơ khí có yêu cầu về cơ tính cao, thường chọn phương pháp nào?",
    options: { A: "Rèn", B: "Đúc", C: "Hàn", D: "Dũa" },
    correctAnswer: "A", explanation: "Rèn làm biến dạng kim loại ở trạng thái dẻo, thường giúp cải thiện cơ tính của sản phẩm."
  },
  {
    id: "ct11-012", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Bản vẽ và mối ghép",
    type: "mcq", question: "Hình cắt trong bản vẽ kĩ thuật dùng để làm gì?",
    options: { A: "Biểu diễn hình dáng bên ngoài", B: "Làm rõ cấu trúc bên trong khuất của vật thể", C: "Thay thế mọi hình chiếu", D: "Chỉ thể hiện kích thước tổng thể" },
    correctAnswer: "B", explanation: "Hình cắt giúp biểu diễn rõ cấu tạo bên trong của vật thể, đặc biệt là các phần khuất."
  },
  {
    id: "ct11-013", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Bản vẽ và mối ghép",
    type: "mcq", question: "Mối ghép nào cho phép tháo rời các chi tiết mà không làm hỏng phần tử ghép?",
    options: { A: "Mối ghép hàn", B: "Mối ghép đinh tán", C: "Mối ghép bằng keo dán", D: "Mối ghép ren bằng bu lông, đai ốc" },
    correctAnswer: "D", explanation: "Mối ghép ren là mối ghép tháo được; có thể tháo bu lông và đai ốc mà không phá hỏng chi tiết ghép."
  },
  {
    id: "ct11-014", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Vật liệu cơ khí",
    type: "true_false", question: "Gang là hợp kim của sắt và carbon, trong đó hàm lượng carbon lớn hơn 2,14%.",
    options: { A: "Đúng", B: "Sai" }, correctAnswer: "A", explanation: "Theo nội dung ôn tập, gang là hợp kim Fe–C có hàm lượng carbon lớn hơn 2,14%."
  },
  {
    id: "ct11-015", subject: "cong-nghe", subjectName: "Công nghệ", grade: 11, topic: "Gia công cơ khí",
    type: "true_false", question: "Quá trình vận chuyển và kiểm đếm sản phẩm là các quá trình gia công cơ khí.",
    options: { A: "Đúng", B: "Sai" }, correctAnswer: "B", explanation: "Vận chuyển và kiểm đếm không trực tiếp làm thay đổi hình dạng, kích thước hoặc tính chất vật liệu nên không phải gia công cơ khí."
  }
];

export const demoExams = [
  { id: "demo-exam-1", title: "Ôn tập tổng hợp Công nghệ 11", subject: "cong-nghe", grade: 11, durationMinutes: 25, questionIds: ["ct11-001","ct11-002","ct11-003","ct11-004","ct11-005","ct11-006","ct11-007","ct11-008","ct11-009","ct11-010"], demo: true },
  { id: "demo-exam-2", title: "Vật liệu và gia công cơ khí", subject: "cong-nghe", grade: 11, durationMinutes: 15, questionIds: ["ct11-003","ct11-004","ct11-006","ct11-007","ct11-008","ct11-009","ct11-011","ct11-014"], demo: true }
];
