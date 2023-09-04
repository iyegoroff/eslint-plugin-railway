import type { TSESLint, TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import * as tsutils from 'ts-api-utils'
import * as ts from 'typescript'

import * as util from '../util'

type Options = [
  {
    checksConditionals?: boolean
    checksVoidReturn?: ChecksVoidReturnOptions | boolean
    checksSpreads?: boolean
  },
]

type ChecksVoidReturnOptions = {
  arguments?: boolean
  attributes?: boolean
  properties?: boolean
  returns?: boolean
  variables?: boolean
}

type MessageId =
  | 'conditional'
  | 'spread'
  | 'voidReturnArgument'
  | 'voidReturnAttribute'
  | 'voidReturnProperty'
  | 'voidReturnReturnValue'
  | 'voidReturnVariable'

function parseChecksVoidReturn(
  checksVoidReturn: ChecksVoidReturnOptions | boolean | undefined,
): ChecksVoidReturnOptions | false {
  switch (checksVoidReturn) {
    case false:
      return false

    case true:
    case undefined:
      return {
        arguments: true,
        attributes: true,
        properties: true,
        returns: true,
        variables: true,
      }

    default:
      return {
        arguments: checksVoidReturn.arguments ?? true,
        attributes: checksVoidReturn.attributes ?? true,
        properties: checksVoidReturn.properties ?? true,
        returns: checksVoidReturn.returns ?? true,
        variables: checksVoidReturn.variables ?? true,
      }
  }
}

export const name = 'no-misused-railways' as const

export const rule = util.createRule<Options, MessageId>({
  name,
  meta: {
    docs: {
      description: 'Disallow results in places not designed to handle them',
      recommended: 'recommended',
      requiresTypeChecking: true,
    },
    messages: {
      voidReturnArgument:
        'Result returned in function argument where a void return was expected.',
      voidReturnVariable:
        'Result-returning function provided to variable where a void return was expected.',
      voidReturnProperty:
        'Result-returning function provided to property where a void return was expected.',
      voidReturnReturnValue:
        'Result-returning function provided to return value where a void return was expected.',
      voidReturnAttribute:
        'Result-returning function provided to attribute where a void return was expected.',
      conditional: 'Expected non-Result value in a boolean conditional.',
      spread: 'Expected a non-Result value to be spreaded in an object.',
    },
    schema: [
      {
        type: 'object',
        additionalProperties: false,
        properties: {
          checksConditionals: {
            type: 'boolean',
          },
          checksVoidReturn: {
            oneOf: [
              { type: 'boolean' },
              {
                additionalProperties: false,
                properties: {
                  arguments: { type: 'boolean' },
                  attributes: { type: 'boolean' },
                  properties: { type: 'boolean' },
                  returns: { type: 'boolean' },
                  variables: { type: 'boolean' },
                },
                type: 'object',
              },
            ],
          },
          checksSpreads: {
            type: 'boolean',
          },
        },
      },
    ],
    type: 'problem',
  },
  defaultOptions: [
    {
      checksConditionals: true,
      checksVoidReturn: true,
      checksSpreads: true,
    },
  ],

  create(context, [{ checksConditionals, checksVoidReturn, checksSpreads }]) {
    const services = util.getParserServices(context)
    const checker = services.program.getTypeChecker()

    const checkedNodes = new Set<TSESTree.Node>()

    const conditionalChecks: TSESLint.RuleListener = {
      ConditionalExpression: checkTestConditional,
      DoWhileStatement: checkTestConditional,
      ForStatement: checkTestConditional,
      IfStatement: checkTestConditional,
      LogicalExpression: checkConditional,
      'UnaryExpression[operator="!"]'(node: TSESTree.UnaryExpression) {
        checkConditional(node.argument, true)
      },
      WhileStatement: checkTestConditional,
    }

    checksVoidReturn = parseChecksVoidReturn(checksVoidReturn)

    const voidReturnChecks: TSESLint.RuleListener = checksVoidReturn
      ? {
          ...(checksVoidReturn.arguments && {
            CallExpression: checkArguments,
            NewExpression: checkArguments,
          }),
          ...(checksVoidReturn.attributes && {
            JSXAttribute: checkJSXAttribute,
          }),
          ...(checksVoidReturn.properties && {
            Property: checkProperty,
          }),
          ...(checksVoidReturn.returns && {
            ReturnStatement: checkReturnStatement,
          }),
          ...(checksVoidReturn.variables && {
            AssignmentExpression: checkAssignment,
            VariableDeclarator: checkVariableDeclaration,
          }),
        }
      : {}

    const spreadChecks: TSESLint.RuleListener = {
      SpreadElement: checkSpread,
    }

    function checkTestConditional(node: { test: TSESTree.Expression | null }): void {
      if (node.test) {
        checkConditional(node.test, true)
      }
    }

    /**
     * This function analyzes the type of a node and checks if it is a Result in a boolean conditional.
     * It uses recursion when checking nested logical operators.
     * @param node The AST node to check.
     * @param isTestExpr Whether the node is a descendant of a test expression.
     */
    function checkConditional(node: TSESTree.Expression, isTestExpr = false): void {
      // prevent checking the same node multiple times
      if (checkedNodes.has(node)) {
        return
      }
      checkedNodes.add(node)

      if (node.type === AST_NODE_TYPES.LogicalExpression) {
        // ignore the left operand for nullish coalescing expressions not in a context of a test expression
        if (node.operator !== '??' || isTestExpr) {
          checkConditional(node.left, isTestExpr)
        }
        // we ignore the right operand when not in a context of a test expression
        if (isTestExpr) {
          checkConditional(node.right, isTestExpr)
        }
        return
      }
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      if (isAlwaysResult(checker, tsNode)) {
        context.report({
          messageId: 'conditional',
          node,
        })
      }
    }

    function checkArguments(
      node: TSESTree.CallExpression | TSESTree.NewExpression,
    ): void {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      const voidArgs = voidFunctionArguments(checker, tsNode)
      if (voidArgs.size === 0) {
        return
      }

      for (const [index, argument] of node.arguments.entries()) {
        if (!voidArgs.has(index)) {
          continue
        }

        const tsNode = services.esTreeNodeToTSNodeMap.get(argument)
        if (returnsResult(checker, tsNode as ts.Expression)) {
          context.report({
            messageId: 'voidReturnArgument',
            node: argument,
          })
        }
      }
    }

    function checkAssignment(node: TSESTree.AssignmentExpression): void {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      const varType = services.getTypeAtLocation(node.left)
      if (!isVoidReturningFunctionType(checker, tsNode.left, varType)) {
        return
      }

      if (returnsResult(checker, tsNode.right)) {
        context.report({
          messageId: 'voidReturnVariable',
          node: node.right,
        })
      }
    }

    function checkVariableDeclaration(node: TSESTree.VariableDeclarator): void {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      if (tsNode.initializer === undefined || node.init == null) {
        return
      }
      const varType = services.getTypeAtLocation(node.id)
      if (!isVoidReturningFunctionType(checker, tsNode.initializer, varType)) {
        return
      }

      if (returnsResult(checker, tsNode.initializer)) {
        context.report({
          messageId: 'voidReturnVariable',
          node: node.init,
        })
      }
    }

    function checkProperty(node: TSESTree.Property): void {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      if (ts.isPropertyAssignment(tsNode)) {
        const contextualType = checker.getContextualType(tsNode.initializer)
        if (
          contextualType !== undefined &&
          isVoidReturningFunctionType(checker, tsNode.initializer, contextualType) &&
          returnsResult(checker, tsNode.initializer)
        ) {
          context.report({
            messageId: 'voidReturnProperty',
            node: node.value,
          })
        }
      } else if (ts.isShorthandPropertyAssignment(tsNode)) {
        const contextualType = checker.getContextualType(tsNode.name)
        if (
          contextualType !== undefined &&
          isVoidReturningFunctionType(checker, tsNode.name, contextualType) &&
          returnsResult(checker, tsNode.name)
        ) {
          context.report({
            messageId: 'voidReturnProperty',
            node: node.value,
          })
        }
      } else if (ts.isMethodDeclaration(tsNode)) {
        if (ts.isComputedPropertyName(tsNode.name)) {
          return
        }
        const obj = tsNode.parent

        // Below condition isn't satisfied unless something goes wrong,
        // but is needed for type checking.
        // 'node' does not include class method declaration so 'obj' is
        // always an object literal expression, but after converting 'node'
        // to TypeScript AST, its type includes MethodDeclaration which
        // does include the case of class method declaration.
        if (!ts.isObjectLiteralExpression(obj)) {
          return
        }

        if (!returnsResult(checker, tsNode)) {
          return
        }
        const objType = checker.getContextualType(obj)
        if (objType === undefined) {
          return
        }
        const propertySymbol = checker.getPropertyOfType(objType, tsNode.name.text)
        if (propertySymbol === undefined) {
          return
        }

        const contextualType = checker.getTypeOfSymbolAtLocation(
          propertySymbol,
          tsNode.name,
        )

        if (isVoidReturningFunctionType(checker, tsNode.name, contextualType)) {
          context.report({
            messageId: 'voidReturnProperty',
            node: node.value,
          })
        }
        return
      }
    }

    function checkReturnStatement(node: TSESTree.ReturnStatement): void {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)
      if (tsNode.expression === undefined || node.argument == null) {
        return
      }
      const contextualType = checker.getContextualType(tsNode.expression)
      if (
        contextualType !== undefined &&
        isVoidReturningFunctionType(checker, tsNode.expression, contextualType) &&
        returnsResult(checker, tsNode.expression)
      ) {
        context.report({
          messageId: 'voidReturnReturnValue',
          node: node.argument,
        })
      }
    }

    function checkJSXAttribute(node: TSESTree.JSXAttribute): void {
      if (
        node.value == null ||
        node.value.type !== AST_NODE_TYPES.JSXExpressionContainer
      ) {
        return
      }
      const expressionContainer = services.esTreeNodeToTSNodeMap.get(node.value)
      const expression = services.esTreeNodeToTSNodeMap.get(node.value.expression)
      const contextualType = checker.getContextualType(expressionContainer)
      if (
        contextualType !== undefined &&
        isVoidReturningFunctionType(checker, expressionContainer, contextualType) &&
        returnsResult(checker, expression)
      ) {
        context.report({
          messageId: 'voidReturnAttribute',
          node: node.value,
        })
      }
    }

    function checkSpread(node: TSESTree.SpreadElement): void {
      const tsNode = services.esTreeNodeToTSNodeMap.get(node)

      if (isSometimesResult(checker, tsNode.expression)) {
        context.report({
          messageId: 'spread',
          node: node.argument,
        })
      }
    }

    return {
      ...(checksConditionals ? conditionalChecks : {}),
      ...(checksVoidReturn ? voidReturnChecks : {}),
      ...(checksSpreads ? spreadChecks : {}),
    }
  },
})

