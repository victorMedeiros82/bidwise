/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth, signInWithGoogle, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile } from './lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './lib/firebase';
import { supabase } from './lib/supabase';
import { 
  StatusArrematacao, 
  OrigemImovel, 
  TipoImovel, 
  SituacaoJuridica, 
  EstadoConservacao, 
  TipoLeilao, 
  FormaArrematacao, 
  TipoArrematacao, 
  StatusPagamento, 
  StatusDoc 
} from './types';
import { 
  BarChart3, 
  Gavel, 
  Home, 
  Wallet, 
  Hammer, 
  Building2, 
  FileText, 
  LogOut,
  ChevronRight,
  Plus,
  Menu,
  Moon,
  Sun,
  X as CloseIcon,
  Mail,
  Lock,
  User as UserIcon,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Expose auth globally for API testing
if (typeof window !== 'undefined') {
  (window as any).auth = auth;
}

// Pages
import Dashboard from './pages/Dashboard';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';

// Components
import AuthErrorAlert from './components/AuthErrorAlert';

function Sidebar({ isOpen, onClose, darkMode, onToggleDarkMode }: { isOpen: boolean, onClose: () => void, darkMode: boolean, onToggleDarkMode: () => void }) {
  const location = useLocation();
  const navItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/' },
    { icon: Home, label: 'Imóveis', path: '/properties' },
  ];


  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <aside className={cn(
        "fixed lg:sticky top-0 left-0 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 h-screen flex flex-col pt-8 transition-transform z-50 lg:translate-x-0",
        !isOpen && "-translate-x-full"
      )}>
        <div className="px-6 mb-8 flex items-center justify-between">
          <Link to="/" onClick={onClose} className="flex items-center gap-3 active:scale-95 transition-transform">
            <div className="w-8 h-8 bg-blue-600 rounded-lg shrink-0 shadow-sm" />
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">PROP-MAESTRO</span>
          </Link>
          <button onClick={onClose} className="lg:hidden text-slate-500 hover:text-slate-700 p-2 -mr-2">
            <CloseIcon size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={cn(
                "sidebar-link",
                location.pathname === item.path && "active"
              )}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              <span className="text-sm">{item.label}</span>
            </Link>
          ))}
        </nav>

        <div className="p-6 border-t border-slate-100 dark:border-slate-800">
          <button 
            onClick={onToggleDarkMode}
            className="w-full flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 mb-6 transition-all hover:scale-[1.02] shadow-sm"
          >
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={18} className="text-blue-400" /> : <Sun size={18} className="text-amber-500" />}
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-widest">
                {darkMode ? 'Modo Escuro' : 'Modo Claro'}
              </span>
            </div>
            <div className={cn(
              "w-8 h-4 rounded-full relative transition-colors",
              darkMode ? "bg-blue-500" : "bg-slate-300"
            )}>
              <div className={cn(
                "absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all",
                darkMode ? "left-[18px]" : "left-0.5"
              )} />
            </div>
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-white dark:border-slate-600 shadow-sm shrink-0 flex items-center justify-center">
              {auth.currentUser?.photoURL ? (
                <img src={auth.currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <UserIcon className="w-5 h-5 text-slate-500 dark:text-slate-500" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{auth.currentUser?.displayName || 'Usuário'}</p>
              <p className="text-[10px] text-slate-600 dark:text-slate-400 uppercase tracking-wider font-semibold">Broker Manager</p>
            </div>
          </div>


          <button
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-rose-500 transition-colors w-full justify-center pb-2"
          >
            <LogOut className="w-4 h-4" />
            Sair do Sistema
          </button>
        </div>
      </aside>
    </>
  );
}

function LoadingScreen() {
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-slate-950">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full shadow-lg shadow-blue-500/20"
      />
    </div>
  );
}

