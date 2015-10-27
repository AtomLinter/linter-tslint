{CompositeDisposable} = require 'atom'
path = require 'path'

module.exports =

  activate: ->
    @subscriptions = new CompositeDisposable
    @scopes = ['source.ts', 'source.tsx']

  deactivate: ->
    @subscriptions.dispose()

  provideLinter: ->
    Linter = require 'tslint'
    provider =
      grammarScopes: @scopes
      scope: 'file'
      lintOnFly: true
      lint: (textEditor) ->
        filePath = textEditor.getPath()
        text = textEditor.getText()
        configuration = Linter.findConfiguration(undefined, filePath)
        linter = new Linter(filePath, text, {
          formatter: 'json',
          configuration: configuration
        });

        lintResult = linter.lint()

        if (lintResult.failureCount > 0)
          return lintResult.failures.map (failure) ->
            startPosition = failure.getStartPosition().getLineAndCharacter()
            endPosition = failure.getEndPosition().getLineAndCharacter()
            {
              type: 'Warning'
              text: "#{failure.getRuleName()} - #{failure.getFailure()}"
              filePath: failure.getFileName(),
              range: [
                [ startPosition.line, startPosition.character],
                [ endPosition.line, endPosition.character]]
            }
        else
          return []
