import { useState } from 'react';
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
  Activity,
  ChevronDown,
  ChevronUp,
  Info,
  Plus
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useFirestore } from '../hooks/useFirestore';
import { Imovel, Faturamento, StatusArrematacao, OrigemImovel, CustoAquisicao, CustoReforma, Holding, TipoArrematacao } from '../types';
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
  CartesianGrid,
  BarChart,
  Bar
} from 'recharts';
import { cn } from '../lib/utils';
import { auth } from '../lib/firebase';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: properties } = useFirestore<Imovel>('imoveis');
  const { data: billing } = useFirestore<Faturamento>('faturamento');
  const { data: custosAquisicao } = useFirestore<CustoAquisicao>('custos_aquisicao');
  const { data: custosReforma } = useFirestore<CustoReforma>('custos_reforma');
  const { data: holding } = useFirestore<Holding>('holding');

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
    .filter(p => (p.origem === OrigemImovel.LeilaoJudicial || p.origem === OrigemImovel.LeilaoExtrajudicial) && p.data_leilao && new Date(p.data_leilao) >= now)
    .sort((a, b) => new Date(a.data_leilao!).getTime() - new Date(b.data_leilao!).getTime())
    .slice(0, 4);

  // Financials - Dynamic Portfolio-wide Calculation
  let totalInvested = 0;
  let totalInvoiced = 0;
  let netProfit = 0;

  const propertyIdsSet = new Set(properties.map(p => p.id));

  properties.forEach(p => {
    const isAcquired = p.status_arrematacao === StatusArrematacao.Arrematado ||
      p.status_arrematacao === StatusArrematacao.Vendido ||
      p.status_arrematacao === StatusArrematacao.Alugado;

    // Incorporate both the arrematacao base value and specific acquisition expenses
    const baseAquisicao = p.valor_arrematacao || p.valor_minimo || 0;
    const pAquisicao = baseAquisicao + custosAquisicao.filter(c => c.id_imovel === p.id).reduce((sum, c) => sum + (c.valor || 0), 0);
    const pReforma = custosReforma.filter(r => r.id_imovel === p.id).reduce((sum, r) => sum + (r.valor_real || r.orcamento || 0), 0);
    const pHolding = holding.filter(h => h.id_imovel === p.id).reduce((sum, h) => sum + (h.valor_mensal || 0), 0);
    const pBilling = billing.filter(f => f.id_imovel === p.id);

    const pBillingBruto = pBilling.reduce((sum, f) => sum + (f.valor || 0), 0);
    const pComissoes = pBilling.reduce((sum, f) => sum + (f.custo_corretagem || 0), 0);
    const pFaturamentoLiquido = pBillingBruto - pComissoes;

    if (isAcquired) {
      const pSaldoDevedor = p.tipo_arrematacao === TipoArrematacao.Financiada ? (p.saldo_devedor || 0) : 0;
      const pEntradaEfetiva = p.tipo_arrematacao === TipoArrematacao.Financiada
        ? Math.max(0, baseAquisicao - pSaldoDevedor)
        : baseAquisicao;
      const pTotalInvestido = pEntradaEfetiva + (pAquisicao - baseAquisicao) + pReforma + pHolding;
      totalInvested += pTotalInvestido;
      totalInvoiced += pBillingBruto;

      if (pFaturamentoLiquido > 0) {
        // Sold or Alugado Property
        const baseReceita = pFaturamentoLiquido;
        const custosBaseIR = pAquisicao + pReforma;
        const lucroBruto = baseReceita - custosBaseIR;
        const impostoRenda = lucroBruto > 0 ? lucroBruto * 0.15 : 0;
        const lucroLiquido = baseReceita - custosBaseIR - pHolding - impostoRenda;
        netProfit += lucroLiquido;
      } else {
        // Ongoing property with accumulated costs
        const totalCustosPendente = pTotalInvestido;
        netProfit -= totalCustosPendente;
      }
    }
  });

  // Handle orphan faturamentos if any (only genuinely without any id_imovel; ignore billings of deleted properties)
  const orphanBilling = billing.filter(f => !f.id_imovel);
  const orphanBillingBruto = orphanBilling.reduce((sum, f) => sum + (f.valor || 0), 0);
  const orphanComissoes = orphanBilling.reduce((sum, f) => sum + (f.custo_corretagem || 0), 0);

  totalInvoiced += orphanBillingBruto;
  netProfit += (orphanBillingBruto - orphanComissoes);

  const portfolioRoi = totalInvested > 0 ? (netProfit / totalInvested) * 100 : 0;
  const hasOrphanBilling = orphanBilling.length > 0;
  const orphanNetProfit = orphanBillingBruto - orphanComissoes;

  const [showCalculationDetails, setShowCalculationDetails] = useState(false);

  // Detailed breakdowns for each property
  const detailedProperties: Array<{
    id: string;
    codigo: string;
    endereco: string;
    status: string;
    valorArrematacao: number;
    custosExtras: number;
    totalInvested: number;
    faturamentoLiquido: number;
    impostoRenda: number;
    lucroLiquido: number;
    roi: number;
  }> = [];

  properties.forEach(p => {
    const isAcquired = p.status_arrematacao === StatusArrematacao.Arrematado ||
      p.status_arrematacao === StatusArrematacao.Vendido ||
      p.status_arrematacao === StatusArrematacao.Alugado;

    const baseAquisicao = p.valor_arrematacao || p.valor_minimo || 0;
    const pAquisicaoExt = custosAquisicao.filter(c => c.id_imovel === p.id).reduce((sum, c) => sum + (c.valor || 0), 0);
    const pAquisicao = baseAquisicao + pAquisicaoExt;
    const pReforma = custosReforma.filter(r => r.id_imovel === p.id).reduce((sum, r) => sum + (r.valor_real || r.orcamento || 0), 0);
    const pHolding = holding.filter(h => h.id_imovel === p.id).reduce((sum, h) => sum + (h.valor_mensal || 0), 0);
    const pBilling = billing.filter(f => f.id_imovel === p.id);

    const pBillingBruto = pBilling.reduce((sum, f) => sum + (f.valor || 0), 0);
    const pComissoes = pBilling.reduce((sum, f) => sum + (f.custo_corretagem || 0), 0);
    const pFaturamentoLiquido = pBillingBruto - pComissoes;

    if (isAcquired) {
      const pSaldoDevedor = p.tipo_arrematacao === TipoArrematacao.Financiada ? (p.saldo_devedor || 0) : 0;
      const pEntradaEfetiva = p.tipo_arrematacao === TipoArrematacao.Financiada
        ? Math.max(0, baseAquisicao - pSaldoDevedor)
        : baseAquisicao;
      const pTotalInvestido = pEntradaEfetiva + pAquisicaoExt + pReforma + pHolding;
      let pLucroLiquido = 0;
      let pImpostoRenda = 0;

      if (pFaturamentoLiquido > 0) {
        // Sold or Alugado Property
        const custosBaseIR = pAquisicao + pReforma;
        const lucroBruto = pFaturamentoLiquido - custosBaseIR;
        pImpostoRenda = lucroBruto > 0 ? lucroBruto * 0.15 : 0;
        pLucroLiquido = pFaturamentoLiquido - custosBaseIR - pHolding - pImpostoRenda;
      } else {
        // Ongoing property with accumulated costs
        pLucroLiquido = -pTotalInvestido;
      }

      const pRoi = pTotalInvestido > 0 ? (pLucroLiquido / pTotalInvestido) * 100 : 0;

      detailedProperties.push({
        id: p.id || '',
        codigo: p.codigo || 'S/C',
        endereco: p.endereco,
        status: p.status_arrematacao || '',
        valorArrematacao: baseAquisicao,
        custosExtras: pAquisicaoExt + pReforma + pHolding,
        totalInvested: pTotalInvestido,
        faturamentoLiquido: pFaturamentoLiquido,
        impostoRenda: pImpostoRenda,
        lucroLiquido: pLucroLiquido,
        roi: pRoi
      });
    }
  });

  // Chart Data
  const chartData = detailedProperties.map(p => ({
    name: p.codigo && p.codigo !== 'S/C' ? p.codigo : p.endereco.split(',')[0] || 'Imóvel',
    investimento: p.totalInvested,
    roi: p.roi,
  }));

  const validRoiProperties = detailedProperties.filter(p => p.totalInvested > 0);
  const highestRoiProp = validRoiProperties.length > 0 
    ? [...validRoiProperties].sort((a, b) => b.roi - a.roi)[0] 
    : null;
  const lowestRoiProp = validRoiProperties.length > 0 
    ? [...validRoiProperties].sort((a, b) => a.roi - b.roi)[0] 
    : null;

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
          <p className="text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.25em]">Gestão Consolidada de Ativos Imobiliários</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-lg text-xs font-black uppercase tracking-widest">Global</div>
          <div className="px-4 py-2 text-slate-400 text-xs font-black uppercase tracking-widest cursor-pointer hover:text-slate-600">Mensal</div>
        </div>
      </div>

      {/* Onboarding Banner Card for New Clean User Profiles */}
      {totalProperties === 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-6"
        >
          <div className="relative z-10 max-w-2xl">
            <h3 className="text-2xl font-black tracking-tight mb-2">Bem-vindo ao PropMaestro!</h3>
            <p className="text-sm text-blue-100/90 leading-relaxed font-normal">
              Seu painel está limpo e totalmente zerado. Comece cadastrando seu primeiro imóvel de leilão para explorar os gráficos e a inteligência analítica do sistema instantaneamente.
            </p>
          </div>
          <div className="relative z-10 shrink-0 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/properties')}
              className="px-5 py-3 bg-white text-slate-900 hover:bg-blue-50 active:scale-95 text-xs font-black uppercase tracking-widest rounded-2xl flex items-center gap-2 transition-all shadow-md shadow-black/10"
            >
              <Plus className="size-4 text-blue-600" />
              Cadastrar Imóvel
            </button>
          </div>
          {/* Decorative background shape */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-[80px] pointer-events-none -mr-20 -mt-20" />
        </motion.div>
      )}

      {/* Main Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* Total Equity / Performance - Large Primary Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="md:col-span-8 bg-slate-900 dark:bg-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex flex-col justify-between min-h-[340px]"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <div className="size-10 bg-white/10 dark:bg-black/5 rounded-2xl flex items-center justify-center text-white dark:text-black">
                <BarChart2 size={20} />
              </div>
              <p className="text-xs font-black text-white/50 dark:text-black/40 uppercase tracking-[0.3em]">Capital Realizado</p>
            </div>

            <h2 className="text-6xl md:text-7xl font-black text-white dark:text-slate-900 tracking-tighter leading-[0.8] mb-4">
              R$ {totalInvested.toLocaleString('pt-BR')}
            </h2>
            <div className="flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full border",
                portfolioRoi >= 0
                  ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                  : "bg-rose-500/20 text-rose-400 border-rose-500/30"
              )}>
                <TrendingUp size={14} />
                <span className="text-xs font-black tracking-tight">ROI: {portfolioRoi >= 0 ? '+' : ''}{portfolioRoi.toFixed(1)}%</span>
              </div>
              <p className="text-[10px] font-bold text-white/40 dark:text-black/30 uppercase tracking-widest italic">Total investido em Arrematação, Custos de Aquisição, Reformas e Holding</p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between mt-8 pt-8 border-t border-white/10 dark:border-black/5">
            <div className="flex flex-wrap items-center gap-8">
              <div>
                <p className="text-[10px] font-black text-white/40 dark:text-black/30 uppercase tracking-widest mb-1">Faturamento Bruto</p>
                <p className="text-xl font-bold text-white dark:text-slate-900">R$ {totalInvoiced.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 dark:text-black/30 uppercase tracking-widest mb-1">Lucro Líquido</p>
                <p className={cn(
                  "text-xl font-bold",
                  netProfit >= 0 ? "text-emerald-400" : "text-rose-400"
                )}>R$ {netProfit.toLocaleString('pt-BR')}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-white/40 dark:text-black/30 uppercase tracking-widest mb-1">Total Ativos</p>
                <p className="text-xl font-bold text-white dark:text-slate-900">{totalProperties}</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/properties')}
              className="px-6 py-3 bg-white/10 dark:bg-black/5 hover:bg-white/20 dark:hover:bg-black/10 rounded-2xl text-xs font-black text-white dark:text-black uppercase tracking-[0.2em] transition-all"
            >
              Ver Detalhes
            </button>
          </div>

          {/* Abstract background graphics */}
          <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-emerald-500/10 to-transparent pointer-events-none" />
          <div className="absolute -bottom-24 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px] pointer-events-none" />
        </motion.div>

        {/* Mix de Ativos */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="md:col-span-4 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm min-h-[340px] flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Activity size={14} className="text-blue-500" />
              Mix de Ativos
            </h3>
          </div>

          <div className="h-[150px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={40}
                  outerRadius={65}
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
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest truncate">{item.name}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Comparativos de Investimento e ROI */}
        {totalProperties > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="md:col-span-12 grid grid-cols-1 lg:grid-cols-2 gap-6"
          >
            {/* Card 1: Distribuição de Investimentos */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[380px]">
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-1 block">Alocação de Capital</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  Distribuição de Investimentos por Ativo
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-normal mb-6">
                  Comparação do capital total alocado em cada imóvel (Valor de lance, regularização e benfeitorias).
                </p>
              </div>

              <div className="h-[220px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '700' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 10 }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `R$ ${(value / 1000)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }}
                      contentStyle={{
                        borderRadius: '1rem',
                        border: 'none',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                      formatter={(value: any) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Investimento Total']}
                    />
                    <Bar dataKey="investimento" radius={[6, 6, 0, 0]}>
                      {chartData.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill="#3b82f6" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Card 2: Comparativo de ROI & Destaques de Extremos */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between min-h-[380px]">
              <div>
                <span className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1 block">Retorno Analítico</span>
                <h3 className="text-base font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  Comparativo de ROI (%) por Ativo
                </h3>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-normal mb-4">
                  Visualização do retorno percentual de cada ativo, destacando os de maior e menor performance.
                </p>
              </div>

              {/* Destaques de Maior e Menor ROI */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                {highestRoiProp ? (
                  <div className="p-4 bg-emerald-500/10 dark:bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">Maior Retorno (ROI)</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{highestRoiProp.codigo} - {highestRoiProp.endereco.split(',')[0]}</p>
                    </div>
                    <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                      +{highestRoiProp.roi.toFixed(1)}%
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex flex-col justify-center items-center text-slate-400 text-xs">
                    Sem dados suficientes
                  </div>
                )}

                {lowestRoiProp ? (
                  <div className="p-4 bg-rose-500/10 dark:bg-rose-950/20 border border-rose-500/20 rounded-2xl flex flex-col justify-between">
                    <div>
                      <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-1">Menor Retorno (ROI)</p>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{lowestRoiProp.codigo} - {lowestRoiProp.endereco.split(',')[0]}</p>
                    </div>
                    <p className="text-xl font-black text-rose-600 dark:text-rose-400 mt-2">
                      {lowestRoiProp.roi >= 0 ? '+' : ''}{lowestRoiProp.roi.toFixed(1)}%
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl flex flex-col justify-center items-center text-slate-400 text-xs">
                    Sem dados suficientes
                  </div>
                )}
              </div>

              <div className="h-[140px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" className="dark:stroke-slate-800" />
                    <XAxis 
                      dataKey="name" 
                      tick={{ fill: '#94a3b8', fontSize: 10, fontWeight: '700' }} 
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fill: '#94a3b8', fontSize: 10 }} 
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value) => `${value}%`}
                    />
                    <Tooltip
                      cursor={{ fill: 'rgba(148, 163, 184, 0.05)' }}
                      contentStyle={{
                        borderRadius: '1rem',
                        border: 'none',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
                        fontSize: '11px',
                        fontWeight: '600',
                      }}
                      formatter={(value: any) => [`${value.toFixed(1)}%`, 'ROI']}
                    />
                    <Bar dataKey="roi" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => {
                        const isHighest = highestRoiProp && entry.name === (highestRoiProp.codigo && highestRoiProp.codigo !== 'S/C' ? highestRoiProp.codigo : highestRoiProp.endereco.split(',')[0]);
                        const isLowest = lowestRoiProp && entry.name === (lowestRoiProp.codigo && lowestRoiProp.codigo !== 'S/C' ? lowestRoiProp.codigo : lowestRoiProp.endereco.split(',')[0]);
                        
                        if (isHighest) return <Cell key={`cell-${index}`} fill="#10b981" />;
                        if (isLowest) return <Cell key={`cell-${index}`} fill="#ef4444" />;
                        return <Cell key={`cell-${index}`} fill="#6366f1" />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </motion.div>
        )}

        {/* Accordion breakdown for ROI Calculation Transparency */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="md:col-span-12 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden"
        >
          <button
            onClick={() => setShowCalculationDetails(!showCalculationDetails)}
            className="w-full flex items-center justify-between p-8 hover:bg-slate-50 dark:hover:bg-slate-800/20 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="size-10 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-700 dark:text-slate-300">
                <Info size={18} />
              </div>
              <div>
                <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.2em] mb-0.5 block">Transparência Financeira</span>
                <h3 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Como o ROI de {portfolioRoi.toFixed(1)}% é calculado? (Memória de Cálculo)
                </h3>
              </div>
            </div>
            <div className="text-slate-400 p-2 bg-slate-150 dark:bg-slate-850 rounded-xl">
              {showCalculationDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </div>
          </button>

          {showCalculationDetails && (
            <div className="px-8 pb-8 pt-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-slate-650 dark:text-slate-400 leading-relaxed font-sans">
                <div className="space-y-3">
                  <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> A Fórmula do ROI do Portfólio
                  </p>
                  <p>
                    O <strong className="text-slate-900 dark:text-white font-black">ROI (Retorno sobre Investimento)</strong> consolidado do seu portfólio completo é calculado nos padrões tradicionais de avaliação corporativa:
                  </p>
                  <div className="p-4 bg-slate-900 text-slate-100 rounded-xl font-mono text-center text-xs font-black border border-slate-800 shadow-inner">
                    ROI = (Lucro Líquido Global / Capital Realizado) * 100
                  </div>
                  <p className="text-[11px] leading-relaxed">
                    Esse indicador calcula a proporção total de retorno líquido obtida sobre cada real de capital empregado no negócio de arrematações.
                  </p>
                </div>

                <div className="space-y-3">
                  <p className="font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider text-[10px] flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> O que compõe cada valor?
                  </p>
                  <ul className="list-disc pl-4 space-y-2">
                    <li>
                      <strong className="text-slate-900 dark:text-white">Capital Realizado:</strong> Representa o capital de fato investido. É a soma de: <span className="italic font-semibold">Valor de Aquisição (Lance ou Compra) + Custos Extras de Aquisição + Reformas Executadas + Custos de Holding (Condomínio, IPTU)</span> dos imóveis arrematados/comprados.
                    </li>
                    <li>
                      <strong className="text-slate-900 dark:text-white">Lucro Líquido:</strong> Para imóveis vendidos/locados, subtrai-se os custos de holding, a base tributável (lucro × IR de 15%) e comissões da receita líquida. Para imóveis ainda em andamento, desconta-se todos os custos investidos como fluxo de caixa negativo temporário (<span className="text-rose-500 font-bold">ROI parcial negativo</span>) até sua rentabilização.
                    </li>
                  </ul>
                </div>
              </div>

              <div className="overflow-x-auto rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm mt-4">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400 select-none">
                      <th className="p-4 pl-6">IMÓVEL / ENDEREÇO</th>
                      <th className="p-4 text-center">STATUS</th>
                      <th className="p-4 text-right">AQUISIÇÃO / LANCE</th>
                      <th className="p-4 text-right">OUTROS CUSTOS</th>
                      <th className="p-4 text-right">CAP. REALIZADO</th>
                      <th className="p-4 text-right">FATUR. LÍQUIDO</th>
                      <th className="p-4 text-right">LUCRO LÍQUIDO</th>
                      <th className="p-4 text-right pr-6">ROI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-sans">
                    {detailedProperties.map((p) => (
                      <tr
                        key={p.id}
                        onClick={() => navigate(`/properties/${p.id}`)}
                        className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors cursor-pointer group"
                      >
                        <td className="p-4 pl-6 font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">
                          <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-wider">{p.codigo || 'S/Código'}</span>
                            <span className="text-[10px] text-slate-400 font-normal truncate max-w-[220px] mt-0.5">{p.endereco}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={cn(
                            "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border",
                            p.status === StatusArrematacao.Vendido
                              ? "bg-blue-500/10 text-blue-500 border-blue-500/20"
                              : p.status === StatusArrematacao.Alugado
                                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                                : "bg-amber-500/10 text-amber-500 border-amber-500/20"
                          )}>
                            {p.status}
                          </span>
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          R$ {p.valorArrematacao.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-600 dark:text-slate-400">
                          R$ {p.custosExtras.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 text-right font-mono font-bold text-slate-900 dark:text-white">
                          R$ {p.totalInvested.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 text-right font-mono text-slate-900 dark:text-white">
                          R$ {p.faturamentoLiquido.toLocaleString('pt-BR')}
                        </td>
                        <td className={cn(
                          "p-4 text-right font-mono font-bold",
                          p.lucroLiquido >= 0 ? "text-emerald-500" : "text-rose-500"
                        )}>
                          R$ {p.lucroLiquido.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 text-right pr-6">
                          <span className={cn(
                            "px-2.5 py-1 rounded-lg text-[10px] font-black font-mono inline-block min-w-[64px] text-center",
                            p.roi >= 0
                              ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                              : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                          )}>
                            {p.roi >= 0 ? '+' : ''}{p.roi.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}

                    {/* Orfãos / Pendentes sem imóvel cadastrado se houver */}
                    {hasOrphanBilling && (
                      <tr className="bg-amber-50/10 dark:bg-amber-950/5 border-t-2 border-dashed border-amber-200 dark:border-amber-900/30">
                        <td className="p-4 pl-6 font-bold text-amber-600 dark:text-amber-400" colSpan={2}>
                          <div className="flex flex-col">
                            <span className="text-xs uppercase tracking-tight">Faturamentos Sem Imóvel Vinculado</span>
                            <span className="text-[10px] text-slate-400 font-normal">Valores de comissão ou venda recebidos sem id_imovel ativo no banco</span>
                          </div>
                        </td>
                        <td className="p-4 text-right font-mono text-slate-400">—</td>
                        <td className="p-4 text-right font-mono text-slate-400">—</td>
                        <td className="p-4 text-right font-mono text-slate-400 font-bold">R$ 0</td>
                        <td className="p-4 text-right font-mono text-emerald-500 font-bold">
                          R$ {orphanBillingBruto.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 text-right font-mono text-emerald-500 font-bold">
                          R$ {(orphanBillingBruto - orphanComissoes).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 text-right pr-6 text-amber-600 dark:text-amber-450 font-mono text-[10px] font-black">
                          Sem Base Custo (Inexistente)
                        </td>
                      </tr>
                    )}

                    {/* Totais Gerais */}
                    <tr className="bg-slate-50 dark:bg-slate-900/60 font-bold border-t-2 border-slate-200 dark:border-slate-800">
                      <td className="p-4 pl-6 uppercase text-slate-950 dark:text-white" colSpan={2}>
                        Total Consolidado
                      </td>
                      <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-350">
                        R$ {detailedProperties.reduce((sum, p) => sum + p.valorArrematacao, 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-700 dark:text-slate-350">
                        R$ {detailedProperties.reduce((sum, p) => sum + p.custosExtras, 0).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-950 dark:text-white font-black text-xs">
                        R$ {totalInvested.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 text-right font-mono text-emerald-600 dark:text-emerald-400 font-black text-xs">
                        R$ {totalInvoiced.toLocaleString('pt-BR')}
                      </td>
                      <td className={cn(
                        "p-4 text-right font-mono font-black text-xs",
                        netProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500"
                      )}>
                        R$ {netProfit.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 text-right pr-6">
                        <span className={cn(
                          "px-3 py-1 rounded-full text-xs font-black font-mono text-white inline-block min-w-[76px] text-center",
                          portfolioRoi >= 0
                            ? "bg-emerald-500"
                            : "bg-rose-500"
                        )}>
                          {portfolioRoi >= 0 ? '+' : ''}{portfolioRoi.toFixed(1)}%
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-700 dark:text-amber-400 leading-normal font-medium">
                <Info size={16} className="shrink-0 mt-0.5 text-amber-500" />
                <span>
                  <strong>Aviso Importante:</strong> Se o ROI do indicador principal apresentar porcentagens anormalmente elevadas, por favor revise o cadastro dos seus imóveis com faturamento. É provável que um imóvel de alta receita tenha sido cadastrado com <strong>Valor de Lance / Arrematação zerado ou sem despesas de aquisição</strong>, gerando uma taxa matemática inflada sobre custo irreal de investimento na divisão de ROI.
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Upcoming Radar - Agenda Style - Expanded to Full Width (12 cols) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-12 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={14} className="text-emerald-500" />
              Próximos Leilões (Radar)
            </h3>
            <button className="text-xs font-black text-blue-500 uppercase tracking-widest hover:underline">Calendário Completo</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {upcomingAuctions.length > 0 ? (
              upcomingAuctions.map((auction, idx) => (
                <div
                  key={auction.id}
                  onClick={() => navigate(`/properties/${auction.id}`)}
                  className="group flex flex-col md:flex-row md:items-center justify-between p-5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-900 dark:hover:bg-white hover:text-white dark:hover:text-slate-900 rounded-[1.5rem] transition-all cursor-pointer border border-transparent hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-white dark:bg-slate-700 flex flex-col items-center justify-center border border-slate-200 dark:border-slate-600 group-hover:bg-emerald-500 group-hover:border-emerald-500 transition-colors">
                      <p className="text-xs font-black text-emerald-500 group-hover:text-white leading-none">
                        {new Date(auction.data_leilao!).toLocaleDateString('pt-BR', { day: '2-digit' })}
                      </p>
                      <p className="text-[10px] font-black text-slate-400 group-hover:text-white/60 uppercase">
                        {new Date(auction.data_leilao!).toLocaleDateString('pt-BR', { month: 'short' })}
                      </p>
                    </div>
                    <div>
                      <h4 className="text-sm font-black tracking-tight mb-1">{auction.endereco}</h4>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest group-hover:text-white/40">{auction.comarca}</span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 group-hover:bg-white/20" />
                        <span className="text-[10px] font-black text-emerald-500 dark:text-emerald-400 group-hover:text-white/70">Mín: R$ {auction.valor_minimo?.toLocaleString('pt-BR')}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 md:mt-0 flex items-center justify-end gap-3 font-mono text-xs font-bold">
                    <Clock size={12} className="text-slate-400 group-hover:text-white/40" />
                    {new Date(auction.data_leilao!).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 flex flex-col items-center justify-center py-12 text-slate-400">
                <Gavel size={40} strokeWidth={1} className="mb-4 opacity-20" />
                <p className="text-xs font-black uppercase tracking-widest">Nenhum leilão agendado no radar</p>
              </div>
            )}
          </div>
        </motion.div>

      </div>
    </motion.div>
  );
}
