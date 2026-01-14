import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import AddExamModal from './AddExamModal';
import NetChart from './NetChart'; // 👈 YENİ

export default function StudentDashboard() {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Konu Detay Modalı
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState(null);
  const [examStats, setExamStats] = useState({ total: '', correct: '', wrong: '' });
  const [saveMessage, setSaveMessage] = useState('');
  
  // Deneme Ekleme Modalı
  const [isAddExamModalOpen, setIsAddExamModalOpen] = useState(false);

  // İstatistikler
  const [statistics, setStatistics] = useState({ total: 0, red: 0, orange: 0, yellow: 0, green: 0 });
  
  // Denemeler ve Hatalar
  const [exams, setExams] = useState([]);
  const [mistakeStats, setMistakeStats] = useState([]); 
  
  // Hata Detay Modalı
  const [isMistakeDetailModalOpen, setIsMistakeDetailModalOpen] = useState(false);
  const [selectedMistakeDetail, setSelectedMistakeDetail] = useState(null);

  useEffect(() => {
    fetchUserAndData();
  }, []);

  async function fetchUserAndData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // 1. Dersleri Çek
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('id, name, topics(id, name)')
        .order('id');

      // 2. İlerlemeyi Çek
      const { data: progressData } = await supabase
        .from('student_progress')
        .select('topic_id, status')
        .eq('user_id', user.id);
      
      const progressMap = {};
      progressData?.forEach(item => {
        progressMap[item.topic_id] = item.status;
      });

      // 3. Denemeleri Çek
      const { data: examsData } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      // 4. Hataları Çek
      const examIds = examsData?.map(exam => exam.id) || [];
      let mistakesData = [];

      if (examIds.length > 0) {
        const { data } = await supabase
          .from('exam_mistakes')
          .select(`
            id,
            topic_id,
            wrong_count,
            topics (id, name, lessons (name)),
            exams (id, name, created_at)
          `)
          .in('exam_id', examIds)
          .order('id', { ascending: false });
        
        mistakesData = data || [];
      }

      setLessons(lessonsData || []);
      setProgress(progressMap);
      setExams(examsData || []);
      
      // ✨ YENİ: Toplam deneme sayısını bir değişkene alıyoruz
      const totalExamsCount = examsData?.length || 0;

      // ✨ YENİ: Fonksiyona bu sayıyı da gönderiyoruz
      calculateMistakeStats(mistakesData, totalExamsCount);
      
      // ✨ ÖNEMLİ DEĞİŞİKLİK: İstatistikleri artık hatalara ve deneme sayısına göre hesaplıyoruz
      calculateDynamicStatistics(lessonsData || [], mistakesData || [], examsData?.length || 0);
      
      setLoading(false);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
      setLoading(false);
    }
  }

  // ✨ YENİ FONKSİYON: Dinamik İstatistik Hesaplama
  function calculateDynamicStatistics(lessonsData, mistakesData, totalExams) {
    let total = 0;
    let red = 0, orange = 0, yellow = 0, green = 0;

    // 1. Önce her konunun toplam yanlış sayısını bulalım
    const topicWrongCounts = {};
    mistakesData.forEach(m => {
      topicWrongCounts[m.topic_id] = (topicWrongCounts[m.topic_id] || 0) + m.wrong_count;
    });

    // 2. Tüm konuları gez ve durumunu belirle
    lessonsData.forEach(lesson => {
      if (!lesson.topics) return;

      lesson.topics.forEach(topic => {
        total++; // Toplam konu sayısını artır
        
        const wrongCount = topicWrongCounts[topic.id] || 0; // Bu konudaki toplam yanlış
        
        // Hangi kategoriye girdiğini hesapla (getMistakeDotColor mantığıyla aynı)
        const category = determineCategory(wrongCount, totalExams);
        
        if (category === 'red') red++;
        else if (category === 'orange') orange++;
        else if (category === 'yellow') yellow++;
        else green++; // Eğer hiç hata yoksa veya azsa yeşildir
      });
    });

    setStatistics({ total, red, orange, yellow, green });
  }

  // Renk Kategorisini Belirleyen Yardımcı Fonksiyon (Isınma Turu Dahil)
  function determineCategory(mistakeCount, totalExams) {
    if (totalExams === 0) return 'green'; // Hiç deneme yoksa hepsi başarılı

    // Isınma Turu (Az Deneme)
    if (totalExams < 3) {
      if (mistakeCount >= 4) return 'red';
      if (mistakeCount >= 2) return 'yellow'; // Sarı/Turuncu arası, burayı yellow sayalım
      return 'green';
    }

    // Gerçek Oranlar
    const ratio = mistakeCount / totalExams;
    if (ratio >= 0.75) return 'red';
    if (ratio >= 0.50) return 'orange';
    if (ratio >= 0.25) return 'yellow';
    return 'green';
  }

  // Bu eski fonksiyonu silebilirsiniz ama liste renklendirmesi için tutuyoruz
  function calculateMistakeStats(mistakesData, totalExams) {
    const stats = {};
    mistakesData.forEach(mistake => {
      if (!mistake.topics || !mistake.exams) return;
      const topicId = mistake.topic_id;
      const topicName = mistake.topics.name;
      const lessonName = mistake.topics.lessons?.name || 'Genel';
      const wrongCount = mistake.wrong_count || 1;
      const examName = mistake.exams.name || 'İsimsiz Deneme';
      const examDate = mistake.exams.created_at;

      if (!stats[topicId]) {
        stats[topicId] = { topicId, topicName, lessonName, totalWrongs: 0, examCount: 0, examDetails: [] };
      }
      stats[topicId].totalWrongs += wrongCount;
      stats[topicId].examDetails.push({ examName, date: examDate, wrongCount });
    });
    Object.values(stats).forEach(item => { item.examCount = item.examDetails.length; });

    // Listeyi oluştururken "Rengi yeşil olanları dahil etme" diyoruz.
  const filteredStats = Object.values(stats).filter(stat => {
    const category = determineCategory(stat.totalWrongs, totalExams);
    return category !== 'green'; // 🟢 Yeşil değilse listeye al
  });

    const sortedStats = Object.values(stats).sort((a, b) => b.totalWrongs - a.totalWrongs);
    setMistakeStats(sortedStats);
  }

  // Renk Fonksiyonu (UI İçin)
  const getMistakeDotColor = (mistakeCount, totalExams) => {
    const category = determineCategory(mistakeCount, totalExams);
    switch(category) {
      case 'red': return 'bg-red-600 shadow-red-300';
      case 'orange': return 'bg-orange-500 shadow-orange-300';
      case 'yellow': return 'bg-yellow-400 shadow-yellow-300';
      default: return 'bg-green-500 shadow-green-300';
    }
  };

  async function handleDeleteExam(examId) {
    if (!window.confirm("Bu denemeyi silmek istediğinize emin misiniz?")) return;
    try {
      const { error } = await supabase.from('exams').delete().eq('id', examId);
      if (error) throw error;
      fetchUserAndData();
    } catch (error) { alert("Silme hatası: " + error.message); }
  }

  function openTopicModal(topic) {
    setSelectedTopic(topic);
    setExamStats({ total: '', correct: '', wrong: '' });
    setSaveMessage('');
    setIsTopicModalOpen(true);
  }

  function openMistakeDetailModal(stat) {
    setSelectedMistakeDetail(stat);
    setIsMistakeDetailModalOpen(true);
  }

  async function handleSaveStats() {
    if (!selectedTopic || !examStats.total || examStats.correct === '') {
      setSaveMessage('❌ Eksik bilgi.');
      return;
    }
    const total = parseInt(examStats.total);
    const correct = parseInt(examStats.correct);
    const wrong = parseInt(examStats.wrong || 0);
    const net = correct - (wrong / 4);
    const successRate = net > 0 ? (net / total) * 100 : 0;

    let newStatus = 1; 
    if (successRate >= 85) newStatus = 4;
    else if (successRate >= 65) newStatus = 3;
    else if (successRate >= 45) newStatus = 2;
    else newStatus = 1;

    const { error } = await supabase
      .from('student_progress')
      .upsert({ topic_id: selectedTopic.id, status: newStatus }, { onConflict: 'user_id, topic_id' });

    if (!error) {
      const newProgress = { ...progress, [selectedTopic.id]: newStatus };
      setProgress(newProgress);
      // Manuel güncellemede de dinamik hesabı tetikleyelim (önemsiz ama tutarlı olsun)
      // Burada tam refresh yapmak daha sağlıklı olabilir
      fetchUserAndData();
      setIsTopicModalOpen(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  // Liste için renkler (Manuel progress varsa onu kullanır, yoksa gri döner)
  const getStatusColor = (status) => {
    switch (status) {
      case 1: return 'bg-red-500 shadow-red-400 ring-red-200';
      case 2: return 'bg-orange-500 shadow-orange-400 ring-orange-200';
      case 3: return 'bg-yellow-400 shadow-yellow-300 ring-yellow-200';
      case 4: return 'bg-green-500 shadow-green-400 ring-green-200';
      default: return 'bg-gray-300 shadow-gray-200';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold animate-pulse">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 font-sans">
      
      {/* HEADER */}
      <header className="mb-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">🚀 Deneme Takip</h1>
            <p className="text-slate-500 text-sm">Hoşgeldin, <span className="font-bold text-blue-600">{user?.email?.split('@')[0]}</span></p>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setIsAddExamModalOpen(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200 flex items-center gap-2">
              📝 Deneme Ekle
            </button>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition font-bold">Çıkış</button>
          </div>
        </div>
      </header>

      {/* İSTATİSTİK KARTLARI (Dinamik Verili) */}
      <div className="max-w-6xl mx-auto mb-8 grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-slate-400">
          <p className="text-slate-400 text-xs font-bold uppercase">Toplam Konu</p>
          <p className="text-2xl font-bold">{statistics.total}</p>
        </div>
        
        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-green-500">
          <p className="text-green-600 text-xs font-bold uppercase">Başarılı</p>
          <p className="text-2xl font-bold">{statistics.green}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-yellow-400">
          <p className="text-yellow-600 text-xs font-bold uppercase">Gelişiyor</p>
          <p className="text-2xl font-bold">{statistics.yellow}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-orange-500">
          <p className="text-orange-600 text-xs font-bold uppercase">Riskli</p>
          <p className="text-2xl font-bold">{statistics.orange}</p>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border-l-4 border-red-500">
          <p className="text-red-600 text-xs font-bold uppercase">Zayıf</p>
          <p className="text-2xl font-bold">{statistics.red}</p>
        </div>
      </div>

      {/* 👇 YENİ GRAFİK ALANI */}
      <div className="max-w-6xl mx-auto mb-8">
        <NetChart exams={exams} />
      </div>

      {/* ANA İÇERİK GRID */}
      <div className="max-w-6xl mx-auto mb-8 grid md:grid-cols-2 gap-6">
        
        {/* SOL: DENEMELER LİSTESİ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
          <div className="bg-blue-600 p-4 text-white shrink-0">
            <h2 className="font-bold text-lg flex items-center gap-2">
              📊 Son Denemeler
              <span className="text-xs bg-white/20 px-2 py-1 rounded">{exams.length}</span>
            </h2>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {exams.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Henüz deneme eklenmemiş.</p>
            ) : (
              <ul className="space-y-3">
                {exams.map((exam) => {
                  const correct = exam.correct_count || 0;
                  const wrong = exam.wrong_count || 0;
                  const empty = exam.empty_count || 0;
                  const net = (correct - (wrong / 4)).toFixed(2);
                  return (
                    <li key={exam.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800">{exam.name || 'Deneme'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{formatDate(exam.created_at)}</span>
                          <button onClick={() => handleDeleteExam(exam.id)} className="text-slate-400 hover:text-red-600 p-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 000-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs bg-white p-2 rounded border border-slate-100">
                        <span className="text-green-600 font-bold">D: {correct}</span>
                        <span className="text-red-600 font-bold">Y: {wrong}</span>
                        <span className="text-slate-500">B: {empty}</span>
                        <span className="text-blue-600 font-extrabold bg-blue-50 px-2 rounded">Net: {net}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        {/* SAĞ: HATA ANALİZİ */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
          <div className="bg-red-600 p-4 text-white shrink-0">
            <h2 className="font-bold text-lg flex items-center gap-2">
              ❌ En Çok Hata Yapılanlar
              <span className="text-xs bg-white/20 px-2 py-1 rounded">{mistakeStats.length}</span>
            </h2>
            <p className="text-xs text-red-100 mt-1 opacity-80">Detaylar için konuya tıklayın</p>
          </div>
          
          <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
            {mistakeStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <p>Henüz hata verisi yok 🎉</p>
                <p className="text-xs mt-2">Deneme ekledikçe burası dolacak.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mistakeStats.map((stat) => (
                  <li 
                    key={stat.topicId} 
                    onClick={() => openMistakeDetailModal(stat)}
                    className="p-4 hover:bg-red-50 cursor-pointer transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-3">
                      {/* YUVARLAK RENK GÖSTERGESİ */}
                      <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ring-white ${getMistakeDotColor(stat.totalWrongs, exams.length)}`}></div>
                      
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                          {stat.lessonName}
                        </span>
                        <p className="font-bold text-slate-700 text-sm group-hover:text-red-700 transition">
                          {stat.topicName}
                        </p>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-bold">
                          {exams.length < 3 ? 'Veri Toplanıyor...' : `Ort: ${(stat.totalWrongs / (exams.length || 1)).toFixed(1)}`}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="block text-lg font-extrabold text-slate-800">
                        {stat.totalWrongs}
                      </span>
                      <span className="text-[10px] text-slate-400 font-medium">Toplam Yanlış</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* MODALLAR */}
      {isTopicModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold mb-4 border-b pb-2">{selectedTopic?.name}</h3>
            <div className="space-y-3">
              <label className="text-xs font-bold text-slate-500">Bu konudan çözdüğün son test:</label>
              <input type="number" placeholder="Toplam Soru" className="w-full p-2 border rounded bg-slate-50" 
                value={examStats.total} onChange={e=>setExamStats({...examStats, total:e.target.value})} />
              <div className="flex gap-2">
                <input type="number" placeholder="Doğru" className="w-full p-2 border rounded bg-green-50 text-green-700" 
                  value={examStats.correct} onChange={e=>setExamStats({...examStats, correct:e.target.value})} />
                <input type="number" placeholder="Yanlış" className="w-full p-2 border rounded bg-red-50 text-red-700" 
                  value={examStats.wrong} onChange={e=>setExamStats({...examStats, wrong:e.target.value})} />
              </div>
            </div>
            {saveMessage && <p className="text-red-500 text-sm mt-2">{saveMessage}</p>}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <button onClick={()=>setIsTopicModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded text-gray-600 font-medium">Vazgeç</button>
              <button onClick={handleSaveStats} className="flex-1 py-2 bg-blue-600 text-white rounded font-medium">Kaydet</button>
            </div>
          </div>
        </div>
      )}

      {isMistakeDetailModalOpen && selectedMistakeDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-red-50 p-6 border-b border-red-100">
              <h3 className="text-xl font-bold text-red-800">{selectedMistakeDetail.topicName}</h3>
              <p className="text-red-600 text-sm font-medium">{selectedMistakeDetail.lessonName}</p>
              <div className="mt-4 flex gap-4">
                <div className="bg-white px-4 py-2 rounded-lg border border-red-100 shadow-sm">
                  <span className="block text-xs text-slate-400">Toplam Yanlış</span>
                  <span className="text-xl font-extrabold text-red-600">{selectedMistakeDetail.totalWrongs}</span>
                </div>
                <div className="bg-white px-4 py-2 rounded-lg border border-red-100 shadow-sm">
                  <span className="block text-xs text-slate-400">Hatalı Deneme</span>
                  <span className="text-xl font-extrabold text-slate-700">{selectedMistakeDetail.examCount}</span>
                </div>
              </div>
            </div>
            <div className="p-6 bg-white max-h-[300px] overflow-y-auto">
              <h4 className="text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide">Hata Yapılan Denemeler</h4>
              <ul className="space-y-2">
                {selectedMistakeDetail.examDetails.map((detail, index) => (
                  <li key={index} className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                    <div>
                      <p className="font-bold text-slate-700 text-sm">{detail.examName}</p>
                      <p className="text-xs text-slate-400">{formatDate(detail.date)}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
                      <span>{detail.wrongCount}</span>
                      <span>Yanlış</span>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="p-4 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setIsMistakeDetailModalOpen(false)}
                className="px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold hover:bg-slate-300 transition"
              >
                Kapat
              </button>
            </div>
          </div>
        </div>
      )}

      <AddExamModal 
        isOpen={isAddExamModalOpen} 
        onClose={() => setIsAddExamModalOpen(false)} 
        onExamAdded={() => fetchUserAndData()}
      />
    </div>
  );
}