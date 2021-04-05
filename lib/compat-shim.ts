import type * as Tslint from "tslint";

/**
 * Shim for TSLint v3 interoperability
 * @param {Function} Linter TSLint v3 linter
 * @return {Function} TSLint v4-compatible linter
 */
export function shim(Linter: Function): typeof Tslint.Linter {
  function LinterShim(options) {
    this.options = options;
    this.results = {};
  }

  // Assign class properties
  Object.assign(LinterShim, Linter);

  // Assign instance methods
  LinterShim.prototype = {
    ...Linter.prototype,
    lint(filePath, text, configuration) {
      const options = { ...this.options, configuration };
      const linter = new Linter(filePath, text, options);
      this.results = linter.lint();
    },
    getResult() {
      return this.results;
    },
  };

  return LinterShim;
}
