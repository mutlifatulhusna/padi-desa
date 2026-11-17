# 🌾 Platform Digital Pertanian Padi Desa Cirebon Girang

[![PHP Version](https://img.shields.io/badge/PHP-8.2%2B-777BB4?logo=php&logoColor=white)](https://www.php.net/)
[![MySQL Version](https://img.shields.io/badge/MySQL-8.0%2B-4479A1?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Groq AI](https://img.shields.io/badge/Groq%20AI-Qwen%203.8--27b-F55036?logo=fastapi&logoColor=white)](https://groq.com/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-Pro%20%2F%20Flash-4285F4?logo=google&logoColor=white)](https://aistudio.google.com/)
[![WhatsApp Gateway](https://img.shields.io/badge/Fonnte-WhatsApp%20API-25D366?logo=whatsapp&logoColor=white)](https://fonnte.com/)

Platform manajemen dan tata kelola agrikultur terpadu untuk Desa Cirebon Girang. Sistem ini menghubungkan pemerintah desa, pengurus kelompok tani, warga petani, serta konsumen dalam satu ekosistem informasi yang transparan, presisi, dan didukung kecerdasan buatan (*AI Chatbot*).

---

## 🌟 Fitur Utama Sistem

### 1. 📊 Dashboard Multi-Peran Dinamis
- **4 Kartu Statistik Utama (Real-time Snapshot MySQL):**
  - **Total Petani:** 8 orang warga petani terdaftar aktif.
  - **Total Lahan:** 11 bidang/petak sawah (Total luas garapan: 1.065,55 Ha, seluruhnya berstatus Aktif).
  - **Data Panen:** 2 data catatan panen (Total akumulasi produksi: 12,55 Ton gabah).
  - **Pengumuman:** 2 pengumuman desa aktif.
- **Tampilan Khusus Berdasarkan Role:**
  - 👑 **Administrator:** Panel kontrol eksekutif, manajemen akun pengguna (RBAC), konfigurasi multi-key AI, dan audit sistem.
  - 🏛️ **Perangkat Desa:** Monitoring statistik pertanian wilayah desa, rekap panen, dan publikasi/broadcast pengumuman.
  - 🧑‍🌾 **Warga Petani:** Kartu profil terverifikasi, form kilat tambah/edit lahan sawah pribadi, pencatatan hasil panen, dan pelacakan pesanan beras.

### 2. 🗺️ Manajemen Data Lahan Pertanian
- Pencatatan seluruh 11 bidang lahan sawah desa (Blok A, Blok B, Blok C, Jl. Perjuangan, Cempaka Kidul, sawah baru, wanantara, warisan).
- Pengelompokan data berdasarkan petani pemilik, luasan hektar (Ha), dan status lahan (*Aktif, Tanam, Istirahat, Panen*).
- Modal interaktif tambah/edit lahan tanpa reload halaman.

### 3. 🌾 Pencatatan Hasil Panen Padi
- Rekam jejak tonase gabah kering panen (GKP) berkala per petani dan varietas (*Ciherang, Mekongga, Inpari 32, IR 64*).
- Kalkulator rasio produktivitas otomatis (Ton/Ha).

### 4. 📢 Pengumuman & Broadcast WhatsApp
- Papan informasi desa berkategori (*Penyuluhan, Informasi, Peringatan*).
- Integrasi gateway WhatsApp (Fonnte API) untuk broadcast pengumuman harga gabah dan agenda penyuluhan langsung ke nomor HP warga petani.

### 5. 📦 Pelacak Status Pesanan Beras
- Tracking perjalanan pesanan beras premium kemasan desa dari sawah ke pembeli dengan progres visual 3 tahap:
  1. `Dikonfirmasi` (Pesanan diterima)
  2. `Dalam Pengiriman` (Dibawa kurir lokal desa)
  3. `Telah Tiba` (Sampai di alamat pembeli)
- Terintegrasi tombol bantuan WhatsApp Admin.

### 6. 🤖 AI Asisten Padi Desa (Chatbot Cerdas)
- Widget floating cerdas di pojok kanan bawah seluruh halaman.
- Mengenali identitas dan role pengguna yang sedang login (*"Halo Mutlifatul husna!"*).
- **Protokol Respon Bertahap:**
  - **Respon Singkat (Default):** Memberikan jawaban 1-3 kalimat to-the-point sesuai angka 4 kartu Beranda, diakhiri penawaran rincian.
  - **Respon Rinci (On-Demand):** Menampilkan seluruh data lengkap dari database tanpa terpotong (seluruh 11 lahan, 8 petani, 2 panen, dll) saat pengguna mengetik kata *"rincian"*, *"detail"*, atau *"daftar"*.
- **Arsitektur Tiga Lapis:** Groq Qwen 3.8-27b (Super cepat ~500ms) $\rightarrow$ Google Gemini Flash $\rightarrow$ MySQL Direct Engine (Fallback offline).

---

## 🛠️ Tech Stack

- **Frontend:** Vanilla JavaScript (ES6+ Modular), Modern HTML5 & CSS3 Glassmorphism, FontAwesome 6.5.
- **Backend:** PHP 8.x Native RESTful Micro-APIs (`api/auth.php`, `api/chat.php`, `api/users.php`, `api/lahan.php`, dll).
- **Database:** MySQL 8.x (`db_petani`).
- **AI LLM Services:** Groq Cloud API (`qwen/qwen3.8-27b`) & Google Gemini API.
- **Messaging Gateway:** Fonnte WhatsApp API Gateway.
- **Environment:** Laragon / Apache Web Server.

---

## 🚀 Panduan Instalasi Lokal

### 1. Clone Repositori
```bash
git clone https://github.com/mutlifatulhusna/padi-desa.git
cd padi-desa
```

### 2. Konfigurasi Web Server & Database
1. Salin folder project ke direktori web server lokal (misalnya `C:/laragon/www/padi-desa`).
2. Nyalakan service **Apache** dan **MySQL** di Laragon / XAMPP.
3. Buka **phpMyAdmin** atau HeidiSQL, buat database baru bernama:
   ```sql
   CREATE DATABASE db_petani CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
4. Import file skema basis data yang tersedia di:
   ```
   Padi Desa/database/db_petani.sql
   ```

### 3. Konfigurasi API Key AI & WhatsApp
Salin template konfigurasi:
```bash
cp "Padi Desa/chatbot/.env.example" "Padi Desa/chatbot/.env"
```
Buka file `Padi Desa/chatbot/.env` dan sesuaikan kredensial Anda:
```env
GROQ_API_KEY=gsk_your_groq_api_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Buka Aplikasi di Browser
Akses URL lokal:
```
http://localhost/padi-desa/
```
Sistem akan otomatis mengarahkan ke halaman login dan dashboard utama.

---

## 👥 Akun Demo Bawaan

| Role | Username / Email | Password | Nama Pengguna |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin@desa.id` | `admin123` | Mutlifatul husna |
| **Perangkat Desa** | `perangkat@desa.id` | `perangkat123` | Kuwu Cirebon Girang |
| **Warga Petani** | `petani@desa.id` | `petani123` | Petani |
| **Petani (Hamzah)**| `hamzah@gmail.com` | `petani123` | Muhammad Hamzah |

---

## 📄 Lisensi
Hak Cipta © 2026 **Pemerintah Desa Cirebon Girang & Tim Pengembang Padi Desa**.  
Dikembangkan untuk kemajuan sektor agrikultur dan ketahanan pangan desa.
