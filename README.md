# OnTap — Website ôn tập và thi thử

**OnTap** là website học tập dành cho học sinh THPT. Bản khởi đầu được cấu hình cho **lớp 11 – môn Công nghệ**, dùng HTML/CSS/JavaScript thuần, GitHub Pages và Firebase Realtime Database.

## 1. Có gì trong bản này?

- Trang tổng quan, chọn môn học và chủ đề.
- Luyện tập ngẫu nhiên từng câu; chọn đáp án xong mới hiện đúng/sai và giải thích.
- Thi thử có đồng hồ, nộp bài, xem kết quả và đối chiếu đáp án.
- Lịch sử làm bài, thống kê số câu, độ chính xác và điểm.
- Quản trị câu hỏi: thêm, sửa, xóa.
- Tạo đề mới từ câu hỏi trong kho.
- Nhập và xuất câu hỏi bằng JSON.
- Đăng ký/đăng nhập Firebase Authentication.
- Firebase Realtime Database Rules phân quyền quản trị viên và người học.
- Cloud Function chấm thi phía máy chủ; đáp án thi không nằm trong dữ liệu công khai.
- Có 15 câu mẫu Công nghệ 11 để xem trước ở chế độ demo. Đây là dữ liệu khởi đầu, **không phải bản nhập đầy đủ mọi câu từ các tài liệu ôn tập**. Dùng chức năng nhập JSON để thêm phần còn lại.

## 2. Chạy thử không cần Firebase

1. Giải nén thư mục `ontap`.
2. Mở Terminal/CMD tại thư mục đó.
3. Chạy một máy chủ tĩnh đơn giản:

   ```bash
   python -m http.server 5500
   ```

4. Mở `http://localhost:5500` bằng Chrome.
5. Trang chạy ở **chế độ demo**. Trong chế độ này, quản trị câu hỏi và lịch sử được lưu trong `localStorage` của trình duyệt hiện tại; không đồng bộ sang thiết bị khác.

Không nên mở trực tiếp bằng `file://` vì JavaScript module và tải JSON cần được phục vụ qua HTTP/HTTPS.

## 3. Tạo Firebase project

