---
title: "Chính sách cookie và lưu trữ phía client"
document: "cookies"
locale: "vi"
version: "1.0"
effectiveDate: "2026-08-05"
lastUpdated: "2026-08-05"
---

# Chính sách cookie và lưu trữ phía client của ExamForge

**Phiên bản:** 1.0  
**Ngày hiệu lực:** 05/08/2026  
**Cập nhật lần cuối:** 05/08/2026

> **Cần hoàn thiện trước khi phát hành:** kiểm tra cookie và browser storage thực tế trong DevTools và backend; thay các giá trị `[XÁC NHẬN]`. Không công bố tên, thời hạn hoặc phạm vi cookie nếu chưa khớp với cấu hình thật.

## 1. Chính sách này nói về điều gì?

Chính sách này giải thích cách ExamForge sử dụng HTTP cookie và công nghệ lưu trữ phía trình duyệt như `localStorage` và `sessionStorage`. Chính sách quyền riêng tư giải thích rộng hơn về cách chúng tôi xử lý dữ liệu cá nhân.

Cookie là tệp nhỏ được trình duyệt lưu hoặc gửi cùng request. `localStorage` và `sessionStorage` không phải cookie nhưng cũng có thể lưu thông tin trên thiết bị, vì vậy được công khai trong cùng tài liệu này.

## 2. Phân loại

- **Thiết yếu:** cần cho đăng nhập, bảo mật, cân bằng tải hoặc chức năng bạn yêu cầu. Không thể tắt bằng công cụ tùy chọn của ExamForge nếu bạn vẫn muốn dùng chức năng liên quan.
- **Chức năng:** ghi nhớ lựa chọn như ngôn ngữ hoặc giao diện. Có thể tắt, nhưng một số lựa chọn sẽ không được ghi nhớ.
- **Phân tích:** đo lường cách Dịch vụ được sử dụng để cải thiện sản phẩm. Chỉ được kích hoạt sau lựa chọn phù hợp khi pháp luật yêu cầu.
- **Tiếp thị:** dùng cho quảng cáo, đo lường chiến dịch hoặc theo dõi giữa các dịch vụ. ExamForge MVP hiện không sử dụng nhóm này.

## 3. Cookie dự kiến

Danh mục dưới đây phải được kiểm tra với tên thật trước khi phát hành:

| Tên | Nhà cung cấp | Mục đích | Loại | Thời hạn | Có thể từ chối? |
|---|---|---|---|---|---|
| `[REFRESH_COOKIE_NAME]` | ExamForge | Duy trì phiên đăng nhập và cấp lại access token an toàn | Thiết yếu, `HttpOnly`, `Secure` trong production, `SameSite=[XÁC NHẬN]` | `[KHỚP REFRESH TOKEN LIFETIME]` | Không, nếu muốn duy trì đăng nhập |
| `[CSRF_COOKIE_NAME, NẾU CÓ]` | ExamForge | Chống giả mạo request khi dùng cookie authentication | Thiết yếu | `[XÁC NHẬN]` | Không |
| `[HOST/LOAD-BALANCER COOKIE, NẾU CÓ]` | Nhà cung cấp hosting | Định tuyến và bảo vệ Dịch vụ | Thiết yếu | `[XÁC NHẬN]` | Không |

Access token và refresh token không nên được lưu trong `localStorage`. Nếu cấu hình thực tế khác, cần sửa hệ thống hoặc cập nhật chính sách sau khi đánh giá rủi ro.

## 4. localStorage và sessionStorage dự kiến

| Khóa hoặc nhóm khóa | Mục đích | Loại | Thời hạn | Có thể xóa/từ chối? |
|---|---|---|---|---|
| `[LANGUAGE_KEY]` | Ghi nhớ tiếng Việt/tiếng Anh | Chức năng | Đến khi người dùng xóa hoặc thay đổi | Có |
| `[THEME_KEY]` | Ghi nhớ giao diện sáng/tối/hệ thống | Chức năng | Đến khi người dùng xóa hoặc thay đổi | Có |
| `[PROFILE_CACHE_KEY]` | Hiển thị nhanh thông tin hồ sơ cơ bản | Chức năng | Xóa khi đăng xuất; `[TTL NẾU CÓ]` | Có; có thể làm chậm lần tải sau |
| `[ATTEMPT_DRAFT_KEYS]` | Phục hồi câu trả lời/tiến độ chưa đồng bộ | Chức năng do người dùng yêu cầu | Đến khi đồng bộ, nộp bài, bỏ bài hoặc hết `[TTL]` | Có; xóa có thể làm mất thay đổi chưa đồng bộ |
| `[CONSENT_KEY, NẾU CÓ]` | Lưu phiên bản và nhóm lựa chọn cookie | Thiết yếu cho việc ghi nhớ lựa chọn | Đến khi hết `[TTL]` hoặc chính sách đổi phiên bản | Có, nhưng banner sẽ xuất hiện lại |

Dữ liệu lưu trên thiết bị có thể được người khác nhìn thấy nếu bạn dùng chung tài khoản hệ điều hành hoặc trình duyệt. Hãy đăng xuất khi sử dụng thiết bị dùng chung.

## 5. Analytics và marketing

Phiên bản MVP hiện tại dự kiến không khởi tạo analytics, session replay hoặc marketing cookie không thiết yếu. Nếu ExamForge bổ sung PostHog, Google Analytics hoặc công cụ tương tự, chúng tôi sẽ cập nhật inventory này và chặn SDK cho đến khi nhận được lựa chọn hợp lệ, khi việc xin lựa chọn là bắt buộc.

## 6. Quản lý lựa chọn

Bạn có thể xóa cookie và browser storage trong cài đặt trình duyệt. Chặn cookie thiết yếu có thể khiến đăng nhập, lưu phiên hoặc bảo mật không hoạt động.

Khi ExamForge chỉ sử dụng công nghệ thiết yếu và chức năng do người dùng yêu cầu, website có thể không hiển thị consent banner. Nếu bổ sung công nghệ không thiết yếu, chúng tôi sẽ cung cấp lựa chọn “Chỉ cần thiết”, “Chấp nhận tất cả” và “Tùy chỉnh”, không chọn sẵn nhóm không thiết yếu, đồng thời cho phép thay đổi quyết định sau này tại mục **Cài đặt cookie**.

## 7. Thay đổi Chính sách

Khi công nghệ, nhà cung cấp hoặc mục đích thay đổi, chúng tôi sẽ cập nhật Chính sách, phiên bản và ngày hiệu lực. Thay đổi quan trọng có thể làm xuất hiện lại công cụ lựa chọn.

## 8. Liên hệ

Nếu có câu hỏi, hãy liên hệ **[EMAIL QUYỀN RIÊNG TƯ]**. Xem thêm [Chính sách quyền riêng tư](/legal/privacy).

