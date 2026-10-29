# Aqua Air — kiểm chứng và nghiệm thu

Ngày thực hiện: 28/10/2026. Tài liệu này phân biệt test tự động, bundle và kiểm thử thiết bị; không coi simulator/bundle là bằng chứng nhận thông báo trên điện thoại thật.

## Kết quả tự động

- TypeScript strict: đạt.
- Node tests: 58/58 đạt; gồm test không lộ thông tin SQL trong thông báo lỗi.
- SQLite thật (Node adapter): tạo bể+lịch không log giả, idempotent double tap, thay loại log ảnh hưởng hai lịch, rollback khi lỗi ghi, migration 1→2, xóa lịch có override và cursor pagination đạt.
- Domain: ví dụ mục 6.4, DST calendar day, năm nhuận, ngày không tồn tại, timestamp khác precision, tìm tiếng Việt không dấu đạt.
- Notification adapter test: budget 48/horizon, snooze thay thế, catchup một lần, OS key adoption, revision race và retry khi OS lỗi đạt. Chưa là nghiệm thu giao thông báo thật.
- Backup: Unicode/photo round-trip, file thiếu/checksum/path/version/enum/quan hệ sai và rollback khi staging ảnh thất bại đạt.
- Hermes bundle iOS/Android: xuất thành công. Dependency check Expo: đạt.

## Ma trận mục 12 của đặc tả

| Mục | Bằng chứng hiện có | Cần kiểm tra bổ sung |
| --- | --- | --- |
| 1–2 | Service/SQL: tạo không ảnh, optional lịch, không log giả | Native offline + quyền từ chối |
| 3–6 | Domain/SQL: hạn, override, backdate, loại hoạt động, tỷ lệ độc lập | Chạy luồng UI đầy đủ trên hai OS |
| 7 | Service/worker: snooze giữ hạn/log, archive và tạm dừng | Kiểm tra notification pending thực |
| 8 | SQLite concurrent idempotency và rollback ghi lỗi | Kill process tại ranh giới commit trên native |
| 9–10 | Calendar arithmetic và provider foreground/minute refresh | Qua nửa đêm, đổi timezone, DST native |
| 11–16 | Adapter planner/reconcile test; cấu hình native | Điện thoại iOS/Android: background, restart, force-stop, Focus, quyền, deep link, budget |
| 17 | SQLite mở instance mới giữ dữ liệu | Native relaunch và ảnh local, airplane mode |
| 18–20 | Archive format round-trip, validation, staging rollback | Share sheet + hai install + kill trước/sau commit |
| 21 | Layout cuộn, safe area, keyboard avoidance | Native 360/430, Dynamic Type lớn và keyboard |
| 22 | SQL summary/cursor + FlatList; benchmark 100/10.000 | Profile scroll/memory trên máy tham chiếu |
| 23 | Khởi tạo DB rỗng, không seed mẫu | Kiểm tra install production sạch |

## Checklist trước phát hành

- [ ] Release build iOS và Android cài vào điện thoại thật.
- [ ] Thông báo trên hai OS, gồm từ chối/bật lại quyền, restart/force-stop/Focus.
- [ ] Thông báo cũ không tạo log và mở đúng nơi an toàn.
- [ ] Backup cả ảnh qua hai install, file hỏng giữ dữ liệu cũ.
- [ ] Crash injection trước/sau restore commit.
- [ ] VoiceOver/TalkBack, chữ lớn, Reduce Motion, màn hẹp, form khi bàn phím mở.
- [ ] Đo cold start ≤2s, save ≤500ms trên model/OS được ghi rõ.
- [ ] Cấu hình signing, splash phát hành và EAS project dưới tài khoản chủ dự án.

## Kiểm tra native đã thực hiện

Simulator **iPhone 17 Pro / iOS 26.1**, development build qua Xcode:

