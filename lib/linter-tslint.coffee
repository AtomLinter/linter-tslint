linterPath = atom.packages.getLoadedPackage("linter").path
Linter = require "#{linterPath}/lib/linter"
path = require "path"
exec = (require "child_process").exec

class LinterTslint extends Linter
  # The syntax that the linter handles. May be a string or
  # list/tuple of strings. Names should be all lowercase.
  @syntax: ['source.ts'] # , 'text.html.twig', 'text.html.erb', 'text.html.ruby']

  # A string, list, tuple or callable that returns a string, list or tuple,
  # containing the command line (with arguments) used to lint.
  cmd: 'tslint -t json -f'

  executablePath: null

  filePath: null

  linterName: 'tslint'

  constructor: (editor) ->
    @cwd = path.dirname(editor.getUri())
    @executablePath = atom.config.get 'linter-tslint.tslintExecutablePath'

  getCmd:(filePath) ->
    cmd = super(filePath)

  processMessage: (message, callback) ->
    messagesUnprocessed = if typeof message == "object" then [message] else JSON.parse(message || "[]")
    messages = messagesUnprocessed.map (message) =>
        message: message.failure,
        line: message.startPosition.line + 1,
        col: message.startPosition.character,
        linter: @linterName,
        level: 'error'
    callback messages

module.exports = LinterTslint
