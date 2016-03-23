linter-tslint
==============
[![Build Status](https://travis-ci.org/AtomLinter/linter-tslint.svg?branch=master)](https://travis-ci.org/AtomLinter/linter-tslint)

This linter plugin for AtomLinter provides an interface to [tslint](https://github.com/palantir/tslint). It will be used with files that have the "TypeScript" or "TypeScriptReact" syntax.

## Installation
On first activation the plugin will install all dependencies automatically, you no longer have to worry about installing Linter.

### Plugin installation
```
$ apm install linter-tslint
```

## Settings
You can configure linter-tslint by editing `~/.atom/config.cson` (choose Config... in Atom menu):
```coffee
'linter-tslint':
  # Custom rules directory (absolute path)
  rulesDirectory: "/path/to/rules"
  # Try using the local tslint package (if exist)
  useLocalTslint: true
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
