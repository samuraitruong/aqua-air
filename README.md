# Aqua Air

Ứng dụng React Native cho iOS và Android, triển khai từ `Design/Aqua-Air-React-Native-Spec.md` và 12 màn hình trong `Design/screens`. Giao diện 11 ngôn ngữ (mặc định tiếng Việt), đổi ngôn ngữ trong Cài đặt và lưu SQLite, hoạt động offline, không tài khoản, không backend hoặc telemetry.

## Chạy ứng dụng

Yêu cầu Node.js 22.16 trở lên, npm, Xcode/CocoaPods cho iOS hoặc Android Studio/JDK/Android SDK cho Android.

```sh
npm ci
npm start
```

Build native để thử đầy đủ SQLite, chọn ảnh, chia sẻ file và local notifications:

```sh
npm run ios
npm run android
```

Expo SDK **55.0.32**, React Native **0.83.10**, React **19.2.0**, TypeScript **5.9.x**. Dependency native theo `expo/bundledNativeModules.json`; `package-lock.json` khóa phiên bản thực tế. Runtime tối thiểu từ native dependencies: iOS **15.1**, Android **API 24 / Android 7.0**. Xem phiên bản cụ thể bằng `npm ls --depth=0`.

SDK 55 được chọn để có bộ dependency tương thích và ổn định, không ghép riêng các phiên bản mới nhất. Khi nâng SDK cần chạy lại test, build và nghiệm thu native.

## Ngôn ngữ

Vào **Cài đặt → Ngôn ngữ** để chọn **Tiếng Việt**, English, 简体中文, हिन्दी, Español, العربية, Français, বাংলা, Português (Brasil), Bahasa Indonesia hoặc اردو. Tiếng Việt vẫn là mặc định; lựa chọn đang lưu được giữ nguyên. Áp dụng ngay và giữ sau khi mở lại ứng dụng. Tên bể, ghi chú và nội dung người dùng nhập giữ nguyên. Bản dịch dùng label key độc lập trong `src/i18n/vi.json` và `en.json`; thêm catalog và đăng ký locale/direction cùng dữ liệu plural để mở rộng. Arabic và Urdu có giao diện từ phải sang trái. Xem [kiến trúc và kiểm tra ngôn ngữ](docs/i18n.md).

## Dữ liệu SQLite trên máy

- Database **`aqua-air.db`** nằm trong vùng lưu trữ riêng của ứng dụng trên điện thoại, mở bằng `expo-sqlite`. Bật foreign keys và WAL.
- Bể, nhật ký, lịch, nhắc, job/outbox và cài đặt đều lưu trong SQLite. Không dùng localStorage hoặc AsyncStorage làm database.
- Ảnh lưu trong documents của ứng dụng; SQLite chỉ giữ metadata và đường dẫn tương đối. Ảnh được resize cạnh dài tối đa 1.600 px, mã hóa lại JPEG.
- Đóng/mở app giữ dữ liệu. Gỡ app hoặc xóa dữ liệu ứng dụng có thể làm mất dữ liệu; cần xuất backup trước.
- Không seed dữ liệu mẫu vào app. Ảnh minh họa chào mừng lấy từ bộ thiết kế, không tạo bản ghi bể hoặc nhật ký.

Schema và migration: `src/repositories/schema.ts`. `SqlStore.init()` đọc `PRAGMA user_version`, nâng version bằng transaction; schema hiện tại **6**. Version 2 thêm index tra cứu lịch theo ngày; version 3 thêm kích thước và bộ lọc, giữ dung tích/lịch sử cũ; version 4 lưu dung tích tại thời điểm thay nước để tính lượng nước theo tháng; version 5 thêm thông số nước theo bể; version 6 thêm mẫu đo, mục tiêu, nhật ký ảnh và báo cáo. Không tự reset database khi có lỗi hoặc gặp version mới hơn.

