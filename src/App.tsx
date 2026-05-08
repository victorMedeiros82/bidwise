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
import { auth, signInWithGoogle } from './lib/firebase';
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
  X as CloseIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// Pages
import Dashboard from './pages/Dashboard';
import Auctions from './pages/Auctions';
import Properties from './pages/Properties';
import PropertyDetails from './pages/PropertyDetails';

function Sidebar({ isOpen, onClose, darkMode, onToggleDarkMode }: { isOpen: boolean, onClose: () => void, darkMode: boolean, onToggleDarkMode: () => void }) {
  const location = useLocation();
  const navItems = [
    { icon: BarChart3, label: 'Dashboard', path: '/' },
    { icon: Gavel, label: 'Leilões', path: '/auctions' },
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
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg shrink-0 shadow-sm" />
            <span className="font-bold text-xl tracking-tight text-slate-800 dark:text-white">PROP-MAESTRO</span>
          </div>
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
            <CloseIcon size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => {
                if (window.innerWidth < 1024) onClose();
              }}
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

          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden border border-white dark:border-slate-600 shadow-sm shrink-0">
              {auth.currentUser?.photoURL && (
                <img src={auth.currentUser.photoURL} alt="Avatar" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">{auth.currentUser?.displayName || 'Usuário'}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold">Broker Manager</p>
            </div>
          </div>
          <button
            onClick={() => auth.signOut()}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-rose-500 transition-colors"
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
  return (
    <div className="h-screen w-screen flex items-center justify-center bg-white dark:bg-slate-950 p-6 transition-colors duration-300">
      <div className="max-w-md w-full bg-white dark:bg-slate-900 rounded-3xl shadow-2xl p-10 text-center border border-slate-100 dark:border-slate-800">
        <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-blue-500/30">
          <Gavel className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-3 text-slate-900 dark:text-white tracking-tight">PropMaestro</h1>
        <p className="text-slate-500 dark:text-slate-400 mb-10 font-medium">Gestão inteligente para investimentos em leilões de imóveis.</p>
        
        <button
          onClick={signInWithGoogle}
          className="w-full flex items-center justify-center gap-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-6 py-4 rounded-2xl font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all active:scale-[0.98] shadow-sm group"
        >
          <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5 grayscale group-hover:grayscale-0 transition-all" />
          Entrar com Google
        </button>
        
        <div className="mt-12 pt-8 border-t border-slate-50 dark:border-slate-800">
          <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-[0.2em]">
            Acesso restrito para brokers autorizados
          </p>
        </div>
      </div>
    </div>
  );
}

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
                     window.location.pathname === '/auctions' ? 'Monitoramento de Leilões' : 
                     window.location.pathname === '/properties' ? 'Gestão de Imóveis' : 'Detalhes do Ativo'}
                  </h2>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">BEM-VINDO AO PROP-MAESTRO CENTRAL</p>
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
                  <Route path="/auctions" element={<Auctions />} />
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
