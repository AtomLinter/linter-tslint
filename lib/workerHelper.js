'use babel';

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
import { Task } from 'atom';
import cryptoRandomString from 'crypto-random-string';

export default class WorkerHelper {
  constructor() {
    this.workerInstance = null;
  }

  isRunning() {
    return !!this.workerInstance;
  }

  startWorker(config) {
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

  changeConfig(key, value) {
    if (this.workerInstance) {
      this.workerInstance.send({
        messageType: 'config',
        message: { key, value },
      });
    }
  }

  requestJob(jobType, textEditor) {
    if (!this.workerInstance) {
      throw new Error("Worker hasn't started");
    }

    const emitKey = cryptoRandomString(10);

    return new Promise((resolve, reject) => {
      const errSub = this.workerInstance.on('task:error', (...err) => {
        // Re-throw errors from the task
        const error = new Error(err[0]);
        // Set the stack to the one given to us by the worker
        [, error.stack] = err;
        reject(error);
      });

      const responseSub = this.workerInstance.on(emitKey, (data) => {
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
        });
      } catch (e) {
        reject(e);
      }
    });
  }
}
