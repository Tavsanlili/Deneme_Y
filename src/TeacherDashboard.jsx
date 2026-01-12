import { supabase } from './supabaseClient';

export default function OrganizationDashboard() {
  
  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.reload();
  }

  return (
    <div className="min-h-screen bg-purple-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        
        <header className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-4xl font-extrabold text-slate-800">🏢 Kurumsal Yönetim Paneli</h1>
            <p className="text-slate-500 mt-2">Öğrencilerinizi buradan takip edebilirsiniz.</p>
          </div>
          <button onClick={handleLogout} className="bg-red-500 text-white px-6 py-2 rounded-lg font-bold hover:bg-red-600 transition">
            Çıkış Yap
          </button>
        </header>

        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100">
            <h3 className="text-xl font-bold text-slate-700 mb-2">Toplam Öğrenci</h3>
            <p className="text-4xl font-extrabold text-purple-600">0</p>
          </div>
          
          <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100">
            <h3 className="text-xl font-bold text-slate-700 mb-2">Aktif Denemeler</h3>
            <p className="text-4xl font-extrabold text-blue-600">0</p>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-lg border border-purple-100 flex items-center justify-center">
             <p className="text-slate-400 font-medium">Yakında buraya öğrenci listesi gelecek...</p>
          </div>
        </div>

      </div>
    </div>
  );
}