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
  Download,
  Image as ImageIcon,
  File as FileIcon,
  Eye
} from 'lucide-react';
import { useFirestore } from '../hooks/useFirestore';
import { 
  Imovel, 
  Leilao, 
  CustoAquisicao, 
  CustoReforma, 
  Documento, 
  StatusPagamento,
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

export default function PropertyDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: properties, update: updateImovel } = useFirestore<Imovel>('imoveis');
  
  const imovel = properties.find(p => p.id === id);

  const { data: custosAquisicao, add: addCustoAquisicao, remove: removeCustoAquisicao } = useFirestore<CustoAquisicao>('custos_aquisicao');
  const { data: custosReforma, add: addCustoReforma, remove: removeCustoReforma } = useFirestore<CustoReforma>('custos_reforma');
  const { data: documentos, add: addDocumento, remove: removeDocumento } = useFirestore<Documento>('documentos');
  const { data: holding, add: addHolding, remove: removeHolding } = useFirestore<Holding>('holding');
  const { data: faturamento, add: addFaturamento, remove: removeFaturamento } = useFirestore<Faturamento>('faturamento');

  const [activeTab, setActiveTab] = useState<'analise' | 'custos' | 'documentos'>('analise');
  const [analyzing, setAnalyzing] = useState(false);
  const [showAddReforma, setShowAddReforma] = useState(false);
  const [showAddFaturamento, setShowAddFaturamento] = useState(false);
  const [showAddAquisicao, setShowAddAquisicao] = useState(false);
  const [showAddHolding, setShowAddHolding] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Local state for monetary inputs
  const [reformaOrc, setReformaOrc] = useState<number | undefined>(0);
  const [reformaReal, setReformaReal] = useState<number | undefined>(0);
  const [fatValor, setFatValor] = useState<number | undefined>(0);
  const [fatComissao, setFatComissao] = useState<number | undefined>(0);
  const [aquisicaoValor, setAquisicaoValor] = useState<number | undefined>(0);
  const [holdingValor, setHoldingValor] = useState<number | undefined>(0);
  
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
  
  const lucroEstimado = faturamentoLiquido - totalInvestimento;
  const roiEstimado = totalInvestimento > 0 ? (lucroEstimado / totalInvestimento) * 100 : 0;

  const handleGenerateAnalysis = async () => {
    if (!imovel) return;
    
    setAnalyzing(true);
    try {
      const analysis = await generateRiskAnalysis(imovel, undefined, {
        totalInvestimento,
        lucroEstimado,
        roiEstimado,
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

      <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row gap-6 md:gap-8">
        <div className="w-16 h-16 md:w-20 md:h-20 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-center shrink-0 shadow-inner">
          <Building2 className="text-slate-500 dark:text-slate-600" size={32} />
        </div>
        <div className="flex-1">
          <div className="flex flex-col md:flex-row justify-between items-start mb-3 gap-4">
            <div>
              <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-widest mb-1">Detalhes do Ativo</p>
              <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white leading-tight">{imovel.endereco}</h1>
              {(imovel.bairro || imovel.cidade || imovel.estado) && (
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mt-1">
                  {imovel.bairro ? `${imovel.bairro}, ` : ''}
                  {imovel.cidade ? `${imovel.cidade} - ` : ''}
                  {imovel.estado ? imovel.estado : ''}
                  {imovel.cep ? ` • CEP: ${imovel.cep}` : ''}
                </p>
              )}
            </div>
            <span className={cn(
              "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
              imovel.status_arrematacao === 'Arrematado' ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
            )}>
              {imovel.status_arrematacao}
            </span>
          </div>
          <div className="flex flex-wrap gap-4 md:gap-6 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-tighter">
            <div className="flex items-center gap-1.5">
              <ClipboardCheck size={14} className="text-slate-500 dark:text-slate-700" />
              {imovel.tipo_imovel}
            </div>
            <div className="flex items-center gap-1.5">
              <Gavel size={14} className="text-slate-500 dark:text-slate-700" />
              {imovel.origem === OrigemImovel.Leilao 
                ? `Leilão: ${imovel.processo || 'N/A'}` 
                : imovel.origem}
            </div>
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-slate-500 dark:text-slate-700" />
              {imovel.situacao_juridica}
            </div>
          </div>
        </div>
      </div>

      {imovel.origem === OrigemImovel.Leilao && imovel.processo && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden group"
        >
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none group-hover:scale-110 transition-transform duration-500">
            <Gavel size={120} />
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
            <div className="space-y-4 flex-1">
              <div className="flex items-center gap-3">
                <div className="px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400 rounded-full text-[10px] font-bold uppercase tracking-widest">
                  {imovel.tipo_leilao || 'Processo Judicial'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  <Calendar size={14} />
                  {imovel.data_leilao ? new Date(imovel.data_leilao).toLocaleString('pt-BR') : 'Data não informada'}
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{imovel.processo}</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">{imovel.comarca || 'Comarca não informada'}</p>
              </div>

              <div className="flex flex-wrap gap-4">
                {imovel.link_edital && (
                  <a 
                    href={imovel.link_edital} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"
                  >
                    <LinkIcon size={12} />
                    Acessar Edital Completo
                  </a>
                )}
                <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  < Hammer size={12} />
                  {imovel.forma_arrematacao || 'Online'}
                </div>
              </div>
            </div>

            <div className="flex gap-8 items-end border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-8">
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Lance Mínimo</p>
                <div className="flex items-baseline justify-end gap-2">
                  <p className="text-2xl font-black text-slate-900 dark:text-white leading-none">
                    R$ {(imovel.valor_minimo || 0).toLocaleString('pt-BR')}
                  </p>
                  {imovel.valor_avaliacao && imovel.valor_minimo && (
                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter shadow-sm">
                      -{Math.round((1 - (imovel.valor_minimo / imovel.valor_avaliacao)) * 100)}%
                    </span>
                  )}
                </div>
                <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-tighter mt-1">
                  Avaliação: R$ {(imovel.valor_avaliacao || 0).toLocaleString('pt-BR')}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-wrap gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg w-fit">
        {[
          { id: 'analise', label: 'Análise de Risco', icon: ShieldAlert },
          { id: 'custos', label: 'Custos & Balanço', icon: Wallet },
          { id: 'documentos', label: 'Documentação', icon: FileText },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={cn(
              "relative flex items-center gap-2 px-3 md:px-5 py-2 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all",
              activeTab === tab.id ? "text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-300"
            )}
          >
            {activeTab === tab.id && (
              <motion.div
                layoutId="active-tab"
                className="absolute inset-0 bg-white dark:bg-slate-700 rounded-md shadow-sm"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <tab.icon size={14} />
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
              <div className="bg-white dark:bg-slate-900 p-8 md:p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-6 shadow-sm border-dashed">
                <div className="w-16 h-16 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto border border-slate-100 dark:border-slate-700">
                  <ShieldAlert className="text-slate-500 dark:text-slate-700" size={32} />
                </div>
                <div className="max-w-md mx-auto">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Relatório de Inteligência Crítica</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">Avalie riscos jurídicos e viabilidade financeira com nossa rede neural especializada.</p>
                </div>
                <button
                  onClick={handleGenerateAnalysis}
                  className="btn-primary flex items-center gap-2 mx-auto uppercase tracking-widest text-[10px]"
                >
                  <Loader2 className={cn("animate-spin", !analyzing && "hidden")} />
                  Processar Análise IA
                </button>
              </div>
            ) : analyzing ? (
              <div className="bg-white dark:bg-slate-900 p-12 rounded-xl border border-slate-200 dark:border-slate-800 text-center shadow-sm">
                <Loader2 className="animate-spin text-blue-600 mx-auto mb-4" size={40} />
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Mapeando Matrículas e Editais...</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 font-bold uppercase tracking-widest">Aguarde a geração do relatório</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-slate-900 p-6 md:p-8 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm prose dark:prose-invert prose-slate max-w-none">
                <div className="flex justify-between items-center mb-8 not-prose">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">
                      Análise de Decisão Estratégica
                    </h3>
                  </div>
                  <button 
                    onClick={handleGenerateAnalysis}
                    className="text-[10px] text-blue-600 dark:text-blue-400 font-bold hover:underline uppercase tracking-widest"
                  >
                    Recalcular Relatório
                  </button>
                </div>
                <div className="markdown-body p-6 bg-white dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800">
                  <ReactMarkdown>{imovel.analise_risco || ''}</ReactMarkdown>
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
              <div className="bg-slate-900 dark:bg-blue-600 p-6 md:p-8 rounded-2xl shadow-xl border border-slate-800 dark:border-blue-500 overflow-hidden relative">
                <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                  <TrendingUp size={120} />
                </div>
                
                <div className="relative z-10">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md">
                    <TrendingUp className="text-white" size={20} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">Balanço de Lucratividade</h3>
                    <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Performance Financeira do Ativo</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Investimento Total</p>
                    <p className="text-xl md:text-2xl font-black text-white">
                      R$ {totalInvestimento.toLocaleString('pt-BR')}
                    </p>
                  </div>
                  
                  <div className="space-y-1">
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Faturamento Líquido</p>
                    <p className="text-xl md:text-2xl font-black text-white">
                      R$ {faturamentoLiquido.toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 pt-4 md:pt-0 lg:border-l lg:border-white/10 lg:pl-6">
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">Lucro Estimado</p>
                    <p className={cn(
                      "text-xl md:text-2xl font-black",
                      lucroEstimado >= 0 ? "text-emerald-400" : "text-rose-400"
                    )}>
                      R$ {lucroEstimado.toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <div className="space-y-1 border-t md:border-t-0 pt-4 md:pt-0 lg:border-l lg:border-white/10 lg:pl-6">
                    <p className="text-white/50 text-[10px] font-bold uppercase tracking-widest">ROI Estimado</p>
                    <div className="flex items-baseline gap-2">
                      <p className={cn(
                        "text-xl md:text-2xl font-black",
                        roiEstimado >= 0 ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {roiEstimado.toFixed(1)}%
                      </p>
                      <span className="text-[10px] font-bold text-white/30 uppercase tracking-tighter">Sobre invest.</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Aquisição</p>
                    <p className="text-xs font-bold text-white/80">R$ {totalAquisicao.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Reforma</p>
                    <p className="text-xs font-bold text-white/80">R$ {totalReforma.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Holding (Gasto fixo)</p>
                    <p className="text-xs font-bold text-white/80">R$ {totalHolding.toLocaleString('pt-BR')}</p>
                  </div>
                  <div>
                    <p className="text-white/30 text-[8px] font-bold uppercase tracking-widest mb-1">Comissões</p>
                    <p className="text-xs font-bold text-rose-300">R$ {totalComissoes.toLocaleString('pt-BR')}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Custos de Aquisição */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Custos de Aquisição</h3>
                <button 
                  onClick={() => setShowAddAquisicao(!showAddAquisicao)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus size={14} className={cn("transition-transform", showAddAquisicao && "rotate-45")} />
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
                {showAddAquisicao && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Tipo de Custo</label>
                          <select 
                            id="aq-tipo" 
                            onChange={(e) => {
                              const customInput = document.getElementById('aq-tipo-custom-container');
                              if (e.target.value === 'Outros') {
                                customInput?.classList.remove('hidden');
                              } else {
                                customInput?.classList.add('hidden');
                              }
                            }}
                            className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500 mb-2"
                          >
                            <option value="Lance">Lance</option>
                            <option value="ITBI">ITBI</option>
                            <option value="Emolumentos">Emolumentos (Cartório)</option>
                            <option value="Taxa Leiloeiro">Taxa Leiloeiro (5%)</option>
                            <option value="Honorários Advocatícios">Honorários Advocatícios</option>
                            <option value="Certidões">Certidões</option>
                            <option value="IPTU Atrasado">IPTU Atrasado</option>
                            <option value="Condomínio Atrasado">Condomínio Atrasado</option>
                            <option value="Outros">Outros...</option>
                          </select>
                          <div id="aq-tipo-custom-container" className="hidden">
                            <input 
                              type="text" 
                              id="aq-tipo-custom" 
                              placeholder="Descreva o custo..."
                              className={cn(
                                "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all shadow-sm",
                                formErrors.aqTipo ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                              )}
                              onChange={() => {
                                if (formErrors.aqTipo) setFormErrors({...formErrors, aqTipo: ''});
                              }}
                            />
                            {formErrors.aqTipo && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.aqTipo}</p>}
                          </div>
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Valor (R$)</label>
                          <CurrencyInput
                            intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                            decimalSeparator=","
                            groupSeparator="."
                            decimalsLimit={2}
                            placeholder="0,00"
                            className={cn(
                              "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all shadow-sm",
                              formErrors.aqValor ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                            )}
                            value={aquisicaoValor}
                            onValueChange={(_v, _n, values) => {
                              setAquisicaoValor(values?.float || 0);
                              if (formErrors.aqValor) setFormErrors({...formErrors, aqValor: ''});
                            }}
                          />
                          {formErrors.aqValor && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.aqValor}</p>}
                        </div>
                        <div className="col-span-2 md:col-span-1">
                          <FilePicker 
                            label="Comprovante / Nota Fiscal"
                            onFileSelect={(url) => setAquisicaoFileUrl(url)}
                            onClear={() => setAquisicaoFileUrl('')}
                            initialUrl={aquisicaoFileUrl}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => { setShowAddAquisicao(false); setAquisicaoValor(0); setAquisicaoFileUrl(''); }}
                          className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            const tipoSelect = document.getElementById('aq-tipo') as HTMLSelectElement;
                            const tipoCustom = document.getElementById('aq-tipo-custom') as HTMLInputElement;
                            
                            let tipo = tipoSelect.value;
                            if (tipo === 'Outros') {
                              tipo = tipoCustom.value || '';
                            }

                            const errors: Record<string, string> = {};
                            if (!tipo.trim()) errors.aqTipo = "Tipo/Descrição obrigatória";
                            if (!aquisicaoValor || aquisicaoValor <= 0) errors.aqValor = "Valor deve ser maior que zero";

                            if (Object.keys(errors).length > 0) {
                              setFormErrors(errors);
                              return;
                            }

                            addCustoAquisicao({ 
                              id_imovel: id!, 
                              tipo_custo: tipo, 
                              valor: aquisicaoValor || 0, 
                              status_pagamento: StatusPagamento.Pendente,
                              fileUrl: aquisicaoFileUrl
                            });
                            setShowAddAquisicao(false);
                            setFormErrors({});
                            setAquisicaoValor(0);
                            setAquisicaoFileUrl('');
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                {filteredCustosAquisicao.map(c => (
                  <div key={c.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{c.tipo_custo}</p>
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-500">{c.status_pagamento}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {c.fileUrl && (
                        <FileThumbnail url={c.fileUrl} className="w-10 h-10" />
                      )}
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">R$ {c.valor.toLocaleString('pt-BR')}</p>
                        <p className="text-[8px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-tighter mt-1">Valor do Custo</p>
                      </div>
                      <button onClick={() => removeCustoAquisicao(c.id!)} className="text-slate-500 dark:text-slate-700 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Custos de Reforma */}
            <div className="space-y-6 lg:col-span-2">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Cronograma & Custos de Reforma</h3>
                  <button 
                    onClick={() => setShowAddReforma(!showAddReforma)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider transition-all",
                      showAddReforma ? "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400" : "bg-blue-600 text-white shadow-sm shadow-blue-100 dark:shadow-none"
                    )}
                  >
                    <Plus size={12} className={cn("transition-transform", showAddReforma && "rotate-45")} />
                    {showAddReforma ? "Fechar" : "Registrar Novo Custo"}
                  </button>
                </div>
                <div className="flex gap-2">
                  <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                    <p className="text-[8px] font-bold text-blue-400 dark:text-blue-500 uppercase tracking-tighter">Total Orçado</p>
                    <p className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      R$ {filteredCustosReforma.reduce((acc, curr) => acc + (curr.orcamento || 0), 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                  <div className="px-3 py-1 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg border border-emerald-100 dark:border-emerald-800">
                    <p className="text-[8px] font-bold text-emerald-400 dark:text-emerald-500 uppercase tracking-tighter">Total Real</p>
                    <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
                      R$ {filteredCustosReforma.reduce((acc, curr) => acc + (curr.valor_real || 0), 0).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                {showAddReforma && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-5 bg-slate-50/80 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-start">
                      <div className="md:col-span-2">
                        <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Descrição da Etapa</label>
                        <input 
                          type="text" 
                          id="reforma-desc"
                          placeholder="Ex: Pintura, Piso, Elétrica..."
                          className={cn(
                            "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all shadow-sm",
                            formErrors.desc ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                          )}
                        />
                        {formErrors.desc && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.desc}</p>}
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Orçamento (R$)</label>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="0,00"
                          className={cn(
                            "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all shadow-sm",
                            formErrors.orc ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                          )}
                          value={reformaOrc}
                          onValueChange={(_value, _name, values) => setReformaOrc(values?.float || 0)}
                        />
                        {formErrors.orc && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.orc}</p>}
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Valor Real (R$)</label>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="0,00"
                          className={cn(
                            "w-full px-3 py-2 bg-white dark:bg-slate-800 border rounded-lg text-xs outline-none transition-all shadow-sm",
                            formErrors.real 
                              ? "border-rose-500 ring-1 ring-rose-500 dark:text-rose-400" 
                              : (reformaReal && reformaReal > 0 && reformaOrc && reformaOrc > 0)
                                ? (reformaReal > reformaOrc 
                                    ? "border-rose-500 ring-1 ring-rose-500/30 text-rose-600 dark:text-rose-400 focus:ring-rose-500" 
                                    : "border-emerald-500 ring-1 ring-emerald-500/30 text-emerald-600 dark:text-emerald-400 focus:ring-emerald-500")
                                : "border-slate-200 dark:border-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-blue-500"
                          )}
                          value={reformaReal}
                          onValueChange={(_value, _name, values) => setReformaReal(values?.float || 0)}
                        />
                        {formErrors.real && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.real}</p>}
                      </div>
                      <div className="grid grid-cols-2 gap-4 md:col-span-1">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 text-nowrap">Prazo Est.</label>
                          <input 
                            type="date" 
                            id="reforma-prazo"
                            className={cn(
                              "w-full px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-[10px] outline-none transition-all shadow-sm",
                              formErrors.prazo ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                            )}
                          />
                          {formErrors.prazo && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.prazo}</p>}
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5 text-nowrap">Conclusão</label>
                          <input 
                            type="date" 
                            id="reforma-conclusao"
                            className={cn(
                              "w-full px-2 py-1.5 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-[10px] outline-none transition-all shadow-sm",
                              formErrors.conclusao ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                            )}
                          />
                          {formErrors.conclusao && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.conclusao}</p>}
                        </div>
                      </div>
                      <div className="md:col-span-5">
                        <FilePicker 
                          label="Comprovante / Nota Fiscal"
                          onFileSelect={(url) => setReformaFileUrl(url)}
                          onClear={() => setReformaFileUrl('')}
                          initialUrl={reformaFileUrl}
                        />
                      </div>
                      <div className="md:col-span-5 flex flex-wrap justify-end gap-3 mt-2">
                        <button 
                          onClick={() => {
                            setShowAddReforma(false);
                            setFormErrors({});
                            setReformaOrc(0);
                            setReformaReal(0);
                            setReformaFileUrl('');
                          }}
                          className="px-4 py-2 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            const descInput = document.getElementById('reforma-desc') as HTMLInputElement;
                            const prazoInput = document.getElementById('reforma-prazo') as HTMLInputElement;
                            const conclusaoInput = document.getElementById('reforma-conclusao') as HTMLInputElement;

                            const desc = descInput.value.trim();
                            const orc = reformaOrc || 0;
                            const real = reformaReal || 0;
                            const prazo = prazoInput.value;
                            const conclusao = conclusaoInput.value;
                            
                            const errors: Record<string, string> = {};
                            if (!desc) errors.desc = "Descrição obrigatória";
                            if (orc <= 0) errors.orc = "Orçamento inválido";
                            if (!prazo) errors.prazo = "Prazo estimado é obrigatório";
                            if (prazo && isNaN(new Date(prazo).getTime())) errors.prazo = "Prazo inválido";
                            if (conclusao && isNaN(new Date(conclusao).getTime())) errors.conclusao = "Data de conclusão inválida";
                            
                            if (Object.keys(errors).length > 0) {
                              setFormErrors(errors);
                              return;
                            }

                            addCustoReforma({ 
                              id_imovel: id!, 
                              descricao_etapa: desc, 
                              orcamento: orc, 
                              valor_real: real,
                              prazo_execucao: prazo,
                              data_conclusao: conclusao,
                              fileUrl: reformaFileUrl
                            });
                            setShowAddReforma(false);
                            setFormErrors({});
                            setReformaOrc(0);
                            setReformaReal(0);
                            setReformaFileUrl('');
                          }}
                          className="btn-primary flex items-center justify-center gap-2 text-[10px] tracking-widest px-8 w-full md:w-auto"
                        >
                          <Plus size={14} />
                          SALVAR ETAPA
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                <div className="divide-y divide-slate-50 dark:divide-slate-800">
                  {filteredCustosReforma.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                      Nenhuma etapa de reforma registrada
                    </div>
                  ) : (
                    filteredCustosReforma.map(r => {
                      const isCompleted = !!r.data_conclusao;
                      const isOverBudget = (r.valor_real || 0) > r.orcamento;
                      const isDelayed = !isCompleted && r.prazo_execucao && new Date(r.prazo_execucao) < new Date();
                      
                      return (
                        <div key={r.id} className="p-4 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                          <div className="flex-1 w-full">
                            <div className="flex items-center gap-3 mb-1">
                              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{r.descricao_etapa}</p>
                              <div className={cn(
                                "px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm",
                                isCompleted ? "bg-emerald-500 text-white" : 
                                isDelayed ? "bg-rose-500 text-white" : 
                                "bg-blue-500 text-white"
                              )}>
                                {isCompleted ? "Concluído" : isDelayed ? "Atrasado" : "Em Andamento"}
                              </div>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                             <p className="text-[9px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500">
                                Prazo: <span className="text-slate-600 dark:text-slate-400">{r.prazo_execucao ? new Date(r.prazo_execucao).toLocaleDateString('pt-BR') : 'Indefinido'}</span>
                             </p>
                             <div className="hidden sm:block w-px h-2 bg-slate-200 dark:bg-slate-700" />
                             <p className="text-[9px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500">
                                Conclusão: <span className={cn(
                                  "font-bold",
                                  r.data_conclusao ? "text-slate-800 dark:text-slate-200" : "text-slate-400 dark:text-slate-700"
                                )}>
                                  {r.data_conclusao ? new Date(r.data_conclusao).toLocaleDateString('pt-BR') : 'Pendente'}
                                </span>
                             </p>
                             <div className="hidden sm:block w-px h-2 bg-slate-200 dark:bg-slate-700" />
                             <p className="text-[9px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500">
                                Orc: <span className="text-slate-600 dark:text-slate-400">R$ {r.orcamento.toLocaleString('pt-BR')}</span>
                             </p>
                             <div className="hidden sm:block w-px h-2 bg-slate-200 dark:bg-slate-700" />
                             <p className="text-[9px] font-bold uppercase tracking-tighter text-slate-400 dark:text-slate-500">
                                Realizado: <span className={cn(
                                  "font-bold",
                                  (r.valor_real || 0) > r.orcamento ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"
                                )}>
                                  R$ {(r.valor_real || 0).toLocaleString('pt-BR')}
                                </span>
                             </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-4 border-t md:border-t-0 border-slate-50 dark:border-slate-800 pt-3 md:pt-0">
                          {r.fileUrl && (
                            <FileThumbnail url={r.fileUrl} className="w-12 h-12" />
                          )}
                          <div className="text-left md:text-right">
                            <p className={cn(
                              "text-xs font-black",
                              (r.valor_real || 0) > r.orcamento ? "text-rose-500 dark:text-rose-400" : "text-emerald-500 dark:text-emerald-400"
                            )}>
                              {r.orcamento > 0 ? ((((r.valor_real || 0) / r.orcamento) - 1) * 100).toFixed(1) + '%' : '0%'}
                            </p>
                            <p className="text-[8px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-tighter">Variação</p>
                          </div>
                          <button onClick={() => removeCustoReforma(r.id!)} className="text-slate-500 dark:text-slate-700 hover:text-rose-500 transition-colors">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
                </div>
              </div>
            </div>

            {/* Holding / Mensalidades */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Holding (Manutenção)</h3>
                <button 
                  onClick={() => setShowAddHolding(!showAddHolding)}
                  className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-md hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Plus size={14} className={cn("transition-transform", showAddHolding && "rotate-45")} />
                </button>
              </div>
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
                {showAddHolding && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-5 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800"
                  >
                    <div className="grid grid-cols-1 gap-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Despesa</label>
                          <input 
                            type="text" 
                            id="hold-tipo" 
                            placeholder="Ex: Condomínio, IPTU..."
                            className={cn(
                              "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all",
                              formErrors.holdTipo ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                            )}
                          />
                          {formErrors.holdTipo && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.holdTipo}</p>}
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-500 dark:text-slate-400 uppercase mb-1.5">Valor (R$)</label>
                          <CurrencyInput
                            intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                            decimalSeparator=","
                            groupSeparator="."
                            decimalsLimit={2}
                            placeholder="0,00"
                            className={cn(
                              "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all",
                              formErrors.holdValor ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-blue-500"
                            )}
                            value={holdingValor}
                            onValueChange={(_v, _n, values) => {
                              setHoldingValor(values?.float || 0);
                              if (formErrors.holdValor) setFormErrors({...formErrors, holdValor: ''});
                            }}
                          />
                          {formErrors.holdValor && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.holdValor}</p>}
                        </div>
                        <div className="col-span-2">
                          <FilePicker 
                            label="Comprovante / Nota Fiscal"
                            onFileSelect={(url) => setHoldingFileUrl(url)}
                            onClear={() => setHoldingFileUrl('')}
                            initialUrl={holdingFileUrl}
                          />
                        </div>
                      </div>
                      <div className="flex justify-end gap-3">
                        <button 
                          onClick={() => { setShowAddHolding(false); setHoldingValor(0); setHoldingFileUrl(''); }}
                          className="px-3 py-1.5 text-[9px] font-bold text-slate-500 uppercase tracking-widest"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            const tipo = (document.getElementById('hold-tipo') as HTMLInputElement).value.trim();
                            const valor = holdingValor || 0;
                            
                            const errors: Record<string, string> = {};
                            if (!tipo) errors.holdTipo = "Despesa é obrigatória";
                            if (valor <= 0) errors.holdValor = "Valor deve ser maior que zero";

                            if (Object.keys(errors).length > 0) {
                              setFormErrors(errors);
                              return;
                            }

                            addHolding({ 
                              id_imovel: id!, 
                              tipo_despesa: tipo, 
                              valor_mensal: valor,
                              competencia: new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' }),
                              fileUrl: holdingFileUrl
                            });
                            setShowAddHolding(false);
                            setFormErrors({});
                            setHoldingValor(0);
                            setHoldingFileUrl('');
                          }}
                          className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[9px] font-bold uppercase tracking-widest shadow-sm"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
                {filteredHolding.map(h => (
                  <div key={h.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{h.tipo_despesa}</p>
                      <p className="text-[10px] font-bold uppercase tracking-tighter text-slate-500 dark:text-slate-500">{h.competencia}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      {h.fileUrl && (
                        <FileThumbnail url={h.fileUrl} className="w-10 h-10" />
                      )}
                      <div className="text-right">
                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100 leading-none">R$ {h.valor_mensal.toLocaleString('pt-BR')}</p>
                        <p className="text-[8px] text-slate-500 dark:text-slate-600 font-bold uppercase tracking-tighter mt-1">Gasto Mensal</p>
                      </div>
                      <button onClick={() => removeHolding(h.id!)} className="text-slate-500 dark:text-slate-700 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Faturamento */}
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Faturamento Realizado</h3>
                <button 
                  onClick={() => setShowAddFaturamento(!showAddFaturamento)}
                  className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-md hover:bg-emerald-100 dark:hover:bg-emerald-800 transition-colors"
                >
                  <Plus size={14} className={cn("transition-transform", showAddFaturamento && "rotate-45")} />
                </button>
              </div>
              
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm divide-y divide-slate-50 dark:divide-slate-800 overflow-hidden">
                {showAddFaturamento && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    className="p-5 bg-emerald-50/30 dark:bg-emerald-950/20 border-b border-emerald-100 dark:border-emerald-900/40"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Tipo</label>
                        <select 
                          id="fat-tipo"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                        >
                          <option value={TipoFaturamento.Venda}>Venda</option>
                          <option value={TipoFaturamento.Locacao}>Locação</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Valor Bruto (R$)</label>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="0,00"
                          className={cn(
                            "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all shadow-sm",
                            formErrors.fatValor ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-emerald-500"
                          )}
                          value={fatValor}
                          onValueChange={(_value, _name, values) => setFatValor(values?.float || 0)}
                        />
                        {formErrors.fatValor && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.fatValor}</p>}
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Corretagem (R$)</label>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="0,00"
                          className="w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-1 focus:ring-emerald-500 shadow-sm"
                          value={fatComissao}
                          onValueChange={(_value, _name, values) => setFatComissao(values?.float || 0)}
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1.5">Data</label>
                        <input 
                          type="date" 
                          id="fat-data"
                          className={cn(
                            "w-full px-3 py-2 bg-white dark:bg-slate-800 dark:text-slate-200 border rounded-lg text-xs outline-none transition-all shadow-sm",
                            formErrors.fatData ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-1 focus:ring-emerald-500"
                          )}
                        />
                        {formErrors.fatData && <p className="text-[8px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{formErrors.fatData}</p>}
                      </div>
                      <div className="md:col-span-4 flex justify-end gap-3 mt-2">
                        <button 
                          onClick={() => {
                            setShowAddFaturamento(false);
                            setFormErrors({});
                            setFatValor(0);
                            setFatComissao(0);
                          }}
                          className="px-4 py-2 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={() => {
                            const tipoInput = document.getElementById('fat-tipo') as HTMLSelectElement;
                            const dataInput = document.getElementById('fat-data') as HTMLInputElement;

                            const valor = fatValor || 0;
                            const comissao = fatComissao || 0;
                            const data = dataInput.value;
                            
                            const errors: Record<string, string> = {};
                            if (valor <= 0) errors.fatValor = "Valor deve ser positivo";
                            if (!data) errors.fatData = "Data obrigatória";
                            if (data && isNaN(new Date(data).getTime())) errors.fatData = "Data inválida";
                            
                            if (Object.keys(errors).length > 0) {
                              setFormErrors(errors);
                              return;
                            }

                            addFaturamento({ 
                              id_imovel: id!, 
                              tipo: tipoInput.value as TipoFaturamento, 
                              valor: valor,
                              custo_corretagem: comissao,
                              data_operacao: data
                            });
                            setShowAddFaturamento(false);
                            setFormErrors({});
                            setFatValor(0);
                            setFatComissao(0);
                          }}
                          className="btn-primary bg-emerald-600 hover:bg-emerald-700 border-emerald-500 flex items-center justify-center gap-2 text-[10px] tracking-widest px-8 w-full md:w-auto shadow-emerald-500/20 shadow-lg"
                        >
                          <Plus size={14} />
                          REGISTRAR FATURAMENTO
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {filteredFaturamento.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-600 text-[10px] font-bold uppercase tracking-widest">
                    Nenhum faturamento registrado
                  </div>
                ) : (
                  filteredFaturamento.map(f => (
                    <div key={f.id} className="p-4 flex justify-between items-center hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "w-2 h-2 rounded-full",
                        f.tipo === TipoFaturamento.Venda ? "bg-emerald-500" : "bg-blue-500"
                      )} />
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">{f.tipo}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Calendar size={10} className="text-slate-500 dark:text-slate-600" />
                          <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-tighter">{f.data_operacao || 'Pendente'}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400 leading-none">R$ {f.valor.toLocaleString('pt-BR')}</p>
                        {f.custo_corretagem && <p className="text-[10px] text-rose-400 dark:text-rose-500 font-bold uppercase mt-1">- R$ {f.custo_corretagem.toLocaleString('pt-BR')} Comissão</p>}
                      </div>
                      <button onClick={() => removeFaturamento(f.id!)} className="text-slate-500 dark:text-slate-700 hover:text-rose-500 transition-colors">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
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
              className="space-y-6"
            >
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Repositório de Documentos</h3>
              <button 
                onClick={() => addDocumento({ id_imovel: id!, tipo_doc: 'Escritura', status: StatusDoc.Pendente })}
                className="btn-primary flex items-center gap-2 text-[10px] tracking-widest w-full md:w-auto justify-center"
              >
                <Plus size={14} />
                ANEXAR ARQUIVO
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredDocumentos.map(doc => (
                <div key={doc.id} className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col gap-4 hover:shadow-lg hover:border-blue-200 dark:hover:border-blue-900/40 transition-all group relative overflow-hidden">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                        {getFileMetaData(doc.fileUrl)?.isPDF ? <FileIcon size={20} /> : <ImageIcon size={20} />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate leading-tight">{doc.tipo_doc}</p>
                        <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest mt-0.5">ID: {doc.id?.slice(-6)}</p>
                      </div>
                    </div>
                    <button onClick={() => removeDocumento(doc.id!)} className="text-slate-500 dark:text-slate-800 hover:text-rose-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>

                  <div className="relative aspect-video rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-center overflow-hidden">
                    {doc.fileUrl ? (
                      <FileThumbnail url={doc.fileUrl} className="w-full h-full border-0 rounded-none shadow-none" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-500 dark:text-slate-700">
                        <ImageIcon size={32} strokeWidth={1} />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Sem visualização</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-2 border-t border-slate-50 dark:border-slate-800/60">
                    <div className={cn(
                      "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm",
                      doc.status === StatusDoc.Registrado ? "bg-emerald-500 text-white" : 
                      doc.status === StatusDoc.Pendente ? "bg-slate-100 dark:bg-slate-800 text-slate-500" :
                      "bg-blue-500 text-white"
                    )}>
                      {doc.status === StatusDoc.Registrado && <CheckCircle2 size={10} />}
                      {doc.status === StatusDoc.Pendente && <Clock size={10} />}
                      {doc.status}
                    </div>
                    
                    {doc.fileUrl && (
                      <div className="flex items-center gap-1">
                        <a 
                          href={doc.fileUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="p-1.5 text-slate-500 hover:text-blue-500 transition-colors"
                          title="Visualizar"
                        >
                          <Eye size={16} />
                        </a>
                        <a 
                          href={doc.fileUrl} 
                          download={`${doc.tipo_doc}.png`}
                          className="p-1.5 text-slate-500 hover:text-emerald-500 transition-colors"
                          title="Download"
                        >
                          <Download size={16} />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
    </motion.div>
  );
}
