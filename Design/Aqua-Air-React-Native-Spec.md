# Aqua Air
## Đặc tả sản phẩm, giao diện và hướng dẫn triển khai React Native

Phiên bản thiết kế 1.0 · 28/10/2026 · Ngôn ngữ giao diện MVP: Tiếng Việt

Tài liệu bàn giao thiết kế để lập kế hoạch và viết ứng dụng. Hình mockup thể hiện hướng mỹ thuật; các nhãn, quy tắc và trạng thái trong tài liệu này là nguồn chuẩn khi triển khai. Đây chưa phải ứng dụng React Native đã chạy hoặc đã kiểm thử trên thiết bị.

## 1. Ý tưởng và kết quả cần đạt

Aqua Air giúp người chơi nhiều bể cá biết ngay: bể nào cần chăm sóc, bao lâu từ lần thay nước gần nhất, hôm nay cần làm gì và lần tiếp theo đến hạn khi nào. Người dùng ghi nhận chăm sóc trong vài thao tác; ứng dụng lưu lịch sử và cập nhật lịch nhắc tương ứng.

Nền tảng đã được chọn: React Native, điện thoại iOS và Android. Hướng thiết kế đã được chọn: Aqua Air, sáng, rộng rãi, xanh nước và xanh ngọc. MVP không đăng nhập, không tạo tài khoản, không máy chủ; dữ liệu lưu trên điện thoại.

Các quyết định đề xuất trong bản thiết kế này: dùng Expo + TypeScript; lưu dữ liệu có cấu trúc bằng SQLite; dùng thông báo cục bộ; lịch lặp theo số ngày kể từ lần thực hiện gần nhất; hỗ trợ bản sao lưu bao gồm ảnh. Có thể điều chỉnh các lựa chọn triển khai này khi lập kế hoạch mà không đổi trải nghiệm đã mô tả.

### Thước đo trải nghiệm

- Mở app thấy việc quá hạn và việc hôm nay ngay ở phần đầu.
- Từ thẻ công việc đến lưu một lần thay nước thông thường tối đa ba thao tác chính: Ghi nhận → kiểm tra/chỉnh → Lưu.
- Mỗi bể có ảnh, tên và số ngày từ lần thay nước gần nhất.
- Mọi thao tác cốt lõi hoạt động khi không có Internet.
- Không tự coi một công việc là hoàn thành khi chỉ đóng hoặc hoãn thông báo.
- Không hiển thị số đo chất lượng nước giả hoặc ngụ ý có cảm biến.

### Ngoài phạm vi MVP

Đồng bộ nhiều máy, tài khoản, chia sẻ bể, thiết bị IoT, đọc cảm biến, AI chẩn đoán cá, đề xuất liều thuốc, mạng xã hội, cửa hàng, bảng điều khiển desktop, đồng bộ lịch hệ thống, dark mode và lịch cố định theo thứ trong tuần. Việc nhập pH/nhiệt độ thủ công có thể thêm ở giai đoạn sau; MVP tập trung lịch sử và lịch chăm sóc.

## 2. Các hướng đã cân nhắc

| Hướng | Đặc điểm | Đánh đổi | Kết luận |
| --- | --- | --- | --- |
| Aqua Air | Trắng xanh băng, xanh ngọc, ảnh bể lớn | Cần kiểm soát độ tương phản để giao diện sáng vẫn rõ | Người dùng đã chọn |
| Deep Ocean | Xanh biển sâu, chữ sáng | Cảm giác nặng hơn khi xem nhiều lịch và biểu mẫu | Không chọn |
| Nature Aquarium | Kem nhạt, xanh lá thủy sinh | Thiên về cây và thiên nhiên hơn đặc trưng nước xanh | Không chọn |

## 3. Phạm vi chức năng

| Nhóm | MVP phải có |
| --- | --- |
| Quản lý bể | Tạo, sửa, ảnh đại diện, mô tả, dung tích tùy chọn, loại nước, nhóm/kệ tùy chọn, lưu trữ bể |
| Nhật ký | Thay nước, vệ sinh lọc, hút cặn, chăm cây, hoạt động khác; ngày giờ, ghi chú; phần trăm cho thay nước |
| Lịch chăm sóc | Mỗi bể nhiều lịch; tên việc, chu kỳ số ngày, ngày đến hạn đầu, cấu hình nhắc riêng |
| Tổng quan | Quá hạn, hôm nay, sắp tới; số bể; số việc; số ngày từ lần thay nước |
| Lịch | Danh sách theo ngày, tuần ngày có thể cuộn, xem tháng; xem lịch sử thực hiện và việc đến hạn |
| Nhắc việc | Thông báo cục bộ, nhắc trước, nhắc đúng hạn, một lần nhắc trễ; hoãn lời nhắc |
| Dữ liệu | Sao lưu/khôi phục toàn bộ gồm ảnh; xóa dữ liệu với xác nhận |
| Trạng thái | Trống, đang lưu, lưu lỗi, thiếu ảnh, không có quyền thông báo, lịch tạm dừng |

Các tỷ lệ 30%, chu kỳ 7 ngày và giờ 09:00 trong tài liệu là giá trị gợi ý để người dùng sửa. Không trình bày chúng như khuyến nghị chăm sóc áp dụng cho mọi loài cá hoặc bể.

## 4. Hệ thống thiết kế Aqua Air

### 4.1. Tính cách hình ảnh

Không gian sáng và yên tĩnh, cảm giác mặt nước trong, thẻ nội dung sạch, ảnh thủy sinh thật. Điểm nhấn nước nằm ở ảnh, một gợn sóng rất nhẹ trong phần đầu và sắc xanh. Không dùng bong bóng bay liên tục, chữ nổi trên nền nước nhiều chi tiết hoặc hiệu ứng kính làm khó đọc.

Tên làm việc: **Aqua Air**. Biểu tượng định hướng: giọt nước nét đơn kết hợp một đường gợn; cần thiết kế vector riêng khi viết app. Không coi hình trong mockup là bộ icon hoặc logo sản xuất cuối cùng.

### 4.2. Màu sắc

| Token | Giá trị | Công dụng |
| --- | --- | --- |
| background | #F4FAFB | Nền toàn app |
| surface | #FFFFFF | Thẻ, biểu mẫu |
| surfaceAqua | #E6F5F8 | Tóm tắt, vùng thông tin phụ |
| primary | #087F8C | Nút chính, tab đang chọn |
| primaryPressed | #066674 | Nút khi nhấn |
| textPrimary | #12394A | Tiêu đề, nội dung chính |
| textSecondary | #516B77 | Nhãn phụ có ý nghĩa |
| border | #D6E6EA | Viền, phân cách nhẹ |
| overdueText | #A53E2B | Chữ trạng thái quá hạn |
| overdueBackground | #FFF0EA | Nền trạng thái quá hạn |
| upcomingText | #245F9B | Chữ sắp tới |
| upcomingBackground | #EAF2FF | Nền sắp tới |
| successText | #226C50 | Chữ đã ghi nhận |
| successBackground | #EAF7EF | Nền thành công |

Nút chính dùng chữ trắng. Kiểm tra độ tương phản thực tế trên mọi cặp chữ/nền; mục tiêu tối thiểu 4.5:1 cho chữ thường. Không dùng màu nhạt làm chữ nội dung. Màu luôn đi kèm nhãn hoặc icon có tên truy cập.

### 4.3. Bố cục, chữ và tương tác

