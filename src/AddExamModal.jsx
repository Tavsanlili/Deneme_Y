import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';

export default function AddExamModal({ isOpen, onClose, onExamAdded }) {
  const [examName, setExamName] = useState('');
  const [lessons, setLessons] = useState([]);
  const [selectedTopics, setSelectedTopics] = useState([]); // Yanlış yapılan konuların ID'leri
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) fetchTopics();
  }, [isOpen]);

  async function fetchTopics() {
    // Sadece konu listesini çekiyoruz (seçtirmek için)
    const { data } = await supabase.from('lessons').select('id, name, topics(id, name)').order('id');
    setLessons(data || []);
  }

  // Konu seçme/çıkarma işlemi (Checkbox mantığı)
  const toggleTopic = (topicId) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) ? prev.filter(id => id !== topicId) : [...prev, topicId]
    );
  };

  async function handleSave() {
    if (!examName) return alert("Deneme adı girmelisiniz!");
    setLoading(true);

    try {
      // 1. Denemeyi Kaydet
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .insert([{ name: examName }])
        .select()
        .single();

      if (examError) throw examError;

      // 2. Eğer yanlış konu seçildiyse onları kaydet
      if (selectedTopics.length > 0) {
        const mistakesToInsert = selectedTopics.map(topicId => ({
          exam_id: examData.id,
          topic_id: topicId,
          wrong_count: 1 // Şimdilik her seçim 1 yanlış sayılsın
        }));

        const { error: mistakesError } = await supabase
          .from('exam_mistakes')
          .insert(mistakesToInsert);
        
        if (mistakesError) throw mistakesError;
      }

      alert("✅ Deneme ve Hatalar Kaydedildi!");
      setExamName('');
      setSelectedTopics([]);
      onExamAdded(); // Ana sayfayı yenilemek için tetikleyici
      onClose();

    } catch (error) {
      console.error(error);
      alert("Hata oluştu!");
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-2xl font-bold text-slate-800">📝 Yeni Deneme Ekle</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-2xl">×</button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          
          <div className="mb-6">
            <label className="block text-sm font-bold text-slate-700 mb-2">Deneme Adı / Yayını</label>
            <input 
              type="text" 
              value={examName}
              onChange={(e) => setExamName(e.target.value)}
              className="w-full p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 outline-none font-semibold"
              placeholder="Örn: 3D Türkiye Geneli - 1"
            />
          </div>

          <h3 className="text-md font-bold text-red-500 mb-3 border-b pb-2">❌ Hangi Konulardan Yanlışın Var?</h3>
          
          <div className="grid md:grid-cols-2 gap-4">
            {lessons.map(lesson => (
              <div key={lesson.id} className="border rounded-xl p-3 bg-slate-50">
                <h4 className="font-bold text-slate-700 mb-2 text-sm">{lesson.name}</h4>
                <div className="space-y-1">
                  {lesson.topics?.map(topic => (
                    <label key={topic.id} className="flex items-center gap-2 cursor-pointer hover:bg-white p-1 rounded transition">
                      <input 
                        type="checkbox" 
                        checked={selectedTopics.includes(topic.id)} 
                        onChange={() => toggleTopic(topic.id)}
                        className="w-4 h-4 accent-red-500"
                      />
                      <span className={`text-sm ${selectedTopics.includes(topic.id) ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                        {topic.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3">
          <button onClick={onClose} className="px-5 py-2 text-slate-600 font-bold hover:bg-slate-200 rounded-lg">İptal</button>
          <button 
            onClick={handleSave} 
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-lg disabled:opacity-50"
          >
            {loading ? 'Kaydediliyor...' : 'Kaydet ve Analiz Et'}
          </button>
        </div>
      </div>
    </div>
  );
}