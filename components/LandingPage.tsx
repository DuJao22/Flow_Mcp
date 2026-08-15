import React from 'react';
import { Flower2, Zap, BrainCircuit, Rocket, ArrowRight, Code2, ShieldCheck, Cpu, Layers, Sparkles } from 'lucide-react';
import { CreditsCard } from './CreditsCard';

interface LandingPageProps {
  onStart: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onStart }) => {
  return (
    <div className="fixed inset-0 h-screen w-screen overflow-y-auto z-50 bg-[#080a0f] text-slate-100 font-sans selection:bg-purple-500/30 custom-scrollbar">
      
      {/* GLOW DE FUNDO AMBIENTE */}
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-gradient-to-b from-purple-600/15 via-indigo-600/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[600px] h-[400px] bg-blue-600/10 blur-[140px] pointer-events-none" />

      {/* Header Eleito */}
      <header className="fixed top-0 w-full border-b border-white/10 bg-[#080a0f]/80 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-purple-500/20 flex items-center justify-center">
              <Flower2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-tight text-white">Flow Architect</span>
              <span className="px-2 py-0.5 text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-purple-500/20 to-indigo-500/20 text-purple-300 border border-purple-500/30 rounded-full">AI PRO</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button 
              onClick={onStart}
              className="px-5 py-2 text-xs font-bold bg-white hover:bg-slate-100 text-slate-950 rounded-xl transition-all shadow-lg hover:shadow-white/20 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <span>Acessar Plataforma</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          
          {/* Badge Anúncio */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-bold tracking-wide shadow-inner">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <span>Motor Neural & Automação de Fluxos em Tempo Real</span>
          </div>

          {/* Título Principal */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight leading-[1.1] text-white">
            Construa, Automatize e <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-indigo-300 to-blue-400">
              Escale com Inteligência Artificial
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed font-normal">
            A plataforma profissional de orquestração visual que combina IA avançada, nós inteligentes e execução em tempo real para transformar seus prompts e lógicas em automações reais.
          </p>

          {/* Botões CTA */}
          <div className="flex items-center justify-center gap-4 pt-4">
            <button 
              onClick={onStart}
              className="px-8 py-4 text-sm font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-2xl transition-all shadow-[0_0_50px_-10px_rgba(168,85,247,0.6)] hover:shadow-[0_0_70px_-10px_rgba(168,85,247,0.8)] flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer border border-purple-400/30"
            >
              <span>Abrir Editor Visual</span>
              <Rocket className="w-5 h-5" />
            </button>
          </div>

          {/* STATS STRIP */}
          <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto border-t border-white/10 mt-12">
            <StatItem value="100%" label="Execução em Browser" />
            <StatItem value="0ms" label="Latência Local" />
            <StatItem value="Multi-Key" label="Failover de API Gemini" />
            <StatItem value="PWA" label="App Celular & Desktop" />
          </div>
        </div>

        {/* Features Grid */}
        <div className="max-w-7xl mx-auto mt-24 grid grid-cols-1 md:grid-cols-3 gap-6">
          <FeatureCard 
            icon={<BrainCircuit className="w-6 h-6 text-purple-400" />}
            title="Motor Cérebro Neural"
            description="Lógica inteligente e síntese autônoma com aprendizado contínuo. Converta requisições complexas e regras de negócio com facilidade."
          />
          <FeatureCard 
            icon={<Cpu className="w-6 h-6 text-blue-400" />}
            title="Execução Resiliente"
            description="Roteamento inteligente de chaves Gemini com comutação automática em caso de atingimento de limite de cota de tokens (Erro 429)."
          />
          <FeatureCard 
            icon={<Layers className="w-6 h-6 text-emerald-400" />}
            title="Orquestração Visual"
            description="Conecte nós HTTP, webhooks, condicionais IF, salvamento de arquivos HTML/JSON e gatilhos interativos em uma tela gráfica responsiva."
          />
        </div>

        {/* CARD DE CRÉDITOS NA LANDING PAGE */}
        <div className="max-w-2xl mx-auto mt-20">
          <CreditsCard isOpen={true} floating={false} />
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-white/10 mt-12 py-8 text-center text-slate-500 text-xs font-medium">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Flower2 className="w-4 h-4 text-purple-500" />
            <span className="font-extrabold text-slate-200">Flow Architect AI</span>
            <span className="text-slate-600">|</span>
            <span>Plataforma de Automação Visual</span>
          </div>
          <p>© {new Date().getFullYear()} - Criado e Mantido por <a href="https://instagram.com/layon.dev" target="_blank" rel="noopener noreferrer" className="text-purple-400 font-bold hover:underline">@layon.dev</a> & <a href="https://instagram.com/davi._link" target="_blank" rel="noopener noreferrer" className="text-indigo-400 font-bold hover:underline">@davi._link</a></p>
        </div>
      </footer>
    </div>
  );
};

const StatItem = ({ value, label }: { value: string, label: string }) => (
  <div className="flex flex-col items-center">
    <span className="text-xl sm:text-2xl font-black text-white font-mono tracking-tight">{value}</span>
    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{label}</span>
  </div>
);

const FeatureCard = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
  <div className="p-6 rounded-2xl bg-slate-900/60 border border-white/10 hover:border-purple-500/40 transition-all duration-300 hover:shadow-2xl hover:shadow-purple-950/20 group backdrop-blur-md">
    <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
      {icon}
    </div>
    <h3 className="text-lg font-black text-white mb-2 tracking-tight">{title}</h3>
    <p className="text-xs text-slate-400 leading-relaxed font-normal">{description}</p>
  </div>
);

export default LandingPage;