- Thiết kế tham chiếu 390 × 844 logical points; thích ứng từ rộng 360 tới 430, hỗ trợ màn hình nhỏ và chữ lớn bằng cuộn dọc.
- Lề ngang 20; khoảng cách thang 4, 8, 12, 16, 20, 24, 32.
- Thẻ radius 20–24; trường nhập radius 14; nút cao tối thiểu 52; vùng chạm tối thiểu 48 × 48.
- Dùng font hệ thống có đủ dấu tiếng Việt: SF trên iOS, font hệ thống Android. Heading 28/34 semibold; section 20/26; body 16/24; nhãn phụ 14/20; số nổi bật 36/42.
- Tránh cỡ chữ dưới 12; nhãn cần đọc không nhỏ hơn 14. Cho phép tăng font; thẻ không khóa chiều cao.
- Ảnh bể 16:9 hoặc 3:2; ảnh phủ trong khung, giữ vùng trọng tâm khi cắt; không ép méo ảnh.
- Shadow nhẹ, elevation thấp; phân cấp bằng khoảng trắng nhiều hơn đường viền.
- Icon nét đơn đồng nhất: nhà/tổng quan, bể, lịch, cài đặt, giọt nước, lọc, lá, ghi chú, chuông.
- Haptic nhẹ khi lưu thành công nếu máy hỗ trợ; chuyển cảnh 180–240 ms, tôn trọng Reduce Motion.
- Nút Lưu ghim phía dưới nhưng phải nằm trên bàn phím; màn hình biểu mẫu cuộn được. Hỗ trợ Android Back và iOS swipe-back; cảnh báo khi bỏ biểu mẫu đã sửa.
- Dùng safe area, không đè lên thanh trạng thái, home indicator hoặc điều hướng hệ thống.

### 4.4. Component tái sử dụng

| Component | Nội dung / hành vi |
| --- | --- |
| ScreenHeader | Tiêu đề, mô tả tùy chọn, một hành động chính |
| SummaryCard | Số bể và số việc cần làm; không gọi là điểm sức khỏe bể |
| TaskCard | Bể, loại việc, hạn, trạng thái, Ghi nhận, menu Hoãn |
| TankCard | Ảnh, tên, loại/dung tích, ngày từ lần thay nước, hạn gần nhất |
| StatusPill | Quá hạn / Hôm nay / Còn N ngày / Tạm dừng; có chữ |
| EmptyState | Minh họa gọn, một câu hướng dẫn, một nút chính |
| PercentPicker | Ô nhập số là nguồn chuẩn; slider và chip chỉ hỗ trợ nhập |
| DateTimeField | Giá trị rõ ràng, mở bộ chọn ngày giờ bản địa |
| TimelineItem | Ngày, loại chăm sóc, phần trăm nếu có, ghi chú |
| InlineBanner | Thiếu quyền, lỗi lưu, lời nhắc chưa cập nhật; có hành động sửa |
| ConfirmSheet | Câu hỏi cụ thể và tên hành động; không dùng nút mơ hồ OK |

## 5. Điều hướng và toàn bộ màn hình

Bốn tab chính: **Tổng quan · Bể cá · Lịch · Cài đặt**. Tạo/sửa bể, ghi nhận, lịch chăm sóc và chi tiết hoạt động là màn hình đẩy lên hoặc modal toàn chiều cao; không tạo thêm tab. Chọn bể trên mọi tab dẫn tới cùng một màn chi tiết.

### S01 — Chào mừng / chưa có dữ liệu

Wordmark Aqua Air, minh họa mặt nước nhẹ, tiêu đề “Chăm bể nhẹ nhàng hơn mỗi ngày”, giải thích “Lưu lịch sử và nhắc chăm sóc ngay trên điện thoại”. Hai nút: “Thêm bể đầu tiên”, “Khôi phục bản sao lưu”. Ghi chú rõ dữ liệu được lưu trên thiết bị. Không hiện biểu mẫu đăng ký, không yêu cầu quyền thông báo hoặc ảnh ở lần mở đầu.

### S02 — Tổng quan

Phần đầu: ngày hiện tại theo ngôn ngữ máy, lời chào trung tính “Một ngày trong lành”, tóm tắt N bể đang hoạt động và N việc cần làm. “Cần làm” là tổng lịch đang quá hạn hoặc đến hạn hôm nay, không phải tổng thông báo.

Các khối theo thứ tự:

1. **Cần chăm sóc**: quá hạn lâu nhất trước, sau đó hôm nay; card gồm ảnh nhỏ, tên bể, tên việc, tỷ lệ dự kiến nếu có, nhãn hạn và nút “Ghi nhận”. Không giấu quá hạn sau ảnh trang trí.
2. **Sắp tới**: việc trong 7 ngày tiếp theo, theo ngày tăng dần; liên kết “Xem lịch”.
3. **Bể cá của bạn**: thẻ ảnh lớn, cuộn dọc hoặc danh sách ngắn; liên kết “Xem tất cả”.

Không có việc hôm nay: “Hôm nay mọi thứ đã ổn” và hiện hạn sắp tới; đây là tình trạng lịch, không xác nhận sức khỏe cá. Có nhiều việc: hiện 3 thẻ đầu và “Xem tất cả N việc”. Có bể nhưng chưa có lịch: CTA “Tạo lịch chăm sóc”. Banner thông báo bị tắt chỉ xuất hiện khi đã có lịch muốn nhắc, có thể đóng tạm.

### S03 — Danh sách bể

Header “Bể cá”, nút thêm; ô “Tìm bể cá”; bộ lọc Tất cả / Cần chăm sóc / Sắp tới. Mỗi thẻ hiển thị ảnh, tên, dung tích nếu biết, loại nước, nhóm nếu có, “N ngày từ lần thay nước”, một trạng thái lịch gần nhất. Bộ lọc Cần chăm sóc gồm quá hạn/hôm nay; Sắp tới gồm bể có lịch đến hạn trong 7 ngày kế tiếp. Bể có cả hai có thể xuất hiện ở cả hai bộ lọc.

Tìm theo tên hoặc nhóm/kệ, không phân biệt hoa/thường và dấu tiếng Việt. Sắp xếp mặc định: bể cần chăm sóc trước, kế đến hạn gần nhất, bể không lịch cuối; người dùng có thể chuyển sang tên A–Z. Không có kết quả: “Không tìm thấy bể phù hợp”. Không có ảnh: nền xanh băng + icon bể, không để khung ảnh lỗi.

### S04 — Tạo / sửa bể

Các trường theo thứ tự: ảnh (chụp/chọn/xóa), tên bể bắt buộc, dung tích lít tùy chọn, loại nước Ngọt / Mặn / Lợ / Chưa chọn, nhóm/kệ tùy chọn, mô tả tùy chọn. Ảnh không bắt buộc. Không cần tên loài để tạo được bể.

Khi tạo mới có thẻ tùy chọn “Tạo lịch thay nước”, mặc định bật: chu kỳ gợi ý 7 ngày, tỷ lệ dự kiến 30%, ngày đến hạn đầu được hiển thị rõ và sửa được. Việc lưu bể và lịch đầu là một giao dịch. Chưa biết lần thay trước: không tự tạo log giả; ngày đầu đến hạn mặc định ngày tạo + chu kỳ. Người dùng có thể đổi thành hôm nay.

Tên 1–60 ký tự sau trim; mô tả ≤ 2.000; nhóm ≤ 60; dung tích nếu nhập > 0 và ≤ 100.000 L. Dùng bàn phím số phù hợp, chấp nhận dấu phẩy hoặc dấu chấm thập phân theo locale. Nhấn “Chọn ảnh” mới xin quyền liên quan. Khi sửa ảnh, ảnh cũ chỉ dọn sau khi giao dịch thành công.