function isSometimesResult(checker: ts.TypeChecker, node: ts.Node): boolean {
  const type = checker.getTypeAtLocation(node)

  for (const subType of tsutils.unionTypeParts(checker.getApparentType(type))) {
    if (util.isResultType(checker, node, subType)) {
      return true
    }
  }

  return false
}

// Variation on the result check which requires all forms of the type (read:
// alternates in a union) to be result. Otherwise, you might be trying to
// check if something is defined or undefined and get caught because one of the
// branches is result.
function isAlwaysResult(checker: ts.TypeChecker, node: ts.Node): boolean {
  const type = checker.getTypeAtLocation(node)

  for (const subType of tsutils.unionTypeParts(checker.getApparentType(type))) {
    const tagProp = subType.getProperty('tag')

    // If one of the alternates has no tag property, it is not result in all
    // cases.
    if (tagProp === undefined) {
      return false
    }

    // We walk through each variation of the tag property. Since we know it
    // exists at this point, we just need at least one of the alternates to
    // be of the right form to consider it result.
    const tagType = checker.getTypeOfSymbolAtLocation(tagProp, node)
    let hasResultSignature = false

    for (const subTagType of tsutils.unionTypeParts(tagType)) {
      if (
        subTagType.isStringLiteral() &&
        subTagType.value === util.successLiteral &&
        subType.getProperty(util.successLiteral) !== undefined
      ) {
        hasResultSignature = true
        break
      }

      if (
        subTagType.isStringLiteral() &&
        subTagType.value === util.failureLiteral &&
        subType.getProperty(util.failureLiteral) !== undefined
      ) {
        hasResultSignature = true
        break
      }
    }

    // If no flavors of the then property are result, we don't consider the
    // overall type to be result
    if (!hasResultSignature) {
      return false
    }
  }

  // If all variants are considered result (i.e. haven't returned false), we
  // consider the overall type result
  return true
}

