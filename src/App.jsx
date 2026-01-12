import { useState, useEffect } from 'react';
import { supabase } from './supabaseClient';
import Login from './Login';
import StudentDashboard from './StudentDashboard';
import TeacherDashboard from './TeacherDashboard'; // 👈 Dosya adının doğru olduğundan emin ol

export default function App() {
  const [session, setSession] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Mevcut oturumu al
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Oturum varsa rolü çekmeye git
        checkUserRole(session.user.id);
      } else {
        // Oturum yoksa yüklemeyi bitir (Login ekranı açılacak)
        setLoading(false);
      }
    });

    // 2. Oturum değişikliklerini (Giriş/Çıkış) dinle
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        setLoading(true); // Giriş yapıldıysa tekrar yükleniyor moduna al
        checkUserRole(session.user.id);
      } else {
        setUserRole(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkUserRole(userId) {
    try {
      console.log("Rol kontrol ediliyor..."); // Konsoldan takip etmek için
      
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error("Rol çekme hatası:", error);
        // Hata varsa varsayılan olarak öğrenci yapmayalım, null kalsın
      }

      if (data) {
        console.log("Bulunan Rol:", data.role);
        setUserRole(data.role);
      }
    } catch (error) {
      console.error('Beklenmedik hata:', error);
    } finally {
      setLoading(false); // Her halükarda yüklemeyi bitir
    }
  }

  // --- EKRAN YÖNETİMİ ---

  // 1. Hala yükleniyorsa bekleme ekranı göster (Önemli olan burası!)
  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 font-sans">
        <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-bold text-lg animate-pulse">Sistem Yükleniyor...</p>
      </div>
    );
  }

  // 2. Oturum yoksa Login ekranı
  if (!session) {
    return <Login />;
  }

  // 3. Oturum var ama Rol hala yoksa (Veritabanı hatası vs.)
  if (!userRole) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50 p-6 text-center">
        <div>
          <h2 className="text-2xl font-bold text-red-600 mb-2">⚠️ Yetki Hatası</h2>
          <p className="text-slate-600 mb-4">Kullanıcı rolünüz belirlenemedi. Lütfen çıkış yapıp tekrar deneyin.</p>
          <button 
            onClick={() => supabase.auth.signOut()} 
            className="bg-red-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-700"
          >
            Çıkış Yap
          </button>
        </div>
      </div>
    );
  }

  // 4. ROL KONTROLÜ (Doğru Yönlendirme)
  if (userRole === 'teacher') {
    return <TeacherDashboard />;
  } else {
    return <StudentDashboard />;
  }
}