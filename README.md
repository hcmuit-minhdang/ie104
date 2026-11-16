# NomNom — website công thức nấu ăn

Backend Node.js thuần (chỉ module có sẵn: `http`, `fs`, `crypto`, `path`, `url`; không npm, không framework, không CSDL ngoài) + frontend tĩnh (HTML/CSS/JS) trong `public/`.

## Chạy

```bash
node server.js              # http://localhost:3000
node server.js --port=3101 --db=D:/tmp/test-db.json
npm start                   # tương đương node server.js
npm test                    # node server/tests/run.js
```

- Cấu hình: biến môi trường `PORT` (mặc định 3000), `NOMNOM_DB` (mặc định `server/data/db.json`), `NOMNOM_UPLOADS` (mặc định `server/uploads`), `NOMNOM_RATE_LIMIT` (số lần đăng nhập/đăng ký mỗi phút mỗi IP, mặc định 10). Cờ CLI `--port=`, `--db=`, `--uploads=`, `--public=` ưu tiên hơn biến môi trường.
- Tài khoản demo: **demo** / **demo@nomnom.vn** / mật khẩu **demo123** (có sẵn công thức đã lưu, 2 công thức đã đăng, 4 đánh giá, lịch sử xem).
- Luôn mở site qua server (không mở bằng `file://`), vì trang dùng đường dẫn tuyệt đối `/css/...`, `/api/...`.

## Cấu trúc thư mục

```text
final/
├─ server.js                 # điểm vào: node server.js  (HTTP server + static + API, chỉ module có sẵn của Node)
├─ package.json              # chỉ có script "start"/"test", KHÔNG có dependency
├─ README.md                 # file này
├─ STRUCTURE.md
├─ server/                   # BACKEND (JavaScript, Node)
│  ├─ API.md                 # hợp đồng API
│  ├─ lib/                   # app, http, router, static, session, hash, validate, db, model, catalog, seed, text
│  ├─ routes/                # auth.js, recipes.js, me.js, reviews.js, ingredients.js, misc.js
│  ├─ seed/                  # dữ liệu gốc nạp lần đầu (recipes/, ingredients.json, units.json, phat-recipes.json, thanh-fridge-source.js)
│  ├─ data/                  # db.json (tự sinh khi chạy, ghi bởi server)
│  ├─ uploads/               # ảnh người dùng tải lên (phục vụ tại /uploads/)
│  └─ tests/run.js           # test API tự động
└─ public/                   # FRONTEND — thư mục duy nhất được phục vụ ở gốc "/"
   ├─ index.html, pages/, css/, js/, assets/
```

## API tóm tắt

Chi tiết trong [`server/API.md`](server/API.md). Lỗi: `{ "error": "thông báo tiếng Việt", "field"?: "..." }`. Phiên đăng nhập bằng cookie `nomnom_sid` (HttpOnly, SameSite=Lax, 30 ngày).

| Method + đường dẫn | Mô tả | Cần đăng nhập |
|---|---|---|
| POST `/api/auth/register`, `/login`, `/logout` | Đăng ký / đăng nhập / đăng xuất | – |
| GET / PATCH / DELETE `/api/me` | Thông tin tài khoản, sửa (cần `currentPassword`), xóa tài khoản | PATCH, DELETE |
| GET `/api/recipes` | `q`, `category`, `maxTime`, `maxPrice`, `sort=rating\|time\|price\|new`, `page`, `limit` | – |
| GET `/api/categories` | Danh mục + số lượng | – |
| GET `/api/recipes/:id` | Chi tiết (ghi lịch sử nếu đã đăng nhập) | – |
| POST `/api/recipes`, DELETE `/api/recipes/:id` | Đăng / xóa công thức (chỉ chủ sở hữu) | có |
| POST `/api/uploads` | `{dataUrl}` PNG/JPEG/WebP ≤ 3 MB → `{url}` | có |
| PUT/DELETE `/api/recipes/:id/save` | Lưu / bỏ lưu | có |
| GET `/api/me/saved`, `/uploaded`, `/history`, `/reviews`, `/overview` | Góc của tôi | có |
| DELETE `/api/me/history` | Xóa lịch sử | có |
| GET/POST `/api/recipes/:id/reviews` | Xem / đăng đánh giá (mỗi người 1 đánh giá/công thức, đăng lại = cập nhật) | POST |
| POST `/api/reviews/:id/like`, DELETE `/api/reviews/:id` | Thích (bật/tắt) / xóa đánh giá của mình | có |
| GET `/api/ingredients`, `/api/ingredients/compare?names=a,b` | Danh mục nguyên liệu + đơn vị / so sánh giá | – |
| GET `/api/fridge?ingredients=thit-bo,ca-chua` | Công thức phù hợp nguyên liệu trong tủ lạnh | – |
| POST `/api/contact`, GET `/api/health` | Liên hệ, kiểm tra sống | – |

## Dữ liệu và ảnh tải lên

- Toàn bộ dữ liệu nằm trong một file JSON (`server/data/db.json`), nạp vào bộ nhớ khi chạy; mỗi thay đổi được ghi nguyên tử (ghi file tạm rồi `rename`); lịch sử xem được gộp ghi trễ 250 ms và luôn flush khi thoát.
- Lần chạy đầu (file chưa có hoặc không có công thức) server tự nạp dữ liệu mẫu từ `server/seed/` (8 công thức đầy đủ, ~110 thẻ công thức của Phat, các món của trang tìm theo nguyên liệu, tài khoản demo). Nạp lại không ghi đè dữ liệu có sẵn.
- Mật khẩu băm `scrypt` + salt ngẫu nhiên; phiên lưu dạng băm SHA-256 của mã phiên.
- Ảnh tải lên được giải mã từ data URL, kiểm tra loại/kích thước/chữ ký file rồi lưu vào `server/uploads/` với tên ngẫu nhiên, phục vụ tại `/uploads/<file>`. Ảnh được dọn khi công thức chứa nó bị xóa.
- Reset: dừng server rồi xóa `server/data/db.json` (và, nếu muốn, các file trong `server/uploads/`); chạy lại sẽ nạp dữ liệu mẫu mới.

## Triển khai trên Vercel (đăng nhập bền vững)

Vercel chạy nhiều instance tách biệt và chỉ ghi được ở `/tmp`, nên **cần Redis** để tài khoản, phiên đăng nhập, đánh giá, công thức người dùng đăng và ảnh tải lên dùng chung giữa các instance:

1. Vercel → dự án → **Storage** → tạo/kết nối **Upstash for Redis** (gói miễn phí) → *Connect to project*.
2. Vercel tự thêm biến môi trường `KV_REST_API_URL` + `KV_REST_API_TOKEN` (hoặc `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`).
3. **Redeploy** dự án. `api/index.js` tự dùng Redis khi thấy các biến này; không có thì chạy bằng `/tmp` (dữ liệu có thể mất/không đồng nhất).

Chạy trên máy (`node server.js`) không cần Redis.
