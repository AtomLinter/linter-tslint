linter-jshint
=========================

This linter plugin for AtomLinter provides an interface to [tslint](https://github.com/palantir/tslint). It will be used with files that have the "TypeScript" syntax.

## Installation
Linter package must be installed in order to use this plugin. If Linter is not installed, please follow the instructions [here](https://github.com/AtomLinter/Linter).

### jshint installation
Before using this plugin, you must ensure that `tslint` is installed on your system. To install `tslint`, do the following:

1. Install [Node.js](http://nodejs.org) (and [npm](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) on Linux).

1. Install `tslint` by typing the following in a terminal:
   ```
   npm install -g tslint
   ```

1. If you are using `nvm` and `zsh`, ensure that the line to load `nvm` is in `.zshenv` and not `.zshrc`.

**Note:** This plugin requires `tslint` 0.4.8 or later.

Now you can proceed to install the linter-jshint plugin.

### Plugin installation
```
$ apm install linter-tslint
```

## Settings
You can configure linter-jshint by editing ~/.atom/config.cson (choose Open Your Config in Atom menu):
```
'linter-tslint':
  'tslintExecutablePath': null #tslint path. run 'which tslint' to find the path
```

## Contributing
If you would like to contribute enhancements or fixes, please do the following:

1. Fork the plugin repository.
1. Hack on a separate topic branch created from the latest `master`.
1. Commit and push the topic branch.
1. Make a pull request.
1. welcome to the club

Please note that modications should follow these coding guidelines:

- Indent is 2 spaces.
- Code should pass coffeelint linter.
- Vertical whitespace helps readability, don’t be afraid to use it.

Thank you for helping out!
