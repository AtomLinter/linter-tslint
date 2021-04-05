import { Task, TextEditor } from 'atom';
import type { ConfigSchema } from "./config";
import type * as Tslint from "tslint";
export declare class WorkerHelper {
    workerInstance: Task | null;
    constructor();
    isRunning(): boolean;
    startWorker(config: ConfigSchema): void;
    terminateWorker(): void;
    changeConfig(key: string, value: any): void;
    requestJob(jobType: string, textEditor: TextEditor): Promise<Tslint.LintResult[]>;
}
export declare type ConfigMessage = {
    messageType: 'config';
    message: {
        key: keyof ConfigSchema;
        value: boolean | string | null;
    };
};
export declare type JobMessage = {
    messageType: 'job';
    message: {
        emitKey: string;
        jobType: string;
        content: ReturnType<TextEditor["getText"]>;
        filePath: ReturnType<TextEditor["getPath"]>;
    };
};