### S05 — Chi tiết bể

Ảnh hero, tên bể và metadata. Hai thông tin ưu tiên: lần thay nước gần nhất thực tế và lần thay nước đến hạn. Nút “Ghi nhận chăm sóc”. Khi chưa có log hiển thị “Chưa ghi nhận thay nước”, không hiển thị 0 ngày như thể vừa thực hiện.

Ba tab trong trang:

- **Lịch sử**: timeline giảm dần theo thời điểm thực hiện; lọc loại hoạt động; chạm mở chi tiết để sửa/xóa.
- **Lịch chăm sóc**: danh sách lịch, chu kỳ, hạn và nhắc; nút “Thêm lịch”; bật/tạm dừng từng lịch.
- **Thông tin**: mô tả, dung tích, nhóm, loại nước, ngày tạo; nút sửa bể.

Menu phụ có Sửa bể / Lưu trữ bể. Lưu trữ giữ lịch sử và dừng mọi nhắc. Cài đặt có danh sách bể lưu trữ để mở lại. Xóa vĩnh viễn chỉ trong chi tiết bể đã lưu trữ, xác nhận rõ sẽ xóa lịch sử và ảnh liên quan.

### S06 — Ghi nhận chăm sóc

Mở từ TaskCard: điền sẵn bể, lịch và loại việc. Mở từ bể: chọn loại việc; nếu có một lịch đang bật cùng loại thì liên kết mặc định. Luôn cho thấy lịch nào sẽ được cập nhật. Nếu không có lịch phù hợp, ghi nhật ký độc lập và ghi rõ “Chưa gắn lịch nhắc”.

Trường: bể; hoạt động; thời điểm thực hiện mặc định bây giờ; phần trăm nước nếu thay nước; ghi chú; thẻ “Lần tiếp theo” khi có lịch liên kết. Phần trăm bắt buộc cho thay nước, từ 1–100, số nguyên; có ô nhập trực tiếp, slider và chip 10/20/30/50. Hoạt động khác không lưu phần trăm nước.

Thẻ lần tiếp theo hiển thị ngày tính từ ngày thực hiện + chu kỳ. Cho phép sửa ngày riêng cho lần này và có nút “Theo chu kỳ”. Không tự đổi chu kỳ mặc định hoặc phần trăm mục tiêu khi người dùng nhập thực tế khác. Hoạt động độc lập không hiện ngày tiếp theo giả.

Nút “Lưu hoạt động” disabled khi đang lưu; chặn double tap bằng idempotency key. Khi thành công đóng về nơi mở, cập nhật dữ liệu và toast “Đã ghi nhận · Lần tiếp theo 04/11”. Nếu lưu dữ liệu thất bại giữ nguyên form và hiện lỗi. Nếu dữ liệu lưu được nhưng cập nhật thông báo thất bại, báo “Đã lưu hoạt động; lời nhắc sẽ được thử cập nhật lại”, không bắt nhập lại.

Không nhận thời điểm thực hiện trong tương lai. Bộ chọn có thể chọn ngày cũ. Khi sửa log hiển thị tiêu đề “Sửa hoạt động”, giữ nguyên ID và thời điểm tạo.

### S07 — Chi tiết / sửa hoạt động

Thời điểm thực hiện, bể, loại việc, phần trăm nếu có, ghi chú, lịch liên kết và ngày đến hạn ghi đè nếu có. Hành động Sửa / Xóa. Xóa có xác nhận, giải thích lịch tiếp theo có thể tính lại. Sửa ngày hoặc loại chăm sóc phải chạy lại quy tắc lịch; không chỉ sửa dòng hiển thị.

Khi đổi loại hoạt động, bỏ lựa chọn schedule cũ ngay trong form, xóa override lần tiếp theo của log và yêu cầu người dùng chọn lịch cùng loại mới hoặc “Chỉ lưu nhật ký”. Hiện giải thích rằng lịch cũ sẽ tính lại. Khi lưu, cập nhật log, xóa manual override cấp schedule và tăng revision/reconcile cho cả lịch cũ và lịch mới trong cùng giao dịch. Không tự gán lại bằng tên. Không cho chuyển log sang bể khác trong MVP; muốn sửa nhầm bể thì xóa và ghi lại để quan hệ không bị thay đổi ngầm.

### S08 — Tạo / sửa lịch chăm sóc

Chọn loại: Thay nước / Vệ sinh lọc / Hút cặn / Chăm cây / Khác. Tên tùy chỉnh với Khác; mỗi bể chỉ một lịch đang bật cho mỗi loại chuẩn, lịch Khác phân biệt bằng tên chuẩn hóa. Chu kỳ số nguyên 1–365 ngày. Tỷ lệ dự kiến 1–100% chỉ cho thay nước, không bắt buộc. Ngày đến hạn đầu bắt buộc khi chưa có log liên kết. Khi đã có log, ngày tính từ log mới nhất; chỉnh mốc riêng bằng thao tác “Đổi hạn kế tiếp” có giải thích.

Cấu hình nhắc trong cùng trang hoặc mở trang S09. Hành động Tạm dừng giữ dữ liệu nhưng loại lịch khỏi danh sách cần làm và hủy nhắc; bật lại tính lại hạn từ lịch sử, có thể trở thành quá hạn. Xóa lịch giữ log, chuyển liên kết của log sang null và hủy nhắc.

### S09 — Cài đặt nhắc cho một lịch

Switch “Nhắc chăm sóc”; giờ nhắc mặc định 09:00 theo giờ điện thoại; “Nhắc trước” Không / 1 ngày / 2 ngày; “Nhắc lại nếu trễ” mặc định tắt, bật thì nhắc thêm một lần vào ngày sau hạn. Hiển thị preview đầy đủ: “Bể thủy sinh · Đến lịch thay nước 30% · 04/11 lúc 09:00”. Có nút “Gửi nhắc thử” sau khi được cấp quyền, giới hạn một lần mỗi lần bấm hợp lệ.

Hoãn từ task hoặc thông báo mở sheet “Nhắc lại sau”: 1 giờ / Ngày mai lúc giờ đã chọn / Chọn thời gian. Hoãn thay đổi lần nhắc kế tiếp, không đổi ngày đến hạn, không ghi hoạt động. Nhãn quá hạn vẫn giữ. Nút “Đổi ngày đến hạn” là thao tác khác, luôn được gọi tên rõ.

Nếu quyền bị từ chối: lịch vẫn lưu và xuất hiện trong app; banner “Thông báo đang tắt” + “Mở cài đặt điện thoại”. Không lặp lại hộp xin quyền mỗi lần vào app. Việc bật switch lưu ý định của người dùng; UI thể hiện trạng thái hệ thống bị chặn riêng biệt.

### S10 — Lịch

Header “Lịch chăm sóc”, chọn tháng và bộ lọc bể/loại việc. Một dải tuần hiện ngày đang chọn, nút mở tháng. Phần dưới là agenda theo ngày: việc đến hạn và hoạt động đã thực hiện có kiểu thẻ khác nhau, ghi rõ “Dự kiến” hoặc “Đã ghi nhận”. Màu không phải dấu hiệu duy nhất.

Lịch tương lai tạo bằng phép chiếu chu kỳ từ hạn hiện tại, tối đa 90 ngày khi người dùng duyệt; không tạo log hoặc occurrence DB cho từng ô. Chỉ hạn hiện tại là hành động cần làm; các mốc sau gắn nhãn “Dự kiến” và tính lại khi có log mới. Một lịch quá hạn chỉ có một việc quá hạn trên dashboard, không sinh hàng chục việc bỏ lỡ. Ngày trống: “Không có lịch chăm sóc trong ngày này”.

