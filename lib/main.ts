import * as path from "path";
import {
  AutoLanguageClient,
  ActiveServer,
  ConnectionType,
  LanguageServerProcess
} from "atom-languageclient";
import { InitializeParams } from "vscode-languageserver/lib/main";

class TSLintLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return ["source.ts", "source.tsx", "source.js", "source.js.jsx"];
  }

  getLanguageName() {
    return "TypeScript";
  }

  getServerName() {
    return "TSLint";
  }

  getConnectionType(): ConnectionType {
    return "ipc";
  }

  getInitializeParams(
    projectPath: string,
    process: LanguageServerProcess
  ): InitializeParams {
    return {
      processId: process.pid,
      capabilities: {
        workspace: {
          didChangeConfiguration: {
            dynamicRegistration: true
          }
        }
      },
      rootUri: projectPath
    };
  }

  startServerProcess(projectPath: string) {
    return super.spawnChildNode(
      [require.resolve("@keplersj/tslint-server/out/server")],
      { cwd: projectPath, stdio: [null, null, null, "ipc"] } // eslint-disable-line comma-dangle
    );
  }

  postInitialization({ connection }: ActiveServer) {
    connection.onCustom("tslint/status", (params: any) => {
      // This notification is used to set the status indicator in VSCode.

      // const status = params.state;
      // switch (status) {
      //   case 1: // ok
      //     atom.notifications.addSuccess("TSLint is OK");
      //     break;
      //   case 2: // warning
      //     atom.notifications.addWarning("TSLint is not OK");
      //     break;
      //   case 3: // error
      //     atom.notifications.addError("TSLint is not OK");
      //     break;
      //   default:
      //     console.error("TSLint status changed in an unknown way!");
      // }
    });

    connection.onCustom("tslint/noLibrary", () => {
      atom.notifications.addError(
        "TSLint can't find TSLint Library in Project."
      );
    });

    const getConfig = () => ({
      enable: true,
      jsEnable: atom.config.get("linter-tslint.javascriptSupport"),
      rulesDirectory: atom.config.get("linter-tslint.rulesDirectory"),
      configFile: "",
      ignoreDefinitionFiles: atom.config.get("linter-tslint.ignoreTypings"),
      exclude: [],
      validateWithDefaultConfig: !atom.config.get(
        "linter.tslint.useLocalTslint"
      ),
      nodePath: process.execPath,
      run: "onType",
      alwaysShowRuleFailuresAsWarnings: false,
      autoFixOnSave: atom.config.get("linter-tslint.fixOnSave"),
      trace: atom.config.get("core.debugLSP") ? { server: "verbose" } : {}
    });

    connection.onCustom("workspace/configuration", getConfig);

    const configChanged = () => {
      connection.didChangeConfiguration({ settings: getConfig() });
    };

    atom.config.observe("linter-tslint.javascriptSupport", configChanged);
    atom.config.observe("linter-tslint.rulesDirectory", configChanged);
    atom.config.observe("linter-tslint.ignoreTypings", configChanged);
    atom.config.observe("linter-tslint.useLocalTslint", configChanged);
    atom.config.observe("linter-tslint.fixOnSave", configChanged);
    atom.config.observe("core.debugLSP", configChanged);
  }
}

module.exports = new TSLintLanguageClient();
