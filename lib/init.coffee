path = require 'path'

tslintPath = path.join __dirname, '..', 'node_modules', 'tslint', '.bin'

module.exports =
  configDefaults:
    tslintExecutablePath: tslintPath
