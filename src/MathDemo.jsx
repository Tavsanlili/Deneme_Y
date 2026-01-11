import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient';

export default function MathDemo() {
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchMathData();
  }, []);

  async function fetchMathData() {
    try {
      setLoading(true);
      // Supabase'den Matematik derslerini ve konularını çek
      const { data, error } = await supabase
        .from('lessons')
        .select(`
          id,
          name,
          topics (
            id,
            name
          )
        `)
        .ilike('name', '%Matematik%') 
        .order('name', { ascending: false });

      if (error) throw error;
      setLessons(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="p-10 text-center text-blue-600 font-bold">Veriler Yükleniyor...</div>;
  if (error) return <div className="p-10 text-center text-red-500">Hata: {error}</div>;

  return (
    <div className="min-h-screen bg-slate-50 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold text-slate-800">Matematik Takip Sistemi</h1>
          <p className="text-slate-500">Supabase Veritabanı Bağlantısı Aktif ✅</p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {lessons.map((lesson) => (
            <div key={lesson.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="bg-blue-600 p-4">
                <h2 className="text-white font-bold text-xl flex justify-between">
                  {lesson.name}
                  <span className="text-xs bg-blue-500 px-2 py-1 rounded text-white/80">{lesson.topics?.length || 0} Konu</span>
                </h2>
              </div>
              <div className="p-4 h-96 overflow-y-auto">
                <ul className="space-y-2">
                  {lesson.topics?.sort((a,b) => a.id - b.id).map((topic, index) => (
                    <li key={topic.id} className="flex items-center p-2 hover:bg-slate-50 rounded transition group cursor-pointer">
                      <span className="text-slate-400 font-mono text-sm mr-3 w-6">{index + 1}.</span>
                      <span className="text-slate-700 font-medium group-hover:text-blue-600 transition">{topic.name}</span>
                      <div className="ml-auto w-3 h-3 rounded-full bg-slate-200 group-hover:bg-blue-200"></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}