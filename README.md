🚀 Öğrenci Takip ve Koçluk Sistemi (LMS)
Bu proje, öğretmenlerin veya eğitim koçlarının öğrencilerini detaylı bir şekilde takip edebilmesi, analiz yapabilmesi ve iletişim kurabilmesi için geliştirilmiş modern bir web uygulamasıdır.

React ve Supabase teknolojileri kullanılarak geliştirilmiştir. Gerçek zamanlı veri tabanı, kimlik doğrulama (Auth) ve modern arayüz tasarımı içerir.

🌟 Özellikler
Uygulama iki farklı kullanıcı rolüne (Öğretmen ve Öğrenci) göre özelleştirilmiş deneyimler sunar:

👨‍🏫 Öğretmen Paneli (Teacher Dashboard)
Öğrenci Yönetimi: Kayıtlı öğrencilerin listelenmesi ve profillerinin görüntülenmesi.

Detaylı Analiz: Öğrencinin girdiği denemelerin grafiksel analizi, net ortalamaları ve konu bazlı eksiklerinin tespiti.

Mesajlaşma Sistemi: Öğrencilere platform üzerinden direkt mesaj gönderme.

Ödev Atama: Öğrencilere tarih ve açıklama belirterek ödev atama ve durum takibi (Bekliyor/Tamamlandı).

Genel İstatistikler: Kurumdaki toplam öğrenci sayısı gibi özet veriler.

👨‍🎓 Öğrenci Paneli (Student Dashboard)
Deneme Takibi: Deneme sınavı sonuçlarının (Doğru, Yanlış, Net) sisteme girilmesi.

Görsel Grafikler: Net artış/azalış grafiği ile performans takibi.

Hata Analizi (Smart Analysis): Hangi dersten ve hangi konudan ne kadar yanlış yapıldığının otomatik hesaplanması ve "Riskli Konular"ın listelenmesi.

Bildirim Sistemi: Öğretmenden gelen yeni mesajlar ve ödevler için kırmızı bildirim rozetleri (Notification Badge).

Ödev Yönetimi: Atanan ödevleri görüntüleme ve "Tamamla" butonu ile durumu güncelleme.

🛠️ Teknolojiler
Frontend: React.js (Vite)

Styling: Tailwind CSS (Modern ve Responsive Tasarım)

Backend / Database: Supabase (PostgreSQL)

Authentication: Supabase Auth

Charts: Recharts (Veri görselleştirme için)

Icons: Heroicons

⚙️ Kurulum ve Çalıştırma
Projeyi yerel ortamınızda çalıştırmak için aşağıdaki adımları izleyin:

Depoyu Kopyalayın:

Bash

git clone https://github.com/kullaniciadi/proje-adi.git
cd proje-adi
Bağımlılıkları Yükleyin:

Bash

npm install
Supabase Ayarları:

Supabase üzerinde bir proje oluşturun.

Ana dizinde .env dosyası oluşturun ve API anahtarlarınızı ekleyin:

Kod snippet'i

VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
Uygulamayı Başlatın:

Bash

npm run dev
🗄️ Veritabanı Kurulumu (SQL)
Projenin çalışması için Supabase SQL Editöründe aşağıdaki tabloları oluşturmanız gerekmektedir:

SQL

-- Öğrenci Profilleri
create table public.profiles (
  id uuid references auth.users not null,
  email text,
  role text default 'student', -- 'teacher' veya 'student'
  created_at timestamp with time zone default timezone('utc'::text, now()),
  primary key (id)
);

-- Mesajlar
create table public.messages (
  id uuid default gen_random_uuid() primary key,
  sender_id uuid references auth.users(id),
  receiver_id uuid references auth.users(id),
  content text,
  is_read boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Ödevler
create table public.homeworks (
  id uuid default gen_random_uuid() primary key,
  teacher_id uuid references auth.users(id),
  student_id uuid references auth.users(id),
  title text,
  description text,
  due_date date,
  status text default 'pending',
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- (Diğer tablolar: exams, exam_mistakes, lessons, topics...)
🤝 Katkıda Bulunma
Bu projeyi forklayın.

Yeni bir özellik dalı (feature branch) oluşturun (git checkout -b yeni-ozellik).

Değişikliklerinizi commit yapın (git commit -m 'Yeni özellik eklendi').

Dalınızı pushlayın (git push origin yeni-ozellik).

Bir Pull Request oluşturun.

⭐ İletişim
Geliştirici: Koray Tavşanlılı 05394578705