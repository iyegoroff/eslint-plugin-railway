import { getConstrainedTypeAtLocation } from '@typescript-eslint/type-utils'
import type {
  ParserServicesWithTypeInformation,
  TSESTree,
} from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import type { RuleContext } from '@typescript-eslint/utils/ts-eslint'
import * as tsutils from 'ts-api-utils'
import { getStaticValue } from '@typescript-eslint/utils/ast-utils'

type NodeWithKey =
  | TSESTree.MemberExpression
  | TSESTree.MethodDefinition
  | TSESTree.Property
  | TSESTree.PropertyDefinition
  | TSESTree.TSAbstractMethodDefinition
  | TSESTree.TSAbstractPropertyDefinition

function getStaticMemberAccessValue(
  node: NodeWithKey,
  { sourceCode }: RuleContext<string, unknown[]>,
): string | undefined {
  const key = node.type === AST_NODE_TYPES.MemberExpression ? node.property : node.key
  if (!node.computed) {
    return key.type === AST_NODE_TYPES.Literal
      ? String(key.value)
      : (key as TSESTree.Identifier | TSESTree.PrivateIdentifier).name
  }
  const value = getStaticValue(key, sourceCode.getScope(node))?.value as
    | string
    | number
    | null
    | undefined
  return value == null ? undefined : String(value)
}

const ARRAY_PREDICATE_FUNCTIONS = new Set([
  'filter',
  'find',
  'findIndex',
  'findLast',
  'findLastIndex',
  'some',
  'every',
])

export function isArrayMethodCallWithPredicate(
  context: RuleContext<string, unknown[]>,
  services: ParserServicesWithTypeInformation,
  node: TSESTree.CallExpression,
): boolean {
  if (node.callee.type !== AST_NODE_TYPES.MemberExpression) {
    return false
  }

  const staticAccessValue = getStaticMemberAccessValue(node.callee, context)

  if (!staticAccessValue || !ARRAY_PREDICATE_FUNCTIONS.has(staticAccessValue)) {
    return false
  }

  const checker = services.program.getTypeChecker()
  const type = getConstrainedTypeAtLocation(services, node.callee.object)
  return tsutils
    .unionTypeParts(type)
    .flatMap((part) => tsutils.intersectionTypeParts(part))
    .some((t) => checker.isArrayType(t) || checker.isTupleType(t))
}
