/**
 * =======================================================
 * MULTI-ROLE OFFLINE & REAL-TIME AI ENGINE
 * Platform Padi Desa Cirebon Girang
 * 
 * 3 MODE CHATBOT:
 * 1. 'petani'    -> Chatbot Petani (Akses dibatasi ke data pribadi, kelompoknya, panduan budidaya/hama/pupuk/panen)
 * 2. 'admin'     -> Chatbot Admin (Akses penuh ke seluruh database: users, password, NIK, audit, rekap total)
 * 3. 'desa'      -> Chatbot Desa / Perangkat Desa (Akses data umum desa, kelompok, statistik tanpa kredensial rahasia)
 * =======================================================
 */

const PakTaniBrain = {
    // Definisi Profil Bot
    botProfiles: {
        petani: {
            id: 'petani',
            name: 'Asisten Padi Desa',
            roleLabel: 'Asisten Petani',
            avatarIcon: 'fa-seedling',
            avatarEmoji: '🌾',
            badgeClass: 'badge-petani',
            headerColor: 'linear-gradient(135deg, #1e3a2f 0%, #2d6a4f 100%)',
            description: 'Konsultasi pertanian, pantau lahan & panen pribadi/kelompok tani',
            welcome: "Halo! Saya **Asisten Padi Desa**. Saya terhubung langsung ke database untuk memantau data pertanian, kelompok tani Anda, catatan panen, serta panduan budidaya padi. Ada yang bisa saya bantu?",
            suggestions: [
                { label: '🌾 Lahan Saya', query: 'Bagaimana status lahan pertanian saya?' },
                { label: '📊 Panen Saya', query: 'Tampilkan catatan hasil panen saya' },
                { label: '👥 Kelompok Tani', query: 'Siapa saja anggota kelompok tani saya?' },
                { label: '🧪 Rekomendasi Pupuk', query: 'Berapa takaran pupuk padi yang tepat?' },
                { label: '🐛 Basmi Wereng', query: 'Bagaimana cara membasmi hama wereng?' }
            ]
        },
        admin: {
            id: 'admin',
            name: 'Asisten Padi Desa',
            roleLabel: 'Administrator Sistem',
            avatarIcon: 'fa-shield-halved',
            avatarEmoji: '👑',
            badgeClass: 'badge-admin',
            headerColor: 'linear-gradient(135deg, #1e3a2f 0%, #0f241c 100%)',
            description: 'Akses penuh tanpa batas seluruh database sistem (User, Lahan, NIK, Panen, Petani)',
            welcome: "Halo Administrator! Saya **Asisten Padi Desa**. Saya memiliki akses ke database sistem Platform Padi Desa secara langsung (Real-time). Anda dapat menanyakan data user, akun, NIK petani, total rekapitulasi, maupun ringkasan seluruh tabel.",
            suggestions: [
                { label: '👥 Data Akun User', query: 'Tampilkan semua daftar user dan password terdaftar' },
                { label: '📋 Semua Petani & NIK', query: 'Tampilkan data seluruh petani lengkap dengan NIK' },
                { label: '🗺️ Seluruh Lahan', query: 'Tampilkan rekap seluruh lahan pertanian desa' },
                { label: '🌾 Total Semua Panen', query: 'Berapa total seluruh hasil panen dan rinciannya?' },
                { label: '📊 Statistik Database', query: 'Berapa jumlah baris data di semua tabel database?' }
            ]
        },
        desa: {
            id: 'desa',
            name: 'Asisten Padi Desa',
            roleLabel: 'Pamong Desa',
            avatarIcon: 'fa-landmark',
            avatarEmoji: '🏛️',
            badgeClass: 'badge-desa',
            headerColor: 'linear-gradient(135deg, #1e3a2f 0%, #22577a 100%)',
            description: 'Pemantauan rekapitulasi wilayah desa, pengumuman, dan kelompok tani (Data publik)',
            welcome: "Selamat datang! Saya **Asisten Padi Desa**, asisten data desa untuk Pemerintah Desa Cirebon Girang. Saya dapat menyajikan data agregat desa, sebaran kelompok tani, rekapitulasi panen desa, dan pengumuman pertanian.",
            suggestions: [
                { label: '📋 Kelompok Tani Desa', query: 'Daftar semua kelompok tani di Desa Cirebon Girang' },
                { label: '📈 Rekap Panen Desa', query: 'Berapa total hasil panen padi seluruh desa musim ini?' },
                { label: '📢 Pengumuman Desa', query: 'Tampilkan daftar pengumuman desa terbaru' },
                { label: '🗺️ Sebaran Wilayah Lahan', query: 'Bagaimana sebaran luas lahan sawah di wilayah desa?' }
            ]
        }
    },

    // Deteksi profil aktif berdasarkan parameter botMode atau login role
    resolveActiveMode(botMode = null, user = null) {
        if (botMode && this.botProfiles[botMode]) {
            return botMode;
        }
        if (user && user.role) {
            if (user.role === 'admin') return 'admin';
            if (user.role === 'perangkat') return 'desa';
            return 'petani';
        }
        return 'petani'; // Default untuk umum/petani
    },

    // Method Utama Penjawab
    answer(message, user = null, requestedMode = null) {
        if (!message) return "Pesan tidak boleh kosong.";
        const mode = this.resolveActiveMode(requestedMode, user);
        const lowerMsg = message.toLowerCase().trim();

        // 0. Siapa Saya / Siapa Aku (Universal untuk semua role bot)
        if (
            lowerMsg.includes('siapa saya') ||
            lowerMsg.includes('siapa aku') ||
            lowerMsg.includes('saya siapa') ||
            lowerMsg.includes('aku siapa') ||
            lowerMsg.includes('nama saya') ||
            lowerMsg.includes('nama aku') ||
            lowerMsg.includes('akun saya') ||
            lowerMsg.includes('akun aku') ||
            lowerMsg.includes('profil saya') ||
            lowerMsg.includes('profil aku') ||
            lowerMsg.includes('siapa yang login')
        ) {
            let realUser = user;
            if (window.DB && user) {
                const dbUsers = DB.getAll(DB.keys.USERS);
                const found = dbUsers.find(u => u.id == user.id || (u.username && user.username && u.username.toLowerCase() === user.username.toLowerCase()));
                if (found) realUser = { ...user, ...found };
            }

            if (realUser && realUser.name) {
                return `👋 Halo **${realUser.name}**!\n\n` +
                       `Berdasarkan sistem database, Anda saat ini sedang login di Platform Padi Desa Cirebon Girang sebagai:\n` +
                       `• **Nama**: ${realUser.name}\n` +
                       `• **Peran (Role)**: ${realUser.roleLabel || realUser.role}\n` +
                       `• **Username**: ${realUser.username}\n` +
                       `• **Mode Chatbot**: ${mode.toUpperCase()}\n\n` +
                       `Ada yang bisa saya bantu hari ini?`;
            } else {
                return `Anda saat ini terhubung sebagai **Tamu / Pengguna Umum** di Platform Padi Desa Cirebon Girang. Silakan login untuk melihat profil akun Anda.`;
            }
        }

        // 1. CHATBOT ADMIN (AKSES PENUH KE SELURUH DATABASE TANPA BATAS)
        if (mode === 'admin') {
            return this.handleAdminBot(lowerMsg, user);
        }

        // 2. CHATBOT PERANGKAT DESA (AKSES DATA DESA TERBATAS - REKAP PUBLIK)
        if (mode === 'desa') {
            return this.handleDesaBot(lowerMsg, user);
        }

        // 3. CHATBOT PETANI (AKSES DATA TERBATAS - PRIBADI & KELOMPOK SAJA)
        return this.handlePetaniBot(lowerMsg, user);
    },

    // =========================================================================
    // =========================================================================
    // HELPER FILTER USERS BERDASARKAN ROLE DINAMIS
    // =========================================================================
    getEffectiveRole(user) {
        if (!user) return 'petani';
        const r = String(user.role || '').toLowerCase().trim();
        const rl = String(user.roleLabel || user.role_label || '').toLowerCase().trim();

        if (r === 'admin') return 'admin';
        if (['perangkat', 'desa', 'perangkat_desa', 'pamong', 'aparatur'].includes(r)) return 'perangkat';
        if (['kelompok', 'kelompok_tani'].includes(r)) return 'kelompok';
        if (r === 'petani') return 'petani';

        if (rl.includes('admin')) return 'admin';
        if (rl.includes('perangkat') || rl.includes('pamong') || rl.includes('desa') || rl.includes('aparatur')) return 'perangkat';
        if (rl.includes('kelompok')) return 'kelompok';
        if (rl.includes('petani')) return 'petani';

        return 'petani';
    },

    getUsersByRole(users, targetRole) {
        if (!Array.isArray(users)) return [];
        targetRole = String(targetRole || '').toLowerCase().trim();
        if (targetRole === 'desa') targetRole = 'perangkat';

        return users.filter(u => this.getEffectiveRole(u) === targetRole);
    },

    getPerangkatUsers(users) {
        return this.getUsersByRole(users, 'perangkat');
    },

    // =========================================================================
    // 1. ENGINE CHATBOT ADMIN (SUPER ACCESS - TANPA BATAS)
    // =========================================================================
    handleAdminBot(msg, user) {
        // Tanya Perangkat Desa / Aparatur Desa / Pamong
        if (msg.includes('perangkat desa') || msg.includes('pamong') || msg.includes('aparatur desa') || (msg.includes('perangkat') && !msg.includes('hp'))) {
            const users = window.DB ? DB.getAll(DB.keys.USERS) : [];
            const perangkatList = this.getUsersByRole(users, 'perangkat');
            const totalPerangkat = perangkatList.length;

            let text = `👑 **[ADMIN ACCESS] Data Perangkat Desa Terdaftar (${totalPerangkat} Orang):**\n\n`;
            if (totalPerangkat === 0) {
                text += "Saat ini belum ada akun dengan role Perangkat Desa di sistem database.";
            } else {
                perangkatList.forEach((u, i) => {
                    text += `${i + 1}. **${u.name}**\n` +
                            `   • Username: \`${u.username}\`\n` +
                            `   • Role: **${u.roleLabel || u.role}**\n` +
                            `   • ID Akun: \`${u.id}\`\n\n`;
                });
                text += `*Berdasarkan database sistem saat ini, terdapat **${totalPerangkat} orang** Perangkat Desa aktif.*`;
            }
            return text;
        }

        // Tanya Admin
        if (msg.includes('admin') && !msg.includes('bot') && !msg.includes('asisten')) {
            const users = window.DB ? DB.getAll(DB.keys.USERS) : [];
            const admins = this.getUsersByRole(users, 'admin');
            let text = `👑 **Data Administrator Sistem (${admins.length} Orang):**\n\n`;
            admins.forEach((a, i) => {
                text += `${i + 1}. **${a.name}** (\`${a.username}\`)\n`;
            });
            text += `\n*Selaras dengan kartu Admin di Halaman Manajemen Pengguna Sistem.*`;
            return text;
        }

        // Tanya User / Akun / Pengguna Sistem
        if (msg.includes('user') || msg.includes('pengguna') || msg.includes('akun') || msg.includes('password') || msg.includes('sandi')) {
            const users = window.DB ? DB.getAll(DB.keys.USERS) : [];
            if (!users || users.length === 0) return "⚠️ Database users masih kosong.";

            const admins = this.getUsersByRole(users, 'admin');
            const desas = users.filter(u => u.role === 'perangkat' || u.role === 'desa');
            const petanis = this.getUsersByRole(users, 'petani');

            let text = `👑 **[ADMIN ACCESS] Data Pengguna Sistem (Real-time Database ` + '`users`' + `):**\n\n` +
                       `📊 **Statistik Pengguna (3 Role Utama):**\n` +
                       `• Total Pengguna: **${users.length}** akun\n` +
                       `• Admin: **${admins.length}** orang\n` +
                       `• Perangkat Desa: **${desas.length}** orang\n` +
                       `• Petani: **${petanis.length}** orang\n\n` +
                       `📋 **Daftar Akun Pengguna:**\n`;

            users.forEach((u, i) => {
                text += `${i + 1}. **${u.name}**\n` +
                        `   • Username: \`${u.username}\`\n` +
                        `   • Role: **${u.roleLabel || u.role}**\n` +
                        `   • Avatar: ${u.avatar || '👤'} | ID: \`${u.id}\`\n\n`;
            });
            text += `*Data ini selaras 100% dengan Halaman Manajemen Pengguna Sistem.*`;
            return text;
        }

        // Tanya Data Petani (Akun Pengguna Sistem 'users')
        if (msg.includes('petani') || msg.includes('warga tani')) {
            const users = window.DB ? DB.getAll(DB.keys.USERS) : [];
            const petaniUsers = this.getUsersByRole(users, 'petani');

            let text = `🌾 **Data Petani (Pengguna Sistem):**\n\n` +
                       `Berdasarkan sistem database pengguna saat ini, terdapat **${petaniUsers.length} orang** Petani:\n\n`;

            if (petaniUsers.length === 0) {
                text += "Saat ini belum ada akun dengan role Petani di sistem database.\n";
            } else {
                petaniUsers.forEach((u, i) => {
                    text += `${i + 1}. **${u.name}**\n` +
                            `   • Email/Username: \`${u.username}\`\n` +
                            `   • Role: **${u.roleLabel || u.role}**\n` +
                            `   • ID Akun: \`${u.id}\`\n\n`;
                });
            }
            text += `*Jumlah ini selaras 100% dengan Halaman Manajemen Pengguna Sistem (${petaniUsers.length} Petani).*`;
            return text;
        }

        // Tanya Seluruh Lahan
        if (msg.includes('lahan') || msg.includes('sawah')) {
            const lahanList = window.DB ? DB.getAll(DB.keys.LAHAN) : [];
            const petaniList = window.DB ? DB.getAll(DB.keys.PETANI) : [];
            if (lahanList.length === 0) return "⚠️ Database lahan masih kosong.";

            let totalHa = 0;
            let text = "👑 **[ADMIN ACCESS] Master Data Seluruh Lahan Pertanian:**\n\n";
            lahanList.forEach((l, i) => {
                const p = petaniList.find(item => String(item.id) === String(l.petani_id));
                totalHa += parseFloat(l.luas) || 0;
                text += `${i + 1}. **${l.lokasi}**\n` +
                        `   • Luas: ${l.luas} ha | Status: **${l.status}**\n` +
                        `   • Pemilik: ${p ? p.nama : '(ID: ' + l.petani_id + ')'}\n` +
                        `   • ID Lahan: \`${l.id}\`\n\n`;
            });
            text += `*Total luas keseluruhan lahan di database: ${totalHa.toFixed(2)} Ha.*`;
            return text;
        }

        // Tanya Seluruh Panen
        if (msg.includes('panen')) {
            const panenList = window.DB ? DB.getAll(DB.keys.PANEN) : [];
            const petaniList = window.DB ? DB.getAll(DB.keys.PETANI) : [];
            if (panenList.length === 0) return "⚠️ Database panen masih kosong.";

            let totalTon = 0;
            let text = "👑 **[ADMIN ACCESS] Rekapitulasi Lengkap Transaksi Panen:**\n\n";
            panenList.forEach((pn, i) => {
                const p = petaniList.find(item => String(item.id) === String(pn.petani_id));
                totalTon += parseFloat(pn.jumlah) || 0;
                text += `${i + 1}. Panen **${p ? p.nama : 'Petani ID ' + pn.petani_id}**\n` +
                        `   • Tanggal: ${pn.tanggal} | Jumlah: **${pn.jumlah} Ton**\n` +
                        `   • Kualitas: ${pn.kualitas} | ID Panen: \`${pn.id}\`\n\n`;
            });
            text += `*Total Seluruh Hasil Panen: **${totalTon.toFixed(2)} Ton** gabah.*`;
            return text;
        }

        // Statistik Master Database
        if (msg.includes('database') || msg.includes('tabel') || msg.includes('statistik') || msg.includes('rekap')) {
            if (!window.DB) return "Koneksi database tidak tersedia.";
            const users = DB.getAll(DB.keys.USERS).length;
            const petani = DB.getAll(DB.keys.PETANI).length;
            const kelompok = DB.getAll(DB.keys.KELOMPOK_TANI).length;
            const lahan = DB.getAll(DB.keys.LAHAN).length;
            const panen = DB.getAll(DB.keys.PANEN).length;
            const pengumuman = DB.getAll(DB.keys.PENGUMUMAN).length;

            return "👑 **[ADMIN ACCESS] Ringkasan Status Database Platform Padi Desa:**\n\n" +
                   `• Tabel Users: **${users}** akun\n` +
                   `• Tabel Petani: **${petani}** data\n` +
                   `• Tabel Kelompok Tani: **${kelompok}** kelompok\n` +
                   `• Tabel Lahan: **${lahan}** bidang tanah\n` +
                   `• Tabel Panen: **${panen}** transaksi\n` +
                   `• Tabel Pengumuman: **${pengumuman}** postingan\n\n` +
                   "Setiap ada penambahan data baru di web, database langsung terupdate secara real-time dan saya dapat langsung membacanya.";
        }

        // Fallback Admin
        return "👑 **Halo Administrator!** Sebagai Admin Bot, saya memiliki akses terbuka tanpa batas ke seluruh data sistem:\n" +
               "1. Tanyakan: *'Tampilkan semua user dan password'* untuk melihat akun sistem.\n" +
               "2. Tanyakan: *'Lihat semua petani dan NIK'* untuk daftar identitas lengkap.\n" +
               "3. Tanyakan: *'Rincian seluruh lahan dan panen'* untuk transaksi agrikultur lengkap.\n" +
               "Silakan ketik pertanyaan spesifik seputar data yang ingin Anda inspeksi!";
    },

    // =========================================================================
    // 2. ENGINE CHATBOT DESA (PERANGKAT DESA - REKAP PUBLIK TERBATAS)
    // =========================================================================
    handleDesaBot(msg, user) {
        // Blokir Akses Password / Kredensial
        if (msg.includes('password') || msg.includes('sandi') || msg.includes('token') || msg.includes('hash')) {
            return "🔒 **Akses Dibatasi (Pamong Desa):**\nDemi keamanan sistem, kredensial pengguna dan kata sandi hanya dapat diakses oleh Administrator.";
        }

        // Blokir NIK Perseorangan
        if (msg.includes('nik ') || msg.includes('no ktp') || msg === 'nik') {
            return "🔒 **Kebijakan Privasi Data Warga:**\nData NIK petani dilindungi kerahasiaannya. Chatbot Desa hanya menyajikan rekapitulasi data agregat jumlah petani dan sebarannya.";
        }

        // Tanya Jumlah Perangkat Desa / Aparatur Desa
        if (msg.includes('perangkat desa') || msg.includes('pamong') || msg.includes('aparatur desa') || (msg.includes('perangkat') && !msg.includes('hp'))) {
            const users = window.DB ? DB.getAll(DB.keys.USERS) : [];
            const perangkatList = this.getPerangkatUsers(users);
            const totalPerangkat = perangkatList.length;

            let text = `🏛️ **[Pamong Desa AI] Data Aparatur / Perangkat Desa Cirebon Girang:**\n\n` +
                       `Saat ini tercatat ada **${totalPerangkat} orang** Perangkat Desa di sistem database:\n\n`;
            if (totalPerangkat === 0) {
                text = "🏛️ **[Pamong Desa AI]** Saat ini belum ada data aparatur perangkat desa yang tersimpan di sistem.";
            } else {
                perangkatList.forEach((p, i) => {
                    text += `${i + 1}. **${p.name}** (${p.roleLabel || 'Perangkat Desa'})\n`;
                });
                text += `\n*Seluruh perangkat desa bertugas melayani administrasi dan kebutuhan masyarakat tani.*`;
            }
            return text;
        }

        // Rekap Kelompok Tani Desa
        if (msg.includes('kelompok') || msg.includes('kelompok tani')) {
            const kelompok = window.DB ? DB.getAll(DB.keys.KELOMPOK_TANI) : [];
            let text = "🏛️ **[Pamong Desa AI] Data Kelompok Tani Wilayah Desa:**\n\n";
            kelompok.forEach((k, i) => {
                text += `${i + 1}. **${k.nama}**\n` +
                        `   • Ketua: ${k.ketua}\n` +
                        `   • Anggota: ${k.anggota} Orang\n` +
                        `   • Domisili: ${k.desa || 'Cirebon Girang'}\n\n`;
            });
            text += `Total terdapat **${kelompok.length} kelompok tani aktif** yang membina para petani di desa kita.`;
            return text;
        }

        // Rekap Petani Desa (Tanpa NIK)
        if (msg.includes('petani') || msg.includes('jumlah petani')) {
            const petani = window.DB ? DB.getAll(DB.keys.PETANI) : [];
            const totalLuas = petani.reduce((sum, p) => sum + (parseFloat(p.luas_lahan) || 0), 0);
            return `🏛️ **[Pamong Desa AI] Rekap Petani Desa Cirebon Girang:**\n\n` +
                   `• Total Petani Terdata: **${petani.length} orang**\n` +
                   `• Total Estimasi Lahan: **${totalLuas.toFixed(2)} hektar**\n\n` +
                   `Seluruh petani terdata aktif dalam program ketahanan pangan desa. Informasi kontak personal dirahasiakan untuk umum.`;
        }

        // Rekap Panen Desa
        if (msg.includes('panen')) {
            const panen = window.DB ? DB.getAll(DB.keys.PANEN) : [];
            const totalTon = panen.reduce((sum, p) => sum + (parseFloat(p.jumlah) || 0), 0);
            return `🌾 **[Pamong Desa AI] Laporan Panen Desa Cirebon Girang:**\n\n` +
                   `• Total Produksi Gabah Tercatat: **${totalTon.toFixed(2)} Ton**\n` +
                   `• Jumlah Laporan Panen Masuk: **${panen.length} laporan**\n\n` +
                   `Data panen selalu terbarui secara otomatis saat petani atau admin memasukkan data baru ke sistem.`;
        }

        // Pengumuman Desa
        if (msg.includes('pengumuman') || msg.includes('agenda')) {
            const pengumuman = window.DB ? DB.getAll(DB.keys.PENGUMUMAN) : [];
            if (pengumuman.length === 0) return "Belum ada pengumuman desa baru.";
            let text = "📢 **[Pamong Desa AI] Informasi & Pengumuman Desa Terkini:**\n\n";
            pengumuman.forEach((p, i) => {
                text += `${i + 1}. **[${p.jenis}] ${p.judul}**\n${p.konten}\n\n`;
            });
            return text;
        }

        return "🏛️ **Halo dari Pamong Desa AI!** Saya membantu menyajikan informasi umum agrikultur Desa Cirebon Girang:\n" +
               "• 📋 Data kelompok tani desa\n" +
               "• 📈 Rekapitulasi total panen padi desa\n" +
               "• 🗺️ Data sebaran luas sawah desa\n" +
               "• 📢 Pengumuman pertanian desa\nAda informasi desa yang ingin Anda cek?";
    },

    // =========================================================================
    // 3. ENGINE CHATBOT PETANI (DATA PRIBADI & PANDUAN TANI SAJA)
    // =========================================================================
    handlePetaniBot(msg, user) {
        // Blokir Akses Data Pengguna Lain / Password
        if (msg.includes('password') || msg.includes('sandi') || msg.includes('user') || msg.includes('akun orang')) {
            return "⛔ **Akses Terbatas:**\nChatbot Petani tidak memiliki izin untuk mengakses data keamanan, password, maupun akun pengguna lain.";
        }

        // Blokir NIK orang lain
        if (msg.includes('nik orang') || msg.includes('semua nik')) {
            return "🔒 **Akses Terbatas:**\nAnda hanya dapat mengakses informasi data pertanian pribadi Anda dan kelompok tani yang menaungi Anda.";
        }

        // Data Pribadi Petani yang Sedang Login
        if (msg.includes('lahan saya') || msg.includes('panen saya') || msg.includes('data saya') || msg.includes('siapa saya') || msg.includes('profil')) {
            if (!user) {
                return "Anda belum login. Silakan login ke akun petani Anda terlebih dahulu untuk melihat catatan lahan dan panen pribadi.";
            }

            const petaniList = window.DB ? DB.getAll(DB.keys.PETANI) : [];
            const userPetani = petaniList.find(p => String(p.user_id) === String(user.id)) ||
                               petaniList.find(p => p.nama.toLowerCase().includes(user.name.toLowerCase()));

            if (userPetani) {
                const kelompok = userPetani.kelompok_tani_id ? DB.getKelompokById(userPetani.kelompok_tani_id) : null;
                const panenList = DB.getPanenByPetani ? DB.getPanenByPetani(userPetani.id) : [];
                const totalPanenPribadi = panenList.reduce((s, p) => s + (parseFloat(p.jumlah) || 0), 0);

                return `🌾 **Data Pertanian Pribadi Anda:**\n\n` +
                       `• **Nama Petani**: ${userPetani.nama}\n` +
                       `• **Kelompok Tani**: ${kelompok ? kelompok.nama : 'Belum Terdaftar'}\n` +
                       `• **Luas Lahan Garapan**: ${userPetani.luas_lahan || 0} Hektar\n` +
                       `• **Varietas Utama**: ${userPetani.varietas_padi || 'Ciherang'}\n` +
                       `• **Total Panen Anda Tercatat**: ${totalPanenPribadi.toFixed(2)} Ton\n\n` +
                       `Data ini sinkron langsung dengan perubahan yang Anda buat di menu Data Petani/Lahan.`;
            } else {
                return `👋 Halo **${user.name}**! Anda terhubung sebagai Petani. Data spesifik lahan Anda belum ditautkan ke akun login ini di database. Anda tetap dapat menanyakan tips pupuk, hama wereng, dan jadwal tanam.`;
            }
        }

        // Tanya Perangkat Desa
        if (msg.includes('perangkat desa') || msg.includes('pamong') || msg.includes('aparatur desa') || (msg.includes('perangkat') && !msg.includes('hp'))) {
            const users = window.DB ? DB.getAll(DB.keys.USERS) : [];
            const perangkatList = this.getPerangkatUsers(users);
            const totalPerangkat = perangkatList.length;

            return `🌾 **Informasi Perangkat Desa Cirebon Girang:**\n\n` +
                   `Saat ini terdapat **${totalPerangkat} orang** Perangkat Desa yang bertugas di kantor desa untuk melayani administrasi warga tani. Jika ada kendala kelompok atau bantuan tani, Anda dapat berkoordinasi langsung dengan pihak perangkat desa.`;
        }

        // Kelompok Tani (Hanya info kelompoknya atau kelompok umum)
        if (msg.includes('kelompok')) {
            const kelompokList = window.DB ? DB.getAll(DB.keys.KELOMPOK_TANI) : [];
            let text = "👥 **Kelompok Tani Desa Cirebon Girang:**\n\n";
            kelompokList.forEach((k, i) => {
                text += `${i + 1}. **${k.nama}** (Ketua: ${k.ketua}, ${k.anggota} Anggota)\n`;
            });
            text += "\nHubungi ketua kelompok tani Anda untuk koordinasi alokasi pupuk bersubsidi dan jadwal olah tanah.";
            return text;
        }

        // Pupuk Padi
        if (msg.includes('pupuk') || msg.includes('pemupukan')) {
            return "🧪 **Panduan Dosis Pupuk Padi Sawah (Pak Tani AI):**\n\n" +
                   "• **Dosis Standar per Hektar**: Urea (200-250 kg), SP-36 (100 kg), KCl (100 kg) [Perbandingan 2:1:1]\n" +
                   "• **Waktu Aplikasi**:\n" +
                   "  1. *Dasar (0-7 HST)*: 1/3 Urea + Seluruh SP-36 + 1/2 KCl\n" +
                   "  2. *Susulan 1 (21-25 HST)*: 1/3 Urea\n" +
                   "  3. *Susulan 2 (35-40 HST)*: 1/3 sisa Urea + 1/2 sisa KCl\n" +
                   "Pastikan sawah dalam kondisi macak-macak saat menyebar pupuk agar tidak larut terbawa air.";
        }

        // Hama Wereng & Penyakit
        if (msg.includes('wereng') || msg.includes('hama') || msg.includes('penyakit')) {
            return "🐛 **Solusi Hama & Penyakit Padi:**\n\n" +
                   "1. **Wereng Coklat**: Turunkan debit air sawah (keringkan bergilir), hindari pemakaian urea berlebihan, gunakan musuh alami (laba-laba).\n" +
                   "2. **Penggerek Batang (Sundep/Beluk)**: Pasang perangkap lampu malam hari, gunakan insektisida sistemik bila malai mulai bunting.\n" +
                   "3. **Tikus Sawah**: Gropyokan serentak sebelum tanam dan pasang pagar plastik TBS di persemaian.";
        }

        // Panen Ciherang / Umur
        if (msg.includes('panen') || msg.includes('kapan panen')) {
            return "⏱️ **Waktu & Ciri Padi Siap Panen:**\n\n" +
                   "• Varietas Ciherang siap dipanen pada umur **116 - 125 hari setelah semai**.\n" +
                   "• Ciri fisik: 90% bulir gabah sudah menguning dan malai merunduk ke bawah.\n" +
                   "• Lakukan panen saat cuaca cerah di pagi hari setelah embun kering.";
        }

        return "🌾 **Halo Petani Sahabat Padi Desa!** Saya Pak Tani AI khusus membantu kebutuhan bertani Anda:\n" +
               "• Ketik *'Lahan saya'* atau *'Panen saya'* untuk melihat data pribadi Anda\n" +
               "• Tanyakan takaran pupuk, waktu tanam, atau cara membasmi hama wereng\n" +
               "Ada yang sedang menjadi kendala di sawah Anda hari ini?";
    }
};

window.PakTaniBrain = PakTaniBrain;
