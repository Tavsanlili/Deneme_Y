import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import AddExamModal from './AddExamModal'; // 👈 YENİ: Modalı içeri aldık

export default function StudentDashboard() {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Konu Detay Modalı (Eski tekli giriş için)
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [examStats, setExamStats] = useState({ total: '', correct: '', wrong: '' });
  const [saveMessage, setSaveMessage] = useState('');
  
  // 👇 YENİ: Deneme Ekleme Modalı Durumu
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);

  // İstatistikler
  const [statistics, setStatistics] = useState({ total: 0, red: 0, yellow: 0, green: 0 });

  useEffect(() => {
    fetchUserAndData();
  }, []);

  async function fetchUserAndData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // Dersleri Çek
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, name, topics(id, name)')
        .order('id');

      // İlerlemeyi Çek
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('topic_id, status')
        .eq('user_id', user.id);
      
      // Hataları Çek (Yeni Eklenen Denemelerden Gelenler)
      // Burayı ileride daha detaylı işleyeceğiz, şimdilik renkleri çekiyoruz
      const progressMap = {};
      progressData?.forEach(item => {
        progressMap[item.topic_id] = item.status;
      });

      setLessons(lessonsData || []);
      setProgress(progressMap);
      calculateStatistics(lessonsData, progressMap);
      setLoading(false);
    } catch (error) {
      console.error("Hata:", error);
      setLoading(false);
    }
  }

  function calculateStatistics(lessonsData, progressMap) {
    let total = 0;
    let red = 0, yellow = 0, green = 0;

    lessonsData?.forEach(lesson => {
      lesson.topics?.forEach(topic => {
        total++;
        const status = progressMap[topic.id];
        if (status === 1) red++;
        else if (status === 2) yellow++;
        else if (status === 3) green++;
      });
    });

    setStatistics({ total, red, yellow, green });
  }

  // --- TEKLİ KONU GÜNCELLEME (ESKİ SİSTEM) ---
  function openTopicModal(topic) {
    setSelectedTopic(topic);
    setExamStats({ total: '', correct: '', wrong: '' });
    setSaveMessage('');
    setIsTopicModalOpen(true);
  }

  async function handleSaveStats() {
    if (!selectedTopic || !examStats.total || examStats.correct === '') {
      setSaveMessage('❌ Eksik bilgi girdiniz.');
      return;
    }

    const total = parseInt(examStats.total);
    const correct = parseInt(examStats.correct);
    const wrong = parseInt(examStats.wrong || 0);

    // Net Hesabı (4 Yanlış 1 Doğruyu Götürür)
    const net = correct - (wrong / 4);
    const successRate = net > 0 ? (net / total) * 100 : 0;

    let newStatus = 1; 
    if (successRate >= 80) newStatus = 3;      // 🟢 Yeşil
    else if (successRate >= 45) newStatus = 2; // 🟡 Sarı
    else newStatus = 1;                        // 🔴 Kırmızı

    const { error } = await supabase
      .from('student_progress')
      .upsert({
        topic_id: selectedTopic.id,
        status: newStatus,
      }, { onConflict: 'user_id, topic_id' });

    if (!error) {
      const newProgress = { ...progress, [selectedTopic.id]: newStatus };
      setProgress(newProgress);
      calculateStatistics(lessons, newProgress);
      setIsTopicModalOpen(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  // Renk Getirici
  const getStatusColor = (status) => {
    switch (status) {
      case 1: return 'bg-red-500 shadow-red-400 ring-red-200';
      case 2: return 'bg-yellow-400 shadow-yellow-300 ring-yellow-200';
      case 3: return 'bg-green-500 shadow-green-400 ring-green-200';
      default: return 'bg-gray-300 shadow-gray-200';
    }
  };

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold animate-pulse">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 font-sans">
      
      {/* --- HEADER --- */}
      <header className="mb-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
              🚀 Deneme Takip
            </h1>
            <p className="text-slate-500 text-sm">Hoşgeldin, <span className="font-bold text-blue-600">{user?.email?.split('@')[0]}</span></p>
          </div>
          
          <div className="flex gap-3">
            {/* 👇 YENİ BUTON BURADA! */}
            <button 
              onClick={() => setIsAddExamModalOpen(true)}
              className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200 flex items-center gap-2"
            >
              📝 Deneme Ekle
            </button>

            <button onClick={handleLogout} className="px-5 py-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition font-bold">
              Çıkış
            </button>
          </div>
        </div>
      </header>

      {/* --- İSTATİSTİK KARTLARI --- */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-slate-400">
          <p className="text-slate-400 text-xs font-bold uppercase">Toplam</p>
          <p className="text-2xl font-bold">{statistics.total}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-green-600 text-xs font-bold uppercase">Tamamlanan</p>
          <p className="text-2xl font-bold">{statistics.green}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400">
          <p className="text-yellow-600 text-xs font-bold uppercase">Tekrar</p>
          <p className="text-2xl font-bold">{statistics.yellow}</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-red-600 text-xs font-bold uppercase">Eksikler</p>
          <p className="text-2xl font-bold">{statistics.red}</p>
        </div>
      </div>

      {/* --- DERS LİSTESİ --- */}
      <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-6">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="bg-slate-800 p-4 flex justify-between items-center text-white">
              <h2 className="font-bold text-lg">{lesson.name}</h2>
              <span className="text-xs bg-white/20 px-2 py-1 rounded">{lesson.topics?.length} Konu</span>
            </div>
            <div className="p-2 max-h-[400px] overflow-y-auto custom-scrollbar">
              <ul className="space-y-1">
                {lesson.topics?.sort((a,b)=>a.id-b.id).map((topic, index) => {
                  const status = progress[topic.id];
                  return (
                    <li 
                      key={topic.id} 
                      onClick={() => openTopicModal(topic)}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 cursor-pointer transition border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-mono text-slate-400 w-5">{index + 1}.</span>
                        <span className={`text-sm font-medium ${status === 1 ? 'text-red-600' : 'text-slate-700'}`}>
                          {topic.name}
                        </span>
                      </div>
                      <div className={`w-4 h-4 rounded-full ${getStatusColor(status)}`}></div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        ))}
      </div>

      {/* --- MODALLAR --- */}
      
      {/* 1. Tekli Konu Modalı (Eski) */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4">{selectedTopic?.name}</h3>
            <div className="space-y-3">
              <input type="number" placeholder="Toplam Soru" className="w-full p-2 border rounded" 
                value={examStats.total} onChange={e=>setExamStats({...examStats, total:e.target.value})} />
              <input type="number" placeholder="Doğru Sayısı" className="w-full p-2 border rounded" 
                value={examStats.correct} onChange={e=>setExamStats({...examStats, correct:e.target.value})} />
              <input type="number" placeholder="Yanlış Sayısı" className="w-full p-2 border rounded" 
                value={examStats.wrong} onChange={e=>setExamStats({...examStats, wrong:e.target.value})} />
            </div>
            {saveMessage && <p className="text-red-500 text-sm mt-2">{saveMessage}</p>}
            <div className="flex gap-2 mt-4">
              <button onClick={()=>setIsTopicModalOpen(false)} className="flex-1 py-2 bg-gray-200 rounded font-bold text-gray-600">İptal</button>
              <button onClick={handleSaveStats} className="flex-1 py-2 bg-blue-600 text-white rounded font-bold">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {/* 2. YENİ DENEME MODALI (Sayfanın altına ekledik) */}
      <AddExamModal 
        isOpen={isAddExamModalOpen} 
        onClose={() => setIsAddExamModalOpen(false)} 
        onExamAdded={() => {
          fetchUserAndData(); // Verileri yenile
          // Burada ileride "Analiz" fonksiyonunu da çağıracağız
        }}
      />

    </div>
  );
}