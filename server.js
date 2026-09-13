const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const UPLOAD_DIR = path.join(PUBLIC_DIR, "uploads");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: "12mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(session({
  secret: process.env.SESSION_SECRET || "toko-kue-demo-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8, httpOnly: true, sameSite: "lax" }
}));
app.use(express.static(PUBLIC_DIR));

const seedProducts = [
  { id: 1, name: "Lapis Legit", category: "Cake", price: 45000, stock: 12, emoji: "🍰", image: "/lapislegit.png", desc: "Kue lapis legit yang lembut dan harum dengan cita rasa manis gurih, berlapis sempurna di setiap gigitan.", active: true },
  { id: 2, name: "Brownies Cake", category: "Cake", price: 40000, stock: 8, emoji: "🍫", image: "/brownies.png", desc: "Kue brownies dengan tekstur sangat empuk dan cokelat premium.", active: true },
  { id: 3, name: "Lapis Surabaya", category: "Cake", price: 50000, stock: 7, emoji: "🍰", image: "/surabaya.png", desc: "Bolu lembut dengan perpaduan cokelat, vanilla, dan selai premium.", active: true },
  { id: 4, name: "Bolu Ketan", category: "Roll", price: 50000, stock: 10, emoji: "🍰", image: "/boluketan.png", desc: "Bolu lembut dengan cita rasa ketan yang gurih, manis, dan legit.", active: true },
  { id: 5, name: "Donut's", category: "Pastry", price: 3000, stock: 20, emoji: "🍩", image: "/donat.png", desc: "Donat empuk dengan tekstur fluffy dan topping melimpah.", active: true },
  { id: 6, name: "Bolu Gulung", category: "Pastry", price: 32000, stock: 20, emoji: "🍰", image: "/bolugulung.png", desc: "Bolu gulung lembut dengan isian yang nikmat.", active: true },
  { id: 7, name: "Talas Ungu", category: "Roll", price: 32000, stock: 20, emoji: "🍠", image: "/talasungu.png", desc: "Bolu talas ungu lembut dengan rasa manis yang pas.", active: true },
  { id: 8, name: "Bolu Pisang", category: "Pastry", price: 32000, stock: 20, emoji: "🍌", image: "/bolupisang.png", desc: "Bolu pisang lembut dan harum untuk teman minum teh.", active: true },
  { id: 9, name: "Kue Ulang Tahun", category: "Cake", price: 65000, stock: 15, emoji: "", image: "/kueultah.png", desc: "Box 6 macaron dengan rasa pilihan.", active: true }
];

function loadProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) {
      fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(seedProducts, null, 2));
      return seedProducts.map(p => ({ ...p }));
    }
    const data = JSON.parse(fs.readFileSync(PRODUCTS_FILE, "utf8"));
    if (!Array.isArray(data)) throw new Error("products.json bukan array");
    return data;
  } catch (err) {
    console.error("Gagal membaca products.json:", err.message);
    fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(seedProducts, null, 2));
    return seedProducts.map(p => ({ ...p }));
  }
}

let products = loadProducts();

function saveProducts() {
  const tmp = PRODUCTS_FILE + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(products, null, 2));
  fs.renameSync(tmp, PRODUCTS_FILE);
}

const users = [
  { id: 1, name: "Admin SariLegit", email: "admin@sweetcrumb.test", password: "admin123", role: "admin" },
  { id: 2, name: "Demo Customer", email: "user@sweetcrumb.test", password: "user123", role: "user" }
];

let orders = [
  { id: "ORD-1001", userId: 2, customer: "Demo Customer", total: 85000, status: "Diproses", date: "10 Sep 2026", items: [{ productId: 1, qty: 1 }, { productId: 2, qty: 1 }] }
];

function auth(req, res, next) {
  if (!req.session.user) return res.status(401).json({ error: "Silakan login terlebih dahulu." });
  next();
}
function admin(req, res, next) {
  if (!req.session.user || req.session.user.role !== "admin") return res.status(403).json({ error: "Akses admin diperlukan." });
  next();
}
function cleanText(v, max = 500) {
  return String(v ?? "").trim().slice(0, max);
}
function nextProductId() {
  return products.reduce((max, p) => Math.max(max, Number(p.id) || 0), 0) + 1;
}
function removeLocalUpload(image) {
  if (!image || !image.startsWith("/uploads/")) return;
  const filename = path.basename(image);
  const file = path.join(UPLOAD_DIR, filename);
  if (fs.existsSync(file)) fs.unlinkSync(file);
}

app.get("/api/products", (req, res) => {
  res.json(products.filter(p => p.active !== false));
});

app.get("/api/me", (req, res) => res.json(req.session.user || null));

app.post("/api/login", (req, res) => {
  const email = cleanText(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || "");
  const user = users.find(u => u.email.toLowerCase() === email && u.password === password);
  if (!user) return res.status(401).json({ error: "Email atau password salah." });
  req.session.user = { id: user.id, name: user.name, email: user.email, role: user.role };
  res.json(req.session.user);
});

app.post("/api/logout", (req, res) => req.session.destroy(() => res.json({ ok: true })));

app.post("/api/register", (req, res) => {
  const name = cleanText(req.body.name, 100);
  const email = cleanText(req.body.email, 200).toLowerCase();
  const password = String(req.body.password || "");
  if (!name || !email || password.length < 6) return res.status(400).json({ error: "Lengkapi data. Password minimal 6 karakter." });
  if (users.some(u => u.email.toLowerCase() === email)) return res.status(400).json({ error: "Email sudah terdaftar." });
  const user = { id: Math.max(...users.map(u => u.id)) + 1, name, email, password, role: "user" };
  users.push(user);
  req.session.user = { id: user.id, name, email, role: user.role };
  res.json(req.session.user);
});

