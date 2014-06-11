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

  constructor: (editor) ->
    @cwd = path.dirname(editor.getUri())
    @executablePath = atom.config.get 'linter-tslint.tslintExecutablePath'

  getCmd:(filePath) ->
    cmd = super(filePath)

  processMessage: (message, callback) ->
    if typeof message == "object"
      messagesUnprocessed = [message]
    else
      messagesUnprocessed = JSON.parse(message) || []

    messages = messagesUnprocessed.map (message) =>
      message: message.failure,
      line: message.startPosition.line + 1,
      range: new Range(
        [message.startPosition.line, message.startPosition.character],
        [message.endPosition.line, message.endPosition.character]),
      linter: @linterName,
      level: 'error'

    callback messages

module.exports = LinterTslint
