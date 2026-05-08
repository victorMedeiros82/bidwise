import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Search, Calendar, MapPin, Link as LinkIcon, Edit, Trash2, X, Loader2, Info } from 'lucide-react';
import CurrencyInput from 'react-currency-input-field';
import { useFirestore } from '../hooks/useFirestore';
import { Leilao, TipoLeilao, FormaArrematacao } from '../types';
import { cn } from '../lib/utils';

export default function Auctions() {
  const { data: auctions, add, remove, update } = useFirestore<Leilao>('leiloes');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState<Partial<Leilao>>({
    tipo: TipoLeilao.Judicial,
    forma_arrematacao: FormaArrematacao.Online
  });

  const validate = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.processo?.trim()) newErrors.processo = "Número do processo é obrigatório";
    if (!formData.comarca?.trim()) newErrors.comarca = "Comarca é obrigatória";
    
    if (!formData.data_leilao) {
      newErrors.data_leilao = "Data do leilão é obrigatória";
    }

    if (!formData.valor_avaliacao || formData.valor_avaliacao <= 0) {
      newErrors.valor_avaliacao = "Valor de avaliação deve ser positivo";
    }

    if (!formData.valor_minimo || formData.valor_minimo <= 0) {
      newErrors.valor_minimo = "Lance mínimo deve ser positivo";
    } else if (formData.valor_avaliacao && formData.valor_minimo > formData.valor_avaliacao) {
      newErrors.valor_minimo = "O lance mínimo não pode ser maior que a avaliação";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleOpenModal = (leilao?: Leilao) => {
    setErrors({});
    if (leilao) {
      setEditingId(leilao.id!);
      setFormData({ ...leilao });
    } else {
      setEditingId(null);
      setFormData({ tipo: TipoLeilao.Judicial, forma_arrematacao: FormaArrematacao.Online });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      if (editingId) {
        await update(editingId, formData as any);
      } else {
        await add(formData as any);
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData({ tipo: TipoLeilao.Judicial, forma_arrematacao: FormaArrematacao.Online });
      setErrors({});
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar leilão. Verifique sua conexão.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredAuctions = auctions.filter(a => 
    a.processo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.comarca?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white tracking-tight">Leilões</h1>
          <p className="text-slate-600 dark:text-slate-400 text-sm">Monitoramento e editais de processos ativos</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="btn-primary flex items-center gap-2 w-full md:w-auto justify-center"
        >
          <Plus size={18} />
          Cadastrar Processo
        </button>
      </div>

      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
        <Search className="text-slate-500 dark:text-slate-500" size={18} />
        <input
          type="text"
          placeholder="Buscar editais..."
          className="flex-1 bg-transparent border-none focus:ring-0 text-sm placeholder:text-slate-500 dark:placeholder:text-slate-600 font-medium dark:text-slate-200"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAuctions.map((leilao) => (
          <motion.div
            layoutId={leilao.id}
            key={leilao.id}
            className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all relative group"
          >
            <div className="flex justify-between items-start mb-4">
              <span className={cn(
                "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider",
                leilao.tipo === TipoLeilao.Judicial ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400" : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400"
              )}>
                {leilao.tipo}
              </span>
              <div className="flex gap-2 md:opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => handleOpenModal(leilao)} className="p-1.5 text-slate-500 dark:text-slate-700 hover:text-blue-500 transition-colors">
                  <Edit size={16} />
                </button>
                <button onClick={() => remove(leilao.id!)} className="p-1.5 text-slate-500 dark:text-slate-700 hover:text-rose-500 transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h3 className="font-bold text-slate-900 dark:text-white mb-1 leading-tight">{leilao.processo}</h3>
            <p className="text-xs text-slate-600 dark:text-slate-400 font-medium mb-4">{leilao.comarca}</p>
            
            <div className="space-y-2.5">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 font-medium">
                <Calendar size={14} className="text-slate-500 dark:text-slate-600 shrink-0" />
                <span>{new Date(leilao.data_leilao).toLocaleDateString('pt-BR')}</span>
              </div>
              {leilao.link_edital && (
                <div className="flex items-center gap-2 text-xs">
                  <LinkIcon size={14} className="text-blue-500 dark:text-blue-400 shrink-0" />
                  <a href={leilao.link_edital} target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 font-bold hover:underline truncate">
                    Link do Edital
                  </a>
                </div>
              )}
            </div>

            <div className="mt-6 pt-5 border-t border-slate-50 dark:border-slate-800 flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-500 font-bold mb-1">Lance Mínimo</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-lg font-black text-slate-900 dark:text-white">R$ {leilao.valor_minimo?.toLocaleString('pt-BR')}</p>
                  {leilao.valor_avaliacao && leilao.valor_minimo && (
                    <span className="text-[9px] font-bold text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                      {Math.round((leilao.valor_minimo / leilao.valor_avaliacao) * 100)}% da AV
                    </span>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-500 font-bold mb-1">Avaliação</p>
                <p className="text-slate-600 dark:text-slate-400 text-xs font-bold font-mono">R$ {leilao.valor_avaliacao?.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </motion.div>
        ))}
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
              <form onSubmit={handleSubmit} className="p-6 md:p-8 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold dark:text-white">
                    {editingId ? 'Editar Detalhes do Leilão' : 'Cadastrar Novo Leilão'}
                  </h2>
                  <button type="button" onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    <X size={24} />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Número do Processo</label>
                    <input
                      type="text"
                      placeholder="0000000-00.0000.0.00.0000"
                      className={cn(
                        "w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-all text-sm font-medium dark:text-slate-200",
                        errors.processo ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      )}
                      value={formData.processo || ''}
                      onChange={e => setFormData({...formData, processo: e.target.value})}
                    />
                    {errors.processo && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{errors.processo}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Comarca / Vara</label>
                    <input
                      type="text"
                      className={cn(
                        "w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-all text-sm font-medium dark:text-slate-200",
                        errors.comarca ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      )}
                      value={formData.comarca || ''}
                      onChange={e => setFormData({...formData, comarca: e.target.value})}
                    />
                    {errors.comarca && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{errors.comarca}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Data do Leilão</label>
                    <input
                      type="datetime-local"
                      className={cn(
                        "w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-all text-sm font-medium dark:text-slate-200",
                        errors.data_leilao ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      )}
                      value={formData.data_leilao || ''}
                      onChange={e => setFormData({...formData, data_leilao: e.target.value})}
                    />
                    {errors.data_leilao && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{errors.data_leilao}</p>}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Tipo de Leilão</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
                      value={formData.tipo}
                      onChange={e => setFormData({...formData, tipo: e.target.value as TipoLeilao})}
                    >
                      <option value={TipoLeilao.Judicial} className="dark:bg-slate-800">Judicial</option>
                      <option value={TipoLeilao.Extrajudicial} className="dark:bg-slate-800">Extrajudicial</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Forma de Arrematação</label>
                    <select
                      className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-1 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-sm font-medium dark:text-slate-200"
                      value={formData.forma_arrematacao}
                      onChange={e => setFormData({...formData, forma_arrematacao: e.target.value as FormaArrematacao})}
                    >
                      <option value={FormaArrematacao.Online} className="dark:bg-slate-800">Online</option>
                      <option value={FormaArrematacao.Presencial} className="dark:bg-slate-800">Presencial</option>
                      <option value={FormaArrematacao.Hibrido} className="dark:bg-slate-800">Híbrido</option>
                    </select>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                      <Search size={100} />
                    </div>

                    <div className="relative z-10">
                      <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 group/label relative ml-1">
                        Valor Avaliação
                        <Info size={12} className="text-slate-500 dark:text-slate-700 cursor-help" />
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] font-medium leading-tight rounded-lg opacity-0 invisible group-hover/label:visible group-hover/label:opacity-100 transition-all z-20 shadow-xl pointer-events-none">
                          O valor de mercado estimado do imóvel, definido por perito ou avaliação oficial do edital.
                        </div>
                      </label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-600 text-xs font-bold border-r border-slate-200 dark:border-slate-700 pr-3">R$</span>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="0,00"
                          className={cn(
                            "w-full pl-14 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl outline-none transition-all text-sm font-black dark:text-slate-200 shadow-sm",
                            errors.valor_avaliacao ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          )}
                          value={formData.valor_avaliacao || ''}
                          onValueChange={(_value, _name, values) => setFormData({...formData, valor_avaliacao: values?.float || 0})}
                        />
                      </div>
                      {errors.valor_avaliacao && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{errors.valor_avaliacao}</p>}
                    </div>

                    <div className="relative z-10">
                      <div className="flex justify-between items-center mb-1.5 px-1">
                        <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest group/label relative">
                          Lance Mínimo
                          <Info size={12} className="text-slate-500 dark:text-slate-700 cursor-help" />
                          <div className="absolute bottom-full left-0 mb-2 w-48 p-2 bg-slate-900 text-white text-[9px] font-medium leading-tight rounded-lg opacity-0 invisible group-hover/label:visible group-hover/label:opacity-100 transition-all z-20 shadow-xl pointer-events-none">
                            O menor valor aceito para arrematação. Geralmente entre 50% e 70% da avaliação em 2º leilão.
                          </div>
                        </label>
                        <div className="flex gap-1.5">
                          {[50, 70].map(pct => (
                            <button
                              key={pct}
                              type="button"
                              disabled={!formData.valor_avaliacao}
                              onClick={() => setFormData({...formData, valor_minimo: (formData.valor_avaliacao || 0) * (pct / 100)})}
                              className="px-1.5 py-0.5 bg-slate-200 dark:bg-slate-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded text-[8px] font-black uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              {pct}%
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-600 text-xs font-bold border-r border-slate-200 dark:border-slate-700 pr-3">R$</span>
                        <CurrencyInput
                          intlConfig={{ locale: 'pt-BR', currency: 'BRL' }}
                          decimalSeparator=","
                          groupSeparator="."
                          decimalsLimit={2}
                          placeholder="0,00"
                          className={cn(
                            "w-full pl-14 pr-4 py-3 bg-white dark:bg-slate-800 border rounded-xl outline-none transition-all text-sm font-black dark:text-slate-200 shadow-sm",
                            errors.valor_minimo ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                          )}
                          value={formData.valor_minimo || ''}
                          onValueChange={(_value, _name, values) => setFormData({...formData, valor_minimo: values?.float || 0})}
                        />
                      </div>
                      {errors.valor_minimo && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{errors.valor_minimo}</p>}
                    </div>

                    {formData.valor_avaliacao && formData.valor_minimo && (
                      <div className="md:col-span-2 pt-2 border-t border-slate-200 dark:border-slate-800 mt-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-slate-500 dark:text-slate-600 uppercase tracking-widest">Cálculo de Desconto</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-emerald-500">
                             {Math.round((formData.valor_minimo / formData.valor_avaliacao) * 100)}%
                          </span>
                          <span className="text-[9px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-tighter">do valor total de avaliação</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 ml-1">Link do Edital</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      className={cn(
                        "w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border rounded-xl outline-none transition-all text-sm font-medium dark:text-slate-200",
                        errors.link_edital ? "border-rose-500 ring-1 ring-rose-500" : "border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      )}
                      value={formData.link_edital || ''}
                      onChange={e => setFormData({...formData, link_edital: e.target.value})}
                    />
                    {errors.link_edital && <p className="text-[10px] text-rose-500 font-bold mt-1 uppercase tracking-tighter">{errors.link_edital}</p>}
                  </div>
                </div>

                <div className="mt-8 flex flex-col md:flex-row gap-3">
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-slate-200 dark:border-slate-800 dark:text-slate-300 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-800 transition-all disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none disabled:opacity-75 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                        SALVANDO...
                      </>
                    ) : (
                      editingId ? 'ATUALIZAR LEILÃO' : 'SALVAR LEILÃO'
                    )}
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
