import type * as Tslint from "tslint";

type LinterTslintV3 = (filePath: string, text: string, configuration: Tslint.ILinterOptions) => { lint: () => Tslint.LintResult[] }

/**
 * Shim for TSLint v3 interoperability
 * @param {Function} Linter TSLint v3 linter
 * @return {Function} TSLint v4-compatible linter
 */
export function shim(Linter: LinterTslintV3): typeof Tslint.Linter {
  function LinterShim(options: Tslint.ILinterOptions) {
    this.options = options;
    this.results = {};
  }

  // Assign class properties
  Object.assign(LinterShim, Linter);

  // Assign instance methods
  LinterShim.prototype = {
    ...Linter.prototype,
    lint(filePath: string, text: string, configuration: Tslint.ILinterOptions) {
      const options : Tslint.ILinterOptions = { ...this.options, configuration };
      const linter = new Linter(filePath, text, options) as ReturnType<LinterTslintV3>;
      this.results = linter.lint();
    },
    getResult() {
      return this.results;
    },
  };

  return LinterShim;
}
