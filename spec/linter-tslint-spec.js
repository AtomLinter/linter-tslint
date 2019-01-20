'use babel';

import * as path from 'path';
import {
  // eslint-disable-next-line no-unused-vars
  it, fit, wait, beforeEach, afterEach,
} from 'jasmine-fix';
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
        const excerpt = 'Missing semicolon (semicolon)';
        const editor = await atom.workspace.open(invalidPath);
        const result = await lint(editor);
        expect(result.length).toBe(1);
        expect(result[0].severity).toBe('warning');
        expect(result[0].excerpt).toBe(excerpt);
        expect(result[0].url).toBeDefined();
        expect(result[0].description).not.toBeDefined();
        expect(result[0].location.file).toBe(invalidPath);
        expect(result[0].location.position).toEqual([[0, 14], [0, 14]]);
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
        const excerpt = 'This expression is unnecessarily compared to a boolean. '
          + 'Just use it directly. (no-boolean-literal-compare)';
        const editor = await atom.workspace.open(invalidTypecheckedPath);
        const result = await lint(editor);
        expect(result.length).toBe(1);
        expect(result[0].severity).toBe('error');
        expect(result[0].excerpt).toBe(excerpt);
        expect(result[0].url).toBeDefined();
        expect(result[0].description).not.toBeDefined();
        expect(result[0].location.file).toBe(invalidTypecheckedPath);
        expect(result[0].location.position).toEqual([[1, 0], [1, 1]]);
      });
    });
  });
});