Tổng quan tải latest log theo lịch và lần thay nước mới nhất mỗi bể. Lịch sử bể dùng cursor `(performedAt,createdAt,id)`, mỗi trang 30 bản ghi, `FlatList` chỉ dựng vùng nhìn thấy. Mutation và export đọc snapshot đầy đủ trong transaction để bảo toàn quy tắc lịch.

## Luồng chính

Bốn tab Tổng quan/Bể cá/Lịch/Cài đặt. Tạo/sửa bể và ảnh; nhật ký năm loại hoạt động; lịch riêng theo bể; xem/sửa/xóa hoạt động; đổi hạn, tạm dừng, lưu trữ/mở lại bể; lịch tuần/tháng; backup/restore và xóa dữ liệu sau xác nhận.

Ngày đến hạn tính từ lần **thực hiện** mới nhất, không từ lần nhập gần nhất. Ngày lịch lưu riêng với timestamp UTC; không dùng phép chia chênh milliseconds cho 24 giờ khi cộng ngày. Nhật ký độc lập không hoàn thành lịch khác; hoãn nhắc không đổi hạn và không tạo nhật ký.

Các giá trị chu kỳ/tỷ lệ chỉ là giá trị nhập gợi ý, không phải lời khuyên chăm sóc áp dụng cho mọi bể.

## Kích thước và bộ lọc

Nhập dài × rộng × cao theo cm để tự tính dung tích bể. Sump và canister có thể bật độc lập hoặc đồng thời; dung tích sump nhập riêng theo lít. Ví dụ 100 × 40 × 50 cm = 200 L, cộng sump 60 L = 260 L. Bể cũ chưa có kích thước giữ dung tích đã nhập. Xem [chi tiết và kiểm chứng](docs/tank-dimensions.md).

## Thông báo

Bật nhắc tại lịch hoặc Cài đặt; app chỉ xin quyền khi người dùng chọn bật/gửi thử. Từ chối quyền không chặn các chức năng dữ liệu. Android dùng channel `care`.

Nhắc one-shot cho hạn hiện tại, trước hạn tùy chọn và trễ một lần tùy chọn; horizon 30 ngày và budget 48 job pending trên toàn app. Mở app định kỳ để cập nhật các lời nhắc. Không cam kết OS luôn giao đúng phút; Focus, quyền, force-stop và chính sách tiết kiệm pin có thể ảnh hưởng.

Mutation commit dữ liệu/revision/outbox trước khi gọi OS. Worker chạy tuần tự, nhận diện logical key trong OS pending để tránh trùng sau crash, giữ catchup consumed/cancelled, lặp lại nếu revision đổi trong lúc đang gọi OS. Notification chỉ mở form, không tự ghi chăm sóc.

## Sao lưu và khôi phục

Cài đặt → Sao lưu và khôi phục → Tạo bản sao lưu → share sheet chọn nơi lưu. File mới dùng formatVersion 4 và vẫn đọc được backup version 1/2/3. `.aquaair` là ZIP gồm `manifest.json`, `data.json` và `photos/*`, có version, counts, sizes và SHA-256; không chứa OS notification ID hoặc absolute sandbox path. File không được app mã hóa.

Khôi phục: chọn file → kiểm tra toàn bộ → xem tóm tắt → có thể sao lưu dữ liệu hiện tại → xác nhận Thay thế và khôi phục. MVP không merge.

Import chặn path traversal, duplicate paths, checksum sai, quan hệ sai, ngày/enum sai, schema mới hơn; giới hạn 250 MB nén, 500 MB giải nén, 5.000 file và 10 MB/file. Export bảo đảm giới hạn tương ứng để file do app tạo có thể nhập lại. Nếu ảnh hiện tại thiếu, chọn lại ảnh hoặc chủ động xuất không kèm ảnh với cảnh báo.

