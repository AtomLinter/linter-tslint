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
        expect(messages[0].type).toBe('Warning');
        expect(messages[0].html).not.toBeDefined();
        expect(messages[0].text).toBe(expectedMsg);
        expect(messages[0].filePath).toBe(invalidPath);
        expect(messages[0].range).toEqual([[0, 14], [0, 14]]);
      }),
    );
  });
});
