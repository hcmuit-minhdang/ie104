# 🍜 NomNom: Website công thức nấu ăn

> Đồ án môn **IE104 – Internet và Công nghệ Web** (GV: ThS. Võ Tấn Khoa)
> Tìm công thức, nấu theo nguyên liệu đang có trong tủ lạnh, so sánh giá nguyên liệu, lưu món yêu thích và chia sẻ công thức của chính bạn.

- 🌐 **Demo trực tuyến:** https://nomnom-taupe.vercel.app
- 💻 **Mã nguồn:** https://github.com/hcmuit-minhdang/NomNom
- 🎨 **Thiết kế Figma:** https://www.figma.com/design/1XVDA0jnedoKuCL9rYodr7/IE104
- 🗂️ **Quản lý công việc:** https://app.notion.com/p/IE104-NomNom-41c2218b6ea98086b85be6ce87b3a267?source=copy_link
- 🎬 **Video báo cáo và demo (YouTube, unlisted):** _(điền link)_

---

## 👥 Thành viên nhóm

Nhóm: **11**

| STT | Họ tên | MSSV | Phần phụ trách | Đóng góp |
|---|---|---|---|---|
| 1 | Đặng Lê Thanh Minh | 24521051 | Thiết kế Figma và code trang Về chúng tôi (About Us), trang cá nhân (lịch sử, đã lưu, đã đánh giá, đã đăng); tạo và thiết lập repository GitHub; kiểm tra và sửa lỗi website | 20% |
| 2 | Trương Tấn Phát | 24521322 | Thiết kế Figma và code trang danh mục, trang kết quả tìm kiếm; slide; thuyết trình | 20% |
| 3 | Lê Hải Thạch | 24521590 | Thiết kế Figma và code trang chủ, chi tiết công thức, đăng công thức, so sánh nguyên liệu | 20% |
| 4 | Võ Thị Thanh Thư | 23521547 | Viết mô tả chức năng chính; thiết kế Figma và code trang công thức theo nguyên liệu tủ lạnh và trang kết quả; bảng phân công, file text; slide; thuyết trình | 20% |
| 5 | Nguyễn Quốc Thịnh | 24521695 | Thiết kế Figma và code header, footer, đăng nhập, đăng ký; quay video demo; viết báo cáo | 20% |
| | **Tổng** | | | **100%** |

### Tiến độ công việc

| Công việc | Người phụ trách | Trạng thái |
|---|---|---|
| Viết mô tả chức năng chính | Thư | Hoàn thành |
| Thiết kế Figma và code: header, footer, đăng nhập, đăng ký | Thịnh | Hoàn thành |
| Thiết kế Figma và code: trang chủ, chi tiết công thức, đăng công thức, so sánh nguyên liệu | Lê Hải Thạch | Hoàn thành |
| Thiết kế Figma và code: trang danh mục, kết quả tìm kiếm | Phát | Hoàn thành |
| Thiết kế Figma và code: About Us, trang cá nhân (lịch sử, đã lưu, đã đánh giá, đã đăng) | Minh | Hoàn thành |
| Thiết kế Figma và code: công thức theo nguyên liệu tủ lạnh và trang kết quả | Thư | Hoàn thành |
| Thiết lập repository GitHub | Minh | Hoàn thành |
| Kiểm tra và sửa lỗi website | Minh | Hoàn thành |
| Bảng phân công công việc và file text | Thư | Chưa bắt đầu |
| Slide giới thiệu dự án và các chức năng chính | Phát, Thư | Chưa bắt đầu |
| Quay video demo | Thịnh | Chưa bắt đầu |
| Viết báo cáo | Thịnh | Chưa bắt đầu |
| Thuyết trình trước lớp | Phát, Thư | Chưa bắt đầu |

---

## ✨ Tính năng

