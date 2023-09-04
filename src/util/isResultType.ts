import * as ts from 'typescript'
import * as tsutils from 'ts-api-utils'
import { failureLiteral, successLiteral } from './literals'

export function isResultType(
  typeChecker: ts.TypeChecker,
  node: ts.Node,
  type: ts.Type,
): boolean {
  for (const subType of tsutils.unionTypeParts(typeChecker.getApparentType(type))) {
    const tag = subType.getProperty('tag')
    if (tag === undefined) continue
    const tagType = typeChecker.getTypeOfSymbolAtLocation(tag, node)

    for (const subTagType of tsutils.unionTypeParts(tagType)) {
      if (
        subTagType.isStringLiteral() &&
        subTagType.value === successLiteral &&
        subType.getProperty(successLiteral) !== undefined
      ) {
        return true
      }

      if (
        subTagType.isStringLiteral() &&
        subTagType.value === failureLiteral &&
        subType.getProperty(failureLiteral) !== undefined
      ) {
        return true
      }
    }
  }
  return false
}
