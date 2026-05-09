import { motion } from 'motion/react';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Home, 
  Gavel, 
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  Hammer
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { Imovel, Faturamento } from '../types';
import { 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: properties } = useFirestore<Imovel>('imoveis');
  const { data: billing } = useFirestore<Faturamento>('faturamento');

  const totalProperties = properties.length;
  const totalArrematados = properties.filter(p => p.status_arrematacao === 'Arrematado').length;
  const now = new Date();
  const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const propertiesWithLeilao = properties.filter(p => p.origem === 'Leilão' && p.data_leilao);

  const auctionsNext7Days = propertiesWithLeilao.filter(a => {
    const auctionDate = new Date(a.data_leilao!);
    return auctionDate >= now && auctionDate <= nextWeek;
  }).sort((a, b) => new Date(a.data_leilao!).getTime() - new Date(b.data_leilao!).getTime());

  const upcomingAuctionsCount = propertiesWithLeilao.filter(a => new Date(a.data_leilao!) > now).length;
  
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
            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">{stat.label}</p>
            <div className="flex items-end justify-between mt-2">
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <stat.icon className={cn("w-5 h-5", stat.textColor)} />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm h-[400px]">
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
      </div>
    </motion.div>
  );
}