**Người dùng chưa đăng nhập**
- **Trang chủ:** banner, danh mục, công thức thịnh hành, công thức mới từ cộng đồng, bảng vinh danh đầu bếp, ô tìm kiếm công thức, hộp chọn nguyên liệu tủ lạnh nhanh.
- **Danh mục món ăn:** mở trang không kèm tham số sẽ hiện trang chọn danh mục (mỗi nhóm món một thẻ ảnh, kèm thẻ *Tất cả món*); chọn một nhóm để xem danh sách món, lọc theo các nhóm nhãn (đạm, tinh bột, rau củ & nấm, trái cây, chế độ ăn, vùng miền, ngân sách), sắp xếp (điểm, thời gian, giá, mới nhất) và phân trang.
- **Tìm kiếm:** tìm theo tên món, nguyên liệu, danh mục và nhãn. Gõ không dấu thì tìm không phân biệt dấu (`bo` khớp cả "bò", "bơ"); gõ có dấu thì chỉ nhận món chứa đúng chữ có dấu (`bò` không khớp "bơ", "bông"). Mặc định xếp theo **độ liên quan** (khớp đúng cụm có dấu > khớp nguyên từ > chỉ chứa chuỗi, tên món ưu tiên hơn nguyên liệu), có thể đổi sang điểm, mới nhất, thời gian, giá; lọc theo thời gian nấu và mức giá; phân trang.
- **Chi tiết công thức:** nguyên liệu (đổi khẩu phần thì tự tính lại lượng nguyên liệu và tổng chi phí), hướng dẫn ngắn gọn và từng bước kèm ảnh, dinh dưỡng, chi phí (tổng và theo phần), công thức tương tự, in công thức, chia sẻ (Facebook, sao chép liên kết), đánh giá sao, bình luận có sắp xếp (mới nhất, cũ nhất, nhiều lượt thích), thích bình luận. Điểm hiển thị là trung bình gộp của điểm mẫu và đánh giá mới.
- **Công thức theo nguyên liệu tủ lạnh:** chọn nguyên liệu đang có theo nhóm (đạm, tinh bột, rau củ & nấm, trái cây; ô *Khác* cho phép tự nhập nguyên liệu, có gợi ý từ danh mục nguyên liệu), lọc thêm theo chế độ ăn, vùng miền, ngân sách (cùng bộ nhãn với trang Danh mục) và từ khóa; website gợi ý món phù hợp kèm nhãn *Đủ / Chưa đủ nguyên liệu*, phần trăm khớp, nguyên liệu đã có và còn thiếu.
- **So sánh giá nguyên liệu:** ô tìm nguyên liệu, chọn một nguyên liệu (mỗi lần một nguyên liệu, chọn cái mới sẽ thay cái cũ) để xem giá ở 6 cửa hàng, sắp từ rẻ đến đắt; nút *Mua ngay* mở trang chủ của cửa hàng. Giá là số mô phỏng.
- **Gợi ý bất ngờ** (menu *Công thức* trên header): mở ngẫu nhiên một công thức.
- **Về chúng tôi** (`about.html`): câu chuyện, hướng dẫn sử dụng, nhóm thực hiện, câu hỏi thường gặp, mục **Góp ý** (biểu mẫu gửi góp ý) và mục **Liên hệ** (số điện thoại, email, mạng xã hội).
- Trang chính sách: bảo mật, điều khoản sử dụng, hỗ trợ tiếp cận.

**Người dùng đã đăng nhập**
- Đăng ký, đăng nhập, đăng xuất, đổi email / tên đăng nhập / mật khẩu (cần nhập mật khẩu hiện tại), xóa tài khoản.
- **Lưu / bỏ lưu** công thức, **đánh giá** (1–5 sao kèm bình luận), xóa đánh giá của mình, thích bình luận.
- **Đăng tải công thức** kèm ảnh món (tối đa 5 ảnh) và ảnh từng bước (PNG/JPEG/WebP, tối đa 3 MB mỗi ảnh, tự thu nhỏ về tối đa 800px khi lưu); nhập nguyên liệu có gợi ý từ danh mục; tự lưu nháp phần chữ của form (ảnh phải chọn lại).
- **Sửa và xóa công thức đã đăng** ở mục *Đã đăng* (sửa tên món, mô tả, tổng thời gian, khẩu phần; giá mỗi phần giữ nguyên, tổng chi phí tính lại theo khẩu phần), nút đăng công thức mới ngay trong mục này.
- **Góc của tôi:** tổng quan, đã lưu, đã đăng, đã đánh giá, lịch sử xem (có nút xóa lịch sử); **đổi ảnh đại diện** (cắt vuông 256px) **và ảnh bìa** (tối đa 1400×600).

**Giao diện và trải nghiệm**
- Bố cục theo thiết kế Figma, dùng Flexbox, CSS Grid và container query (`cqw`) nên co giãn theo màn hình desktop, tablet và điện thoại; tên món dài tự thu nhỏ chữ hoặc xuống 2 dòng.
- Header cố định, menu dạng ngăn kéo trên điện thoại, popup đăng nhập/đăng ký có hiệu ứng.
- Phân trang, bộ lọc dùng chung, trạng thái đang tải (khung xương) và thông báo lỗi bằng tiếng Việt.

---

## 🧰 Công nghệ

