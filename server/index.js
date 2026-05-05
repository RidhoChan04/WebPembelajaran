const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const multer = require('multer');
const path = require('path');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;
const saltRounds = 10;

// ==========================================
// 1. MIDDLEWARE & INITIALIZATION
// ==========================================

// Buat folder uploads otomatis jika belum ada agar server tidak error saat deploy
const uploadPath = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadPath)) {
    fs.mkdirSync(uploadPath);
}

// Konfigurasi CORS: Izinkan akses dari Frontend (Local & Produksi nanti)
app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173", 
    methods: "GET,POST,PUT,DELETE",
    credentials: true
}));
app.options('.*', cors()); // Izinkan semua request OPTIONS

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Menyajikan file statis dari folder uploads
app.use('/uploads', express.static(uploadPath));

// ==========================================
// 2. DATABASE & STORAGE CONFIG
// ==========================================

const pool = new Pool({
    connectionString: process.env.DATABASE_URL, // Disarankan pakai connection string untuk Supabase/Render
    ssl: { rejectUnauthorized: false }
});

console.log("Menghubungkan ke Host:", new URL(process.env.DATABASE_URL).hostname);

pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Gagal terhubung ke database:', err.stack);
  }
  console.log('✅ Berhasil terhubung ke database Supabase');
  release(); 
})

const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, 'uploads/'); },
    filename: (req, file, cb) => { 
        // Menggunakan slugify sederhana untuk nama file asli agar tidak ada spasi aneh
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname)); 
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 2 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const filetypes = /mp4|mov|webm|quicktime/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Hanya file video (.mp4, .mov, .webm) yang diizinkan!"));
    }
});

// ==========================================
// 3. AUTHENTICATION
// ==========================================

app.post('/api/register', async (req, res) => {
    const { nama, email, password, role } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, saltRounds);
        const newUser = await pool.query(
            'INSERT INTO users (nama, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, nama, email, role',
            [nama, email, hashedPassword, role || 'mahasiswa']
        );
        res.status(201).json({ message: "Registrasi berhasil", user: newUser.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ error: "Email sudah terdaftar atau terjadi kesalahan" });
    }
});

app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0];

        if (user && await bcrypt.compare(password, user.password)) {
            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '1d' }
            );
            const { password: _, ...userNoPass } = user;
            res.json({ message: "Login Berhasil", token, user: userNoPass });
        } else {
            res.status(401).json({ error: "Email atau password salah!" });
        }
    } catch (err) {
        res.status(500).json({ error: "Server Error" });
    }
});

// ==========================================
// 4. MATERI & EVALUASI (Dinamis URL)
// ==========================================

app.get('/api/materi', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM materi ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Gagal memuat materi' });
    }
});

app.post('/api/evaluasi', (req, res) => {
    upload.single('video_praktik')(req, res, async (err) => {
        if (err) return res.status(400).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: "Pilih video terlebih dahulu" });

        try {
            const { mahasiswa_id, materi_id } = req.body;
            const fileName = req.file.filename;

            const newEvaluasi = await pool.query(
                `INSERT INTO evaluasi (mahasiswa_id, materi_id, video_url, status) 
                 VALUES ($1, $2, $3, 'pending') RETURNING *`,
                [mahasiswa_id, materi_id, fileName]
            );

            res.json({ message: "Berhasil diunggah!", data: newEvaluasi.rows[0] });
        } catch (dbErr) {
            console.error(dbErr.message);
            res.status(500).json({ error: 'Gagal simpan ke database' });
        }
    });
});

app.get('/api/dosen/evaluasi', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, u.nama as nama_mahasiswa, m.tahap as nama_materi 
            FROM evaluasi e
            JOIN users u ON e.mahasiswa_id = u.id
            JOIN materi m ON e.materi_id = m.id
            WHERE e.status = 'pending' 
            ORDER BY e.created_at ASC
        `);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Gagal memuat antrean' });
    }
});

app.put('/api/evaluasi/:id', async (req, res) => {
    const { id } = req.params;
    const { nilai_tugas, nilai_partisipasi, feedback } = req.body;
    try {
        await pool.query(
            `UPDATE evaluasi SET nilai_tugas = $1, nilai_partisipasi = $2, feedback = $3, status = 'dinilai' 
             WHERE id = $4`,
            [nilai_tugas, nilai_partisipasi, feedback, id]
        );
        res.json({ message: "Penilaian disimpan" });
    } catch (err) {
        res.status(500).json({ error: 'Gagal simpan penilaian' });
    }
});

// ==========================================
// 5. ADMIN & RIWAYAT
// ==========================================

app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, nama, email, role FROM users ORDER BY role, nama ASC');
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Gagal muat user' });
    }
});

app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
        res.json({ message: 'Terhapus' });
    } catch (err) {
        res.status(500).json({ error: 'Gagal hapus' });
    }
});

app.get('/api/mahasiswa/hasil/:id', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT e.*, m.tahap as nama_materi 
            FROM evaluasi e
            JOIN materi m ON e.materi_id = m.id
            WHERE e.mahasiswa_id = $1 AND e.status = 'dinilai'
            ORDER BY e.created_at DESC
        `, [req.params.id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: 'Gagal muat riwayat' });
    }
});

app.get('/api/health', async (req, res) => {
  try {
    // Menjalankan query sederhana untuk mengetes respon DB
    const result = await pool.query('SELECT NOW()');
    res.json({
      status: 'online',
      database: 'connected',
      time: result.rows[0].now
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      database: 'disconnected',
      message: err.message
    });
  }
});

// ==========================================
// 6. SERVER START
// ==========================================
app.listen(PORT, () => {
    console.log(`🚀 Server berjalan di port ${PORT}`);
    console.log(`🔗 Base URL: ${process.env.DATABASE_URL || `http://localhost:${PORT}`}`);
});