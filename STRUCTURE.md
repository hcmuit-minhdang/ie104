# NomNom — cấu trúc thư mục

```text
NomNom/
├─ index.html                # Trang chủ
├─ about.html                # Về chúng tôi (có mục Góp ý #gop-y và Liên hệ #lien-he)
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
│  ├─ policy.html            # chính sách bảo mật, điều khoản, hỗ trợ tiếp cận
│  └─ account/               # Góc của tôi
│     ├─ index.html          # chuyển hướng tới overview.html#thong-tin-tai-khoan
│     ├─ overview.html       # tổng quan + thông tin tài khoản
│     ├─ saved.html          # công thức đã lưu
│     ├─ uploaded.html       # công thức đã đăng tải
│     ├─ reviewed.html       # đánh giá của tôi
│     └─ history.html        # lịch sử xem
├─ css/                      # components/ (header, footer, login, signup, filter, pager, ...), pages/ (mỗi trang một file)
├─ js/                       # data.js, store.js, components/ (header, auth, ...), pages/
├─ data/db.json              # dữ liệu gốc (công thức, tài khoản demo, lượt lưu/đánh giá/lịch sử mẫu)
├─ images/                   # hình ảnh (icons/ là các biểu tượng)
└─ fonts/                    # font chữ
```

Quy ước: đường dẫn trong HTML/CSS/JS dùng **đường dẫn tuyệt đối từ gốc site** (`/css/...`, `/js/...`, `/images/...`, `/pages/...`), nên phải mở qua web server với thư mục chứa `index.html` làm thư mục gốc (không mở bằng `file://`).

## Quy tắc đặt tên và làm việc nhóm

Nhóm thống nhất theo hai báo cáo tham khảo của các khóa trước (MyTicket, Game Store Website): cả hai đều dùng **BEM cho CSS**, **camelCase cho JavaScript**, CSS chung + CSS riêng từng trang, và quy trình Git theo nhánh.

**CSS: BEM** (`block__element--modifier`, chữ thường, từ trong một tên nối bằng `-`)

| Thành phần | Quy tắc | Ví dụ trong dự án |
|---|---|---|
| Block | tên khối độc lập, kebab-case | `site-header`, `site-footer`, `site-auth`, `profile-banner`, `member` |
| Element | nối block bằng `__` | `site-header__nav-item`, `site-auth__field`, `member__avatar` |
| Modifier | nối bằng `--` | `tag--team`, `u-btn--danger` |
| Trạng thái | tiền tố `is-` | `is-open` |

- Header, footer, đăng nhập, đăng ký (`css/components/`) đã đổi hết sang BEM (`site-header__...`, `site-footer__...`, `site-auth__...`, `site-login__...`, `site-signup__...`).
- Các trang còn lại (`css/pages/`) vốn đặt tên kebab-case phẳng (`recipe-title`, `filter-panel`...). Giữ nguyên để khỏi vỡ giao diện; **thành phần mới** viết theo BEM (như `member__avatar`, `profile-banner__bg`).
- CSS dùng chung nằm trong `css/components/`; mỗi trang một file trong `css/pages/`, chỉ áp dụng cho trang đó.

**JavaScript: camelCase**
- Biến và hàm: `pageSize`, `renderProfile()`, `loadState()`. Hằng số cấp module: `UPPER_SNAKE_CASE` (`PAGE_SIZE`, `KEY`).
- Mỗi trang một file trong `js/pages/` trùng tên với trang; thành phần dùng chung trong `js/components/`.

**Tệp và thư mục:** chữ thường, nối bằng `-` (`fridge-results.html`, `ingredient-picker.js`).

**Git**
- Mỗi tính năng hoặc lỗi một nhánh riêng tách từ `main`, không commit trực tiếp lên nhánh chính, gửi Pull Request có mô tả để người phụ trách kiểm tra rồi mới merge.
- Pull code mới nhất trước khi làm việc.
- Thông điệp commit ngắn, ghi rõ thay đổi, theo dạng `loại: nội dung` (`feat:`, `fix:`, `style:`, `docs:`, `refactor:`).
