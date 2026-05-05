import { useState } from 'react';
import axios from 'axios';
import './App.css';

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
  const [videoFile, setVideoFile] = useState(null);
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
    if (!videoFile) return alert('Pilih file dahulu!');

    const formData = new FormData();
    formData.append('video_praktik', videoFile);
    formData.append('mahasiswa_id', user.id);
    formData.append('materi_id', selectedMateri);

    try {
      setUploadStatus('Mengunggah...');
      const res = await axios.post(`${API_URL}/api/evaluasi`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      console.log("Respon Server:", res.data);
      setUploadStatus('Upload berhasil!');
      fetchHasilNilai();
    } catch (error) {
      console.error("Detail Error:", error);
      const errMsg = error.response?.data?.error || 'Gagal upload.';
      setUploadStatus(errMsg);
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
        <div className="login-container">
          <div className="login-card">
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img src="/Icon home.png" alt="Logo" style={{ width: '60px' }} />
              <h2>{isRegister ? 'Daftar Akun Baru' : 'Login GymnasticApp'}</h2>
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
                <input type="text" placeholder="Nama" onChange={(e) => setRegData({ ...regData, nama: e.target.value })} required />
                <input type="email" placeholder="Email" onChange={(e) => setRegData({ ...regData, email: e.target.value })} required />
                <input type="password" placeholder="Password" onChange={(e) => setRegData({ ...regData, password: e.target.value })} required />
                <button type="submit" className="btn-primary">Daftar</button>
                <p onClick={() => setIsRegister(false)} className="toggle-auth">Sudah punya akun? <span onClick={() => setIsRegister(false)}>Login</span></p>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="login-form">
                <input type="email" placeholder="Email" onChange={(e) => setAuthData({ ...authData, email: e.target.value })} required />
                <input type="password" placeholder="Password" onChange={(e) => setAuthData({ ...authData, password: e.target.value })} required />
                <button type="submit" className="btn-primary">Masuk</button>
                <p onClick={() => setIsRegister(true)} className="toggle-auth">Belum punya akun? <span onClick={() => setIsRegister(true)}>Daftar</span></p>
              </form>
            )}
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'materi':
        return (
          <div className="content-fade">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 className="content-title" style={{ margin: 0 }}>Modul: Guling Belakang</h2>

              {/* Tombol Buka PDF */}
              <a
                href={`${API_URL}/uploads/pdf/modul-guling-belakang.pdf`}
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
              <div className="upload-wrapper" style={{ display: 'flex', justifyContent: 'center', gap: '10px', alignItems: 'center' }}>
                <input type="file" onChange={(e) => setVideoFile(e.target.files[0])} className="input-style" style={{ width: 'auto' }} />
                <button onClick={handleUpload} className="btn-primary">Unggah Video</button>
              </div>
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

                <div className="video-container-modern">
                  <video width="100%" controls key={selectedEvaluasi.video_url} style={{ borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}>
                    <source src={`${API_URL}/uploads/${selectedEvaluasi.video_url}`} type="video/mp4" />
                  </video>
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
      default:
        return (
          <div className="content-fade">
            {/* Welcome Banner */}
            <div className="welcome-section">
              <h2>Halo, {user.nama} 👋</h2>
              <p>Selamat datang kembali di dashboard GymnasticApp. Pantau perkembangan praktik hari ini.</p>
            </div>

            {/* Tampilan Statistik Singkat (Contoh) */}
            <div className="stats-grid">
              <div className="card stat-card">
                <div className="stat-icon" style={{ background: '#dbeafe', color: '#2563eb' }}>📊</div>
                <div>
                  <h4 style={{ margin: 0, color: '#64748b' }}>Total Materi</h4>
                  <h2 style={{ margin: 0 }}>10 Modul</h2>
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

              {user.role === 'dosen' && (
                <div className="card stat-card">
                  <div className="stat-icon" style={{ background: '#fef3c7', color: '#d97706' }}>⏳</div>
                  <div>
                    <h4 style={{ margin: 0, color: '#64748b' }}>Antrean Baru</h4>
                    <h2 style={{ margin: 0 }}>{evaluasiList.length} Mahasiswa</h2>
                  </div>
                </div>
              )}
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
                <img src="/Icon home.png" alt="Home" /><span>Beranda</span>
              </div>

              {user.role === 'mahasiswa' && (
                <>
                  <div className={`menu-item ${activeTab === 'materi' ? 'active' : ''}`} onClick={() => handleTabChange('materi')}>
                    <img src="/Icon materi.png" alt="Materi" /><span>Modul Materi</span>
                  </div>
                  <div className={`menu-item ${activeTab === 'video' ? 'active' : ''}`} onClick={() => handleTabChange('video')}>
                    <img src="/icon video.webp" alt="Video" /><span>Video Tutorial</span>
                  </div>
                  <div className={`menu-item ${activeTab === 'evaluasi' ? 'active' : ''}`} onClick={() => handleTabChange('evaluasi')}>
                    <img src="/Icon evaluasi.png" alt="Evaluasi" /><span>Evaluasi Praktik</span>
                  </div>
                </>
              )}

              {user.role === 'dosen' && (
                <div className={`menu-item ${activeTab === 'penilaian' ? 'active' : ''}`} onClick={() => handleTabChange('penilaian')}>
                  <img src="/Icon evaluasi.png" alt="Penilaian" /><span>Penilaian</span>
                </div>
              )}

              {user.role === 'admin' && (
                <div className={`menu-item ${activeTab === 'admin_users' ? 'active' : ''}`} onClick={() => handleTabChange('admin_users')}>
                  <img src="/Icon materi.png" alt="Admin" /><span>Manajemen User</span>
                </div>
              )}
            </nav>
            <button onClick={handleLogout} className="btn-logout">Logout</button>
          </aside>
          <main className="content">{renderContent()}</main>
        </>
      )}
    </div>
  );
}

export default App;