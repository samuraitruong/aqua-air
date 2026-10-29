# Kích thước bể và bộ lọc

## Nhập liệu

Form thêm/sửa bể dùng chiều dài, rộng và cao theo **cm**, thay ô nhập dung tích bằng kết quả tự tính:

`Dung tích bể chính (lít) = dài × rộng × cao / 1.000`

Ví dụ: 100 × 40 × 50 cm = 200 L. Chấp nhận số thập phân bằng dấu phẩy hoặc dấu chấm. Có thể để trống cả ba chiều nếu chưa biết; nếu nhập một chiều thì phải nhập đủ ba chiều. Mỗi chiều >0 và ≤10.000 cm; dung tích bể chính >0 và ≤100.000 L.

Hai lựa chọn độc lập **Có sump** và **Có lọc canister** cho phép bể dùng đồng thời cả hai. Bật sump thì cần nhập dung tích sump theo lít (>0, ≤100.000). Tắt sump sẽ xóa dung tích sump khi lưu. Không yêu cầu hoặc cộng dung tích canister.

Dung tích bể chính và sump lưu riêng. Tổng chỉ hiển thị khi biết dung tích bể chính và dung tích sump cần thiết; không coi chỉ riêng sump là dung tích toàn hệ thống. Ví dụ 200 L + sump 60 L = 260 L.

Đây là dung tích hình học/khai báo; chưa trừ nền, vật trang trí hoặc khoảng trống trên mặt nước, không khẳng định lượng nước thực tế.

## Bể đã tạo trước đây

Migration SQLite **2 → 3** thêm chiều dài/rộng/cao nullable, hai cờ bộ lọc và dung tích sump. Giữ nguyên dung tích đã nhập, ảnh, lịch, nhật ký và ngôn ngữ. Bể cũ chưa có kích thước tiếp tục giữ dung tích cũ khi sửa thông tin khác. Sau khi nhập đủ kích thước, dung tích được tính lại từ ba chiều.

Các trường mới được validation ở form/service và ràng buộc SQLite. `volumeLitres` tiếp tục phục vụ phần tổng quan/card cũ nhưng luôn suy ra từ kích thước khi kích thước đã có. Không thay ngày đến hạn hoặc ghi nhật ký khi sửa các thông số này.

## Sao lưu

File mới dùng **formatVersion 2**, chứa kích thước và cả hai loại bộ lọc. App đọc cả version 1 và 2. Backup version 1 được chuẩn hóa: giữ dung tích, kích thước chưa biết, sump/canister chưa bật. Version 2 thiếu thông số, dung tích không khớp phép tính hoặc sump không hợp lệ bị từ chối trước khi thay dữ liệu.

Các bản app cũ chỉ hỗ trợ format 1 sẽ từ chối file mới thay vì âm thầm bỏ thông số.

## Kiểm chứng

- 47 test và TypeScript đạt: công thức, số thập phân, kích thước thiếu/sai, dung tích sump, tổng chưa biết, hai loại lọc cùng lúc, lưu/mở lại SQLite, migration từ schema 1/2, CHECK constraints và backup v1/v2.
- Independent review không phát hiện lỗi quan trọng.
- iOS Simulator: tạo bể `Geometry`, nhập 100 × 40 × 50 cm → preview 200 L; bật sump, nhập 60 L, bật canister → preview 260 L; lưu thành công. Tab Thông tin hiển thị kích thước, cả hai bộ lọc, sump và tổng.
- Đọc `aqua-air.db`: schema 3, kích thước 100/40/50, volume 200, hasSump=1, sumpVolume=60, hasCanister=1; ba log có từ trước vẫn giữ nguyên.
- Copy mới có đầy đủ VI/EN. Android đã kiểm tra bundle; vẫn cần kiểm tra native trên điện thoại thật theo checklist chung.