### S11 — Cài đặt

Các nhóm: Thông báo (trạng thái quyền, liên kết lịch riêng, giờ mặc định cho lịch tạo mới); Dữ liệu (Sao lưu, Khôi phục, ngày xuất gần nhất); Bể đã lưu trữ; Giới thiệu; Xóa toàn bộ dữ liệu. Không có avatar tài khoản giả hoặc nút đăng xuất.

Giải thích ngắn: “Dữ liệu ở trên điện thoại này. Hãy xuất bản sao lưu trước khi đổi hoặc gỡ ứng dụng.” Không tự khẳng định dữ liệu được đồng bộ hoặc mã hóa bởi app. Giờ mặc định chỉ áp dụng lịch mới; muốn áp dụng hàng loạt phải có hành động riêng và xác nhận phạm vi, ngoài MVP.

### S12 — Sao lưu / khôi phục

Sao lưu: tóm tắt số bể, log, lịch và ảnh; nút “Tạo bản sao lưu”; tiến trình; mở share sheet để người dùng chọn nơi lưu. Khôi phục: chọn file, kiểm tra, hiện tóm tắt và ngày tạo, thông báo “Dữ liệu hiện tại sẽ được thay thế”, nút “Sao lưu dữ liệu hiện tại” và nút xác nhận “Thay thế và khôi phục”. MVP chỉ khôi phục thay thế, không merge.

Không đổi dữ liệu hiện tại nếu file lỗi, schema không hỗ trợ, thiếu manifest hoặc ảnh không hợp lệ. Sau khôi phục phải hủy các notification cũ và tạo lại từ dữ liệu mới, không dùng ID hệ điều hành trong backup.

## 6. Quy tắc lịch và trạng thái — nguồn chuẩn

### 6.1. Thời gian

- `performedAt`, `createdAt`, `updatedAt`: ISO timestamp UTC.
- `performedLocalDate`: YYYY-MM-DD ghi lại ngày theo giờ máy lúc thực hiện, dùng để tính chu kỳ, không đổi theo múi giờ khi đi du lịch.
- Ngày đến hạn là calendar date YYYY-MM-DD; giờ nhắc là HH:mm. Notification được dựng thành thời điểm trong múi giờ hiện tại của điện thoại.
- Số ngày tính bằng chênh lệch ngày lịch, không lấy milliseconds chia 24 giờ. Cộng 7 ngày là 7 ngày lịch, tránh lỗi DST.
- Chuyển ngày, mở app trở lại hoặc đổi múi giờ phải tính lại nhãn và reconcile nhắc. Thông báo đã giao cho hệ điều hành trước khi đổi múi giờ có thể cần mở app để cập nhật; không cam kết tự sửa khi app chưa được chạy lại.

### 6.2. Ngày đến hạn của từng lịch

Mỗi schedule có `initialDueDate`, `intervalDays` và có thể có `manualNextDueDate`. Lịch sử gắn với schedule bằng ID, không ghép theo tên hiển thị.

1. Tìm log còn tồn tại có `scheduleId` tương ứng; chọn log có `performedAt` lớn nhất, tie-break `createdAt` rồi `id` tăng dần, lấy phần tử cuối.
2. Nếu có `manualNextDueDate` và `manualBasisLogId` bằng ID log mới nhất (cả hai null nếu chưa có log), dùng ngày manual đó.
3. Nếu có log: dùng `nextDueOverrideDate` của log mới nhất nếu có; nếu không, `performedLocalDate + intervalDays`.
4. Nếu chưa có log: dùng `initialDueDate`.

`manualNextDueDate` dùng khi người dùng đổi hạn kế tiếp ngoài form ghi log. Khi lưu bất kỳ log mới/sửa/xóa hoặc đổi chu kỳ cho schedule đó, xóa manual override cấp schedule trong cùng giao dịch rồi tính lại. Override gắn trong log mới nhất vẫn được giữ khi đổi chu kỳ cho đến khi người dùng chọn “Theo chu kỳ”. UI phải hiện nhãn “Ngày tùy chỉnh”. Khi log mới trở thành mới nhất, override của log cũ tự hết tác dụng.

Lịch tắt hoặc bể lưu trữ: không có task cần làm, không notification; vẫn có thể hiển thị hạn tham khảo trong trang lịch tạm dừng.

### 6.3. Phân loại

| Điều kiện với lịch đang bật, bể đang hoạt động | Trạng thái |
| --- | --- |
| dueDate < today | Quá hạn N ngày |
| dueDate = today | Hôm nay |
| today < dueDate ≤ today + 7 | Sắp tới / Còn N ngày |
| dueDate > today + 7 | Chưa đến hạn / ngày cụ thể |

Không đổi sang quá hạn ngay sau giờ thông báo trong cùng ngày. Chỉ ngày tiếp theo mới quá hạn.

Số ngày từ lần thay nước lấy log loại `water_change` mới nhất trong bể, kể cả log độc lập. Nếu chưa có: “Chưa ghi nhận”. Một log độc lập có thể cập nhật nhãn lần thay nước gần nhất nhưng không làm đổi lịch không được liên kết.

### 6.4. Ví dụ bắt buộc khi kiểm tra

Giả sử hôm nay 28/10/2026, lịch thay nước chu kỳ 7 ngày:

| Hành động / dữ liệu | Kết quả |
| --- | --- |
| Lần trước 19/10, 30% | Hạn 26/10; quá hạn 2 ngày; 9 ngày từ lần thay nước |
| Ghi nhận 28/10, 30% | Hạn mới 04/11; log cũ giữ; hủy nhắc cũ |
| Ghi nhận 28/10 nhưng chọn lần sau 02/11 | Hạn 02/11; chu kỳ vẫn 7 ngày |
| Đã có log 28/10, nhập bổ sung log 20/10 | Hạn vẫn 04/11; không tính theo bản nhập cuối |
| Sửa log mới nhất 28/10 thành 27/10, không override | Hạn 03/11 |
| Xóa log mới nhất và log trước là 19/10 | Hạn trở về 26/10, quá hạn 2 ngày |
| Hoãn nhắc tới 29/10 | Hạn không đổi, không tạo log |
| Chỉ vệ sinh lọc | Không làm đổi lịch thay nước |
| Chọn tỷ lệ thực tế 20% thay vì gợi ý 30% | Log lưu 20%; mục tiêu lịch vẫn 30% |

## 7. Thiết kế thông báo cục bộ

Thông báo là phần phụ trợ cho lịch trong DB. App luôn tính việc cần làm từ dữ liệu, không từ lịch sử notification. Không cần push token, tài khoản hoặc dịch vụ gửi push cho MVP.

### 7.1. Nội dung và đường mở

- Nhắc trước: “Sắp đến lịch thay nước” / “Bể thủy sinh · Ngày mai · Dự kiến 30%”.
- Đến hạn: “Đến lịch chăm sóc bể” / “Bể thủy sinh · Thay nước 30%”.
- Trễ một ngày nếu bật: “Bạn còn một việc chăm bể” / “Bể thủy sinh · Thay nước đã quá hạn 1 ngày”.
- Chạm mở S06 với `tankId`, `scheduleId`, `scheduleRevision`; nếu lịch đã xóa hoặc bể lưu trữ thì mở bể hoặc tổng quan và báo việc không còn khả dụng.
- Có thể thêm action “Ghi nhận” và “Nhắc sau”; action Ghi nhận chỉ mở form, tuyệt đối không tự tạo lịch sử.

