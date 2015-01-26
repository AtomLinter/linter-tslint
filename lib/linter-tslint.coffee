linterPath = atom.packages.getLoadedPackage("linter").path
Linter = require "#{linterPath}/lib/linter"
path = require "path"
exec = (require "child_process").exec
{Range} = require "atom"

class LinterTslint extends Linter
  # The syntax that the linter handles. May be a string or
  # list/tuple of strings. Names should be all lowercase.
  @syntax: ['source.ts']

  # A string, list, tuple or callable that returns a string, list or tuple,
  # containing the command line (with arguments) used to lint.
  cmd: 'tslint -t json -f'

  executablePath: null

  filePath: null

  linterName: 'tslint'

  isNodeExecutable: yes

  constructor: (editor) ->
    @cwd = path.dirname(editor.getUri())

    @subscriptions.add atom.config.observe 'linter-tslint.tslintExecutablePath', (tslintPath) =>
      @executablePath = tslintPath

  getCmd:(filePath) ->
    cmd = super(filePath)

  processMessage: (message, callback) ->
    if Array.isArray(message)
      messagesUnprocessed = [];
    else if typeof message == "object"
      messagesUnprocessed = [message]
    else
      messagesUnprocessed = JSON.parse(message) || []

    messages = messagesUnprocessed.map (message) =>
      message: message.failure,
      line: message.startPosition.line + 1,
      range: new Range(
        [message.startPosition.line, message.startPosition.character == 0 ? 0 : message.startPosition.character - 1],
        [message.endPosition.line, message.endPosition.character]),
      linter: @linterName,
      level: 'error'

    callback messages

module.exports = LinterTslint
