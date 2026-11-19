# NomNom — cấu trúc thư mục

```text
NomNom/
├─ index.html                # Trang chủ
├─ about.html                # Về chúng tôi (có biểu mẫu liên hệ)
├─ README.md, STRUCTURE.md   # tài liệu
├─ package.json              # chỉ có script start, không có dependency
├─ vercel.json               # cấu hình triển khai tĩnh
├─ .gitignore
├─ pages/                    # category, search, recipe, upload, ingredients, fridge,
│                            # fridge-results, policy, account/*
├─ css/                      # components/ (header, footer, login, signup, filter, pager, ...), pages/ (mỗi trang một file)
├─ js/                       # data.js, store.js, components/ (header, auth, ...), pages/
├─ data/db.json              # dữ liệu gốc (công thức, nguyên liệu, tài khoản demo)
├─ images/                   # hình ảnh (icons/ là các biểu tượng)
└─ fonts/                    # font chữ
```

Quy ước: đường dẫn trong HTML/CSS/JS dùng **đường dẫn tuyệt đối từ gốc site** (`/css/...`, `/js/...`, `/images/...`, `/pages/...`), nên phải mở qua web server với thư mục chứa `index.html` làm thư mục gốc (không mở bằng `file://`).
