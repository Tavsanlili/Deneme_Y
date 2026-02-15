import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabaseClient';
import AddExamModal from './AddExamModal';
import NetChart from './NetChart';

export default function StudentDashboard() {
  const [progress, setProgress] = useState({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  
  // Konu Detay Modalı
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [selectedTopic, _SET_SELECTED_TOPIC] = useState(null);
  const [examStats, setExamStats] = useState({ total: '', correct: '', wrong: '' });
  
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

  // ✨ YENİ: Mesajlar ve Ödevler State'leri
  const [messages, setMessages] = useState([]);
  const [homeworks, setHomeworks] = useState([]);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);

  // Bildirim Sayıları
  const unreadMessageCount = messages.filter(m => !m.is_read).length;
  const pendingHomeworkCount = homeworks.filter(h => h.status === 'pending').length;

  async function fetchUserAndData() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUser(user);

      // 1. Dersleri Çek
      const { data: lessonsData } = await supabase.from('lessons').select('id, name, topics(id, name)').order('id');

      // 2. İlerlemeyi Çek
      const { data: progressData } = await supabase.from('student_progress').select('topic_id, status').eq('user_id', user.id);
      const progressMap = {};
      progressData?.forEach(item => { progressMap[item.topic_id] = item.status; });

      // 3. Denemeleri Çek
      const { data: examsData } = await supabase.from('exams').select('*').eq('user_id', user.id).order('created_at', { ascending: false });

      // 4. Hataları Çek
      const examIds = examsData?.map(exam => exam.id) || [];
      let mistakesData = [];
      if (examIds.length > 0) {
        const { data } = await supabase.from('exam_mistakes')
          .select(`id, topic_id, wrong_count, topics (id, name, lessons (name)), exams (id, name, created_at)`)
          .in('exam_id', examIds).order('id', { ascending: false });
        mistakesData = data || [];
      }

      // ✨ 5. Mesajları Çek (YENİ)
      const { data: messagesData } = await supabase
        .from('messages')
        .select('*')
        .eq('receiver_id', user.id)
        .order('created_at', { ascending: false });

      // ✨ 6. Ödevleri Çek (YENİ)
      const { data: homeworksData } = await supabase
        .from('homeworks')
        .select('*')
        .eq('student_id', user.id)
        .order('due_date', { ascending: true });

      setProgress(progressMap);
      setExams(examsData || []);
      setMessages(messagesData || []);
      setHomeworks(homeworksData || []);
      
      const totalExamsCount = examsData?.length || 0;
      calculateMistakeStats(mistakesData, totalExamsCount);
      calculateDynamicStatistics(lessonsData || [], mistakesData || [], totalExamsCount);
      
      setLoading(false);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserAndData();
  }, [fetchUserAndData]);

  useEffect(() => {
    fetchUserAndData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    fetchUserAndData();
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ... (calculateDynamicStatistics, determineCategory, calculateMistakeStats, getMistakeDotColor fonksiyonları AYNI KALACAK) ...
  const calculateDynamicStatistics = useCallback((lessonsData, mistakesData, totalExams) => {
    let total = 0; let red = 0, orange = 0, yellow = 0, green = 0;
    const topicWrongCounts = {};
    mistakesData.forEach(m => { topicWrongCounts[m.topic_id] = (topicWrongCounts[m.topic_id] || 0) + m.wrong_count; });
    lessonsData.forEach(lesson => {
      if (!lesson.topics) return;
      lesson.topics.forEach(topic => {
        total++;
        const wrongCount = topicWrongCounts[topic.id] || 0;
        const category = determineCategory(wrongCount, totalExams);
        if (category === 'red') red++; else if (category === 'orange') orange++; else if (category === 'yellow') yellow++; else green++;
      });
    });
    setStatistics({ total, red, orange, yellow, green });
  }, []);

  function determineCategory(mistakeCount, totalExams) {
    if (totalExams === 0) return 'green';
    if (totalExams < 3) {
      if (mistakeCount >= 4) return 'red';
      if (mistakeCount >= 2) return 'yellow';
      return 'green';
    }
    const ratio = mistakeCount / totalExams;
    if (ratio >= 0.75) return 'red';
    if (ratio >= 0.50) return 'orange';
    if (ratio >= 0.25) return 'yellow';
    return 'green';
  }

  const calculateMistakeStats = useCallback((mistakesData, totalExams) => {
    const stats = {};
    mistakesData.forEach(mistake => {
      if (!mistake.topics || !mistake.exams) return;
      const topicId = mistake.topic_id;
      const wrongCount = mistake.wrong_count || 1;
      if (!stats[topicId]) {
        stats[topicId] = { topicId, topicName: mistake.topics.name, lessonName: mistake.topics.lessons?.name || 'Genel', totalWrongs: 0, examCount: 0, examDetails: [] };
      }
      stats[topicId].totalWrongs += wrongCount;
      stats[topicId].examDetails.push({ examName: mistake.exams.name, date: mistake.exams.created_at, wrongCount });
    });
    Object.values(stats).forEach(item => { item.examCount = item.examDetails.length; });
    const filteredStats = Object.values(stats).filter(stat => determineCategory(stat.totalWrongs, totalExams) !== 'green');
    setMistakeStats(filteredStats.sort((a, b) => b.totalWrongs - a.totalWrongs));
  }, []);

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

  // ✨ YENİ: Mesajları Açma ve Okundu İşaretleme
  async function handleOpenMessages() {
    setIsMessageModalOpen(true);
    // Okunmamışları okundu yap
    if (unreadMessageCount > 0) {
        const { error } = await supabase
            .from('messages')
            .update({ is_read: true })
            .eq('receiver_id', user.id)
            .eq('is_read', false);
        
        if (!error) {
            // Local state'i güncelle (rozet kaybolsun diye)
            setMessages(prev => prev.map(m => ({ ...m, is_read: true })));
        }
    }
  }

  // ✨ YENİ: Ödevi Tamamlama
  async function handleCompleteHomework(homeworkId) {
    if(!window.confirm("Ödevi tamamladığını onaylıyor musun?")) return;

    const { error } = await supabase
        .from('homeworks')
        .update({ status: 'completed' })
        .eq('id', homeworkId);

    if (error) {
        alert("Hata oluştu: " + error.message);
    } else {
        // Local state'i güncelle
        setHomeworks(prev => prev.map(h => h.id === homeworkId ? { ...h, status: 'completed' } : h));
    }
  }

  // Modal Açma Fonksiyonları
  function openMistakeDetailModal(stat) { setSelectedMistakeDetail(stat); setIsMistakeDetailModalOpen(true); }
  
  async function handleSaveStats() { /* Eski kod aynen kalacak */ 
    /* ... (yer tasarrufu için burayı kısaltıyorum, eski kodunuzdaki mantık aynı) ... */
    if (!selectedTopic || !examStats.total || examStats.correct === '') return;
    const total = parseInt(examStats.total); const correct = parseInt(examStats.correct); const wrong = parseInt(examStats.wrong || 0);
    const net = correct - (wrong / 4); const successRate = net > 0 ? (net / total) * 100 : 0;
    let newStatus = 1; if (successRate >= 85) newStatus = 4; else if (successRate >= 65) newStatus = 3; else if (successRate >= 45) newStatus = 2;
    const { error } = await supabase.from('student_progress').upsert({ topic_id: selectedTopic.id, status: newStatus }, { onConflict: 'user_id, topic_id' });
    if (!error) { const newProgress = { ...progress, [selectedTopic.id]: newStatus }; setProgress(newProgress); fetchUserAndData(); setIsTopicModalOpen(false); }
  }

  async function handleLogout() { await supabase.auth.signOut(); window.location.reload(); }
  const formatDate = (dateString) => new Date(dateString).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold animate-pulse">Yükleniyor...</div>;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 font-sans">
      
      {/* HEADER */}
      <header className="mb-8 max-w-6xl mx-auto">
        <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2"> Deneme Takip</h1>
            <p className="text-slate-500 text-sm">Hoşgeldin, <span className="font-bold text-blue-600">{user?.email?.split('@')[0]}</span></p>
          </div>
          <div className="flex gap-3 items-center">
            
            {/* ✨ YENİ: MESAJ BUTONU */}
            <button onClick={handleOpenMessages} className="relative p-2.5 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition border border-slate-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {unreadMessageCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm animate-pulse">
                        {unreadMessageCount}
                    </span>
                )}
            </button>

             {/* ✨ YENİ: ÖDEV BUTONU */}
             <button onClick={() => setIsHomeworkModalOpen(true)} className="relative p-2.5 bg-white text-slate-600 rounded-xl hover:bg-slate-50 transition border border-slate-200 group">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 group-hover:text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                {pendingHomeworkCount > 0 && (
                    <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full shadow-sm">
                        {pendingHomeworkCount}
                    </span>
                )}
            </button>

            <div className="w-px h-8 bg-slate-200 mx-1"></div>

            <button onClick={() => setIsAddExamModalOpen(true)} className="px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-bold shadow-lg shadow-blue-200 flex items-center gap-2">
              📝 Deneme Ekle
            </button>
            <button onClick={handleLogout} className="px-5 py-2.5 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition font-bold">Çıkış</button>
          </div>
        </div>
      </header>

      {/* İSTATİSTİK KARTLARI (Mevcut Kod) */}
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

      {/* GRAFİK VE LİSTELER (Mevcut Kod) */}
      <div className="max-w-6xl mx-auto mb-8">
        <NetChart exams={exams} />
      </div>

      <div className="max-w-6xl mx-auto mb-8 grid md:grid-cols-2 gap-6">
        {/* SOL: DENEMELER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
          <div className="bg-blue-600 p-4 text-white shrink-0">
            <h2 className="font-bold text-lg flex items-center gap-2">
              📊 Son Denemeler <span className="text-xs bg-white/20 px-2 py-1 rounded">{exams.length}</span>
            </h2>
          </div>
          <div className="p-4 overflow-y-auto flex-1 custom-scrollbar">
            {exams.length === 0 ? <p className="text-slate-400 text-center py-8">Henüz deneme eklenmemiş.</p> : (
              <ul className="space-y-3">
                {exams.map((exam) => {
                  const net = (exam.correct_count - (exam.wrong_count / 4)).toFixed(2);
                  return (
                    <li key={exam.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:shadow-md transition">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-slate-800">{exam.name || 'Deneme'}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">{formatDate(exam.created_at)}</span>
                          <button onClick={() => handleDeleteExam(exam.id)} className="text-slate-400 hover:text-red-600 p-1">🗑️</button>
                        </div>
                      </div>
                      <div className="flex justify-between text-xs bg-white p-2 rounded border border-slate-100">
                        <span className="text-green-600 font-bold">D: {exam.correct_count}</span>
                        <span className="text-red-600 font-bold">Y: {exam.wrong_count}</span>
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
              ❌ En Çok Hata Yapılanlar <span className="text-xs bg-white/20 px-2 py-1 rounded">{mistakeStats.length}</span>
            </h2>
          </div>
          <div className="p-0 overflow-y-auto flex-1 custom-scrollbar">
            {mistakeStats.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400"><p>Henüz hata verisi yok 🎉</p></div>
            ) : (
              <ul className="divide-y divide-slate-100">
                {mistakeStats.map((stat) => (
                  <li key={stat.topicId} onClick={() => openMistakeDetailModal(stat)} className="p-4 hover:bg-red-50 cursor-pointer transition flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full shadow-sm ring-2 ring-white ${getMistakeDotColor(stat.totalWrongs, exams.length)}`}></div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">{stat.lessonName}</span>
                        <p className="font-bold text-slate-700 text-sm group-hover:text-red-700 transition">{stat.topicName}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="block text-lg font-extrabold text-slate-800">{stat.totalWrongs}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* MODALLAR */}
      {/* ... (TopicModal ve MistakeDetailModal buraya gelecek - mevcut kodunuzdakiyle aynı) ... */}
      
      {/* ✨ YENİ: MESAJ MODALI */}
      {isMessageModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
                <div className="bg-slate-800 p-4 rounded-t-xl flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">📬 Mesaj Kutusu</h3>
                    <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-400 hover:text-white">✕</button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-slate-50">
                    {messages.length === 0 ? (
                        <p className="text-center text-slate-400 py-10">Henüz mesajın yok.</p>
                    ) : (
                        <div className="space-y-3">
                            {messages.map(msg => (
                                <div key={msg.id} className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                        <span className="text-xs font-bold text-blue-600">Öğretmen</span>
                                        <span className="text-[10px] text-slate-400">{formatDate(msg.created_at)}</span>
                                    </div>
                                    <p className="text-slate-700 text-sm">{msg.content}</p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* ✨ YENİ: ÖDEV MODALI */}
      {isHomeworkModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
                <div className="bg-orange-500 p-4 rounded-t-xl flex justify-between items-center">
                    <h3 className="text-white font-bold flex items-center gap-2">📚 Ödevlerim</h3>
                    <button onClick={() => setIsHomeworkModalOpen(false)} className="text-orange-100 hover:text-white">✕</button>
                </div>
                <div className="p-4 overflow-y-auto custom-scrollbar flex-1 bg-orange-50">
                    {homeworks.length === 0 ? (
                        <p className="text-center text-slate-400 py-10">Atanmış ödevin yok. Harika! 🎉</p>
                    ) : (
                        <div className="space-y-3">
                            {homeworks.map(hw => (
                                <div key={hw.id} className={`p-4 rounded-lg border shadow-sm transition ${hw.status === 'completed' ? 'bg-slate-100 border-slate-200 opacity-70' : 'bg-white border-orange-200'}`}>
                                    <div className="flex justify-between items-start mb-2">
                                        <h4 className={`font-bold ${hw.status === 'completed' ? 'text-slate-500 line-through' : 'text-slate-800'}`}>
                                            {hw.title}
                                        </h4>
                                        {hw.status === 'pending' ? (
                                            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded font-bold">Bekliyor</span>
                                        ) : (
                                            <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-bold">Tamamlandı</span>
                                        )}
                                    </div>
                                    <p className="text-sm text-slate-600 mb-3 whitespace-pre-wrap">{hw.description}</p>
                                    
                                    <div className="flex justify-between items-center pt-2 border-t border-slate-100">
                                        <div className="text-xs text-slate-500">
                                            Son Tarih: <span className="font-bold text-slate-700">{formatDate(hw.due_date)}</span>
                                        </div>
                                        {hw.status === 'pending' && (
                                            <button 
                                                onClick={() => handleCompleteHomework(hw.id)}
                                                className="text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-bold hover:bg-green-600 transition flex items-center gap-1"
                                            >
                                                ✅ Tamamla
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
      )}

      {/* Diğer Modallar (TopicModal, MistakeDetailModal vb. mevcut koddakiler) */}
      {isTopicModalOpen && (
        /* ... Topic Modal Kodu ... */
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             {/* ... Mevcut modal içeriği ... */}
             <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm">
                <h3 className="text-lg font-bold mb-4 border-b pb-2">{selectedTopic?.name}</h3>
                {/* ... inputlar ... */}
                <div className="space-y-3">
                    <label className="text-xs font-bold text-slate-500">Bu konudan çözdüğün son test:</label>
                    <input type="number" placeholder="Toplam Soru" className="w-full p-2 border rounded bg-slate-50" value={examStats.total} onChange={e=>setExamStats({...examStats, total:e.target.value})} />
                    <div className="flex gap-2">
                        <input type="number" placeholder="Doğru" className="w-full p-2 border rounded bg-green-50 text-green-700" value={examStats.correct} onChange={e=>setExamStats({...examStats, correct:e.target.value})} />
                        <input type="number" placeholder="Yanlış" className="w-full p-2 border rounded bg-red-50 text-red-700" value={examStats.wrong} onChange={e=>setExamStats({...examStats, wrong:e.target.value})} />
                    </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                    <button onClick={()=>setIsTopicModalOpen(false)} className="flex-1 py-2 bg-gray-100 rounded text-gray-600 font-medium">Vazgeç</button>
                    <button onClick={handleSaveStats} className="flex-1 py-2 bg-blue-600 text-white rounded font-medium">Kaydet</button>
                </div>
             </div>
        </div>
      )}

      {isMistakeDetailModalOpen && selectedMistakeDetail && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
             {/* ... Mevcut Hata Detay Modal içeriği ... */}
             <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="bg-red-50 p-6 border-b border-red-100">
                     <h3 className="text-xl font-bold text-red-800">{selectedMistakeDetail.topicName}</h3>
                     {/* ... Diğer detaylar ... */}
                     <button onClick={() => setIsMistakeDetailModalOpen(false)} className="mt-4 px-6 py-2 bg-slate-200 text-slate-700 rounded-lg font-bold w-full">Kapat</button>
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