import { ESLintUtils } from '@typescript-eslint/utils'

export * from './createRule'
export * from './isResultType'
export * from './literals'
export * from './getOperatorPrecedence'

// this is done for convenience - saves migrating all of the old rules
export * from '@typescript-eslint/type-utils'
const { applyDefault, deepMerge, isObjectNotArray, getParserServices } = ESLintUtils

export { applyDefault, deepMerge, isObjectNotArray, getParserServices }
