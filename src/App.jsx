import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard';

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Hata ayıklama verileri (Ekranda göstermek için)
  const [debugData, setDebugData] = useState({
    metadata: null,
    dbResult: null,
    dbError: null
  });

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchRole(session.user);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true);
        fetchRole(session.user);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchRole(user) {
    // 1. Metadata Kontrolü
    const metaRole = user.user_metadata?.role;
    
    // 2. Veritabanı Kontrolü
    const { data: dbData, error: dbError } = await supabase
      .from('profiles')
      .select('*') // Tüm satırı çekelim ki hata varsa görelim
      .eq('id', user.id)
      .single();

    // Debug verilerini kaydet
    setDebugData({
      metadata: user.user_metadata,
      dbResult: dbData,
      dbError: dbError
    });

    // Karar Mekanizması
    if (metaRole) {
      setUserRole(metaRole);
    } else if (dbData?.role) {
      setUserRole(dbData.role);
    }
    
    setLoading(false);
  }

  if (loading) return <div className="p-10 text-center">Yükleniyor...</div>;
  if (!session) return <Login />;

  // EĞER ROL BULUNURSA NORMAL ÇALIŞIR
  if (userRole === 'teacher') return <TeacherDashboard />;
  if (userRole === 'student') return <StudentDashboard />;

  // 🔴 SORUN VARSA BU EKRAN ÇIKAR (Bana buradaki bilgileri lazım)
  return (
    <div className="min-h-screen p-8 bg-gray-100 font-mono text-sm">
      <div className="max-w-3xl mx-auto bg-white p-6 rounded-lg shadow-xl border-l-4 border-red-500">
        <h2 className="text-2xl font-bold text-red-600 mb-4">🕵️ Hata Tanı Ekranı</h2>
        <p className="mb-4">Kullanıcı giriş yaptı ama rol bulunamadı. İşte detaylar:</p>

        <div className="space-y-4">
          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-bold text-blue-600">1. Kullanıcı ID</h3>
            <p>{session.user.id}</p>
          </div>

          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-bold text-purple-600">2. Metadata İçeriği (Login.jsx'ten gelmeli)</h3>
            <pre className="whitespace-pre-wrap text-xs mt-2">
              {JSON.stringify(debugData.metadata, null, 2)}
            </pre>
          </div>

          <div className="bg-gray-50 p-4 rounded border">
            <h3 className="font-bold text-orange-600">3. Veritabanı Sorgusu (Profiles tablosu)</h3>
            {debugData.dbError ? (
              <div className="text-red-600">
                <strong>HATA VAR:</strong> {JSON.stringify(debugData.dbError, null, 2)}
              </div>
            ) : (
              <pre className="whitespace-pre-wrap text-xs mt-2">
                {debugData.dbResult ? JSON.stringify(debugData.dbResult, null, 2) : "Tabloda bu ID ile kayıt bulunamadı (NULL)"}
              </pre>
            )}
          </div>
        </div>

        <button 
          onClick={() => supabase.auth.signOut()} 
          className="mt-6 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Çıkış Yap ve Tekrar Dene
        </button>
      </div>
    </div>
  );
}