function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Clear any pre-existing lingering sessions before attempting log-in
      await auth.signOut();

      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }
    } catch (err: any) {
      console.error("Login attempt failed:", err);
      setError(err);
      // Explicitly sign out again on failure to make sure no partial/broken state persists
      await auth.signOut();
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl p-8 md:p-12 text-center border border-slate-100 dark:border-slate-800 relative overflow-hidden">
        {/* Abstract Background Element */}
        <div className="absolute -top-10 -right-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />

        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/30">
          <Gavel className="w-10 h-10 text-white" />
        </div>
        
        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white tracking-tight">PropMaestro</h1>
        <p className="text-sm text-slate-600 dark:text-slate-400 mb-10 font-medium">
          {isLogin ? 'Bem-vindo de volta ao seu centro de gestão.' : 'Crie sua conta de broker autorizados.'}
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {!isLogin && (
            <div className="relative group">
              <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
              <input
                type="text"
                placeholder="Nome Completo"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
              />
            </div>
          )}

          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-blue-500 transition-colors" />
            <input
              type="password"
              placeholder="Sua senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all font-medium"
            />
          </div>

          <AnimatePresence>
            {error && (
              <AuthErrorAlert error={error} onClear={() => setError(null)} />
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-4 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/25 active:scale-[0.98] flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? 'Entrar no Sistema' : 'Criar minha Conta')}
          </button>
        </form>

        <div className="my-8 flex items-center gap-4 text-slate-500">
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
          <span className="text-[10px] font-bold uppercase tracking-widest">ou</span>
          <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800" />
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98] shadow-sm group cursor-pointer"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all font-medium" />
          Acessar com Google
        </button>

        <p className="mt-4 text-[11px] text-slate-400 dark:text-slate-500 font-medium leading-relaxed">
          Dica: Se o login do Google falhar no iFrame, clique para abrir em uma{" "}
          <a
            href={window.location.href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 hover:underline font-bold"
          >
            nova aba
          </a>{" "}
          fora do iFrame, ou use e-mail e senha.
        </p>
        
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError(null);
          }}
          className="mt-8 text-xs font-bold text-slate-500 hover:text-blue-500 transition-colors uppercase tracking-widest cursor-pointer"
        >
          {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça Login'}
        </button>

        <div className="mt-10 pt-8 border-t border-slate-50 dark:border-slate-800">
          <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">
            Acesso restrito para brokers autorizados
          </p>
        </div>
      </div>
    </div>
  );
}

