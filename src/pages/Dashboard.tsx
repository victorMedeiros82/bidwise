import { motion } from 'motion/react';
import { 
  TrendingUp, 
  TrendingDown, 
  Home, 
  Gavel, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Hammer
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { Leilao, Imovel, Faturamento } from '../types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { data: auctions } = useFirestore<Leilao>('leiloes');
  const { data: properties } = useFirestore<Imovel>('imoveis');
  const { data: billing } = useFirestore<Faturamento>('faturamento');

  const totalProperties = properties.length;
  const totalArrematados = properties.filter(p => p.status_arrematacao === 'Arrematado').length;
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const auctionsNext7Days = auctions.filter(a => {
    const auctionDate = new Date(a.data_leilao);
    return auctionDate >= now && auctionDate <= nextWeek;
  }).sort((a, b) => new Date(a.data_leilao).getTime() - new Date(b.data_leilao).getTime());

  const upcomingAuctionsCount = auctions.filter(a => new Date(a.data_leilao) > now).length;
  
  const totalInvoiced = billing.reduce((sum, item) => sum + item.valor, 0);

  const stats = [
    { label: 'Imóveis Totais', value: totalProperties, icon: Home, textColor: 'text-blue-500' },
    { label: 'Arrematados', value: totalArrematados, icon: Hammer, textColor: 'text-green-500' },
    { label: 'Leilões Futuros', value: upcomingAuctionsCount, icon: Gavel, textColor: 'text-orange-500' },
    { label: 'Total Faturamento', value: `R$ ${totalInvoiced.toLocaleString('pt-BR')}`, icon: DollarSign, textColor: 'text-purple-500' },
  ];

  const pieData = [
    { name: 'Apartamento', value: properties.filter(p => p.tipo_imovel === 'Apartamento').length },
    { name: 'Casa', value: properties.filter(p => p.tipo_imovel === 'Casa').length },
    { name: 'Terreno', value: properties.filter(p => p.tipo_imovel === 'Terreno').length },
    { name: 'Outros', value: properties.filter(p => !['Apartamento', 'Casa', 'Terreno'].includes(p.tipo_imovel || '')).length },
  ];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, idx) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.1 }}
            className="stat-card"
          >
            <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <stat.icon className={cn("w-5 h-5", stat.textColor)} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px]">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" />
            Distribuição de Ativos
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px] flex flex-col">
          <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
            <AlertTriangle size={18} className="text-amber-500" />
            Alertas & Oportunidades
          </h3>
          <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
            {auctionsNext7Days.length > 0 ? (
              <>
                <div className="p-3 bg-rose-50 dark:bg-rose-950/20 rounded-lg border border-rose-100 dark:border-rose-900/30 flex items-center gap-3 mb-2">
                  <AlertTriangle className="text-rose-600 dark:text-rose-400 shrink-0" size={16} />
                  <p className="text-[10px] text-rose-800 dark:text-rose-300 font-bold uppercase tracking-wider">
                    {auctionsNext7Days.length} Leilões nos próximos 7 dias
                  </p>
                </div>
                {auctionsNext7Days.map(a => {
                  const property = properties.find(p => p.id_leilao === a.id);
                  return (
                    <motion.div 
                      key={a.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 hover:border-blue-200 dark:hover:border-blue-900/50 transition-colors shadow-sm"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/40 rounded">
                          {new Date(a.data_leilao).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500">
                          {new Date(a.data_leilao).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                        {property?.endereco || 'Endereço Indisponível'}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <Gavel size={12} className="text-slate-400 dark:text-slate-500" />
                        <p className="text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-tighter">
                          Lance Mínimo: <span className="text-slate-700 dark:text-slate-300">R$ {a.valor_minimo?.toLocaleString('pt-BR') || '0,00'}</span>
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </>
            ) : upcomingAuctionsCount > 0 ? (
              <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-100 dark:border-amber-900/30 flex gap-3">
                <Gavel className="text-amber-600 dark:text-amber-400 shrink-0" size={18} />
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
                  <strong>{upcomingAuctionsCount}</strong> leilões programados futuramente. Verifique a agenda.
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-8">
                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                  <CheckCircle2 className="text-slate-300 dark:text-slate-600" size={24} />
                </div>
                <p className="text-xs text-slate-400 font-medium tracking-tight">Sem leilões iminentes.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