### 7.2. Thuật toán và giới hạn được công bố

MVP lập lịch one-shot cho **hạn hiện tại**, không dựa vào JavaScript chạy nền liên tục. Mỗi lịch tạo tối đa ba candidate: trước hạn, đúng hạn, sau hạn một ngày. Loại candidate ở quá khứ; với lịch đã quá hạn khi vừa tạo/bật, có thể nhắc một lần ở giờ nhắc kế tiếp nếu người dùng bật nhắc trễ. Không phát bù hàng loạt thông báo cũ.

Nhắc bù `catchup` phải có logical key cố định `scheduleId:revision:catchup`, được ghi vào notification_jobs cùng fireAt một lần duy nhất khi tạo/bật/sửa cấu hình làm phát sinh revision mới. Chỉ tạo catchup nếu candidate nhắc trễ thông thường đã ở quá khứ, để không gửi hai nhắc trễ cho cùng hạn. Mỗi lần foreground không được tính lại “giờ kế tiếp” để tạo job mới. Giữ hàng job sau thời điểm fireAt dưới trạng thái consumed (đã qua thời điểm, không khẳng định OS đã hiển thị) hoặc cancelled; việc không còn pending trong OS không đủ để tự tạo catchup mới. Với schedule revision đó, catchup không được tái tạo sau khi consumed/cancelled. Retry kỹ thuật chỉ dùng lại fireAt đã lưu nếu nó vẫn ở tương lai. Dọn job cũ chỉ khi revision đã được thay thế và không còn pending OS liên quan.

Nếu snooze còn hiệu lực cho revision hiện tại: thay các candidate còn lại của lịch bằng đúng một thông báo tại `snoozedUntil`; không giữ nhắc trước/đến hạn trùng bên cạnh. Khi snooze đã giao, không tự tạo thông báo lặp; app vẫn hiển thị task. Khi log, sửa hạn, sửa cấu hình hoặc dừng lịch thì xóa snooze.

Đặt budget ứng dụng **48 thông báo đang chờ** trên toàn app (quyết định sản phẩm bảo thủ, không coi đây là giới hạn OS được bảo đảm). Gom candidate của mọi lịch, sort theo thời điểm rồi scheduleId/kind để ổn định, lấy 48 sớm nhất. Giới hạn horizon 30 ngày. Những candidate còn lại vẫn giữ trong DB dưới dạng desired/not-scheduled; hiển thị banner khi thiếu budget: “Một số lời nhắc chưa được lên lịch; mở app định kỳ để cập nhật”. UI lịch luôn đủ dữ liệu.

Không hứa nhắc vô hạn khi app không được mở: các lời nhắc đã đặt vẫn do OS xử lý; việc mới phát sinh sau cửa sổ cần reconcile. Không có việc tự hoàn thành hay tự chuyển chu kỳ nếu người dùng không ghi nhận. Nếu cần nhắc trễ mỗi ngày vô hạn hoặc lịch dài hạn không mở app, phải đánh giá một thiết kế khác ở giai đoạn sau.

Chạy reconcile sau: tạo/sửa/xóa log, lịch hoặc bể; archive/restore bể; thay đổi nhắc; khôi phục dữ liệu; app khởi động/resume; quyền thông báo đổi; đổi ngày/múi giờ được phát hiện lúc foreground.

### 7.3. Tính nhất quán

1. Trong transaction SQLite: lưu thay đổi, tăng revision của lịch bị ảnh hưởng, tạo hàng outbox cần reconcile.
2. Commit dữ liệu trước; notification không nằm trong giao dịch DB.
3. Một worker tuần tự đọc revision mới nhất, dựng desired notifications và đối chiếu pending notifications của OS.
4. Hủy notification cũ có key không còn hợp lệ; tạo phần thiếu; lưu ID trả về. Key logic: `scheduleId:revision:kind:fireAt`.
5. Nếu crash giữa lúc OS tạo và DB lưu ID, lần sau đọc pending có key trong payload để nhận diện, tránh tạo bản trùng.
6. Nếu revision đổi trong lúc worker chạy, đánh dấu dirty và reconcile lại; không ghi trạng thái sạch cho revision cũ.
7. Lỗi nhắc không rollback log; retry vào foreground, có trạng thái lỗi có thể xem.

Android cần notification channel phù hợp; xin quyền theo khả năng hệ thống. Kiểm tra local scheduling trên bản development/production cài lên điện thoại thật. Không dùng việc chạy trong Expo Go hoặc simulator làm bằng chứng đủ cho hành vi notification ngoài app.

Thời điểm hiển thị thực tế phụ thuộc quyền, chế độ tập trung và chính sách hệ điều hành. Mô tả là lời nhắc theo lịch, không phải báo thức chính xác tuyệt đối.

## 8. Mô hình dữ liệu đề xuất

ID là UUID do ứng dụng tạo; không dùng timestamp làm khóa duy nhất. Mọi truy vấn SQL có tham số. Bật foreign keys và có migration đánh số.

| Bảng | Trường chính / ràng buộc |
| --- | --- |
| tanks | id PK; name; description?; volumeLitres?; waterType; groupName?; coverPhotoId?; archivedAt?; createdAt; updatedAt |
| photos | id PK; relativePath UNIQUE; mimeType; width; height; byteSize; createdAt |
| care_schedules | id PK; tankId FK; activityType; title; intervalDays; targetPercent?; initialDueDate; enabled; manualNextDueDate?; manualBasisLogId?; revision; createdAt; updatedAt |
| care_logs | id PK; tankId FK; scheduleId? FK ON DELETE SET NULL; activityType; titleSnapshot; performedAt; performedLocalDate; percent?; notes?; nextDueOverrideDate?; idempotencyKey UNIQUE; createdAt; updatedAt |
| reminder_settings | scheduleId PK/FK; enabled; localTime; leadDays 0/1/2; overdueOnce bool; snoozedUntil?; snoozeRevision? |
| notification_jobs | logicalKey PK; scheduleId FK; revision; kind; fireAt; osId?; status desired/scheduled/error/consumed/cancelled; lastError?; createdAt; updatedAt |
| notification_outbox | id PK; reason; scheduleId?; createdAt; processedAt? |
| app_settings | key PK; valueJson; updatedAt |

Các giá trị `activityType`: water_change, filter_clean, substrate_clean, plant_care, other. `waterType`: freshwater, saltwater, brackish, unspecified.

Quan hệ log–schedule phải cùng `tankId` và cùng loại hoạt động. Không cho chuyển loại schedule đã có log; tạo lịch khác để giữ ý nghĩa lịch sử. Snapshot tên log giúp lịch sử không đổi tên theo schedule sau này.

`nextDueDate` và `lastWaterChangeAt` là dữ liệu suy ra, không là trường sự thật độc lập. Nếu cache để tối ưu, cache phải bị invalidated trong cùng giao dịch thay đổi dữ liệu gốc. `manualBasisLogId` là nullable reference; khi log liên quan bị xóa xóa override trong cùng transaction.

Index đề xuất: care_logs(tankId, performedAt DESC), care_logs(scheduleId, performedAt DESC), care_schedules(tankId, enabled), tanks(archivedAt), notification_jobs(scheduleId, revision). Xóa vĩnh viễn bể: cascade lịch, log và reminder; ảnh không còn tham chiếu được dọn sau commit.

## 9. Kiến trúc React Native đề xuất

Đây là đề xuất triển khai để LLM có điểm bắt đầu; chọn version tương thích tại lúc tạo dự án và khóa lockfile, không mặc định ghép các version mới nhất độc lập.

