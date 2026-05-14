import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, MapPin, Building2, ChevronRight, Gavel, Trash2, X, ClipboardCheck, Loader2, Info, Calendar, Link as LinkIcon, PencilLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CurrencyInput from 'react-currency-input-field';
import { useFirestore } from '../hooks/useFirestore';
import { Imovel, TipoImovel, SituacaoJuridica, EstadoConservacao, StatusArrematacao, OrigemImovel, TipoLeilao, FormaArrematacao } from '../types';
import { cn } from '../lib/utils';

export default function Properties() {
  const navigate = useNavigate();
  const { data: properties, add, remove, update } = useFirestore<Imovel>('imoveis');
  
  const [editingProperty, setEditingProperty] = useState<Imovel | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<TipoImovel | 'Todos'>('Todos');
  const [filterOrigem, setFilterOrigem] = useState<OrigemImovel | 'Todos'>('Todos');
  const [filterStatus, setFilterStatus] = useState<StatusArrematacao | 'Todos'>('Todos');
  const [filterLocation, setFilterLocation] = useState('');
  const [searchingCep, setSearchingCep] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<Imovel>>({
    origem: OrigemImovel.Leilao,
    tipo_imovel: TipoImovel.Apartamento,
    situacao_juridica: SituacaoJuridica.ExecucaoFiscal,
    estado_conservacao: EstadoConservacao.Regular,
    status_arrematacao: StatusArrematacao.Analise,
    tipo_leilao: TipoLeilao.Judicial,
    forma_arrematacao: FormaArrematacao.Online,
    codigo: ''
  });

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.endereco?.trim()) newErrors.endereco = 'Endereço é obrigatório';
    if (!formData.matricula?.trim()) newErrors.matricula = 'Matrícula é obrigatória';
    if (!formData.area_m2 || formData.area_m2 <= 0) newErrors.area_m2 = 'Área deve ser maior que zero';
    if (formData.cep && formData.cep.length !== 8) newErrors.cep = 'CEP deve ter 8 dígitos';
    if (!formData.bairro?.trim()) newErrors.bairro = 'Bairro é obrigatório';
    if (!formData.cidade?.trim()) newErrors.cidade = 'Cidade é obrigatória';
    if (!formData.estado?.trim() || formData.estado.length !== 2) newErrors.estado = 'UF inválida';

    if (formData.origem === OrigemImovel.Leilao) {
      if (!formData.processo?.trim()) {
        newErrors.processo = 'Número do processo é obrigatório';
      } else if (formData.processo.length < 10) {
        newErrors.processo = 'Número do processo parece ser inválido';
      }

      if (!formData.comarca?.trim()) newErrors.comarca = 'Comarca é obrigatória';
      
      if (!formData.data_leilao) {
        newErrors.data_leilao = 'Data do leilão é obrigatória';
      } else {
        const date = new Date(formData.data_leilao);
        if (isNaN(date.getTime())) {
          newErrors.data_leilao = 'Data do leilão é inválida';
        }
      }

      if (formData.valor_avaliacao === undefined || formData.valor_avaliacao <= 0) {
        newErrors.valor_avaliacao = 'Valor de avaliação deve ser positivo';
      }
      if (formData.valor_minimo === undefined || formData.valor_minimo <= 0) {
        newErrors.valor_minimo = 'Lance mínimo deve ser positivo';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const filteredProperties = properties.filter(p => {
    const matchesSearch = p.endereco.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.matricula.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (p.codigo && p.codigo.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesType = filterType === 'Todos' || p.tipo_imovel === filterType;
    const matchesOrigem = filterOrigem === 'Todos' || p.origem === filterOrigem;
    const matchesStatus = filterStatus === 'Todos' || p.status_arrematacao === filterStatus;
    const matchesLocation = !filterLocation || 
                           (p.cidade?.toLowerCase().includes(filterLocation.toLowerCase()) || 
                            p.estado?.toLowerCase().includes(filterLocation.toLowerCase()));
    
    return matchesSearch && matchesType && matchesOrigem && matchesStatus && matchesLocation;
  });

  const handleCepChange = async (cep: string) => {
    const cleanCep = cep.replace(/\D/g, '');
    setFormData({ ...formData, cep: cleanCep });

    if (cleanCep.length === 8) {
      setSearchingCep(true);
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await response.json();
        
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro,
            bairro: data.bairro,
            cidade: data.localidade,
            estado: data.uf
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      } finally {
        setSearchingCep(false);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      origem: OrigemImovel.Leilao,
      tipo_imovel: TipoImovel.Apartamento,
      situacao_juridica: SituacaoJuridica.ExecucaoFiscal,
      estado_conservacao: EstadoConservacao.Regular,
      status_arrematacao: StatusArrematacao.Analise,
      tipo_leilao: TipoLeilao.Judicial,
      forma_arrematacao: FormaArrematacao.Online,
      cep: '',
      endereco: '',
      bairro: '',
      cidade: '',
      estado: '',
      matricula: '',
      area_m2: undefined,
      processo: '',
      comarca: '',
      data_leilao: '',
      link_edital: '',
      valor_avaliacao: 0,
      valor_minimo: 0,
      condicoes_pagamento: '',
      codigo: ''
    });
  };

  const handleOpenModal = () => {
    setEditingProperty(null);
    resetForm();
    setIsModalOpen(true);
  };

  const handleEditModal = (property: Imovel) => {
    setEditingProperty(property);
    setFormData(property);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      const dataToSave = { ...formData };
      
      if (!dataToSave.codigo) {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        dataToSave.codigo = `IMV-${timestamp}-${random}`;
      }

      if (editingProperty?.id) {
        await update(editingProperty.id, dataToSave);
      } else {
        await add(dataToSave as any);
      }
      setIsModalOpen(false);
      resetForm();
    } catch (err) {
      alert('Erro ao salvar imóvel');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tighter">Portfólio Imobiliário</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">Gestão estratégica de ativos imobiliários</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="flex items-center justify-center gap-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-2xl shadow-slate-200 dark:shadow-none shrink-0"
        >
          <Plus size={18} strokeWidth={3} />
          Novo Ativo
        </button>
      </div>

      {/* Quick Stats Summary */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Geral', val: properties.length, color: 'text-slate-900', bg: 'bg-white' },
          { label: 'Em Análise', val: properties.filter(p => p.status_arrematacao === StatusArrematacao.Analise).length, color: 'text-amber-500', bg: 'bg-amber-50/50' },
          { label: 'Arrematados', val: properties.filter(p => p.status_arrematacao === StatusArrematacao.Arrematado).length, color: 'text-emerald-500', bg: 'bg-emerald-50/50' },
          { label: 'Reprovados', val: properties.filter(p => p.status_arrematacao === StatusArrematacao.Reprovado).length, color: 'text-rose-500', bg: 'bg-rose-50/50' }
        ].map((stat, i) => (
          <div key={i} className={cn("p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm", stat.bg)}>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className={cn("text-2xl font-black tracking-tighter", stat.color)}>{stat.val}</h3>
          </div>
        ))}
      </section>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-5">
        <div className="flex items-center gap-4 group">
          <Search className="text-slate-400 group-focus-within:text-slate-900 transition-colors" size={20} />
          <input
            type="text"
            placeholder="Pesquisar por endereço, matrícula ou número do processo..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold placeholder:text-slate-400 dark:text-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-3 pt-5 border-t border-slate-50 dark:border-slate-800">
          <select 
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-900/5 appearance-none min-w-[140px]"
          >
            <option value="Todos">Status: Todos</option>
            {Object.values(StatusArrematacao).map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select 
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 px-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-900/5 appearance-none min-w-[140px]"
          >
            <option value="Todos">Categoria: Todos</option>
            {Object.values(TipoImovel).map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <div className="relative flex-1 min-w-[200px]">
            <MapPin size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Localidade (Cidade ou UF)"
              className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-[10px] font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 pl-11 pr-4 py-2.5 outline-none focus:ring-2 focus:ring-slate-900/5"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            />
          </div>

          <button 
            onClick={() => {
              setSearchTerm('');
              setFilterType('Todos');
              setFilterStatus('Todos');
              setFilterLocation('');
            }}
            className="px-4 py-2 text-[10px] font-black text-rose-500 uppercase tracking-widest hover:bg-rose-50 rounded-xl transition-colors"
          >
            Limpar
          </button>
        </div>
      </div>

      {/* Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 pb-12">
        <AnimatePresence mode="popLayout">
          {filteredProperties.length > 0 ? (
            filteredProperties.map((imovel) => (
              <motion.div
                layout
                key={imovel.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="group bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-2xl hover:shadow-slate-200/50 dark:hover:shadow-none transition-all duration-500 overflow-hidden flex flex-col"
              >
                {/* Visual Header */}
                <div className="relative h-32 bg-slate-50 dark:bg-slate-800/50 flex items-center justify-center overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-100/50 to-transparent dark:from-slate-800/50" />
                  <Building2 size={48} className="text-slate-200 dark:text-slate-700 group-hover:scale-110 group-hover:text-amber-500/20 transition-all duration-700" strokeWidth={1} />
                  
                  {/* Status Badge */}
                  <div className={cn(
                    "absolute top-4 right-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm border",
                    imovel.status_arrematacao === StatusArrematacao.Arrematado 
                      ? "bg-emerald-500 border-emerald-400 text-white" 
                      : imovel.status_arrematacao === StatusArrematacao.Analise 
                        ? "bg-amber-500 border-amber-400 text-white" 
                        : "bg-slate-700 border-slate-600 text-white"
                  )}>
                    {imovel.status_arrematacao}
                  </div>
                </div>

                <div className="p-6 flex-1 flex flex-col">
                  <div className="mb-4">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <MapPin size={10} />
                        {imovel.bairro} • {imovel.cidade}/{imovel.estado}
                      </p>
                      {imovel.codigo && (
                        <p className="text-[8px] font-black text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                          {imovel.codigo}
                        </p>
                      )}
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem]">
                      {imovel.endereco}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50 dark:border-slate-800 mb-6">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Área Útil</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-300">{imovel.area_m2} m²</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Categoria</p>
                      <p className="text-xs font-black text-slate-700 dark:text-slate-300">{imovel.tipo_imovel}</p>
                    </div>
                  </div>

                  <div className="mt-auto space-y-3">
                    {imovel.origem === OrigemImovel.Leilao && imovel.valor_minimo && (
                      <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-amber-50 dark:group-hover:bg-amber-900/10 transition-colors">
                        <p className="text-[10px] font-black text-slate-400 group-hover:text-amber-600 uppercase tracking-widest">Lance Mínimo</p>
                        <p className="text-sm font-black text-slate-900 dark:text-white group-hover:text-amber-600">R$ {imovel.valor_minimo.toLocaleString('pt-BR')}</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                       <button
                        onClick={() => handleEditModal(imovel)}
                        className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all active:scale-95"
                        title="Editar Dados Básicos"
                      >
                        <PencilLine size={16} />
                      </button>
                      <button
                        onClick={() => navigate(`/properties/${imovel.id}`)}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none"
                      >
                        Gerenciar Ativo
                        <ChevronRight size={14} strokeWidth={3} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); remove(imovel.id!); }}
                        className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-500 hover:text-white transition-all active:scale-95"
                        title="Arquivar"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          ) : (
            <div className="col-span-full py-24 flex flex-col items-center justify-center text-center space-y-6 bg-slate-50/50 dark:bg-slate-900 rounded-[3rem] border-2 border-dashed border-slate-100 dark:border-slate-800">
              <div className="size-24 bg-white dark:bg-slate-800 rounded-full shadow-inner flex items-center justify-center text-slate-200 dark:text-slate-700">
                <Search size={48} strokeWidth={1} />
              </div>
              <div className="max-w-xs space-y-2">
                <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Nenhum ativo resgatado</h3>
                <p className="text-sm text-slate-500 font-medium">Não encontramos nenhum imóvel com os critérios selecionados.</p>
              </div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterType('Todos');
                  setFilterStatus('Todos');
                  setFilterLocation('');
                }}
                className="px-8 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-sm hover:shadow-md transition-all"
              >
                Limpar Filtros
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="flex flex-col h-[90vh] md:h-auto max-h-[90vh] dark:text-slate-200">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800 shrink-0">
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                      {editingProperty ? 'Editar Imóvel' : 'Cadastrar Imóvel'}
                    </h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
                      {editingProperty ? 'Atualizar Ativo no Portfólio' : 'Novo Ativo no Portfólio'}
                    </p>
                  </div>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-full transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-hide">
                  {/* Seção 1: Identificação e Aquisição */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                          <ClipboardCheck size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Código Único</h3>
                      </div>
                      <input
                        type="text"
                        placeholder="Automático"
                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border-none rounded-xl text-sm font-black dark:text-slate-200 outline-none"
                        value={formData.codigo || ''}
                        onChange={e => setFormData({ ...formData, codigo: e.target.value.toUpperCase() })}
                      />
                    </section>

                    <section className="space-y-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                          <ClipboardCheck size={16} className="text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo de Aquisição</h3>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-2">
                        {Object.values(OrigemImovel).map(origem => (
                          <button
                            key={origem}
                            type="button"
                            onClick={() => setFormData({ ...formData, origem })}
                            className={cn(
                              "flex-1 py-3 px-4 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all",
                              formData.origem === origem 
                                ? "bg-slate-900 dark:bg-white border-slate-900 dark:border-white text-white dark:text-slate-900 shadow-lg shadow-slate-200 dark:shadow-none" 
                                : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-500 hover:border-slate-400"
                            )}
                          >
                            {origem}
                          </button>
                        ))}
                      </div>
                    </section>
                  </div>

                  {/* Seção 2: Dados do Leilão (Condicional) */}
                  {formData.origem === OrigemImovel.Leilao && (
                    <motion.section 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-5 bg-slate-50/50 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-5"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
                          <Gavel size={16} className="text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Dados do Processo</h3>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Número do Processo</label>
                          <input
                            type="text"
                            placeholder="0000000-00.0000.0.00.0000"
                            className={cn(
                              "w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-medium dark:text-slate-200 transition-all focus:ring-2",
                              errors.processo ? "border-rose-500 focus:ring-rose-500/10" : "border-slate-200 dark:border-slate-700 focus:ring-indigo-500/10"
                            )}
                            value={formData.processo || ''}
                            onChange={e => {
                              setFormData({...formData, processo: e.target.value});
                              if (errors.processo) setErrors({...errors, processo: ''});
                            }}
                          />
                          {errors.processo && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.processo}</p>}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Comarca / Vara</label>
                            <input
                              type="text"
                              className={cn(
                                "w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-medium dark:text-slate-200",
                                errors.comarca ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
                              )}
                              value={formData.comarca || ''}
                              onChange={e => {
                                setFormData({...formData, comarca: e.target.value});
                                if (errors.comarca) setErrors({...errors, comarca: ''});
                              }}
                            />
                            {errors.comarca && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.comarca}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Data do Leilão</label>
                            <input
                              type="datetime-local"
                              className={cn(
                                "w-full px-4 py-3 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-medium dark:text-slate-200",
                                errors.data_leilao ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
                              )}
                              value={formData.data_leilao || ''}
                              onChange={e => {
                                setFormData({...formData, data_leilao: e.target.value});
                                if (errors.data_leilao) setErrors({...errors, data_leilao: ''});
                              }}
                            />
                            {errors.data_leilao && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.data_leilao}</p>}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Tipo de Leilão</label>
                            <select
                              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium dark:text-slate-200 appearance-none shadow-sm"
                              value={formData.tipo_leilao}
                              onChange={e => setFormData({...formData, tipo_leilao: e.target.value as TipoLeilao})}
                            >
                              <option value={TipoLeilao.Judicial}>Judicial</option>
                              <option value={TipoLeilao.Extrajudicial}>Extrajudicial</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Forma</label>
                            <select
                              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium dark:text-slate-200 appearance-none shadow-sm"
                              value={formData.forma_arrematacao}
                              onChange={e => setFormData({...formData, forma_arrematacao: e.target.value as FormaArrematacao})}
                            >
                              <option value={FormaArrematacao.Online}>Online</option>
                              <option value={FormaArrematacao.Presencial}>Presencial</option>
                              <option value={FormaArrematacao.Hibrido}>Híbrido</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Avaliação</label>
                            <div className="relative">
                              <span className={cn(
                                "absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold border-r pr-3 transition-colors",
                                errors.valor_avaliacao ? "text-rose-500 border-rose-200" : "text-slate-400 border-slate-100 dark:border-slate-700"
                              )}>R$</span>
                              <CurrencyInput
                                intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                                decimalSeparator=","
                                groupSeparator="."
                                decimalsLimit={2}
                                placeholder="0,00"
                                className={cn(
                                  "w-full pl-14 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-black dark:text-slate-200 transition-all",
                                  errors.valor_avaliacao ? "border-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/10"
                                )}
                                value={formData.valor_avaliacao || ''}
                                onValueChange={(_v, _n, values) => {
                                  setFormData({...formData, valor_avaliacao: values?.float || 0});
                                  if (errors.valor_avaliacao) setErrors({...errors, valor_avaliacao: ''});
                                }}
                              />
                            </div>
                            {errors.valor_avaliacao && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.valor_avaliacao}</p>}
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Lance Mínimo</label>
                            <div className="relative">
                              <span className={cn(
                                "absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold border-r pr-3 transition-colors",
                                errors.valor_minimo ? "text-rose-500 border-rose-200" : "text-slate-400 border-slate-100 dark:border-slate-700"
                              )}>R$</span>
                              <CurrencyInput
                                intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                                decimalSeparator=","
                                groupSeparator="."
                                decimalsLimit={2}
                                placeholder="0,00"
                                className={cn(
                                  "w-full pl-14 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-black dark:text-slate-200 transition-all",
                                  errors.valor_minimo ? "border-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/10"
                                )}
                                value={formData.valor_minimo || ''}
                                onValueChange={(_v, _n, values) => {
                                  setFormData({...formData, valor_minimo: values?.float || 0});
                                  if (errors.valor_minimo) setErrors({...errors, valor_minimo: ''});
                                }}
                              />
                            </div>
                            {errors.valor_minimo && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.valor_minimo}</p>}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Link do Edital</label>
                          <div className="relative">
                            <LinkIcon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="https://exemplo.com/edital"
                              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium dark:text-slate-200 focus:ring-2 focus:ring-blue-500/10"
                              value={formData.link_edital || ''}
                              onChange={e => setFormData({...formData, link_edital: e.target.value})}
                            />
                          </div>
                        </div>
                      </div>
                    </motion.section>
                  )}

                  {/* Seção 3: Localização */}
                  <section className="space-y-6">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-rose-50 dark:bg-rose-900/30 rounded-lg">
                        <MapPin size={16} className="text-rose-600 dark:text-rose-400" />
                      </div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Localização do Ativo</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-5">
                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1 flex items-center gap-2">
                          CEP {searchingCep && <Loader2 size={12} className="animate-spin text-blue-500" />}
                        </label>
                        <input
                          type="text"
                          maxLength={8}
                          placeholder="00000-000"
                          className={cn(
                            "w-full px-4 py-3 border bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-bold shadow-sm transition-all",
                            errors.cep ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/10"
                          )}
                          value={formData.cep || ''}
                          onChange={e => {
                            handleCepChange(e.target.value);
                            if (errors.cep) setErrors({...errors, cep: ''});
                          }}
                        />
                        {errors.cep && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.cep}</p>}
                      </div>
                      
                      <div className="sm:col-span-3 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Endereço Completo</label>
                        <input
                          type="text"
                          placeholder="Rua, Número, Complemento..."
                          className={cn(
                            "w-full px-4 py-3 border bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium shadow-sm transition-all",
                            errors.endereco ? "border-rose-500 focus:ring-2 focus:ring-rose-500/10" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/10"
                          )}
                          value={formData.endereco || ''}
                          onChange={e => {
                            setFormData({...formData, endereco: e.target.value});
                            if (errors.endereco) setErrors({...errors, endereco: ''});
                          }}
                        />
                        {errors.endereco && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.endereco}</p>}
                      </div>

                      <div className="sm:col-span-2 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Bairro</label>
                        <input
                          type="text"
                          className={cn(
                            "w-full px-4 py-3 border bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium shadow-sm",
                            errors.bairro ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
                          )}
                          value={formData.bairro || ''}
                          onChange={e => {
                            setFormData({...formData, bairro: e.target.value});
                            if (errors.bairro) setErrors({...errors, bairro: ''});
                          }}
                        />
                        {errors.bairro && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.bairro}</p>}
                      </div>

                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Cidade</label>
                        <input
                          type="text"
                          className={cn(
                            "w-full px-4 py-3 border bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium shadow-sm",
                            errors.cidade ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
                          )}
                          value={formData.cidade || ''}
                          onChange={e => {
                            setFormData({...formData, cidade: e.target.value});
                            if (errors.cidade) setErrors({...errors, cidade: ''});
                          }}
                        />
                        {errors.cidade && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.cidade}</p>}
                      </div>

                      <div className="sm:col-span-1 space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">UF</label>
                        <input
                          type="text"
                          maxLength={2}
                          className={cn(
                            "w-full px-4 py-3 border bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-bold shadow-sm uppercase text-center",
                            errors.estado ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
                          )}
                          value={formData.estado || ''}
                          onChange={e => {
                            setFormData({...formData, estado: e.target.value.toUpperCase()});
                            if (errors.estado) setErrors({...errors, estado: ''});
                          }}
                        />
                        {errors.estado && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.estado}</p>}
                      </div>
                    </div>
                  </section>

                  {/* Seção 4: Detalhes Técnicos */}
                  <section className="space-y-6 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg">
                        <Building2 size={16} className="text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Especificações do Imóvel</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Matrícula RGI</label>
                        <input
                          type="text"
                          placeholder="EX: 123.456-7"
                          className={cn(
                            "w-full px-4 py-3 border bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium shadow-sm transition-all",
                            errors.matricula ? "border-rose-500" : "border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-emerald-500/10"
                          )}
                          value={formData.matricula || ''}
                          onChange={e => {
                            setFormData({...formData, matricula: e.target.value});
                            if (errors.matricula) setErrors({...errors, matricula: ''});
                          }}
                        />
                        {errors.matricula && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.matricula}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Área Total (m²)</label>
                        <input
                          type="number"
                          step="any"
                          placeholder="0,00"
                          className={cn(
                            "w-full px-4 py-3 border bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-black shadow-sm",
                            errors.area_m2 ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
                          )}
                          value={formData.area_m2 || ''}
                          onChange={e => {
                            setFormData({...formData, area_m2: parseFloat(e.target.value)});
                            if (errors.area_m2) setErrors({...errors, area_m2: ''});
                          }}
                        />
                        {errors.area_m2 && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.area_m2}</p>}
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Categoria de Uso</label>
                        <select
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium dark:text-slate-200 appearance-none shadow-sm"
                          value={formData.tipo_imovel}
                          onChange={e => setFormData({...formData, tipo_imovel: e.target.value as TipoImovel})}
                        >
                          {Object.values(TipoImovel).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Situação Jurídica</label>
                        <select
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium dark:text-slate-200 appearance-none shadow-sm"
                          value={formData.situacao_juridica}
                          onChange={e => setFormData({...formData, situacao_juridica: e.target.value as SituacaoJuridica})}
                        >
                          {Object.values(SituacaoJuridica).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Estado de Conservação</label>
                        <select
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium dark:text-slate-200 appearance-none shadow-sm"
                          value={formData.estado_conservacao}
                          onChange={e => setFormData({...formData, estado_conservacao: e.target.value as EstadoConservacao})}
                        >
                          {Object.values(EstadoConservacao).map(e => <option key={e} value={e}>{e}</option>)}
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Status Arrematação</label>
                        <select
                          className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-medium dark:text-slate-200 appearance-none shadow-sm"
                          value={formData.status_arrematacao}
                          onChange={e => setFormData({...formData, status_arrematacao: e.target.value as StatusArrematacao})}
                        >
                          {Object.values(StatusArrematacao).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 shrink-0 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-4 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all sm:order-1"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 dark:hover:bg-slate-100 transition-all shadow-xl shadow-slate-200 dark:shadow-none sm:order-2"
                  >
                    Finalizar Cadastro
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
