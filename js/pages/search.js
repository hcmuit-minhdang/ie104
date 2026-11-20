/* NomNom: trang Kết quả tìm kiếm: /pages/search.html?q=&maxTime=&maxPrice=&sort=&page= -> NomNom.data.get("/recipes") */
(function () {
  "use strict";
  const LIMIT = 12;
  const grid = document.getElementById("search-results-grid");
  const msg = document.getElementById("grid-message");
  const count = document.getElementById("result-count");
  const pager = document.getElementById("pagination");
  const kw = document.getElementById("search-keyword-text");
  const form = document.getElementById("search-page-form");
  const input = document.getElementById("search-page-input");
  const sortSel = document.getElementById("sort-select");
  const timeSel = document.getElementById("max-time-select");
  const priceSel = document.getElementById("max-price-select");
  let reqId = 0;

  function readState() {
    const p = new URLSearchParams(location.search);
    return {
      q: (p.get("q") || "").trim(),
      sort: p.get("sort") || "", // trống = xếp theo độ liên quan (có từ khóa) hoặc đánh giá (không từ khóa)
      maxTime: p.get("maxTime") || "",
      maxPrice: p.get("maxPrice") || "",
      page: Math.max(1, parseInt(p.get("page"), 10) || 1)
    };
  }
  function urlFor(s) {
    const out = [];
    ["q", "maxTime", "maxPrice"].forEach(function (k) { if (s[k]) out.push(k + "=" + encodeURIComponent(s[k])); });
    if (s.sort) out.push("sort=" + encodeURIComponent(s.sort));
    if (s.page > 1) out.push("page=" + s.page);
    return "/pages/search.html" + (out.length ? "?" + out.join("&") : "");
  }
  function go(s, replace) {
    const url = urlFor(s);
    if (replace) history.replaceState(null, "", url); else history.pushState(null, "", url);
    render();
  }
  function setSelect(sel, v) {
    sel.value = v;
    if (sel.value !== v) sel.selectedIndex = 0;
  }
  function showMessage(text, retry, linkHref, linkText) {
    msg.hidden = false;
    msg.textContent = text;
    if (linkHref) {
      msg.appendChild(document.createTextNode(" "));
      const a = document.createElement("a");
      a.href = linkHref;
      a.textContent = linkText;
      msg.appendChild(a);
    }
    if (retry) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = "Thử lại";
      b.addEventListener("click", render);
      msg.appendChild(b);
    }
  }

  function render() {
    const s = readState();
    input.value = s.q;
    kw.textContent = s.q ? s.q : "tất cả công thức";
    // Không dùng dấu ngoặc kép trong tiêu đề tab (một số trình duyệt/khung xem bỏ dấu " làm hiện hai dấu cách)
    document.title = (s.q ? "Tìm kiếm: " + s.q : "Kết quả tìm kiếm") + " | NomNom";
    setSelect(sortSel, s.sort);
    setSelect(timeSel, s.maxTime);
    setSelect(priceSel, s.maxPrice);
    const id = ++reqId;
    msg.hidden = true;
    grid.setAttribute("aria-busy", "true");
    grid.innerHTML = NomNom.skeletonHtml(6);
    pager.innerHTML = "";
    count.textContent = "Đang tìm...";
    NomNom.data.get("/recipes", { q: s.q, sort: s.sort, maxTime: s.maxTime, maxPrice: s.maxPrice, page: s.page, limit: LIMIT })
      .then(function (d) {
        if (id !== reqId) return;
        grid.setAttribute("aria-busy", "false");
        if (d.pages && s.page > d.pages) { s.page = d.pages; go(s, true); return; }
        grid.innerHTML = (d.items || []).map(function (r) { return NomNom.cardHtml(r); }).join("");
        if (!d.total) {
          count.textContent = "Không có kết quả";
          showMessage('Không tìm thấy công thức nào' + (s.q ? ' cho "' + s.q + '"' : "") + ". Hãy thử từ khóa khác hoặc", false, "/pages/category.html", "xem danh mục món ăn.");
          return;
        }
        count.textContent = "Tìm thấy " + d.total + " công thức";
        pager.innerHTML = NomNom.pagerHtml(d.page || s.page, d.pages || 1, function (p) {
          return urlFor(Object.assign({}, s, { page: p }));
        });
      })
      .catch(function (e) {
        if (id !== reqId) return;
        grid.setAttribute("aria-busy", "false");
        grid.innerHTML = "";
        count.textContent = "";
        showMessage(NomNom.errorText(e), true);
      });
  }

  function update(patch) { go(Object.assign(readState(), { page: 1 }, patch)); }

  form.addEventListener("submit", function (e) { e.preventDefault(); update({ q: input.value.trim() }); });
  sortSel.addEventListener("change", function () { update({ sort: sortSel.value }); });
  timeSel.addEventListener("change", function () { update({ maxTime: timeSel.value }); });
  priceSel.addEventListener("change", function () { update({ maxPrice: priceSel.value }); });
  pager.addEventListener("click", function (e) {
    const a = e.target.closest("a[data-page]");
    if (!a || e.metaKey || e.ctrlKey || e.shiftKey) return;
    e.preventDefault();
    update({ page: parseInt(a.dataset.page, 10) });
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
  window.addEventListener("popstate", render);
  render();
})();
