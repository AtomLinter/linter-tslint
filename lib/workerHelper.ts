import {Config} from "./config";
import {Task, TextEditor} from "atom";
import cryptoRandomString from 'crypto-random-string';

let workerInstance: Task | null;

export function startWorker(worker: Task, config: Config): void {
  if (workerInstance !== worker) {
    workerInstance = worker;
    workerInstance.start(config);
  }
}

export function terminateWorker(): void {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

export function changeConfig<TKey = keyof Config>(key: TKey, value: any): void {
  if (workerInstance) {
    workerInstance.send({
      messageType: 'config',
      message: { key, value },
    });
  }
}

export function requestJob(jobType: string, textEditor: TextEditor): Promise<any> {
  const emitKey = cryptoRandomString(10);

  return new Promise((resolve, reject) => {
    if (!workerInstance) {
      return reject("Worker not started");
    }

    const errSub = workerInstance.on('task:error', (...err: any[]) => {
      // Re-throw errors from the task
      const error = new Error(err[0]);
      // Set the stack to the one given to us by the worker
      [, error.stack] = err;
      reject(error);
    });

    const responseSub = workerInstance.on(emitKey, (data) => {
      errSub.dispose();
      responseSub.dispose();
      resolve(data);
    });

    try {
      workerInstance.send({
        messageType: 'job',
        message: {
          emitKey,
          jobType,
          content: textEditor.getText(),
          filePath: textEditor.getPath(),
        },
      });
    } catch (e) {
      reject(e);
    }
  });
}