| Mục | Nội dung |
|---|---|
| Ngôn ngữ | **HTML5, CSS3, JavaScript thuần (ES6+)** |
| Bố cục | Flexbox, CSS Grid, container query, media query |
| Dữ liệu | **Fetch API** tải file JSON tĩnh (`data/db.json`), xử lý trong `js/store.js` |
| Lưu trên trình duyệt | `localStorage` (tài khoản, phiên đăng nhập, ảnh đại diện/ảnh bìa, công thức đã lưu/đã đăng, đánh giá, lịch sử, góp ý, bản nháp form đăng tải) |
| Triển khai | Bất kỳ hosting tĩnh nào (Vercel, Netlify, ...) |

**Không có máy chủ (backend).** Toàn bộ website là file tĩnh nằm ngay trong thư mục gốc của dự án. Không dùng Bootstrap, jQuery, Tailwind hay thư viện nào khác, không dùng template có sẵn, không có dependency npm. Tài nguyên ngoài chỉ gồm Google Fonts và các liên kết: mạng xã hội, trang chủ các cửa hàng (nút *Mua ngay*), WebMD (gợi ý tra dinh dưỡng ở trang đăng tải) và Facebook (chia sẻ công thức).

### Dữ liệu hoạt động thế nào

Các trang lấy dữ liệu qua [`js/data.js`](js/data.js) (ví dụ `NomNom.data.get('/recipes', {...})`), lớp này gọi tiếp vào [`js/store.js`](js/store.js) (`NomNomStore.run(...)`). Mọi xử lý chạy trong trình duyệt, không có lời gọi tới máy chủ nào:

- Dữ liệu gốc được tải một lần từ `data/db.json` bằng **Fetch API** (`fetch('/data/db.json')` trong `store.js`). File tĩnh này chứa 131 công thức, tài khoản demo cùng lượt lưu, đánh giá và lịch sử mẫu. Danh mục nguyên liệu và bảng giá mô phỏng của các cửa hàng nằm ngay trong `js/store.js`.
- Lọc, tìm kiếm, phân trang, đánh giá, gợi ý theo nguyên liệu, so sánh giá... đều do JavaScript trong `store.js` tính.
- Phần người dùng thay đổi (tài khoản, lưu, đánh giá, đăng/sửa/xóa công thức, lịch sử, góp ý) lưu trong `localStorage` của **chính trình duyệt đó**, nên mỗi máy có dữ liệu riêng.
- Công thức gốc mà người dùng sửa hoặc xóa được ghi lại trong `localStorage` (`seedEdits`, `deletedSeed`) rồi áp lên dữ liệu từ `db.json` mỗi lần tải trang.
- Mật khẩu được băm bằng PBKDF2-SHA256 (Web Crypto) kèm salt ngẫu nhiên, không lưu mật khẩu thô.
- Muốn đặt lại dữ liệu: xóa dữ liệu trang web trong trình duyệt, hoặc gõ `NomNomLocal.reset()` trong Console.

---

## 🚀 Chạy trên máy

Chỉ cần một web server tĩnh phục vụ thư mục gốc của dự án (thư mục chứa `index.html`), chọn một trong các cách:

```bash
# Cách 1: VS Code → cài tiện ích "Live Server" → chuột phải index.html → Open with Live Server
# Cách 2: Python
python -m http.server 3000
# Cách 3: Node.js
npx serve . -l 3000      # hoặc: npm start
```

Rồi mở http://localhost:3000 (Live Server dùng cổng 5500).

> Phải mở qua web server (không mở trực tiếp bằng `file://`) và lấy thư mục chứa `index.html` làm thư mục gốc, vì trang dùng đường dẫn tuyệt đối `/css/...`, `/js/...`, `/images/...` và cần `fetch` được `/data/db.json`.

### Tài khoản dùng thử

| Trường | Giá trị |
|---|---|
| Tên đăng nhập | `demo` (hoặc email `demo@nomnom.vn`) |
| Mật khẩu | `demo123` |

Tài khoản này có sẵn 4 công thức đã lưu, 2 công thức đã đăng, 4 đánh giá và lịch sử xem. Bạn cũng có thể tự đăng ký tài khoản mới.

---

## ☁️ Triển khai

Đưa cả dự án lên hosting tĩnh. Với Vercel: import repo, giữ nguyên `vercel.json` (`framework: null`, không có lệnh build, `outputDirectory: "."`). Mỗi lần push lên `main`, Vercel tự triển khai lại.

---

## 📁 Cấu trúc thư mục

