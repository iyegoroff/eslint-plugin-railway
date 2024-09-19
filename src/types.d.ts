declare module '@eslint-community/eslint-utils' {
  import type { TSESTree, TSESLint } from '@typescript-eslint/utils'
  export const getStaticValue: (
    node: TSESTree.Node,
    initialScope?: TSESLint.Scope.Scope,
  ) => { value: unknown } | null
}
