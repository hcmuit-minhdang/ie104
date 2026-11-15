/* NomNom — trang Danh mục: lọc / sắp xếp / phân trang qua /api/recipes, trạng thái nằm trên URL. */
(function () {
  "use strict";
  var LIMIT = 12;
  var grid = document.getElementById("recipeGrid");
  var msg = document.getElementById("gridMessage");
  var count = document.getElementById("resultCount");
  var pager = document.getElementById("pagination");
  var title = document.getElementById("categoryTitle");
  var sortSel = document.getElementById("sortSelect");
  var searchForm = document.getElementById("sidebarSearchForm");
  var searchInput = document.getElementById("sidebarSearchInput");
  var catBox = document.getElementById("categoryFilter");
  var categories = [];
  var reqId = 0;

  function readState() {
    var p = new URLSearchParams(location.search);
    return {
      category: p.get("category") || "",
      q: p.get("q") || "",
      sort: p.get("sort") || "rating",
      maxTime: p.get("maxTime") || "",
      maxPrice: p.get("maxPrice") || "",
      page: Math.max(1, parseInt(p.get("page"), 10) || 1)
    };
  }
  function urlFor(s) {
    var out = [];
    ["category", "q", "maxTime", "maxPrice"].forEach(function (k) { if (s[k]) out.push(k + "=" + encodeURIComponent(s[k])); });
    if (s.sort && s.sort !== "rating") out.push("sort=" + encodeURIComponent(s.sort));
    if (s.page > 1) out.push("page=" + s.page);
    return "/pages/category.html" + (out.length ? "?" + out.join("&") : "");
  }
  function go(s, replace) {
    var url = urlFor(s);
    if (replace) history.replaceState(null, "", url); else history.pushState(null, "", url);
    render();
  }

  function setChecked(name, value) {
    var radios = document.querySelectorAll('input[name="' + name + '"]');
    var hit = false;
    radios.forEach(function (r) { if (r.value === value) { r.checked = true; hit = true; } });
    if (!hit && radios.length) radios[0].checked = true;
  }

  function renderCategories() {
    var html = '<label><input type="radio" name="category" value=""><span>Tất cả</span></label>';
    categories.forEach(function (c) {
      html += '<label><input type="radio" name="category" value="' + NomNom.esc(c.id) + '"><span>' + NomNom.esc(c.name) +
        '</span><small>' + NomNom.esc(c.count) + '</small></label>';
    });
    catBox.innerHTML = html;
  }

  function syncControls(s) {
    sortSel.value = s.sort;
    if (sortSel.value !== s.sort) sortSel.value = "rating";
    searchInput.value = s.q;
    setChecked("category", s.category);
    setChecked("maxTime", s.maxTime);
    setChecked("maxPrice", s.maxPrice);
    var cat = categories.filter(function (c) { return c.id === s.category; })[0];
    title.textContent = (cat ? cat.name : s.q ? 'Kết quả cho "' + s.q + '"' : "Tất cả món ăn").toUpperCase();
    document.title = "NomNom - " + (cat ? cat.name : "Danh mục món ăn");
  }

  function showMessage(text, retry) {
    msg.hidden = false;
    msg.textContent = text;
    if (retry) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = "Thử lại";
      b.addEventListener("click", render);
      msg.appendChild(b);
    }
  }

  function render() {
    var s = readState();
    syncControls(s);
    var id = ++reqId;
    msg.hidden = true;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = NomNom.skeletonHtml(6);
    pager.innerHTML = "";
    count.textContent = "Đang tải...";
    NomNom.api.get("/recipes", {
      category: s.category, q: s.q, sort: s.sort, maxTime: s.maxTime, maxPrice: s.maxPrice, page: s.page, limit: LIMIT
    }).then(function (d) {
      if (id !== reqId) return;
      grid.setAttribute("aria-busy", "false");
      if (d.pages && s.page > d.pages) { s.page = d.pages; go(s, true); return; }
      count.textContent = d.total ? "Có " + d.total + " món ăn" : "Không có món ăn";
      grid.innerHTML = (d.items || []).map(function (r) { return NomNom.cardHtml(r); }).join("");
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
    var s = Object.assign(readState(), { page: 1 }, patch);
    go(s);
  }

  document.querySelectorAll(".filter-trigger-btn").forEach(function (b) {
    b.addEventListener("click", function () { b.parentElement.classList.toggle("is-open"); });
  });
  document.querySelector(".filter-sidebar").addEventListener("change", function (e) {
    var t = e.target;
    if (t.type === "radio") { var p = {}; p[t.name] = t.value; update(p); }
  });
  sortSel.addEventListener("change", function () { update({ sort: sortSel.value }); });
  searchForm.addEventListener("submit", function (e) { e.preventDefault(); update({ q: searchInput.value.trim() }); });
  document.getElementById("filterReset").addEventListener("click", function (e) {
    e.preventDefault();
    go({ category: "", q: "", sort: "rating", maxTime: "", maxPrice: "", page: 1 });
  });
  pager.addEventListener("click", function (e) {
    var a = e.target.closest("a[data-page]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    update({ page: parseInt(a.dataset.page, 10) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("popstate", render);

  NomNom.api.get("/categories").then(function (d) { categories = d.items || []; }, function () { categories = []; })
    .then(function () { renderCategories(); render(); });
})();
