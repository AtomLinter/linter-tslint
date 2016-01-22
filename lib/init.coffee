{CompositeDisposable} = require 'atom'
path = require 'path'
merge = require 'merge'
rulesDirectory = ''
rules = {}

module.exports =

  config:
    rulesDirectory:
      type: 'string'
      title: 'Custom rules directory'
      default: ''
    rules:
      type: 'object'
      title: 'Rules in configuration'
      default: {}

  activate: ->
    @subscriptions = new CompositeDisposable
    @scopes = ['source.ts', 'source.tsx']
    @subscriptions.add atom.config.observe 'linter-tslint.rulesDirectory',
      (dir) =>
        rulesDirectory = dir
    @subscriptions.add atom.config.observe 'linter-tslint.rules',
      (obj) =>
        rules = obj

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
        configuration = Linter.findConfiguration(null, filePath)
        if (rules)
          configuration.rules = merge(configuration.rules, rules)

        directory = undefined
        if (rulesDirectory && textEditor.project && textEditor.project.getPaths().length)
          directory = textEditor.project.getPaths()[0] + path.sep + rulesDirectory

        linter = new Linter(filePath, text, {
          formatter: 'json',
          configuration: configuration
          rulesDirectory: directory
        });

        lintResult = linter.lint()

        if (lintResult.failureCount > 0)
          return lintResult.failures.map (failure) ->
            startPosition = failure.getStartPosition().getLineAndCharacter()
            endPosition = failure.getEndPosition().getLineAndCharacter()
            {
              type: 'Warning'
              text: "#{failure.getRuleName()} - #{failure.getFailure()}"
              filePath: path.normalize failure.getFileName()
              range: [
                [ startPosition.line, startPosition.character],
                [ endPosition.line, endPosition.character]]
            }
        else
          return []
