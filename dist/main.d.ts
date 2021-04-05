import { TextEditor } from 'atom';
export declare function activate(): void;
export declare function deactivate(): void;
export declare function provideLinter(): {
    name: string;
    grammarScopes: string[];
    scope: string;
    lintsOnChange: boolean;
    lint: (textEditor: TextEditor) => Promise<import("tslint").LintResult[] | null>;
};
export { config } from './config';
