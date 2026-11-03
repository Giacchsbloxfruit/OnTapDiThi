# OnTap Cloud Functions

`submitExam` chấm điểm ở máy chủ. Mã trình duyệt chỉ gửi `examId` và lựa chọn của học sinh; đáp án nằm trong `/examKeys/<examId>` và bị Realtime Database Rules chặn đọc từ client.

Cần đặt biến môi trường `FIREBASE_DATABASE_URL` trong file `functions/.env.<project-id>` trước khi triển khai. Không đưa file `.env.<project-id>` lên GitHub.

Triển khai từ thư mục gốc dự án:

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

Cloud Functions cần bật thanh toán Blaze cho project. Xem README chính ở thư mục gốc trước khi bật thanh toán.