const seedDatabaseForUser = async (uid: string) => {
  const hasSupabase = !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);

  if (hasSupabase) {
    try {
      // 1. Check if we already have records for this user in table 'imoveis'
      const { data: existing, error: checkErr } = await supabase
        .from('imoveis')
        .select('id')
        .eq('createdBy', uid)
        .limit(1);

      if (!checkErr && (!existing || existing.length === 0)) {
        console.log('Seeding Supabase database for user', uid);
        
        // Let's define the imoveis payload
        const imovelPayload = {
          codigo: 'PROP-001',
          origem: OrigemImovel.LeilaoJudicial,
          matricula: '12345',
          cep: '01311200',
          endereco: 'Avenida Paulista, 1000',
          bairro: 'Bela Vista',
          cidade: 'São Paulo',
          estado: 'SP',
          area_m2: 120,
          tipo_imovel: TipoImovel.Apartamento,
          situacao_juridica: SituacaoJuridica.ExecucaoFiscal,
          estado_conservacao: EstadoConservacao.Bom,
          analise_risco: '# Análise de Risco e Viabilidade Jurídica\n\nEste imóvel apresenta excelente relação de risco-retorno.\n\n### Aspectos Positivos\n- Localização privilegiada de altíssima liquidez.\n- Avaliação de mercado conservadora.\n- Processo de execução bem respaldado.',
          status_arrematacao: StatusArrematacao.Arrematado,
          valor_arrematacao: 200000,
          tipo_arrematacao: TipoArrematacao.Financiada,
          saldo_devedor: 130000,
          processo: '0001234-56.2026.8.26.0100',
          comarca: '1ª Vara de Execuções Civis',
          tipo_leilao: TipoLeilao.Judicial,
          data_leilao: '2026-06-15',
          link_edital: 'https://leilao.exemplo.com/edital/12345',
          valor_avaliacao: 300000,
          valor_minimo: 180000,
          forma_arrematacao: FormaArrematacao.Online,
          condicoes_pagamento: 'Entrada minima de 25% + saldo em ate 30 parcelas corrigidas.',
          createdBy: uid,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        // Try to insert imovel
        // First try with our hardcoded string ID to keep consistency if their table ID is text
        let insertedId: any = 'SaRtriImjf0vgC2cOjLI';
        const { data: r1, error: e1 } = await supabase
          .from('imoveis')
          .insert({ id: insertedId, ...imovelPayload })
          .select();

        if (e1) {
          // If inserting with string ID fails (e.g. because ID is uuid/integer), let's insert without specifying ID and let the DB generate it!
          const { data: r2, error: e2 } = await supabase
            .from('imoveis')
            .insert(imovelPayload)
            .select();

          if (e2) {
            console.warn('Could not seed imoveis table in Supabase. Perhaps tables do not exist yet.', e2);
          } else if (r2 && r2[0]) {
            insertedId = r2[0].id;
          }
        } else if (r1 && r1[0]) {
          insertedId = r1[0].id;
        }

        // Now seed the other associated tables if imovel database generation succeeded
        if (insertedId) {
          // Custos Aquisição
          const custoAquisicaoPayload = {
            id_imovel: insertedId,
            tipo_custo: 'ITBI',
            descricao: 'Imposto de Transmissão de Bens Imóveis',
            valor: 8000,
            data_vencimento: '2026-06-30',
            status_pagamento: StatusPagamento.Pendente,
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('custos_aquisicao').insert(custoAquisicaoPayload);

          // Documentos
          const documentoPayload = {
            id_imovel: insertedId,
            tipo_doc: 'Carta de Arrematação',
            status: StatusDoc.Pendente,
            data_recebimento: '2026-06-20',
            data_vencimento: '2026-07-20',
            responsavel: 'Broker Principal',
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('documentos').insert(documentoPayload);

          // Custos Reforma
          const custoReformaPayload = {
            id_imovel: insertedId,
            descricao_etapa: 'Pintura Geral e Acabamento',
            orcamento: 15000,
            valor_real: 12000,
            prazo_execucao: '15 dias',
            data_conclusao: '2026-06-25',
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('custos_reforma').insert(custoReformaPayload);

          // Holding
          const holdingPayload = {
            id_imovel: insertedId,
            tipo_despesa: 'Condomínio',
            descricao: 'Taxa condominial ordinária',
            valor_mensal: 500,
            competencia: '06/2026',
            createdBy: uid,
            createdAt: new Date().toISOString()
          };
          await supabase.from('holding').insert(holdingPayload);

          console.log('Successfully completed Supabase seeding for user', uid);
        }
      }
    } catch (err) {
      console.error('Supabase seeding error:', err);
    }
  }

  try {
    const imovelRef = doc(db, 'imoveis', 'SaRtriImjf0vgC2cOjLI');
    const imovelSnap = await getDoc(imovelRef);

    if (!imovelSnap.exists()) {
      // 1. Seed Imovel
      await setDoc(imovelRef, {
        codigo: 'PROP-001',
        origem: OrigemImovel.LeilaoJudicial,
        matricula: '12345',
        cep: '01311200',
        endereco: 'Avenida Paulista, 1000',
        bairro: 'Bela Vista',
        cidade: 'São Paulo',
        estado: 'SP',
        area_m2: 120,
        tipo_imovel: TipoImovel.Apartamento,
        situacao_juridica: SituacaoJuridica.ExecucaoFiscal,
        estado_conservacao: EstadoConservacao.Bom,
        analise_risco: '# Análise de Risco e Viabilidade Jurídica\n\nEste imóvel apresenta excelente relação de risco-retorno.\n\n### Aspectos Positivos\n- Localização privilegiada de altíssima liquidez.\n- Avaliação de mercado conservadora.\n- Processo de execução bem respaldado.',
        status_arrematacao: StatusArrematacao.Arrematado,
        valor_arrematacao: 200000,
        tipo_arrematacao: TipoArrematacao.Financiada,
        saldo_devedor: 130000,
        processo: '0001234-56.2026.8.26.0100',
        comarca: '1ª Vara de Execuções Civis',
        tipo_leilao: TipoLeilao.Judicial,
        data_leilao: '2026-06-15',
        link_edital: 'https://leilao.exemplo.com/edital/12345',
        valor_avaliacao: 300000,
        valor_minimo: 180000,
        forma_arrematacao: FormaArrematacao.Online,
        condicoes_pagamento: 'Entrada minima de 25% + saldo em ate 30 parcelas corrigidas.',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 2. Seed CustoAquisicao
      await setDoc(doc(db, 'custos_aquisicao', 'custo-itbi'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        tipo_custo: 'ITBI',
        descricao: 'Imposto de Transmissão de Bens Imóveis',
        valor: 8000,
        data_vencimento: '2026-06-30',
        status_pagamento: StatusPagamento.Pendente,
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 3. Seed Documento
      await setDoc(doc(db, 'documentos', 'doc-carta'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        tipo_doc: 'Carta de Arrematação',
        status: StatusDoc.Pendente,
        data_recebimento: '2026-06-20',
        data_vencimento: '2026-07-20',
        responsavel: 'Broker Principal',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 4. Seed CustoReforma
      await setDoc(doc(db, 'custos_reforma', 'reforma-pintura'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        descricao_etapa: 'Pintura Geral e Acabamento',
        orcamento: 15000,
        valor_real: 12000,
        prazo_execucao: '15 dias',
        data_conclusao: '2026-06-25',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // 5. Seed Holding
      await setDoc(doc(db, 'holding', 'holding-condo'), {
        id_imovel: 'SaRtriImjf0vgC2cOjLI',
        tipo_despesa: 'Condomínio',
        descricao: 'Taxa condominial ordinária',
        valor_mensal: 500,
        competencia: '06/2026',
        createdBy: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Seeding completed successfully for user', uid);
    }
  } catch (error) {
    console.error('Error during seeding database:', error);
  }
};

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      if (user) {
        seedDatabaseForUser(user.uid);
      }
    });
  }, []);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.documentElement.style.colorScheme = 'dark';
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.style.colorScheme = 'light';
    }
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  if (loading) return <LoadingScreen />;

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      {user ? (
        <div className="flex min-h-screen bg-white dark:bg-slate-950 transition-colors duration-300">
          <Sidebar 
            isOpen={mobileMenuOpen} 
            onClose={() => setMobileMenuOpen(false)} 
            darkMode={darkMode}
            onToggleDarkMode={() => setDarkMode(!darkMode)}
          />
          <main className="flex-1 flex flex-col min-w-0">
            <header className="h-20 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setMobileMenuOpen(true)}
                  className="lg:hidden p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <Menu size={24} />
                </button>
                <div>
                  <h2 className="text-lg md:text-xl font-bold text-slate-900 dark:text-white tracking-tight">
                    {window.location.pathname === '/' ? 'Dashboard Analítico' : 
                     window.location.pathname === '/properties' ? 'Gestão de Imóveis' : 'Detalhes do Ativo'}
                  </h2>
                  <p className="text-[10px] text-slate-600 dark:text-slate-400 font-medium hidden sm:block">BEM-VINDO AO PROP-MAESTRO CENTRAL</p>
                </div>
              </div>
              <div className="flex items-center gap-2 md:gap-4">
                <button className="btn-secondary text-[10px] md:text-xs">Exportar CSV</button>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1 md:mx-2" />
                <div className="flex items-center gap-3">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user.displayName}</p>
                    <p className="text-[10px] text-emerald-600 font-bold">ONLINE</p>
                  </div>
                </div>
              </div>
            </header>
            <div className="px-4 md:px-8 pb-12 overflow-x-hidden">
              <AnimatePresence mode="wait">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/properties" element={<Properties />} />
                  <Route path="/properties/:id" element={<PropertyDetails />} />
                  <Route path="*" element={<Navigate to="/" />} />
                </Routes>
              </AnimatePresence>
            </div>
          </main>
        </div>
      ) : (
        <LoginPage />
      )}
    </BrowserRouter>
  );
}
