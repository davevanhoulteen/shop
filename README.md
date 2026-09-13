# SweetCrumb — Toko Kue Online

Website toko kue online dengan:
- Landing page responsif
- Katalog produk dan filter kategori
- Keranjang belanja dengan localStorage
- Checkout tanpa login
- Form nama, WhatsApp, alamat, dan metode pembayaran
- Riwayat nomor pesanan tersimpan di perangkat
- Dashboard admin
- Statistik revenue, order, produk, pelanggan
- Kelola status pesanan
- Tambah/hapus produk
- Session authentication sederhana

## Menjalankan

Pastikan Node.js 18+ sudah terpasang.

```bash
npm install
npm start
```

Buka:
- Toko: http://localhost:3000
- Dashboard admin: http://localhost:3000/admin.html

## Akun demo

Admin:
- Email: `admin@sweetcrumb.test`
- Password: `admin123`

User:
- Email: `user@sweetcrumb.test`
- Password: `user123`

## Catatan

Ini adalah starter/demo tanpa database eksternal. Data produk, user, dan order disimpan di memory server sehingga akan kembali ke data awal ketika server direstart. Untuk produksi, gunakan database (mis. PostgreSQL/MySQL), password hashing, CSRF protection, validasi yang lebih ketat, payment gateway, dan penyimpanan gambar produk.


### Mobile
Tampilan customer dibuat mobile-first dan nyaman untuk layar HP. Admin dashboard tetap responsif untuk tablet/desktop.

## Login Admin
Buka `http://localhost:3000/admin-login.html` untuk login admin. Halaman login admin dibuat terpisah dari tampilan customer.

## Fitur Admin Produk
Admin dapat **upload foto produk**, menambah produk dengan stok awal, dan melakukan **restok** dengan tombol `+ Restok`. Foto disimpan sebagai data lokal demo sehingga tidak memerlukan modul upload tambahan.
