export const runSolverClient = async (payload: any) => {
  return new Promise((resolve, reject) => {
    // Vite handles this specific syntax for Web Workers
    const worker = new Worker(new URL('./solverWorker.ts', import.meta.url), {
      type: 'module'
    });

    worker.onmessage = (e) => {
      if (e.data.type === 'SUCCESS') {
        resolve(e.data.result);
      } else {
        reject(new Error(e.data.error));
      }
      worker.terminate();
    };

    worker.onerror = (err) => {
      reject(err);
      worker.terminate();
    };

    worker.postMessage(payload);
  });
};