```text
NomNom/
├─ index.html                # Trang chủ
├─ about.html                # Về chúng tôi (có mục Góp ý và Liên hệ)
├─ README.md, STRUCTURE.md   # tài liệu
├─ package.json              # chỉ có script start, không có dependency
├─ vercel.json               # cấu hình triển khai tĩnh
├─ .gitignore
├─ pages/
│  ├─ category.html          # chọn danh mục / danh sách món theo danh mục
│  ├─ search.html            # kết quả tìm kiếm
│  ├─ recipe.html            # chi tiết công thức
│  ├─ upload.html            # đăng tải công thức
│  ├─ ingredients.html       # so sánh giá nguyên liệu
│  ├─ fridge.html            # chọn nguyên liệu tủ lạnh
│  ├─ fridge-results.html    # kết quả công thức theo nguyên liệu tủ lạnh
│  ├─ policy.html            # chính sách và điều khoản
│  └─ account/               # Góc của tôi: index, overview, saved, uploaded, reviewed, history
├─ css/                      # components/ (header, footer, login, signup, filter, pager, ...), pages/ (mỗi trang một file)
├─ js/                       # data.js, store.js, components/ (header, auth, login, signup, filter, ...), pages/ (mỗi trang một file)
├─ data/db.json              # dữ liệu gốc (công thức, tài khoản demo, lượt lưu/đánh giá/lịch sử mẫu)
├─ images/                   # hình ảnh (icons/ là các biểu tượng)
└─ fonts/                    # font chữ Inter
```

Cấu trúc bám theo hướng dẫn của giảng viên (`css/ js/ images/ index.html about.html README.md .gitignore`). Nhóm chia thêm `pages/` cho các trang còn lại và `data/` cho dữ liệu JSON. Phần **liên hệ** nằm trong trang `about.html` (mục `#lien-he`) nên không có `contact.html` riêng.

Quy ước: đường dẫn trong HTML/CSS/JS luôn là đường dẫn tuyệt đối từ gốc site.

---

## ⚠️ Giới hạn đã biết

- Dữ liệu người dùng lưu theo từng trình duyệt (`localStorage`, khoảng 5 MB): tài khoản tạo ở máy này không đăng nhập được ở máy khác, công thức đăng tải chỉ hiện trên trình duyệt của người đăng, góp ý gửi đi cũng chỉ lưu trên máy đó. Ảnh công thức được thu nhỏ tối đa 800px để tiết kiệm chỗ; khi bộ nhớ đầy, website báo lỗi và không lưu.
- Danh sách công thức luôn lấy mới từ `data/db.json`, còn tài khoản, đánh giá, công thức đã lưu và lịch sử lấy từ `localStorage` nên không cập nhật theo `db.json`. Muốn nhận dữ liệu mẫu mới thì xóa dữ liệu trang web hoặc gõ `NomNomLocal.reset()` trong Console.
- Phiên đăng nhập luôn giữ 30 ngày (không có tùy chọn "Ghi nhớ tôi"); "Quên mật khẩu" chỉ hiện thông báo vì tài khoản nằm trên trình duyệt, không có email khôi phục.
- Các tài khoản mẫu khác trong `db.json` (`minh_anh`, `hoa.tran`, `thanh_nga`, `quoc_bao`, `lan_huong`, `duc_anh`, `mai_ngoc`) dùng định dạng băm mật khẩu cũ nên không đăng nhập được; chỉ dùng làm tác giả công thức, đánh giá mẫu và để Bảng vinh danh có nhiều người. Hãy dùng tài khoản `demo`.
- Sửa công thức đã đăng chỉ đổi được tên món, mô tả, thời gian và khẩu phần; muốn đổi nguyên liệu, các bước hay ảnh thì xóa và đăng lại.
- Gợi ý theo tủ lạnh so khớp với tối đa 8 nguyên liệu chính của mỗi món; nguyên liệu tự nhập không có trong danh mục sẽ không khớp được món nào.
- Chi tiết (nguyên liệu, các bước) của một số công thức mẫu được sinh theo tên món, không phải công thức thật.
- Giá nguyên liệu ở các cửa hàng là dữ liệu mô phỏng; nút *Mua ngay* chỉ mở trang chủ cửa hàng. Liên kết mạng xã hội ở footer và trang Liên hệ trỏ tới trang chủ chung của mạng xã hội (nhóm chưa có trang riêng).
- Trang công thức tạo nội dung bằng JavaScript nên thẻ Open Graph (`og:title`, `og:description`) của trang này là chung, không theo từng món.

---

## 📄 Giấy phép và ghi nhận

Sản phẩm học tập của nhóm cho môn IE104, không dùng cho mục đích thương mại. Ảnh minh họa món ăn thuộc về chủ sở hữu tương ứng và chỉ dùng để trình bày đồ án.
