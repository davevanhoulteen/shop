let products = [];
let cart = JSON.parse(localStorage.getItem("sweetcrumb-cart") || "[]");
let currentFilter = "Semua";
let me = null;

const $ = (s) => document.querySelector(s);

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(n);

async function api(url, opt = {}) {
  const r = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...opt
  });

  const d = await r.json();

  if (!r.ok) {
    throw new Error(d.error || "Terjadi kesalahan");
  }

  return d;
}

/* =========================
   LOAD TOKO
========================= */

async function init() {
  try {
    products = await api("/api/products");
    me = await api("/api/me");

    renderFilters();
    renderProducts();
    updateCart();
    updateAuth();

  } catch (err) {
    console.error(err);

    $("#products").innerHTML = `
      <div class="empty-products">
        <h3>Produk gagal dimuat</h3>
        <p>${escapeHtml(err.message)}</p>
        <button class="add" onclick="location.reload()">
          Coba Lagi
        </button>
      </div>
    `;
  }
}

/* =========================
   FILTER PRODUK
========================= */

function renderFilters() {
  const categories = [
    "Semua",
    ...new Set(products.map((p) => p.category))
  ];

  $("#filters").innerHTML = categories
    .map(
      (category) => `
        <button
          class="filter ${category === currentFilter ? "active" : ""}"
          onclick="setFilter('${escapeHtml(category)}')"
        >
          ${escapeHtml(category)}
        </button>
      `
    )
    .join("");
}

function setFilter(category) {
  currentFilter = category;
  renderFilters();
  renderProducts();
}

/* =========================
   TAMPILKAN PRODUK
========================= */

function renderProducts() {
  const list =
    currentFilter === "Semua"
      ? products
      : products.filter((p) => p.category === currentFilter);

  if (!list.length) {
    $("#products").innerHTML = `
      <div class="empty-products">
        <h3>Belum ada produk</h3>
        <p>Produk akan muncul setelah admin menambahkannya.</p>
      </div>
    `;

    return;
  }

  $("#products").innerHTML = list
    .map((p) => {
      const soldOut = Number(p.stock) <= 0;

      let visual;

      if (p.image) {
        visual = `
          <img
            src="${escapeHtml(p.image)}"
            alt="${escapeHtml(p.name)}"
            onerror="
              this.style.display='none';
              this.nextElementSibling.style.display='grid';
            "
          >

          <span
            class="emoji-fallback"
            style="display:none"
          >
            ${p.emoji || "🍰"}
          </span>
        `;
      } else {
        visual = `
          <span>${p.emoji || "🍰"}</span>
        `;
      }

      return `
        <article class="card">

          <div class="pic">
            ${visual}
          </div>

          <div class="info">

            <span class="tag">
              ${escapeHtml(p.category || "KUE").toUpperCase()}
            </span>

            <h3>
              ${escapeHtml(p.name)}
            </h3>

            <p>
              ${escapeHtml(
                p.desc || "Kue fresh pilihan SweetCrumb."
              )}
            </p>

            <div
              class="stock-label ${soldOut ? "out" : ""}"
            >
              ${
                soldOut
                  ? "Stok habis"
                  : "Stok tersedia: " + p.stock
              }
            </div>

            <div class="row">

              <span class="price">
                ${rupiah(p.price)}
              </span>

              <a
                class="add"
                href="https://wa.me/6285776071101?text=${encodeURIComponent(
                  `Halo SariLegit, saya ingin memesan ${p.name} dengan harga ${rupiah(p.price)}.`
                )}"
                target="_blank"
                rel="noopener noreferrer"
              >
                ${soldOut ? "Habis" : "Pesan via WhatsApp"}
              </a>

            </div>

          </div>

        </article>
      `;
    })
    .join("");
}

/* =========================
   ESCAPE HTML
========================= */

function escapeHtml(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      })[c]
  );
}

/* =========================
   KERANJANG
========================= */

function save() {
  localStorage.setItem(
    "sweetcrumb-cart",
    JSON.stringify(cart)
  );

  updateCart();
}

function updateCart() {
  const count = cart.reduce(
    (total, item) => total + item.qty,
    0
  );

  $("#cartCount").textContent = count;
}

function addCart(id) {
  const product = products.find(
    (p) => p.id === id
  );

  if (!product) {
    toast("Produk tidak ditemukan");
    return;
  }

  if (product.stock <= 0) {
    toast("Stok produk habis");
    return;
  }

  const item = cart.find(
    (i) => i.productId === id
  );

  if (item) {
    if (item.qty >= product.stock) {
      toast("Jumlah melebihi stok");
      return;
    }

    item.qty++;
  } else {
    cart.push({
      productId: id,
      qty: 1
    });
  }

  save();

  toast(
    `${product.name} ditambahkan ke keranjang`
  );
}

/* =========================
   MODAL
========================= */

function openModal(html) {
  $("#modalContent").innerHTML = html;
  $("#modal").classList.remove("hidden");
}

function closeModal() {
  $("#modal").classList.add("hidden");
}

$("#closeModal").onclick = closeModal;

$("#modal").onclick = (e) => {
  if (e.target.id === "modal") {
    closeModal();
  }
};

/* =========================
   LOGIN BUTTON
========================= */

$("#loginBtn").onclick = () => {
  showGuestOrders();
};

function updateAuth() {
  $("#loginBtn").textContent = "Pesanan";
}

