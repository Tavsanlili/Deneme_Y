import { useState } from 'react';
import { supabase } from './supabaseClient';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [isSignUp, setIsSignUp] = useState(false);
  
  // Varsayılan rol
  const [role, setRole] = useState('student');

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    // Basit validasyon
    if (password.length < 6) {
      setMessage({ text: '⚠️ Şifre en az 6 karakter olmalı!', type: 'warning' });
      setLoading(false);
      return;
    }

    try {
      if (isSignUp) {
        // --- KAYIT OLMA (DÜZELTİLDİ) ---
        
        // 1. Supabase Auth Kaydı + Metadata (Rol) Ekleme
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            // ✨ KRİTİK NOKTA: Rol bilgisini buraya ekliyoruz
            data: {
              role: role, // 'student' veya 'teacher'
              full_name: email.split('@')[0], // Opsiyonel: Mailin başını isim yap
            }
          }
        });
        
        if (error) throw error;

        // NOT: Burada artık manuel olarak 'profiles' tablosuna insert yapmıyoruz.
        // Çünkü SQL tarafında yazdığımız Trigger bunu otomatik hallediyor.

        // Kayıt sonrası otomatik giriş yapılmasını engelle (İsteğe bağlı)
        await supabase.auth.signOut();

        setMessage({ 
          text: '🎉 Kayıt başarılı! Lütfen e-postanızı onaylayın ve giriş yapın.', 
          type: 'success' 
        });
        
        // Formu temizle ve giriş moduna geç
        setTimeout(() => {
          setIsSignUp(false);
          setEmail('');
          setPassword('');
          setMessage({ text: '', type: '' });
        }, 2500);

      } else {
        // --- GİRİŞ YAPMA ---
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        
        if (error) throw error;
        
        setMessage({ text: '✅ Giriş başarılı! Yönlendiriliyorsunuz...', type: 'success' });
      }
    } catch (error) {
      let errorMessage = error.message;
      
      if (errorMessage.includes('Invalid login credentials')) {
        errorMessage = 'E-posta veya şifre hatalı!';
      } else if (errorMessage.includes('Email not confirmed')) {
        errorMessage = 'E-posta adresinizi doğrulamanız gerekiyor!';
      } else if (errorMessage.includes('User already registered')) {
        errorMessage = 'Bu e-posta zaten kayıtlı!';
      }
      
      setMessage({ text: `❌ ${errorMessage}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsSignUp(!isSignUp);
    setMessage({ text: '', type: '' });
    setEmail('');
    setPassword('');
  };

  const getMessageStyle = () => {
    switch(message.type) {
      case 'success':
        return 'bg-green-500/20 border-green-500 text-green-300';
      case 'error':
        return 'bg-red-500/20 border-red-500 text-red-300';
      case 'warning':
        return 'bg-yellow-500/20 border-yellow-500 text-yellow-300';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4 relative overflow-hidden">
      
      {/* Arka plan efektleri */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative bg-slate-800/80 backdrop-blur-xl p-8 md:p-10 rounded-3xl shadow-2xl border border-slate-700/50 w-full max-w-md">
        
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
            <span className="text-3xl">📚</span>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-center bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent mb-2">
          {isSignUp ? 'Hesap Oluştur' : 'Hoş Geldin!'}
        </h2>
        <p className="text-slate-400 text-center mb-8">
          {isSignUp 
            ? 'Rolünü seç ve kayıt ol' 
            : 'Öğrenme yolculuğuna devam et'}
        </p>

        <form onSubmit={handleAuth} className="space-y-5">
          
          {/* ROL SEÇİMİ */}
          {isSignUp && (
            <div className="grid grid-cols-2 gap-4 mb-2 animate-slideDown">
              <button
                type="button"
                onClick={() => setRole('student')}
                className={`p-3 rounded-xl border-2 font-bold transition-all duration-300 ${
                  role === 'student' 
                    ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)]' 
                    : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                }`}
              >
                👨‍🎓 Öğrenci
              </button>
              <button
                type="button"
                onClick={() => setRole('teacher')}
                className={`p-3 rounded-xl border-2 font-bold transition-all duration-300 ${
                  role === 'teacher' 
                    ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.5)]' 
                    : 'bg-slate-700/50 border-slate-600 text-slate-400 hover:bg-slate-700'
                }`}
              >
                👨‍🏫 Öğretmen
              </button>
            </div>
          )}

          <div>
            <label className="block text-slate-300 mb-2 text-sm font-semibold">
              📧 E-Posta
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-700/50 text-white border-2 border-slate-600 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
              placeholder="ornek@email.com"
            />
          </div>

          <div>
            <label className="block text-slate-300 mb-2 text-sm font-semibold">
              🔒 Şifre
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-4 rounded-xl bg-slate-700/50 text-white border-2 border-slate-600 focus:border-blue-500 outline-none transition-all placeholder:text-slate-500"
              placeholder="En az 6 karakter"
              minLength="6"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-95"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                İşleniyor...
              </span>
            ) : (
              isSignUp ? '🚀 Kayıt Ol' : '🔓 Giriş Yap'
            )}
          </button>
        </form>

        {message.text && (
          <div className={`mt-5 p-4 rounded-xl border-2 text-center text-sm font-semibold animate-slideDown ${getMessageStyle()}`}>
            {message.text}
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-slate-400 text-sm mb-2">
            {isSignUp ? 'Zaten hesabın var mı?' : 'Henüz hesabın yok mu?'}
          </p>
          <button
            onClick={switchMode}
            className="text-blue-400 hover:text-blue-300 font-semibold underline underline-offset-4 transition-colors"
          >
            {isSignUp ? '👉 Giriş Yap' : '👉 Kayıt Ol'}
          </button>
        </div>

        <div className="mt-6 p-4 bg-slate-700/30 rounded-xl border border-slate-600/50">
          <p className="text-slate-400 text-xs text-center">
            🔐 Verileriniz güvenli bir şekilde saklanır
          </p>
        </div>
      </div>

      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-10px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .animate-slideDown { animation: slideDown 0.3s ease-out; }
        .delay-1000 { animation-delay: 1s; }
      `}</style>
    </div>
  );
}