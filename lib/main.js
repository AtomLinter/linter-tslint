'use babel';

// eslint-disable-next-line import/extensions, import/no-extraneous-dependencies
import { CompositeDisposable } from 'atom';
import path from 'path';
import fs from 'fs';

const TSLINT_MODULE_NAME = 'tslint';
const grammarScopes = ['source.ts', 'source.tsx'];
const editorClass = 'linter-tslint-compatible-editor';
const tslintCache = new Map();
let tslintDef;
let requireResolve;
const idleCallbacks = new Set();

/**
 * Shim for TSLint v3 interoperability
 * @param {Function} Linter TSLint v3 linter
 * @return {Function} TSLint v4-compatible linter
 */
function shim(Linter) {
  function LinterShim(options) {
    this.options = options;
    this.results = {};
  }

  // Assign class properties
  Object.assign(LinterShim, Linter);

  // Assign instance methods
  LinterShim.prototype = Object.assign({}, Linter.prototype, {
    lint(filePath, text, configuration) {
      const options = Object.assign({}, this.options, { configuration });
      const linter = new Linter(filePath, text, options);
      this.results = linter.lint();
    },
    getResult() {
      return this.results;
    },
  });

  return LinterShim;
}

function loadDefaultTSLint() {
  if (!tslintDef) {
    tslintDef = require('loophole').allowUnsafeNewFunction(() =>
      // eslint-disable-next-line import/no-dynamic-require
      require(TSLINT_MODULE_NAME).Linter);
  }
}

export default {
  activate() {
    let depsCallbackID;
    const lintertslintDeps = () => {
      idleCallbacks.delete(depsCallbackID);
      // Install package dependencies
      require('atom-package-deps').install('linter-tslint');
      // Initialize the default TSLint instance
      loadDefaultTSLint();
    };
    depsCallbackID = window.requestIdleCallback(lintertslintDeps);
    idleCallbacks.add(depsCallbackID);

    this.subscriptions = new CompositeDisposable();

    // Config subscriptions
    this.subscriptions.add(
      atom.config.observe('linter-tslint.rulesDirectory', (dir) => {
        if (dir && path.isAbsolute(dir)) {
          fs.stat(dir, (err, stats) => {
            if (stats && stats.isDirectory()) {
              this.rulesDirectory = dir;
            }
          });
        }
      }),
      atom.config.observe('linter-tslint.useLocalTslint', (use) => {
        tslintCache.clear();
        this.useLocalTslint = use;
      }),
      atom.config.observe('linter-tslint.ignoreTypings', (ignoreTypings) => {
        this.ignoreTypings = ignoreTypings;
      }),
    );

    // Marks each TypeScript editor with a CSS class so that
    // we can enable commands only for TypeScript editors.
    this.subscriptions.add(
      atom.workspace.observeTextEditors((textEditor) => {
        if (textEditor.getRootScopeDescriptor().getScopesArray()
        .some(scope => grammarScopes.includes(scope))) {
          atom.views.getView(textEditor).classList.add(editorClass);
        }
      }),
    );

    // Command subscriptions
    this.subscriptions.add(
      atom.commands.add(`atom-text-editor.${editorClass}`, {
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
            const results = await this.lint(textEditor, {
              fix: true,
            });

            const notificationText = results && results.length === 0 ?
              'Linter-TSLint: Fix complete.' :
              'Linter-TSLint: Fix attempt complete, but linting errors remain.';

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
  },

  deactivate() {
    idleCallbacks.forEach(callbackID => window.cancelIdleCallback(callbackID));
    idleCallbacks.clear();
    this.subscriptions.dispose();
  },

  async getLinter(filePath) {
    const basedir = path.dirname(filePath);
    if (tslintCache.has(basedir)) {
      return tslintCache.get(basedir);
    }

    // Initialize the default instance if it hasn't already been initialized
    loadDefaultTSLint();

    if (this.useLocalTslint) {
      return this.getLocalLinter(basedir);
    }

    tslintCache.set(basedir, tslintDef);
    return tslintDef;
  },

  async getLocalLinter(basedir) {
    return new Promise((resolve) => {
      if (!requireResolve) {
        requireResolve = require('resolve');
      }
      requireResolve(TSLINT_MODULE_NAME, { basedir },
        (err, linterPath, pkg) => {
          let linter;
          if (!err && pkg && /^3|4|5\./.test(pkg.version)) {
            if (pkg.version.startsWith('3')) {
              // eslint-disable-next-line import/no-dynamic-require
              linter = shim(require('loophole').allowUnsafeNewFunction(() => require(linterPath)));
            } else {
              // eslint-disable-next-line import/no-dynamic-require
              linter = require('loophole').allowUnsafeNewFunction(() => require(linterPath).Linter);
            }
          } else {
            linter = tslintDef;
          }
          tslintCache.set(basedir, linter);
          return resolve(linter);
        },
      );
    });
  },

  provideLinter() {
    return {
      name: 'TSLint',
      grammarScopes,
      scope: 'file',
      lintOnFly: true,
      lint: async (textEditor) => {
        if (this.ignoreTypings && textEditor.getPath().toLowerCase().endsWith('.d.ts')) {
          return [];
        }

        return this.lint(textEditor);
      },
    };
  },

  async lint(textEditor, options) {
    const filePath = textEditor.getPath();

    if (filePath === null || filePath === undefined) {
      return null;
    }

    const text = textEditor.getText();
    const Linter = await this.getLinter(filePath);
    const configurationPath = Linter.findConfigurationPath(null, filePath);
    const configuration = Linter.loadConfigurationFromPath(configurationPath);

    let { rulesDirectory } = configuration;
    if (rulesDirectory) {
      const configurationDir = path.dirname(configurationPath);
      if (!Array.isArray(rulesDirectory)) {
        rulesDirectory = [rulesDirectory];
      }
      rulesDirectory = rulesDirectory.map((dir) => {
        if (path.isAbsolute(dir)) {
          return dir;
        }
        return path.join(configurationDir, dir);
      });

      if (this.rulesDirectory) {
        rulesDirectory.push(this.rulesDirectory);
      }
    }

    const linter = new Linter(Object.assign({
      formatter: 'json',
      rulesDirectory,
    }, options));

    linter.lint(filePath, text, configuration);
    const lintResult = linter.getResult();

    if (textEditor.getText() !== text) {
      // Text has been modified since the lint was triggered, tell linter not to update
      return null;
    }

    if (
      // tslint@<5
      !lintResult.failureCount &&
      // tslint@>=5
      !lintResult.errorCount &&
      !lintResult.warningCount &&
      !lintResult.infoCount
    ) {
      return [];
    }

    return lintResult.failures.map((failure) => {
      const startPosition = failure.getStartPosition().getLineAndCharacter();
      const endPosition = failure.getEndPosition().getLineAndCharacter();
      return {
        type: failure.ruleSeverity || 'warning',
        text: `${failure.getRuleName()} - ${failure.getFailure()}`,
        filePath: path.normalize(failure.getFileName()),
        range: [
          [startPosition.line, startPosition.character],
          [endPosition.line, endPosition.character],
        ],
      };
    });
  },
};
