export interface Config {
  enableSemanticRules: boolean;
  globalNodePath: string | null;
  rulesDirectory: string | null;
  useGlobalTslint: boolean;
  useLocalTslint: boolean;
}