1. Mở [Firebase Console](https://console.firebase.google.com/) và tạo project mới.
2. Trong **Project settings → General → Your apps**, thêm một ứng dụng Web (`</>`). Sao chép cấu hình Web App.
3. Mở **Build → Realtime Database**, tạo database. Chọn khu vực gần người dùng của bạn nếu Firebase cung cấp lựa chọn.
4. Sao chép URL Realtime Database, ví dụ dạng `https://<database-name>.<region>.firebasedatabase.app` hoặc URL mà Console hiển thị.
5. Mở `assets/js/config.js` và điền cấu hình thật:

   ```js
   export const firebaseConfig = {
     apiKey: "YOUR_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     databaseURL: "YOUR_REALTIME_DATABASE_URL",
     projectId: "YOUR_PROJECT_ID",
     appId: "YOUR_APP_ID"
   };
   ```

   Các giá trị này là cấu hình nhận diện ứng dụng web; không phải khóa Admin SDK. **Không bao giờ đưa service account JSON hoặc private key vào thư mục website.**

6. Trong **Authentication → Sign-in method**, bật **Email/Password**.
7. Trong **Authentication → Settings → Authorized domains**, thêm tên miền GitHub Pages của bạn, thường có dạng `ten-tai-khoan.github.io`.
8. Mở **Realtime Database → Rules**, dán nội dung từ `database.rules.json` rồi Publish.

> Khi đã điền Firebase config, trang không còn dùng dữ liệu demo làm nguồn chính. Nếu database trống, hãy đăng nhập tài khoản quản trị và nhập câu hỏi JSON.

## 4. Cấp quyền quản trị

Tài khoản đăng ký mới mặc định là **người học**, không phải quản trị viên.

1. Mở website sau khi đã cấu hình Firebase.
2. Tạo tài khoản bằng nút đăng nhập/tạo tài khoản.
3. Vào Firebase Console → Authentication → Users và sao chép **UID** của tài khoản cần cấp quyền.
4. Vào Realtime Database → Data, tạo node:

   ```json
   {
     "admins": {
       "UID_CUA_BAN": true
     }
   }
   ```

5. Tải lại website. Tài khoản đó sẽ thấy mục **Quản trị câu hỏi**.

Node `admins` được khóa ghi từ client theo Rules. Chỉ chủ project có quyền trong Firebase Console/đường quản trị đáng tin cậy mới nên cấp hoặc thu hồi quyền này.

## 5. Triển khai Cloud Functions để chấm thi an toàn

Thi thử chính thức không nên tải đáp án đúng về trình duyệt trước khi nộp. OnTap lưu đáp án thi tại `/examKeys/<examId>`; Rules chặn client đọc node đó. Cloud Function `submitExam` đọc đáp án bằng Admin SDK, chấm điểm và chỉ trả lời giải sau khi bài được nộp.

**Lưu ý thanh toán:** Cloud Functions yêu cầu project được liên kết gói Blaze (thanh toán theo mức sử dụng). Firebase có một số hạn mức không tính phí nhưng vẫn yêu cầu liên kết tài khoản thanh toán. Hãy nhờ phụ huynh/người lớn quản lý bước liên kết thanh toán và xem [bảng giá Firebase](https://firebase.google.com/pricing) trước khi bật. Bạn vẫn có thể chạy giao diện demo mà chưa triển khai Functions.

Các bước triển khai:

1. Cài Node.js 20 hoặc mới hơn và Firebase CLI:

   ```bash
   npm install -g firebase-tools
   firebase login
   ```

2. Tại thư mục gốc `ontap`, tạo file `.firebaserc` từ `.firebaserc.example`; thay `YOUR_FIREBASE_PROJECT_ID` bằng Project ID thật.
3. Tạo file `functions/.env.<project-id>` (thay `<project-id>` bằng ID thật), dựa trên `functions/.env.example`:

   ```env
   FIREBASE_DATABASE_URL=https://YOUR_REALTIME_DATABASE_URL
   ```

   Không commit file `.env.<project-id>` lên GitHub. `.gitignore` đã bỏ qua file này.

4. Cài dependencies và triển khai:

   ```bash
   cd functions
   npm install
   cd ..
   firebase use --add
   firebase deploy --only database
   firebase deploy --only functions
   ```

5. Đảm bảo Function `submitExam` và `checkPracticeAnswer` đã triển khai tại region `asia-southeast1` (cùng region mà `config.js` đang dùng).

Nếu Firebase project chưa bật billing/Functions hoặc Functions chưa deploy, luyện tập trực tuyến có thể không chấm được đáp án vì đáp án đã được giữ phía máy chủ. Hãy dùng chế độ demo hoặc hoàn tất phần Functions trước khi mở cho học sinh.

## 6. Đưa lên GitHub Pages

1. Tạo repository GitHub mới, ví dụ `ontap`.
2. Đưa toàn bộ nội dung thư mục này lên nhánh `main`, bảo đảm `index.html` nằm ở thư mục gốc repository.
3. Trên GitHub mở **Settings → Pages**.
4. Ở **Build and deployment**, chọn **Deploy from a branch**.
5. Chọn branch `main`, folder `/(root)`, nhấn **Save**.
6. Sau khi triển khai hoàn tất, website có địa chỉ dạng `https://TEN-TAI-KHOAN.github.io/ontap/`.
7. Kiểm tra lại URL tại Firebase Authentication → Authorized domains.

Hướng dẫn chính thức: [Configuring a publishing source for GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 7. Nhập câu hỏi vào kho

Trong website, đăng nhập quản trị → **Quản trị câu hỏi → Nhập / Xuất** → tải file mẫu hoặc chọn file JSON của bạn.

Cấu trúc tối thiểu:

```json
{
  "questions": [
    {
      "subject": "cong-nghe",
      "subjectName": "Công nghệ",
      "grade": 11,
      "topic": "Vật liệu cơ khí",
      "type": "mcq",
      "question": "Gang là hợp kim của những nguyên tố nào?",
      "options": {
        "A": "Sắt và carbon",
        "B": "Đồng và kẽm",
        "C": "Nhôm và đồng",
        "D": "Sắt và nhôm"
      },
      "correctAnswer": "A",
      "explanation": "Gang là hợp kim của sắt và carbon."
    }
  ]
}
```

- `correctAnswer` phải là một trong các khóa có trong `options`.
- `type` hiện có thể ghi `mcq` hoặc `true_false`. Với câu đúng/sai một ý, dùng `options: {"A":"Đúng","B":"Sai"}` và `correctAnswer: "A"` hoặc `"B"`.
- Nhập file `.json`; bản hiện tại chưa có trình phân tích trực tiếp DOCX/PDF. Hãy chuyển dữ liệu sang mẫu JSON trước khi nhập.
- Dữ liệu import chỉ tạo câu hỏi; muốn tạo đề thi, mở tab **Tạo đề thi**, chọn môn, chủ đề, số câu và thời gian.

## 8. Mô hình dữ liệu và bảo mật

| Node | Ai đọc được? | Ai ghi được? | Mục đích |
|---|---|---|---|
| `/questionsPublic` | Mọi người | Admin | Nội dung và lựa chọn, không chứa đáp án đúng |
| `/questionKeys` | Admin | Admin | Đáp án/lời giải cho kho câu hỏi |
| `/exams` | Mọi người | Admin | Metadata và ID câu hỏi của đề |
| `/examKeys` | Bị chặn ở client | Admin | Đáp án và lời giải riêng cho từng đề |
| `/admins/<uid>` | Chủ tài khoản tương ứng | Không ghi từ client | Cờ quản trị được cấp thủ công |
| `/users/<uid>/history` | Chủ tài khoản, admin | Chủ tài khoản | Lịch sử của người học; Function cũng ghi bằng Admin SDK |

Ghi chú:

- Firebase Web API key không phải bí mật; **Security Rules mới là lớp bảo vệ dữ liệu**.
- Không đặt `.read: true` hoặc `.write: true` ở root database.
- Practice gọi Function để kiểm tra từng câu, không tải toàn bộ `/questionKeys` xuống trình duyệt học sinh.
- Thi chính thức dùng `submitExam` để chấm ở server. Không dùng kết quả demo để tổ chức kỳ thi cần chống gian lận.
- `checkPracticeAnswer` hiện cho phép khách gọi để luyện từng câu. Để chống lạm dụng ở quy mô lớn, cấu hình Firebase App Check và giới hạn tần suất ở máy chủ trước khi mở công khai.
- History demo nằm ở localStorage; history online yêu cầu tài khoản.

## 9. Mở rộng sau này

Để bổ sung lớp/môn, chỉnh mảng `SUBJECTS` trong `assets/js/app.js` và bổ sung dữ liệu tương ứng. Bản đầu hiện chỉ khai báo Công nghệ 11; giao diện và schema đã có trường `subject`, `grade`, `topic` để mở rộng các môn khác mà không đổi cấu trúc câu hỏi.

## 10. Xử lý lỗi thường gặp

- **Không kết nối Firebase:** kiểm tra `databaseURL`, `projectId`, `authDomain` và console của trình duyệt.
- **Permission denied khi lưu:** kiểm tra tài khoản có `admins/<uid>: true` và đã Publish Security Rules chưa.
- **Đăng nhập không chạy trên GitHub Pages:** thêm tên miền `*.github.io` vào Authorized domains.
- **Thi thử không nộp được:** kiểm tra Cloud Functions đã deploy, project đã bật billing phù hợp và file env có `FIREBASE_DATABASE_URL` đúng chưa.
- **Không tải được module:** đảm bảo website đang được mở qua HTTP/HTTPS, không mở trực tiếp bằng `file://`.