function checkResultOrVoidArgument(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression,
  type: ts.Type,
  index: number,
  resultReturnIndices: Set<number>,
  voidReturnIndices: Set<number>,
): void {
  if (isResultReturningFunctionType(checker, node.expression, type)) {
    resultReturnIndices.add(index)
  } else if (isVoidReturningFunctionType(checker, node.expression, type)) {
    // If a certain argument accepts both result and void returns,
    // a Result-returning function is valid
    if (!resultReturnIndices.has(index)) {
      voidReturnIndices.add(index)
    }
  }
}

// Get the positions of arguments which are void functions (and not also
// result functions). These are the candidates for the void-return check at
// the current call site.
// If the function parameters end with a 'rest' parameter, then we consider
// the array type parameter (e.g. '...args:Array<SomeType>') when determining
// if trailing arguments are candidates.
function voidFunctionArguments(
  checker: ts.TypeChecker,
  node: ts.CallExpression | ts.NewExpression,
): Set<number> {
  // 'new' can be used without any arguments, as in 'let b = new Object;'
  // In this case, there are no argument positions to check, so return early.
  if (!node.arguments) {
    return new Set<number>()
  }
  const resultReturnIndices = new Set<number>()
  const voidReturnIndices = new Set<number>()
  const type = checker.getTypeAtLocation(node.expression)

  // We can't use checker.getResolvedSignature because it prefers an early '() => void' over a later '() => Result<void>'
  // See https://github.com/microsoft/TypeScript/issues/48077

  for (const subType of tsutils.unionTypeParts(type)) {
    // Standard function calls and `new` have two different types of signatures
    const signatures = ts.isCallExpression(node)
      ? subType.getCallSignatures()
      : subType.getConstructSignatures()
    for (const signature of signatures) {
      for (const [index, parameter] of signature.parameters.entries()) {
        const decl = parameter.valueDeclaration
        let type = checker.getTypeOfSymbolAtLocation(parameter, node.expression)

        // If this is a array 'rest' parameter, check all of the argument indices
        // from the current argument to the end.
        // Note - we currently do not support 'spread' arguments - adding support for them
        // is tracked in https://github.com/typescript-eslint/typescript-eslint/issues/5744
        if (decl && ts.isParameter(decl) && decl.dotDotDotToken) {
          if (checker.isArrayType(type)) {
            // Unwrap 'Array<MaybeVoidFunction>' to 'MaybeVoidFunction',
            // so that we'll handle it in the same way as a non-rest
            // 'param: MaybeVoidFunction'
            type = util.getTypeArguments(type as ts.TypeReference, checker)[0]
            for (let i = index; i < node.arguments.length; i++) {
              checkResultOrVoidArgument(
                checker,
                node,
                type,
                i,
                resultReturnIndices,
                voidReturnIndices,
              )
            }
          } else if (checker.isTupleType(type)) {
            // Check each type in the tuple - for example, [boolean, () => void] would
            // add the index of the second tuple parameter to 'voidReturnIndices'
            const typeArgs = util.getTypeArguments(type as ts.TypeReference, checker)
            for (
              let i = index;
              i < node.arguments.length && i - index < typeArgs.length;
              i++
            ) {
              checkResultOrVoidArgument(
                checker,
                node,
                typeArgs[i - index],
                i,
                resultReturnIndices,
                voidReturnIndices,
              )
            }
          }
        } else {
          checkResultOrVoidArgument(
            checker,
            node,
            type,
            index,
            resultReturnIndices,
            voidReturnIndices,
          )
        }
      }
    }
  }

  for (const index of resultReturnIndices) {
    voidReturnIndices.delete(index)
  }

  return voidReturnIndices
}

