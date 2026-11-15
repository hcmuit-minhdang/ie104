# NomNom — API contract (v1)

Backend = Node.js (v24, **built-in modules only, no npm packages**): `http`, `fs`, `crypto`, `path`, `url`.
Run: `node server.js` from `final/` → http://localhost:3000 (env `PORT`, `NOMNOM_DB` = path of db json file, default `server/data/db.json`).
The same server serves the static site (final/) AND the JSON API under `/api`. Uploaded images are served from `/uploads/<file>`.
All API bodies/responses are JSON, UTF-8. Errors: HTTP 4xx/5xx with `{ "error": "message tiếng Việt", "field"?: "name" }`.
Auth = server session, cookie `nomnom_sid` (HttpOnly, SameSite=Lax, Path=/). Passwords hashed with `crypto.scrypt` + random salt. Same-origin only (no CORS needed).
Frontend calls use relative URLs: `fetch('/api/...', { credentials: 'same-origin' })` — pages are always opened through the server (never file://).

## Shapes
- `User`  `{ id, username, email, avatar|null, createdAt }`
- `RecipeCard` `{ id, name, image, time (minutes, number), price (VND per serving, number), category, rating (0-5, 1 decimal), ratingCount, author: {id,username}|null, saved?: boolean (only when logged in) }`
- `Recipe` (detail) = the shape of `Thach/data/recipes/<slug>/recipe.json` (read one to learn it) **plus** `id`, `author`, `rating`, `ratingCount`, `saved?`, `createdAt`. `id` = slug string (e.g. `bo-kho`, `com-tam-long-xuyen`). User-uploaded recipes get slug from name + short random suffix.
- `Review` `{ id, recipeId, recipeName, user: {id,username,avatar}, rating (1-5), text, createdAt, likes (number), liked?: boolean }`

## Auth / account
| Method + path | Body | Result |
|---|---|---|
| POST `/api/auth/register` | `{username,email,password}` (username 3–24 [a-z0-9_.], email valid, password ≥ 6) | 201 `{user}` + sets session cookie. 409 if username/email taken (`field`) |
| POST `/api/auth/login` | `{identifier,password}` (identifier = email or username) | `{user}` + cookie. 401 `{error}` |
| POST `/api/auth/logout` | – | `{ok:true}` |
| GET `/api/me` | – | `{user: User|null}` (never 401) |
| PATCH `/api/me` | `{username?,email?,newPassword?,currentPassword}` (currentPassword required for any change) | `{user}` |
| DELETE `/api/me` | `{password}` | `{ok:true}`, deletes account, its sessions, saved, reviews, uploaded recipes become author null |

## Recipes
| GET `/api/recipes` | query: `q` (accent-insensitive, matches name/ingredients/category), `category`, `maxTime`, `maxPrice`, `sort` (`rating`\|`time`\|`price`\|`new`), `page` (1-based), `limit` (default 12, max 50) | `{items: RecipeCard[], total, page, pages}` |
|---|---|---|
| GET `/api/categories` | – | `{items:[{id,name,count}]}` |
| GET `/api/recipes/:id` | – | `Recipe`. If logged in, records a history entry (dedupe: moves to top). 404 if unknown |
| POST `/api/recipes` | (auth) JSON recipe from the upload form: `{name, description, image (url from /api/uploads or existing), time, servings, category, ingredients:[{name,quantity,unit}], steps:[{text,image?}], …}` (extra fields kept) | 201 `{id}` |
| DELETE `/api/recipes/:id` | (auth, owner only) | `{ok:true}` |
| POST `/api/uploads` | (auth) `{dataUrl:"data:image/(png\|jpeg\|webp);base64,…"}` ≤ 3 MB | `{url:"/uploads/<file>"}` |

## Personal area (all need login → 401 otherwise)
| GET `/api/me/saved` | query `page`,`limit` | `{items: RecipeCard[], total,page,pages}` |
|---|---|---|
| PUT `/api/recipes/:id/save` / DELETE `/api/recipes/:id/save` | – | `{saved:boolean}` |
| GET `/api/me/uploaded` | `page`,`limit` | same paging shape |
| GET `/api/me/history` | `page`,`limit` | same shape; each item also has `viewedAt` |
| DELETE `/api/me/history` | – | `{ok:true}` clears history |
| GET `/api/me/reviews` | – | `{items: Review[]}` |
| GET `/api/me/overview` | – | `{counts:{saved,uploaded,reviews,history}, recentSaved:RecipeCard[≤4], recentUploaded:RecipeCard[≤4], recentReviews:Review[≤2]}` |

## Reviews
| GET `/api/recipes/:id/reviews` | – | `{items: Review[], average, count}` |
|---|---|---|
| POST `/api/recipes/:id/reviews` | (auth) `{rating:1-5, text}` (one review per user per recipe: posting again updates it) | 201 `{review}` |
| POST `/api/reviews/:id/like` | (auth) toggle | `{liked, likes}` |
| DELETE `/api/reviews/:id` | (auth, owner) | `{ok:true}` |

## Ingredients / fridge / misc
| GET `/api/ingredients` | – | contents of `server/seed/ingredients.json` as `{items:[…]}` (read it to learn the shape) + units from `units.json` as `units` |
|---|---|---|
| GET `/api/ingredients/compare` | query `names=a,b,c` | `{items:[{name, unit, price, stores:[{store,price}]…}]}` using the data/shape already used by Thach's Ingredients-Comparison page |
| GET `/api/fridge` | query `ingredients=thit-bo,ca-chua` (ids/names as used on Thanh's search page), `limit` | `{items:[{recipe: RecipeCard, matched:[…], missing:[…], score:0-1, status:"du"\|"thieu"}]}` sorted by score desc |
| POST `/api/contact` | `{name,email,message}` | 201 `{ok:true}` (stored in db `contacts`) |
| GET `/api/health` | – | `{ok:true, recipes:N, users:N}` |

## Storage
Single JSON file (`NOMNOM_DB`), loaded in memory, written atomically (write temp + rename) after each mutation; seeded on first start from: `server/seed/recipes/*/recipe.json` (8 full recipes), `server/seed/phat-recipes.json` (≈133 cards → minimal Recipe objects, deterministic synthetic details where missing), Thanh fridge recipes (dataset array inside `server/seed/thanh-fridge-source.js`). Seed also creates one demo account: username `demo`, email `demo@nomnom.vn`, password `demo123`, with a few saved/uploaded/reviews/history entries.
Static server must: block path traversal, never serve `server/data/` or `server/*.js` or `.git`, set correct MIME types (html,css,js,json,svg,png,jpg,webp,avif,ttf,woff2), send `Cache-Control: no-cache` for html/js/css.

## Ghi chú triển khai (khác biệt so với hợp đồng ban đầu)
- Detail `Recipe`: `category` là nhóm hiển thị (vd "Món bò"), giá trị gốc nằm ở `categoryGroup`; có thêm `name`, `image`, `time`, `price`. `author` là object `{id,username}` hoặc `null`. Id cũ kiểu `rec-001` vẫn truy cập được.
- Username cho phép chữ hoa nhưng duy nhất không phân biệt hoa/thường. `PATCH /api/me` nhận thêm `avatar` (đường dẫn `/uploads/` hoặc `/assets/`). Sai `currentPassword` → 403.
- Review: `text` được phép rỗng; đăng lại review của cùng công thức cập nhật bản cũ (vẫn trả 201).
- `rating` lấy từ review khi đã có, nếu chưa thì là giá trị seed cố định.
- `/api/fridge`: `ingredients` nhận token `nhom:id`, id trơn hoặc tên tiếng Việt; danh sách rỗng trả tất cả với score 0; có thêm `q`. `matched`/`missing` là tên hiển thị.
- `/api/ingredients/compare`: giá các cửa hàng là dữ liệu giả lập cố định (trừ thịt heo lấy từ trang gốc).
- Công thức người dùng đăng: ingredients `{ingredientId,name,qty,unit}`, steps `{text:string[],images:string[]}`.
- Request ghi (POST/PUT/PATCH/DELETE) có `Origin` không khớp host → 403. Đăng nhập/đăng ký giới hạn 10 lần/phút/IP (`NOMNOM_RATE_LIMIT`).
