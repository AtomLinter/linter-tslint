'use babel';

import * as path from 'path';
// NOTE: If using 'fit' you must add it to the list below!
import { beforeEach, it } from 'jasmine-fix'; // eslint-disable-line import/no-extraneous-dependencies
import linterTslint from '../lib/main';

const invalidPath = path.join(__dirname, 'fixtures', 'invalid', 'invalid.ts');
const noConfigPath = path.join(__dirname, 'fixtures', 'no-config', 'noConfig.ts');
const validPath = path.join(__dirname, 'fixtures', 'valid', 'valid.ts');

describe('The TSLint provider for Linter', () => {
  const lint = linterTslint.provideLinter().lint;

  beforeEach(async () => {
    await atom.packages.activatePackage('linter-tslint');
  });

  describe('When the package is activated', () => {
    it('finds nothing wrong with a valid file', async () => {
      const editor = await atom.workspace.open(validPath);
      const messages = await lint(editor);
      expect(messages.length).toBe(0);
    });

    it('handles messages from TSLint', async () => {
      const expectedMsg = 'semicolon - Missing semicolon';
      const editor = await atom.workspace.open(invalidPath);
      const messages = await lint(editor);
      expect(messages.length).toBe(1);
      expect(messages[0].type).toBe('warning');
      expect(messages[0].html).not.toBeDefined();
      expect(messages[0].text).toBe(expectedMsg);
      expect(messages[0].filePath).toBe(invalidPath);
      expect(messages[0].range).toEqual([[0, 14], [0, 14]]);
    });

    it('handles undefined filepath', async () => {
      const editor = await atom.workspace.open();
      const result = await lint(editor);
      expect(result).toBeNull();
    });

    it('finishes validatation even when there is no tslint.json', async () => {
      const editor = await atom.workspace.open(noConfigPath);
      await lint(editor);
    });
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
    const expectedMsg = 'no-boolean-literal-compare - This expression is unnecessarily compared to a boolean. Just use it directly.';
    waitsForPromise(() =>
      atom.workspace.open(invalidTypecheckedPath).then(editor => lint(editor)).then((messages) => {
        expect(messages.length).toBe(1);
        expect(messages[0].type).toBe('error');
        expect(messages[0].html).not.toBeDefined();
        expect(messages[0].text).toBe(expectedMsg);
        expect(messages[0].filePath).toBe(invalidTypecheckedPath);
        expect(messages[0].range).toEqual([[1, 0], [1, 1]]);
      }),
    );
  });
});
