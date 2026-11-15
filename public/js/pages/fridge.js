/* Luồng tìm công thức theo nguyên liệu tủ lạnh.
   - /pages/fridge.html: form chọn nguyên liệu -> chuyển sang /pages/fridge-results.html?ingredients=dam:thit-bo,tinh-bot:gao
   - /pages/fridge-results.html: đọc query, khôi phục ô đã chọn, gọi GET /api/fridge (backend sở hữu dữ liệu & cách chấm điểm). */
(function () {
  "use strict";

  var page = document.body.dataset.page;
  var RESULTS_URL = "/pages/fridge-results.html";
  var form = document.querySelector(".filter-sidebar form");

  // Bấm "Danh mục nguyên liệu" trên header: đang ở trang chọn thì cuộn lên bộ lọc, ở trang kết quả thì về trang chọn.
  document.addEventListener("nomnom:navigation-request", function (event) {
    if (!event.detail || event.detail.target !== "ingredients") return;
    event.preventDefault();
    if (page === "fridge") {
      var sidebar = document.querySelector(".filter-sidebar");
      if (sidebar) sidebar.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "/pages/fridge.html";
    }
  });

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function selectedTokens() {
    var out = [];
    document.querySelectorAll(".filter-sidebar input[type=checkbox]:checked").forEach(function (box) {
      out.push(box.name + ":" + box.value);
    });
    return out;
  }

  // Nhãn hiển thị của mỗi token "nhom:id" lấy từ các ô chọn trong trang.
  var labels = {};
  document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(function (box) {
    labels[box.name + ":" + box.value] = box.parentNode.textContent.trim();
    if (!labels[box.value]) labels[box.value] = box.parentNode.textContent.trim();
  });
  function labelOf(item) {
    if (item && typeof item === "object") return item.name || item.label || labels[item.id] || String(item.id || "");
    return labels[item] || String(item);
  }

  // Chọn nguyên liệu -> sang trang kết quả với đúng các token "nhom:id".
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      var tokens = selectedTokens();
      var kwInput = form.querySelector("input[name=keyword]");
      var keyword = kwInput ? kwInput.value.trim() : "";
      var parts = [];
      if (tokens.length) parts.push("ingredients=" + encodeURIComponent(tokens.join(",")).replace(/%3A/gi, ":").replace(/%2C/gi, ","));
      if (keyword) parts.push("keyword=" + encodeURIComponent(keyword));
      window.location.href = RESULTS_URL + (parts.length ? "?" + parts.join("&") : "");
    });
  }

  function foodCard(r, extra) {
    var href = NomNom.recipeUrl(r.id);
    var card = el("article", "food-card");
    var imageLink = el("a");
    imageLink.href = href;
    var img = el("img", "food-image");
    img.src = r.image || "/assets/images/food.png";
    img.alt = r.name || "";
    img.loading = "lazy";
    img.onerror = function () { NomNom.fallbackImg(img); };
    imageLink.appendChild(img);
    var name = el("a", "food-name", r.name);
    name.href = href;
    var price = el("p", "food-price");
    price.append("$ Giá: " + NomNom.money(r.price) + " / phần");
    var time = el("p", "food-time");
    var clock = el("img");
    clock.src = "/assets/icons/clock.png";
    clock.alt = "";
    time.append(clock, " Thời gian nấu: " + NomNom.minutes(r.time));
    card.append(imageLink, name, price);
    if (extra) extra.forEach(function (n) { card.append(n); });
    card.append(time);
    return card;
  }

  function showError(box, message, retry) {
    box.textContent = "";
    var p = el("p", "result-summary", message + " ");
    var b = el("button", "filter-reset", "Thử lại");
    b.type = "button";
    b.addEventListener("click", retry);
    p.appendChild(b);
    box.appendChild(p);
  }

  /* ---- Trang chọn nguyên liệu: danh sách công thức mới nhất ---- */
  function loadLatest() {
    var list = document.getElementById("latest-list");
    if (!list) return;
    list.textContent = "Đang tải...";
    NomNom.api.get("/recipes", { sort: "new", limit: 6 }).then(function (d) {
      list.textContent = "";
      (d.items || []).forEach(function (r) { list.appendChild(foodCard(r)); });
      if (!(d.items || []).length) list.textContent = "Chưa có công thức nào.";
    }, function (e) { showError(list, NomNom.errorText(e), loadLatest); });
  }

  /* ---- Trang kết quả ---- */
  function loadResults(tokens, keyword) {
    var list = document.getElementById("result-list");
    var summary = document.getElementById("result-summary");
    if (!list || !summary) return;
    list.textContent = "";
    if (!tokens.length) {
      summary.textContent = "Bạn chưa chọn nguyên liệu nào. Hãy quay lại trang chọn nguyên liệu.";
      return;
    }
    summary.textContent = "Đang tìm công thức phù hợp...";
    NomNom.api.get("/fridge", { ingredients: tokens.join(","), q: keyword, limit: 40 }).then(function (d) {
      var items = d.items || [];
      list.textContent = "";
      summary.textContent = "";
      if (!items.length) {
        summary.textContent = "Chưa có công thức phù hợp. Hãy thử chọn thêm nguyên liệu hoặc đổi từ khóa.";
        return;
      }
      summary.append("Tìm thấy ", el("strong", "", String(items.length)), " công thức cho " + tokens.length + " nguyên liệu đã chọn" +
        (keyword ? ", từ khóa “" + keyword + "”" : "") + ".");
      items.forEach(function (it) {
        var full = it.status === "du";
        var extra = [
          el("p", "food-tag " + (full ? "tag-du" : "tag-thieu"), (full ? "Đủ nguyên liệu" : "Thiếu nguyên liệu") + " · " + Math.round((it.score || 0) * 100) + "%")
        ];
        if (it.matched && it.matched.length) extra.push(el("p", "food-match", "Bạn có: " + it.matched.map(labelOf).join(", ")));
        if (it.missing && it.missing.length) extra.push(el("p", "food-match food-missing", "Còn thiếu: " + it.missing.map(labelOf).join(", ")));
        list.appendChild(foodCard(it.recipe, extra));
      });
    }, function (e) {
      summary.textContent = "";
      showError(list, NomNom.errorText(e), function () { loadResults(tokens, keyword); });
    });
  }

  if (page === "fridge") loadLatest();

  if (page === "fridge-results") {
    var params = new URLSearchParams(window.location.search);
    var tokens = (params.get("ingredients") || "").split(",").map(function (s) { return s.trim(); }).filter(Boolean);
    var keyword = (params.get("keyword") || "").trim();
    // Khôi phục ô đã chọn từ query string và mở nhóm có ô được chọn.
    document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(function (box) {
      if (tokens.indexOf(box.name + ":" + box.value) !== -1) {
        box.checked = true;
        var details = box.closest("details");
        if (details) details.open = true;
      }
    });
    var keywordInput = document.querySelector(".filter-sidebar input[name=keyword]");
    if (keywordInput) keywordInput.value = keyword;
    loadResults(tokens, keyword);
  }
})();