- React Native + Expo + TypeScript strict, iOS/Android native build.
- Expo Router cho bốn tab và stack/modal.
- expo-sqlite cho dữ liệu và transaction.
- expo-file-system cho ảnh trong thư mục documents của app và file backup tạm.
- expo-image-picker để chọn/chụp ảnh theo hành động người dùng.
- expo-notifications cho nhắc cục bộ.
- expo-document-picker + expo-sharing cho nhập/xuất.
- Chọn thư viện ngày có calendar-day arithmetic và hỗ trợ timezone; unit-test DST. Không tự rải phép tính ngày trong component.
- Dùng một bộ icon thống nhất. Có thể dùng react-native-svg cho gợn nước/biểu tượng; SVG là vector thật, không cắt hình mockup làm UI.
- Form có validation tập trung; state UI tách khỏi repository. Không lưu ảnh base64 trong SQLite, không dùng AsyncStorage làm database nhật ký.

Ranh giới module:

| Module | Trách nhiệm |
| --- | --- |
| screens | Trình bày, điều hướng, thao tác người dùng |
| components/theme | Token, component dùng lại, trạng thái truy cập |
| domain/scheduling | Hàm thuần tính latest log, due date, status, calendar projection |
| repositories | SQL, transaction, migration, kiểm tra quan hệ |
| services/care | Điều phối ghi log, revision và outbox |
| services/notifications | OS adapter, reconcile, quyền, deep link |
| services/backup | Export, validate, restore an toàn |
| services/media | Resize, copy ảnh bền vững, dọn file không tham chiếu |

Component không trực tiếp gọi SQL hoặc schedule notification. Inject clock và notification adapter để kiểm tra logic mà không phụ thuộc thời gian thật hoặc OS.

### Xử lý ảnh

Sau chọn ảnh, sao chép sang documents thuộc app; không giữ URI tạm của picker. Resize cạnh dài tối đa 1.600 px, giữ tỷ lệ, nén phù hợp, loại metadata vị trí nếu có. Mốc này là cấu hình đề xuất, có thể tinh chỉnh chất lượng. Lưu đường dẫn tương đối, không lưu absolute sandbox path để dùng khi restore máy khác. Chưa cấp quyền hoặc hủy chọn: bể vẫn tạo được. Mất file ảnh: placeholder và hành động chọn lại, không crash.

## 10. Backup và bảo toàn dữ liệu

Định dạng đề xuất `.aquaair`: ZIP chứa `manifest.json`, `data.json`, `photos/*`. Manifest có formatVersion, appVersion, exportedAt, counts và danh sách path + size + SHA-256. Không đưa notification OS ID, quyền OS hoặc absolute path vào file.

Export tạo snapshot logic nhất quán của dữ liệu trong transaction đọc rồi copy ảnh tham chiếu. Nếu ảnh bị thiếu, không báo backup toàn vẹn; hiển thị lỗi để người dùng sửa hoặc chủ động xuất bản dữ liệu không ảnh có cảnh báo. File backup không được app mã hóa trong MVP; nơi lưu do người dùng chọn.

Import validate schema, enum, UUID, quan hệ cùng bể, ngày hợp lệ, phần trăm, chu kỳ, checksum và danh sách file. Chặn ZIP path traversal, absolute paths, file trùng tên và archive bomb. Guardrail đề xuất: ≤ 250 MB file nén, ≤ 500 MB giải nén, ≤ 5.000 file, ≤ 10 MB mỗi ảnh; báo rõ khi vượt. Parse và kiểm tra trong staging trước khi thay dữ liệu.

Restore an toàn: validate toàn bộ → tạo snapshot phục hồi dữ liệu hiện tại → đặt ảnh mới vào thư mục generation riêng → thay dữ liệu trong một DB transaction, ghi marker reconcile → commit → hủy job OS cũ và dựng job mới → dọn thế hệ ảnh cũ sau khi mở DB thành công. Crash trước commit giữ dữ liệu cũ; sau commit dùng generation ảnh mới đã tồn tại. Không xóa ảnh cũ trước commit. Lỗi hủy/tạo notification được retry; không quay lui dữ liệu đã khôi phục chỉ vì lỗi OS.

Xóa toàn bộ dữ liệu yêu cầu nhập “XÓA”, nhắc xuất sao lưu; hủy mọi notification của app, reset DB/settings và dọn ảnh sau commit; quay về S01. Khôi phục từ backup không thể tự cấp lại quyền thông báo.

## 11. Trạng thái rỗng, lỗi và khả năng truy cập

| Tình huống | Hành vi |
| --- | --- |
| Chưa có bể | S01 với Thêm bể / Khôi phục |
| Có bể chưa lịch | Gợi ý Tạo lịch, không báo quá hạn |
| Chưa có lần thay nước | Nhãn Chưa ghi nhận, không tạo log mẫu |
| Lịch tạm dừng | Nhãn Tạm dừng, không tính số việc |
| Quyền nhắc bị chặn | Lịch vẫn chạy trong app; banner mở settings |
| Chọn ảnh thất bại | Giữ form, cho thử lại hoặc bỏ ảnh |
| Database chưa mở được | Trang lỗi có Thử lại; không seed đè dữ liệu |
| Ghi log thất bại | Giữ dữ liệu form, không toast thành công |
| Notification reconcile lỗi | Log giữ nguyên; banner nhắc chưa cập nhật |
| File backup sai | Không thay dữ liệu hiện tại; nêu lý do dễ hiểu |
| Mở notification cũ | Kiểm tra ID/revision; mở màn hợp lệ, không crash |
| Offline | Toàn bộ chức năng chính hoạt động; ảnh là local |

Screen reader đọc nút kèm ngữ cảnh, ví dụ “Ghi nhận thay nước cho Bể thủy sinh”. Trạng thái không chỉ bằng màu; icon trang trí bị ẩn khỏi cây accessibility. Thứ tự focus theo thứ tự nhìn; toast quan trọng có thông báo truy cập. Slider luôn có ô nhập thay thế. Dynamic Type, tương phản, safe area, bàn phím và Reduce Motion phải được kiểm tra trên cả hai nền tảng.

## 12. Tiêu chí nghiệm thu

### Chức năng và lịch

1. Tạo bể không ảnh, không quyền nhắc, offline thành công.
2. Tạo bể có lịch đầu không tạo log giả; tổng quan hiện đúng hạn đã chọn.
3. Ghi thay nước lưu đúng thời điểm, tỷ lệ và ghi chú; lịch tính theo bảng ví dụ mục 6.4.
4. Log nhập bổ sung ngày cũ không đẩy hạn sai; sửa/xóa log mới nhất tính lại đúng.
5. Lịch vệ sinh lọc và thay nước độc lập; log độc lập không tự hoàn thành lịch khác.
6. Tỷ lệ dự kiến và tỷ lệ thực tế không ghi đè nhau.
7. Hoãn chỉ đổi nhắc; dừng lịch/archive loại task và nhắc; mở lại tính lại đúng trạng thái.
8. Double tap lưu chỉ có một log; crash sau commit không làm mất log.
9. Mở app ở ngày mới cập nhật overdue mà không cần người dùng chỉnh dữ liệu.
10. Chuyển DST/tháng/năm, năm nhuận và timezone không tạo chênh ngày do chia 24 giờ.

### Nhắc việc trên thiết bị thật

