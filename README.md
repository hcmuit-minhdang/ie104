# 🍜 NomNom — Website công thức nấu ăn

> Đồ án môn **IE104 – Internet và Công nghệ Web** (GV: ThS. Võ Tấn Khoa)
> Tìm công thức, nấu theo nguyên liệu đang có trong tủ lạnh, so sánh giá nguyên liệu, lưu món yêu thích và chia sẻ công thức của chính bạn.

- 🌐 **Demo trực tuyến:** https://nomnom-taupe.vercel.app (chạy chế độ demo, xem mục [Demo trên Vercel](#-demo-trên-vercel))
- 💻 **Mã nguồn:** https://github.com/hcmuit-minhdang/ie104
- 🎨 **Thiết kế Figma:** https://www.figma.com/design/1XVDA0jnedoKuCL9rYodr7/IE104
- 🗂️ **Quản lý công việc (Trello/Notion):** _(điền link)_
- 🎬 **Video báo cáo và demo (YouTube, unlisted):** _(điền link)_

---

## 👥 Thành viên nhóm

Nhóm: **_(số nhóm)_**

| STT | Họ tên | MSSV | Phần phụ trách | Đóng góp |
|---|---|---|---|---|
| 1 | Minh | _(MSSV)_ | Trang chủ, Về chúng tôi, 5 trang Góc của tôi (tổng quan, đã lưu, đã đăng, đã đánh giá, lịch sử), tích hợp, máy chủ dữ liệu | _(%)_ |
| 2 | Tấn Phát | _(MSSV)_ | Trang danh mục và tìm kiếm | _(%)_ |
| 3 | Thạch | _(MSSV)_ | Trang chi tiết công thức, so sánh giá nguyên liệu | _(%)_ |
| 4 | Thanh | _(MSSV)_ | Trang tìm công thức theo nguyên liệu trong tủ lạnh | _(%)_ |
| 5 | Thịnh | _(MSSV)_ | Trang đăng tải công thức | _(%)_ |
| | **Tổng** | | | **100%** |

> Lịch sử đóng góp từng người nằm ở repo làm việc của nhóm: https://github.com/hcmuit-minhdang/NomNom (mỗi thành viên một thư mục và nhánh riêng). Repo `ie104` này là bản ghép hoàn chỉnh cuối cùng.

---

## ✨ Tính năng

**Người dùng chưa đăng nhập**
- Trang chủ: banner, danh mục, món phổ biến, bảng xếp hạng đầu bếp, tìm kiếm nhanh.
- **Danh mục món ăn:** lọc theo nhóm món, thời gian nấu, mức giá, sắp xếp (điểm, thời gian, giá, mới nhất), phân trang.
- **Tìm kiếm** không phân biệt dấu tiếng Việt (tên món, nguyên liệu, danh mục).
- **Chi tiết công thức:** nguyên liệu, các bước kèm ảnh, đánh giá sao, bình luận, thích bình luận.
- **Tủ lạnh của tôi:** chọn nguyên liệu đang có, hệ thống gợi ý món phù hợp kèm nhãn *Đủ / Chưa đủ nguyên liệu* và phần trăm khớp.
- **So sánh giá nguyên liệu** giữa các cửa hàng.
- Trang Về chúng tôi, chính sách (bảo mật, điều khoản, tiếp cận), biểu mẫu liên hệ.

**Người dùng đã đăng nhập**
- Đăng ký, đăng nhập, đăng xuất, sửa thông tin, đổi mật khẩu, xóa tài khoản.
- **Lưu / bỏ lưu** công thức, **đánh giá** (1–5 sao), thích bình luận.
- **Đăng tải công thức** cùng ảnh (tải ảnh lên, kiểm tra định dạng và dung lượng), xóa công thức của mình.
- **Góc của tôi:** tổng quan, đã lưu, đã đăng, đã đánh giá, lịch sử xem.

**Giao diện và trải nghiệm**
- Bố cục theo thiết kế Figma, dùng Flexbox, CSS Grid và container query (`cqw`) nên co giãn đúng ở màn hình laptop 15.6", desktop 23.8", tablet và điện thoại.
- Header gọn cố định, menu dạng ngăn kéo trên điện thoại, popup đăng nhập/đăng ký có hiệu ứng.
- Phân trang, bộ lọc dùng chung, trạng thái đang tải và thông báo lỗi tiếng Việt.

---

## 🧰 Công nghệ

| Lớp | Công nghệ |
|---|---|
| Giao diện | **HTML5, CSS3, JavaScript thuần (ES6+)** |
| Gọi dữ liệu | `fetch` API tới JSON API của chính site |
| Lưu trữ phía trình duyệt | `localStorage` (nháp form đăng tải) |
| Triển khai | Vercel hoặc chạy bằng `node server.js` |

