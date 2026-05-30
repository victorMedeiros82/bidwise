import { motion } from 'motion/react';
import { 
  AlertTriangle, 
  WifiOff, 
  ShieldAlert, 
  Key, 
  HelpCircle, 
  AlertCircle, 
  ExternalLink,
  Lock,
  Mail,
  EyeOff,
  Settings
} from 'lucide-react';

interface AuthErrorAlertProps {
  error: any;
  onClear?: () => void;
}

export interface ParsedAuthError {
  title: string;
  message: string;
  type: 'credential' | 'network' | 'popup' | 'config' | 'general';
  actionTip?: string;
  icon: React.ComponentType<any>;
  themeClasses: {
    bg: string;
    border: string;
    text: string;
    iconBg: string;
    iconText: string;
    tipBg: string;
    tipText: string;
  };
}

export function parseFirebaseAuthError(error: any): ParsedAuthError {
  const code = error?.code || '';
  const browserMessage = error?.message || '';

  // Theme templates
  const themes = {
    credential: {
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      border: 'border-amber-200 dark:border-amber-900/30',
      text: 'text-amber-800 dark:text-amber-300',
      iconBg: 'bg-amber-100 dark:bg-amber-900/40',
      iconText: 'text-amber-600 dark:text-amber-400',
      tipBg: 'bg-amber-100/50 dark:bg-amber-900/10',
      tipText: 'text-amber-700/90 dark:text-amber-400/80',
    },
    network: {
      bg: 'bg-indigo-50 dark:bg-indigo-950/20',
      border: 'border-indigo-200 dark:border-indigo-900/30',
      text: 'text-indigo-800 dark:text-indigo-300',
      iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
      iconText: 'text-indigo-600 dark:text-indigo-400',
      tipBg: 'bg-indigo-100/50 dark:bg-indigo-900/10',
      tipText: 'text-indigo-700/90 dark:text-indigo-450/80',
    },
    popup: {
      bg: 'bg-sky-50 dark:bg-sky-950/20',
      border: 'border-sky-200 dark:border-sky-900/30',
      text: 'text-sky-800 dark:text-sky-300',
      iconBg: 'bg-sky-100 dark:bg-sky-900/40',
      iconText: 'text-sky-600 dark:text-sky-400',
      tipBg: 'bg-sky-100/50 dark:bg-sky-900/10',
      tipText: 'text-sky-700/90 dark:text-sky-400/80',
    },
    config: {
      bg: 'bg-purple-50 dark:bg-purple-950/20',
      border: 'border-purple-200 dark:border-purple-900/30',
      text: 'text-purple-800 dark:text-purple-300',
      iconBg: 'bg-purple-100 dark:bg-purple-900/40',
      iconText: 'text-purple-600 dark:text-purple-400',
      tipBg: 'bg-purple-100/50 dark:bg-purple-900/10',
      tipText: 'text-purple-700/90 dark:text-purple-400/80',
    },
    general: {
      bg: 'bg-rose-50 dark:bg-rose-950/20',
      border: 'border-rose-200 dark:border-rose-900/30',
      text: 'text-rose-800 dark:text-rose-300',
      iconBg: 'bg-rose-100 dark:bg-rose-905/40',
      iconText: 'text-rose-600 dark:text-rose-400',
      tipBg: 'bg-rose-100/50 dark:bg-rose-900/10',
      tipText: 'text-rose-700/90 dark:text-rose-400/80',
    }
  };

  switch (code) {
    // ---- Credentials errors ----
    case 'auth/user-not-found':
      return {
        title: 'Usuário não cadastrado',
        message: 'O e-mail informado não foi localizado na base de brokers autorizados.',
        type: 'credential',
        actionTip: 'Se você é um novo corretor, alterne para o painel de "Cadastre-se" para criar seu acesso.',
        icon: Mail,
        themeClasses: themes.credential
      };
    case 'auth/wrong-password':
      return {
        title: 'Senha incorreta',
        message: 'A senha digitada está inválida ou expirou para este endereço de e-mail.',
        type: 'credential',
        actionTip: 'Verifique se o Caps-Lock está ativo ou use a autenticação pelo Google (caso tenha vinculado anteriormente).',
        icon: EyeOff,
        themeClasses: themes.credential
      };
    case 'auth/invalid-credential':
      return {
        title: 'E-mail ou senha inválidos',
        message: 'Não conseguimos autenticar com estes dados. As credenciais de acesso informadas são incorretas.',
        type: 'credential',
        actionTip: 'Por segurança, o Firebase retorna um erro genérico. Tente novamente ou cadastre este e-mail se for seu primeiro acesso.',
        icon: Key,
        themeClasses: themes.credential
      };
    case 'auth/invalid-email':
      return {
        title: 'Formato de e-mail inválido',
        message: 'O padrão de e-mail inserido está incompleto ou editado de forma incorreta.',
        type: 'credential',
        actionTip: 'Certifique-se de digitar um endereço válido como seu-nome@dominio.com.',
        icon: Mail,
        themeClasses: themes.credential
      };
    case 'auth/email-already-in-use':
      return {
        title: 'E-mail em uso',
        message: 'O endereço de e-mail informado já está vinculado a um cadastro do sistema.',
        type: 'credential',
        actionTip: 'Clique em "Faça Login" e tente acessar o sistema utilizando este e-mail e sua senha existente.',
        icon: ShieldAlert,
        themeClasses: themes.credential
      };
    case 'auth/weak-password':
      return {
        title: 'Senha muito fraca',
        message: 'O Firebase recusou a senha informada porque ela não cumpre requisitos mínimos de segurança.',
        type: 'credential',
        actionTip: 'Crie uma senha mais robusta contendo pelo menos 6 caracteres para continuar o cadastro.',
        icon: Lock,
        themeClasses: themes.credential
      };

    // ---- Pop-up block errors ----
    case 'auth/popup-blocked':
      return {
        title: 'Pop-up Bloqueado',
        message: 'O navegador impediu a abertura da janela de login oficial do Google para este site.',
        type: 'popup',
        actionTip: 'Permita pop-ups nos controles da barra de endereço ou prefira abrir o app em modo de tela inteira clicando no botão "Abrir em nova aba".',
        icon: AlertTriangle,
        themeClasses: themes.popup
      };
    case 'auth/popup-closed-by-user':
      return {
        title: 'Login Cancelado',
        message: 'A janela de autenticação do Google foi fechada antes de o consentimento ser finalizado.',
        type: 'popup',
        actionTip: 'Tente novamente clicando no botão "Acessar com Google" e certifique-se de escolher uma conta.',
        icon: AlertCircle,
        themeClasses: themes.popup
      };

    // ---- Configuration/Domain errors ----
    case 'auth/operation-not-allowed':
      return {
        title: 'Método não habilitado',
        message: 'A autenticação selecionada (Google ou E-mail) está desativada no Firebase Console.',
        type: 'config',
        actionTip: 'Acesse o console do Firebase -> Authentication -> Sign-in Method para habilitar os provedores de rede.',
        icon: Settings,
        themeClasses: themes.config
      };
    case 'auth/unauthorized-domain':
      return {
        title: 'Domínio não autorizado',
        message: `O domínio atual (${window.location.hostname}) não está habilitado para serviços de autenticação do Firebase.`,
        type: 'config',
        actionTip: 'Adicione esta URL nos "Domínios Autorizados" na aba Authentication de seu painel externo do Firebase.',
        icon: ShieldAlert,
        themeClasses: themes.config
      };

    // ---- Network and sandbox flow errors ----
    case 'auth/network-request-failed':
      return {
        title: 'Falha de rede ou iFrame sandbox',
        message: 'A requisição falhou devido a um erro de conectividade local ou bloqueio de cookies de terceiros pelo navegador dentro do iFrame do editor.',
        type: 'network',
        actionTip: 'Abra esta aplicação em uma janela / aba separada fora do iFrame do AI Studio para contornar limitações de cookies do navegador, ou utilize o login convencional de E-mail/Senha.',
        icon: WifiOff,
        themeClasses: themes.network
      };

    default:
      // Fallback in case of a simple string error message
      if (typeof error === 'string') {
        return {
          title: 'Aviso de autenticação',
          message: error,
          type: 'general',
          icon: AlertCircle,
          themeClasses: themes.general
        };
      }
      
      // Generic case
      return {
        title: 'Erro inesperado',
        message: browserMessage || error?.toString?.() || 'Não foi possível completar a operação de autenticação.',
        type: 'general',
        actionTip: 'Verifique sua conexão com o servidor e os dados inseridos e tente novamente em instantes.',
        icon: HelpCircle,
        themeClasses: themes.general
      };
  }
}

