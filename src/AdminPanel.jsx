import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

function AdminPanel() {
  const [lessons, setLessons] = useState([]);
  const [topics, setTopics] = useState([]);
  const [progress, setProgress] = useState({});
  
  const [selectedLessonId, setSelectedLessonId] = useState('');
  const [selectedTopicId, setSelectedTopicId] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Dersleri yükle
  useEffect(() => {
    fetchLessons();
    fetchAllProgress();
  }, []);

  // Ders değiştiğinde konuları yükle
  useEffect(() => {
    if (selectedLessonId) {
      fetchTopics(selectedLessonId);
    } else {
      setTopics([]);
      setSelectedTopicId('');
    }
  }, [selectedLessonId]);

  const fetchLessons = async () => {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .order('id'); // DÜZELTME: order_index yerine id kullanıldı
    
    if (error) {
      console.error('Dersler yüklenemedi:', error);
    } else {
      setLessons(data || []);
    }
  };

  const fetchTopics = async (lessonId) => {
    const { data, error } = await supabase
      .from('topics')
      .select('*')
      .eq('lesson_id', lessonId)
      .order('id'); // DÜZELTME: order_index yerine id kullanıldı
    
    if (error) {
      console.error('Konular yüklenemedi:', error);
    } else {
      setTopics(data || []);
    }
  };

  const fetchAllProgress = async () => {
    const { data, error } = await supabase
      .from('student_progress')
      .select('topic_id, status');
    
    if (error) {
      console.error('İlerleme yüklenemedi:', error);
    } else {
      const progressMap = {};
      data?.forEach(item => {
        progressMap[item.topic_id] = item.status;
      });
      setProgress(progressMap);
    }
  };

  const handleSave = async () => {
    if (!selectedTopicId || !selectedStatus) {
      setMessage('⚠️ Lütfen konu ve renk seçin!');
      return;
    }

    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('student_progress')
      .upsert({
        topic_id: selectedTopicId,
        status: parseInt(selectedStatus)
      }, {
        onConflict: 'topic_id' 
      });

    setLoading(false);

    if (error) {
      setMessage('❌ Kayıt başarısız: ' + error.message);
      console.error(error);
    } else {
      setMessage('✅ Başarıyla kaydedildi!');
      fetchAllProgress(); // Listeyi güncelle
      setTimeout(() => setMessage(''), 2000);
    }
  };

  const getStatusColor = (status) => {
    switch(status) {
      case 1: return '🔴 Kırmızı';
      case 2: return '🟡 Sarı';
      case 3: return '🟢 Yeşil';
      default: return '⚪ Belirlenmemiş';
    }
  };

  const getStatusBadgeClass = (status) => {
    switch(status) {
      case 1: return 'bg-red-500';
      case 2: return 'bg-yellow-500';
      case 3: return 'bg-green-500';
      default: return 'bg-gray-300';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8 font-sans text-white flex justify-center">
      <div className="w-full max-w-4xl">
        <h1 className="text-3xl font-bold text-blue-400 mb-8 text-center">
          📊 Admin Panel - Öğrenci İlerlemesi
        </h1>

        {/* Form Bölümü */}
        <div className="bg-slate-800 rounded-xl shadow-2xl border border-slate-700 p-8 mb-8">
          <h2 className="text-xl font-semibold mb-6 text-white border-b border-slate-600 pb-2">Yeni İlerleme Kaydı</h2>
          
          <div className="space-y-6">
            {/* Ders Seç */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                1️⃣ Ders Seç
              </label>
              <select
                value={selectedLessonId}
                onChange={(e) => setSelectedLessonId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Ders Seçin --</option>
                {lessons.map(lesson => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name} {/* DÜZELTME: title yerine name */}
                  </option>
                ))}
              </select>
            </div>

            {/* Konu Seç */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                2️⃣ Konu Seç
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                disabled={!selectedLessonId}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">-- Konu Seçin --</option>
                {topics.map(topic => (
                  <option key={topic.id} value={topic.id}>
                    {topic.name} {/* DÜZELTME: title yerine name */}
                    {progress[topic.id] ? ` (${getStatusColor(progress[topic.id])})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Durum Seç */}
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">
                3️⃣ Renk/Durum Seç
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full bg-slate-900 border border-slate-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">-- Durum Seçin --</option>
                <option value="1">🔴 Kırmızı (Eksik)</option>
                <option value="2">🟡 Sarı (Tekrar Lazım)</option>
                <option value="3">🟢 Yeşil (Tamam)</option>
              </select>
            </div>

            {/* Kaydet Butonu */}
            <button
              onClick={handleSave}
              disabled={loading || !selectedTopicId || !selectedStatus}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-900/50 transition transform hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              {loading ? '💾 Kaydediliyor...' : '💾 Durumu Kaydet'}
            </button>

            {/* Mesaj */}
            {message && (
              <div className={`p-4 rounded-lg text-center font-bold animate-pulse ${
                message.includes('✅') ? 'bg-green-900/50 text-green-300 border border-green-500' : 'bg-red-900/50 text-red-300 border border-red-500'
              }`}>
                {message}
              </div>
            )}
          </div>
        </div>

        {/* ÖZET BİLGİ */}
        <div className="bg-slate-800 rounded-xl p-6 text-center text-slate-400">
           ℹ️ Not: Kayıt yaptıktan sonra sonuçları görmek için <b>Öğrenci Moduna</b> geçebilirsiniz.
        </div>

      </div>
    </div>
  );
}

export default AdminPanel;