/**
 * @returns Whether any call signature of the type has a result return type.
 */
function anySignatureIsResultType(
  checker: ts.TypeChecker,
  node: ts.Node,
  type: ts.Type,
): boolean {
  for (const signature of type.getCallSignatures()) {
    const returnType = signature.getReturnType()
    if (util.isResultType(checker, node, returnType)) {
      return true
    }
  }

  return false
}

/**
 * @returns Whether type is a result-returning function.
 */
function isResultReturningFunctionType(
  checker: ts.TypeChecker,
  node: ts.Node,
  type: ts.Type,
): boolean {
  for (const subType of tsutils.unionTypeParts(type)) {
    if (anySignatureIsResultType(checker, node, subType)) {
      return true
    }
  }

  return false
}

/**
 * @returns Whether type is a void-returning function.
 */
function isVoidReturningFunctionType(
  checker: ts.TypeChecker,
  node: ts.Node,
  type: ts.Type,
): boolean {
  let hadVoidReturn = false

  for (const subType of tsutils.unionTypeParts(type)) {
    for (const signature of subType.getCallSignatures()) {
      const returnType = signature.getReturnType()

      // If a certain positional argument accepts both result and void returns,
      // a Result-returning function is valid
      if (util.isResultType(checker, node, returnType)) {
        return false
      }

      hadVoidReturn ||= tsutils.isTypeFlagSet(returnType, ts.TypeFlags.Void)
    }
  }

  return hadVoidReturn
}

/**
 * @returns Whether expression is a function that returns a result.
 */
function returnsResult(checker: ts.TypeChecker, node: ts.Node): boolean {
  const type = checker.getApparentType(checker.getTypeAtLocation(node))

  if (anySignatureIsResultType(checker, node, type)) {
    return true
  }

  return false
}
