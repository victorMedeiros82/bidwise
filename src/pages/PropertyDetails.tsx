import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Gavel, 
  ShieldAlert, 
  DollarSign, 
  Hammer, 
  FileText, 
  Plus,
  Trash2,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Clock,
  ExternalLink,
  Calendar,
  Link as LinkIcon,
  Wallet,
  ClipboardCheck,
  TrendingUp,
  TrendingDown,
  Download,
  Image as ImageIcon,
  File as FileIcon,
  Eye,
  MapPin,
  Zap,
  RefreshCw,
  ShieldCheck,
  FolderOpen,
  ArrowDownCircle,
  Info,
  Activity
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { 
  Imovel, 
  Leilao, 
  CustoAquisicao, 
  CustoReforma, 
  Documento, 
  StatusPagamento,
  StatusArrematacao,
  StatusDoc,
  TipoFaturamento,
  Faturamento,
  Holding,
  OrigemImovel
} from '../types';
import { generateRiskAnalysis } from '../services/gemini';
import { cn } from '../lib/utils';
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
        <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <a 
            href={url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="p-1.5 bg-white/20 hover:bg-white/40 rounded-full text-white transition-colors"
            title="Visualizar"
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

  // Consolidação Financeira
  const totalAquisicao = filteredCustosAquisicao.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalReforma = filteredCustosReforma.reduce((acc, curr) => acc + (curr.valor_real || curr.orcamento || 0), 0);
  const totalHolding = filteredHolding.reduce((acc, curr) => acc + (curr.valor_mensal || 0), 0);
  const totalInvestimento = totalAquisicao + totalReforma + totalHolding;
  
  const faturamentoBruto = filteredFaturamento.reduce((acc, curr) => acc + (curr.valor || 0), 0);
  const totalComissoes = filteredFaturamento.reduce((acc, curr) => acc + (curr.custo_corretagem || 0), 0);
  const faturamentoLiquido = faturamentoBruto - totalComissoes;
  
  const lucroBruto = faturamentoLiquido - totalInvestimento;
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

  if (!imovel) return <div className="p-8 text-center text-slate-600">Imóvel não encontrado.</div>;

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
        Voltar à Gestão
      </button>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 py-4 md:py-8 border-b border-slate-100 dark:border-slate-800 mb-8">
        <div className="flex items-start gap-6">
          <div className="w-16 h-16 md:w-20 md:h-20 bg-slate-900 dark:bg-white rounded-[2rem] flex items-center justify-center shrink-0 shadow-2xl shadow-slate-200 dark:shadow-none">
            <Building2 className="text-white dark:text-slate-900" size={32} strokeWidth={2.5} />
          </div>
          <div className="flex-1">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1.5 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50" />
              Gestão de Ativo Operacional
            </p>
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none mb-2">
              {imovel.endereco}
            </h1>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin size={12} className="text-slate-300" />
                {imovel.bairro || 'Bairro N/A'} • {imovel.cidade}/{imovel.estado}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-200" />
              <span className="flex items-center gap-1.5 text-nowrap">
                <ClipboardCheck size={12} className="text-slate-300" />
                {imovel.tipo_imovel}
              </span>
              <span className="w-1 h-1 rounded-full bg-slate-200" />
              <span className="flex items-center gap-1.5 text-nowrap">
                <ShieldAlert size={12} className="text-slate-300" />
                {imovel.situacao_juridica}
              </span>
            </div>
          </div>
        </div>

        <select
          value={imovel.status_arrematacao}
          onChange={(e) => updateImovel(id!, { status_arrematacao: e.target.value as StatusArrematacao })}
          className={cn(
            "px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm border md:self-start outline-none cursor-pointer appearance-none transition-all",
            imovel.status_arrematacao === 'Arrematado' 
              ? "bg-emerald-50 border-emerald-100 text-emerald-600" 
              : imovel.status_arrematacao === 'Vendido' || imovel.status_arrematacao === 'Alugado'
              ? "bg-blue-50 border-blue-100 text-blue-600"
              : imovel.status_arrematacao === 'Perdido' || imovel.status_arrematacao === 'Cancelado' || imovel.status_arrematacao === 'Reprovado'
              ? "bg-rose-50 border-rose-100 text-rose-600"
              : "bg-amber-50 border-amber-100 text-amber-600"
          )}
        >
          {Object.values(StatusArrematacao).map(status => (
            <option key={status} value={status} className="bg-white text-slate-900">{status}</option>
          ))}
        </select>
      </div>

      {imovel.origem === OrigemImovel.Leilao && imovel.processo && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-50 dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-200/60 dark:border-slate-800 shadow-sm relative overflow-hidden group mb-8"
        >
          <div className="absolute -top-12 -right-12 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
            <Gavel size={240} strokeWidth={1} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-8 relative z-10">
            <div className="space-y-6 flex-1">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border border-slate-100 dark:border-slate-700 shadow-sm">
                  {imovel.tipo_leilao || 'Processo Judicial'}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                  <Calendar size={14} className="text-slate-300" />
                  {imovel.data_leilao ? new Date(imovel.data_leilao).toLocaleString('pt-BR') : 'Agendamento Pendente'}
                </div>
              </div>
              
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter mb-1">{imovel.processo}</h3>
                <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] flex items-center gap-2">
                  <span className="w-4 h-px bg-slate-300" />
                  {imovel.comarca || 'Tribunal de Justiça'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-6">
                {imovel.link_edital && (
                  <a 
                    href={imovel.link_edital} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 py-3 px-6 bg-white dark:bg-slate-800 rounded-2xl text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest border border-slate-100 dark:border-slate-700 hover:shadow-lg transition-all active:scale-95"
                  >
                    <LinkIcon size={14} strokeWidth={2.5} />
                    Consultar Edital
                  </a>
                )}
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <Hammer size={14} />
                  {imovel.forma_arrematacao || 'Sessão Online'}
                </div>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-6 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 pt-8 md:pt-0 md:pl-12 min-w-[200px]">
              <div className="text-right">
                <div className="flex items-center justify-end gap-2 mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lance de Arrematação</p>
                  <button 
                    onClick={() => setIsEditingLance(!isEditingLance)}
                    className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors text-slate-400"
                  >
                    <Plus size={12} className={cn(isEditingLance && "rotate-45")} />
                  </button>
                </div>
                
                {isEditingLance ? (
                  <div className="flex flex-col items-end gap-2">
                    <CurrencyInput
                      intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                      decimalSeparator=","
                      groupSeparator="."
                      decimalsLimit={2}
                      placeholder="Valor do Lance"
                      className="w-full max-w-[180px] px-4 py-2 bg-white dark:bg-slate-800 border-2 border-slate-900 dark:border-white rounded-xl text-xs font-bold outline-none text-right"
                      defaultValue={imovel.valor_arrematacao || imovel.valor_minimo}
                      onValueChange={(_v, _n, values) => {
                        if (values?.float !== undefined) {
                          updateImovel(id!, { valor_arrematacao: values.float });
                        }
                      }}
                    />
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Valor informativo (não soma nos custos)</p>
                  </div>
                ) : (
                  <div className="flex items-baseline justify-end gap-3">
                    <p className="text-4xl font-black text-slate-900 dark:text-white tracking-tighter leading-none">
                      R$ {(imovel.valor_arrematacao || imovel.valor_minimo || 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                )}
                
                {imovel.valor_avaliacao && (imovel.valor_arrematacao || imovel.valor_minimo) && (
                  <div className="flex items-center justify-end gap-2 mt-3 text-emerald-600 font-black text-[11px] uppercase tracking-widest">
                    <span>-{Math.round((1 - ((imovel.valor_arrematacao || imovel.valor_minimo!) / imovel.valor_avaliacao)) * 100)}% de Desconto</span>
                    <TrendingUp size={14} />
                  </div>
                )}
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-end gap-2 text-nowrap">
                  {imovel.valor_arrematacao ? (
                    <span>Mínimo Orig.: R$ {(imovel.valor_minimo || 0).toLocaleString('pt-BR')}</span>
                  ) : (
                    <span className="text-[8px] text-slate-300 italic">Lance real não registrado</span>
                  )}
                  <span className="w-1 h-1 rounded-full bg-slate-200" />
                  <span>Avaliação: R$ {(imovel.valor_avaliacao || 0).toLocaleString('pt-BR')}</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

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

      <div className="min-h-[400px] relative">
        <AnimatePresence mode="wait">
          {activeTab === 'analise' && (
            <motion.div 
              key="analise"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
            {!imovel.analise_risco && !analyzing ? (
              <div className="bg-white dark:bg-slate-900 p-12 md:p-20 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800 text-center space-y-8 shadow-sm">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800 rounded-[2.5rem] flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700 shadow-inner">
                  <ShieldAlert className="text-slate-300 dark:text-slate-600" size={48} />
                </div>
                <div className="max-w-md mx-auto space-y-4">
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter">Diligência Inteligente</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 font-bold leading-relaxed uppercase tracking-widest text-[10px]">Execute uma varredura completa de riscos jurídicos, financeiros e operacionais utilizando nossa IA de alta performance.</p>
                </div>
                <button
                  onClick={handleGenerateAnalysis}
                  className="py-5 px-12 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.25em] shadow-2xl hover:scale-105 transition-all active:scale-95 flex items-center gap-4 mx-auto"
                >
                  <Loader2 className={cn("animate-spin", !analyzing && "hidden")} />
                  Mapear Riscos de Ativo
                </button>
              </div>
            ) : analyzing ? (
              <div className="bg-white dark:bg-slate-900 p-20 rounded-[3rem] border border-slate-100 dark:border-slate-800 text-center shadow-sm">
                <div className="relative size-24 mx-auto mb-8">
                  <div className="absolute inset-0 border-4 border-slate-100 dark:border-slate-800 rounded-full" />
                  <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Zap className="text-blue-500 animate-pulse" size={32} />
                  </div>
                </div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter mb-2">Processando Diligência Digital...</h3>
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">Consultando bases jurídicas e projeções de ROI</p>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="flex justify-between items-center px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse" />
                    <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">
                      Relatório de Decisão Crítica
                    </h3>
                  </div>
                  <button 
                    onClick={handleGenerateAnalysis}
                    className="flex items-center gap-2 text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-widest hover:opacity-70 transition-opacity"
                  >
                    <RefreshCw size={14} strokeWidth={3} />
                    Recalcular
                  </button>
                </div>

                <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-[3.5rem] border border-slate-100 dark:border-slate-800 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none">
                    <ShieldCheck size={200} strokeWidth={1} />
                  </div>
                  <div className="markdown-body prose dark:prose-invert prose-slate max-w-none prose-headings:font-black prose-headings:tracking-tighter prose-p:font-medium prose-p:text-slate-600 dark:prose-p:text-slate-400">
                    <ReactMarkdown>{imovel.analise_risco || ''}</ReactMarkdown>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
          )}
          
          {activeTab === 'custos' && (
            <motion.div 
              key="custos"
              initial={{ opacity: 0, y: 10 }} 
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Seção de Lucratividade Consolidada */}
              <div className="bg-slate-900 rounded-[3rem] p-8 md:p-12 shadow-2xl border border-slate-800 overflow-hidden relative group">
                {/* Background effects */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] -ml-32 -mb-32 pointer-events-none" />
                
                <div className="relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12 pb-8 border-b border-slate-800">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 bg-blue-600 rounded-3xl flex items-center justify-center shadow-lg shadow-blue-900/20">
                        <TrendingUp className="text-white" size={32} strokeWidth={2.5} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] mb-1">Performance Estratégica</p>
                        <h3 className="text-3xl font-black text-white tracking-tighter">Balanço de Ativo</h3>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Lucro Líquido Realizado</p>
                      <div className="flex flex-col items-end gap-1">
                        <h4 className={cn(
                          "text-4xl md:text-5xl font-black tracking-tighter transition-all duration-500 leading-none",
                          lucroLiquido >= 0 ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]" : "text-rose-400 drop-shadow-[0_0_15px_rgba(248,113,113,0.3)]"
                        )}>
                          R$ {lucroLiquido.toLocaleString('pt-BR')}
                        </h4>
                        <div className="flex items-center gap-2">
                          <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">
                            Lucro Bruto: R$ {lucroBruto.toLocaleString('pt-BR')}
                          </p>
                          <span className="w-1 h-1 rounded-full bg-slate-800" />
                          <p className="text-[9px] font-bold text-rose-500 uppercase tracking-widest">
                            IR (15%): - R$ {impostoRenda.toLocaleString('pt-BR')}
                          </p>
                        </div>
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
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Investimento Total</p>
                        <button 
                          onClick={() => {
                            setActiveTab('custos');
                            setTimeout(() => {
                              document.getElementById('secao-custos')?.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          className="p-1 hover:bg-white/10 rounded-md transition-colors text-slate-500"
                        >
                          <Plus size={12} strokeWidth={3} />
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
                        >
                          <RefreshCw size={12} />
                        </button>
                      </div>
                      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest mt-1 italic">Capital Alocado</p>
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
                          roiLiquido >= 0 ? "text-emerald-400" : "text-rose-400"
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

              <div id="secao-custos" className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Custos de Aquisição */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-4 h-px bg-slate-300" />
                  Custos de Aquisição
                </h3>
                <button 
                  onClick={() => setShowAddAquisicao(!showAddAquisicao)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    showAddAquisicao 
                      ? "bg-slate-100 text-slate-500" 
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-none"
                  )}
                >
                  <Plus size={14} strokeWidth={3} className={cn("transition-transform", showAddAquisicao && "rotate-45")} />
                  {showAddAquisicao ? 'Cancelar' : 'Adicionar'}
                </button>
              </div>
              <div className="space-y-3">
                {showAddAquisicao && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-6 bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-white rounded-[2rem] shadow-2xl relative z-20"
                  >
                    <div className="grid grid-cols-1 gap-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Natureza do Custo</label>
                          <select 
                            id="aq-tipo" 
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                            onChange={(e) => {
                              const customInput = document.getElementById('aq-tipo-custom-container');
                              if (e.target.value === 'Outros') {
                                customInput?.classList.remove('hidden');
                              } else {
                                customInput?.classList.add('hidden');
                              }
                            }}
                          >
                            <option value="Lance">Lance de Arrematação</option>
                            <option value="ITBI">ITBI</option>
                            <option value="Emolumentos">Emolumentos (Cartório)</option>
                            <option value="Taxa Leiloeiro">Comissão Leiloeiro (5%)</option>
                            <option value="Honorários Advocatícios">Honorários Jurídicos</option>
                            <option value="Certidões">Emissão de Certidões</option>
                            <option value="IPTU Atrasado">Dívida de IPTU</option>
                            <option value="Condomínio Atrasado">Dívida Condominial</option>
                            <option value="Outros">Outros custos...</option>
                          </select>
                          <div id="aq-tipo-custom-container" className="hidden mt-3">
                            <input 
                              type="text" 
                              id="aq-tipo-custom" 
                              placeholder="Descreva a natureza do custo..."
                              className={cn(
                                "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none transition-all",
                                formErrors.aqTipo ? "ring-2 ring-rose-500/20 text-rose-600" : "focus:ring-2 focus:ring-slate-900/5"
                              )}
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Montante (R$)</label>
                          <CurrencyInput
                            intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                            decimalSeparator=","
                            groupSeparator="."
                            decimalsLimit={2}
                            placeholder="0,00"
                            className={cn(
                              "w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none transition-all",
                              formErrors.aqValor ? "ring-2 ring-rose-500/20 text-rose-600" : "focus:ring-2 focus:ring-slate-900/5"
                            )}
                            value={aquisicaoValor}
                            onValueChange={(_v, _n, values) => setAquisicaoValor(values?.float || 0)}
                          />
                        </div>
                      </div>
                      <FilePicker 
                        label="Documento Comprobatório"
                        onFileSelect={(url) => setAquisicaoFileUrl(url)}
                        onClear={() => setAquisicaoFileUrl('')}
                        initialUrl={aquisicaoFileUrl}
                      />
                      <button 
                        onClick={() => {
                          const tipoSelect = document.getElementById('aq-tipo') as HTMLSelectElement;
                          const tipoCustom = document.getElementById('aq-tipo-custom') as HTMLInputElement;
                          let tipo = tipoSelect.value === 'Outros' ? tipoCustom.value : tipoSelect.value;

                          if (!tipo || !aquisicaoValor) {
                            setFormErrors({ aqTipo: !tipo ? 'Obrigatório' : '', aqValor: !aquisicaoValor ? 'Obrigatório' : '' });
                            return;
                          }

                          addCustoAquisicao({ 
                            id_imovel: id!, 
                            tipo_custo: tipo, 
                            valor: aquisicaoValor, 
                            status_pagamento: StatusPagamento.Pendente,
                            fileUrl: aquisicaoFileUrl
                          });
                          setShowAddAquisicao(false);
                          setAquisicaoValor(0);
                          setAquisicaoFileUrl('');
                        }}
                        className="w-full py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 transition-all active:scale-95 shadow-xl"
                      >
                        Registrar Lançamento
                      </button>
                    </div>
                  </motion.div>
                )}
                
                <AnimatePresence mode="popLayout">
                  {filteredCustosAquisicao.length === 0 && !showAddAquisicao ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <div className="size-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
                        <Wallet size={24} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem lançamentos de aquisição</p>
                    </div>
                  ) : (
                    filteredCustosAquisicao.map(c => (
                      <motion.div 
                        layout
                        key={c.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-5 flex justify-between items-center bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-10 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-1/2 bg-blue-500" />
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight mb-0.5">{c.tipo_custo}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{c.status_pagamento}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-base font-black text-slate-900 dark:text-white leading-none">R$ {c.valor.toLocaleString('pt-BR')}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Lançamento</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {c.fileUrl && <FileThumbnail url={c.fileUrl} className="w-10 h-10 rounded-xl" />}
                            
                            {editingItem?.id === c.id ? (
                              <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <CurrencyInput
                                  intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                                  decimalSeparator=","
                                  groupSeparator="."
                                  decimalsLimit={2}
                                  placeholder="0,00"
                                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border-none rounded-lg text-[10px] font-bold outline-none ring-1 ring-blue-500/30"
                                  defaultValue={c.valor}
                                  onValueChange={(_v, _n, values) => {
                                    if (values?.float !== undefined) {
                                      updateCustoAquisicao(c.id!, { valor: values.float });
                                    }
                                  }}
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
                              >
                                <Plus size={16} className="rotate-45" /> 
                              </button>
                            )}

                            <button 
                              onClick={() => removeCustoAquisicao(c.id!)} 
                              className="p-3 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all active:scale-95"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Custos de Reforma */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-4 h-px bg-slate-300" />
                  Benfeitorias & Reforma
                </h3>
                <button 
                  onClick={() => setShowAddReforma(!showAddReforma)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    showAddReforma 
                      ? "bg-slate-100 text-slate-500" 
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-none"
                  )}
                >
                  <Plus size={14} strokeWidth={3} className={cn("transition-transform", showAddReforma && "rotate-45")} />
                  {showAddReforma ? 'Cancelar' : 'Nova Etapa'}
                </button>
              </div>

              <div className="space-y-6">
                {showAddReforma && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-8 bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-[2.5rem] shadow-2xl relative z-20"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-6">
                        <div>
                          <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Descrição da Etapa</label>
                          <input 
                            type="text" 
                            id="reforma-desc-v2"
                            placeholder="Ex: Pintura, Hidráulica, Piso..."
                            className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                            value={reformaDescricao}
                            onChange={(e) => setReformaDescricao(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Orçamento (R$)</label>
                            <CurrencyInput
                              intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                              decimalSeparator=","
                              groupSeparator="."
                              decimalsLimit={2}
                              placeholder="0,00"
                              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                              value={reformaOrc}
                              onValueChange={(_v, _n, values) => setReformaOrc(values?.float || 0)}
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Gasto Real (R$)</label>
                            <CurrencyInput
                              intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                              decimalSeparator=","
                              groupSeparator="."
                              decimalsLimit={2}
                              placeholder="0,00"
                              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all outline-none"
                              value={reformaReal}
                              onValueChange={(_v, _n, values) => setReformaReal(values?.float || 0)}
                            />
                          </div>
                        </div>
                      </div>
                      <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Previsão</label>
                            <input 
                              type="date" 
                              id="reforma-prazo-v2"
                              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Conclusão</label>
                            <input 
                              type="date" 
                              id="reforma-conclusao-v2"
                              className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                            />
                          </div>
                        </div>
                        <FilePicker 
                          label="Documentação Extra"
                          onFileSelect={(url) => setReformaFileUrl(url)}
                          onClear={() => setReformaFileUrl('')}
                          initialUrl={reformaFileUrl}
                        />
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const desc = (document.getElementById('reforma-desc-v2') as HTMLInputElement).value;
                        const prazo = (document.getElementById('reforma-prazo-v2') as HTMLInputElement).value;
                        const conclusao = (document.getElementById('reforma-conclusao-v2') as HTMLInputElement).value;

                        if (!desc || !reformaOrc) return;
                        addCustoReforma({ 
                          id_imovel: id!, 
                          descricao_etapa: desc, 
                          orcamento: reformaOrc, 
                          valor_real: reformaReal, 
                          prazo_execucao: prazo,
                          data_conclusao: conclusao,
                          fileUrl: reformaFileUrl
                        });
                        setShowAddReforma(false);
                        setReformaOrc(0);
                        setReformaReal(0);
                        setReformaFileUrl('');
                      }}
                      className="w-full mt-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Protocolar Etapa de Obra
                    </button>
                  </motion.div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredCustosReforma.length === 0 && !showAddReforma ? (
                    <div className="col-span-full py-16 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <div className="size-14 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
                        <Hammer size={28} />
                      </div>
                      <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Canteiro de obras limpo</p>
                    </div>
                  ) : (
                    filteredCustosReforma.map(r => {
                      const isCompleted = !!r.data_conclusao;
                      const isOverBudget = (r.valor_real || 0) > r.orcamento;
                      const porcentagemUso = Math.round(((r.valor_real || 0) / r.orcamento) * 100) || 0;
                      
                      return (
                        <motion.div 
                          layout
                          key={r.id} 
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-7 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 transition-all relative overflow-hidden group"
                        >
                          <div className={cn(
                            "absolute top-0 left-0 w-full h-1.5",
                            isCompleted ? "bg-emerald-500" : isOverBudget ? "bg-rose-500" : "bg-blue-500"
                          )} />
                          
                          <div className="flex justify-between items-start mb-6">
                            <div>
                              <h4 className="text-lg font-black text-slate-900 dark:text-white tracking-tighter mb-1">{r.descricao_etapa}</h4>
                              <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                <Calendar size={12} strokeWidth={2.5} />
                                {isCompleted ? `Concluído em: ${new Date(r.data_conclusao).toLocaleDateString('pt-BR')}` : `Previsão: ${r.prazo_execucao ? new Date(r.prazo_execucao).toLocaleDateString('pt-BR') : 'A definir'}`}
                              </div>
                            </div>
                            <button 
                              onClick={() => removeCustoReforma(r.id!)}
                              className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-6 mb-6">
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Estimado</p>
                              <p className="text-sm font-black text-slate-600 dark:text-slate-400">R$ {r.orcamento.toLocaleString('pt-BR')}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em]">Realizado</p>
                              {editingItem?.id === r.id ? (
                                <div className="flex items-center gap-2">
                                  <CurrencyInput
                                    intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                                    decimalSeparator=","
                                    groupSeparator="."
                                    decimalsLimit={2}
                                    placeholder="0,00"
                                    className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border-none rounded-lg text-[10px] font-black outline-none ring-1 ring-blue-500/30 text-emerald-600"
                                    defaultValue={r.valor_real}
                                    onValueChange={(_v, _n, values) => {
                                      if (values?.float !== undefined) {
                                        updateCustoReforma(r.id!, { valor_real: values.float });
                                      }
                                    }}
                                  />
                                  <button onClick={() => setEditingItem(null)} className="text-emerald-500"><CheckCircle2 size={14} /></button>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 group/val">
                                  <p className={cn("text-sm font-black", isOverBudget ? "text-rose-600" : "text-emerald-600")}>
                                    R$ {r.valor_real.toLocaleString('pt-BR')}
                                  </p>
                                  <button 
                                    onClick={() => setEditingItem({ id: r.id!, type: 'reforma' })}
                                    className="opacity-0 group-hover/val:opacity-100 p-1 text-slate-400 hover:text-blue-500 transition-all"
                                  >
                                    <Plus size={12} className="rotate-45" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="space-y-3">
                            <div className="flex justify-between items-end text-[9px] font-black uppercase tracking-[0.15em]">
                              <span className="text-slate-400">Consumo de Budget</span>
                              <span className={isOverBudget ? "text-rose-600" : "text-emerald-600"}>{porcentagemUso}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${Math.min(100, porcentagemUso)}%` }}
                                className={cn("h-full rounded-full", isOverBudget ? "bg-rose-500" : "bg-emerald-500")}
                              />
                            </div>
                          </div>

                          {r.fileUrl && (
                            <div className="mt-6 pt-6 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-nowrap">Comprovantes & NF</p>
                              <FileThumbnail url={r.fileUrl} className="w-12 h-12 rounded-2xl" />
                            </div>
                          )}
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Holding / Mensalidades */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-4 h-px bg-slate-300" />
                  Custos Fixos & Manutenção
                </h3>
                <button 
                  onClick={() => setShowAddHolding(!showAddHolding)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    showAddHolding 
                      ? "bg-slate-100 text-slate-500" 
                      : "bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-none"
                  )}
                >
                  <Plus size={14} strokeWidth={3} className={cn("transition-transform", showAddHolding && "rotate-45")} />
                  {showAddHolding ? 'Cancelar' : 'Novo Lançamento'}
                </button>
              </div>

              <div className="space-y-3">
                {showAddHolding && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-8 bg-white dark:bg-slate-900 border-2 border-slate-900 rounded-[2rem] shadow-2xl relative z-20"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Natureza da Despesa</label>
                        <input 
                          type="text" 
                          id="hold-tipo-v2" 
                          placeholder="Ex: Condomínio, IPTU, Energia..."
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Referência / Competência</label>
                        <input 
                          type="text" 
                          placeholder="Ex: Jan/2024"
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all"
                          value={holdingCompetencia}
                          onChange={(e) => setHoldingCompetencia(e.target.value)}
                        />
                      </div>
                      <div className="md:col-span-1">
                        <label className="block text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] mb-2">Valor (R$)</label>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="0,00"
                          className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-slate-900/5 transition-all text-rose-600"
                          value={holdingValor}
                          onValueChange={(_v, _n, values) => setHoldingValor(values?.float || 0)}
                        />
                      </div>
                    </div>
                    <div className="mt-6">
                      <FilePicker 
                        label="Comprovante de Pagamento"
                        onFileSelect={(url) => setHoldingFileUrl(url)}
                        onClear={() => setHoldingFileUrl('')}
                        initialUrl={holdingFileUrl}
                      />
                    </div>
                    <button 
                      onClick={() => {
                        const tipo = (document.getElementById('hold-tipo-v2') as HTMLInputElement).value;
                        if (!tipo || !holdingValor) return;
                        addHolding({ 
                          id_imovel: id!, 
                          tipo_despesa: tipo, 
                          valor_mensal: holdingValor, 
                          competencia: holdingCompetencia || new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
                          fileUrl: holdingFileUrl
                        });
                        setShowAddHolding(false);
                        setHoldingValor(0);
                        setHoldingCompetencia('');
                        setHoldingFileUrl('');
                      }}
                      className="w-full mt-8 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.25em] shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                    >
                      Processar Custo Operacional
                    </button>
                  </motion.div>
                )}

                <AnimatePresence mode="popLayout">
                  {filteredHolding.length === 0 && !showAddHolding ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <div className="size-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
                        <ArrowDownCircle size={24} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sem despesas operacionais</p>
                    </div>
                  ) : (
                    filteredHolding.map(h => (
                      <motion.div 
                        layout
                        key={h.id} 
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-5 flex justify-between items-center bg-white dark:bg-slate-900 rounded-[1.5rem] border border-slate-100 dark:border-slate-800 group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-1.5 h-10 bg-slate-200 dark:bg-slate-800 rounded-full" />
                          <div>
                            <p className="text-sm font-black text-slate-900 dark:text-white leading-tight">{h.tipo_despesa}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400">Despesa Operacional • {h.competencia}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-base font-black text-rose-500 leading-none">R$ {h.valor_mensal.toLocaleString('pt-BR')}</p>
                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-1">Gasto Fixo</p>
                          </div>
                          <div className="flex items-center gap-2 text-nowrap">
                            {h.fileUrl && <FileThumbnail url={h.fileUrl} className="w-10 h-10 rounded-xl" />}
                            
                            {editingItem?.id === h.id ? (
                              <div className="flex items-center gap-2 p-1 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
                                <CurrencyInput
                                  intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                                  decimalSeparator=","
                                  groupSeparator="."
                                  decimalsLimit={2}
                                  placeholder="0,00"
                                  className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border-none rounded-lg text-[10px] font-bold outline-none ring-1 ring-blue-500/30"
                                  defaultValue={h.valor_mensal}
                                  onValueChange={(_v, _n, values) => {
                                    if (values?.float !== undefined) {
                                      updateHolding(h.id!, { valor_mensal: values.float });
                                    }
                                  }}
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
                              >
                                <Plus size={16} className="rotate-45" /> 
                              </button>
                            )}

                            <button 
                              onClick={() => removeHolding(h.id!)}
                              className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Faturamento */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <span className="w-4 h-px bg-slate-300" />
                  Receita & Faturamento
                </h3>
                <button 
                  onClick={() => setShowAddFaturamento(!showAddFaturamento)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                    showAddFaturamento 
                      ? "bg-slate-100 text-slate-500" 
                      : "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-none"
                  )}
                >
                  <Plus size={14} strokeWidth={3} className={cn("transition-transform", showAddFaturamento && "rotate-45")} />
                  {showAddFaturamento ? 'Cancelar' : 'Registrar Venda / Aluguel'}
                </button>
              </div>
              
              <div className="space-y-4">
                {showAddFaturamento && (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="p-8 bg-white dark:bg-slate-900 border-2 border-emerald-500 rounded-[2rem] shadow-2xl relative z-20"
                  >
                    <div className="space-y-8">
                      <div className="flex items-center gap-4 border-b border-emerald-500/20 pb-6 mb-2">
                        <div className="size-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          <DollarSign size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tighter leading-tight">Liquidar Ativo</h3>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Encerramento de ciclo e apuração de resultados</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operação</label>
                          <div className="relative group">
                            <select 
                              id="fat-tipo-v2"
                              className="w-full h-14 pl-5 pr-10 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500/30 rounded-2xl text-xs font-bold outline-none transition-all appearance-none cursor-pointer"
                            >
                              <option value={TipoFaturamento.Venda}>Venda Direta</option>
                              <option value={TipoFaturamento.Locacao}>Locação Mensal</option>
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <RefreshCw size={14} className="group-hover:rotate-180 transition-transform duration-500" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Valor Realizado (R$)</label>
                          <div className="relative">
                            <CurrencyInput
                              intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                              decimalSeparator=","
                              groupSeparator="."
                              decimalsLimit={2}
                              placeholder="0,00"
                              className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500/30 rounded-2xl text-xs font-black outline-none transition-all text-emerald-600 placeholder:text-slate-300"
                              value={fatValor}
                              onValueChange={(_value, _name, values) => setFatValor(values?.float || 0)}
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <TrendingUp size={16} className="text-emerald-500/30" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Comissão / IR (R$)</label>
                          <div className="relative">
                            <CurrencyInput
                              intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                              decimalSeparator=","
                              groupSeparator="."
                              decimalsLimit={2}
                              placeholder="0,00"
                              className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-rose-500/30 rounded-2xl text-xs font-black outline-none transition-all text-rose-500 placeholder:text-slate-300"
                              value={fatComissao}
                              onValueChange={(_value, _name, values) => setFatComissao(values?.float || 0)}
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <ArrowDownCircle size={16} className="text-rose-500/30" />
                            </div>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Data da Transação</label>
                          <div className="relative">
                            <input 
                              type="date" 
                              id="fat-data-v2"
                              className="w-full h-14 px-5 bg-slate-50 dark:bg-slate-800 border-2 border-transparent focus:border-emerald-500/30 rounded-2xl text-xs font-bold outline-none transition-all text-slate-900 dark:text-white [color-scheme:dark]"
                            />
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none">
                              <Calendar size={16} className="text-slate-400" />
                            </div>
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          const tipo = (document.getElementById('fat-tipo-v2') as HTMLSelectElement).value;
                          const data = (document.getElementById('fat-data-v2') as HTMLInputElement).value;
                          if (!fatValor || !data) return;

                          addFaturamento({ 
                            id_imovel: id!, 
                            tipo: tipo as TipoFaturamento, 
                            valor: fatValor,
                            custo_corretagem: fatComissao,
                            data_operacao: data
                          });

                          if (tipo === TipoFaturamento.Venda) {
                            updateImovel(id!, { status_arrematacao: StatusArrematacao.Vendido });
                          } else if (tipo === TipoFaturamento.Locacao) {
                            updateImovel(id!, { status_arrematacao: StatusArrematacao.Alugado });
                          }

                          setShowAddFaturamento(false);
                          setFatValor(0);
                          setFatComissao(0);
                        }}
                        className="w-full mt-4 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.3em] shadow-[0_20px_50px_rgba(16,185,129,0.2)] hover:shadow-[0_20px_60px_rgba(16,185,129,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3"
                      >
                        <CheckCircle2 size={18} strokeWidth={3} />
                        LIQUIDAR OPERAÇÃO & SALVAR
                      </button>
                    </div>
                  </motion.div>
                )}

                <AnimatePresence mode="popLayout">
                  {filteredFaturamento.length === 0 && !showAddFaturamento ? (
                    <div className="py-12 flex flex-col items-center justify-center text-center space-y-4 bg-slate-50 dark:bg-slate-900/50 rounded-[2rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
                      <div className="size-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center text-slate-300">
                        <TrendingUp size={24} />
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Aguardando liquidação do ativo</p>
                    </div>
                  ) : (
                    filteredFaturamento.map(f => (
                      <motion.div 
                        layout
                        key={f.id} 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex justify-between items-center group overflow-hidden relative"
                      >
                        <div className="flex items-center gap-5">
                          <div className={cn(
                            "size-12 rounded-2xl flex items-center justify-center",
                            f.tipo === TipoFaturamento.Venda ? "bg-emerald-50 text-emerald-600" : "bg-blue-50 text-blue-600"
                          )}>
                            {f.tipo === TipoFaturamento.Venda ? <CheckCircle2 size={24} /> : <Calendar size={24} />}
                          </div>
                          <div>
                            <p className="text-base font-black text-slate-900 dark:text-white leading-tight">{f.tipo}</p>
                            <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mt-1">Concluído em: {f.data_operacao}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-8">
                          <div className="text-right">
                            <p className="text-lg font-black text-emerald-600 leading-none">R$ {f.valor.toLocaleString('pt-BR')}</p>
                            {f.custo_corretagem > 0 && (
                              <p className="text-[9px] font-black text-rose-500 uppercase tracking-tighter mt-1.5">
                                comissão: - R$ {f.custo_corretagem.toLocaleString('pt-BR')}
                              </p>
                            )}
                          </div>
                          <button 
                            onClick={() => removeFaturamento(f.id!)}
                            className="p-3 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
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
          transition={{ duration: 0.3 }}
          className="space-y-8"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-4">
            <div>
              <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em] mb-1">Cofre de Documentos</h3>
              <p className="text-[10px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest">Armazenamento seguro e centralizado</p>
            </div>
            <button 
              onClick={() => addDocumento({ id_imovel: id!, tipo_doc: 'Matrícula do Imóvel', status: StatusDoc.Pendente })}
              className="bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:scale-105 transition-all active:scale-95 flex items-center gap-3 w-full md:w-auto justify-center"
            >
              <Plus size={16} strokeWidth={3} />
              Importar Arquivo
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 pb-12">
            {filteredDocumentos.length === 0 ? (
              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-6 bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="size-20 bg-slate-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-slate-200">
                  <FolderOpen size={40} />
                </div>
                <div>
                  <p className="text-lg font-black text-slate-900 dark:text-white tracking-tighter">O cofre está vazio</p>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Anexe escrituras, certidões e comprovantes</p>
                </div>
              </div>
            ) : (
              filteredDocumentos.map(doc => (
                <motion.div 
                  layout
                  key={doc.id} 
                  className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:border-blue-100 dark:hover:border-blue-900/20 transition-all group overflow-hidden flex flex-col gap-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="size-12 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                        {getFileMetaData(doc.fileUrl)?.isPDF ? <FileIcon size={24} strokeWidth={2.5} /> : <ImageIcon size={24} strokeWidth={2.5} />}
                      </div>
                      <div className="max-w-[140px]">
                        <p className="text-sm font-black text-slate-900 dark:text-white truncate leading-tight tracking-tight">{doc.tipo_doc}</p>
                        <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest mt-1">Ref: {doc.id?.slice(-4)}</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => removeDocumento(doc.id!)}
                      className="p-3 text-slate-100 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="relative aspect-[4/3] rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 flex items-center justify-center overflow-hidden border border-slate-100 dark:border-slate-800 shadow-inner">
                    {doc.fileUrl ? (
                      <FileThumbnail url={doc.fileUrl} className="w-full h-full border-none rounded-none object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-3 text-slate-200">
                        <ImageIcon size={48} strokeWidth={1} />
                        <span className="text-[10px] font-black uppercase tracking-widest">Pendente</span>
                      </div>
                    )}
                    {doc.fileUrl && (
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/40 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 gap-3">
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="size-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-xl hover:scale-110 transition-all"
                        >
                          <Eye size={20} strokeWidth={2.5} />
                        </a>
                        <a 
                          href={doc.fileUrl} 
                          download
                          className="size-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl hover:scale-110 transition-all"
                        >
                          <Download size={20} strokeWidth={2.5} />
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto">
                    <div className={cn(
                      "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm",
                      doc.status === StatusDoc.Registrado ? "bg-emerald-50 border-emerald-100 text-emerald-600" : 
                      doc.status === StatusDoc.Pendente ? "bg-slate-50 border-slate-100 text-slate-400" :
                      "bg-blue-50 border-blue-100 text-blue-600"
                    )}>
                      {doc.status}
                    </div>
                    <p className="text-[9px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-widest">Diligência OK</p>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
</motion.div>
  );
}