export default function AuthErrorAlert({ error, onClear }: AuthErrorAlertProps) {
  if (!error) return null;

  const parsed = parseFirebaseAuthError(error);
  const IconComponent = parsed.icon;
  const theme = parsed.themeClasses;

  return (
    <motion.div
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className={`relative w-full rounded-2xl border p-5 ${theme.bg} ${theme.border} text-left flex gap-4 transition-colors duration-300 shadow-md mb-6`}
    >
      {/* Icon frame */}
      <div className={`p-3 rounded-xl ${theme.iconBg} ${theme.iconText} shrink-0 self-start`}>
        <IconComponent size={20} className="stroke-[2.5px]" />
      </div>

      {/* Text contents */}
      <div className="flex-1 space-y-1.5 overflow-hidden">
        <h4 className={`text-sm font-extrabold tracking-tight ${theme.text}`}>
          {parsed.title}
        </h4>
        <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-300">
          {parsed.message}
        </p>

        {parsed.actionTip && (
          <div className={`mt-3 p-3 rounded-xl border border-transparent text-[11px] font-bold leading-normal flex items-start gap-2 ${theme.tipBg} ${theme.tipText}`}>
            <span className="text-[10px] uppercase font-black tracking-wider border border-current px-1.5 py-0.5 rounded shrink-0">Dica</span>
            <p className="flex-1 text-slate-500 dark:text-slate-400">
              {parsed.actionTip}
            </p>
          </div>
        )}

        {/* Special External Link button for network or cookie iframe errors */}
        {parsed.type === 'network' && (
          <div className="pt-2">
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
            >
              Abra em Aba Separada
              <ExternalLink size={12} />
            </a>
          </div>
        )}
        
        {parsed.type === 'popup' && (
          <div className="pt-2">
            <a
              href={window.location.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm transition-all"
            >
              Executar Fora de iFrame
              <ExternalLink size={12} />
            </a>
          </div>
        )}
      </div>

      {/* Clear/Dismiss button */}
      {onClear && (
        <button
          onClick={onClear}
          type="button"
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors p-1 -mr-1 -mt-1 self-start cursor-pointer rounded-lg"
          aria-label="Dismiss error Alert"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4.5 w-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </motion.div>
  );
}
