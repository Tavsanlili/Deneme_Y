import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function AddExamModal({ isOpen, onClose, onExamAdded }) {
  const [examName, setExamName] = useState('');
  
  // Genel Sonuçlar
  const [stats, setStats] = useState({ correct: '', wrong: '', empty: '' });

  const [lessons, setLessons] = useState([]);
  
  // ✨ YENİ: Hangi dersin konularını gösterelim?
  const [selectedLessonId, setSelectedLessonId] = useState('');

  // Yanlış sayıları: { 'topic_id': sayi }
  const [topicMistakes, setTopicMistakes] = useState({}); 
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchLessons();
      // Formu sıfırla
      setExamName('');
      setStats({ correct: '', wrong: '', empty: '' }); 
      setTopicMistakes({});
      setSelectedLessonId('');
    }
  }, [isOpen]);

  async function fetchLessons() {
    // Dersleri ve altındaki konuları çekiyoruz
    const { data } = await supabase
      .from('lessons')
      .select('id, name, topics(id, name)')
      .order('id');
    setLessons(data || []);
  }

  // Yanlış sayısını güncelleme
  const updateMistakeCount = (topicId, amount) => {
    setTopicMistakes(prev => {
      const currentCount = prev[topicId] || 0;
      const newCount = currentCount + amount;

      if (newCount <= 0) {
        const { [topicId]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [topicId]: newCount };
    });
  };

  // Şu an seçili olan dersin konularını bul
  const currentLesson = lessons.find(l => l.id == selectedLessonId);

  // Yanlış girilen konuların özet listesi (Görsel amaçlı)
  const mistakeSummary = Object.keys(topicMistakes).map(tId => {
    // Hangi ders ve konu olduğunu bulalım
    for (let lesson of lessons) {
      const topic = lesson.topics.find(t => t.id == tId);
      if (topic) return { lessonName: lesson.name, topicName: topic.name, count: topicMistakes[tId] };
    }
    return null;
  }).filter(Boolean);

  async function handleSave() {
    if (!examName) return alert("Deneme adı girmelisiniz!");
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Oturum hatası"); setLoading(false); return; }

      // 1. Denemeyi Kaydet
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert([{ 
          user_id: user.id,
          name: examName,
          correct_count: parseInt(stats.correct) || 0,
          wrong_count: parseInt(stats.wrong) || 0,
          empty_count: parseInt(stats.empty) || 0
        }])
        .select()
        .single();

      if (examError) throw examError;

      // 2. Hataları Kaydet
      const mistakeKeys = Object.keys(topicMistakes);
      if (mistakeKeys.length > 0) {
        const mistakesToInsert = mistakeKeys.map(topicId => ({
          exam_id: examData.id,
          topic_id: topicId,
          wrong_count: topicMistakes[topicId]
        }));

        const { error: mistakesError } = await supabase.from('exam_mistakes').insert(mistakesToInsert);
        if (mistakesError) throw mistakesError;
      }

      alert("✅ Deneme Kaydedildi!");
      onExamAdded(); 
      onClose();

    } catch (error) {
      console.error(error);
      alert("Hata: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-2xl">
          <h2 className="text-2xl font-bold text-slate-800">📝 Yeni Deneme Ekle</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">×</button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          {/* Deneme Adı */}
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Deneme Adı</label>
            <input 
              type="text" 
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold text-lg"
              placeholder="Örn: 3D Türkiye Geneli - 1"
            />
          </div>

          {/* İstatistikler */}
          <div className="grid grid-cols-3 gap-4 mb-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div>
              <label className="block text-xs font-bold text-green-600 mb-1 uppercase">Doğru</label>
              <input type="number" value={stats.correct} onChange={(e) => setStats({...stats, correct: e.target.value})} className="w-full p-2 border-2 border-green-100 rounded-lg text-center font-bold text-green-700" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-red-600 mb-1 uppercase">Yanlış</label>
              <input type="number" value={stats.wrong} onChange={(e) => setStats({...stats, wrong: e.target.value})} className="w-full p-2 border-2 border-red-100 rounded-lg text-center font-bold text-red-700" placeholder="0" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-1 uppercase">Boş</label>
              <input type="number" value={stats.empty} onChange={(e) => setStats({...stats, empty: e.target.value})} className="w-full p-2 border-2 border-slate-200 rounded-lg text-center font-bold text-slate-600" placeholder="0" />
            </div>
          </div>

          <hr className="border-slate-100 mb-6" />

          {/* ✨ YENİ BÖLÜM: DERS SEÇİMİ VE KONULAR */}
          <h3 className="text-md font-bold text-slate-800 mb-3 flex items-center gap-2">
            ❌ Yanlışlarını Gir
          </h3>

          {/* 1. DERS SEÇİM DROPDOWN */}
          <div className="mb-4">
            <select 
              className="w-full p-3 border-2 border-slate-200 rounded-xl font-bold text-slate-700 focus:border-blue-500 outline-none"
              value={selectedLessonId}
              onChange={(e) => setSelectedLessonId(e.target.value)}
            >
              <option value="">🔻 Hangi Dersten Yanlışın Var? (Seçiniz)</option>
              {lessons.map(lesson => (
                <option key={lesson.id} value={lesson.id}>{lesson.name}</option>
              ))}
            </select>
          </div>

          {/* 2. SEÇİLEN DERSİN KONULARI (Sadece seçim yapınca açılır) */}
          {currentLesson && (
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in-down">
              <h4 className="font-bold text-blue-600 mb-3 border-b pb-2">{currentLesson.name} Konuları</h4>
              <div className="grid md:grid-cols-2 gap-3">
                {currentLesson.topics?.map(topic => {
                  const currentCount = topicMistakes[topic.id] || 0;
                  const isSelected = currentCount > 0;

                  return (
                    <div key={topic.id} className={`flex items-center justify-between p-2 rounded-lg transition ${isSelected ? 'bg-red-100 border border-red-200' : 'bg-white border border-slate-100 hover:border-blue-300'}`}>
                      <span className={`text-sm flex-1 ${isSelected ? 'text-red-700 font-bold' : 'text-slate-600'}`}>{topic.name}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => updateMistakeCount(topic.id, -1)} disabled={currentCount === 0} className="w-6 h-6 bg-white border rounded text-slate-500 hover:text-red-600 disabled:opacity-50 font-bold">-</button>
                        <span className={`w-4 text-center text-sm font-bold ${currentCount > 0 ? 'text-red-600' : 'text-slate-300'}`}>{currentCount}</span>
                        <button onClick={() => updateMistakeCount(topic.id, 1)} className="w-6 h-6 bg-white border rounded text-blue-600 hover:bg-blue-50 font-bold">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 3. EKLEME ÖZETİ (Farklı derslere geçince unutulmasın diye) */}
          {mistakeSummary.length > 0 && (
            <div className="mt-6">
              <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Eklenecek Hatalar Listesi:</h4>
              <div className="flex flex-wrap gap-2">
                {mistakeSummary.map((item, idx) => (
                  <span key={idx} className="bg-red-50 border border-red-100 text-red-700 text-xs px-2 py-1 rounded-lg font-bold flex items-center gap-1">
                    {item.lessonName} - {item.topicName} 
                    <span className="bg-red-200 text-red-800 px-1.5 rounded-md ml-1">{item.count}</span>
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg transition">İptal</button>
          <button onClick={handleSave} disabled={loading} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-50 transition">
            {loading ? 'Kaydediliyor...' : '💾 Kaydet'}
          </button>
        </div>
      </div>
    </div>
  );
}