{CompositeDisposable} = require 'atom'
path = require 'path'
requireResolve = require 'resolve'

TSLINT_MODULE_NAME = 'tslint'

module.exports =

  config:
    rulesDirectory:
      type: 'string'
      title: 'Custom rules directory'
      default: ''
    useLocalTslint:
      type: 'boolean'
      title: 'Try using the local tslint package (if exist)'
      default: false

  rulesDirectory: ''
  tslintCache: new Map
  tslintDef: null
  useLocalTslint: false

  activate: ->
    @subscriptions = new CompositeDisposable
    @scopes = ['source.ts', 'source.tsx']
    @subscriptions.add atom.config.observe 'linter-tslint.rulesDirectory',
      (dir) =>
        @rulesDirectory = dir
    @subscriptions.add atom.config.observe 'linter-tslint.useLocalTslint',
      (use) =>
        @tslintCache.clear()
        @useLocalTslint = use

  deactivate: ->
    @subscriptions.dispose()

  getLinter: (filePath) ->
    basedir = path.dirname filePath
    linter = @tslintCache.get basedir
    if linter
      return Promise.resolve(linter)

    if @useLocalTslint
      return @getLocalLinter(basedir)

    @tslintCache.set basedir, @tslintDef
    Promise.resolve(@tslintDef)

  getLocalLinter: (basedir) ->
    new Promise (resolve, reject) =>
      requireResolve TSLINT_MODULE_NAME, { basedir },
        (err, linterPath, pkg) =>
          if not err and pkd?.version.startsWith('3.')
            linter = require linterPath
          else
            linter = @tslintDef
          @tslintCache.set basedir, linter
          resolve(linter)

  provideLinter: ->
    @tslintDef = require TSLINT_MODULE_NAME

    provider =
      grammarScopes: @scopes
      scope: 'file'
      lintOnFly: true
      lint: (textEditor) =>
        filePath = textEditor.getPath()
        text = textEditor.getText()

        @getLinter(filePath).then (Linter) =>
          configuration = Linter.findConfiguration(null, filePath)

          directory = undefined
          if @rulesDirectory and textEditor.project?.getPaths().length
            directory = path.join textEditor.project.getPaths()[0],
              @rulesDirectory

          linter = new Linter filePath, text,
            formatter: 'json',
            configuration: configuration
            rulesDirectory: directory

          lintResult = linter.lint()

          if not lintResult.failureCount
            return []

          lintResult.failures.map (failure) ->
            startPosition = failure.getStartPosition().getLineAndCharacter()
            endPosition = failure.getEndPosition().getLineAndCharacter()
            {
              type: 'Warning'
              text: "#{failure.getRuleName()} - #{failure.getFailure()}"
              filePath: path.normalize failure.getFileName()
              range: [
                [ startPosition.line, startPosition.character],
                [ endPosition.line, endPosition.character]
              ]
            }