Trước restore, app tạo `recovery-before-restore.aquaair` trong documents và ghi ảnh vào generation mới trước commit SQLite. Lỗi trước commit giữ database/ảnh cũ; generation chưa commit được dọn. Sau commit cập nhật thông báo và dọn ảnh cũ; startup thử lại việc dọn orphan. Quyền OS không được khôi phục từ file.

## Kiểm tra

```sh
npm run check
npm exec -- expo install --check
npm exec -- expo export --platform ios --platform android --output-dir artifacts/native-bundles
node --import tsx scripts/benchmark.ts
```

`npm run check` gồm TypeScript strict và Node test runner. Test SQL dùng `node:sqlite` thực, không chỉ mock repository. Node 22 có thể in ExperimentalWarning cho module này; app native dùng `expo-sqlite`.

Đã kiểm tra tự động: calendar/DST/năm nhuận, override/latest log, validation, SQLite transaction/idempotency/rollback/migration, chuyển loại log, xóa lịch giữ lịch sử, phân trang cursor, notification budget/horizon/snooze/catchup/race/adoption/retry, backup Unicode/ảnh/checksum/schema/path và rollback restore khi ghi ảnh thất bại. Đã build và chạy trên iPhone 17 Pro / iOS 26.1 Simulator: tạo/sửa bể, ghi thay nước, kiểm tra file SQLite, tắt/mở lại app, xem lịch, cảnh báo bỏ form và tạo backup qua share sheet. Android hiện mới kiểm tra Hermes bundle, chưa chạy native. Chi tiết trạng thái nghiệm thu ở [docs/acceptance.md](docs/acceptance.md).

Benchmark 100 bể/10.000 logs trên Node SQLite in-memory: tổng quan chỉ tải 100 log, reconcile 48 jobs chỉ đọc lịch sử đầy đủ hai lần. Thời gian phụ thuộc máy và tải build; không dùng số đo này để tuyên bố đạt mục tiêu hiệu năng trên điện thoại.

## Build phát hành

`eas.json` có profile development, preview và production. Có thể dùng EAS sau khi chủ dự án cấu hình tài khoản/project/signing, hoặc build local bằng Expo/Xcode/Gradle. Chưa phát hành lên App Store/Google Play và chưa upload source lên dịch vụ build.

Cần kiểm tra trên **điện thoại thật** trước phát hành: thông báo nền/restart/force-stop/Focus, quyền từ chối và bật lại, backup qua hai install, ảnh/camera, VoiceOver/TalkBack, chữ lớn, 360–430 điểm, keyboard, Reduce Motion và hiệu năng cold start/save/memory.

Giao diện được đối chiếu lại với bản preview gốc; xem [phạm vi và kiểm tra giao diện](docs/design-fidelity.md). Icon ứng dụng và bộ SVG giao diện dùng chung biểu tượng Aqua Air, có thể tái tạo bằng `npm run assets:brand`.

## Lượng nước và chi phí

Trong Cài đặt, chọn tiền tệ và nhập giá theo lít hoặc 1.000 lít (1 m³). Dashboard tổng hợp các lần thay nước đã ghi trong tháng hiện tại: dung tích bể + sump × tỷ lệ thay nước; chi phí ước tính dùng giá hiện tại, không gồm phí cố định, nước châm thêm hoặc nước thải lọc. Bản ghi mới giữ dung tích tại lúc ghi; bản ghi cũ ước tính theo dung tích hiện tại. Nếu thiếu dung tích, app báo tổng chưa đầy đủ. Giá nước và thông tin dung tích được lưu SQLite và sao lưu.

## Build release local và website

Xem [hướng dẫn release](docs/release.md), [báo cáo sẵn sàng store](docs/store-readiness.md) và [ghi chú cho reviewer](docs/store-review-notes.md).

```sh
npm run release:check
npm run release:ios             # archive + IPA, cần signing Apple
npm run release:android:aab     # Play bundle, cần upload key
npm run release:android:apk     # APK kiểm thử, cần upload key
npm run web:preview            # http://127.0.0.1:5501
```

