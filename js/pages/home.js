const track = document.getElementById('track');
const upBtn = document.getElementById('up-button');
const downBtn = document.getElementById('down-button');

let currentIndex = 0;
const totalSlides = document.querySelectorAll('.slide').length;

function updateSlidePosition() {
  // Pulls the track up on the Y axis
  track.style.transform = `translateY(-${currentIndex * 100}%)`;
}

downBtn.addEventListener('click', () => {
  // If we haven't reached the end, go to the next slide normally
  if (currentIndex < totalSlides - 1) {
    currentIndex++;
  } else {
    // If we are at the last slide, loop back to the first one (index 0)
    currentIndex = 0;
  }
  updateSlidePosition();
});

upBtn.addEventListener('click', () => {
  // If we haven't reached the start, go up normally
  if (currentIndex > 0) {
    currentIndex--;
  } else {
    // If we are at the first slide (index 0), jump to the last slide
    currentIndex = totalSlides - 1;
  }
  updateSlidePosition();
});

/* ---------- Dữ liệu từ kho dữ liệu (NomNom.data) ---------- */
(function () {
  const popular = document.querySelector(".popular-recipes-container");
  const community = document.querySelector(".new-community-recipe-container");
  const catBox = document.querySelector(".category-container");
  if (!window.NomNom || !NomNom.data) return;

  function errorBlock(box, retry) {
    box.innerHTML = '<p class="home-error">Không tải được dữ liệu. <button type="button">Thử lại</button></p>';
    box.querySelector("button").addEventListener("click", retry);
  }

  function loadRecipes(box, params, cls, imgCls, n, after) {
    box.innerHTML = NomNom.skeletonHtml(n, cls);
    NomNom.data.get("/recipes", params).then(function (d) {
      const items = d.items || [];
      box.innerHTML = items.length
        ? items.map(function (r) { return NomNom.cardHtml(r, cls, imgCls); }).join("")
        : '<p class="home-loading">Chưa có công thức nào.</p>';
      if (after) after(items);
    }, function () { errorBlock(box, function () { loadRecipes(box, params, cls, imgCls, n, after); }); });
  }

  function skeletonCompressed(n) {
    return NomNom.skeletonHtml(n, "recipe-card-compressed");
  }

  if (popular) {
    popular.innerHTML = skeletonCompressed(4);
    loadRecipes(popular, { sort: "rating", limit: 4 }, "recipe-card-compressed", "recipe-image-medium", 4, function (items) {
    });
  }
  if (community) loadRecipes(community, { sort: "new", limit: 4 }, "recipe-card", "recipe-image", 4);

  /* Bảng vinh danh: dữ liệu từ NomNom.data.get("/leaderboard"). Trước khi tải xong các thẻ ẩn tạm (is-loading);
     thẻ nào chưa có dữ liệu thì ẩn, không có dữ liệu nào (hoặc lỗi) thì ẩn cả khối. */
  (function loadLeaderboard() {
    const box = document.querySelector(".leaderboard-container");
    const section = document.querySelector(".leaderboard-section");
    if (!box) return;
    function hideCard(card) { if (card) card.style.display = "none"; }
    NomNom.data.get("/leaderboard").then(function (d) {
      function fill(card, user, descSel, text) {
        if (!card) return false;
        if (!user) { hideCard(card); return false; }
        const name = card.querySelector(".user-name");
        if (name) name.textContent = user.username;
        const img = card.querySelector(".user-image-leaderboard");
        if (img) { img.alt = user.username; if (user.avatar) img.src = user.avatar; }
        const link = card.querySelector(descSel + " a");
        if (link) link.textContent = text; // không gắn liên kết: trang tài khoản chỉ hiện dữ liệu của người đang xem
        return true;
      }
      let shown = 0;
      if (fill(document.querySelector(".most-recipes"), d.mostRecipes, ".most-recipes-description", d.mostRecipes && d.mostRecipes.count + " công thức")) shown++;
      if (fill(document.querySelector(".most-reviews"), d.mostReviews, ".most-reviews-description", d.mostReviews && d.mostReviews.count + " đánh giá")) shown++;
      const mr = d.mostSaved, c3 = document.querySelector(".most-liked-recipe");
      if (mr && c3) {
        const nm = c3.querySelector(".user-name");
        if (nm) nm.textContent = mr.author ? mr.author.username : "NomNom";
        const im3 = c3.querySelector(".user-image-leaderboard");
        if (im3) im3.alt = nm ? nm.textContent : "";
        const l3 = c3.querySelector(".most-liked-recipe-description a");
        if (l3) { l3.textContent = mr.name; l3.href = NomNom.recipeUrl(mr.id); }
        shown++;
      } else hideCard(c3);
      box.classList.remove("is-loading");
      if (!shown && section) section.style.display = "none";
    }, function () { if (section) section.style.display = "none"; });
  })();

  function loadCategories() {
    if (!catBox) return;
    NomNom.data.get("/categories").then(function (d) {
      const items = (d.items || []).slice(0, 7);
      // Mỗi danh mục lấy ảnh của món được đánh giá cao nhất trong danh mục đó.
      return Promise.all(items.map(function (c) {
        return NomNom.data.get("/recipes", { category: c.id, limit: 1, sort: "rating" }).then(function (r) {
          return r.items && r.items[0] ? r.items[0].image : null;
        }, function () { return null; });
      })).then(function (imgs) {
        let html = items.map(function (c, i) {
          return '<a href="/pages/category.html?category=' + encodeURIComponent(c.id) + '" class="category-card">' +
            '<img loading="lazy" decoding="async" src="' + NomNom.esc(imgs[i] || "/images/food.png") + '" alt="' + NomNom.esc(c.name) + '" class="category-image" />' +
            '<span class="category-name">' + NomNom.esc(c.name) + '</span></a>';
        }).join("");
        html += '<a href="/pages/category.html" class="category-card category-more">' +
          '<img loading="lazy" decoding="async" src="/images/icons/right-arrow-black.svg" alt="Xem Thêm" class="category-image-more" />' +
          '<span class="category-name">Xem Thêm</span></a>';
        catBox.innerHTML = html;
      });
    }).catch(function () { errorBlock(catBox, loadCategories); });
  }
  loadCategories();
})();

// Link mở popup đăng nhập/đăng ký của Thinh (auth.js xử lý [data-auth-open]); chặn nhảy lên đầu trang do href="#".
document.querySelectorAll("a[data-auth-open]").forEach(link => {
  link.addEventListener("click", event => event.preventDefault());
});


/* Khối kêu gọi dưới bảng vinh danh: đã đăng nhập thì bỏ dòng "Đã có tài khoản?" và đổi nút thành "Đăng tải công thức". */
(function () {
  const cta = document.querySelector(".cta-sign-up");
  if (!cta) return;
  const btn = cta.querySelector(".cta-sign-up-button");
  const note = cta.querySelector(".support-log-in-text");
  const origText = btn.textContent, origAction = btn.getAttribute("data-auth-open");
  function sync(user) {
    if (user) {
      if (note) note.hidden = true;
      btn.removeAttribute("data-auth-open");
      btn.textContent = "ĐĂNG TẢI CÔNG THỨC";
      btn.onclick = function () { location.href = "/pages/upload.html"; };
    } else {
      if (note) note.hidden = false;
      btn.setAttribute("data-auth-open", origAction);
      btn.textContent = origText;
      btn.onclick = null;
    }
  }
  document.addEventListener("nomnom:auth-change", function (e) { sync(e.detail && e.detail.user); });
  window.addEventListener("load", function () { if (window.NomNomAuth && NomNomAuth.user) sync(NomNomAuth.user); });
})();
