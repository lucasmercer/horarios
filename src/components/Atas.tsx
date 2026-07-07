import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Send, Copy, Check, AlertCircle, RefreshCw, Loader2, Key, X, Sparkles } from "lucide-react";
import { GoogleGenAI } from "@google/genai";

export default function Atas() {
  const [inputText, setInputText] = useState("");
  const [generatedAta, setGeneratedAta] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  
  const [apiKey, setApiKey] = useState("");
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  useEffect(() => {
    const storedApiKey = localStorage.getItem("GEMINI_API_KEY");
    if (storedApiKey) {
      setApiKey(storedApiKey);
    } else {
      setIsConfigOpen(true);
    }
  }, []);

  const [options, setOptions] = useState({
    formalLanguage: true,
    continuousText: true,
    standardEdges: true
  });
  
  const resultRef = useRef<HTMLDivElement>(null);

  const saveApiKey = () => {
    localStorage.setItem("GEMINI_API_KEY", apiKey);
    setIsConfigOpen(false);
  };

  const handleGenerate = async () => {
    setError("");
    
    if (!apiKey) {
      setError("Por favor, configure sua chave de API do Gemini clicando no botão de chave.");
      setIsConfigOpen(true);
      return;
    }

    if (!inputText || inputText.trim() === "") {
      setError("Por favor, relate o que foi discutido ou insira as notas da reunião.");
      return;
    }

    setIsLoading(true);
    
    const dynamicPrompt = `
Você é um sistema inteligente para geração de atas escolares formais.
Sua função é transformar textos informais digitados pelo usuário em atas formais completas, com linguagem padrão da língua portuguesa.

📝 REGRAS PARA GERAÇÃO DA ATA:
${options.formalLanguage ? "1. Utilize linguagem formal, culta e técnica (padrão oficial)." : "1. Utilize linguagem clara e objetiva, menos técnica, mas ainda profissional."}
2. Corrija erros gramaticais e ortográficos.
3. Organize as ideias em ordem lógica e cronológica.
4. Remova gírias e termos informais.
5. Utilize conectivos formais.
6. Mantenha o conteúdo original sem alterar o sentido.
7. Caso o texto esteja incompleto, complemente de forma neutra e coerente.
${options.continuousText ? "8. Produza um texto corrido (em parágrafo único, SEM tópicos ou listas)." : "8. Utilize tópicos (bullet points) para organizar os diferentes pontos discutidos na reunião."}
${options.standardEdges ? '9. Sempre inicie EXATAMENTE com: "Aos [dia] dias do mês de [mês] de [ano], realizou-se..." (Substitua pelos dados presentes no texto ou pela data atual se não houver).' : "9. Inicie o texto de forma direta mencionando o motivo da reunião."}
${options.standardEdges ? '10. Sempre finalize EXATAMENTE com: "Nada mais havendo a tratar, a reunião foi encerrada."' : "10. Finalize o texto de forma cordial e profissional."}
`;

    try {
      // @ts-ignore - Required for client-side execution on GitHub Pages
      const ai = new GoogleGenAI({ 
        apiKey,
        // @ts-ignore - Required for client-side execution on GitHub Pages
        dangerouslyAllowBrowser: true,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build'
          }
        }
      });

      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: inputText,
        config: {
          systemInstruction: dynamicPrompt,
        },
      });

      if (response && response.text) {
        setGeneratedAta(response.text);
        setTimeout(() => {
          resultRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
         throw new Error("Resposta vazia da inteligência artificial.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão ou chave de API inválida.");
      if (err.message && err.message.includes("API key not valid")) {
         setIsConfigOpen(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const toggleOption = (key: keyof typeof options) => {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const copyToClipboard = () => {
    if (generatedAta) {
      navigator.clipboard.writeText(generatedAta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const resetForm = () => {
    setInputText("");
    setGeneratedAta("");
    setError("");
    setIsLoading(false);
  };

  return (
    <div className="w-full h-full min-h-[calc(100vh-4rem)] bg-slate-50 text-slate-800 font-sans p-4 md:p-8 flex flex-col relative overflow-hidden selection:bg-slate-200">
      
      {/* Config Modal Overlay */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-slate-950/45 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.96, opacity: 0 }}
              className="bg-white rounded-2xl shadow-lg p-6 w-full max-w-sm border border-slate-200"
            >
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center shrink-0 text-slate-850">
                    <Key size={16} />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Chave de API Gemini</h3>
                    <p className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Google Gemini AI</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsConfigOpen(false)}
                  className="p-1.5 hover:bg-slate-50 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-150 rounded-xl mb-4 text-xs text-slate-500 leading-normal font-medium">
                Sua chave de API é mantida localmente em seu navegador no <strong className="text-slate-800">LocalStorage</strong> e nunca é enviada para servidores de terceiros.
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Insira a chave de API</label>
                  <input 
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl outline-hidden focus:border-slate-800 transition-all font-mono text-xs"
                  />
                </div>
                
                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => setIsConfigOpen(false)}
                    className="flex-1 py-2.5 font-bold text-xs text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={saveApiKey}
                    className="flex-1 py-2.5 font-bold text-xs text-white bg-slate-950 hover:bg-slate-850 rounded-xl transition-colors shadow-xs"
                  >
                    Salvar Chave
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-7xl mx-auto space-y-6 flex-1 flex flex-col">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-800 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-0.5">Módulo de Atas Escolares</span>
              <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Atas de Reunião com IA</h1>
              <p className="text-xs font-semibold text-slate-500">Transforme anotações rústicas ou relatos informais em atas formais com Gemini AI</p>
            </div>
          </div>
          
          <button 
            onClick={() => setIsConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors"
          >
            <Key size={13} className={apiKey ? "text-slate-500" : "text-amber-500"} />
            {apiKey ? "Chave Configurada" : "Inserir Chave Gemini"}
          </button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
          
          {/* Left Panel: Input & Settings */}
          <div className="lg:col-span-6 flex flex-col gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 flex flex-col shadow-xs flex-1 min-h-[350px]">
              
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 shrink-0">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                  <Sparkles size={14} className="text-slate-400" /> Relato ou Pauta Informal
                </h3>
                
                <div className="flex items-center gap-3">
                  <span className="text-[9px] font-bold bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md uppercase tracking-wider">
                    {inputText.length} caracteres
                  </span>
                  <button 
                    onClick={resetForm}
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                    title="Limpar texto"
                  >
                    <RefreshCw size={13.5} className={isLoading ? "animate-spin" : ""} />
                  </button>
                </div>
              </div>

              {/* Toggles Panel */}
              <div className="flex flex-wrap gap-2 mb-4 shrink-0">
                <button 
                  onClick={() => toggleOption('formalLanguage')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    options.formalLanguage 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${options.formalLanguage ? 'bg-white border-white' : 'border-slate-300'}`}>
                    {options.formalLanguage && <Check size={10} className="text-slate-900 stroke-[3]" />}
                  </div>
                  Linguagem Formal
                </button>
                
                <button 
                  onClick={() => toggleOption('continuousText')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    options.continuousText 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${options.continuousText ? 'bg-white border-white' : 'border-slate-300'}`}>
                    {options.continuousText && <Check size={10} className="text-slate-900 stroke-[3]" />}
                  </div>
                  Texto Corrido
                </button>
                
                <button 
                  onClick={() => toggleOption('standardEdges')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border ${
                    options.standardEdges 
                      ? 'bg-slate-900 text-white border-slate-900 shadow-2xs' 
                      : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${options.standardEdges ? 'bg-white border-white' : 'border-slate-300'}`}>
                    {options.standardEdges && <Check size={10} className="text-slate-900 stroke-[3]" />}
                  </div>
                  Bordas Formais
                </button>
              </div>

              {/* Input Area */}
              <div className="flex-1 relative min-h-[220px]">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Ex: No dia 10 de Março fizemos o conselho de classe da turma do 3A. Os professores comentaram sobre o rendimento baixo em Matemática, mas a maioria foi aprovada. Definimos que faremos aulas de apoio no contraturno..."
                  className="w-full h-full p-4 bg-slate-50/50 rounded-xl border border-slate-200 font-mono text-xs text-slate-650 leading-relaxed outline-hidden focus:border-slate-800 focus:bg-white transition-all resize-none"
                />
                <button
                  onClick={handleGenerate}
                  disabled={isLoading}
                  className="absolute bottom-3 right-3 bg-slate-950 hover:bg-slate-850 text-white px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 disabled:opacity-50 shadow-xs active:scale-[0.98]"
                >
                  {isLoading ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                  {isLoading ? "Processando..." : "Gerar Ata"}
                </button>
              </div>
              
              <AnimatePresence>
                {error && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-3 flex items-center gap-2.5 text-rose-600 text-xs font-bold bg-rose-50 border border-rose-100 px-4 py-3 rounded-xl overflow-hidden shrink-0"
                  >
                    <AlertCircle size={14} className="shrink-0" />
                    <span>{error}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right Panel: Rendered Output */}
          <div className="lg:col-span-6 flex flex-col">
            <div className={`bg-white border rounded-2xl p-6 shadow-xs flex flex-col relative transition-all flex-1 min-h-[350px] ${generatedAta ? "border-slate-400" : "border-slate-200"}`}>
              
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 shrink-0">
                <h3 className={`text-xs font-black uppercase tracking-widest flex items-center gap-1.5 ${generatedAta ? "text-slate-900" : "text-slate-400"}`}>
                  <FileText size={14} />
                  Ata Formalizada
                </h3>
                
                {generatedAta && (
                  <button 
                    onClick={copyToClipboard}
                    className="text-[10px] font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider flex items-center gap-1.5 border border-slate-200/60"
                  >
                    {copied ? <Check size={13} className="text-emerald-600 stroke-[3]" /> : <Copy size={13} />}
                    {copied ? "Copiada" : "Copiar Texto"}
                  </button>
                )}
              </div>
              
              <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar" ref={resultRef}>
                <AnimatePresence mode="wait">
                  {generatedAta ? (
                    <motion.p 
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs leading-6 text-slate-750 text-justify font-serif whitespace-pre-wrap px-1"
                    >
                      {generatedAta}
                    </motion.p>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-3 border border-dashed border-slate-150 rounded-xl p-8 text-center min-h-[220px]">
                      {isLoading ? (
                        <>
                          <Loader2 size={32} className="animate-spin text-slate-400" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Aprimorando Texto</p>
                            <p className="text-[10px] text-slate-400 font-semibold uppercase">Reestruturando relato conforme diretrizes acadêmicas...</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <FileText size={32} className="text-slate-200" />
                          <div className="space-y-1">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Nenhum Documento Gerado</p>
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">Redija suas pautas rascunhadas no campo ao lado e clique em "Gerar" para convertê-las em linguagem oficial.</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
              
              {generatedAta && (
                <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none rounded-b-2xl" />
              )}
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
}
