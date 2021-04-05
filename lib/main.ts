import { CompositeDisposable, TextEditor } from 'atom';
import path from 'path';
import { promises } from 'fs';
const { stat } = promises;
import { WorkerHelper } from './workerHelper';
import { defaultConfig } from "./config"

const grammarScopes = ['source.ts', 'source.tsx'];
const editorClass = 'linter-tslint-compatible-editor';
const idleCallbacks = new Set();
const config = defaultConfig;

// Worker still hasn't initialized, since the queued idle callbacks are
// done in order, waiting on a newly queued idle callback will ensure that
// the worker has been initialized
function waitOnIdle() {
  return new Promise((resolve) => {
    const callbackID = window.requestIdleCallback(() => {
      idleCallbacks.delete(callbackID);
      resolve(true);
    });
    idleCallbacks.add(callbackID);
  });
};

const subscriptions = new CompositeDisposable();
const workerHelper = new WorkerHelper();

export function activate() {
  const depsCallbackID = window.requestIdleCallback(() => {
    idleCallbacks.delete(depsCallbackID);
    // Install package dependencies
    require('atom-package-deps').install('linter-tslint');
  });
  idleCallbacks.add(depsCallbackID);


  // Config subscriptions
  subscriptions.add(
    atom.config.observe('linter-tslint.rulesDirectory', async (dir) => {
      if (dir && path.isAbsolute(dir)) {
        const stats = await stat(dir);
        if (stats && stats.isDirectory()) {
          config.rulesDirectory = dir;
          workerHelper.changeConfig('rulesDirectory', dir);
        }
      }
    }),
    atom.config.observe('linter-tslint.useLocalTslint', (use) => {
      config.useLocalTslint = use;
      workerHelper.changeConfig('useLocalTslint', use);
    }),
    atom.config.observe('linter-tslint.enableSemanticRules', (enableSemanticRules) => {
      config.enableSemanticRules = enableSemanticRules;
      workerHelper.changeConfig('enableSemanticRules', enableSemanticRules);
    }),
    atom.config.observe('linter-tslint.useGlobalTslint', (use) => {
      config.useGlobalTslint = use;
      workerHelper.changeConfig('useGlobalTslint', use);
    }),
    atom.config.observe('linter-tslint.globalNodePath', (globalNodePath) => {
      config.globalNodePath = globalNodePath;
      workerHelper.changeConfig('globalNodePath', globalNodePath);
    }),
    atom.config.observe('linter-tslint.ignoreTypings', (ignoreTypings) => {
      config.ignoreTypings = ignoreTypings;
    }),
    atom.workspace.observeTextEditors((textEditor) => {
      // Marks each TypeScript editor with a CSS class so that
      // we can enable commands only for TypeScript editors.
      const rootScopes = textEditor.getRootScopeDescriptor().getScopesArray();
      if (rootScopes.some((scope) => grammarScopes.includes(scope))) {
        atom.views.getView(textEditor).classList.add(editorClass);
        textEditor.onDidSave(async () => {
          if (atom.config.get('linter-tslint.fixOnSave')) {
            if (!workerHelper.isRunning()) {
              // Wait for worker to initialize
              await waitOnIdle();
            }

            await workerHelper.requestJob('fix', textEditor);
          }
        });
      }
    }),
    atom.commands.add(`atom-text-editor.${editorClass}`, {
      // Command subscriptions
      'linter-tslint:fix-file': async () => {
        const textEditor = atom.workspace.getActiveTextEditor();

        if (!textEditor || textEditor.isModified()) {
          // Abort for invalid or unsaved text editors
          atom.notifications.addError('Linter-TSLint: Please save before fixing');
          return;
        }

        // The fix replaces the file content and the cursor can jump automatically
        // to the beginning of the file, so save current cursor position
        const cursorPosition = textEditor.getCursorBufferPosition();

        try {
          const results = await workerHelper.requestJob('fix', textEditor);

          const notificationText = results && results.length === 0
            ? 'Linter-TSLint: Fix complete.'
            : 'Linter-TSLint: Fix attempt complete, but linting errors remain.';

          atom.notifications.addSuccess(notificationText);
        } catch (err) {
          atom.notifications.addWarning(err.message);
        } finally {
          // Restore cursor to the position before fix job
          textEditor.setCursorBufferPosition(cursorPosition);
        }
      },
    }),
  );

  const createWorkerCallback = window.requestIdleCallback(() => {
    workerHelper.startWorker(config);
    idleCallbacks.delete(createWorkerCallback);
  });
  idleCallbacks.add(createWorkerCallback);
}

export function deactivate() {
  idleCallbacks.forEach((callbackID) => window.cancelIdleCallback(callbackID));
  idleCallbacks.clear();
  subscriptions.dispose();

  workerHelper.terminateWorker();
}

export function provideLinter() {
  return {
    name: 'TSLint',
    grammarScopes,
    scope: 'file',
    lintsOnChange: true,
    lint: async (textEditor: TextEditor) => {
      if (config.ignoreTypings && textEditor.getPath().toLowerCase().endsWith('.d.ts')) {
        return [];
      }

      if (!workerHelper.isRunning()) {
        // Wait for worker to initialize
        await waitOnIdle();
      }

      const text = textEditor.getText();
      const results = await workerHelper.requestJob('lint', textEditor);

      if (textEditor.getText() !== text) {
        // Text has been modified since the lint was triggered, tell linter not to update
        return null;
      }

      return results;
    },
  };
}

export { config } from './config';
