export declare const config: {
    enableSemanticRules: {
        type: string;
        title: string;
        description: string;
        default: boolean;
        order: number;
    };
    rulesDirectory: {
        type: string;
        title: string;
        default: string;
        order: number;
    };
    fixOnSave: {
        title: string;
        description: string;
        type: string;
        default: boolean;
        order: number;
    };
    ignoreTypings: {
        type: string;
        title: string;
        default: boolean;
        order: number;
    };
    useLocalTslint: {
        type: string;
        title: string;
        default: boolean;
        order: number;
    };
    useGlobalTslint: {
        type: string;
        title: string;
        description: string;
        default: boolean;
        order: number;
    };
    globalNodePath: {
        type: string;
        title: string;
        description: string;
        default: string;
        order: number;
    };
};
export interface ConfigSchema {
    enableSemanticRules: boolean;
    rulesDirectory: string | null;
    fixOnSave: boolean;
    ignoreTypings: boolean;
    useLocalTslint: boolean;
    useGlobalTslint: boolean;
    globalNodePath: string | null;
}
export declare const defaultConfig: Readonly<{
    readonly enableSemanticRules: false;
    readonly rulesDirectory: "";
    readonly fixOnSave: false;
    readonly ignoreTypings: false;
    readonly useLocalTslint: true;
    readonly useGlobalTslint: false;
    readonly globalNodePath: "";
}>;