11. Được cấp quyền: nhận local notification đã schedule khi app ở nền và khi không mở app, trong điều kiện OS cho phép.
12. Từ chối quyền: không crash, app vẫn hiển thị lịch; mở lại từ settings phản ánh quyền mới.
13. Ghi nhận trước hạn hủy nhắc cũ, chỉ giữ nhắc theo hạn mới; không bị trùng sau restart.
14. Mở từ notification đi đúng form và đúng bể; notification cũ không tạo log tự động.
15. Nhiều lịch vượt budget: 48 candidate sớm nhất được chọn ổn định, có thông báo giới hạn trong app.
16. Có test máy Android sau khởi động lại/force-stop và iOS với quyền tắt hoặc Focus; ghi rõ hành vi quan sát được, không tuyên bố bảo đảm OS luôn giao đúng phút.

### Dữ liệu và giao diện

17. Đóng/mở app giữ ảnh, lịch và lịch sử; không cần Internet.
18. Export → cài sạch/khôi phục cho cùng số bể, log, schedule và ảnh hợp lệ; lịch nhắc được tạo lại.
19. Import file hỏng/schema mới hơn/checksum sai/path độc hại không thay dữ liệu cũ.
20. Restore bị ngắt trước/sau commit có thể khởi động lại với một bộ dữ liệu nhất quán.
21. Màn rộng 360 và 430, chữ lớn: không che nút hoặc cắt nội dung thiết yếu; bàn phím không che phần trăm/nút Lưu.
22. Tên tiếng Việt dài, 100 bể và 10.000 log không làm list tải toàn bộ ảnh/log một lúc; dùng danh sách ảo hóa và phân trang lịch sử.
23. Không seed dữ liệu demo trong bản sử dụng thực tế; demo chỉ trong môi trường preview.

## 13. Thứ tự triển khai đề xuất cho LLM

Đây là trình tự bàn giao gợi ý, chưa phải kế hoạch thực thi đã được phê duyệt và chưa có code sản phẩm trong bộ tài liệu này.

1. Chốt dependency tương thích, cấu trúc dự án, theme và bốn tab.
2. Viết hàm domain lịch + kiểm tra các trường hợp mục 6 và DST trước khi gắn UI.
3. Tạo SQLite schema/migration/repository và transaction ghi log/outbox.
4. Làm quản lý bể + ảnh + form nhật ký; kiểm tra persistence sau restart.
5. Gắn tổng quan, chi tiết, lịch và toàn bộ empty/error states.
6. Gắn local notification adapter, quyền, reconcile, snooze và deep link; kiểm tra điện thoại thật.
7. Làm backup/restore an toàn, archive/delete, accessibility và kiểm tra nghiệm thu.

Không cần backend, auth, analytics hoặc đồng bộ cloud để hoàn thành MVP này. Không đưa các phần đó vào scaffold chỉ vì template có sẵn.

## 14. Prompt bàn giao cho LLM viết code

Sao chép đoạn bên dưới cùng toàn bộ tài liệu này và hình thiết kế vào công cụ coding:

> Hãy xây dựng Aqua Air bằng React Native + TypeScript cho iOS và Android theo đặc tả đính kèm. Chỉ làm mobile. MVP không đăng nhập, không backend, lưu SQLite và ảnh local. Giữ phong cách Aqua Air: nền #F4FAFB, thẻ trắng rộng rãi, primary #087F8C, chữ #12394A, ảnh bể lớn và bốn tab Tổng quan/Bể cá/Lịch/Cài đặt. Dùng tài liệu làm nguồn chuẩn về hành vi; mockup là hướng mỹ thuật, không được dựng UI bằng ảnh chụp toàn màn. Trước khi code, đọc toàn bộ đặc tả, liệt kê các lựa chọn dependency tương thích và lập kế hoạch theo từng phần có thể kiểm tra. Tách tính lịch thành hàm thuần, kiểm tra bảng ví dụ và DST; dùng transaction/idempotency/outbox cho log và nhắc. Hoãn nhắc không được đổi hạn hoặc tạo log. Không hiển thị số đo cảm biến giả. Hoàn thiện empty/error/permission states, backup cả ảnh, và accessibility. Chỉ tuyên bố notification hoạt động sau khi đã kiểm tra trên native build cài vào điện thoại thật; nêu rõ các kiểm tra chưa chạy. Bàn giao source, hướng dẫn build, migration, các kiểm tra đã chạy và checklist nghiệm thu còn lại.

## 15. Nguồn kỹ thuật tham khảo

Đã đối chiếu tài liệu chính thức ngày 28/10/2026. Các API và yêu cầu native build phải được kiểm tra lại với Expo SDK thực tế đã chọn khi triển khai.

- Expo Notifications: https://docs.expo.dev/versions/latest/sdk/notifications/ — khả năng lập lịch, hủy và xử lý notification; adapter phải theo API của version cài đặt.
- Expo SQLite: https://docs.expo.dev/versions/latest/sdk/sqlite/ — lưu dữ liệu trên thiết bị.
- Expo FileSystem: https://docs.expo.dev/versions/latest/sdk/filesystem/ — đọc/ghi file và quản lý ảnh local.
- Apple, Scheduling a notification locally: https://developer.apple.com/documentation/usernotifications/scheduling-a-notification-locally-from-your-app — mô hình nội dung, trigger và scheduling của local notification.

Các chính sách như budget 48, horizon 30 ngày, một nhắc trễ, chu kỳ tối đa 365 ngày và định dạng backup là lựa chọn thiết kế của Aqua Air, không phải tuyên bố về giới hạn hoặc tính năng mặc định của các thư viện.

## 16. Danh mục functional requirements có mã theo dõi

Toàn bộ FR dưới đây thuộc MVP. Cột nghiệm thu liên kết các tình huống ở mục 12; nhà phát triển có thể dùng ID để gắn issue và test.

| ID | Yêu cầu | Màn hình | Nghiệm thu |
| --- | --- | --- | --- |
| FR-01 | Vào ứng dụng không tài khoản, tạo dữ liệu local | S01 | 1, 17 |
| FR-02 | Tạo/sửa bể, ảnh, metadata, nhóm/kệ | S03–S05 | 1, 2, 17 |
| FR-03 | Tìm và lọc nhiều bể, sắp xếp ưu tiên công việc | S03 | 21, 22 |
| FR-04 | Lưu trữ/mở lại bể, giữ lịch sử và dừng nhắc | S05, S11 | 7 |
| FR-05 | Xóa vĩnh viễn bể đã lưu trữ với xác nhận | S05 | 7, 17 |
| FR-06 | Tạo/sửa/tạm dừng lịch riêng từng bể | S08 | 2, 7 |
| FR-07 | Ghi thay nước với thời điểm và tỷ lệ 1–100% | S06 | 3, 6, 8 |
| FR-08 | Ghi các hoạt động khác, gắn lịch hoặc độc lập | S06 | 5 |
| FR-09 | Xem/sửa/xóa log và tính lại lịch liên quan | S05, S07 | 4, 5 |
| FR-10 | Xác định lần chăm sóc mới nhất bằng ngày thực hiện | S02, S05 | 4, 9, 10 |
| FR-11 | Tính hạn rolling và hỗ trợ đổi hạn lần kế tiếp | S06, S08 | 3, 4, 6 |
| FR-12 | Tổng hợp quá hạn, hôm nay, sắp tới và số ngày đã qua | S02, S03 | 3, 9, 10 |
| FR-13 | Xem agenda và projection lịch tương lai | S10 | 9, 10 |
| FR-14 | Nhắc cục bộ theo từng lịch, nhắc trước và trễ tùy chọn | S09 | 11–13, 15, 16 |
| FR-15 | Hoãn lời nhắc mà không thay lịch sử hoặc hạn | TaskCard, S09 | 7, 13 |
| FR-16 | Mở thông báo vào đúng bể/lịch, xử lý liên kết cũ | S06 | 14 |
| FR-17 | Từ chối quyền vẫn dùng đủ lịch trong app | S09, S11 | 1, 12 |
| FR-18 | Sao lưu dữ liệu và ảnh ra file di động | S12 | 18 |
| FR-19 | Kiểm tra và khôi phục thay thế an toàn | S12 | 18–20 |
| FR-20 | Xóa toàn bộ dữ liệu và nhắc sau xác nhận rõ | S11 | 17 |
| FR-21 | Hiển thị đầy đủ empty/loading/error states | Toàn bộ | 1, 8, 12, 19, 21 |
| FR-22 | Thao tác offline, persistence qua restart | Toàn bộ | 17 |