Website tĩnh trong `web/`, chưa deploy. Publisher và URL trong `release/store.json`: Truong Nguyen; privacy/support trên aquaair.truongthings.site. Deploy nội dung `web/` trước rồi chạy `npm run release:check:links`. Không lệnh nào tự upload hay phát hành. Build native cần tối thiểu 8 GiB dung lượng trống; lần kiểm chứng 29/10/2026 dừng do đầy ổ đĩa, chưa có artifact release native được xác nhận.

## Thông số nước theo bể

Trong chi tiết bể, chọn **Ghi nhận thông số nước** hoặc tab **Thông số nước**. Có sẵn pH, nhiệt độ (°C), NH₃/NH₄⁺/NO₂/NO₃/PO₄ (mg/L), GH (°dGH), KH (°dKH), TDS (ppm), độ mặn (ppt). Mỗi lần đo chỉ nhập các chỉ số đã đo, kèm ngày giờ và ghi chú; số 0 hợp lệ. Có thể tạo tối đa 30 chỉ số riêng cho mỗi bể với tên/đơn vị riêng, ví dụ DO (mg/L), ORP (mV), hoặc kết quả bộ test dùng đơn vị/dạng chất khác. Không tự quy đổi các dạng ammonia hoặc suy luận ngưỡng an toàn.

Kết quả gần nhất được lấy riêng cho từng chỉ số và luôn kèm thời gian; lịch sử phân trang 30 lần đo. Có thể sửa/xóa lần đo; bể lưu trữ chỉ xem được. Các bản ghi mới không thay đổi lịch chăm sóc hoặc lượng nước thay trên dashboard.

Sao lưu ghi định dạng **4**, gồm các định nghĩa chỉ số riêng, lần đo và kết quả. Bản cũ định dạng 1/2 vẫn nhập được, với nhật ký đo rỗng. Bản ứng dụng cũ từ chối định dạng 3 để tránh bỏ mất thông số nước.

## GitHub Actions CI

Workflow `.github/workflows/ci.yml` runs on pushes, pull requests and manual dispatch. It uses Node 22, `npm ci`, TypeScript/tests, formatting and Expo exports for both iOS and Android. npm downloads and Metro transforms are cached; Metro cache reuse stays within the same Node version and lockfile. Superseded PR/feature runs are cancelled; default-branch runs are queued so an active deployment can finish.

Successful runs upload `aquaair-app-bundles` and `aquaair-website` artifacts for 7 days. After successful CI on the default branch, a separate job deploys the static site to GitHub Pages. Pull requests and feature branches only validate. Enable Settings → Pages → Source: GitHub Actions once; see [web/README.md](web/README.md) for the default URL and optional custom-domain setup. CI exports app bundles; signed APK/AAB/IPA files still use the local release commands. No signing credentials or Expo account are needed. Native release commands remain documented in [docs/release.md](docs/release.md).

## Tank insights, photo journal and reports

Tank details now link to parameter charts (7/30/90 days), per-tank measurement presets and personal target ranges, a dated photo journal with two-photo comparison, and CSV/PDF exports. All data remains offline in SQLite. Target ranges are user preferences rather than species-specific safety advice; latest results retain their timestamps and can be marked old after a configurable interval (default 7 days).

Presets select fields without copying old values. Selected order is retained, and switching presets keeps typed values visible. Charts show one parameter/unit at a time, use current-device timezone date windows, and display water-change markers. Charts sample at most 200 points; statistics/exports retain every result. Reports filter the recorded local dates shown in care/measurement history.

Photo journal entries store one resized local photo plus date/time and notes. Backup format 4 includes presets, targets, preferences, journal entries and photos; versions 1–3 remain readable. Exports are UTF-8 CSV or locally generated PDFs and cannot restore the app. PDF reports contain tank details, measurement statistics/history and care history, without photos. Expo Print is a new native module: rebuild the development app after installing dependencies (`npm run ios` / `npm run android`).
