'use babel';

import * as path from 'path';

const validPath = path.join(__dirname, 'fixtures', 'valid', 'valid.ts');
const invalidPath = path.join(__dirname, 'fixtures', 'invalid', 'invalid.ts');

describe('The TSLint provider for Linter', () => {
  const lint = require('../lib/main.js').provideLinter().lint;

  beforeEach(() => {
    atom.workspace.destroyActivePaneItem();

    waitsForPromise(() =>
      Promise.all([
        atom.packages.activatePackage('linter-tslint'),
      ]),
    );
  });

  it('finds nothing wrong with a valid file', () => {
    waitsForPromise(() =>
      atom.workspace.open(validPath).then(editor => lint(editor)).then((messages) => {
        expect(messages.length).toBe(0);
      }),
    );
  });

  it('handles messages from TSLint', () => {
    const expectedMsg = 'semicolon - Missing semicolon';
    waitsForPromise(() =>
      atom.workspace.open(invalidPath).then(editor => lint(editor)).then((messages) => {
        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('warning');
        expect(messages[0].html).not.toBeDefined();
        expect(messages[0].text).toBe(expectedMsg);
        expect(messages[0].filePath).toBe(invalidPath);
        expect(messages[0].range).toEqual([[0, 14], [0, 14]]);
      }),
    );
  });

  it('handles undefined filepath', () => {
    waitsForPromise(() =>
      atom.workspace.open().then(editor => lint(editor)).then((result) => {
        expect(result).toBeNull();
      }),
    );
  });
});

const validTypecheckedPath = path.join(__dirname, 'fixtures', 'valid-typechecked', 'valid-typechecked.ts');
const invalidTypecheckedPath = path.join(__dirname, 'fixtures', 'invalid-typechecked', 'invalid-typechecked.ts');

describe('The TSLint provider for Linter (with semantic rules)', () => {
  const lint = require('../lib/main.js').provideLinter().lint;

  beforeEach(() => {
    atom.workspace.destroyActivePaneItem();

    waitsForPromise(() =>
      Promise.all([
        atom.packages.activatePackage('linter-tslint'),
      ]),
    );

    atom.config.set('linter-tslint.enableSemanticRules', true);
  });

  afterEach(() => {
    atom.config.set('linter-tslint.enableSemanticRules', false);
  });

  it('finds nothing wrong with a valid file', () => {
    waitsForPromise(() =>
      atom.workspace.open(validTypecheckedPath).then(editor => lint(editor)).then((messages) => {
        expect(messages.length).toBe(0);
      }),
    );
  });

  it('handles messages from TSLint', () => {
    const expectedMsg = 'no-unused-variable - \'foo\' is declared but never used.';
    waitsForPromise(() =>
      atom.workspace.open(invalidTypecheckedPath).then(editor => lint(editor)).then((messages) => {
        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('error');
        expect(messages[0].html).not.toBeDefined();
        expect(messages[0].text).toBe(expectedMsg);
        expect(messages[0].filePath).toBe(invalidTypecheckedPath);
        expect(messages[0].range).toEqual([[1, 8], [1, 11]]);
      }),
    );
  });
});