- Build/cài/mở app thành công. Native font dependency đã được bổ sung và kiểm tra lại trong bản build cuối.
- Install ban đầu hiển thị chào mừng và không tạo dữ liệu mẫu.
- Tạo bể không ảnh, không cấp quyền thông báo và tạo lịch đầu 7 ngày/30% thành công; không tạo log giả.
- Sửa tên bể thành `Be QA SQLite` thành công.
- Ghi thay nước thực tế 20% ngày 28/10/2026; hạn kế tiếp 04/11/2026; tỷ lệ dự kiến vẫn 30%.
- Đọc trực tiếp `aqua-air.db`: schema 2, một bể, một log 20%, một lịch 7 ngày/30%.
- Tắt và mở lại tiến trình app: dữ liệu vẫn hiển thị trên tổng quan.
- Tab lịch hiển thị đúng hoạt động “Đã ghi nhận”; tab cài đặt hiển thị quyền đang tắt mà không chặn dữ liệu.
- Tạo file `.aquaair` bằng native FileSystem và mở share sheet iOS thành công; sao chép file kiểm thử về workspace và validate bằng bộ đọc backup đạt (1 bể/1 log/1 lịch).
- Form đã sửa hiển thị cảnh báo khi Back; bỏ thay đổi trở lại danh sách, không tạo bể mới.

Bằng chứng local (không upload): `artifacts/screenshots/ios-dashboard.png`, `ios-tank-detail.png`, `ios-backup-share.png`, `artifacts/ios-native-export.aquaair`.

Chưa chạy native Android; chưa có điện thoại thật kết nối. Các mục thông báo nền, camera/photo và khôi phục qua hai install vẫn chưa được nghiệm thu thực tế.

## Ghi chú còn lại

- VI/EN đã được triển khai trong catalog tập trung; lựa chọn ngôn ngữ lưu SQLite. Xem `docs/i18n.md` cho phạm vi và kiểm tra bổ sung.
- Export/import ZIP đang xử lý trong bộ nhớ trong giới hạn đã kiểm tra; cần profile trên điện thoại tham chiếu với archive lớn trước phát hành.
- `npm audit` có cảnh báo trong cây Expo/tooling (bao gồm Zod do Expo CLI dùng). Không áp dụng gợi ý downgrade SDK cưỡng bức; cần rà soát lại khi nâng bộ Expo trước phát hành. App không dùng Zod để kiểm tra backup và không có backend.

## Bổ sung VI/EN

Đã kiểm tra chuyển ngôn ngữ ngay trong Cài đặt, giữ EN sau restart và chuyển lại VI trên iOS Simulator. SQLite lưu lựa chọn ngôn ngữ mà không sửa lịch sử/hạn/snooze. Test kiểm tra backup cũ/mới, nội dung notification và đổi ngôn ngữ giữa lúc worker chạy. Xem `docs/i18n.md`.

## Bổ sung kích thước và bộ lọc

Schema 3 và backup format 2 đã triển khai, có kiểm tra tương thích dữ liệu cũ. Simulator xác nhận 100×40×50 cm →200 L và sump60 L →260 L với canister bật đồng thời. Đọc SQLite xác nhận thông số lưu và giữ ba log cũ. Xem `docs/tank-dimensions.md`.

## Refactor label keys

Đã chuyển catalog sang `LABEL_KEY → bản dịch` trong vi.json/en.json, registry locale và engine tổng quát; bỏ việc dịch ngược chuỗi. Test có locale thứ ba và fallback plural; simulator xác nhận VI/EN, số lượng và các hoạt động cũ vẫn hiển thị đúng. Xem `docs/i18n.md`.

## Đối chiếu thiết kế và bộ icon

Đã khôi phục bố cục theo HTML gốc, dùng lại 19 SVG của bản thiết kế và thêm launcher iOS/Android. Có polyfill Intl.Locale/PluralRules cho Hermes cùng regression test. Chi tiết kiểm tra và giới hạn ở `docs/design-fidelity.md`.

## Eleven languages

Top ten total-speaker languages plus Vietnamese are registered (VI stays default). Nine full catalogs, native permission descriptions, RTL for Arabic/Urdu, localized numeric input and locale-aware name sorting are implemented. All 11 selections were exercised in Settings on iOS; tests cover persistence, backup and notifications for every registered language. See `docs/i18n.md` for variants, verification and remaining linguistic/Android visual review.

### Monthly water usage — 2026-10-29

- TypeScript and 64 tests pass, including populated SQLite schema-3 → 4 migration, full-month aggregation beyond summary limits, local month boundaries, sump/archived tank handling, log edits/deletion, immutable capacity snapshots and backup compatibility.
- iOS native: 156 L × AUD 4/1000 L = AUD 0.62; unit switch converts to AUD 0.004/L; rate survives restart. VND pricing and Arabic RTL verified. Temporary example rates cleared; Vietnamese restored.
- Existing user tanks and histories retained. Unknown capacities visibly mark incomplete totals. Native Android visual testing remains unperformed; Android and iOS bundle exports succeed.
