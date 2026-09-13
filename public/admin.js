let products = [];
const $ = (s) => document.querySelector(s);
const rupiah = (n) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(n) || 0);

async function api(url, opt = {}) {
  const r = await fetch(url, { ...opt, headers: { ...(opt.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...(opt.headers || {}) } });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw Error(d.error || "Terjadi kesalahan");
  return d;
}

function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;", "'":"&#039;"}[c]));
}

async function init() {
  try {
    const me = await api("/api/me");
    if (!me || me.role !== "admin") return location.href = "/admin-login.html";
    await refreshAll();
  } catch (e) {
    alert(e.message);
    location.href = "/admin-login.html";
  }
}

async function refreshAll() {
  const st = await api("/api/admin/stats");
  $("#revenue").textContent = rupiah(st.revenue);
  $("#orders").textContent = st.orders;
  $("#products").textContent = st.products;
  $("#customers").textContent = st.customers;
  await renderOrders();
  await renderProducts();
}

async function renderOrders() {
  const os = await api("/api/orders");
  $("#orderRows").innerHTML = os.map(o => `<tr>
    <td><b>${esc(o.id)}</b></td>
    <td>${esc(o.customer)}<br><small>${esc(o.phone || "")}</small></td>
    <td>${esc(o.date)}</td>
    <td>${rupiah(o.total)}</td>
    <td><span class="status ${esc(o.status)}">${esc(o.status)}</span></td>
    <td><select class="select" onchange="changeStatus('${esc(o.id)}',this.value)">
      ${["Menunggu","Diproses","Selesai","Dibatalkan"].map(s => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}
    </select></td>
  </tr>`).join("") || `<tr><td colspan="6">Belum ada pesanan.</td></tr>`;
}

async function changeStatus(id, status) {
  try { await api("/api/admin/orders/" + encodeURIComponent(id), { method: "PUT", body: JSON.stringify({ status }) }); await renderOrders(); }
  catch (e) { alert(e.message); }
}

async function renderProducts() {
  products = await api("/api/admin/products");
  $("#productRows").innerHTML = products.map(p => `<div class="prod ${p.active === false ? "inactive" : ""}">
    <div class="thumb">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name)}">` : esc(p.emoji || "🍰")}</div>
    <div class="prodinfo">
      <b>${esc(p.name)}</b>
      <small>${esc(p.category)} · ${rupiah(p.price)}</small>
      <span class="stock ${Number(p.stock) === 0 ? "out" : ""}">Stok: <strong>${p.stock}</strong> · ${p.active === false ? "Disembunyikan" : "Tampil"}</span>
    </div>
    <div class="prodactions">
      <button class="edit" onclick="showEdit(${p.id})">Edit</button>
      <button class="restock" onclick="showRestock(${p.id})">+ Stok</button>
      <button class="toggle" onclick="toggleProduct(${p.id})">${p.active === false ? "Tampilkan" : "Sembunyikan"}</button>
      <button class="del" onclick="del(${p.id})">Hapus</button>
    </div>
  </div>`).join("");
}

function productForm(title, p = {}) {
  const editing = Boolean(p.id);
  $("#modal").classList.remove("hidden");
  $("#content").innerHTML = `<h2>${editing ? "Edit Produk" : "Tambah Produk"}</h2>
    <form class="form" id="productForm">
      <label>Nama Produk<input name="name" value="${esc(p.name || "")}" required maxlength="120"></label>
      <label>Kategori<input name="category" value="${esc(p.category || "Cake")}" required maxlength="80"></label>
      <div class="formgrid"><label>Harga (Rp)<input name="price" type="number" min="0" step="1" value="${Number(p.price) || 0}" required></label><label>Stok<input name="stock" type="number" min="0" step="1" value="${Number(p.stock) || 0}" required></label></div>
      <label>Emoji cadangan<input name="emoji" value="${esc(p.emoji || "🍰")}" maxlength="10"></label>
      <label>Deskripsi<textarea name="desc" rows="3" maxlength="500">${esc(p.desc || "")}</textarea></label>
      <label class="upload">📷 ${p.image ? "Ganti foto produk" : "Pilih foto produk"}<input id="imageFile" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label>
      <img id="preview" class="preview ${p.image ? "" : "hidden"}" src="${esc(p.image || "")}" alt="Preview">
      <div class="currentfile">${p.image ? "Foto saat ini akan tetap digunakan jika tidak memilih foto baru." : "Belum ada foto."}</div>
      <button class="primary" type="submit">${editing ? "Simpan Perubahan" : "Simpan Produk"}</button>
    </form>`;

  $("#imageFile").onchange = e => {
    const f = e.target.files[0]; if (!f) return;
    if (f.size > 8 * 1024 * 1024) { alert("Ukuran gambar maksimal 8 MB."); e.target.value = ""; return; }
    const r = new FileReader(); r.onload = () => { $("#preview").src = r.result; $("#preview").classList.remove("hidden"); }; r.readAsDataURL(f);
  };

  $("#productForm").onsubmit = async e => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    data.price = Number(data.price); data.stock = Number(data.stock); data.active = p.active !== false;
    const f = $("#imageFile").files[0];
    try {
      if (f) {
        const imageData = await readDataURL(f);
        const uploaded = await api("/api/admin/upload-image", { method: "POST", body: JSON.stringify({ data: imageData }) });
        data.image = uploaded.image;
      } else {
        data.image = p.image || "";
      }
      await api(editing ? "/api/admin/products/" + p.id : "/api/admin/products", { method: editing ? "PUT" : "POST", body: JSON.stringify(data) });
      closeModal(); await refreshAll();
    } catch (err) { alert(err.message); }
  };
}

function readDataURL(file) { return new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file); }); }
function showAdd() { productForm("Tambah Produk"); }
function showEdit(id) { const p = products.find(x => x.id === id); if (p) productForm("Edit Produk", p); }

function showRestock(id) {
  const p = products.find(x => x.id === id); if (!p) return;
  $("#modal").classList.remove("hidden");
  $("#content").innerHTML = `<h2>Restok ${esc(p.name)}</h2><p>Stok saat ini: <b>${p.stock}</b></p><form class="form" id="restockForm"><label>Jumlah tambahan<input name="qty" type="number" min="1" step="1" required></label><button class="primary">Tambah Stok</button></form>`;
  $("#restockForm").onsubmit = async e => { e.preventDefault(); try { const qty = Number(new FormData(e.target).get("qty")); await api(`/api/admin/products/${id}/restock`, { method: "PUT", body: JSON.stringify({ qty }) }); closeModal(); await refreshAll(); } catch (err) { alert(err.message); } };
}

async function toggleProduct(id) { try { await api(`/api/admin/products/${id}/toggle`, { method: "PUT" }); await refreshAll(); } catch (e) { alert(e.message); } }
async function del(id) { const p = products.find(x => x.id === id); if (!p || !confirm(`Hapus produk "${p.name}"?`)) return; try { await api(`/api/admin/products/${id}`, { method: "DELETE" }); await refreshAll(); } catch (e) { alert(e.message); } }
function closeModal() { $("#modal").classList.add("hidden"); }
async function logout() { await api("/api/logout", { method: "POST" }); location.href = "/admin-login.html"; }
init();
