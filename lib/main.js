const path = require('path')
const { AutoLanguageClient } = require("atom-languageclient");

class TSLintLanguageClient extends AutoLanguageClient {
  getGrammarScopes() {
    return atom.config.get("linter-tslint.javascriptSupport")
      ? ["source.ts", "source.tsx", "source.js", "source.js.jsx"]
      : ["source.ts", "source.tsx"];
  }

  getLanguageName() {
    return "TypeScript";
  }

  getServerName() {
    return "TSLint";
  }

  getConnectionType() {
    return "ipc";
  }

  getInitializeParams(projectPath, process) {
    this.projectPath = projectPath;

    return {
      processId: process.pid,
      capabilities: {
        workspace: {
          configuration: true
        }
      },
      rootPath: projectPath
    };
  }

  startServerProcess(projectPath) {
    return super.spawnChildNode(
      [require.resolve("@keplersj/tslint-server/out/server")],
      { cwd: projectPath, stdio: [null, null, null, "ipc"] }
    );
  }

  preInitialization(connection) {
    connection._onNotification({method: "tslint/status"}, params => {
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
      //     console.error("TSLint status changed in an unknown way!")
      // }
    });

    connection._onRequest({ method: "tslint/noLibrary" }, () => {
      atom.notifications.addError(
        "TSLint can't find TSLint Library in Project."
      );
    });

    connection._onRequest({ method: "workspace/configuration" }, params => {
      return {
        enable: true,
        jsEnable: atom.config.get("linter-tslint.javascriptSupport"),
        rulesDirectory: atom.config.get("linter-tslint.rulesDirectory"),
        configFile: path.join(this.projectPath, "tslint.json"),
        ignoreDefinitionFiles: atom.config.get("linter-tslint.ignoreTypings"),
        exclude: [""],
        validateWithDefaultConfig: !atom.config.get("linter.tslint.useLocalTslint"),
        nodePath: process.execPath,
        run: "onType",
        alwaysShowRuleFailuresAsWarnings: false,
        autoFixOnSave: atom.config.get("linter-tslint.fixOnSave"),
        trace: atom.config.get("core.debugLSP") ? {server: "verbose"} : {}
      }
    });
  }
}

module.exports = new TSLintLanguageClient();
