import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function NetChart({ exams }) {
  // Veriyi grafiğe uygun hale getiriyoruz
  // 1. Tarihe göre eskiden yeniye sırala (Reverse)
  // 2. Neti hesapla
  const data = [...exams].reverse().map(exam => {
    const net = exam.correct_count - (exam.wrong_count / 4);
    return {
      name: new Date(exam.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'numeric' }),
      net: parseFloat(net.toFixed(2)), // Virgülden sonra 2 hane
      examName: exam.name
    };
  });

  if (data.length < 2) {
    return (
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[300px] flex flex-col items-center justify-center text-slate-400">
        <p className="text-4xl mb-2">📉</p>
        <p>Grafik için en az 2 deneme girmelisin.</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 h-[350px] flex flex-col">
      <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        📈 Net Gelişim Grafiği
      </h2>
      
      <div className="flex-1 w-full min-w-0"> {/* min-w-0 taşmayı önler */}
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
            <XAxis 
              dataKey="name" 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              dy={10}
            />
            <YAxis 
              tick={{ fontSize: 12, fill: '#64748b' }} 
              axisLine={false}
              tickLine={false}
              domain={['auto', 'auto']} // Grafiği veri aralığına göre başlat
            />
            <Tooltip 
              contentStyle={{ borderRadius: '10px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
              cursor={{ stroke: '#cbd5e1', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="net" 
              stroke="#2563eb" 
              strokeWidth={3}
              dot={{ r: 4, fill: '#2563eb', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}