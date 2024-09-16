import { ESLintUtils } from '@typescript-eslint/utils'

export * from './createRule'
export * from './isResultType'
export * from './literals'
export * from './isRestParameterDesclaration'

// this is done for convenience - saves migrating all of the old rules
export * from '@typescript-eslint/type-utils'
export * from '@typescript-eslint/utils/ast-utils'

const {
  applyDefault,
  deepMerge,
  isObjectNotArray,
  getParserServices,
  nullThrows,
  NullThrowsReasons,
} = ESLintUtils

export {
  applyDefault,
  deepMerge,
  isObjectNotArray,
  getParserServices,
  nullThrows,
  NullThrowsReasons,
}
