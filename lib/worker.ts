/* global emit */

import { promises } from 'fs';
const { stat } = promises;
import path from 'path';
import { getRuleUri } from 'tslint-rule-documentation';
import ChildProcess from 'child_process';
import getPath from 'consistent-path';
import { shim } from "./compat-shim";
import { defaultConfig } from "./config"
import type { ConfigSchema } from "./config"
import type { emit } from 'node:cluster';
import type * as Tslint from "tslint";
import type * as Ts from "typescript";
import type { JobMessage, ConfigMessage } from "./workerHelper"
import { RuleFailure } from 'tslint';

process.title = 'linter-tslint worker';

const tslintModuleName = 'tslint';
const tslintCache = new Map<string, typeof Tslint.Linter>();
const config: ConfigSchema = { ...defaultConfig } // copy of default config

let fallbackLinter: typeof Tslint.Linter;
let requireResolve: typeof import("resolve");


function resolveAndCacheLinter(fileDir: string, moduleDir?: string): Promise<typeof Tslint.Linter | undefined> {
  const basedir = moduleDir || fileDir;
  return new Promise((resolve) => {
    if (!requireResolve) {
      requireResolve = require('resolve');
    }
    requireResolve(
      tslintModuleName,
      { basedir },
      (err, linterPath, pkg) => {
        let linter: typeof Tslint.Linter | undefined = undefined;
        if (!err && linterPath !== undefined && pkg && /^3|4|5|6\./.test(pkg.version)) {
          if (pkg.version.startsWith('3')) {
            // eslint-disable-next-line import/no-dynamic-require
            linter = shim(require('loophole').allowUnsafeNewFunction(() => require(linterPath) as typeof import("tslint")));
          } else {
            // eslint-disable-next-line import/no-dynamic-require
            linter = require('loophole').allowUnsafeNewFunction(() => (require(linterPath) as typeof import("tslint")).Linter);
          }
          tslintCache.set(fileDir, linter!);
        }
        resolve(linter);
      },
    );
  });
}

function getNodePrefixPath(): Promise<string> {
  return new Promise((resolve, reject) => {
    const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
    ChildProcess.exec(
      `${npmCommand} get prefix`,
      { env: { ...process.env, PATH: getPath() } },
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

async function getLinter(filePath: string): Promise<typeof Tslint.Linter | undefined> {
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

    let prefix: string | undefined = undefined;
    try {
      prefix = await getNodePrefixPath();
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`Attempted to load global tslint, but "npm get prefix" failed. Falling back to the packaged version of tslint. You can specify your prefix manually in the settings or linter-tslint config file. If your prefix is specified in the settings, make sure that it is correct.\n\nThe error message encountered was:\n\n${err.message}`);
    }

    if (prefix) {
      const globalLint = await resolveAndCacheLinter(basedir, prefix);
      if (globalLint) {
        fallbackLinter = globalLint;
        return globalLint;
      }
      // eslint-disable-next-line no-console
      console.warn(`Unable to find global installation of tslint at ${prefix}. Falling back to the packaged version of tslint. If you have not done so, install tslint by running "npm install -g tslint" from the command line.`);
    }
  }

  // eslint-disable-next-line import/no-dynamic-require
  fallbackLinter = require(tslintModuleName).Linter;
  tslintCache.set(basedir, fallbackLinter);
  return fallbackLinter;
}

async function getProgram(Linter: typeof Tslint.Linter, configurationPath: string): Promise<Ts.Program | undefined> {
  let program: Ts.Program | undefined = undefined;
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

function getSeverity(failure: RuleFailure) {
  const severity = failure["ruleSeverity"].toLowerCase();
  return ['info', 'warning', 'error'].includes(severity) ? severity : 'warning';
}

/**
 * Lint the provided TypeScript content
 * @param content {string} The content of the TypeScript file
 * @param filePath {string} File path of the TypeScript filePath
 * @param options {Object} Linter options
 * @return Array of lint results
 */
async function lint(content: string, filePath: string | undefined, options: Tslint.ILinterOptions) {
  if (filePath === null || filePath === undefined) {
    return null;
  }

  let lintResult: Tslint.LintResult;
  try {
    const Linter = await getLinter(filePath);
    if (!Linter) {
      throw new Error(`tslint was not found for ${filePath}`)
    }
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

    let program: Ts.Program | undefined = undefined;
    if (config.enableSemanticRules && configurationPath) {
      program = await getProgram(Linter, configurationPath);
    }

    const linter = new Linter({
      formatter: 'json',
      rulesDirectory,
      ...options,
    }, program);

    linter.lint(filePath, content, configuration);
    lintResult = linter.getResult();
  } catch (err) {
    console.error(err.message, err.stack); // eslint-disable-line no-console
    lintResult = { errorCount: 0, warningCount: 0, failures: [], format: "", output: "" };
  }

  if (
    // tslint@<5
    !(lintResult as any).failureCount
    // tslint@>=5
    && !lintResult.errorCount
    && !lintResult.warningCount
    && !(lintResult as any).infoCount // TODO is this still supported?
  ) {
    return [];
  }

  return lintResult.failures.map((failure: Tslint.RuleFailure) => {
    const ruleUri = getRuleUri(failure.getRuleName());
    const startPosition = failure.getStartPosition().getLineAndCharacter();
    const endPosition = failure.getEndPosition().getLineAndCharacter();
    return {
      severity: getSeverity(failure),
      excerpt: `${failure.getFailure()} (${failure.getRuleName()})`,
      url: ruleUri.uri,
      location: {
        file: path.normalize(failure.getFileName()),
        position: [
          [startPosition.line, startPosition.character],
          [endPosition.line, endPosition.character],
        ],
      },
    };
  });
}

async function TsLintWorker(initialConfig: ConfigSchema) {
  config.useLocalTslint = initialConfig.useLocalTslint;
  config.enableSemanticRules = initialConfig.enableSemanticRules;
  config.useGlobalTslint = initialConfig.useGlobalTslint;
  config.globalNodePath = initialConfig.globalNodePath;

  process.on('message', async (message: JobMessage | ConfigMessage) => {
    if (message.messageType === 'config') {
      // set the config for the worker
      config[message.message.key] = message.message.value;

      if (message.message.key === 'useLocalTslint') {
        tslintCache.clear();
      }
    } else {
      const {
        emitKey, jobType, content, filePath,
      } = message.message;
      const options = jobType === 'fix' ? { fix: true } : { fix: false };

      const results = await lint(content, filePath, options);
      emit(emitKey, results);
    }
  });
}
module.exports = TsLintWorker; // Atom needs old style export
