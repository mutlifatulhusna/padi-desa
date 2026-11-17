-- ========================================
-- DATABASE: db_petani
-- Platform Padi Desa Cirebon Girang
-- MySQL 8.4.3
-- ========================================

CREATE DATABASE IF NOT EXISTS `db_petani` 
CHARACTER SET utf8mb4 
COLLATE utf8mb4_unicode_ci;

USE `db_petani`;

-- ========================================
-- TABLE: users
-- ========================================
CREATE TABLE IF NOT EXISTS `users` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `username` VARCHAR(100) NOT NULL UNIQUE,
    `password` VARCHAR(255) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `role` ENUM('admin', 'perangkat', 'desa', 'petani') NOT NULL,
    `role_label` VARCHAR(50) NOT NULL,
    `avatar` VARCHAR(50) DEFAULT '👤',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: kelompok_tani
-- ========================================
CREATE TABLE IF NOT EXISTS `kelompok_tani` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `ketua` VARCHAR(100) NOT NULL,
    `anggota` INT DEFAULT 0,
    `desa` VARCHAR(100) DEFAULT 'Cirebon Girang',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: petani
-- ========================================
CREATE TABLE IF NOT EXISTS `petani` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `nama` VARCHAR(100) NOT NULL,
    `nik` VARCHAR(20) NOT NULL UNIQUE,
    `alamat` TEXT,
    `no_telepon` VARCHAR(15),
    `kelompok_tani_id` INT NULL,
    `luas_lahan` DECIMAL(10,2) DEFAULT 0.00,
    `varietas_padi` VARCHAR(50),
    `user_id` INT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`kelompok_tani_id`) REFERENCES `kelompok_tani`(`id`) ON DELETE SET NULL,
    FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: lahan
-- ========================================
CREATE TABLE IF NOT EXISTS `lahan` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `petani_id` INT NOT NULL,
    `luas` DECIMAL(10,2) NOT NULL,
    `lokasi` VARCHAR(200),
    `status` ENUM('Aktif', 'Tidak Aktif', 'Panen') DEFAULT 'Aktif',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`petani_id`) REFERENCES `petani`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: panen
-- ========================================
CREATE TABLE IF NOT EXISTS `panen` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `petani_id` INT NOT NULL,
    `tanggal_panen` DATE NOT NULL,
    `jumlah_ton` DECIMAL(10,2) NOT NULL,
    `luas_panen` DECIMAL(10,2) NOT NULL,
    `varietas` VARCHAR(50),
    `keterangan` TEXT,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`petani_id`) REFERENCES `petani`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- TABLE: pengumuman
-- ========================================
CREATE TABLE IF NOT EXISTS `pengumuman` (
    `id` INT NOT NULL AUTO_INCREMENT,
    `judul` VARCHAR(200) NOT NULL,
    `konten` TEXT NOT NULL,
    `jenis` ENUM('Penyuluhan', 'Informasi', 'Peringatan', 'Lainnya') DEFAULT 'Informasi',
    `created_by` INT NOT NULL,
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- INSERT DATA DUMMY
-- ========================================

-- Insert Users
INSERT INTO `users` (`username`, `password`, `name`, `role`, `role_label`, `avatar`) VALUES
('admin@desa.id', MD5('admin123'), 'Admin Desa', 'admin', 'Admin', '👨‍💼'),
('perangkat@desa.id', MD5('perangkat123'), 'Perangkat Desa', 'perangkat', 'Perangkat Desa', '👨‍💻'),
('petani@desa.id', MD5('petani123'), 'Petani', 'petani', 'Petani', '🧑‍🌾');

-- Insert Kelompok Tani
INSERT INTO `kelompok_tani` (`nama`, `ketua`, `anggota`, `desa`) VALUES
('Kelompok Tani Makmur', 'Bapak Slamet', 15, 'Cirebon Girang'),
('Kelompok Tani Sejahtera', 'Bapak Joko', 20, 'Cirebon Girang'),
('Kelompok Tani Berkah', 'Bapak Ahmad', 12, 'Cirebon Girang');

-- Insert Petani
INSERT INTO `petani` (`nama`, `nik`, `alamat`, `no_telepon`, `kelompok_tani_id`, `luas_lahan`, `varietas_padi`, `user_id`) VALUES
('Bapak Samsul', '3209123456789001', 'RT 01 RW 02, Cirebon Girang', '081234567890', 1, 2.50, 'Ciherang', 4),
('Bapak Rohmat', '3209123456789002', 'RT 02 RW 03, Cirebon Girang', '081234567891', 2, 3.00, 'Mekongga', NULL),
('Ibu Siti', '3209123456789003', 'RT 03 RW 01, Cirebon Girang', '081234567892', 3, 1.80, 'Inpari', NULL),
('Bapak Hendra', '3209123456789004', 'RT 04 RW 02, Cirebon Girang', '081234567893', 1, 4.20, 'Ciherang', NULL);

-- Insert Lahan
INSERT INTO `lahan` (`petani_id`, `luas`, `lokasi`, `status`) VALUES
(1, 2.50, 'Blok A, Sawah Utara', 'Aktif'),
(2, 3.00, 'Blok B, Sawah Timur', 'Aktif'),
(3, 1.80, 'Blok C, Sawah Selatan', 'Aktif'),
(4, 4.20, 'Blok D, Sawah Barat', 'Panen');

-- Insert Panen
INSERT INTO `panen` (`petani_id`, `tanggal_panen`, `jumlah_ton`, `luas_panen`, `varietas`, `keterangan`) VALUES
(1, '2026-02-15', 5.75, 2.50, 'Ciherang', 'Panen baik, hasil memuaskan'),
(2, '2026-02-20', 6.80, 3.00, 'Mekongga', 'Hama sedikit terkendali');

-- Insert Pengumuman
INSERT INTO `pengumuman` (`judul`, `konten`, `jenis`, `created_by`) VALUES
('Penyuluhan Pertanian', 'Akan diadakan penyuluhan pertanian tentang pengendalian hama padi pada tanggal 15 Maret 2026.', 'Penyuluhan', 1),
('Informasi Harga Padi', 'Harga padi saat ini Rp 6.500/kg untuk varietas Ciherang.', 'Informasi', 1);

-- ========================================
-- SHOW TABLES
-- ========================================
SELECT 'Database db_petani berhasil dibuat!' AS Status;
SELECT COUNT(*) AS total_users FROM users;
SELECT COUNT(*) AS total_petani FROM petani;
SELECT COUNT(*) AS total_kelompok FROM kelompok_tani;