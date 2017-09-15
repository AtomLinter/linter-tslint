'use babel';

import cryptoRandomString from 'crypto-random-string';

let workerInstance;

export function startWorker(worker, config) {
  if (workerInstance !== worker) {
    workerInstance = worker;
    workerInstance.start(config);
  }
}

export function terminateWorker() {
  if (workerInstance) {
    workerInstance.terminate();
    workerInstance = null;
  }
}

export function changeConfig(key, value) {
  if (workerInstance) {
    workerInstance.send({
      messageType: 'config',
      message: { key, value },
    });
  }
}

export function requestJob(jobType, textEditor) {
  const emitKey = cryptoRandomString(10);

  return new Promise((resolve, reject) => {
    const errSub = workerInstance.on('task:error', (...err) => {
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
