import { useState } from 'react';
import axios from 'axios';
import './App.css';

import {
  Home,
  BookOpen,
  PlayCircle,
  ClipboardCheck,
  Users,
  LogOut
} from 'lucide-react';

// 1. Set Interceptor di luar agar tidak terduplikasi setiap render
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

function App() {
  // --- STATE ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('user');
    try {
      return savedUser ? JSON.parse(savedUser) : null;
    } catch (e) {
      console.error("Gagal parsing user dari localStorage:", e);
      return null;
    }
  });

  const [authData, setAuthData] = useState({ email: '', password: '' });
  const [activeTab, setActiveTab] = useState('home');
  const [materiList, setMateriList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [videoLink, setVideoLink] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [allUsers, setAllUsers] = useState([]);
  const [isRegister, setIsRegister] = useState(false);
  const [regData, setRegData] = useState({ nama: '', email: '', password: '', role: 'mahasiswa' });
  const [evaluasiList, setEvaluasiList] = useState([]);
  const [hasilNilai, setHasilNilai] = useState([]);
  const [penilaianData, setPenilaianData] = useState({ nilai_tugas: '', nilai_partisipasi: '', feedback: '' });
  const [selectedMateri, setSelectedMateri] = useState(4);
  const [selectedEvaluasi, setSelectedEvaluasi] = useState(null);
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';

  // --- API FUNCTIONS (DATA FETCHERS) ---

  const fetchMateri = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/api/materi`);
      setMateriList(response.data);
    } catch (error) {
      console.error('Gagal materi:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/admin/users`);
      setAllUsers(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvaluasi = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/dosen/evaluasi`);
      setEvaluasiList(res.data);
    } catch (error) {
      console.error("Gagal antrean:", error);
    }
  };

  const fetchHasilNilai = async () => {
    if (!user?.id) return;
    try {
      const res = await axios.get(`${API_URL}/api/mahasiswa/hasil/${user.id}`);
      setHasilNilai(res.data);
    } catch (err) {
      console.error("Gagal hasil nilai:", err);
    }
  };

  // --- EVENT HANDLERS (NAVIGASI & AKSI) ---

  const handleTabChange = (tabName) => {
    if (activeTab === tabName) return; // JANGAN fetch jika tab yang diklik adalah tab yang sedang aktif

    setActiveTab(tabName);

    // Gunakan switch case agar lebih rapi dan eksklusif
    switch (tabName) {
      case 'materi':
        fetchMateri();
        break;
      case 'admin_users':
        fetchAllUsers();
        break;
      case 'penilaian':
        fetchEvaluasi();
        break;
      case 'evaluasi':
        fetchHasilNilai();
        break;
      default:
        break;
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/api/login`, authData);
      const { token, user: userData } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
      setActiveTab('home');
    } catch (error) {
      console.error("Login Gagal:", error);
      alert("Login Gagal!");
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    setUser(null);
    setActiveTab('home');
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!videoLink) return alert('Masukkan link Google Drive dahulu!');

    try {
      setUploadStatus('Mengirim tugas...');
      await axios.post(`${API_URL}/api/evaluasi`, {
        mahasiswa_id: user.id,
        materi_id: selectedMateri,
        video_url: videoLink // Kolom di database akan diisi dengan teks link
      });
      setUploadStatus('Tugas berhasil dikirim!');
      setVideoLink(''); // Kosongkan input
      fetchHasilNilai();
    } catch (error) {
      console.error("Detail Error:", error);
      setUploadStatus('Gagal mengirim tugas.');
    }
  };

  const handleSavePenilaian = async (id) => {
    try {
      await axios.put(`${API_URL}/api/evaluasi/${id}`, penilaianData);
      alert("Penilaian berhasil!");
      setPenilaianData({ nilai_tugas: '', nilai_partisipasi: '', feedback: '' });
      fetchEvaluasi();
    } catch (error) {
      console.error("Gagal simpan penilaian:", error);
      alert("Gagal menyimpan.");
    }
  };

  // --- RENDER LOGIC ---
  const renderContent = () => {
    if (!user) {
      return (
        <div className="login-wrapper">
          <div className="login-left">
            <div className="login-left-content">
              <h1 className="brand-title">GymnasticApp</h1>
              <p className="brand-subtitle">Platform Pembelajaran Senam Lantai</p>
            </div>
          </div>
          <div className="login-right">
            <div className="login-card-modern">
              <div className="login-header">
                <h2>{isRegister ? 'Buat Akun Baru' : 'Masuk ke Akun'}</h2>
                <p>{isRegister ? 'Lengkapi data Anda di bawah ini' : 'Masukkan email dan password Anda untuk masuk'}</p>
              </div>
              {isRegister ? (
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  try {
                    await axios.post(`${API_URL}/api/register`, regData);
                    alert("Berhasil! Silakan login.");
                    setIsRegister(false);
                  } catch (error) {
                    console.error("Gagal daftar:", error);
                    alert("Gagal daftar");
                  }
                }} className="login-form">
                  <label>Nama Lengkap</label>
                  <input type="text" placeholder="Masukkan nama Anda" onChange={(e) => setRegData({ ...regData, nama: e.target.value })} required />
                  <label>Email</label>
                  <input type="email" placeholder="Masukkan email Anda" onChange={(e) => setRegData({ ...regData, email: e.target.value })} required />
                  <label>Password</label>
                  <input type="password" placeholder="Buat password Anda" onChange={(e) => setRegData({ ...regData, password: e.target.value })} required />
                  <button type="submit" className="btn-primary">Daftar Sekarang</button>
                  <p className="toggle-auth">Sudah punya akun? <span onClick={() => setIsRegister(false)}>Login di sini</span></p>
                </form>
              ) : (
                <form onSubmit={handleLogin} className="login-form">
                  <label>Email</label>
                  <input type="email" placeholder="Masukkan email Anda" onChange={(e) => setAuthData({ ...authData, email: e.target.value })} required />
                  <label>Password</label>
                  <input type="password" placeholder="Masukkan password Anda" onChange={(e) => setAuthData({ ...authData, password: e.target.value })} required />
                  <button type="submit" className="btn-primary">Login</button>
                  <p className="toggle-auth">Belum punya akun? <span onClick={() => setIsRegister(true)}>Daftar di sini</span></p>
                </form>
              )}
            </div>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'materi':
        return (
          <div className="content-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="content-title" style={{ margin: 0 }}>Materi Senam Lantai</h2>

              {/* Tombol Buka PDF */}
              <a
                href="/pdf/modul-guling-belakang.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-pdf"
                style={{
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  background: '#ef4444', // Merah identik dengan PDF
                  color: 'white',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  fontWeight: '600',
                  fontSize: '14px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                }}
              >
                <span>📄</span> Buka PDF Lengkap
              </a>
            </div>

            {loading ? (
              <p>Memuat materi...</p>
            ) : (
              materiList.map((m) => (
                <div key={m.id} className="card">
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <h3 className="materi-step">{m.tahap}</h3>
                    {/* Tombol Pilih Materi tetap di sini */}
                    <button
                      className={`btn-select ${selectedMateri === m.id ? 'active' : ''}`}
                      onClick={() => setSelectedMateri(m.id)}
                    >
                      {selectedMateri === m.id ? 'Terpilih' : 'Pilih Materi'}
                    </button>
                  </div>
                  <p className="materi-desc">{m.deskripsi}</p>
                  {m.gambar_url && (
                    <div className="image-wrapper">
                      <img src={m.gambar_url} alt={m.tahap} />
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        );
      case 'video': {
        const tutorials = [
          { id: 1, t: 'Guling Belakang Jongkok', f: 'Guling belakang jongkok.mp4' },
          { id: 2, t: 'Guling Belakang Sudut', f: 'Guling belakang sudut.mp4' },
          { id: 3, t: 'Guling Belakang Kangkang', f: 'Guling belakang kangkang.mp4' },
          { id: 4, t: 'Guling Belakang tampak depan', f: 'Guling belakang kangkang tampak depan.mp4' }
        ];
        return (
          <div>
            <h2 className="content-title">Video Tutorial</h2>
            <div className="video-grid">
              {tutorials.map((v) => (
                <div key={v.id} className="card">
                  <h3>{v.t}</h3>
                  <video width="100%" controls><source src={`/videos/${v.f}`} type="video/mp4" /></video>
                </div>
              ))}
            </div>
          </div>
        );
      }
      case 'evaluasi':
        return (
          <div className="content-fade">
            {/* Bagian Unggah Tetap Ada di Atas dengan Style Baru */}
            <div className="card" style={{ textAlign: 'center', marginBottom: '30px' }}>
              <h3 style={{ marginBottom: '20px' }}>Unggah Praktik Baru</h3>
              <div className="upload-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
                <input
                  type="url"
                  placeholder="Tempelkan Link Google Drive di sini..."
                  value={videoLink}
                  onChange={(e) => setVideoLink(e.target.value)}
                  className="input-style"
                  style={{ maxWidth: '400px', textAlign: 'center' }}
                />
                <button onClick={handleUpload} className="btn-primary" style={{ maxWidth: '400px' }}>Kirim Tugas Video</button>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#dc2626', marginTop: '12px' }}>*Pastikan akses link GDrive disetting ke "Anyone with the link"</p>
              {uploadStatus && <p style={{ marginTop: '10px', color: '#64748b' }}>{uploadStatus}</p>}
            </div>

            <h2 className="content-title">Riwayat Hasil Evaluasi</h2>

            <div className="evaluation-list">
              {hasilNilai.length === 0 ? (
                <div className="card"><p>Belum ada hasil penilaian.</p></div>
              ) : (
                hasilNilai.map((hasil) => (
                  <div key={hasil.id} className="evaluation-card">
                    <div style={{ flex: 1 }}>
                      <h4 style={{ margin: 0, color: '#1e293b' }}>{hasil.nama_materi}</h4>
                      <p style={{ margin: '4px 0', fontSize: '0.85rem', color: '#94a3b8' }}>
                        Dikirim pada: {new Date(hasil.created_at).toLocaleDateString('id-ID')}
                      </p>
                      {hasil.feedback && (
                        <div className="feedback-box">
                          "{hasil.feedback}"
                        </div>
                      )}
                    </div>

                    <div style={{ textAlign: 'right', marginLeft: '20px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>Nilai Akhir</div>
                      <div className="score-badge">
                        {hasil.nilai_tugas || 0}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        );
      case 'penilaian':
        return (
          <div className="content-fade">
            <h2 className="content-title">Antrean Penilaian</h2>

            {/* Logika Ternary dimulai di sini */}
            {!selectedEvaluasi ? (
              <div className="video-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                {evaluasiList.map((ev) => (
                  <div key={ev.id} className="card" onClick={() => setSelectedEvaluasi(ev)} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {ev.nama_mahasiswa ? ev.nama_mahasiswa.charAt(0) : '?'}
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.1rem' }}>{ev.nama_mahasiswa}</h3>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>Materi: {ev.nama_materi}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Bagian Detail Penilaian */
              <div className="card content-fade" style={{ maxWidth: '800px', margin: '0 auto' }}>
                <button onClick={() => setSelectedEvaluasi(null)} className="btn-back">← Kembali ke Antrean</button>

                <div className="evaluation-header" style={{ textAlign: 'center', marginBottom: '25px' }}>
                  <h3 style={{ fontSize: '1.5rem', color: '#1e293b' }}>Penilaian: {selectedEvaluasi.nama_mahasiswa}</h3>
                  <span className="badge-materi">{selectedEvaluasi.nama_materi}</span>
                </div>

                <div className="video-container-modern" style={{ textAlign: 'center', padding: '20px', background: '#eff6ff', borderRadius: '12px', border: '1px dashed #93c5fd' }}>
                  <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>Tugas Video Mahasiswa</h4>

                  {/* AREA PEMUTAR VIDEO (EMBED GOOGLE DRIVE) */}
                  {selectedEvaluasi.video_url ? (
                    <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%', marginBottom: '15px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                      <iframe
                        src={selectedEvaluasi.video_url.replace(/\/view.*$/, '/preview')}
                        style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', border: 0 }}
                        allow="autoplay"
                        allowFullScreen
                      ></iframe>
                    </div>
                  ) : (
                    <p style={{ color: '#dc2626' }}>Tidak ada link video.</p>
                  )}

                  {/* TOMBOL ALTERNATIF JIKA VIDEO TIDAK MUNCUL */}
                  <p style={{ color: '#60a5fa', marginBottom: '12px', fontSize: '0.85rem' }}>*Jika video diblokir, pastikan akses link GDrive mahasiswa diatur ke "Anyone with the link".</p>
                  <a
                    href={selectedEvaluasi.video_url?.startsWith('http') ? selectedEvaluasi.video_url : `https://${selectedEvaluasi.video_url}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-pdf"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', textDecoration: 'none', background: '#ffffff', color: '#2563eb' }}
                  >
                    <span>🔗</span> Buka di Tab Baru
                  </a>
                </div>

                <div className="grading-form" style={{ marginTop: '30px', padding: '20px', background: '#f8fafc', borderRadius: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Nilai Tugas</label>
                      <input type="number" placeholder="0-100" className="input-style" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Partisipasi</label>
                      <input type="number" placeholder="0-100" className="input-style" />
                    </div>
                  </div>

                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600' }}>Feedback Dosen</label>
                  <textarea placeholder="Tuliskan saran perbaikan gerakan..." className="input-style" style={{ height: '100px' }}></textarea>

                  <button
                    onClick={() => {
                      handleSavePenilaian(selectedEvaluasi.id);
                      setSelectedEvaluasi(null);
                    }}
                    className="btn-submit-grading"
                  >
                    <span style={{ marginRight: '8px' }}>🚀</span>
                    Kirim Penilaian & Selesaikan
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      case 'admin_users':
        return (
          <div className="card">
            <h2>Manajemen User</h2>
            <table className="user-table">
              <thead><tr><th>Nama</th><th>Role</th><th>Aksi</th></tr></thead>
              <tbody>
                {allUsers.map(u => (
                  <tr key={u.id}>
                    <td>{u.nama}</td>
                    <td>{u.role}</td>
                    <td><button onClick={async () => {
                      if (window.confirm("Hapus?")) {
                        await axios.delete(`${API_URL}/api/admin/users/${u.id}`);
                        fetchAllUsers();
                      }
                    }} className="btn-danger">Hapus</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'home':
      default:
        return (
          <div className="content-fade">
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>

              {/* KOLOM KIRI (UTAMA) */}
              <div>
                <div className="welcome-section">
                  <h2>Halo, {user.nama} 👋</h2>
                  <p>Selamat datang kembali di GymnasticApp. Pantau perkembangan dan jadwal praktikmu hari ini.</p>
                </div>

                <div className="stats-grid" style={{ marginBottom: '24px' }}>
                  <div className="card stat-card">
                    <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>📚</div>
                    <div>
                      <h4 style={{ margin: 0, color: '#64748b' }}>Total Materi</h4>
                      <h2 style={{ margin: 0 }}>4 Modul</h2>
                    </div>
                  </div>
                  {user.role === 'mahasiswa' && (
                    <div className="card stat-card">
                      <div className="stat-icon" style={{ background: '#dcfce7', color: '#16a34a' }}>✅</div>
                      <div>
                        <h4 style={{ margin: 0, color: '#64748b' }}>Selesai Dinilai</h4>
                        <h2 style={{ margin: 0 }}>{hasilNilai.length} Praktik</h2>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kartu Lanjutkan Belajar Khusus Mahasiswa */}
                {user.role === 'mahasiswa' && (
                  <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderLeft: '6px solid #2563eb' }}>
                    <div>
                      <h3 style={{ margin: '0 0 8px 0' }}>Lanjutkan Belajar</h3>
                      <p style={{ margin: 0, color: '#64748b', fontSize: '0.95rem' }}>Materi Senam Lantai: Guling Belakang</p>
                    </div>
                    <button onClick={() => handleTabChange('materi')} className="btn-primary" style={{ width: 'auto' }}>Mulai Belajar</button>
                  </div>
                )}
              </div>

              {/* KOLOM KANAN (SIDEBAR INFO) */}
              <div>
                <div className="card">
                  <h3 style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>Pengumuman</h3>
                  <div style={{ marginBottom: '16px' }}>
                    <h5 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>📅 Ujian Akhir Semester</h5>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Pengumpulan maksimal 20 Juni 2026</p>
                  </div>
                  <div>
                    <h5 style={{ margin: '0 0 4px 0', color: '#1e293b' }}>📌 Info Evaluasi</h5>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>Upload video harus menggunakan Link GDrive yang bisa diakses (Viewer).</p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        );
    }
  };

  return (
    <div className="container">
      {!user ? renderContent() : (
        <>
          <aside className="sidebar">
            <div className="sidebar-profile">
              <h3>{user.nama}</h3>
              <span className="badge-role">{user.role.toUpperCase()}</span>
            </div>
            <nav className="sidebar-nav">
              <div className={`menu-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => handleTabChange('home')}>
                <Home size={20} /><span>Beranda</span>
              </div>

              {user.role === 'mahasiswa' && (
                <>
                  <div className={`menu-item ${activeTab === 'materi' ? 'active' : ''}`} onClick={() => handleTabChange('materi')}>
                    <BookOpen size={20} /><span>Materi Senam</span>
                  </div>
                  <div className={`menu-item ${activeTab === 'video' ? 'active' : ''}`} onClick={() => handleTabChange('video')}>
                    <PlayCircle size={20} /><span>Video Tutorial</span>
                  </div>
                  <div className={`menu-item ${activeTab === 'evaluasi' ? 'active' : ''}`} onClick={() => handleTabChange('evaluasi')}>
                    <ClipboardCheck size={20} /><span>Evaluasi Praktik</span>
                  </div>
                </>
              )}

              {user.role === 'dosen' && (
                <div className={`menu-item ${activeTab === 'penilaian' ? 'active' : ''}`} onClick={() => handleTabChange('penilaian')}>
                  <ClipboardCheck size={20} /><span>Penilaian</span>
                </div>
              )}

              {user.role === 'admin' && (
                <div className={`menu-item ${activeTab === 'admin_users' ? 'active' : ''}`} onClick={() => handleTabChange('admin_users')}>
                  <Users size={20} /><span>Manajemen User</span>
                </div>
              )}
            </nav>

            <button onClick={handleLogout} className="btn-logout">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                <LogOut size={18} /> Logout
              </div>
            </button>
          </aside>
          <main className="content">{renderContent()}</main>
        </>
      )}
    </div>
  );
}

export default App;