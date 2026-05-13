import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ChevronLeft, 
  Plus, 
  Trash2, 
  Eye, 
  ChevronRight, 
  Gavel, 
  Calendar, 
  MapPin, 
  Building2, 
  Hammer, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  History,
  FileText,
  Wallet,
  ClipboardCheck,
  TrendingDown,
  Download,
  Image as ImageIcon,
  File as FileIcon,
  Search,
  RefreshCw,
  ShieldCheck,
  FolderOpen,
  ArrowDownCircle,
  Info,
  Activity,
  PencilLine
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { 
  Imovel, 
  CustoAquisicao, 
  CustoReforma, 
  Documento, 
  Holding, 
  Faturamento, 
  StatusArrematacao, 
  StatusDoc, 
  StatusPagamento, 
  TipoImovel, 
  OrigemImovel,
  TipoLeilao,
  FormaArrematacao,
  TipoFaturamento
} from '../types';
import { cn } from '../lib/utils';
import { generateRiskAnalysis } from '../services/gemini';
import ReactMarkdown from 'react-markdown';
import CurrencyInput from 'react-currency-input-field';
import { FilePicker } from '../components/FilePicker';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar
} from 'recharts';

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: properties, update: updateImovel } = useFirestore<Imovel>('imoveis');
  
  const imovel = properties.find(p => p.id === id);

  const { data: custosAquisicao, add: addCustoAquisicao, remove: removeCustoAquisicao, update: updateCustoAquisicao } = useFirestore<CustoAquisicao>('custos_aquisicao');
  const { data: custosReforma, add: addCustoReforma, remove: removeCustoReforma, update: updateCustoReforma } = useFirestore<CustoReforma>('custos_reforma');
  const { data: documentos, add: addDocumento, remove: removeDocumento } = useFirestore<Documento>('documentos');
  const { data: holding, add: addHolding, remove: removeHolding, update: updateHolding } = useFirestore<Holding>('holding');
  const { data: faturamento, add: addFaturamento, remove: removeFaturamento, update: updateFaturamento } = useFirestore<Faturamento>('faturamento');

  const [activeTab, setActiveTab] = useState<'analise' | 'custos' | 'documentos'>('analise');
  const [isEditingLance, setIsEditingLance] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddReforma, setShowAddReforma] = useState(false);
  const [showAddFaturamento, setShowAddFaturamento] = useState(false);
  const [showAddAquisicao, setShowAddAquisicao] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [editingItem, setEditingItem] = useState<{ id: string, type: 'aquisicao' | 'reforma' | 'holding' | 'faturamento' } | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Local state for monetary inputs
  const [reformaOrc, setReformaOrc] = useState<number | undefined>(0);
  const [reformaReal, setReformaReal] = useState<number | undefined>(0);
  const [reformaDescricao, setReformaDescricao] = useState('');
  const [fatValor, setFatValor] = useState<number | undefined>(0);
  const [fatComissao, setFatComissao] = useState<number | undefined>(0);
  const [aquisicaoValor, setAquisicaoValor] = useState<number | undefined>(0);
  const [holdingValor, setHoldingValor] = useState<number | undefined>(0);
  const [holdingCompetencia, setHoldingCompetencia] = useState('');
  
  const [aquisicaoFileUrl, setAquisicaoFileUrl] = useState('');
  const [reformaFileUrl, setReformaFileUrl] = useState('');
  const [holdingFileUrl, setHoldingFileUrl] = useState('');

  const handleAddAquisicao = async () => {
    if (!aquisicaoValor || !id) return;
    await addCustoAquisicao({
      id_imovel: id,
      tipo_custo: 'Desembolso Inicial (Entrada/Lance)',
      valor: aquisicaoValor,
      status_pagamento: StatusPagamento.Pago,
      fileUrl: aquisicaoFileUrl
    });
    setAquisicaoValor(0);
    setAquisicaoFileUrl('');
    setShowAddAquisicao(false);
  };

  const handleAddReforma = async () => {
    if (!reformaOrc || !id) return;
    await addCustoReforma({
      id_imovel: id,
      descricao_etapa: reformaDescricao || 'Etapa de Reforma',
      orcamento: reformaOrc,
      valor_real: reformaReal,
      fileUrl: reformaFileUrl
    });
    setReformaOrc(0);
    setReformaReal(0);
    setReformaDescricao('');
    setReformaFileUrl('');
    setShowAddReforma(false);
  };

  const handleAddHolding = async () => {
    if (!holdingValor || !id) return;
    await addHolding({
      id_imovel: id,
      tipo_despesa: 'Custos Fixos / Holding',
      valor_mensal: holdingValor,
      competencia: holdingCompetencia || new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
      fileUrl: holdingFileUrl
    });
    setHoldingValor(0);
    setHoldingCompetencia('');
    setHoldingFileUrl('');
    setShowAddHolding(false);
  };

  const handleAddFaturamento = async () => {
    if (!fatValor || !id) return;
    await addFaturamento({
      id_imovel: id,
      tipo: TipoFaturamento.Venda,
      valor: fatValor,
      custo_corretagem: fatComissao
    });
    setFatValor(0);
    setFatComissao(0);
    setShowAddFaturamento(false);
  };

  const filteredCustosAquisicao = custosAquisicao.filter(c => c.id_imovel === id);
  const filteredCustosReforma = custosReforma.filter(c => c.id_imovel === id);
  const filteredDocumentos = documentos.filter(d => d.id_imovel === id);
  const filteredHolding = holding.filter(h => h.id_imovel === id);
  const filteredFaturamento = faturamento.filter(f => f.id_imovel === id);

  // Helper to detect file type
  const getFileMetaData = (url?: string) => {
    if (!url) return null;
    const isBase64 = url.startsWith('data:');
    const isImage = isBase64 ? url.startsWith('data:image/') : url.match(/\.(jpeg|jpg|gif|png|webp|svg)$/i);
    const isPDF = isBase64 ? url.startsWith('data:application/pdf') : url.match(/\.pdf$/i);
    return { isImage, isPDF };
  };

  const FileThumbnail = ({ url, className }: { url?: string, className?: string }) => {
    const meta = getFileMetaData(url);
    if (!url || !meta) return null;

    return (
      <div className={cn("relative group overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex items-center justify-center shadow-sm", className)}>
        {meta.isImage ? (
          <img src={url} alt="Document preview" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
        ) : meta.isPDF ? (
          <div className="flex flex-col items-center gap-1">
            <FileIcon size={20} className="text-rose-500" />
            <span className="text-[8px] font-black text-slate-500 uppercase">PDF</span>
          </div>
        ) : (
          <FileIcon size={20} className="text-slate-500" />
        )}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <a 
            href={url} 
            target="_blank" 
            rel="noreferrer"
            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            title="Ver"
          >
            <Eye size={14} />
          </a>
          <a 
            href={url} 
            download="documento" 
            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            title="Download"
          >
            <Download size={14} />
          </a>
        </div>
      </div>
    );
  };

  if (!imovel) return <div className="p-8 text-center text-slate-600">Imóvel não encontrado.</div>;

  // Consolidação Financeira
  const totalAquisicao = filteredCustosAquisicao.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalReforma = filteredCustosReforma.reduce((acc, curr) => acc + (curr.valor_real || curr.orcamento || 0), 0);
  const totalHolding = filteredHolding.reduce((acc, curr) => acc + (curr.valor_mensal || 0), 0);
  const totalInvestimento = totalAquisicao + totalReforma + totalHolding;
  
  const faturamentoBruto = filteredFaturamento.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalComissoes = filteredFaturamento.reduce((acc, curr) => acc + (curr.custo_corretagem || 0), 0);
  const faturamentoLiquido = faturamentoBruto - totalComissoes;
  
  const valorFinanciamento = imovel?.valor_financiamento || 0;
  
  // Use faturamentoLiquido if > 0, otherwise use eval value (prospective)
  const baseReceita = faturamentoLiquido > 0 ? faturamentoLiquido : (imovel.valor_avaliacao || imovel.valor_arrematacao || 0);
  
  const lucroBruto = baseReceita - totalInvestimento - valorFinanciamento;
  const impostoRenda = lucroBruto > 0 ? lucroBruto * 0.15 : 0;
  const lucroLiquido = lucroBruto - impostoRenda;
  const roiLiquido = totalInvestimento > 0 ? (lucroLiquido / totalInvestimento) * 100 : 0;

  // Calculo de Fluxo de Caixa Acumulado
  const allEvents = [
    ...filteredCustosAquisicao.map(c => ({ 
      date: c.createdAt ? (typeof c.createdAt === 'object' ? c.createdAt.toDate() : new Date(c.createdAt)) : new Date(), 
      value: -(c.valor || 0), 
      type: 'Aquisição' 
    })),
    ...filteredCustosReforma.map(r => ({ 
      date: r.data_conclusao ? new Date(r.data_conclusao) : (r.createdAt ? (typeof r.createdAt === 'object' ? r.createdAt.toDate() : new Date(r.createdAt)) : new Date()), 
      value: -(r.valor_real || r.orcamento || 0), 
      type: 'Reforma' 
    })),
    ...filteredHolding.map(h => ({ 
      date: h.createdAt ? (typeof h.createdAt === 'object' ? h.createdAt.toDate() : new Date(h.createdAt)) : new Date(), 
      value: -(h.valor_mensal || 0), 
      type: 'Operacional' 
    })),
    ...filteredFaturamento.map(f => ({ 
      date: f.data_operacao ? new Date(f.data_operacao) : (f.createdAt ? (typeof f.createdAt === 'object' ? f.createdAt.toDate() : new Date(f.createdAt)) : new Date()), 
      value: (f.valor || 0) - (f.custo_corretagem || 0), 
      type: 'Receita' 
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  let cumulativeValue = 0;
  const cashFlowTimeline = allEvents.map(e => {
    cumulativeValue += e.value;
    return {
      name: e.date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
      valor: e.value,
      acumulado: cumulativeValue,
      tipo: e.type
    };
  });

  const costDistribution = [
    { name: 'Aquisição', value: totalAquisicao, color: '#3b82f6' },
    { name: 'Benfeitorias', value: totalReforma, color: '#f59e0b' },
    { name: 'Manutenção', value: totalHolding, color: '#8b5cf6' },
    { name: 'Taxas/IR', value: totalComissoes + impostoRenda, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const handleGenerateAnalysis = async () => {
    if (!imovel) return;
    
    setAnalyzing(true);
    try {
      const analysis = await generateRiskAnalysis(imovel, undefined, {
        totalInvestimento,
        lucroBruto,
        impostoRenda,
        lucroLiquido,
        roiLiquido,
        totalReforma,
        totalHolding,
        faturamentoLiquido
      });
      await updateImovel(imovel.id!, { analise_risco: analysis });
    } catch (err) {
      console.error('Erro ao gerar análise:', err);
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-6 max-w-6xl mx-auto px-4 md:px-0"
    >
      <button 
        onClick={() => navigate('/properties')}
        className="flex items-center gap-2 text-slate-500 dark:text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors font-bold text-xs uppercase tracking-widest mt-4 md:mt-0"
      >
        <ChevronLeft size={16} />
        Voltar para Imóveis
      </button>

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">{imovel.endereco}</h1>
            <div className={cn(
              "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest",
              imovel.status_arrematacao === StatusArrematacao.Arrematado ? "bg-emerald-100 text-emerald-700" :
              imovel.status_arrematacao === StatusArrematacao.Analise ? "bg-blue-100 text-blue-700" :
              "bg-slate-100 text-slate-700"
            )}>
              {imovel.status_arrematacao}
            </div>
          </div>
          <div className="flex items-center gap-4 text-slate-400 dark:text-slate-500 font-bold text-[10px] uppercase tracking-widest">
            <span className="flex items-center gap-1.5"><MapPin size={14} className="text-slate-300" /> {imovel.bairro || 'Sem Bairro'} - {imovel.cidade}/{imovel.estado}</span>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span className="flex items-center gap-1.5"><Building2 size={14} className="text-slate-300" /> {imovel.tipo_imovel}</span>
            <span className="w-1 h-1 rounded-full bg-slate-200" />
            <span className="flex items-center gap-1.5"><Gavel size={14} className="text-slate-300" /> {imovel.origem}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white rounded-2xl text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all active:scale-95 shadow-sm">
            <Plus size={16} />
            Nova Ação
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 p-1.5 bg-slate-100 dark:bg-slate-900 rounded-[1.25rem] w-fit mb-8 border border-slate-200 dark:border-slate-800 shadow-inner">
        {[
          { id: 'analise', label: 'Monitoramento', icon: ShieldAlert },
          { id: 'custos', label: 'Performance', icon: Wallet },
          { id: 'documentos', label: 'Arquivos', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "relative flex items-center gap-2.5 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-300",
              activeTab === tab.id ? "text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-700"
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2.5">
              <tab.icon size={16} strokeWidth={2.5} />
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'analise' && (
          <motion.div
            key="analise"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Analise content - Reconstructed from fragments */}
            {imovel.analise_risco ? (
              <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200 dark:border-slate-800">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="size-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                      <ShieldCheck size={24} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Análise de Risco Estratégica</h3>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Processado pelo Gemini AI</p>
                    </div>
                  </div>
                  <button 
                    onClick={handleGenerateAnalysis}
                    disabled={analyzing}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50"
                  >
                    {analyzing ? <RefreshCw size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                    Recalcular
                  </button>
                </div>
                
                <div className="prose prose-slate dark:prose-invert max-w-none">
                  <ReactMarkdown>{imovel.analise_risco}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-slate-800 text-center">
                <div className="size-20 bg-blue-50 dark:bg-blue-900/20 rounded-[2rem] flex items-center justify-center text-blue-600 dark:text-blue-400 mx-auto mb-6">
                  <Activity size={32} />
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight mb-2">Análise de Risco não gerada</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mb-8">Utilize nossa IA especializada para analisar os riscos jurídicos e viabilidade financeira deste ativo com base em dados consolidados.</p>
                <button 
                  onClick={handleGenerateAnalysis}
                  disabled={analyzing}
                  className="flex items-center gap-3 px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-xs font-black uppercase tracking-[0.2em] hover:scale-105 active:scale-95 transition-all shadow-xl shadow-blue-500/10 disabled:opacity-50"
                >
                  {analyzing ? <RefreshCw size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
                  Gerar Análise Completa
                </button>
              </div>
            )}

            <div className="bg-slate-900 dark:bg-slate-900 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden border border-white/5">
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-8 mb-12">
                    <div className="flex items-center gap-6">
                      <div className="size-20 bg-blue-600 rounded-[2rem] flex items-center justify-center text-white shadow-2xl shadow-blue-500/20">
                        <Activity size={32} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mb-1">Performance Estratégica</p>
                        <h2 className="text-4xl font-black text-white tracking-tighter">Balanço de Ativo</h2>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">
                        {faturamentoLiquido > 0 ? 'Lucro Líquido Realizado' : 'Lucro Líquido Projetado'}
                      </p>
                      <p className={cn(
                        "text-5xl font-black tracking-tighter",
                        lucroLiquido >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        R$ {lucroLiquido.toLocaleString('pt-BR')}
                      </p>
                      <div className="flex items-center justify-end gap-3 mt-2">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                          Bruto: R$ {lucroBruto.toLocaleString('pt-BR')}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                        <p className="text-[9px] font-bold text-blue-500 uppercase tracking-widest">
                          Dívida: R$ {valorFinanciamento.toLocaleString('pt-BR')}
                        </p>
                        <span className="w-1 h-1 rounded-full bg-slate-800" />
                        <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">
                          IR (15%): - R$ {impostoRenda.toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-12">
                    {/* Gráfico de Evolução de ROI / Fluxo de Caixa */}
                    <div className="md:col-span-8 bg-slate-800/40 p-6 rounded-[2rem] border border-white/5 h-[350px]">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Activity size={14} className="text-blue-500" />
                          Fluxo de Caixa Acumulado
                        </h4>
                        <div className="text-[9px] font-bold text-emerald-400 uppercase">Projeção Consolidada</div>
                      </div>
                      <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={cashFlowTimeline}>
                            <defs>
                              <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
                            <XAxis 
                              dataKey="name" 
                              stroke="#ffffff40" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                            />
                            <YAxis 
                              stroke="#ffffff40" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={(value) => `R$ ${value >= 1000 ? (value/1000).toFixed(0) + 'k' : value}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#0f172a', 
                                border: '1px solid #1e293b', 
                                borderRadius: '1rem',
                                color: '#f8fafc',
                                fontSize: '10px'
                              }} 
                            />
                            <Area 
                              type="monotone" 
                              dataKey="acumulado" 
                              stroke="#3b82f6" 
                              strokeWidth={3} 
                              fillOpacity={1} 
                              fill="url(#colorVal)" 
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {/* Distribuição de Custos */}
                    <div className="md:col-span-4 bg-slate-800/40 p-6 rounded-[2rem] border border-white/5 flex flex-col justify-between">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-4">
                        <TrendingDown size={14} className="text-rose-500" />
                        Composição de Gastos
                      </h4>
                      <div className="h-[180px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={costDistribution}
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={8}
                              dataKey="value"
                              stroke="none"
                            >
                              {costDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#0f172a', 
                                border: '1px solid #1e293b', 
                                borderRadius: '1rem',
                                color: '#f8fafc',
                                fontSize: '10px'
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="grid grid-cols-2 gap-y-2 mt-4">
                        {costDistribution.map(item => (
                          <div key={item.name} className="flex items-center gap-2">
                            <div className="size-2 rounded-full" style={{ backgroundColor: item.color }} />
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest truncate">{item.name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-12">
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Capital Alocado (Cash-out)</p>
                        <button 
                          onClick={() => {
                            setActiveTab('custos');
                            setTimeout(() => {
                              document.getElementById('secao-custos')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-500"
                          title="Clique para detalhar ou editar desembolsos"
                        >
                          <Info size={12} strokeWidth={3} />
                        </button>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-2xl font-black text-white tracking-tight">
                          R$ {totalInvestimento.toLocaleString('pt-BR')}
                        </p>
                        <button 
                         onClick={() => {
                            setActiveTab('custos');
                            setTimeout(() => {
                              document.getElementById('secao-custos')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className="size-6 bg-white/5 hover:bg-white/10 rounded-lg flex items-center justify-center text-slate-400 transition-colors"
                          title="Clique para atualizar valores"
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">Total Desembolsado</p>
                    </div>
                    
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Receita Líquida</p>
                      <div>
                        <p className="text-2xl font-black text-white tracking-tight text-emerald-400">
                          R$ {faturamentoLiquido.toLocaleString('pt-BR')}
                        </p>
                        <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">Venda - Comissões</p>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Margem de Retorno</p>
                      <div className="flex items-baseline gap-3">
                        <p className={cn(
                          "text-3xl font-black tracking-tight",
                          roiLiquido > 0 ? "text-emerald-400" : "text-rose-400"
                        )}>
                          {roiLiquido.toFixed(1)}%
                        </p>
                        <div className="flex flex-col">
                          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tighter">ROI LÍQUIDO</span>
                          <span className="text-[8px] text-emerald-600 font-black">+{((roiLiquido/100) * 1).toFixed(2)}x equity</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Ponto de Equilíbrio</p>
                        <span className="text-[9px] font-black text-blue-500 tracking-widest">
                          {Math.min(100, Math.round((totalInvestimento / (faturamentoLiquido || totalInvestimento)) * 100))}%
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden border border-white/5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(100, (totalInvestimento / (faturamentoLiquido || totalInvestimento)) * 100)}%` }}
                          className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full"
                        />
                      </div>
                      <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest text-right">Amortização de Ativos</p>
                    </div>
                  </div>

                  {/* Detalhamento de Custos Fixos vs Variáveis */}
                  <div className="mt-8 mb-12 p-6 bg-slate-800/10 rounded-2xl border border-blue-500/10 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                      <div className="size-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                        <ShieldCheck size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Financiamento / Alavancagem</p>
                        <p className="text-xs font-bold text-slate-500">Saldo devedor a quitar no faturamento</p>
                      </div>
                    </div>
                    <div className="w-full md:w-auto">
                      <DebouncedCurrencyInput
                        value={imovel.valor_financiamento || 0}
                        onUpdate={(val) => updateImovel(id!, { valor_financiamento: val })}
                        className="w-full md:w-32 px-4 py-2 bg-slate-900/50 border border-slate-800 rounded-xl text-xs font-black text-blue-400 outline-none focus:border-blue-500/50 transition-all text-right"
                      />
                    </div>
                  </div>

                  <div className="mt-12 pt-8 border-t border-slate-800 grid grid-cols-1 md:grid-cols-2 gap-12">
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-blue-500" />
                        Custos Fixos (Inércia)
                      </h5>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-800/20 p-4 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Holding / Mensais</span>
                          <span className="text-sm font-black text-slate-300">R$ {totalHolding.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-800/20 p-4 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Taxas Arrematação</span>
                          <span className="text-sm font-black text-slate-300">R$ {(totalAquisicao - (imovel.valor_arrematacao || 0)).toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                        <div className="size-1.5 rounded-full bg-orange-500" />
                        Custos Variáveis (Equity)
                      </h5>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center bg-slate-800/20 p-4 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Benfeitorias</span>
                          <span className="text-sm font-black text-slate-300">R$ {totalReforma.toLocaleString('pt-BR')}</span>
                        </div>
                        <div className="flex justify-between items-center bg-slate-800/20 p-4 rounded-2xl border border-white/5">
                          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Impostos sobre Lucro (IR)</span>
                          <span className="text-sm font-black text-rose-400">R$ {impostoRenda.toLocaleString('pt-BR')}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
          </motion.div>
        )}

        {activeTab === 'custos' && (
           <motion.div
           key="custos"
           initial={{ opacity: 0, y: 10 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -10 }}
           className="space-y-6"
           id="secao-custos"
         >
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Custos de Aquisição */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-300" />
                    Custos de Aquisição
                  </h3>
                  <p className="text-[8px] font-bold text-blue-500 uppercase tracking-widest">Registre apenas o valor desembolsado (ex: Entrada do financiamento)</p>
                </div>
                <button 
                  onClick={() => setShowAddAquisicao(!showAddAquisicao)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    showAddAquisicao ? "bg-rose-50 text-rose-500 rotate-45" : "bg-blue-50 text-blue-600"
                  )}
                >
                  <Plus size={20} />
                </button>
              </div>

               {/* Add Custo Aquisicao UI placeholder */}
               {showAddAquisicao && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border-2 border-blue-100 dark:border-slate-800 shadow-2xl space-y-6"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Valor Desembolsado</label>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="R$ 0,00"
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold outline-none ring-2 ring-transparent focus:ring-blue-500/20 transition-all"
                          onValueChange={(_v, _n, values) => setAquisicaoValor(values?.float)}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Comprovante / Documento</label>
                        <FilePicker 
                          onFileSelect={(url) => setAquisicaoFileUrl(url)}
                          onClear={() => setAquisicaoFileUrl('')}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={handleAddAquisicao}
                      className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all shadow-xl shadow-blue-500/10"
                    >
                      Registrar Desembolso
                    </button>
                  </motion.div>
               )}

               <div className="space-y-3">
                 {filteredCustosAquisicao.map(c => (
                    <div key={c.id} className="group flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-4">
                        <div className="size-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                          <DollarSign size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{c.tipo_custo}</p>
                          <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">R$ {c.valor.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                         {c.fileUrl && <FileThumbnail url={c.fileUrl} className="w-10 h-10 rounded-xl" />}
                         {editingItem?.id === c.id ? (
                              <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <DebouncedCurrencyInput
                                  value={c.valor}
                                  onUpdate={(val) => updateCustoAquisicao(c.id!, { valor: val })}
                                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border-none rounded-lg text-[10px] font-bold outline-none ring-1 ring-blue-500/30"
                                />
                                <button 
                                  onClick={() => setEditingItem(null)}
                                  className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setEditingItem({ id: c.id!, type: 'aquisicao' })}
                                className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                                title="Editar valor"
                              >
                                <PencilLine size={16} /> 
                              </button>
                            )}

                        <button 
                          onClick={() => removeCustoAquisicao(c.id!)} 
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                 ))}
               </div>
            </div>

            <div className="space-y-6">
              {/* Benfeitorias (Reforma) */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-300" />
                    Benfeitorias & Reforma
                  </h3>
                  <button 
                    onClick={() => setShowAddReforma(!showAddReforma)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      showAddReforma ? "bg-rose-50 text-rose-500 rotate-45" : "bg-orange-50 text-orange-600"
                    )}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredCustosReforma.map(r => {
                    const progress = r.valor_real && r.orcamento ? Math.min(100, Math.round((r.valor_real / r.orcamento) * 100)) : 0;
                    const isOverBudget = r.valor_real && r.orcamento && r.valor_real > r.orcamento;
                    
                    return (
                      <div key={r.id} className="group flex flex-col p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="size-12 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                              <Hammer size={20} />
                            </div>
                            <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{r.descricao_etapa}</p>
                              <div className="flex items-center gap-3">
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Orçamento</p>
                                  <p className="text-sm font-black text-slate-900 dark:text-white">R$ {r.orcamento.toLocaleString('pt-BR')}</p>
                                </div>
                                <span className="w-px h-6 bg-slate-100 dark:bg-slate-800" />
                                <div className="space-y-1">
                                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Realizado</p>
                                  {editingItem?.id === r.id ? (
                                    <div className="flex items-center gap-2">
                                      <DebouncedCurrencyInput
                                        value={r.valor_real}
                                        onUpdate={(val) => updateCustoReforma(r.id!, { valor_real: val })}
                                        className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border-none rounded-lg text-[10px] font-black outline-none ring-1 ring-blue-500/30 text-emerald-600"
                                      />
                                      <button onClick={() => setEditingItem(null)} className="text-emerald-500"><CheckCircle2 size={14} /></button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center gap-2 group/val">
                                      <p className={cn("text-sm font-black", isOverBudget ? "text-rose-600" : "text-emerald-600")}>
                                        R$ {r.valor_real?.toLocaleString('pt-BR') || '0,00'}
                                      </p>
                                      <button 
                                        onClick={() => setEditingItem({ id: r.id!, type: 'reforma' })}
                                        className="opacity-0 group-hover/val:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-all"
                                      >
                                        <PencilLine size={12} />
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {r.fileUrl && <FileThumbnail url={r.fileUrl} className="w-10 h-10 rounded-xl" />}
                            <button 
                              onClick={() => removeCustoReforma(r.id!)}
                              className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            className={cn("h-full rounded-full", isOverBudget ? "bg-rose-500" : "bg-orange-500")}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Holding / Manutenção */}
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-300" />
                    Manutenção & Holding
                  </h3>
                  <button 
                    onClick={() => setShowAddHolding(!showAddHolding)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      showAddHolding ? "bg-rose-50 text-rose-500 rotate-45" : "bg-purple-50 text-purple-600"
                    )}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredHolding.map(h => (
                    <div key={h.id} className="group flex items-center justify-between p-5 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-4">
                        <div className="size-12 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-purple-600 dark:text-purple-400">
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{h.tipo_despesa} - {h.competencia}</p>
                          <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">R$ {h.valor_mensal.toLocaleString('pt-BR')}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {h.fileUrl && <FileThumbnail url={h.fileUrl} className="w-10 h-10 rounded-xl" />}
                        {editingItem?.id === h.id ? (
                              <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <DebouncedCurrencyInput
                                  value={h.valor_mensal}
                                  onUpdate={(val) => updateHolding(h.id!, { valor_mensal: val })}
                                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border-none rounded-lg text-[10px] font-bold outline-none ring-1 ring-blue-500/30"
                                />
                                <button 
                                  onClick={() => setEditingItem(null)}
                                  className="p-1 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-colors"
                                >
                                  <CheckCircle2 size={14} />
                                </button>
                              </div>
                            ) : (
                              <button 
                                onClick={() => setEditingItem({ id: h.id!, type: 'holding' })}
                                className="p-3 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all active:scale-95"
                                title="Editar valor"
                              >
                                <PencilLine size={16} /> 
                              </button>
                            )}
                        <button 
                          onClick={() => removeHolding(h.id!)}
                          className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Faturamento / Liquidação */}
              <div className="space-y-6 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center">
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-4 h-px bg-slate-300" />
                    Faturamento & Liquidação
                  </h3>
                  <button 
                    onClick={() => setShowAddFaturamento(!showAddFaturamento)}
                    className={cn(
                      "p-2 rounded-xl transition-all",
                      showAddFaturamento ? "bg-rose-50 text-rose-500 rotate-45" : "bg-emerald-50 text-emerald-600"
                    )}
                  >
                    <Plus size={20} />
                  </button>
                </div>

                <div className="space-y-3">
                  {filteredFaturamento.map(f => (
                    <div key={f.id} className="group flex items-center justify-between p-5 bg-emerald-50/30 dark:bg-emerald-900/10 rounded-[2rem] border border-emerald-100 dark:border-emerald-900/30 hover:shadow-lg transition-all">
                      <div className="flex items-center gap-4">
                        <div className="size-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
                          <TrendingUp size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-1">{f.tipo}</p>
                          <div className="flex items-baseline gap-2">
                            <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">R$ {f.valor.toLocaleString('pt-BR')}</p>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">LÍQUIDO: R$ {(f.valor - (f.custo_corretagem || 0)).toLocaleString('pt-BR')}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFaturamento(f.id!)}
                        className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
           </div>
         </motion.div>
        )}

        {activeTab === 'documentos' && (
          <motion.div
            key="documentos"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Documentos content skeleton */}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function DebouncedCurrencyInput({ value, onUpdate, className, placeholder }: { value?: number, onUpdate: (val: number) => void, className?: string, placeholder?: string }) {
  const [localValue, setLocalValue] = useState<number | undefined>(value);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (localValue === value) return;
    
    const timeout = setTimeout(async () => {
      if (localValue !== undefined) {
        setIsSaving(true);
        try {
          await onUpdate(localValue);
        } finally {
          setIsSaving(false);
        }
      }
    }, 800);

    return () => clearTimeout(timeout);
  }, [localValue, value, onUpdate]);

  return (
    <div className="relative group">
      <CurrencyInput
        intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
        decimalSeparator=","
        groupSeparator="."
        decimalsLimit={2}
        placeholder={placeholder || "0,00"}
        className={className}
        value={localValue}
        onValueChange={(_v, _n, values) => setLocalValue(values?.float)}
      />
      {isSaving && (
        <div className="absolute -top-1 -right-1">
          <RefreshCw size={10} className="animate-spin text-blue-500" />
        </div>
      )}
    </div>
  );
}
