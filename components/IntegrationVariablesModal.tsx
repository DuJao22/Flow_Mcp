import React, { useState, useEffect } from 'react';
import { userVariablesManager } from '../services/userVariablesManager';
import { geminiModelDiscovery } from '../services/geminiModelDiscovery';
import { IntegrationVariableConfig, IntegrationCategory } from '../types';

interface IntegrationVariablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialCategory?: IntegrationCategory;
  initialVariableId?: string;
}

export const IntegrationVariablesModal: React.FC<IntegrationVariablesModalProps> = ({
  isOpen,
  onClose,
  initialCategory,
  initialVariableId
}) => {
  const [variables, setVariables] = useState<IntegrationVariableConfig[]>(userVariablesManager.getVariables());
  const [activeCategory, setActiveCategory] = useState<IntegrationCategory | 'all'>(initialCategory || 'all');
  const [testingId, setTestingId] = useState<string | null>(null);
  const [feedbackMessages, setFeedbackMessages] = useState<Record<string, { success: boolean; message: string }>>({});
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (initialCategory) {
      setActiveCategory(initialCategory);
    }
  }, [initialCategory]);

  useEffect(() => {
    const unsubscribe = userVariablesManager.subscribe((vars) => {
      setVariables(vars);
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  const categories: { id: IntegrationCategory | 'all'; label: string; icon: string }[] = [
    { id: 'all', label: 'Todas as Variáveis', icon: '⚙️' },
    { id: 'notion', label: 'Notion MCP', icon: '📝' },
    { id: 'ai', label: 'Google Gemini', icon: '🧠' },
    { id: 'figma', label: 'Figma Dev Mode', icon: '🎨' },
    { id: 'browser', label: 'Playwright Browser', icon: '🌐' },
    { id: 'webhook', label: 'Webhooks & APIs', icon: '⚡' }
  ];

  const filteredVars = activeCategory === 'all' 
    ? variables 
    : variables.filter(v => v.category === activeCategory);

  const handleValueChange = (id: string, value: string) => {
    userVariablesManager.setVariableValue(id, value);
    // Limpa feedback anterior
    setFeedbackMessages(prev => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  };

  const handleTestVariable = async (id: string) => {
    setTestingId(id);
    const result = await userVariablesManager.testVariable(id);
    setTestingId(null);
    setFeedbackMessages(prev => ({
      ...prev,
      [id]: result
    }));
  };

  const toggleShowSecret = (id: string) => {
    setVisibleSecrets(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5 animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* HEADER */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-pink-600 flex items-center justify-center text-xl shadow-lg shadow-indigo-500/20">
              ⚙️
            </div>
            <div>
              <h2 className="text-base font-black text-white tracking-wide flex items-center gap-2">
                GERENCIADOR DE INTEGRAÇÕES & VARIÁVEIS
                <span className="text-[9px] font-mono uppercase bg-indigo-950 text-indigo-300 border border-indigo-800 px-2 py-0.5 rounded-full">
                  User Isolation
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Configure suas chaves, tokens e endpoints com segurança e isolamento individual por usuário.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            ✕
          </button>
        </div>

        {/* CATEGORY TABS */}
        <div className="flex items-center gap-1.5 p-3 bg-slate-950/40 border-b border-slate-800 overflow-x-auto no-scrollbar">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                activeCategory === cat.id
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <span>{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>

        {/* VARIABLES LIST */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {filteredVars.map((item) => {
            const isSecret = item.isSecret;
            const isVisible = visibleSecrets[item.id];
            const isTesting = testingId === item.id || item.status === 'TESTING';
            const feedback = feedbackMessages[item.id];

            return (
              <div
                key={item.id}
                id={`var-${item.id}`}
                className={`p-4 rounded-2xl border transition-all space-y-3 ${
                  item.id === initialVariableId
                    ? 'bg-indigo-950/40 border-indigo-500 shadow-lg shadow-indigo-950/40'
                    : 'bg-slate-950/80 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                {/* TOP INFO */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-extrabold text-white font-mono">{item.label}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 text-slate-400">
                        {item.key}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.description}</p>
                  </div>

                  {/* STATUS BADGE */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2.5 py-0.5 text-[10px] font-mono font-bold rounded-full uppercase border flex items-center gap-1.5 ${
                      item.status === 'CONNECTED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : item.status === 'TESTING'
                        ? 'bg-amber-950 text-amber-300 border-amber-800 animate-pulse'
                        : item.status === 'INVALID'
                        ? 'bg-rose-950 text-rose-300 border-rose-800'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        item.status === 'CONNECTED' ? 'bg-emerald-400' :
                        item.status === 'TESTING' ? 'bg-amber-400' :
                        item.status === 'INVALID' ? 'bg-rose-400' : 'bg-slate-500'
                      }`} />
                      {item.status === 'CONNECTED' ? 'Conectado' :
                       item.status === 'TESTING' ? 'Testando...' :
                       item.status === 'INVALID' ? 'Inválido' : 'Não Configurado'}
                    </span>
                  </div>
                </div>

                {/* INPUT FIELD */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={isSecret && !isVisible ? 'password' : 'text'}
                      value={item.value}
                      onChange={(e) => handleValueChange(item.id, e.target.value)}
                      placeholder={item.placeholder || 'Digite o valor da variável...'}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder-slate-600 outline-none focus:border-indigo-500 shadow-inner"
                    />

                    {isSecret && (
                      <button
                        type="button"
                        onClick={() => toggleShowSecret(item.id)}
                        className="absolute right-3 top-2.5 text-slate-500 hover:text-slate-300 text-xs"
                        title={isVisible ? 'Ocultar' : 'Mostrar'}
                      >
                        {isVisible ? '🙈' : '👁️'}
                      </button>
                    )}
                  </div>

                  {/* TEST BUTTON */}
                  <button
                    type="button"
                    onClick={() => handleTestVariable(item.id)}
                    disabled={isTesting || !item.value}
                    className="px-3.5 py-2.5 bg-indigo-600/90 hover:bg-indigo-500 disabled:opacity-40 text-white rounded-xl text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5"
                  >
                    {isTesting ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        <span>Testando...</span>
                      </>
                    ) : (
                      <>
                        <span>🧪</span>
                        <span>Testar</span>
                      </>
                    )}
                  </button>
                </div>

                {/* ATALHOS DE DETECÇÃO AUTOMÁTICA DE MODELO GEMINI */}
                {item.id === 'gemini_model' && (
                  <div className="bg-purple-950/40 border border-purple-800/50 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                    <div className="flex items-center gap-1.5 text-purple-300 font-mono">
                      <span>⚡</span>
                      <span>Versão Ativa Detectada:</span>
                      <strong className="text-white underline">{geminiModelDiscovery.getDetectedModelSync()}</strong>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleValueChange(item.id, 'auto')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          item.value === 'auto'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        auto (Recomendado)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleValueChange(item.id, 'gemini-3.8-flash')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          item.value === 'gemini-3.8-flash'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        gemini-3.8-flash
                      </button>
                      <button
                        type="button"
                        onClick={() => handleValueChange(item.id, 'gemini-flash-latest')}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold transition-all ${
                          item.value === 'gemini-flash-latest'
                            ? 'bg-purple-600 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        }`}
                      >
                        gemini-flash-latest
                      </button>
                    </div>
                  </div>
                )}

                {/* FEEDBACK & DOCS */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-[10px] font-mono">
                  {feedback ? (
                    <span className={feedback.success ? 'text-emerald-400' : 'text-rose-400'}>
                      {feedback.success ? '✓' : '✗'} {feedback.message}
                    </span>
                  ) : item.testErrorMessage ? (
                    <span className="text-rose-400">✗ {item.testErrorMessage}</span>
                  ) : (
                    <span className="text-slate-600">Altere o valor para sincronização automática.</span>
                  )}

                  {item.docsUrl && (
                    <a
                      href={item.docsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-indigo-400 hover:underline inline-flex items-center gap-1"
                    >
                      <span>Obter credencial ↗</span>
                    </a>
                  )}
                </div>

              </div>
            );
          })}
        </div>

        {/* FOOTER */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono">
            ● As chaves e variáveis são mantidas estritamente no seu navegador e Gateway local.
          </span>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-indigo-600/30"
          >
            Concluir &amp; Salvar
          </button>
        </div>

      </div>
    </div>
  );
};
