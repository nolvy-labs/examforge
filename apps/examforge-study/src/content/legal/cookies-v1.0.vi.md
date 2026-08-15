---
title: "Chính sách cookie và lưu trữ phía client"
document: "cookies"
locale: "vi"
version: "1.0"
effectiveDate: "2026-08-10"
lastUpdated: "2026-08-10"
-------------------------

# Chính sách cookie và lưu trữ phía client của ExamForge

- **Phiên bản:** 1.0
- **Ngày hiệu lực:** 10/08/2026
- **Cập nhật lần cuối:** 10/08/2026

## 1. Phạm vi

Chính sách này giải thích các HTTP cookie và cơ chế lưu trữ phía trình duyệt hiện được ExamForge sử dụng.

[Chính sách quyền riêng tư](/legal/privacy) giải thích rộng hơn về hoạt động xử lý dữ liệu cá nhân.

`localStorage` không phải HTTP cookie nhưng vẫn lưu thông tin trong trình duyệt, vì vậy được công khai trong tài liệu này.

## 2. Phân loại

ExamForge hiện sử dụng:

* **lưu trữ thiết yếu** cho xác thực và các chức năng mà người dùng yêu cầu; và
* **lưu trữ chức năng** cho lựa chọn như ngôn ngữ.

ExamForge hiện không chủ động sử dụng cookie phân tích hoặc marketing.

## 3. Cookie xác thực

| Tên                          | Mục đích                                       | Loại      | Bảo mật                                                             | Thời hạn       |
| ---------------------------- | ---------------------------------------------- | --------- | ------------------------------------------------------------------- | -------------- |
| `__Secure-examforge_access`  | Xác thực request tới ExamForge                 | Thiết yếu | `HttpOnly`, `Secure`, `SameSite=Lax`                                | Khoảng 15 phút |
| `__Secure-examforge_refresh` | Cho phép phiên đăng nhập nhận access token mới | Thiết yếu | `HttpOnly`, `Secure`, `SameSite=Lax`, giới hạn cho request xác thực | Khoảng 7 ngày  |

Các cookie này không thể được JavaScript phía client thông thường đọc vì được cấu hình `HttpOnly`.

Việc chặn hoặc xóa chúng có thể đăng xuất tài khoản hoặc khiến chức năng yêu cầu xác thực không hoạt động.

ExamForge không chủ động lưu access token hoặc refresh token trong `localStorage`.

## 4. Lựa chọn ngôn ngữ

ExamForge sử dụng các cơ chế sau để lưu lựa chọn ngôn ngữ:

| Tên                      | Nơi lưu        | Mục đích                                    | Loại      | Thời hạn                     |
| ------------------------ | -------------- | ------------------------------------------- | --------- | ---------------------------- |
| `examforge-study-locale` | Cookie         | Cho phép server biết locale đã chọn         | Chức năng | Tối đa 1 năm                 |
| `examforge-study-locale` | `localStorage` | Đồng bộ và ghi nhớ locale trong trình duyệt | Chức năng | Đến khi thay đổi hoặc bị xóa |

Cookie locale sử dụng `SameSite=Lax` và được đánh dấu `Secure` trong production.

Cookie này được phép đọc bởi mã ứng dụng vì chỉ lưu locale đã chọn.

## 5. Dữ liệu phục hồi lượt làm bài

Khi một lượt thi hoặc luyện tập đang diễn ra, ExamForge có thể lưu bản phục hồi cục bộ bằng key có dạng:

`examforge:attempt-draft:v1:<studentId>:<attemptId>`

Dữ liệu được lưu có thể gồm:

* mã lượt làm và phiên bản bài thi;
* mã người dùng;
* chế độ làm bài;
* câu trả lời được lưu cục bộ;
* trạng thái đồng bộ;
* thời gian luyện tập đã trôi qua;
* thời điểm cập nhật.

Cơ chế này giúp giảm nguy cơ mất thay đổi chưa được đồng bộ.

Ứng dụng xóa dữ liệu phục hồi khi không còn cần thiết trong luồng làm bài tương ứng. Người dùng cũng có thể xóa dữ liệu bằng cài đặt trình duyệt, nhưng việc xóa khi vẫn còn thay đổi chưa đồng bộ có thể làm mất các thay đổi cục bộ đó.

## 6. sessionStorage

ExamForge hiện không chủ động phụ thuộc vào `sessionStorage` cho các chức năng của Study được mô tả trong Chính sách này.

Phần này sẽ được cập nhật nếu điều đó thay đổi.

## 7. Analytics và marketing

ExamForge hiện không chủ động khởi tạo:

* cookie quảng cáo;
* tracker marketing;
* mã định danh quảng cáo cross-site;
* cookie phân tích hành vi; hoặc
* công nghệ session replay.

Nếu analytics hoặc marketing không thiết yếu được bổ sung, Chính sách này và cơ chế lựa chọn tương ứng sẽ được cập nhật trước khi công nghệ đó được kích hoạt trong trường hợp pháp luật yêu cầu sự đồng ý.

## 8. Quản lý dữ liệu trình duyệt

Bạn có thể xóa hoặc chặn cookie và local storage trong trình duyệt.

Xóa cookie xác thực thiết yếu có thể khiến bạn bị đăng xuất.

Xóa dữ liệu phục hồi lượt làm có thể làm mất thay đổi chưa được đồng bộ với server.

Xóa dữ liệu lựa chọn ngôn ngữ có thể khiến ExamForge xác định lại ngôn ngữ trong lần truy cập sau.

## 9. Sự đồng ý đối với cookie

Vì triển khai hiện tại sử dụng công nghệ xác thực cần thiết cho chức năng người dùng yêu cầu và lưu trữ locale mang tính chức năng, ExamForge không coi analytics hoặc marketing là được mặc nhiên chấp thuận.

Nếu công nghệ tracking không thiết yếu được bổ sung trong tương lai, công nghệ đó không được kích hoạt chỉ vì người dùng tiếp tục sử dụng website trong trường hợp pháp luật yêu cầu một lựa chọn riêng.

## 10. Thay đổi Chính sách

Chính sách sẽ được cập nhật khi công nghệ lưu trữ trình duyệt, mục đích hoặc cấu hình liên quan thay đổi đáng kể.

## 11. Liên hệ

Nếu có câu hỏi về cookie hoặc lưu trữ trình duyệt, hãy liên hệ **vy.tranngoclam@gmail.com**.

Xem thêm [Chính sách quyền riêng tư](/legal/privacy).