linter-tslint
=========================

This linter plugin for AtomLinter provides an interface to [tslint](https://github.com/palantir/tslint). It will be used with files that have the "TypeScript" syntax.

## Installation
Linter package must be installed in order to use this plugin. If Linter is not installed, please follow the instructions [here](https://github.com/AtomLinter/Linter).

### tslint installation (optional if you wish to use an older version of tslint than the plugin)
Before using this plugin, you must ensure that `tslint` is installed on your system. To install `tslint`, do the following:

1. Install [Node.js](http://nodejs.org) (and [npm](https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager) on Linux).

1. Install `tslint` by typing the following in a terminal:
   ```
   npm install -g tslint
   ```

1. If you are using `nvm` and `zsh`, ensure that the line to load `nvm` is in `.zshenv` and not `.zshrc`.
1. Set the linter-tslint linter path setting to the location of the installed tslint

**Note:** This plugin requires `tslint` 0.4.8 or later.

Now you can proceed to install the linter-tslint plugin.

### Plugin installation
```
$ apm install linter-tslint
```

## Settings
You can configure linter-tslint by editing ~/.atom/config.cson (choose Open Your Config in Atom menu):
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

Please note that modifications should follow these coding guidelines:

- Indent is 2 spaces.
- Code should pass coffeelint linter.
- Vertical whitespace helps readability, don’t be afraid to use it.

Thank you for helping out!

## Donation
[![Share the love!](https://chewbacco-stuff.s3.amazonaws.com/donate.png)](https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=KXUYS4ARNHCN8)
