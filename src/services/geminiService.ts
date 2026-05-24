import { GoogleGenAI, Type } from "@google/genai";

let aiInstance: GoogleGenAI | null = null;

function getAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey === '') {
    throw new Error("Configuração da API Gemini pendente. \n\nPara resolver:\n1. Vá no menu 'Settings' (ícone de engrenagem) > 'Secrets'.\n2. Adicione uma chave chamada GEMINI_API_KEY com uma chave válida do Google AI Studio (ai.google.dev).");
  }
  if (!aiInstance) {
    aiInstance = new GoogleGenAI({ apiKey });
  }
  return aiInstance;
}

export interface ExtractedData {
  teachers: { name: string; subject?: string }[];
  subjects: { name: string; workload: number }[];
  turmas: {
    name: string;
    schedule: Record<string, { teacher: string; subject: string }>;
  }[];
}

export async function extractScheduleFromImage(base64Data: string, mimeType: string): Promise<ExtractedData> {
  const prompt = `Analise a tabela de horários escolar.
Sua tarefa é extrair a GRADE COMPLETA de aulas de forma exaustiva.

LAYOUT DA IMAGEM:
- COLUNAS representam as TURMAS (ex: "6A", "7B", "1A", "1B", "2A", "3A").
- LINHAS representam os PERÍODOS (1ª a 6ª aula) agrupados por DIA DA SEMANA (SEG, TER, QUA, QUI, SEX).
- O dia da semana geralmente aparece em uma célula mesclada no início das linhas ou no topo.

REGRAS DE EXTRAÇÃO (CRÍTICO):
1. IDENTIFICAÇÃO DE TURMAS: Procure pelos cabeçalhos das colunas (ex: 6A, 7A, 8A, 9A, 1A, 1B, 2A, 2B, 3A).
   - IMPORTANTE: Extraia TODAS as turmas visíveis. Não pule nenhuma coluna que contenha horários.
2. GRADE (SCHEDULE): Para cada intersecção de Turma (coluna) e Período (linha), extraia a Disciplina e o Professor.
3. CHAVES DO SCHEDULE: Use o formato "dia-periodo" (ex: "seg-1", "seg-2", ..., "sex-6").
   - Dias: seg, ter, qua, qui, sex.
   - Períodos: 1, 2, 3, 4, 5, 6 (para MANHÃ) e 7, 8, 9, 10, 11, 12 (para TARDE).
   - IMPORTANTE: Se o horário for da TARDE, a 1ª aula deve ser "7", a 2ª aula "8", e assim por diante até a 6ª aula ser "12".
4. CONTEÚDO: Tente separar o NOME DO PROFESSOR e o NOME DA DISCIPLINA.
5. TRATAMENTO DE ABREVIAÇÕES: 
   - MAT -> MATEMATICA
   - PORT / L.P -> PORTUGUES
   - GEO -> GEOGRAFIA
   - HIST -> HISTORIA
   - CIEN / CIE -> CIENCIAS
   - ART -> ARTES
   - ED.FI / E.F -> EDUCACAO FISICA
   - ING -> INGLES

MAPEAR PARA ESTE JSON:
{
  "teachers": [{"name": "NOME DO PROFESSOR", "subject": "DISCIPLINA"}],
  "subjects": [{"name": "DISCIPLINA", "workload": 5}],
  "turmas": [
    {
      "name": "6A",
      "schedule": {
        "seg-1": { "teacher": "PEDRO", "subject": "MATEMATICA" }
      }
    }
  ]
}

Retorne APENAS o JSON puro.`

  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: "gemini-flash-latest",
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            teachers: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { 
                  name: { type: Type.STRING },
                  subject: { type: Type.STRING }
                },
                required: ["name"]
              }
            },
            subjects: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: { 
                  name: { type: Type.STRING },
                  workload: { type: Type.NUMBER }
                },
                required: ["name", "workload"]
              }
            },
            turmas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  schedule: {
                    type: Type.OBJECT,
                    additionalProperties: {
                      type: Type.OBJECT,
                      properties: {
                        teacher: { type: Type.STRING },
                        subject: { type: Type.STRING }
                      },
                      required: ["teacher", "subject"]
                    }
                  }
                },
                required: ["name", "schedule"]
              }
            }
          },
          required: ["teachers", "subjects", "turmas"]
        }
      }
    });

    if (!response.text) {
      throw new Error("Gemini returned empty response");
    }

    return JSON.parse(response.text) as ExtractedData;
  } catch (error) {
    console.error("Error extracting schedule:", error);
    throw error;
  }
}
