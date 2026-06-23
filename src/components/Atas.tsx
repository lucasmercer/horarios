import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { FileText, Send, Copy, Check, AlertCircle, RefreshCw, Loader2, Terminal, LayoutIcon, Key } from "lucide-react";
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

  const clearApiKey = () => {
    localStorage.removeItem("GEMINI_API_KEY");
    setApiKey("");
    setIsConfigOpen(true);
  };

  const handleGenerate = async () => {
    setError("");
    
    if (!apiKey) {
      setError("Por favor, configure sua chave de API do Gemini clicando na engrenagem.");
      setIsConfigOpen(true);
      return;
    }

    if (!inputText || inputText.trim() === "") {
      setError("Por favor, digite o conteúdo da ata.");
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
         throw new Error("Resposta em branco do Gemini.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erro de conexão com o Gemini ou API Key inválida.");
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
    <div className="w-full h-full min-h-[500px] bg-slate-50 text-slate-800 font-sans p-4 sm:p-6 flex flex-col relative overflow-hidden">
      
      {/* Config Modal Overlay */}
      <AnimatePresence>
        {isConfigOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm border border-slate-200"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shrink-0">
                  <Key size={20} />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800">Chave da API Gemini</h3>
                  <p className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Configuração Salva no Navegador</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed bg-amber-50 text-amber-800 p-2.5 rounded-lg border border-amber-200">
                O aplicativo processará os dados <b>diretamente pelo seu navegador</b>. Nós <b>não guardamos</b> a sua chave (ela ficará salva no LocalStorage de sua própria máquina).
              </p>
              <input 
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Insira a sua API Key..."
                className="w-full p-3 bg-slate-50 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-xs mb-4"
              />
              <div className="flex gap-2">
                <button 
                  onClick={() => setIsConfigOpen(false)}
                  className="flex-1 py-2.5 font-bold text-sm text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  onClick={saveApiKey}
                  className="flex-1 py-2.5 font-bold text-sm text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors shadow-md shadow-indigo-600/20 cursor-pointer"
                >
                  Salvar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-full max-w-6xl mx-auto flex justify-end mb-2">
        <button 
           onClick={() => setIsConfigOpen(true)}
           className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition-colors uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
        >
          <Key size={12} /> {apiKey ? "Chave Configurada" : "Ausência de Chave"}
        </button>
      </div>

      <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row gap-6 flex-1">
        
        {/* Left Column: Input & Options */}
        <div className="flex-1 flex flex-col gap-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-slate-200 rounded-2xl p-5 sm:p-6 flex flex-col shadow-sm flex-1"
          >
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Terminal size={16} className="text-slate-400" /> Relato Informal
              </h3>
              <div className="flex items-center gap-3">
                <span className="text-[10px] bg-slate-100 text-slate-500 px-2.5 py-1 rounded-full font-bold">
                  {inputText.length} caracteres
                </span>
                <button 
                  onClick={resetForm}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors cursor-pointer"
                  title="Limpar Área"
                >
                  <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                </button>
              </div>
            </div>

            {/* Config Toggles */}
            <div className="flex flex-wrap gap-2 mb-4">
              <button 
                onClick={() => toggleOption('formalLanguage')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${options.formalLanguage ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${options.formalLanguage ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>
                  {options.formalLanguage && <Check size={8} />}
                </div>
                Linguagem Formal
              </button>
              <button 
                onClick={() => toggleOption('continuousText')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${options.continuousText ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${options.continuousText ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>
                  {options.continuousText && <Check size={8} />}
                </div>
                Texto Corrido
              </button>
              <button 
                onClick={() => toggleOption('standardEdges')}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 border ${options.standardEdges ? 'bg-indigo-50 text-indigo-700 border-indigo-200' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}
              >
                <div className={`w-3 h-3 rounded-full flex items-center justify-center ${options.standardEdges ? 'bg-indigo-600 text-white' : 'bg-slate-200'}`}>
                  {options.standardEdges && <Check size={8} />}
                </div>
                Bordas Padrão
              </button>
            </div>

            <div className="flex-1 min-h-[250px] relative mt-2">
              <textarea
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Insira os tópicos ou relato informal do que foi discutido na reunião..."
                className="w-full h-full p-4 sm:p-5 bg-slate-50 rounded-xl border border-dashed border-slate-300 font-mono text-sm text-slate-600 leading-relaxed outline-none focus:border-indigo-400 focus:bg-white transition-all resize-none"
              />
              <button
                onClick={handleGenerate}
                disabled={isLoading}
                className="absolute bottom-4 right-4 bg-indigo-600 hover:bg-indigo-700 text-white px-5 sm:px-6 py-2.5 rounded-lg font-bold text-sm shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer active:scale-95"
              >
                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {isLoading ? "Processando..." : "Gerar Ata Formal"}
              </button>
            </div>
            
            <AnimatePresence>
              {error && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-4 flex items-center gap-2 text-red-600 text-xs font-bold uppercase tracking-wider bg-red-50 border border-red-100 px-4 py-3 rounded-xl overflow-hidden"
                >
                  <AlertCircle size={14} className="shrink-0" />
                  <span className="truncate">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* Right Column: Output */}
        <div className="flex-1 flex flex-col">
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className={`bg-white border-2 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col relative transition-all flex-1 min-h-[350px] ${generatedAta ? "border-indigo-600 shadow-indigo-100" : "border-slate-200"}`}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className={`text-sm font-bold uppercase tracking-wide flex items-center gap-2 ${generatedAta ? "text-indigo-600" : "text-slate-400"}`}>
                <LayoutIcon size={16} />
                Ata Formal Gerada
              </h3>
              {generatedAta && (
                <button 
                  onClick={copyToClipboard}
                  className="text-[10px] sm:text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors uppercase tracking-wider cursor-pointer flex items-center gap-1.5 border border-indigo-100"
                >
                  {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  {copied ? "Copiado" : "Copiar Texto"}
                </button>
              )}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar pb-10" ref={resultRef}>
              <AnimatePresence mode="wait">
                {generatedAta ? (
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-[14px] leading-8 text-slate-700 text-justify font-serif whitespace-pre-wrap"
                  >
                    {generatedAta}
                  </motion.p>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-4 border-2 border-dashed border-slate-100 rounded-xl p-8 text-center">
                    {isLoading ? (
                      <>
                        <Loader2 size={36} className="animate-spin text-indigo-400" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase tracking-widest text-indigo-400">Transformando Texto</p>
                          <p className="text-xs text-slate-400">Aplicando regras de linguagem formal...</p>
                        </div>
                      </>
                    ) : (
                      <>
                        <FileText size={36} className="text-slate-200" />
                        <div className="space-y-1">
                          <p className="text-sm font-bold uppercase tracking-widest">Nenhum Documento</p>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto">Preencha o relato informal ao lado e clique em diagnosticar para gerar sua ata acadêmica.</p>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </AnimatePresence>
            </div>
            
            {generatedAta && (
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none rounded-b-2xl"></div>
            )}
          </motion.div>
        </div>
        
      </div>
    </div>
  );
}
