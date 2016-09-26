'use babel';

/* eslint-disable import/extensions, import/no-extraneous-dependencies */
import { CompositeDisposable } from 'atom';
/* eslint-enable import/extensions, import/no-extraneous-dependencies */
import path from 'path';
import fs from 'fs';
import requireResolve from 'resolve';

const TSLINT_MODULE_NAME = 'tslint';
const tslintCache = new Map();
let tslintDef = null;

export default {
  activate() {
    require('atom-package-deps').install('linter-tslint');

    this.subscriptions = new CompositeDisposable();
    this.subscriptions.add(
      atom.config.observe('linter-tslint.rulesDirectory', (dir) => {
        if (dir && path.isAbsolute(dir)) {
          fs.stat(dir, (err, stats) => {
            if (stats && stats.isDirectory()) {
              this.rulesDirectory = dir;
            }
          });
        }
      })
    );

    this.subscriptions.add(
      atom.config.observe('linter-tslint.useLocalTslint', (use) => {
        tslintCache.clear();
        this.useLocalTslint = use;
      })
    );
  },

  deactivate() {
    this.subscriptions.dispose();
  },

  getLinter(filePath) {
    const basedir = path.dirname(filePath);
    const linter = tslintCache.get(basedir);
    if (linter) {
      return Promise.resolve(linter);
    }

    if (this.useLocalTslint) {
      return this.getLocalLinter(basedir);
    }

    tslintCache.set(basedir, tslintDef);
    return Promise.resolve(tslintDef);
  },

  getLocalLinter(basedir) {
    return new Promise(resolve =>
      requireResolve(TSLINT_MODULE_NAME, { basedir },
        (err, linterPath, pkg) => {
          let linter;
          if (!err && pkg && pkg.version.startsWith('3.')) {
            // eslint-disable-next-line import/no-dynamic-require
            linter = require('loophole').allowUnsafeNewFunction(() => require(linterPath));
          } else {
            linter = tslintDef;
          }
          tslintCache.set(basedir, linter);
          return resolve(linter);
        }
      )
    );
  },

  provideLinter() {
    // eslint-disable-next-line import/no-dynamic-require
    tslintDef = require('loophole').allowUnsafeNewFunction(() => require(TSLINT_MODULE_NAME));

    return {
      grammarScopes: ['source.ts', 'source.tsx'],
      scope: 'file',
      lintOnFly: true,
      lint: (textEditor) => {
        const filePath = textEditor.getPath();
        const text = textEditor.getText();

        return this.getLinter(filePath).then((Linter) => {
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

          const linter = new Linter(filePath, text, {
            formatter: 'json',
            configuration,
            rulesDirectory,
          });

          const lintResult = linter.lint();

          if (textEditor.getText() !== text) {
            // Text has been modified since the lint was triggered, tell linter not to update
            return null;
          }

          if (!lintResult.failureCount) {
            return [];
          }

          return lintResult.failures.map((failure) => {
            const startPosition = failure.getStartPosition().getLineAndCharacter();
            const endPosition = failure.getEndPosition().getLineAndCharacter();
            return {
              type: 'Warning',
              text: `${failure.getRuleName()} - ${failure.getFailure()}`,
              filePath: path.normalize(failure.getFileName()),
              range: [
                [startPosition.line, startPosition.character],
                [endPosition.line, endPosition.character],
              ],
            };
          });
        });
      },
    };
  },
};
