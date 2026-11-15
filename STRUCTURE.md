# NomNom — cấu trúc thư mục (final)

```text
final/
├─ server.js                 # điểm vào: node server.js  (HTTP server + static + API, chỉ module có sẵn của Node)
├─ package.json              # chỉ có script "start"/"test", KHÔNG có dependency
├─ README.md                 # cách chạy, tài khoản demo, danh sách API
├─ STRUCTURE.md              # file này
├─ server/                   # BACKEND (JavaScript, Node)
│  ├─ API.md                 # hợp đồng API
│  ├─ lib/                   # http helper, router, static, session, hash, validate, db
│  ├─ routes/                # auth.js, recipes.js, me.js, reviews.js, ingredients.js, misc.js
│  ├─ seed/                  # dữ liệu gốc để nạp lần đầu (recipes/, ingredients.json, phat-recipes.json, ...)
│  ├─ data/                  # db.json (tự sinh khi chạy, ghi bởi server)
│  ├─ uploads/               # ảnh người dùng tải lên (phục vụ tại /uploads/)
│  └─ tests/                 # test API tự động (node server/tests/run.js)
└─ public/                   # FRONTEND (HTML/CSS/JS) — thư mục duy nhất được phục vụ ở gốc "/"
   ├─ index.html             # Trang chủ (/)
   ├─ pages/
   │  ├─ category.html       # Danh mục món ăn (phân trang, API)
   │  ├─ search.html         # Kết quả tìm kiếm (?q=)
   │  ├─ recipe.html         # Chi tiết công thức (?id=slug)
   │  ├─ upload.html         # Đăng tải công thức
   │  ├─ ingredients.html    # So sánh giá nguyên liệu
   │  ├─ fridge.html         # Chọn nguyên liệu trong tủ lạnh
   │  ├─ fridge-results.html # Công thức phù hợp
   │  ├─ about.html          # Về chúng tôi
   │  └─ account/            # Góc của tôi: overview, saved, uploaded, reviewed, history .html
   ├─ css/
   │  ├─ base.css            # biến, reset dùng chung (nếu cần)
   │  ├─ components/         # header.css footer.css auth.css (header, footer, popup đăng nhập/đăng ký)
   │  └─ pages/              # home.css category.css search.css recipe.css upload.css ingredients.css fridge.css about.css account.css
   ├─ js/
   │  ├─ api.js              # lớp gọi API dùng chung (fetch + xử lý lỗi)
   │  ├─ components/         # header.js auth.js (đăng nhập/đăng ký thật) ...
   │  └─ pages/              # home.js category.js search.js recipe.js upload.js ingredients.js fridge.js account.js ...
   └─ assets/
      ├─ images/             # logo, banner, nền, ảnh món (images/recipes/<slug>/...)
      ├─ icons/              # svg/png icon
      └─ fonts/
```

Quy ước: đường dẫn trong HTML/CSS/JS dùng **đường dẫn tuyệt đối từ gốc site** (`/css/...`, `/js/...`, `/assets/...`, `/pages/...`, `/api/...`), vì site luôn được mở qua server (http://localhost:3000), không mở bằng file://.
