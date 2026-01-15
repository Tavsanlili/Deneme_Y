import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Öğrenci Detay için state'ler
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [studentDetailData, setStudentDetailData] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Mesaj Modal State'leri
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [messageRecipient, setMessageRecipient] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);

  // Ödev Modal State'leri
  const [isHomeworkModalOpen, setIsHomeworkModalOpen] = useState(false);
  const [homeworkStudent, setHomeworkStudent] = useState(null);
  const [homeworkData, setHomeworkData] = useState({
    title: '',
    description: '',
    due_date: ''
  });
  const [assigningHomework, setAssigningHomework] = useState(false);

  useEffect(() => {
    fetchStudents();
  }, []);

  async function fetchStudents() {
    setLoading(true);
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'student') 
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Veri çekme hatası:', error.message);
    } else {
      setStudents(data);
    }
    setLoading(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  const getNameFromEmail = (email) => {
    if (!email) return "Bilinmiyor";
    return email.split('@')[0];
  };

  // Mesaj Modalını Aç
  function openMessageModal(student) {
    setMessageRecipient(student);
    setMessageContent('');
    setIsMessageModalOpen(true);
  }

  // Mesaj Gönder
  async function handleSendMessage() {
    if (!messageContent.trim()) {
      alert('Lütfen mesaj içeriği girin!');
      return;
    }

    setSendingMessage(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: user.id,
          receiver_id: messageRecipient.id,
          content: messageContent.trim()
        });

      if (error) throw error;

      alert(`✅ Mesaj ${getNameFromEmail(messageRecipient.email)} adlı öğrenciye başarıyla gönderildi!`);
      setIsMessageModalOpen(false);
      setMessageContent('');
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      alert('❌ Mesaj gönderilemedi: ' + error.message);
    } finally {
      setSendingMessage(false);
    }
  }

  // Ödev Modalını Aç
  function openHomeworkModal(student) {
    setHomeworkStudent(student);
    setHomeworkData({ title: '', description: '', due_date: '' });
    setIsHomeworkModalOpen(true);
  }

  // Ödev Ata
  async function handleAssignHomework() {
    if (!homeworkData.title.trim() || !homeworkData.due_date) {
      alert('Lütfen en az ödev başlığı ve son tarih girin!');
      return;
    }

    setAssigningHomework(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from('homeworks')
        .insert({
          teacher_id: user.id,
          student_id: homeworkStudent.id,
          title: homeworkData.title.trim(),
          description: homeworkData.description.trim(),
          due_date: homeworkData.due_date,
          status: 'pending'
        });

      if (error) throw error;

      alert(`✅ Ödev ${getNameFromEmail(homeworkStudent.email)} adlı öğrenciye başarıyla atandı!`);
      setIsHomeworkModalOpen(false);
      setHomeworkData({ title: '', description: '', due_date: '' });
    } catch (error) {
      console.error('Ödev atama hatası:', error);
      alert('❌ Ödev atanamadı: ' + error.message);
    } finally {
      setAssigningHomework(false);
    }
  }

  // Öğrenci Detayını Aç
  async function openStudentDetail(studentId) {
    setSelectedStudentId(studentId);
    setDetailLoading(true);
    
    try {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('email, full_name')
        .eq('id', studentId)
        .single();
      
      if (profileError) {
        console.error('Profil çekme hatası:', profileError);
      }

      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, name, topics(id, name)')
        .order('id');
      
      if (lessonsError) {
        console.error('Dersler çekme hatası:', lessonsError);
      }

      const { data: progressData, error: progressError } = await supabase
        .from('student_progress')
        .select('topic_id, status')
        .eq('user_id', studentId);
      
      if (progressError) {
        console.error('İlerleme çekme hatası:', progressError);
      }
      
      const progressMap = {};
      progressData?.forEach(item => {
        progressMap[item.topic_id] = item.status;
      });

      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select('*')
        .eq('user_id', studentId)
        .order('created_at', { ascending: false });
      
      if (examsError) {
        console.error('Denemeler çekme hatası:', examsError);
      }

      console.log('🔍 Öğrenci Denemeleri:', examsData);

      const examIds = examsData?.map(exam => exam.id) || [];
      let mistakesData = [];

      if (examIds.length > 0) {
        const { data, error: mistakesError } = await supabase
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
        
        if (mistakesError) {
          console.error('Hatalar çekme hatası:', mistakesError);
        }
        
        mistakesData = data || [];
        console.log('🔍 Öğrenci Hataları:', mistakesData);
      }

      const totalExamsCount = examsData?.length || 0;
      const statistics = calculateDynamicStatistics(lessonsData || [], mistakesData || [], totalExamsCount);
      const mistakeStats = calculateMistakeStats(mistakesData, totalExamsCount);

      setStudentDetailData({
        profile: profileData,
        lessons: lessonsData || [],
        progress: progressMap,
        exams: examsData || [],
        statistics,
        mistakeStats
      });
      
      setDetailLoading(false);
    } catch (error) {
      console.error("Veri çekme hatası:", error);
      setDetailLoading(false);
    }
  }

  function calculateDynamicStatistics(lessonsData, mistakesData, totalExams) {
    let total = 0;
    let red = 0, orange = 0, yellow = 0, green = 0;

    const topicWrongCounts = {};
    mistakesData.forEach(m => {
      topicWrongCounts[m.topic_id] = (topicWrongCounts[m.topic_id] || 0) + m.wrong_count;
    });

    lessonsData.forEach(lesson => {
      if (!lesson.topics) return;

      lesson.topics.forEach(topic => {
        total++;
        
        const wrongCount = topicWrongCounts[topic.id] || 0;
        const category = determineCategory(wrongCount, totalExams);
        
        if (category === 'red') red++;
        else if (category === 'orange') orange++;
        else if (category === 'yellow') yellow++;
        else green++;
      });
    });

    return { total, red, orange, yellow, green };
  }

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

    const filteredStats = Object.values(stats).filter(stat => {
      const category = determineCategory(stat.totalWrongs, totalExams);
      return category !== 'green';
    });

    return filteredStats.sort((a, b) => b.totalWrongs - a.totalWrongs);
  }

  const getMistakeDotColor = (mistakeCount, totalExams) => {
    const category = determineCategory(mistakeCount, totalExams);
    switch(category) {
      case 'red': return 'bg-red-600 shadow-red-300';
      case 'orange': return 'bg-orange-500 shadow-orange-300';
      case 'yellow': return 'bg-yellow-400 shadow-yellow-300';
      default: return 'bg-green-500 shadow-green-300';
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  function closeStudentDetail() {
    setSelectedStudentId(null);
    setStudentDetailData(null);
  }

  // Eğer detay açıksa, detay sayfasını göster
  if (selectedStudentId && studentDetailData) {
    const studentDisplayName = studentDetailData.profile?.full_name || studentDetailData.profile?.email?.split('@')[0] || 'Öğrenci';
    const statistics = studentDetailData.statistics;
    const exams = studentDetailData.exams;
    const mistakeStats = studentDetailData.mistakeStats;

    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6 font-sans">
        
        <header className="mb-8 max-w-6xl mx-auto">
          <div className="bg-white rounded-2xl shadow-lg p-5 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
              <button 
                onClick={closeStudentDetail}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition font-bold shadow-sm group"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:-translate-x-1 transition-transform" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Geri Dön
              </button>
              <div>
                <h1 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                  👤 {studentDisplayName} - Öğrenci Analizi
                </h1>
                <p className="text-slate-500 text-sm">Detaylı Performans Raporu</p>
              </div>
            </div>
          </div>
        </header>

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

        <div className="max-w-6xl mx-auto mb-8 grid md:grid-cols-2 gap-6">
          
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
                          <span className="text-xs text-slate-500">{formatDate(exam.created_at)}</span>
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

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col h-[500px]">
            <div className="bg-red-600 p-4 text-white shrink-0">
              <h2 className="font-bold text-lg flex items-center gap-2">
                ❌ En Çok Hata Yapılanlar
                <span className="text-xs bg-white/20 px-2 py-1 rounded">{mistakeStats.length}</span>
              </h2>
              <p className="text-xs text-red-100 mt-1 opacity-80">Konunun hatalarını görmek için tıklayın</p>
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
                      className="p-4 hover:bg-red-50 transition flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-3">
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

        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: #f1f5f9;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>
      </div>
    );
  }

  // Ana Öğretmen Paneli
  return (
    <div className="min-h-screen bg-purple-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800"> Kurumsal Yönetim Paneli</h1>
            <p className="text-slate-500 mt-2">Öğrenci takibi ve yönetimi.</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition">
            Çıkış Yap
          </button>
        </header>

       <div className="mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 max-w-sm">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-full text-purple-600">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-700">Toplam Öğrenci</h3>
                    <p className="text-3xl font-extrabold text-purple-600">
                    {loading ? "..." : students.length}
                    </p>
                </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-purple-100 overflow-hidden">
          <div className="p-6 border-b border-purple-50">
            <h2 className="text-2xl font-bold text-slate-800">Kayıtlı Öğrenciler</h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-slate-500">Yükleniyor...</div>
          ) : students.length === 0 ? (
            <div className="p-8 text-center text-slate-500">Henüz kayıtlı öğrenci yok.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-purple-50 text-slate-600 uppercase text-sm font-semibold">
                  <tr>
                    <th className="px-6 py-4">Kullanıcı (Email'den)</th>
                    <th className="px-6 py-4">Email Adresi</th>
                    <th className="px-6 py-4">Kayıt Tarihi</th>
                    <th className="px-6 py-4 text-center">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-50">
                  {students.map((student) => (
                    <tr key={student.id} className="hover:bg-purple-50/50 transition">
                      <td className="px-6 py-4 font-medium text-slate-700 capitalize">
                        {getNameFromEmail(student.email)}
                      </td>
                      <td className="px-6 py-4 text-slate-600">
                        {student.email}
                      </td>
                      <td className="px-6 py-4 text-slate-500 text-sm">
                        {new Date(student.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button 
                            onClick={() => openStudentDetail(student.id)}
                            className="bg-blue-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-blue-600 transition text-sm inline-flex items-center gap-1"
                            title="Detay Gör"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                            </svg>
                            Detay
                          </button>

                          <button 
                            onClick={() => openMessageModal(student)}
                            className="bg-sky-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-sky-600 transition text-sm inline-flex items-center gap-1"
                            title="Mesaj Gönder"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                              <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                            </svg>
                            Mesaj
                          </button>

                          <button 
                            onClick={() => openHomeworkModal(student)}
                            className="bg-orange-500 text-white px-3 py-2 rounded-lg font-bold hover:bg-orange-600 transition text-sm inline-flex items-center gap-1"
                            title="Ödev Ata"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                              <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                            </svg>
                            Ödev
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* MESAJ MODALI */}
        {isMessageModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-gradient-to-r from-sky-500 to-blue-600 p-6 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  ✉️ Mesaj Gönder
                </h3>
                <p className="text-sky-100 text-sm mt-1">
                  Kime: <span className="font-bold">{getNameFromEmail(messageRecipient?.email
                  )}</span>
                </p>
              </div>
              <div className="p-6 bg-white">
                <textarea
                  value={messageContent}
                  onChange={(e) => setMessageContent(e.target.value)}
                  placeholder="Öğrenciye iletmek istediğiniz mesajı buraya yazın..."
                  className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none resize-none text-slate-700"
                ></textarea>
                <div className="flex justify-end gap-3 mt-6">
                  <button 
                    onClick={() => setIsMessageModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-bold transition"
                  >
                    Vazgeç
                  </button>
                  <button 
                    onClick={handleSendMessage}
                    disabled={sendingMessage}
                    className="px-5 py-2.5 rounded-lg bg-sky-600 text-white hover:bg-sky-700 font-bold shadow-lg shadow-sky-200 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {sendingMessage ? 'Gönderiliyor...' : 'Gönder 🚀'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ÖDEV MODALI */}
        {isHomeworkModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
              <div className="bg-gradient-to-r from-orange-500 to-red-500 p-6 text-white">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  📚 Ödev Ata
                </h3>
                <p className="text-orange-100 text-sm mt-1">
                  Öğrenci: <span className="font-bold">{getNameFromEmail(homeworkStudent?.email)}</span>
                </p>
              </div>
              
              <div className="p-6 bg-white space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Ödev Başlığı</label>
                  <input
                    type="text"
                    value={homeworkData.title}
                    onChange={(e) => setHomeworkData({...homeworkData, title: e.target.value})}
                    placeholder="Örn: Üslü Sayılar 50 Soru"
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Açıklama / Not</label>
                  <textarea
                    value={homeworkData.description}
                    onChange={(e) => setHomeworkData({...homeworkData, description: e.target.value})}
                    placeholder="Örn: Kaynak A, Sayfa 102-108 arası çözülecek."
                    className="w-full h-24 p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none"
                  ></textarea>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1">Son Teslim Tarihi</label>
                  <input
                    type="date"
                    value={homeworkData.due_date}
                    onChange={(e) => setHomeworkData({...homeworkData, due_date: e.target.value})}
                    className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100">
                  <button 
                    onClick={() => setIsHomeworkModalOpen(false)}
                    className="px-5 py-2.5 rounded-lg text-slate-600 hover:bg-slate-100 font-bold transition"
                  >
                    Vazgeç
                  </button>
                  <button 
                    onClick={handleAssignHomework}
                    disabled={assigningHomework}
                    className="px-5 py-2.5 rounded-lg bg-orange-600 text-white hover:bg-orange-700 font-bold shadow-lg shadow-orange-200 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {assigningHomework ? 'Atanıyor...' : 'Ödevi Ata 📅'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}