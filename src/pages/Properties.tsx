import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, MapPin, Building2, ChevronRight, Gavel, Trash2, X, ClipboardCheck, Loader2, Info, Calendar, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import CurrencyInput from 'react-currency-input-field';
import { useFirestore } from '../hooks/useFirestore';
import { Imovel, TipoImovel, SituacaoJuridica, EstadoConservacao, StatusArrematacao, OrigemImovel, TipoLeilao, FormaArrematacao } from '../types';
import { cn } from '../lib/utils';

export default function Properties() {
  const navigate = useNavigate();
  const { data: properties, add, remove } = useFirestore<Imovel>('imoveis');
  
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
    forma_arrematacao: FormaArrematacao.Online
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
                         p.matricula.toLowerCase().includes(searchTerm.toLowerCase());
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
      condicoes_pagamento: ''
    });
  };

  const handleOpenModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    try {
      await add(formData as any);
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Imóveis</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base">Gestão de catálogo e ativos arrematados</p>
        </div>
        <button
          onClick={handleOpenModal}
          className="btn-primary flex items-center gap-2"
        >
          <Plus size={18} />
          Cadastrar Imóvel
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Search className="text-slate-500 dark:text-slate-500" size={18} />
          <input
            type="text"
            placeholder="Buscar ativos por endereço ou matrícula..."
            className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-500 dark:placeholder:text-slate-600 font-medium dark:text-slate-200"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Categoria</label>
            <select 
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Todos">Todas Categorias</option>
              {Object.values(TipoImovel).map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Origem</label>
            <select 
              value={filterOrigem}
              onChange={(e) => setFilterOrigem(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Todos">Todas Origens</option>
              {Object.values(OrigemImovel).map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 min-w-[140px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Status</label>
            <select 
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="Todos">Todos Status</option>
              {Object.values(StatusArrematacao).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
            <label className="text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Localidade (Cidade/UF)</label>
            <div className="relative">
              <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-600" />
              <input
                type="text"
                placeholder="Ex: São Paulo, SP..."
                className="w-full bg-slate-50 dark:bg-slate-800 border-none rounded-lg text-xs font-bold text-slate-600 dark:text-slate-300 pl-9 pr-3 py-2 outline-none focus:ring-2 focus:ring-blue-500/20"
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
              />
            </div>
          </div>

          <button 
            onClick={() => {
              setSearchTerm('');
              setFilterType('Todos');
              setFilterOrigem('Todos');
              setFilterStatus('Todos');
              setFilterLocation('');
            }}
            className="mt-5 text-[10px] font-bold text-blue-600 uppercase tracking-widest hover:text-blue-700 transition-colors px-2"
          >
            Limpar Filtros
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800">
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Ativo</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest text-center">Status</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest">Categoria</th>
                <th className="px-6 py-4 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest text-right">Controle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {filteredProperties.map((imovel) => (
                <tr key={imovel.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer group" onClick={() => navigate(`/properties/${imovel.id}`)}>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center shrink-0 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-colors">
                        <Building2 className="text-slate-500 dark:text-slate-600 group-hover:text-blue-500 dark:group-hover:text-blue-400" size={20} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800 dark:text-slate-200 truncate max-w-sm leading-tight">{imovel.endereco}</p>
                        <p className="text-[10px] text-slate-600 dark:text-slate-500 flex items-center gap-1 font-bold mt-0.5 uppercase tracking-tighter">
                          {imovel.cidade && imovel.estado ? `${imovel.cidade} - ${imovel.estado} • ` : ''}
                          Matrícula: {imovel.matricula} • {imovel.area_m2}m²
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                      imovel.status_arrematacao === StatusArrematacao.Arrematado ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" :
                      imovel.status_arrematacao === StatusArrematacao.Analise ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400" :
                      "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                    )}>
                      {imovel.status_arrematacao}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-sm font-semibold text-slate-600 dark:text-slate-400">
                    {imovel.tipo_imovel}
                  </td>
                  <td className="px-6 py-5 text-right">
                    <div className="flex items-center justify-end gap-3 translate-x-2 opacity-0 group-hover:opacity-100 transition-all group-hover:translate-x-0">
                      <button 
                        onClick={(e) => { e.stopPropagation(); remove(imovel.id!); }}
                        className="p-2 text-slate-300 dark:text-slate-700 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight className="text-slate-300 dark:text-slate-700" size={18} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredProperties.length === 0 && (
          <div className="p-12 text-center text-slate-500 font-medium text-sm">
            Nenhum ativo imobiliário registrado.
          </div>
        )}
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
              <form onSubmit={handleSubmit} className="p-4 md:p-8 max-h-[90vh] overflow-y-auto dark:text-slate-200">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold dark:text-white">Cadastrar Novo Imóvel</h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Tipo de Aquisição</label>
                    <div className="flex gap-2">
                      {Object.values(OrigemImovel).map(origem => (
                        <button
                          key={origem}
                          type="button"
                          onClick={() => setFormData({ ...formData, origem })}
                          className={cn(
                            "flex-1 py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all",
                            formData.origem === origem 
                              ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none" 
                              : "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-blue-400"
                          )}
                        >
                          {origem}
                        </button>
                      ))}
                    </div>
                  </div>

                  {formData.origem === OrigemImovel.Leilao && (
                    <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                      <h3 className="md:col-span-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 px-1">Dados do Processo de Leilão</h3>
                      
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Número do Processo</label>
                        <input
                          type="text"
                          placeholder="0000000-00.0000.0.00.0000"
                          className={cn(
                            "w-full px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-medium dark:text-slate-200",
                            errors.processo ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
                          )}
                          value={formData.processo || ''}
                          onChange={e => {
                            setFormData({...formData, processo: e.target.value});
                            if (errors.processo) setErrors({...errors, processo: ''});
                          }}
                        />
                        {errors.processo && <p className="text-[10px] text-rose-500 font-bold mt-1 ml-1">{errors.processo}</p>}
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Comarca / Vara</label>
                        <input
                          type="text"
                          className={cn(
                            "w-full px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-medium dark:text-slate-200",
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

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data do Leilão</label>
                        <input
                          type="datetime-local"
                          className={cn(
                            "w-full px-4 py-2 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-medium dark:text-slate-200",
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

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo de Leilão</label>
                        <select
                          className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium dark:text-slate-200"
                          value={formData.tipo_leilao}
                          onChange={e => setFormData({...formData, tipo_leilao: e.target.value as TipoLeilao})}
                        >
                          <option value={TipoLeilao.Judicial}>Judicial</option>
                          <option value={TipoLeilao.Extrajudicial}>Extrajudicial</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Forma de Arrematação</label>
                        <select
                          className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium dark:text-slate-200"
                          value={formData.forma_arrematacao}
                          onChange={e => setFormData({...formData, forma_arrematacao: e.target.value as FormaArrematacao})}
                        >
                          <option value={FormaArrematacao.Online}>Online</option>
                          <option value={FormaArrematacao.Presencial}>Presencial</option>
                          <option value={FormaArrematacao.Hibrido}>Híbrido</option>
                        </select>
                      </div>

                      <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Valor Avaliação</label>
                        <div className="relative">
                          <span className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold border-r pr-3",
                            errors.valor_avaliacao ? "text-rose-500 border-rose-200" : "text-slate-500 border-slate-200"
                          )}>R$</span>
                          <CurrencyInput
                            intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                            decimalSeparator=","
                            groupSeparator="."
                            decimalsLimit={2}
                            placeholder="0,00"
                            className={cn(
                              "w-full pl-14 pr-4 py-2 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-black dark:text-slate-200",
                              errors.valor_avaliacao ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
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

                      <div>
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Lance Mínimo</label>
                        <div className="relative">
                          <span className={cn(
                            "absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold border-r pr-3",
                            errors.valor_minimo ? "text-rose-500 border-rose-200" : "text-slate-500 border-slate-200"
                          )}>R$</span>
                          <CurrencyInput
                            intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                            decimalSeparator=","
                            groupSeparator="."
                            decimalsLimit={2}
                            placeholder="0,00"
                            className={cn(
                              "w-full pl-14 pr-4 py-2 bg-white dark:bg-slate-800 border rounded-xl outline-none text-sm font-black dark:text-slate-200",
                              errors.valor_minimo ? "border-rose-500" : "border-slate-200 dark:border-slate-700"
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

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Link do Edital</label>
                        <input
                          type="text"
                          placeholder="https://..."
                          className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none text-sm font-medium dark:text-slate-200"
                          value={formData.link_edital || ''}
                          onChange={e => setFormData({...formData, link_edital: e.target.value})}
                        />
                      </div>
                    </div>
                  )}
                  <div className="md:col-span-2 grid grid-cols-4 gap-4">
                    <div className="col-span-4 md:col-span-1">
                      <label className="block text-sm font-medium mb-1 flex items-center gap-2 dark:text-slate-300">
                        CEP {searchingCep && <Loader2 size={14} className="animate-spin text-blue-500" />}
                      </label>
                      <input
                        type="text"
                        maxLength={8}
                        placeholder="00000000"
                        className={cn(
                          "w-full px-4 py-2 border bg-white dark:bg-slate-800 rounded-xl focus:ring-2 outline-none",
                          errors.cep ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800 focus:ring-blue-500"
                        )}
                        value={formData.cep || ''}
                        onChange={e => {
                          handleCepChange(e.target.value);
                          if (errors.cep) setErrors({...errors, cep: ''});
                        }}
                      />
                      {errors.cep && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.cep}</p>}
                    </div>
                    <div className="col-span-4 md:col-span-3">
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">Logradouro / Rua</label>
                      <input
                        type="text"
                        className={cn(
                          "w-full px-4 py-2 border bg-white dark:bg-slate-800 rounded-xl focus:ring-2 outline-none",
                          errors.endereco ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800 focus:ring-blue-500"
                        )}
                        value={formData.endereco || ''}
                        onChange={e => {
                          setFormData({...formData, endereco: e.target.value});
                          if (errors.endereco) setErrors({...errors, endereco: ''});
                        }}
                      />
                      {errors.endereco && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.endereco}</p>}
                    </div>
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Bairro</label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2 border bg-white dark:bg-slate-800 rounded-xl focus:ring-2 outline-none",
                        errors.bairro ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800 focus:ring-blue-500"
                      )}
                      value={formData.bairro || ''}
                      onChange={e => {
                        setFormData({...formData, bairro: e.target.value});
                        if (errors.bairro) setErrors({...errors, bairro: ''});
                      }}
                    />
                    {errors.bairro && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.bairro}</p>}
                  </div>
                  <div className="grid grid-cols-3 gap-4 col-span-2 md:col-span-1">
                    <div className="col-span-2">
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">Cidade</label>
                      <input
                        type="text"
                        className={cn(
                          "w-full px-4 py-2 border bg-white dark:bg-slate-800 rounded-xl focus:ring-2 outline-none",
                          errors.cidade ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800 focus:ring-blue-500"
                        )}
                        value={formData.cidade || ''}
                        onChange={e => {
                          setFormData({...formData, cidade: e.target.value});
                          if (errors.cidade) setErrors({...errors, cidade: ''});
                        }}
                      />
                      {errors.cidade && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.cidade}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1 dark:text-slate-300">UF</label>
                      <input
                        type="text"
                        maxLength={2}
                        className={cn(
                          "w-full px-4 py-2 border bg-white dark:bg-slate-800 rounded-xl focus:ring-2 outline-none uppercase",
                          errors.estado ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800 focus:ring-blue-500"
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
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Matrícula RGI</label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2 border bg-white dark:bg-slate-800 rounded-xl focus:ring-2 outline-none",
                        errors.matricula ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800 focus:ring-blue-500"
                      )}
                      value={formData.matricula || ''}
                      onChange={e => {
                        setFormData({...formData, matricula: e.target.value});
                        if (errors.matricula) setErrors({...errors, matricula: ''});
                      }}
                    />
                    {errors.matricula && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.matricula}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Área (m²)</label>
                    <input
                      type="number"
                      step="any"
                      className={cn(
                        "w-full px-4 py-2 border bg-white dark:bg-slate-800 rounded-xl focus:ring-2 outline-none",
                        errors.area_m2 ? "border-rose-500 focus:ring-rose-500/20" : "border-gray-200 dark:border-slate-800 focus:ring-blue-500"
                      )}
                      value={formData.area_m2 || ''}
                      onChange={e => {
                        setFormData({...formData, area_m2: parseFloat(e.target.value)});
                        if (errors.area_m2) setErrors({...errors, area_m2: ''});
                      }}
                    />
                    {errors.area_m2 && <p className="text-[10px] text-rose-500 font-bold mt-1">{errors.area_m2}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Tipo de Imóvel</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onChange={e => setFormData({...formData, tipo_imovel: e.target.value as TipoImovel})}
                    >
                      {Object.values(TipoImovel).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Situação Jurídica</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onChange={e => setFormData({...formData, situacao_juridica: e.target.value as SituacaoJuridica})}
                    >
                      {Object.values(SituacaoJuridica).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Estado de Conservação</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onChange={e => setFormData({...formData, estado_conservacao: e.target.value as EstadoConservacao})}
                    >
                      {Object.values(EstadoConservacao).map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1 dark:text-slate-300">Status Arrematação</label>
                    <select
                      className="w-full px-4 py-2 border border-gray-200 dark:border-slate-800 bg-white dark:bg-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      onChange={e => setFormData({...formData, status_arrematacao: e.target.value as StatusArrematacao})}
                    >
                      {Object.values(StatusArrematacao).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mt-8 flex flex-col md:flex-row gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-slate-800 dark:text-slate-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-slate-800 transition-all text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none text-sm"
                  >
                    Salvar Imóvel
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
