{CompositeDisposablem, Notification} = require 'atom'
path = require 'path'
fs = require 'fs'
requireResolve = require 'resolve'

TSLINT_MODULE_NAME = 'tslint'

trim = (str) -> str.replace /^\s|\s$/g, ''
isUrl = (path) -> /https?:\/\/.+/i.test path

module.exports =

  config:
    tslintJsonPath:
      type: 'string'
      title: 'Local path (absolute) or ' +
        'http url (http:// or https:// schemas) to tslint.json'
      default: ''
    rulesDirectory:
      type: 'string'
      title: 'Custom rulesDirectory (absolute path)'
      default: ''
    useLocalTslint:
      type: 'boolean'
      title: 'Try using the local tslint package (if exist)'
      default: true

  rulesDirectory: ''
  tslintCache: new Map
  tslintDef: null
  tslintJSON: null
  tslintJSONPath: ''
  useLocalTslint: true

  activate: ->
    # for auto install linter package
    require('atom-package-deps').install('linter-tslint')

    @subscriptions = new CompositeDisposable
    @subscriptions.add atom.config.observe 'linter-tslint.rulesDirectory',
      (dir) =>
        @rulesDirectory = trim dir

    @subscriptions.add atom.config.observe 'linter-tslint.useLocalTslint',
      (use) =>
        @tslintCache.clear()
        @useLocalTslint = use

    @subscriptions.add atom.config.observe 'linter-tslint.tslintJsonPath',
      (jsonPath) =>
        @tslintJSONPath = trim jsonPath
        @tslintJSON = null

  clearTslintJSONandPath: ->
    @tslintJSON = null
    @tslintJSONPath = ''

  checkRulesDirectory: ->
    if not @rulesDirectory
      return Promise.resolve('')

    if not path.isAbsolute @rulesDirectory
      Notification.addWarning 'linter-tslint.rulesDirectory is not absolute path' +
      @rulesDirectory = '';
      return Promise.resolve('')

    new Promise (resolve, reject) =>
      fs.stat @rulesDirectory, (err, stats) =>
        if not stats?.isDirectory()
          Notification.addWarning 'linter-tslint.rulesDirectory is not exist'
          @rulesDirectory = ''
        resolve(@rulesDirectory)

  loadTslintJSON: ->
    if not @tslintJSONPath
      return Promise.resolve(null)
    if @tslintJSON
      return Promise.resolve(@tslintJSON)

    new Promise (resolve, reject) =>
      jsonPath = @tslintJSONPath
      # if http url load by http
      if isUrl jsonPath
        fetch jsonPath
          .then (response) -> response.json()
          .then (json) =>
            # can not process rulesDirectory for tslint.json from network
            json.rulesDirectory = null
            @tslintJSON = json
            resolve(json)
          .catch =>
            @clearTslintJSONandPath
            resolve(null)
      # if local absolute path load by fs.readFile
      else if path.isAbsolute(jsonPath)
        fs.readFile jsonPath, 'utf8', (err, data) =>
          try
            @tslintJSON = if err then null else JSON.parse data
          catch
            @tslintJSON = null
          finally
            @tslintJSONPath = if @tslintJSON then jsonPath else ''
          resolve(@tslintJSON)
      else
        resolve(null);

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
          if not err and pkg?.version.startsWith '3.'
            linter = require linterPath
          else
            linter = @tslintDef
          @tslintCache.set basedir, linter
          resolve(linter)

  provideLinter: ->
    @tslintDef = require TSLINT_MODULE_NAME

    provider =
      name: 'tslint'
      grammarScopes: ['source.ts', 'source.tsx']
      scope: 'file'
      lintOnFly: true
      lint: (textEditor) =>
        filePath = textEditor.getPath()
        text = textEditor.getText()

        @getLinter(filePath).then (Linter) =>
          @loadTslintJSON().then (tslintJSON) =>
            if tslintJSON
              configuration = tslintJSON
            else
              configurationPath = Linter.findConfigurationPath null, filePath
              configuration = Linter.loadConfigurationFromPath configurationPath

            rulesDirectory = configuration.rulesDirectory
            if rulesDirectory
              # only for local tslint.json
              configurationDir = path.dirname configurationPath
              if not Array.isArray rulesDirectory
                rulesDirectory = [rulesDirectory]
              rulesDirectory = rulesDirectory.map (dir) ->
                path.join configurationDir, dir

            @checkRulesDirectory().then (settingsRulesDirectory) =>
              if settingsRulesDirectory
                rulesDirectory = [] if not rulesDirectory
                rulesDirectory.push settingsRulesDirectory

              linter = new Linter filePath, text,
                formatter: 'json'
                configuration: configuration
                rulesDirectory: rulesDirectory

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
