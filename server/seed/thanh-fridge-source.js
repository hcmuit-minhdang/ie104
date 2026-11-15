/* Luồng tìm công thức theo nguyên liệu (Thanh).
   - congthuc.html: form GET gửi các ô đã chọn sang cong-thuc-phu-hop.html.
   - cong-thuc-phu-hop.html: đọc query string, khôi phục ô đã chọn, lọc và hiển thị danh sách.
   Dữ liệu bên dưới là dữ liệu mẫu tĩnh (chưa có API); "needs" là các nguyên liệu chính của món. */
(function () {
  "use strict";

  var RECIPE_PAGE = "../../Thach/Recipe-page/recipe.html?id=";

  // Bấm "Danh mục nguyên liệu" trên header: đang ở trang chọn thì cuộn lên bộ lọc, ở trang kết quả thì về trang chọn.
  document.addEventListener("nomnom:navigation-request", function (event) {
    if (!event.detail || event.detail.target !== "ingredients") return;
    event.preventDefault();
    if (document.body.dataset.page === "congthuc.html") {
      var sidebar = document.querySelector(".filter-sidebar");
      if (sidebar) sidebar.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.href = "congthuc.html";
    }
  });

  var recipes = [
    { slug: "bo-kho", name: "Bò kho ăn kèm bánh mì", img: "bo-kho.jpg", time: 30, needs: ["dam:thit-bo", "tinh-bot:banh-mi"] },
    { slug: "bo-kho", name: "Bò kho sốt vang", img: "bo-kho-sot-vang.jpg", time: 60, price: "180.000đ - 200.000đ", serving: "4 người", needs: ["dam:thit-bo", "tinh-bot:banh-mi"] },
    { slug: "bo-ne", name: "Bò né", img: "bo-ne.webp", time: 30, needs: ["dam:thit-bo", "dam:trung", "tinh-bot:banh-mi"] },
    { slug: "bo-bit-tet", name: "Bò bít tết", img: "bo-bit-tet.jpg", time: 30, needs: ["dam:thit-bo", "rau-cu:khac"] },
    { slug: "bo-cuon-nam-kim-cham", name: "Bò cuộn nấm kim châm", img: "bo-cuon-nam-kim-cham.jpg", time: 30, needs: ["dam:thit-bo", "rau-cu:khac"] },
    { slug: "bo-la-lot", name: "Bò lá lốt", img: "bo-la-lot.webp", time: 30, needs: ["dam:thit-bo", "rau-cu:khac"] },
    { slug: "bo-luc-lac", name: "Bò lúc lắc", img: "bo-luc-lac.jpg", time: 30, needs: ["dam:thit-bo", "rau-cu:khac"] },
    { slug: "bo-xao-ot-chuong", name: "Bò xào ớt chuông", img: "bo-xao-ot-chuong.jpg", time: 30, needs: ["dam:thit-bo", "rau-cu:khac"] },
    { slug: "bo-xao-sa-ot", name: "Bò xào sả ớt", img: "bo-xao-sa-ot.webp", time: 30, needs: ["dam:thit-bo", "rau-cu:khac"] },
    { slug: "goi-xoai-xanh", name: "Gỏi xoài xanh", img: "goi-xoai-xanh.jpg", time: 20, price: "45.000đ - 65.000đ", serving: "2 - 3 người", needs: ["trai-cay:xoai-xanh"] },
    { slug: "dau-hu-sot-ca-chua", name: "Đậu hũ sốt cà chua", img: "dau-hu-sot-ca-chua.webp", time: 35, price: "25.000đ - 35.000đ", serving: "2 - 3 người", needs: ["dam:dau-hu"] },
    { slug: "canh-bau-nau-tom", name: "Canh bầu nấu tôm", img: "Canh-bau-nau-tom.jpg", time: 20, price: "50.000đ - 70.000đ", serving: "3 - 4 người", needs: ["dam:khac", "rau-cu:khac"] },
    { slug: "ga-kho-sa", name: "Gà kho sả", img: "ga-kho-sa.jpg", time: 45, price: "100.000đ - 150.000đ", serving: "3 - 4 người", needs: ["dam:thit-ga"] },
    { slug: "com-chien-trung", name: "Cơm chiên trứng", img: "com-chien-trung.jpg", time: 15, price: "20.000đ - 30.000đ", serving: "1 - 2 người", needs: ["tinh-bot:gao", "dam:trung"] },
    { slug: "ca-nuong-muoi-ot", name: "Cá nướng muối ớt", img: "ca-nuong-muoi-ot.jpg", time: 30, price: "130.000đ - 160.000đ", serving: "3 - 4 người", needs: ["dam:khac"] },
    { slug: "bun-thit-nuong", name: "Bún thịt nướng", img: "bun-thit-nuong.jpg", time: 30, price: "90.000đ - 120.000đ", serving: "2 - 3 người", needs: ["tinh-bot:bun", "dam:thit-heo"] },
    { slug: "ca-sot-ca", name: "Cá sốt cà", img: "ca-sot-ca.jpg", time: 30, price: "60.000đ - 80.000đ", serving: "2 - 3 người", needs: ["dam:khac"] }
  ];

  // Chỉ các nhóm này có tác dụng lọc; chế độ ăn, vùng miền, ngân sách chưa có dữ liệu để lọc.
  var INGREDIENT_GROUPS = ["dam", "tinh-bot", "rau-cu", "trai-cay"];

  function normalize(text) {
    return String(text).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().trim();
  }

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text) node.textContent = text;
    return node;
  }

  function render(params) {
    var list = document.getElementById("result-list");
    var summary = document.getElementById("result-summary");
    if (!list || !summary) return;

    var selected = [];
    INGREDIENT_GROUPS.forEach(function (group) {
      params.getAll(group).forEach(function (value) { selected.push(group + ":" + value); });
    });
    var keyword = normalize(params.get("keyword") || "");

    var results = recipes.map(function (recipe) {
      var have = recipe.needs.filter(function (need) { return selected.indexOf(need) !== -1; });
      return { recipe: recipe, have: have.length, full: have.length === recipe.needs.length };
    }).filter(function (item) {
      if (keyword && normalize(item.recipe.name).indexOf(keyword) === -1) return false;
      return selected.length === 0 || item.have > 0;
    }).sort(function (a, b) {
      return (b.full - a.full) || (b.have / b.recipe.needs.length - a.have / a.recipe.needs.length);
    });

    list.textContent = "";
    if (!results.length) {
      summary.textContent = "Chưa có công thức phù hợp. Hãy thử chọn thêm nguyên liệu hoặc đổi từ khóa.";
      return;
    }
    var parts = [];
    if (selected.length) parts.push(selected.length + " nguyên liệu đã chọn");
    if (keyword) parts.push("từ khóa “" + params.get("keyword").trim() + "”");
    summary.textContent = "";
    summary.append("Tìm thấy ", el("strong", "", String(results.length)), " công thức" + (parts.length ? " cho " + parts.join(", ") : "") + ". Mục chế độ ăn, vùng miền và ngân sách hiện chưa dùng để lọc.");

    results.forEach(function (item) {
      var recipe = item.recipe;
      var href = RECIPE_PAGE + encodeURIComponent(recipe.slug);
      var card = el("article", "food-card");

      var imageLink = el("a");
      imageLink.href = href;
      var img = el("img", "food-image");
      img.src = "image/" + recipe.img;
      img.alt = recipe.name;
      imageLink.appendChild(img);

      var name = el("a", "food-name", recipe.name);
      name.href = href;

      var price = el("p", "food-price");
      price.append("$ Giá: " + (recipe.price || "đang cập nhật"), document.createElement("br"), "Khẩu phần: " + (recipe.serving || "đang cập nhật"));

      var time = el("p", "food-time");
      var clock = el("img");
      clock.src = "image/icon/clock.png";
      clock.alt = "";
      time.append(clock, " Thời gian nấu: " + recipe.time + " phút");

      card.append(imageLink, name, price);
      if (selected.length) card.append(el("p", "food-tag " + (item.full ? "tag-du" : "tag-thieu"), item.full ? "Đủ nguyên liệu" : "Thiếu nguyên liệu"));
      card.append(time);
      list.appendChild(card);
    });
  }

  if (document.body.dataset.page === "cong-thuc-phu-hop.html") {
    var params = new URLSearchParams(window.location.search);
    // Khôi phục ô đã chọn từ query string và mở nhóm có ô được chọn.
    document.querySelectorAll(".filter-sidebar input[type=checkbox]").forEach(function (box) {
      if (params.getAll(box.name).indexOf(box.value) !== -1) {
        box.checked = true;
        var details = box.closest("details");
        if (details) details.open = true;
      }
    });
    var keywordInput = document.querySelector(".filter-sidebar input[name=keyword]");
    if (keywordInput) keywordInput.value = params.get("keyword") || "";
    render(params);
  }
})();
