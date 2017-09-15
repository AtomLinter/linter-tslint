'use babel';

import * as path from 'path';
// NOTE: If using 'fit' you must add it to the list below!
import { beforeEach, it } from 'jasmine-fix'; // eslint-disable-line import/no-extraneous-dependencies
import linterTslint from '../lib/main';

// Fixture paths
const invalidPath = path.join(__dirname, 'fixtures', 'invalid', 'invalid.ts');
const noConfigPath = path.join(__dirname, 'fixtures', 'no-config', 'noConfig.ts');
const validPath = path.join(__dirname, 'fixtures', 'valid', 'valid.ts');
const validTypecheckedPath = path.join(__dirname, 'fixtures', 'valid-typechecked', 'valid-typechecked.ts');
const invalidTypecheckedPath = path.join(__dirname, 'fixtures', 'invalid-typechecked', 'invalid-typechecked.ts');

describe('The TSLint provider for Linter', () => {
  const { lint } = linterTslint.provideLinter();

  beforeEach(async () => {
    await atom.packages.activatePackage('linter-tslint');
  });

  describe('When the package is activated', () => {
    describe('When dealing with typechecking off (no semantic rules)', () => {
      it('finds nothing wrong with a valid file', async () => {
        const editor = await atom.workspace.open(validPath);
        const result = await lint(editor);
        expect(result.length).toBe(0);
      });

      it('handles messages from TSLint', async () => {
        const expectedMsgRegEx = /Missing semicolon \(<a href=".*">semicolon<\/a>\)/;
        const editor = await atom.workspace.open(invalidPath);
        const result = await lint(editor);
        expect(result.length).toBe(1);
        expect(result[0].type).toBe('warning');
        expect(expectedMsgRegEx.test(result[0].html)).toBeTruthy();
        expect(result[0].text).not.toBeDefined();
        expect(result[0].filePath).toBe(invalidPath);
        expect(result[0].range).toEqual([[0, 14], [0, 14]]);
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

    describe('When dealing with typechecking on (with semantic rules)', () => {
      beforeEach(() => {
        atom.config.set('linter-tslint.enableSemanticRules', true);
      });

      afterEach(() => {
        atom.config.set('linter-tslint.enableSemanticRules', false);
      });

      it('finds nothing wrong with a valid file', async () => {
        const editor = await atom.workspace.open(validTypecheckedPath);
        const result = await lint(editor);
        expect(result.length).toBe(0);
      });

      it('handles messages from TSLint', async () => {
        const expectedMsgRegEx = /This expression is unnecessarily compared to a boolean. Just use it directly. \(<a href=".*">no-boolean-literal-compare<\/a>\)/;
        const editor = await atom.workspace.open(invalidTypecheckedPath);
        const result = await lint(editor);
        expect(result.length).toBe(1);
        expect(result[0].type).toBe('error');
        expect(expectedMsgRegEx.test(result[0].html)).toBeTruthy();
        expect(result[0].text).not.toBeDefined();
        expect(result[0].filePath).toBe(invalidTypecheckedPath);
        expect(result[0].range).toEqual([[1, 0], [1, 1]]);
      });
    });
  });
});
