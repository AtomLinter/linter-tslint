import type * as Tslint from "tslint";
declare type LinterTslintV3 = (filePath: string, text: string, configuration: Tslint.ILinterOptions) => {
    lint: () => Tslint.LintResult[];
};
export declare function shim(Linter: LinterTslintV3): typeof Tslint.Linter;
export {};