app.post("/api/orders", (req, res) => {
  const { items = [], customer = {} } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: "Keranjang kosong." });
  if (!customer.name || !customer.phone || !customer.address) return res.status(400).json({ error: "Lengkapi nama, WhatsApp, dan alamat." });
  let total = 0;
  const clean = [];
  for (const item of items) {
    const p = products.find(x => x.id === Number(item.productId) && x.active !== false);
    const qty = Math.max(1, Number(item.qty) || 1);
    if (!p) continue;
    if (qty > p.stock) return res.status(400).json({ error: `Stok ${p.name} tidak mencukupi.` });
    total += Number(p.price) * qty;
    clean.push({ productId: p.id, qty });
  }
  if (!clean.length) return res.status(400).json({ error: "Produk tidak tersedia." });
  clean.forEach(i => { const p = products.find(p => p.id === i.productId); p.stock -= i.qty; });
  saveProducts();
  const order = {
    id: "ORD-" + (1000 + orders.length + 1),
    userId: req.session.user?.id || null,
    customer: cleanText(customer.name, 100),
    phone: cleanText(customer.phone, 50),
    address: cleanText(customer.address, 500),
    total,
    status: "Menunggu",
    date: new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }),
    items: clean
  };
  orders.unshift(order);
  res.json(order);
});

app.get("/api/orders", auth, (req, res) => {
  res.json(req.session.user.role === "admin" ? orders : orders.filter(o => o.userId === req.session.user.id));
});

app.get("/api/admin/stats", admin, (req, res) => {
  const revenue = orders.filter(o => o.status !== "Dibatalkan").reduce((s, o) => s + o.total, 0);
  res.json({ revenue, orders: orders.length, products: products.filter(p => p.active !== false).length, customers: users.filter(u => u.role === "user").length });
});

app.get("/api/admin/products", admin, (req, res) => res.json(products));

app.put("/api/admin/orders/:id", admin, (req, res) => {
  const order = orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: "Pesanan tidak ditemukan." });
  const allowed = ["Menunggu", "Diproses", "Selesai", "Dibatalkan"];
  if (!allowed.includes(req.body.status)) return res.status(400).json({ error: "Status tidak valid." });
  order.status = req.body.status;
  res.json(order);
});

app.post("/api/admin/upload-image", admin, (req, res) => {
  const data = String(req.body.data || "");
  const match = data.match(/^data:(image\/(jpeg|jpg|png|webp|gif));base64,(.+)$/i);
  if (!match) return res.status(400).json({ error: "Format gambar tidak didukung. Gunakan JPG, PNG, WEBP, atau GIF." });
  const ext = match[2].toLowerCase() === "jpeg" || match[2].toLowerCase() === "jpg" ? "jpg" : match[2].toLowerCase();
  const filename = `${Date.now()}-${crypto.randomBytes(5).toString("hex")}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  const buffer = Buffer.from(match[3], "base64");
  if (buffer.length > 8 * 1024 * 1024) return res.status(400).json({ error: "Ukuran gambar maksimal 8 MB." });
  fs.writeFileSync(filepath, buffer);
  res.json({ image: `/uploads/${filename}` });
});

app.post("/api/admin/products", admin, (req, res) => {
  const name = cleanText(req.body.name, 120);
  const category = cleanText(req.body.category, 80);
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: "Data produk tidak valid." });
  const p = {
    id: nextProductId(), name, category, price: Math.round(price), stock,
    emoji: cleanText(req.body.emoji || "🍰", 10), image: cleanText(req.body.image, 500),
    desc: cleanText(req.body.desc, 500), active: req.body.active !== false
  };
  products.push(p); saveProducts(); res.json(p);
});

app.put("/api/admin/products/:id", admin, (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Produk tidak ditemukan." });
  const name = cleanText(req.body.name, 120);
  const category = cleanText(req.body.category, 80);
  const price = Number(req.body.price);
  const stock = Number(req.body.stock);
  if (!name || !category || !Number.isFinite(price) || price < 0 || !Number.isInteger(stock) || stock < 0) return res.status(400).json({ error: "Data produk tidak valid." });
  if (req.body.image && req.body.image !== product.image) removeLocalUpload(product.image);
  Object.assign(product, {
    name, category, price: Math.round(price), stock,
    emoji: cleanText(req.body.emoji || "🍰", 10),
    image: cleanText(req.body.image, 500), desc: cleanText(req.body.desc, 500),
    active: req.body.active !== false
  });
  saveProducts(); res.json(product);
});

app.put("/api/admin/products/:id/restock", admin, (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  const qty = Number(req.body.qty);
  if (!product) return res.status(404).json({ error: "Produk tidak ditemukan." });
  if (!Number.isInteger(qty) || qty <= 0) return res.status(400).json({ error: "Jumlah restok harus lebih dari 0." });
  product.stock += qty; saveProducts(); res.json(product);
});

app.put("/api/admin/products/:id/toggle", admin, (req, res) => {
  const product = products.find(p => p.id === Number(req.params.id));
  if (!product) return res.status(404).json({ error: "Produk tidak ditemukan." });
  product.active = !Boolean(product.active); saveProducts(); res.json(product);
});

app.delete("/api/admin/products/:id", admin, (req, res) => {
  const idx = products.findIndex(p => p.id === Number(req.params.id));
  if (idx < 0) return res.status(404).json({ error: "Produk tidak ditemukan." });
  const [removed] = products.splice(idx, 1);
  removeLocalUpload(removed.image); saveProducts(); res.json({ ok: true });
});

app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, "0.0.0.0", () => console.log(`SariLegit berjalan di port ${PORT}`));