**Tuân thủ yêu cầu môn học:** không Bootstrap, jQuery, Tailwind hay thư viện/framework nào khác; không dùng template có sẵn; không có dependency npm (`package.json` chỉ có script). Tài nguyên ngoài duy nhất là Google Fonts và liên kết mạng xã hội.

> Trọng tâm của đồ án là giao diện và xử lý tương tác trên trình duyệt (toàn bộ trong `public/`). Dữ liệu được tải bằng `fetch`. Thư mục `server/` (Node.js thuần, không thư viện) chỉ là **phần tùy chọn nâng cao** cung cấp dữ liệu và chức năng tài khoản, xem mục [Phần tùy chọn: máy chủ dữ liệu](#-phần-tùy-chọn-máy-chủ-dữ-liệu).

---

## 🚀 Cài đặt và chạy

Yêu cầu: **Node.js ≥ 18** chỉ để chạy máy chủ phục vụ trang và dữ liệu mẫu (nhóm dùng v24). Không cần `npm install`.

```bash
git clone https://github.com/hcmuit-minhdang/ie104.git
cd ie104
node server.js            # mở http://localhost:3000
```

Các lệnh khác:

```bash
npm start                                          # tương đương node server.js
npm test                                           # chạy bộ test API tự động
node server.js --port=3101 --db=D:/tmp/test-db.json   # đổi cổng và file dữ liệu
```

- Biến môi trường: `PORT` (mặc định 3000), `NOMNOM_DB` (mặc định `server/data/db.json`), `NOMNOM_UPLOADS` (mặc định `server/uploads`), `NOMNOM_RATE_LIMIT` (số lần đăng nhập/đăng ký mỗi phút mỗi IP, mặc định 10). Cờ `--port=`, `--db=`, `--uploads=`, `--public=` được ưu tiên hơn biến môi trường.
- **Luôn mở site qua server**, không mở bằng `file://`, vì trang dùng đường dẫn tuyệt đối `/css/...`, `/js/...`, `/api/...`.

### Tài khoản dùng thử

| Trường | Giá trị |
|---|---|
| Tên đăng nhập | `demo` (hoặc email `demo@nomnom.vn`) |
| Mật khẩu | `demo123` |

Tài khoản này có sẵn công thức đã lưu, 2 công thức đã đăng, 4 đánh giá và lịch sử xem.

### Đặt lại dữ liệu

Dừng server, xóa `server/data/db.json` (và các file trong `server/uploads/` nếu muốn), chạy lại để nạp dữ liệu mẫu mới.

---

## 📁 Cấu trúc thư mục

```text
final/
├─ server.js                 # điểm vào: HTTP server + file tĩnh + API
├─ package.json              # chỉ có script start/test, không có dependency
├─ vercel.json               # cấu hình triển khai Vercel
├─ api/index.js              # hàm serverless cho Vercel (bọc server, đồng bộ Redis nếu có)
├─ README.md, STRUCTURE.md   # tài liệu
├─ server/                   # BACKEND (JavaScript)
│  ├─ API.md                 # đặc tả API
│  ├─ lib/                   # app, router, static, session, hash, validate, db, model, ...
│  ├─ routes/                # auth, recipes, me, reviews, ingredients, misc
│  ├─ seed/                  # dữ liệu mẫu nạp lần đầu
│  ├─ data/                  # db.json (tự sinh khi chạy)
│  ├─ uploads/               # ảnh người dùng tải lên
│  └─ tests/run.js           # test API tự động
└─ public/                   # FRONTEND, thư mục duy nhất được phục vụ ở "/"
   ├─ index.html             # Trang chủ
   ├─ pages/                 # category, search, recipe, upload, ingredients, fridge,
   │                         # fridge-results, about, policy, account/*
   ├─ css/                   # base.css, components/ (header, footer, login, signup), pages/
   ├─ js/                    # api.js, components/ (header, auth), pages/
   └─ assets/                # images, icons, fonts
```

So với gợi ý của giảng viên (`css/ js/ images/ index.html about.html contact.html`): nhóm gom phần giao diện vào `public/` để tách khỏi phần máy chủ. Phần **liên hệ** nằm ngay trong trang `about.html` (biểu mẫu gửi tới `POST /api/contact`).

Quy ước: đường dẫn trong HTML/CSS/JS luôn là đường dẫn tuyệt đối từ gốc site.

---

## 🔌 Phần tùy chọn: máy chủ dữ liệu

Giao diện gọi các endpoint dưới đây để lấy dữ liệu. Máy chủ viết bằng Node.js thuần và là phần làm thêm, không bắt buộc theo đề bài.

### API tóm tắt

Chi tiết xem [`server/API.md`](server/API.md). Lỗi trả về dạng `{ "error": "thông báo tiếng Việt", "field"?: "..." }`. Phiên đăng nhập bằng cookie `nomnom_sid` (HttpOnly, SameSite=Lax, 30 ngày).

| Method + đường dẫn | Mô tả | Cần đăng nhập |
|---|---|---|
| POST `/api/auth/register`, `/login`, `/logout` | Đăng ký / đăng nhập / đăng xuất | – |
| GET / PATCH / DELETE `/api/me` | Xem, sửa, xóa tài khoản | PATCH, DELETE |
| GET `/api/recipes` | Tìm và lọc: `q`, `category`, `maxTime`, `maxPrice`, `sort`, `page`, `limit` | – |
| GET `/api/categories` | Danh mục và số lượng | – |
| GET `/api/recipes/:id` | Chi tiết (ghi lịch sử nếu đã đăng nhập) | – |
| POST `/api/recipes`, DELETE `/api/recipes/:id` | Đăng / xóa công thức của mình | có |
| POST `/api/uploads` | Tải ảnh PNG/JPEG/WebP ≤ 3 MB | có |
| PUT/DELETE `/api/recipes/:id/save` | Lưu / bỏ lưu | có |
| GET `/api/me/saved`, `/uploaded`, `/history`, `/reviews`, `/overview` | Góc của tôi | có |
| GET/POST `/api/recipes/:id/reviews` | Xem / đăng đánh giá | POST |
| POST `/api/reviews/:id/like`, DELETE `/api/reviews/:id` | Thích / xóa đánh giá | có |
| GET `/api/ingredients`, `/api/ingredients/compare` | Nguyên liệu và so sánh giá | – |
| GET `/api/fridge?ingredients=...` | Gợi ý món theo nguyên liệu | – |
| GET `/api/leaderboard`, POST `/api/contact`, GET `/api/health` | Bảng xếp hạng, liên hệ, kiểm tra sống | – |

---

### Bảo mật và chất lượng

- Mật khẩu băm `scrypt` kèm salt ngẫu nhiên; phiên lưu dạng băm SHA-256.
- Chống path traversal khi phục vụ file tĩnh, không lộ `server/`, `.git`.
- Header bảo mật (CSP, `X-Frame-Options`, `nosniff`), kiểm tra Origin cho request ghi, giới hạn tần suất đăng nhập/đăng ký.
- Ảnh tải lên được kiểm tra chữ ký file (magic bytes), loại và dung lượng.
- Chống XSS: dữ liệu hiển thị đều được escape (`NomNom.esc`).
- Bộ test API tự động (`npm test`): 20 kiểm thử đều đạt.

---

## ☁️ Demo trên Vercel

Vercel chạy nhiều instance tách biệt và chỉ cho ghi ở `/tmp`, nên bản trực tuyến chạy **chế độ demo** khi chưa nối Redis:

- Đăng ký tạm đóng; dùng tài khoản `demo` / `demo123` (popup đăng nhập có nút điền sẵn).
- Phiên đăng nhập là token tự ký (HMAC) nên hợp lệ ở mọi instance.
- Dữ liệu cá nhân (lưu, đánh giá, ...) chỉ nằm trong bộ nhớ tạm của từng instance.

**Muốn đăng ký và lưu dữ liệu bền vững:** Vercel → dự án → *Storage* → tạo/kết nối **Upstash for Redis** (gói miễn phí) → *Connect to project* → **Redeploy**. `api/index.js` tự dùng Redis khi thấy biến `KV_REST_API_URL` + `KV_REST_API_TOKEN` (hoặc `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).

Khi demo trước lớp, nên chạy `node server.js` trên máy để có đầy đủ chức năng.

---

## ⚠️ Giới hạn đã biết

- Chi tiết (nguyên liệu, các bước) của một số công thức dạng thẻ được sinh theo tên món từ dữ liệu mẫu, không phải công thức thật.
- Giá nguyên liệu ở các cửa hàng là dữ liệu mô phỏng.
- CSDL là file JSON: phù hợp quy mô đồ án, không dành cho nhiều người dùng đồng thời.

---

## 📄 Giấy phép và ghi nhận

Sản phẩm học tập của nhóm cho môn IE104, không dùng cho mục đích thương mại. Ảnh minh họa món ăn thuộc về chủ sở hữu tương ứng và chỉ dùng để trình bày đồ án.