/* =========================
   PESANAN USER
========================= */

function showGuestOrders() {
  const ids = JSON.parse(
    localStorage.getItem("sweetcrumb-orders") || "[]"
  );

  if (!ids.length) {
    openModal(`
      <h2>Pesanan</h2>
      <p>
        Belum ada pesanan di perangkat ini.
      </p>
    `);

    return;
  }

  openModal(`
    <h2>Pesanan Kamu</h2>

    <p>
      Nomor pesanan yang pernah dibuat:
    </p>

    ${ids
      .map(
        (id) => `
          <div class="cartline">
            <b>${escapeHtml(id)}</b>
            <span>✓ Terkirim</span>
          </div>
        `
      )
      .join("")}
  `);
}

/* =========================
   KERANJANG
========================= */

function showCart() {
  let total = 0;

  const rows = cart
    .map((item) => {
      const product = products.find(
        (p) => p.id === item.productId
      );

      if (!product) return "";

      total +=
        product.price * item.qty;

      return `
        <div class="cartline">

          <div>
            ${product.emoji || "🍰"}
            <b>${escapeHtml(product.name)}</b>
            <br>
            ${rupiah(product.price)}
            × ${item.qty}
          </div>

          <div class="qty">

            <button
              onclick="changeQty(${product.id}, -1)"
            >
              −
            </button>

            <span>${item.qty}</span>

            <button
              onclick="changeQty(${product.id}, 1)"
            >
              +
            </button>

          </div>

        </div>
      `;
    })
    .join("");

  openModal(`
    <h2>Keranjang</h2>

    ${
      rows ||
      "<p>Keranjang masih kosong.</p>"
    }

    <div class="total">
      <span>Total</span>
      <span>${rupiah(total)}</span>
    </div>

    ${
      cart.length
        ? `
          <button
            class="formBtn"
            onclick="checkout()"
          >
            Checkout
          </button>
        `
        : ""
    }
  `);
}

$("#cartBtn").onclick = showCart;

function changeQty(id, amount) {
  const item = cart.find(
    (x) => x.productId === id
  );

  const product = products.find(
    (p) => p.id === id
  );

  if (!item || !product) return;

  item.qty += amount;

  if (item.qty > product.stock) {
    item.qty = product.stock;
    toast("Jumlah sudah mencapai stok");
  }

  if (item.qty <= 0) {
    cart = cart.filter(
      (x) => x !== item
    );
  }

  save();
  showCart();
}

/* =========================
   CHECKOUT TANPA LOGIN
========================= */

async function checkout() {
  let total = 0;

  cart.forEach((item) => {
    const product = products.find(
      (p) => p.id === item.productId
    );

    if (product) {
      total +=
        product.price * item.qty;
    }
  });

  openModal(`
    <h2>Checkout</h2>

    <p>
      Tidak perlu login. Isi data penerima di bawah.
    </p>

    <form
      class="form"
      id="checkoutForm"
    >

      <input
        name="name"
        placeholder="Nama penerima"
        required
      >

      <input
        name="phone"
        placeholder="Nomor WhatsApp"
        inputmode="tel"
        required
      >

      <textarea
        name="address"
        placeholder="Alamat lengkap pengiriman"
        required
      ></textarea>

      <select name="payment">
        <option>
          Transfer / E-wallet
        </option>

        <option>
          COD
        </option>
      </select>

      <div class="total">
        <span>Total</span>
        <span>${rupiah(total)}</span>
      </div>

      <button type="submit">
        Konfirmasi Pesanan
      </button>

    </form>
  `);

  $("#checkoutForm").onsubmit =
    async (e) => {
      e.preventDefault();

      const data = Object.fromEntries(
        new FormData(e.target)
      );

      try {
        const order = await api(
          "/api/orders",
          {
            method: "POST",

            body: JSON.stringify({
              items: cart,

              customer: {
                name: data.name,
                phone: data.phone,
                address: data.address
              }
            })
          }
        );

        /* simpan nomor pesanan */
        const saved = JSON.parse(
          localStorage.getItem(
            "sweetcrumb-orders"
          ) || "[]"
        );

        saved.unshift(order.id);

        localStorage.setItem(
          "sweetcrumb-orders",
          JSON.stringify(
            saved.slice(0, 20)
          )
        );

        /* kosongkan keranjang */
        cart = [];

        save();

        /* refresh produk supaya stok berubah */
        products = await api(
          "/api/products"
        );

        renderProducts();

        openModal(`
          <div class="success">
            ✓
          </div>

          <h2>
            Pesanan berhasil!
          </h2>

          <p>
            Nomor pesanan:
          </p>

          <h3>
            ${escapeHtml(order.id)}
          </h3>

          <p>
            Kami akan menghubungi
            WhatsApp kamu untuk
            konfirmasi pesanan.
          </p>

          <button
            class="formBtn"
            onclick="location.href='/'"
          >
            Kembali ke Toko
          </button>
        `);

      } catch (err) {
        toast(err.message);
      }
    };
}

/* =========================
   NOTIFIKASI
========================= */

function toast(message) {
  $("#toast").textContent =
    message;

  $("#toast").classList.add(
    "show"
  );

  setTimeout(() => {
    $("#toast").classList.remove(
      "show"
    );
  }, 2200);
}

/* =========================
   MULAI APLIKASI
========================= */

init();
