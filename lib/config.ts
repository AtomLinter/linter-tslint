export const config = {
  "enableSemanticRules": {
    "type": "boolean",
    "title": "Enable semantic rules",
    "description": "Allow passing a TypeScript program object to the linter. May negatively affect performance. See this page for details: https://palantir.github.io/tslint/usage/type-checking/",
    "default": false,
    "order": 1
  },
  "rulesDirectory": {
    "type": "string",
    "title": "Custom rules directory (absolute path)",
    "default": "",
    "order": 2
  },
  "fixOnSave": {
    "title": "Fix errors on save",
    "description": "Have tslint attempt to fix some errors automatically when saving the file.",
    "type": "boolean",
    "default": false,
    "order": 3
  },
  "ignoreTypings": {
    "type": "boolean",
    "title": "Ignore typings files (.d.ts)",
    "default": false,
    "order": 4
  },
  "useLocalTslint": {
    "type": "boolean",
    "title": "Try to use the project's local tslint package, if it exists",
    "default": true,
    "order": 5
  },
  "useGlobalTslint": {
    "type": "boolean",
    "title": "Use the global tslint install",
    "description": "If enabled, the global tslint installation will be used as a fallback, instead of the version packaged with linter-tslint.",
    "default": false,
    "order": 6
  },
  "globalNodePath": {
    "type": "string",
    "title": "Global node installation path",
    "description": "The location of your global npm install. (Will default to `npm get prefix`.)",
    "default": "",
    "order": 7
  }
}

export interface ConfigSchema {
  enableSemanticRules: boolean,
  rulesDirectory: string | null,
  fixOnSave: boolean,
  ignoreTypings: boolean,
  useLocalTslint: boolean,
  useGlobalTslint: boolean,
  globalNodePath: string | null,
}

export const defaultConfig = Object.freeze({
  enableSemanticRules: false,
  rulesDirectory: "",
  fixOnSave: false,
  ignoreTypings: false,
  useLocalTslint: true,
  useGlobalTslint: false,
  globalNodePath: "",
} as const)
