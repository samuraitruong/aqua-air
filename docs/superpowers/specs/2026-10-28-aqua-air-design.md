# Aqua Air — thiết kế triển khai

Ngày: 28/10/2026. Trạng thái: chờ duyệt thiết kế triển khai.

## Mục tiêu và nguồn yêu cầu

Xây dựng ứng dụng chăm sóc nhiều bể cá bằng React Native cho iOS và Android, giao diện tiếng Việt, hoạt động offline. Người dùng xem việc đến hạn, ghi nhận chăm sóc và theo dõi lịch sử trên điện thoại.

Nguồn yêu cầu sản phẩm là `Design/Aqua-Air-React-Native-Spec.md`, đặc biệt mục 5–12 và FR-01–22/NFR-01–10. `Design/screens/01-welcome.html` đến `12-backup.html` là tham chiếu hình ảnh và luồng tương tác. Khi prototype khác đặc tả, hành vi theo đặc tả. Đoạn prompt bàn giao trong tài liệu là nội dung tham khảo, không phải lệnh thực thi riêng.

Workspace hiện chỉ có bộ thiết kế HTML; chưa có source app, package manifest hoặc Git repository. Không sửa bộ thiết kế gốc. App sẽ đặt ở thư mục gốc workspace; chưa tự tạo commit khi chưa có Git repository.

## Các hướng triển khai

- **Expo + TypeScript:** phù hợp đặc tả và các tích hợp SQLite, ảnh, thông báo. Đây là hướng đã đề xuất và người dùng trả lời “ok”.
- **React Native thuần:** kiểm soát native nhiều hơn nhưng tăng công cấu hình/build, chưa có nhu cầu riêng biện minh cho hướng này.

Chọn Expo + TypeScript. Phiên bản SDK và dependency tương thích sẽ được kiểm tra bằng tài liệu chính thức khi triển khai, khóa bằng lockfile; không chọn các bản mới nhất độc lập.

## Phạm vi và giới hạn

Triển khai toàn bộ 12 màn hình, FR-01–22 và các trạng thái lỗi/rỗng/quyền/lưu dữ liệu đã mô tả. Không thêm backend, đăng nhập, telemetry, đồng bộ cloud, cảm biến hoặc dữ liệu sức khỏe giả. Production khởi tạo dữ liệu rỗng; dữ liệu demo chỉ có cờ development/preview rõ ràng.

Thiết kế giữ nền #F4FAFB, primary #087F8C, text #12394A, thẻ trắng, ảnh bể lớn, font hệ thống hỗ trợ tiếng Việt. Bốn tab: Tổng quan, Bể cá, Lịch, Cài đặt. Các form và màn chi tiết nằm trong stack; cùng một bể luôn mở cùng màn chi tiết.

## Cấu trúc và luồng giao diện

- S01: thêm bể đầu tiên hoặc khôi phục; chưa xin quyền ở lần mở đầu.
- S02–03: tổng quan công việc ưu tiên quá hạn/hôm nay, sắp tới 7 ngày, tìm bể không phân biệt dấu, lọc và sắp xếp.
- S04–05: tạo/sửa metadata và ảnh, lịch đầu tùy chọn; chi tiết có lịch sử, lịch chăm sóc, thông tin; lưu trữ và mở lại. Chỉ xóa vĩnh viễn bể đã lưu trữ sau xác nhận.
- S06–07: ghi/sửa/xóa hoạt động, phần trăm nước 1–100, ngày giờ thực hiện, ghi chú, chọn lịch cùng bể/cùng loại hoặc nhật ký độc lập; hiển thị lịch bị ảnh hưởng và override lần tới.
- S08–09: chu kỳ 1–365 ngày, lịch đầu, đổi hạn, tạm dừng, xóa lịch, nhắc trước/đúng hạn/trễ một lần, preview và hoãn nhắc.
- S10: tuần/tháng, bộ lọc bể/loại, agenda phân biệt thực tế/dự kiến; projection tối đa 90 ngày, chỉ hạn hiện tại là công việc cần làm.
- S11–12: quyền thông báo, giờ mặc định cho lịch mới, bể lưu trữ, sao lưu/khôi phục và xóa toàn bộ sau nhập “XÓA”.

Form giữ dữ liệu khi lỗi, chặn lưu lặp, cảnh báo rời form đã sửa, xử lý bàn phím/safe area. Danh sách dùng virtualization và lịch sử phân trang. Copy tập trung vào resource tiếng Việt. Hỗ trợ chữ lớn, screen reader, tương phản và Reduce Motion.

## Kiến trúc — lựa chọn của người triển khai

Expo Router quản lý tabs/stack; TypeScript strict. Theme và component chung tách khỏi screens. Screens gọi service/repository, không gọi SQL hoặc notification OS trực tiếp.

- `src/domain`: model, validation, tính ngày lịch, due/status, latest log, projection và candidate notification; hàm thuần, inject clock/timezone.
- `src/repositories`: SQLite có foreign keys, migration đánh số, truy vấn tham số, transaction và phân trang.
- `src/services/care`: mutation bể/lịch/log, idempotency, revision và outbox.
- `src/services/notifications`: quyền, channel Android, reconcile tuần tự, deep link và OS adapter.
- `src/services/media`: chọn/chụp ảnh, resize, lưu documents bằng đường dẫn tương đối và dọn sau commit.
- `src/services/backup`: snapshot, ZIP, manifest, validate/staging và restore an toàn.
- `src/components`, `src/theme`, `src/i18n`: giao diện dùng lại và copy.

