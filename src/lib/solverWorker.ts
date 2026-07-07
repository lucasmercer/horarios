import { runSolverClient } from "./clientSolverCore";

self.onmessage = async (e) => {
  try {
    const payload = e.data;
    const result = await runSolverClient(payload);
    self.postMessage({ type: 'SUCCESS', result });
  } catch (error: any) {
    self.postMessage({ type: 'ERROR', error: error.message });
  }
};
