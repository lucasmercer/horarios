import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { runSolver } from "./solver";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.post("/api/gemini/analyze", async (req, res) => {
    try {
      const { promptData } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      
      if (!apiKey) {
        return res.status(400).json({ error: "A chave da API do Gemini não foi encontrada no servidor." });
      }

      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: promptData,
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error(error);
      res.status(500).json({ error: error.message || "Internal server error" });
    }
  });

  // INTEGRAÇÃO COM BACKEND SOLVER (run_solver.js / solve.js)
  app.post("/api/solve", async (req, res) => {
    try {
      const payload = req.body;
      console.log(`[Solver Endpoint Started] Modo: ${payload.mode}, Shift (Turno): ${payload.shift}`);
      
      const result = await runSolver(payload);

      res.json({
        success: true,
        status: "success",
        message: "Horários gerados via Node Backend.",
        ...result
      });
    } catch (error: any) {
      console.error("Erro no Solver do Backend:", error);
      res.status(500).json({ error: error.message || "Erro no processamento interno do solver." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
