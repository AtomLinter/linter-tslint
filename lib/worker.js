'use babel';

/* global emit */

import escapeHTML from 'escape-html';
import fs from 'fs';
import path from 'path';
import { getRuleUri } from 'tslint-rule-documentation';
import ChildProcess from 'child_process';
import getPath from 'consistent-path';

process.title = 'linter-tslint worker';

const tslintModuleName = 'tslint';
const tslintCache = new Map();
const config = {
  useLocalTslint: false,
};

let fallbackLinter;
let requireResolve;

function stat(pathname) {
  return new Promise((resolve, reject) => {
    fs.stat(pathname, (err, stats) => {
      if (err) {
        return reject(err);
      }
      return resolve(stats);
    });
  });
}

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

function resolveAndCacheLinter(fileDir, moduleDir) {
  const basedir = moduleDir || fileDir;
  return new Promise((resolve) => {
    if (!requireResolve) {
      requireResolve = require('resolve');
    }
    requireResolve(
      tslintModuleName,
      { basedir },
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
          tslintCache.set(fileDir, linter);
        }
        resolve(linter);
      },
    );
  });
}

function getNodePrefixPath() {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    ChildProcess.exec(
      `${npmCommand} get prefix`,
      { env: Object.assign(Object.assign({}, process.env), { PATH: getPath() }) },
      (err, stdout, stderr) => {
        if (err || stderr) {
          reject(err || new Error(stderr));
        } else {
          resolve(stdout.trim());
        }
      },
    );
  });
}

async function getLinter(filePath) {
  const basedir = path.dirname(filePath);
  if (tslintCache.has(basedir)) {
    return tslintCache.get(basedir);
  }

  if (config.useLocalTslint) {
    const localLint = await resolveAndCacheLinter(basedir);
    if (localLint) {
      return localLint;
    }
  }

  if (fallbackLinter) {
    tslintCache.set(basedir, fallbackLinter);
    return fallbackLinter;
  }

  if (config.useGlobalTslint) {
    if (config.globalNodePath) {
      const globalLint = await resolveAndCacheLinter(basedir, config.globalNodePath);
      if (globalLint) {
        fallbackLinter = globalLint;
        return globalLint;
      }
    }

    let prefix;
    try {
      prefix = await getNodePrefixPath();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Attempted to load global tslint, but \`npm get prefix\`
failed. Falling back to the packaged version of tslint. You can specify
your prefix manually in the settings or linter-tslint config file.\n
The error message encountered was:\n\n${err.message}`);
    }

    if (prefix) {
      const globalLint = await resolveAndCacheLinter(basedir, prefix);
      fallbackLinter = globalLint;
      return globalLint;
    }
  }

  // eslint-disable-next-line import/no-dynamic-require
  fallbackLinter = require(tslintModuleName).Linter;
  tslintCache.set(basedir, fallbackLinter);
  return fallbackLinter;
}

async function getProgram(Linter, configurationPath) {
  let program;
  const configurationDir = path.dirname(configurationPath);
  const tsconfigPath = path.resolve(configurationDir, 'tsconfig.json');
  try {
    const stats = await stat(tsconfigPath);
    if (stats.isFile()) {
      program = Linter.createProgram(tsconfigPath, configurationDir);
    }
  } catch (err) {
    // no-op
  }
  return program;
}

/**
 * Lint the provided TypeScript content
 * @param content {string} The content of the TypeScript file
 * @param filePath {string} File path of the TypeScript filePath
 * @param options {Object} Linter options
 * @return Array of lint results
 */
async function lint(content, filePath, options) {
  if (filePath === null || filePath === undefined) {
    return null;
  }

  let lintResult;
  try {
    const Linter = await getLinter(filePath);
    const configurationPath = Linter.findConfigurationPath(null, filePath);
    const configuration = Linter.loadConfigurationFromPath(configurationPath);

    let { rulesDirectory } = configuration;
    if (rulesDirectory && configurationPath) {
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

      if (config.rulesDirectory) {
        rulesDirectory.push(config.rulesDirectory);
      }
    }

    let program;
    if (config.enableSemanticRules && configurationPath) {
      program = await getProgram(Linter, configurationPath);
    }

    const linter = new Linter(Object.assign({
      formatter: 'json',
      rulesDirectory,
    }, options), program);

    linter.lint(filePath, content, configuration);
    lintResult = linter.getResult();
  } catch (err) {
    console.error(err.message, err.stack); // eslint-disable-line no-console
    lintResult = {};
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
    const ruleUri = getRuleUri(failure.getRuleName());
    const startPosition = failure.getStartPosition().getLineAndCharacter();
    const endPosition = failure.getEndPosition().getLineAndCharacter();
    return {
      type: failure.ruleSeverity || 'warning',
      html: `${escapeHTML(failure.getFailure())} (<a href="${ruleUri.uri}">${failure.getRuleName()}</a>)`,
      filePath: path.normalize(failure.getFileName()),
      range: [
        [startPosition.line, startPosition.character],
        [endPosition.line, endPosition.character],
      ],
    };
  });
}

export default async function (initialConfig) {
  config.useLocalTslint = initialConfig.useLocalTslint;
  config.enableSemanticRules = initialConfig.enableSemanticRules;
  config.useGlobalTslint = initialConfig.useGlobalTslint;
  config.globalNodePath = initialConfig.globalNodePath;

  process.on('message', async (message) => {
    if (message.messageType === 'config') {
      config[message.message.key] = message.message.value;

      if (message.message.key === 'useLocalTslint') {
        tslintCache.clear();
      }
    } else {
      const {
        emitKey, jobType, content, filePath,
      } = message.message;
      const options = jobType === 'fix' ? { fix: true } : {};

      const results = await lint(content, filePath, options);
      emit(emitKey, results);
    }
  });
}
