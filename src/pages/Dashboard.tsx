import { motion } from 'motion/react';
import { 
  TrendingUp, 
  Home, 
  Gavel, 
  DollarSign,
  Hammer,
  Clock,
  ArrowUpRight,
  Target,
  BarChart2,
  Calendar,
  ChevronRight,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { Imovel, Faturamento, StatusArrematacao } from '../types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: properties } = useFirestore<Imovel>('imoveis');
  const { data: billing } = useFirestore<Faturamento>('faturamento');

  // Basic Stats
  const totalProperties = properties.length;
  const arrematados = properties.filter(p => p.status_arrematacao === StatusArrematacao.Arrematado);
  const vendidos = properties.filter(p => p.status_arrematacao === StatusArrematacao.Vendido);
  const emAnalise = properties.filter(p => p.status_arrematacao === StatusArrematacao.Analise);
  
  const totalArrematados = arrematados.length;
  const totalVendidos = vendidos.length;
  const totalEmAnalise = emAnalise.length;

  // Timeline Logic
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 days for more visibility

  const upcomingAuctions = properties
    .filter(p => p.origem === 'Leilão' && p.data_leilao && new Date(p.data_leilao) >= now)
    .sort((a, b) => new Date(a.data_leilao!).getTime() - new Date(b.data_leilao!).getTime())
    .slice(0, 4);

  // Financials
  const totalInvoiced = billing.reduce((sum, item) => sum + item.valor, 0);
  const totalCommission = billing.reduce((sum, item) => sum + (item.custo_corretagem || 0), 0);
  const netProfit = totalInvoiced - totalCommission;

  // Chart Data
  const pieData = [
    { name: 'Em Análise', value: totalEmAnalise, color: '#94a3b8' },
    { name: 'Arrematados', value: totalArrematados, color: '#10b981' },
    { name: 'Vendidos', value: totalVendidos, color: '#3b82f6' },
  ];

  const COLORS = ['#94a3b8', '#10b981', '#3b82f6', '#8b5cf6'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6 pb-12"
    >
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2">Dashboard</h1>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Gestão Consolidada de Ativos Imobiliários</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-[9px] font-black uppercase tracking-widest">Global</div>
          <div className="px-4 py-2 text-slate-400 text-[9px] font-black uppercase tracking-widest cursor-pointer hover:text-slate-600">Mensal</div>
        </div>
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* Total Equity / Performance - Large Primary Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8 bg-slate-900 dark:bg-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[320px]"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-white/10 dark:bg-black/5 rounded-2xl flex items-center justify-center text-white dark:text-black">
                <BarChart2 size={20} />
              </div>
              <p className="text-[10px] font-black text-white/50 dark:text-black/40 uppercase tracking-[0.3em]">Capital Realizado</p>
            </div>
            
            <h2 className="text-6xl md:text-7xl font-black text-white dark:text-slate-900 tracking-tighter leading-[0.8] mb-4">
              R$ {totalInvoiced.toLocaleString('pt-BR')}
            </h2>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
                <TrendingUp size={14} />
                <span className="text-[10px] font-black tracking-tight">+12.5%</span>
              </div>
              <p className="text-[9px] font-bold text-white/40 dark:text-black/30 uppercase tracking-widest italic">Comparado ao último trimestre</p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between mt-8 pt-8 border-t border-white/10 dark:border-black/5">
            <div className="flex items-center gap-8">
              <div>
                <p className="text-[8px] font-black text-white/40 dark:text-black/30 uppercase tracking-widest mb-1">Lucro Líquido</p>
                <p className="text-xl font-bold text-white dark:text-slate-900">R$ {netProfit.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-[8px] font-black text-white/40 dark:text-black/30 uppercase tracking-widest mb-1">Total Ativos</p>
                <p className="text-xl font-bold text-white dark:text-slate-900">{totalProperties}</p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/properties')}
              className="px-6 py-3 bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 rounded-2xl text-[10px] font-black text-white dark:text-black uppercase tracking-[0.2em] transition-all"
            >
              Ver Detalhes
            </button>
          </div>

          {/* Abstract background graphics */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
          <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        </motion.div>

        {/* Small Stats Column */}
        <div className="md:col-span-4 grid grid-rows-2 gap-6">
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="size-10 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 border border-blue-100 dark:border-blue-800">
                <Hammer size={20} />
              </div>
              <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">+ {totalArrematados} Arrematados</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Checklist Operacional</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Gestão Direta</h3>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <div className="size-10 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 border border-orange-100 dark:border-orange-800">
                <Target size={20} />
              </div>
              <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{totalEmAnalise} Oportunidades</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Pipeline de Aquisição</p>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Em Análise</h3>
            </div>
          </motion.div>
        </div>

        {/* Secondary Bento Row */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="md:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[380px]"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} className="text-blue-500" />
              Mix de Ativos
            </h3>
          </div>
          
          <div className="h-[220px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={85}
                  paddingAngle={8}
                  dataKey="value"
                  stroke="none"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '1rem', 
                    border: 'none', 
                    boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                    fontSize: '10px',
                    fontWeight: '900',
                    textTransform: 'uppercase'
                  }} 
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 mt-4">
            {pieData.map(item => (
              <div key={item.name} className="text-center">
                <p className="text-[16px] font-black text-slate-900 dark:text-white">{item.value}</p>
                <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest truncate">{item.name}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Upcoming Radar - Agenda Style */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={14} className="text-emerald-500" />
              Próximos Leilões (Radar)
            </h3>
            <button className="text-[9px] font-black text-blue-500 uppercase tracking-widest hover:underline">Calendário Completo</button>
          </div>

          <div className="space-y-4">
            {upcomingAuctions.length > 0 ? (
              upcomingAuctions.map((auction, idx) => (
                <div 
                  key={auction.id} 
                  onClick={() => navigate(`/properties/${auction.id}`)}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 rounded-[1.5rem] transition-all cursor-pointer border border-transparent hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-white dark:bg-slate-700 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-600 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors">
                      <p className="text-[10px] font-black text-emerald-500 group-hover:text-white leading-none">
                        {new Date(auction.data_leilao!).toLocaleDateString('pt-BR', { day: '2-digit' })}
                      </p>
                      <p className="text-[8px] font-black text-slate-400 group-hover:text-white/60 uppercase">
                        {new Date(auction.data_leilao!).toLocaleDateString('pt-BR', { month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight mb-1">{auction.endereco}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-white/40">{auction.comarca}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-white/20" />
                        <span className="text-[8px] font-black text-emerald-500 dark:text-emerald-400 group-hover:text-white/70">Mín: R$ {auction.valor_minimo?.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center justify-end gap-3 font-mono text-[10px] font-bold">
                    <Clock size={12} className="text-slate-400 group-hover:text-white/40" />
                    {new Date(auction.data_leilao!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <Gavel size={40} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-[9px] font-black uppercase tracking-widest">Nenhum leilão agendado no radar</p>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
