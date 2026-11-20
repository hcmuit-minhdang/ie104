/* NomNom – trang Danh mục: lọc / sắp xếp / phân trang qua NomNom.data, trạng thái nằm trên URL. */
(function () {
  "use strict";
  const LIMIT = 12;
  const grid = document.getElementById("recipe-grid");
  const msg = document.getElementById("grid-message");
  const count = document.getElementById("result-count");
  const pager = document.getElementById("pagination");
  const title = document.getElementById("category-title");
  const sortSel = document.getElementById("sort-select");
  const filterForm = document.getElementById("filter-form");
  // 7 nhóm bộ lọc (khớp thiết kế của Phát); mỗi nhóm là một tham số trên URL, ví dụ ?dam=Thịt bò,Thịt gà
  const GROUPS = ["dam", "tinh-bot", "rau-cu", "trai-cay", "che-do-an", "vung-mien", "ngan-sach"];
  // 4 nhóm đầu là nguyên liệu; một món "đủ nguyên liệu" khi mọi nguyên liệu của món nằm trong các ô đã chọn
  const INGREDIENT_GROUPS = ["dam", "tinh-bot", "rau-cu", "trai-cay"];
  let categories = [];
  let reqId = 0;

  function readState() {
    const p = new URLSearchParams(location.search);
    const s = {
      category: p.get("category") || "",
      q: p.get("q") || "",
      sort: p.get("sort") || "rating",
      page: Math.max(1, parseInt(p.get("page"), 10) || 1)
    };
    GROUPS.forEach(function (g) {
      s[g] = (p.get(g) || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean);
    });
    return s;
  }
  function urlFor(s) {
    const out = [];
    ["category", "q"].forEach(function (k) { if (s[k]) out.push(k + "=" + encodeURIComponent(s[k])); });
    // Nhóm lọc: giữ dấu phẩy và khoảng trắng dễ đọc trên URL
    GROUPS.forEach(function (g) {
      if (s[g] && s[g].length) out.push(g + "=" + s[g].map(encodeURIComponent).join(","));
    });
    if (s.sort && s.sort !== "rating") out.push("sort=" + encodeURIComponent(s.sort));
    if (s.page > 1) out.push("page=" + s.page);
    // Không có điều kiện nào: giữ sort=rating để URL không rỗng (URL rỗng là trang chọn danh mục)
    if (!out.length) out.push("sort=rating");
    return "/pages/category.html?" + out.join("&");
  }
  function go(s, replace) {
    const url = urlFor(s);
    if (replace) history.replaceState(null, "", url); else history.pushState(null, "", url);
    render();
  }

  // Tick đúng các ô theo URL (mở sẵn nhóm nào có ô được chọn).
  function syncChecks(s) {
    GROUPS.forEach(function (g) {
      const acc = document.querySelector('.filter-group[data-group="' + g + '"]');
      if (!acc) return;
      let any = false;
      acc.querySelectorAll('input[type="checkbox"]').forEach(function (box) {
        box.checked = s[g].indexOf(box.value) !== -1;
        if (box.checked) any = true;
      });
      if (any) setOpen(acc, true);
    });
  }

  function setOpen(acc, open) {
    acc.classList.toggle("is-open", open);
    const btn = acc.querySelector(".filter-group__trigger");
    if (btn) btn.setAttribute("aria-expanded", open ? "true" : "false");
  }

  function syncControls(s) {
    sortSel.value = s.sort;
    if (sortSel.value !== s.sort) sortSel.value = "rating";
    syncChecks(s);
    const cat = categories.filter(function (c) { return c.id === s.category; })[0];
    title.textContent = (cat ? cat.name : s.q ? 'Kết quả cho "' + s.q + '"' : s.sort === "new" ? "Công thức mới nhất" : "Tất cả món ăn").toUpperCase();
    document.title = (cat ? cat.name : "Danh mục món ăn") + " | NomNom";
  }

  function showMessage(text, retry) {
    msg.hidden = false;
    msg.textContent = text;
    if (retry) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Thử lại";
      b.addEventListener("click", render);
      msg.appendChild(b);
    }
  }

  // Gắn enoughIngredients cho từng món theo các ô nguyên liệu đang chọn (chưa chọn gì thì chưa đủ)
  function markEnough(items, s) {
    const chosen = {};
    const known = {};
    INGREDIENT_GROUPS.forEach(function (g) {
      s[g].forEach(function (v) { chosen[v] = true; });
      document.querySelectorAll('input[type="checkbox"][name="' + g + '"]').forEach(function (b) { known[b.value] = true; });
    });
    items.forEach(function (r) {
      const need = (r.tags || []).filter(function (t) { return known[t]; });
      r.enoughIngredients = need.length > 0 && need.every(function (t) { return chosen[t]; });
    });
  }

  // Vào trang không kèm tham số: chỉ hiện các biểu tượng danh mục; bấm vào một danh mục mới hiện danh sách món
  const pickerBox = document.getElementById("category-picker");
  const layoutBox = document.querySelector(".category-page-layout");
  let pickerLoaded = false;
  function showPicker() {
    layoutBox.hidden = true;
    pickerBox.hidden = false;
    document.title = "Danh mục món ăn | NomNom";
    if (pickerLoaded) return;
    const box = document.getElementById("cat-picker");
    const items = categories.slice();
    Promise.all(items.map(function (c) {
      return NomNom.data.get("/recipes", { category: c.id, limit: 1, sort: "rating" }).then(function (r) {
        return r.items && r.items[0] ? r.items[0].image : null;
      }, function () { return null; });
    })).then(function (imgs) {
      pickerLoaded = true;
      box.innerHTML = items.map(function (c, i) {
        return '<a href="/pages/category.html?category=' + encodeURIComponent(c.id) + '" class="cat-picker__card">' +
          '<img loading="lazy" decoding="async" src="' + NomNom.esc(imgs[i] || "/images/food.png") + '" alt="" />' +
          '<span>' + NomNom.esc(c.name) + '</span></a>';
      }).join("") + '<a href="/pages/category.html?sort=rating" class="cat-picker__card cat-picker__card--all"><span class="cat-picker__all">Tất cả món</span></a>';
    });
  }

  function render() {
    if (!location.search) { showPicker(); return; }
    pickerBox.hidden = true;
    layoutBox.hidden = false;
    const s = readState();
    syncControls(s);
    const id = ++reqId;
    msg.hidden = true;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = NomNom.skeletonHtml(6);
    pager.innerHTML = "";
    count.textContent = "Đang tải...";
    const params = { category: s.category, q: s.q, sort: s.sort, page: s.page, limit: LIMIT };
    GROUPS.forEach(function (g) { if (s[g].length) params[g] = s[g].join(","); });
    NomNom.data.get("/recipes", params).then(function (d) {
      if (id !== reqId) return;
      grid.setAttribute("aria-busy", "false");
      if (d.pages && s.page > d.pages) { s.page = d.pages; go(s, true); return; }
      count.textContent = d.total ? "Có " + d.total + " món ăn" : "Không có món ăn";
      markEnough(d.items || [], s);
      // Chưa chọn nguyên liệu nào (chưa lọc) thì không hiện nhãn; lọc rồi mới hiện "Đủ / Chưa đủ nguyên liệu"
      const filtered = INGREDIENT_GROUPS.some(function (g) { return s[g].length > 0; });
      grid.innerHTML = (d.items || []).map(function (r) { return NomNom.cardHtml(r, null, null, filtered); }).join("");
      if (!d.items || !d.items.length) showMessage("Không tìm thấy món ăn phù hợp. Hãy thử bỏ bớt bộ lọc.");
      pager.innerHTML = NomNom.pagerHtml(d.page || s.page, d.pages || 1, function (p) {
        return urlFor(Object.assign({}, s, { page: p }));
      });
    }).catch(function (e) {
      if (id !== reqId) return;
      grid.setAttribute("aria-busy", "false");
      grid.innerHTML = "";
      count.textContent = "";
      showMessage(NomNom.errorText(e), true);
    });
  }

  function update(patch) {
    const s = Object.assign(readState(), { page: 1 }, patch);
    go(s);
  }

  // Gửi bộ lọc một lần khi bấm "TÌM CÔNG THỨC PHÙ HỢP": gom các ô đã tick của mọi nhóm rồi lọc từ trang 1
  filterForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const p = {};
    GROUPS.forEach(function (g) {
      p[g] = [];
      document.querySelectorAll('input[type="checkbox"][name="' + g + '"]:checked').forEach(function (b) { p[g].push(b.value); });
    });
    update(p);
  });
  sortSel.addEventListener("change", function () { update({ sort: sortSel.value }); });
  document.getElementById("filter-reset").addEventListener("click", function (e) {
    e.preventDefault();
    const cleared = { category: readState().category, q: "", sort: "rating", page: 1 };
    GROUPS.forEach(function (g) { cleared[g] = []; });
    go(cleared);
  });
  pager.addEventListener("click", function (e) {
    const a = e.target.closest("a[data-page]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    update({ page: parseInt(a.dataset.page, 10) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("popstate", render);

  NomNom.data.get("/categories").then(function (d) { categories = d.items || []; }, function () { categories = []; })
    .then(render);
})();
