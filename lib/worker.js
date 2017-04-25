'use babel';

/* global emit */

import path from 'path';

process.title = 'linter-tslint worker';

const tslintModuleName = 'tslint';
const tslintCache = new Map();
const config = {
  useLocalTslint: false,
};

let tslintDef;
let requireResolve;

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
    // eslint-disable-next-line import/no-dynamic-require
    tslintDef = require(tslintModuleName).Linter;
  }
}

async function getLocalLinter(basedir) {
  return new Promise((resolve) => {
    if (!requireResolve) {
      requireResolve = require('resolve');
    }
    requireResolve(tslintModuleName, { basedir },
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
}

async function getLinter(filePath) {
  const basedir = path.dirname(filePath);
  if (tslintCache.has(basedir)) {
    return tslintCache.get(basedir);
  }

  // Initialize the default instance if it hasn't already been initialized
  loadDefaultTSLint();

  if (config.useLocalTslint) {
    return getLocalLinter(basedir);
  }

  tslintCache.set(basedir, tslintDef);
  return tslintDef;
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

  const Linter = await getLinter(filePath);
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

    if (config.rulesDirectory) {
      rulesDirectory.push(config.rulesDirectory);
    }
  }

  const linter = new Linter(Object.assign({
    formatter: 'json',
    rulesDirectory,
  }, options));

  let lintResult;
  try {
    linter.lint(filePath, content, configuration);
    lintResult = linter.getResult();
  } catch (err) {
    console.error(err); // eslint-disable-line no-console
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
}

export default async function (initialConfig) {
  config.useLocalTslint = initialConfig.useLocalTslint;

  process.on('message', async (message) => {
    if (message.messageType === 'config') {
      config[message.message.key] = message.message.value;

      if (message.message.key === 'useLocalTslint') {
        tslintCache.clear();
      }
    } else {
      const { emitKey, jobType, content, filePath } = message.message;
      const options = jobType === 'fix' ? { fix: true } : {};

      const results = await lint(content, filePath, options);
      emit(emitKey, results);
    }
  });
}
