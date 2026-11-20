/* NomNom – So sánh giá nguyên liệu.
   NomNom.data.get("/ingredients") -> danh sách nguyên liệu; get("/ingredients/compare", {names}) -> giá theo cửa hàng.
   Mỗi lần chỉ so sánh một nguyên liệu; trạng thái nằm trên URL: /pages/ingredients.html?names=thit-heo */
(function () {
  "use strict";
  const chipsBox = document.getElementById("picker-chips");
  const results = document.getElementById("comparison-results");
  const form = document.getElementById("search-form");
  const input = document.getElementById("ingredient-search");
  const hint = document.getElementById("picker-hint");
  let all = [];
  let selected = [];
  let reqId = 0;

  function el(tag, cls, text) {
    const n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function norm(s) {
    return String(s == null ? "" : s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
  }
  function byId(id) {
    return all.filter(function (i) { return i.id === id; })[0];
  }
  function storeClass(name) {
    const n = norm(name);
    if (n.indexOf("bach hoa") !== -1) return "store-bach-hoa-xanh";
    if (n.indexOf("coop") !== -1) return "store-coop-food";
    if (n.indexOf("win") !== -1) return "store-winmart";
    if (n.indexOf("sun") !== -1) return "store-sunmart";
    if (n.indexOf("gs25") !== -1) return "store-gs25";
    if (n.indexOf("circle") !== -1) return "store-circle-k";
    return "";
  }
  function safeUrl(u) {
    return /^https?:\/\//i.test(String(u || "")) ? u : "";
  }
  function pick(o, keys) {
    for (let i = 0; i < keys.length; i++) if (o[keys[i]] != null && o[keys[i]] !== "") return o[keys[i]];
    return null;
  }

  function writeUrl() {
    const u = "/pages/ingredients.html" + (selected.length ? "?names=" + selected.map(encodeURIComponent).join(",") : "");
    history.replaceState(null, "", u);
  }

  // Số nguyên liệu hiện sẵn khi chưa bấm "Xem thêm"; nguyên liệu đã chọn luôn hiện
  const CHIP_LIMIT = 14;
  let chipsExpanded = false;

  // Cập nhật số nguyên liệu đã chọn trên nút gửi (chưa gửi request nào)
  function syncSubmit() {
    const btn = document.getElementById("picker-submit");
    if (!btn) return;
    btn.textContent = selected.length ? "SO SÁNH GIÁ (" + selected.length + ")" : "SO SÁNH GIÁ";
    btn.disabled = !selected.length;
  }

  function renderChips() {
    const q = norm(input.value);
    chipsBox.textContent = "";
    const matched = all.filter(function (i) {
      if (selected.indexOf(i.id) !== -1) return true;
      if (!q) return true;
      return norm(i.name).indexOf(q) !== -1 || (i.aliases || []).some(function (a) { return norm(a).indexOf(q) !== -1; });
    });
    syncSubmit();
    if (!matched.length) {
      chipsBox.appendChild(el("span", "ing-loading", "Không tìm thấy nguyên liệu phù hợp."));
      return;
    }
    // Đang tìm kiếm hoặc đã bấm "Xem thêm" thì hiện hết; ngược lại chỉ hiện một phần đầu danh sách
    const collapsed = !q && !chipsExpanded && matched.length > CHIP_LIMIT;
    const shown = collapsed
      ? matched.filter(function (i, idx) { return idx < CHIP_LIMIT || selected.indexOf(i.id) !== -1; })
      : matched;
    shown.forEach(function (i) {
      const b = el("button", "ing-chip" + (selected.indexOf(i.id) !== -1 ? " is-selected" : ""), i.name);
      b.type = "button";
      b.setAttribute("aria-pressed", selected.indexOf(i.id) !== -1 ? "true" : "false");
      // Chỉ đánh dấu chọn; việc gửi request nằm ở nút "SO SÁNH GIÁ" để tránh so sánh nhiều lần
      b.addEventListener("click", function () {
        const k = selected.indexOf(i.id);
        // Chỉ so sánh giá một nguyên liệu mỗi lần: chọn cái mới thì thay cái cũ, bấm lại thì bỏ chọn
        selected = k === -1 ? [i.id] : [];
        renderChips();
      });
      chipsBox.appendChild(b);
    });
    // Nút bật/tắt danh sách đầy đủ (chỉ khi không đang tìm kiếm)
    if (!q && matched.length > CHIP_LIMIT) {
      const more = el("button", "ing-more", chipsExpanded ? "Thu gọn ▲" : "Xem thêm " + (matched.length - shown.length) + " nguyên liệu ▼");
      more.type = "button";
      more.setAttribute("aria-expanded", chipsExpanded ? "true" : "false");
      more.addEventListener("click", function () {
        chipsExpanded = !chipsExpanded;
        renderChips();
      });
      chipsBox.appendChild(more);
    }
  }

  function storeCard(s, unitFallback) {
    const storeName = pick(s, ["store", "storeName", "shop"]) || "Cửa hàng";
    const title = pick(s, ["product", "productName", "title", "label", "item"]) || "";
    const url = safeUrl(pick(s, ["url", "link", "href"]));
    const price = Number(s.price);
    const unit = pick(s, ["unit", "per", "perUnit"]) || unitFallback || "";
    const old = Number(pick(s, ["oldPrice", "originalPrice", "listPrice"]));
    let discount = pick(s, ["discount", "discountPercent"]);
    if (!discount && old && price && old > price) discount = "-" + Math.round((1 - price / old) * 100) + "%";
    if (discount && String(discount).charAt(0) !== "-") discount = "-" + String(discount).replace(/%?$/, "%");

    const card = el("div", "store-card");
    card.appendChild(el("p", "store-name " + storeClass(storeName), String(storeName).toUpperCase()));
    // Có ảnh sản phẩm thì hiện ảnh; chưa có thì hiện ô trống "Chưa có ảnh" (không dùng ảnh món ăn thay thế)
    const rawImg = pick(s, ["image", "img", "imageUrl"]);
    let im;
    if (rawImg && (safeUrl(rawImg) || String(rawImg).charAt(0) === "/")) {
      im = el("img", "ingredient-image");
      im.src = rawImg;
      im.alt = title || storeName;
      im.loading = "lazy";
      im.onerror = function () { const ph = el("div", "ingredient-image ingredient-image--empty", "Chưa có ảnh"); im.replaceWith(ph); };
    } else {
      im = el("div", "ingredient-image ingredient-image--empty", "Chưa có ảnh");
    }
    card.appendChild(im);
    const info = el("div", "ingredient-info");
    if (title) info.appendChild(el("span", "ingredient-name", title));
    const pr = el("div", "ingredient-price");
    pr.appendChild(el("p", "", isFinite(price) && s.price != null ? NomNom.money(price) : "Liên hệ"));
    if (unit) pr.appendChild(el("span", "", "/" + unit));
    info.appendChild(pr);
    if (old && old > price) {
      const op = el("div", "ingredient-old-price");
      op.appendChild(el("p", "", NomNom.money(old)));
      if (discount) op.appendChild(el("span", "discount", discount));
      info.appendChild(op);
    }
    card.appendChild(info);
    if (url) {
      const a = el("a", "buy-button", "MUA NGAY");
      a.href = url;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      card.appendChild(a);
    }
    return card;
  }

  function section(item) {
    const sec = el("section", "comparison-section");
    const t = el("div", "title comparison-title");
    t.appendChild(el("p", "", String(item.name || "").toUpperCase())).id = "";
    t.firstChild.className = "comparison-label";
    t.appendChild(el("div", "line comparison-line"));
    sec.appendChild(t);
    const wrap = el("div", "store-card-container");
    const stores = (item.stores || item.offers || []).slice();
    stores.sort(function (a, b) { return (Number(a.price) || 1e12) - (Number(b.price) || 1e12); });
    if (!stores.length) wrap.appendChild(el("p", "ing-loading", "Chưa có dữ liệu giá cho nguyên liệu này."));
    stores.forEach(function (s) { wrap.appendChild(storeCard(s, item.unit)); });
    sec.appendChild(wrap);
    return sec;
  }

  function compare() {
    writeUrl();
    const id = ++reqId;
    results.textContent = "";
    if (!selected.length) {
      results.appendChild(el("p", "ing-empty", "Hãy chọn ít nhất một nguyên liệu ở phía trên để xem giá."));
      return;
    }
    results.appendChild(el("p", "ing-empty", "Đang tải giá..."));
    const names = selected.map(function (sid) { const i = byId(sid); return i ? i.name : sid; });
    NomNom.data.get("/ingredients/compare", { names: names }).then(function (d) {
      if (id !== reqId) return;
      results.textContent = "";
      const items = d.items || [];
      if (!items.length) results.appendChild(el("p", "ing-empty", "Chưa có dữ liệu giá cho các nguyên liệu đã chọn."));
      items.forEach(function (it) { results.appendChild(section(it)); });
    }, function (e) {
      if (id !== reqId) return;
      results.textContent = "";
      const p = el("p", "ing-empty", NomNom.errorText(e) + " ");
      const b = el("button", "ing-retry", "Thử lại");
      b.type = "button";
      b.addEventListener("click", compare);
      p.appendChild(b);
      results.appendChild(p);
    });
  }

  input.addEventListener("input", renderChips);
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    const q = norm(input.value);
    renderChips();
    if (!q) return;
    const first = all.filter(function (i) { return norm(i.name).indexOf(q) !== -1 || (i.aliases || []).some(function (a) { return norm(a).indexOf(q) !== -1; }); })[0];
    // Enter ở ô tìm chỉ chọn nguyên liệu khớp đầu tiên; gửi so sánh bằng nút "SO SÁNH GIÁ"
    if (first && selected.indexOf(first.id) === -1) { selected = [first.id]; renderChips(); }
  });

  // Nút gửi: so sánh đúng một lần cho các nguyên liệu đã chọn
  document.getElementById("picker-submit").addEventListener("click", compare);
  // Nút bỏ chọn: xóa lựa chọn, chưa so sánh
  document.getElementById("picker-reset").addEventListener("click", function () {
    selected = [];
    renderChips();
  });

  NomNom.data.get("/ingredients").then(function (d) {
    all = d.items || [];
    const want = (new URLSearchParams(location.search).get("names") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    selected = want.map(function (w) {
      const hit = byId(w) || all.filter(function (i) { return norm(i.name) === norm(w); })[0];
      return hit && hit.id;
    }).filter(Boolean).slice(0, 1);
    if (!selected.length && all.length) selected = [(byId("thit-heo") || all[0]).id];
    renderChips();
    compare();
  }, function (e) {
    chipsBox.textContent = "";
    const p = el("p", "ing-empty", NomNom.errorText(e) + " ");
    const b = el("button", "ing-retry", "Tải lại trang");
    b.type = "button";
    b.addEventListener("click", function () { location.reload(); });
    p.appendChild(b);
    chipsBox.appendChild(p);
    hint.hidden = true;
  });
})();
