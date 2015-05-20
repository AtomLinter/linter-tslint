path = require 'path'

tslintPath = path.join __dirname, '..', 'node_modules', 'tslint', 'bin'

module.exports =
  config:
    tslintExecutablePath:
      type: 'string'
      default: tslintPath
  activate: ->
    console.log 'activate linter-tslint' if atom.inDevMode()
