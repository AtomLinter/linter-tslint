import { Task, TextEditor } from 'atom';
import type { ConfigSchema } from "./config"
import cryptoRandomString from 'crypto-random-string';
import type * as Tslint from "tslint";

export class WorkerHelper {
  workerInstance: Task
  constructor() {
    this.workerInstance = null;
  }

  isRunning() {
    return Boolean(this.workerInstance);
  }

  startWorker(config: ConfigSchema) {
    if (!this.workerInstance) {
      this.workerInstance = new Task(require.resolve('./worker.js'));
      this.workerInstance.start(config);
    }
  }

  terminateWorker() {
    if (this.workerInstance) {
      this.workerInstance.terminate();
      this.workerInstance = null;
    }
  }

  changeConfig(key: string, value: any) {
    if (this.workerInstance) {
      this.workerInstance.send({
        messageType: 'config',
        message: { key, value },
      } as ConfigMessage);
    }
  }

  async requestJob(jobType: string, textEditor: TextEditor): Promise<Tslint.LintResult[]> {
    if (!this.workerInstance) {
      throw new Error("Worker hasn't started");
    }

    const emitKey = await cryptoRandomString.async({ length: 10 });

    return new Promise((resolve, reject) => {
      const errSub = this.workerInstance.on('task:error', (...err) => {
        // Re-throw errors from the task
        const error = new Error(err[0]);
        // Set the stack to the one given to us by the worker
        [, error.stack] = err;
        reject(error);
      });

      const responseSub = this.workerInstance.on(emitKey, (data: Tslint.LintResult[]) => {
        errSub.dispose();
        responseSub.dispose();
        resolve(data);
      });

      try {
        this.workerInstance.send({
          messageType: 'job',
          message: {
            emitKey,
            jobType,
            content: textEditor.getText(),
            filePath: textEditor.getPath(),
          },
        } as JobMessage);
      } catch (e) {
        reject(e);
      }
    });
  }
}

export type ConfigMessage = {
  messageType: 'config',
  message: {
    key: string,
    value: any,
  }
}

export type JobMessage = {
  messageType: 'job',
  message: {
    emitKey: string,
    jobType: string,
    content: ReturnType<TextEditor["getText"]>,
    filePath: ReturnType<TextEditor["getPath"]>,
  }
}
