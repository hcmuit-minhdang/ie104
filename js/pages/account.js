/* NomNom - Góc của tôi: dữ liệu từ NomNom.data (localStorage) cho 5 trang user.
   Cần: /js/data.js (NomNom.data, NomNom.esc, NomNom.recipeUrl) và NomNomAuth (auth.js). */
(function () {
  "use strict";

  var FALLBACK_IMG = "/images/account/recipe.png";
  var PAGE_SIZE = 12;
  var N = window.NomNom;
  var esc = N.esc;

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* 1. Tab đang chọn */
  var file = (location.pathname.split("/").pop() || "overview.html").toLowerCase();
  if (file === "index.html" || file === "") file = "overview.html";
  $$(".user-tabs__tab").forEach(function (tab) {
    var on = tab.getAttribute("href").split("/").pop().toLowerCase() === file;
    tab.classList.toggle("is-active", on);
    if (on) tab.setAttribute("aria-current", "page");
    else tab.removeAttribute("aria-current");
  });

  /* ---------- tiện ích ---------- */
  function fmtDate(iso) {
    var d = new Date(iso);
    if (isNaN(d)) return "";
    var p = function (n) { return (n < 10 ? "0" : "") + n; };
    return p(d.getDate()) + "." + p(d.getMonth() + 1) + "." + String(d.getFullYear()).slice(2) +
      " " + p(d.getHours()) + "." + p(d.getMinutes());
  }
  function emptyMsg(list, text) {
    list.innerHTML = '<li class="u-empty">' + esc(text) + "</li>";
  }
  function fixImgs(root) {
    $$("img[data-fb]", root).forEach(function (img) {
      img.addEventListener("error", function () {
        if (img.getAttribute("src") !== FALLBACK_IMG) img.src = FALLBACK_IMG;
      });
    });
  }

  function cardHtml(r, action) {
    var btn = "";
    if (action === "unsave") {
      btn = '<button type="button" class="recipe-card__act" data-act="unsave" data-id="' + esc(r.id) +
        '" aria-label="Bỏ lưu công thức ' + esc(r.name) + '" title="Bỏ lưu">&#9829;</button>';
    } else if (action === "delete") {
      btn = '<button type="button" class="recipe-card__act recipe-card__act--edit" data-act="edit" data-id="' + esc(r.id) +
        '" aria-label="Cập nhật công thức ' + esc(r.name) + '" title="Cập nhật công thức">&#9998;</button>' +
        '<button type="button" class="recipe-card__act recipe-card__act--del" data-act="delete" data-id="' + esc(r.id) +
        '" aria-label="Xóa công thức ' + esc(r.name) + '" title="Xóa công thức">&#10005;</button>';
    }
    return '<li class="recipe-card"><a href="' + esc(N.recipeUrl(r.id)) + '"><img class="recipe-card__img" data-fb src="' +
      esc(r.image || FALLBACK_IMG) + '" alt="" width="248" height="185" loading="lazy"><span class="recipe-card__name">' +
      esc(r.name) + "</span></a>" + btn + "</li>";
  }

  function reviewHtml(v, mode) {
    var delBtn = '<button class="cmt__reply" type="button" data-act="del-review" data-id="' + esc(v.id) + '">Xóa</button>';
    return '<li class="cmt-card" data-review="' + esc(v.id) + '"><article class="cmt">' +
      '<a class="cmt__recipe" href="' + esc(N.recipeUrl(v.recipeId)) + '">' + esc(v.recipeName) + "</a>" +
      '<div class="cmt__meta"><p class="cmt__who"><span>' + esc(v.user && v.user.username) + "</span> " +
      '<span class="cmt__stars" aria-label="' + esc(v.rating) + ' trên 5 sao">' + esc(N.stars(v.rating)) + "</span></p>" +
      '<span class="cmt__time"><img src="/images/account/clock.png" alt=""><time datetime="' + esc(v.createdAt) + '">' +
      esc(fmtDate(v.createdAt)) + "</time></span></div>" +
      '<p class="cmt__text">' + esc(v.text) + "</p>" +
      '<div class="cmt__actions"><button class="cmt__like" type="button" data-act="like" data-id="' + esc(v.id) +
      '" aria-pressed="' + (v.liked ? "true" : "false") + '" aria-label="Thích đánh giá"><img src="/images/account/like.png" alt="">' +
      '<span class="cmt__like-count">' + esc(v.likes || 0) + "</span></button>" +
      (mode === "full" ? delBtn : "") + "</div></article></li>";
  }

  /* ---------- phân trang ---------- */
  function renderPager(pager, total, current, onGo) {
    var list = $(".pager__list", pager);
    pager.hidden = total <= 1;
    list.innerHTML = "";
    if (total <= 1) return;
    function btn(n) {
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "pager__btn" + (n === current ? " is-current" : "");
      b.textContent = n; b.dataset.page = n;
      if (n === current) b.setAttribute("aria-current", "page");
      li.appendChild(b); return li;
    }
    function dots() {
      var li = document.createElement("li");
      li.className = "pager__dots"; li.setAttribute("aria-hidden", "true");
      li.innerHTML = "<i></i><i></i><i></i>"; return li;
    }
    function arrow(dir) {
      var li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.className = "pager__next"; b.dataset.dir = dir;
      var img = '<img src="/images/account/page-next.svg" alt="">';
      b.innerHTML = dir === "next" ? "Trang sau" + img : img.replace("<img", '<img style="transform:rotate(90deg)"') + "Trang trước";
      li.appendChild(b); return li;
    }
    var set = {};
    [1, 2, 3, total, current - 1, current, current + 1].forEach(function (n) {
      if (n >= 1 && n <= total) set[n] = true;
    });
    var pages = Object.keys(set).map(Number).sort(function (a, b) { return a - b; });
    if (current > 1) list.appendChild(arrow("prev"));
    pages.forEach(function (n, i) {
      if (i > 0 && n - pages[i - 1] > 1) list.appendChild(dots());
      list.appendChild(btn(n));
    });
    if (current < total) list.appendChild(arrow("next"));
    list.onclick = function (e) {
      var t = e.target.closest("button");
      if (!t) return;
      if (t.dataset.page) onGo(parseInt(t.dataset.page, 10));
      else if (t.dataset.dir === "next") onGo(current + 1);
      else if (t.dataset.dir === "prev") onGo(current - 1);
    };
  }

  /* ---------- trang danh sách: saved / uploaded / history ---------- */
  function initList(kind) {
    var list = $("[data-list]");
    var pager = $(".pager");
    var heading = $(".u-heading");
    var page = 1;
    var clearBtn = null;
    var action = kind === "saved" ? "unsave" : kind === "uploaded" ? "delete" : null;
    var emptyText = {
      saved: "Bạn chưa lưu công thức nào. Hãy khám phá và nhấn lưu món bạn thích!",
      uploaded: "Bạn chưa đăng tải công thức nào.",
      history: "Lịch sử xem còn trống."
    }[kind];

    if (kind === "history") {
      var bar = document.createElement("div");
      bar.className = "u-toolbar";
      bar.innerHTML = '<button type="button" class="u-btn u-btn--danger" data-act="clear-history">Xóa lịch sử</button>';
      heading.insertAdjacentElement("afterend", bar);
      clearBtn = $("button", bar);
    }
    if (kind === "uploaded") {
      var bar2 = document.createElement("div");
      bar2.className = "u-toolbar";
      bar2.innerHTML = '<a class="u-btn" href="/pages/upload.html">+ Đăng công thức mới</a>';
      heading.insertAdjacentElement("afterend", bar2);
    }

    function load(p) {
      page = Math.max(1, p || 1);
      list.setAttribute("aria-busy", "true");
      N.data.get("/me/" + kind, { page: page, limit: PAGE_SIZE }).then(function (d) {
        if (d.pages && page > d.pages) { return load(d.pages); }
        var items = d.items || [];
        if (!items.length) {
          emptyMsg(list, emptyText);
          pager.hidden = true;
          if (clearBtn) clearBtn.hidden = true;
        } else {
          list.innerHTML = items.map(function (r) { return cardHtml(r, action); }).join("");
          fixImgs(list);
          if (clearBtn) clearBtn.hidden = false;
          renderPager(pager, d.pages || 1, d.page || page, function (n) {
            load(n);
            window.scrollTo({ top: 0, behavior: "smooth" });
          });
        }
      }).catch(function (err) {
        emptyMsg(list, err.message);
      }).then(function () { list.removeAttribute("aria-busy"); });
    }

    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var act = b.dataset.act, id = b.dataset.id;
      if (act === "unsave") {
        b.disabled = true;
        N.data.del("/recipes/" + encodeURIComponent(id) + "/save").then(function () { load(page); })
          .catch(function (err) { b.disabled = false; alert(err.message); });
      } else if (act === "delete") {
        if (!confirm("Xóa công thức này? Thao tác không thể hoàn tác.")) return;
        b.disabled = true;
        N.data.del("/recipes/" + encodeURIComponent(id)).then(function () { load(page); })
          .catch(function (err) { b.disabled = false; alert(err.message); });
      } else if (act === "edit") {
        N.data.get("/recipes/" + encodeURIComponent(id)).then(function (r) {
          openEditor({ title: "Cập nhật công thức", fields: [
            { name: "name", label: "Tên món", value: r.name || r.title },
            { name: "description", label: "Mô tả", value: r.description || "" },
            { name: "time", label: "Tổng thời gian (phút)", type: "number", value: r.time || "" },
            { name: "servings", label: "Khẩu phần (người)", type: "number", value: r.baseServings || r.servings || "" }],
            onSubmit: function (v) {
              var body = { name: v.name.trim(), description: v.description.trim() };
              if (String(v.time).trim() !== "") body.time = Number(v.time);
              if (String(v.servings).trim() !== "") body.servings = Number(v.servings);
              return N.data.patch("/recipes/" + encodeURIComponent(id), body).then(function () { load(page); });
            } });
        }).catch(function (err) { alert(err.message); });
      } else if (act === "clear-history") {
        if (!confirm("Xóa toàn bộ lịch sử xem?")) return;
        N.data.del("/me/history").then(function () { load(1); }).catch(function (err) { alert(err.message); });
      }
    });
    load(1);
  }

  /* ---------- đánh giá ---------- */
  function bindReviewActions(list, reload) {
    list.addEventListener("click", function (e) {
      var b = e.target.closest("[data-act]");
      if (!b) return;
      var id = b.dataset.id;
      if (b.dataset.act === "like") {
        N.data.post("/reviews/" + encodeURIComponent(id) + "/like").then(function (d) {
          b.setAttribute("aria-pressed", d.liked ? "true" : "false");
          $(".cmt__like-count", b).textContent = d.likes;
        }).catch(function (err) { alert(err.message); });
      } else if (b.dataset.act === "del-review") {
        if (!confirm("Xóa đánh giá này?")) return;
        N.data.del("/reviews/" + encodeURIComponent(id)).then(reload).catch(function (err) { alert(err.message); });
      }
    });
  }
  function initReviewed() {
    var list = $("[data-list]");
    function load() {
      N.data.get("/me/reviews").then(function (d) {
        var items = d.items || [];
        if (!items.length) emptyMsg(list, "Bạn chưa đánh giá công thức nào.");
        else list.innerHTML = items.map(function (v) { return reviewHtml(v, "full"); }).join("");
      }).catch(function (err) { emptyMsg(list, err.message); });
    }
    bindReviewActions(list, load);
    load();
  }

  /* ---------- tổng quan ---------- */
  function initOverview() {
    var lists = {};
    $$("[data-list]").forEach(function (ul) {
      var sec = ul.closest("section");
      var id = (sec && sec.getAttribute("aria-labelledby")) || "";
      lists[id.replace("h-", "")] = ul;
    });
    function cards(key, items, text) {
      var ul = lists[key];
      if (!ul) return;
      if (!items || !items.length) return emptyMsg(ul, text);
      ul.innerHTML = items.map(function (r) { return cardHtml(r, null); }).join("");
      fixImgs(ul);
    }
    function load() {
      N.data.get("/me/overview").then(function (d) {
        cards("saved", d.recentSaved, "Bạn chưa lưu công thức nào.");
        cards("uploaded", d.recentUploaded, "Bạn chưa đăng tải công thức nào.");
        N.data.get("/me/history", { limit: 4 }).then(function (h) {
          cards("history", h.items, "Lịch sử xem còn trống.");
        }).catch(function () { emptyMsg(lists.history, "Lịch sử xem còn trống."); });
        if (lists.reviews) {
          if (!d.recentReviews || !d.recentReviews.length) emptyMsg(lists.reviews, "Bạn chưa đánh giá công thức nào.");
          else lists.reviews.innerHTML = d.recentReviews.map(function (v) { return reviewHtml(v, "brief"); }).join("");
        }
        var counts = d.counts || {};
        ["saved", "uploaded", "reviews", "history"].forEach(function (k) {
          var h = $("#h-" + k);
          if (h && counts[k] != null && !h.dataset.counted) {
            h.dataset.counted = "1";
            h.insertAdjacentHTML("beforeend", ' <small class="u-count">(' + esc(counts[k]) + ")</small>");
          }
        });
      }).catch(function (err) {
        Object.keys(lists).forEach(function (k) { emptyMsg(lists[k], err.message); });
      });
    }
    if (lists.reviews) bindReviewActions(lists.reviews, load);
    load();
    initAccountBox();
  }

  function renderProfile(user) {
    var name = $(".profile-banner__name");
    if (name) name.textContent = user.username;
    var av = $(".avatar__img");
    if (av && user.avatar) av.src = user.avatar;
    var cv = $(".profile-banner__bg img");
    if (cv && user.cover) cv.src = user.cover;
    var vals = [user.email, user.username, "••••••••"];
    $$(".acc-row__value").forEach(function (a, i) {
      var s = $("span", a);
      if (s && vals[i] != null) s.textContent = vals[i];
    });
  }

  /* ---------- đổi ảnh đại diện / ảnh bìa ---------- */
  // Đọc file ảnh, thu nhỏ bằng canvas (avatar: vuông 256px, bìa: tối đa 1400px) rồi lưu vào hồ sơ.
  function pickImage(kind) {
    var input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp";
    input.onchange = function () {
      var file = input.files && input.files[0];
      if (!file) return;
      if (file.size > 8 * 1024 * 1024) { alert("Ảnh quá lớn (tối đa 8 MB)."); return; }
      var reader = new FileReader();
      reader.onload = function () {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas"), g = c.getContext("2d");
          if (kind === "avatar") {
            var side = Math.min(img.width, img.height);
            c.width = c.height = 256;
            g.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, 256, 256);
          } else {
            var k = Math.min(1, 1400 / img.width, 600 / img.height);
            c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
            g.drawImage(img, 0, 0, c.width, c.height);
          }
          var body = {};
          body[kind] = c.toDataURL("image/jpeg", 0.82);
          N.data.patch("/me", body).then(function (d) {
            if (d && d.user) { window.NomNomAuth && NomNomAuth.refresh(d.user); renderProfile(d.user); }
          }).catch(function (err) { alert((err && err.message) || "Không đổi được ảnh. Hãy thử ảnh khác."); });
        };
        img.onerror = function () { alert("Không đọc được ảnh này."); };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    };
    input.click();
  }
  (function initImagePickers() {
    var badge = $(".avatar__badge");
    if (badge) {
      badge.setAttribute("role", "button"); badge.setAttribute("tabindex", "0"); badge.setAttribute("title", "Đổi ảnh đại diện");
      badge.addEventListener("click", function () { pickImage("avatar"); });
      badge.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pickImage("avatar"); } });
    }
    var banner = $(".profile-banner");
    if (banner) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "profile-banner__cover-btn"; b.textContent = "Đổi ảnh bìa";
      b.addEventListener("click", function () { pickImage("cover"); });
      banner.appendChild(b);
    }
  })();

  /* ---------- sửa / xóa tài khoản ---------- */
  var dlg;
  function ensureDialog() {
    if (dlg) return dlg;
    dlg = document.createElement("dialog");
    dlg.className = "acc-dialog";
    dlg.innerHTML = '<form class="acc-dialog__form" novalidate>' +
      '<h3 class="acc-dialog__title"></h3><div class="acc-dialog__fields"></div>' +
      '<p class="acc-dialog__error" role="alert" hidden></p>' +
      '<div class="acc-dialog__btns"><button type="button" class="u-btn" data-cancel>Hủy</button>' +
      '<button type="submit" class="u-btn u-btn--primary">Lưu</button></div></form>';
    document.body.appendChild(dlg);
    $("[data-cancel]", dlg).addEventListener("click", function () { dlg.close(); });
    return dlg;
  }
  function openEditor(opts) {
    var d = ensureDialog();
    var form = $("form", d), errEl = $(".acc-dialog__error", d), submit = $("[type=submit]", d);
    $(".acc-dialog__title", d).textContent = opts.title;
    $(".acc-dialog__fields", d).innerHTML = opts.fields.map(function (f) {
      return '<label class="acc-dialog__label">' + esc(f.label) + '<input class="acc-dialog__input" name="' + esc(f.name) +
        '" type="' + (f.type || "text") + '" value="' + esc(f.value || "") + '" autocomplete="' + (f.ac || "off") + '"></label>';
    }).join("");
    submit.textContent = opts.submit || "Lưu";
    submit.classList.toggle("u-btn--danger", !!opts.danger);
    errEl.hidden = true;
    form.onsubmit = function (e) {
      e.preventDefault();
      var data = {};
      opts.fields.forEach(function (f) { data[f.name] = form.elements[f.name].value; });
      errEl.hidden = true;
      submit.disabled = true;
      Promise.resolve().then(function () { return opts.onSubmit(data); }).then(function () { d.close(); }).catch(function (err) {
        errEl.textContent = (err && err.message) || "Có lỗi xảy ra.";
        errEl.hidden = false;
        var inp = err && err.field && form.elements[err.field];
        if (inp) inp.focus();
      }).then(function () { submit.disabled = false; });
    };
    d.showModal();
    form.elements[opts.fields[0].name].focus();
  }

  function initAccountBox() {
    var A = window.NomNomAuth;
    function patch(body) {
      return N.data.patch("/me", body).then(function (d) {
        if (d && d.user) { A.refresh(d.user); renderProfile(d.user); }
      });
    }
    var defs = [
      function () {
        openEditor({ title: "Đổi email", fields: [
          { name: "email", label: "Email mới", type: "email", value: A.user.email, ac: "email" },
          { name: "currentPassword", label: "Mật khẩu hiện tại", type: "password", ac: "current-password" }],
          onSubmit: function (v) { return patch({ email: v.email.trim(), currentPassword: v.currentPassword }); } });
      },
      function () {
        openEditor({ title: "Đổi tên đăng nhập", fields: [
          { name: "username", label: "Tên đăng nhập mới (3–24 ký tự a-z, 0-9, _ .)", value: A.user.username, ac: "username" },
          { name: "currentPassword", label: "Mật khẩu hiện tại", type: "password", ac: "current-password" }],
          onSubmit: function (v) { return patch({ username: v.username.trim().toLowerCase(), currentPassword: v.currentPassword }); } });
      },
      function () {
        openEditor({ title: "Đổi mật khẩu", fields: [
          { name: "currentPassword", label: "Mật khẩu hiện tại", type: "password", ac: "current-password" },
          { name: "newPassword", label: "Mật khẩu mới (tối thiểu 6 ký tự)", type: "password", ac: "new-password" },
          { name: "confirm", label: "Nhập lại mật khẩu mới", type: "password", ac: "new-password" }],
          onSubmit: function (v) {
            if (v.newPassword.length < 6) return Promise.reject({ message: "Mật khẩu mới cần ít nhất 6 ký tự.", field: "newPassword" });
            if (v.newPassword !== v.confirm) return Promise.reject({ message: "Mật khẩu xác nhận chưa trùng khớp.", field: "confirm" });
            return patch({ newPassword: v.newPassword, currentPassword: v.currentPassword });
          } });
      }
    ];
    $$(".acc-row__value").forEach(function (a, i) {
      if (!defs[i]) return;
      a.addEventListener("click", function (e) { e.preventDefault(); defs[i](); });
    });
    var del = $('[data-action="delete-account"]');
    if (del) del.addEventListener("click", function (e) {
      e.preventDefault();
      openEditor({ title: "Xóa tài khoản", submit: "Xóa vĩnh viễn", danger: true, fields: [
        { name: "password", label: "Nhập mật khẩu để xác nhận. Thao tác không thể hoàn tác.", type: "password", ac: "current-password" }],
        onSubmit: function (v) {
          return N.data.del("/me", { password: v.password }).then(function () { return A.logout(); });
        } });
    });
  }

  /* ---------- khởi động: yêu cầu đăng nhập ---------- */
  function start() {
    var A = window.NomNomAuth;
    if (!A) return;
    A.ready.then(function (user) {
      if (!user) {
        location.replace("/?login=1&next=" + encodeURIComponent(location.pathname + location.search));
        return;
      }
      renderProfile(user);
      if (file === "saved.html") initList("saved");
      else if (file === "uploaded.html") initList("uploaded");
      else if (file === "history.html") initList("history");
      else if (file === "reviewed.html") initReviewed();
      else initOverview();
    });
  }
  if (document.readyState !== "complete") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
