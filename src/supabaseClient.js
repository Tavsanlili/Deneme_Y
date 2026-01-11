import { createClient } from '@supabase/supabase-js'

// ✅ Senin Proje URL'in
const supabaseUrl = 'https://feypyxtohleemmapjjoo.supabase.co'

// ✅ Senin Anon Key'in (Herkese açık anahtar)
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZleXB5eHRvaGxlZW1tYXBqam9vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgxMDYzMDgsImV4cCI6MjA4MzY4MjMwOH0._nCDa5nW43fU7mlMrzTMgWp-3RxaoMkS3UkLh07jetY'

// ✅ Bağlantıyı oluşturup dışarıya açıyoruz
export const supabase = createClient(supabaseUrl, supabaseKey)