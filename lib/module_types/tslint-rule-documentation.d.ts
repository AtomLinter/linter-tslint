declare module "tslint-rule-documentation" {
  export interface IRuleResult {
    found: boolean; // true if the rule is a TSLint core rule, or a known plugin rule, false otherwise
    uri: string; // If found is true, uri of the documentation of the rule. If found is false, uri of the contribution guidelines
  }
  /** Find the url for the documentation of a TSLint rule
  * @param {string} ruleID  The ID of a TSLint rule such as `no-var-keyword` or `__example/foo`
  */
  export function getRuleUri(ruleID: string): IRuleResult
}