## 17. Hợp đồng xử lý giữa UI và tầng nghiệp vụ

Không cần REST API trong MVP. Các hợp đồng dưới đây là service nội bộ, có thể cài bằng hàm TypeScript; cách đặt tên thư mục và kiểu Result cụ thể để nhà phát triển chọn.

| Lệnh / truy vấn | Dữ liệu vào | Kết quả và side effects |
| --- | --- | --- |
| createTank | metadata, photo?, optionalInitialSchedule | Tank ID; transaction bể + lịch; outbox nếu có lịch |
| updateTank | tankId, fields | Kiểm tra tồn tại; lưu metadata; đổi ảnh sau chuẩn bị file |
| saveCareLog | logId?; tankId; scheduleId?; type; performedAt/localDate; percent?; notes?; override?; idempotencyKey | Log đã lưu; affectedScheduleIds; revision/outbox; không gọi OS trong transaction |
| deleteCareLog | logId | Xóa log; clear manual override; tăng revision lịch cũ; tính lại |
| upsertSchedule | id?; tankId; type; title; interval; initialDue; target?; reminderConfig | Validate unique active type/title; lưu lịch + reminder; revision/outbox |
| setNextDue | scheduleId; date | Lưu manual date + basis log mới nhất, clear snooze, tăng revision |
| snoozeReminder | scheduleId; futureTimestamp | Lưu snooze gắn revision, reconcile; hạn và log không đổi |
| archiveTank / restoreTank | tankId | Đổi archivedAt; revision/outbox mọi lịch thuộc bể |
| getDashboard | today, timezone | Tasks ưu tiên; upcoming 7 ngày; tank summaries; warning states |
| getTankHistory | tankId, cursor?, pageSize | Log trang tiếp theo, cursor ổn định theo performedAt/createdAt/id |
| getCalendar | dateRange ≤ 90 ngày; filters | Current due tasks + projected dates + actual logs, có discriminator |
| reconcileNotifications | clock, timezone, OS adapter | Kết quả jobs; lỗi retry; không thay nhật ký chăm sóc |
| exportBackup | selectedDestination qua share sheet | File hoàn chỉnh sau kiểm tra snapshot |
| validateBackup / restoreBackup | picked file; replaceConfirmed | Preview manifest trước; chỉ thay dữ liệu sau xác nhận và validate |

Các lỗi domain cần phân biệt: NOT_FOUND, VALIDATION_ERROR (theo field), SCHEDULE_TYPE_MISMATCH, DUPLICATE_ACTIVE_SCHEDULE, STORAGE_FULL, MEDIA_UNAVAILABLE, BACKUP_INVALID, BACKUP_VERSION_UNSUPPORTED. Lỗi adapter nhắc: PERMISSION_BLOCKED, SCHEDULING_FAILED, BUDGET_EXCEEDED. UI chuyển thành câu tiếng Việt hữu ích; không đưa stack trace hoặc SQL cho người dùng.

Chuẩn hóa type cho log: nếu đổi sang loại khác water_change thì percent = null; nếu scheduleId = null thì nextDueOverrideDate = null. Ngày override phải sau ngày thực hiện; đổi hạn riêng ngoài log được chọn hôm nay hoặc tương lai. Số nguyên chu kỳ và phần trăm phải kiểm tra ở form, service và CHECK constraint DB khi phù hợp.

Chỉ một lệnh ghi log cho một idempotencyKey; retry sau lỗi kết nối tầng UI trả lại cùng log nếu đã commit. Cập nhật UI sau commit; không hiện thành công trước commit. Các tác vụ xóa và restore dùng cơ chế khóa ghi để không chạy song song với một form đang lưu.

## 18. Yêu cầu phi chức năng và quyết định vận hành

| ID | Yêu cầu / mục tiêu | Cách xác minh |
| --- | --- | --- |
| NFR-01 | Offline hoàn toàn cho chức năng cốt lõi | Airplane mode, đóng/mở app và thao tác bể/log/lịch |
| NFR-02 | Không mất hoặc ghi trùng log khi double tap/crash | Idempotency và fault injection tại ranh giới commit |
| NFR-03 | Mục tiêu cold start tới màn usable ≤ 2 giây trên máy tham chiếu tầm trung | Chọn và ghi rõ model/OS, đo release build; đây là mục tiêu chưa được đo |
| NFR-04 | Mục tiêu lưu log local thông thường ≤ 500 ms, không tính thao tác OS nhắc | Đo với 100 bể/10.000 log trên thiết bị tham chiếu |
| NFR-05 | Danh sách không tải tất cả ảnh/log vào bộ nhớ | Virtualized list, thumbnail và pagination; kiểm tra scroll/memory |
| NFR-06 | Truy cập được khi tăng chữ, dùng screen reader, giảm chuyển động | Manual QA VoiceOver/TalkBack, Dynamic Type và Reduce Motion |
| NFR-07 | Không gửi dữ liệu bể ra máy chủ trong MVP | Không tích hợp telemetry/cloud; kiểm tra luồng mạng của bản app |
| NFR-08 | Database migration không xóa lịch sử người dùng | Fixture DB version cũ → nâng version → so sánh dữ liệu |
| NFR-09 | Backup có thể chuyển sang điện thoại khác | Round-trip trên hai install khác nhau; đường dẫn ảnh tương đối |
| NFR-10 | Không quảng bá nhắc chính xác tuyệt đối | UI/copy đúng giới hạn mục 7; test native hai OS |

Hỗ trợ phiên bản OS theo minimum được Expo SDK đã chốt hỗ trợ; ghi cụ thể vào README triển khai sau khi chọn SDK, không đoán version trong bản thiết kế. MVP dùng tiếng Việt; toàn bộ copy tập trung thành resource để có thể thêm tiếng Anh sau. Ngày/giờ/số định dạng theo locale; không hard-code tên thứ hoặc định dạng hiển thị vào dữ liệu lưu.

Tách build development / preview / production; demo fixtures chỉ dùng development/preview có cờ rõ. README phải ghi cách build iOS/Android, cấp quyền, vị trí migration, quy trình export/restore và các test thiết bị đã thực hiện. Không ghi “đã hoàn thành” cho hạng mục cần điện thoại thật khi chỉ kiểm tra mô phỏng.

### Kịch bản kiểm tra bổ sung sau rà soát

- Đổi log Thay nước đang gắn lịch A sang Vệ sinh lọc gắn lịch B: phần trăm bị xóa, lịch A và B đều tính lại, nhắc cả hai được reconcile.
- Tạo lịch đã quá hạn và bật nhắc trễ: có tối đa một catchup cho revision; mở app nhiều ngày tiếp theo không sinh catchup mới.
- Notification đã qua fireAt nhưng OS không còn pending: đánh dấu consumed, không suy đoán đã hiển thị và không tự nhắc bù vô hạn.