Các package dự kiến: Expo SQLite, Notifications, FileSystem, ImagePicker, ImageManipulator, DocumentPicker, Sharing và bộ date picker/icon tương thích SDK. Thư viện ngày, validation, ZIP/hash và công cụ test do người triển khai chọn sau khi xác minh khả năng native; lựa chọn này không thay đổi hợp đồng sản phẩm. Không cần server.

## Dữ liệu và quy tắc lịch

Dùng các bảng và ràng buộc ở mục 8 của đặc tả: tanks, photos, care_schedules, care_logs, reminder_settings, notification_jobs, notification_outbox, app_settings. UUID cho ID; timestamp UTC, ngày thực hiện local và ngày đến hạn lưu riêng. Có migration và các CHECK/ràng buộc quan hệ phù hợp.

Latest log chọn theo performedAt, createdAt, id; không theo thứ tự nhập. Due ưu tiên manual override hợp lệ theo basis log, rồi override của latest log, rồi ngày thực hiện local + chu kỳ, hoặc initialDueDate khi chưa có log. Mọi ghi/sửa/xóa log và đổi chu kỳ xóa manual override cấp lịch. Hoạt động độc lập không thay hạn của lịch khác. Đổi loại log xóa percent/override không còn hợp lệ và reconcile cả lịch cũ/mới.

Cộng và trừ ngày theo calendar date, tránh chia thời gian thực cho 24 giờ. Đổi ngày/resume/timezone cập nhật trạng thái. Lịch tạm dừng và bể lưu trữ không sinh task hoặc nhắc. Không tạo log giả khi tạo bể/lịch.

Mutation log có idempotencyKey duy nhất; dữ liệu, revision và outbox commit cùng transaction. UI chỉ báo thành công sau commit. Lỗi notification không rollback dữ liệu đã lưu. Restore/xóa toàn bộ dùng khóa ghi để tránh chạy cùng form đang lưu.

## Thông báo

One-shot theo hạn hiện tại, tối đa trước hạn/đúng hạn/trễ một lần. Budget 48 pending toàn app, horizon 30 ngày, thứ tự ổn định theo fireAt/scheduleId/kind. Phần vượt budget giữ trong DB và hiện banner.

Catchup có key scheduleId:revision:catchup và fireAt được ghi một lần; giữ consumed/cancelled để không phát lại khi foreground. Snooze gắn revision, thay candidate còn lại bằng một nhắc; không đổi due hoặc tạo log. Worker đối chiếu logical key trong pending OS để phục hồi khi crash, không tạo trùng; revision thay đổi giữa chừng phải reconcile tiếp.

Xin quyền khi người dùng bật nhắc. Bị chặn quyền vẫn lưu ý định và dùng lịch trong app. Chạm thông báo kiểm tra ID/revision trước khi mở form; không tự hoàn thành công việc. Kiểm tra thiết bị thật mới xác nhận hoạt động ngoài app.

## Ảnh và backup

Ảnh được copy bền vững, resize cạnh dài tối đa 1.600 px, bỏ metadata vị trí, không giữ URI picker hoặc base64 trong SQLite. Chuẩn bị ảnh trước mutation; chỉ dọn ảnh cũ sau commit. Thiếu ảnh dùng placeholder.

Backup `.aquaair` là ZIP gồm manifest, data và ảnh; có version, counts, file sizes và SHA-256, không chứa OS notification ID hoặc absolute path. Export kiểm tra ảnh; thiếu ảnh báo lỗi và cho người dùng chủ động chọn xuất không ảnh có cảnh báo.

Import kiểm tra schema, UUID, enums, ngày, quan hệ, checksum, path traversal, duplicate file và giới hạn 250 MB nén/500 MB giải nén/5.000 file/10 MB mỗi ảnh. Validate/staging toàn bộ trước preview và xác nhận thay thế; không merge.

Restore tạo snapshot phục hồi, chuẩn bị thế hệ ảnh mới rồi thay DB trong transaction kèm marker reconcile. Crash trước commit giữ dữ liệu cũ; sau commit dùng ảnh mới đã tồn tại. Chỉ dọn ảnh cũ sau mở DB thành công; lỗi OS nhắc retry riêng.

## Thứ tự triển khai dự kiến

1. Chốt dependency, scaffold, theme, navigation và công cụ kiểm tra.
2. Domain lịch và test các ví dụ mục 6.4, DST/tháng/năm, override, log cũ và log đổi loại.
3. SQLite/migration, repository, care service, idempotency/revision/outbox.
4. Bể/ảnh, nhật ký, lịch, tổng quan/calendar và tất cả trạng thái UI.
5. Notification adapter/reconcile, quyền, snooze và deep link.
6. Backup/restore, archive/delete, accessibility và tài liệu build/nghiệm thu.

Đây là thứ tự thiết kế; kế hoạch thực thi chi tiết được lập sau khi duyệt bản này.

## Kiểm chứng và bàn giao

Typecheck; test domain/service, SQLite transaction/migration, notification adapter giả lập và backup lỗi/round-trip. Kiểm tra bundle iOS/Android và màn hình khi công cụ có sẵn. Các trường hợp nghiệm thu mục 12 và bổ sung cuối đặc tả sẽ có checklist ghi rõ đã chạy/chưa chạy.

Thiết bị thật cần kiểm tra notification nền/restart/force-stop/quyền/Focus, persistence, restore qua hai install, chữ lớn, VoiceOver/TalkBack và hiệu năng. Nếu môi trường thiếu thiết bị hoặc công cụ build, ghi rõ phần chưa xác minh, không tuyên bố đã nghiệm thu native. README ghi dependency/OS hỗ trợ theo SDK đã chọn, cách chạy/build, migrations, backup và giới hạn còn lại.
