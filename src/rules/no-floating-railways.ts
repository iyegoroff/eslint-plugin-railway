import type { TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import * as tsutils from 'ts-api-utils'
import * as ts from 'typescript'

import * as util from '../util'

type Options = []

type MessageId = 'floating' | 'floatingResultArray'

const messageBase = 'Results must be handled.'

const messageResultArray =
  'An array of results may be unintentional. Consider handling results with Result.combine.'

export const name = 'no-floating-railways'

export const rule = util.createRule<Options, MessageId>({
  name,
  meta: {
    docs: {
      description: 'Require Result-like statements to be handled appropriately',
      recommended: 'recommended',
      requiresTypeChecking: true,
    },
    hasSuggestions: true,
    messages: {
      floating: messageBase,
      floatingResultArray: messageResultArray,
    },
    schema: [
      {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    ],
    type: 'problem',
  },
  defaultOptions: [],

  create(context) {
    const services = util.getParserServices(context)
    const checker = services.program.getTypeChecker()

    return {
      ExpressionStatement(node): void {
        let expression = node.expression

        if (expression.type === AST_NODE_TYPES.ChainExpression) {
          expression = expression.expression
        }

        const { isUnhandled, resultArray } = isUnhandledResult(checker, expression)

        if (isUnhandled) {
          if (resultArray) {
            context.report({
              node,
              messageId: 'floatingResultArray',
            })
          } else {
            context.report({
              node,
              messageId: 'floating',
            })
          }
        }
      },
    }

    function isUnhandledResult(
      checker: ts.TypeChecker,
      node: TSESTree.Node,
    ): {
      isUnhandled: boolean
      nonFunctionHandler?: boolean
      resultArray?: boolean
    } {
      if (node.type === AST_NODE_TYPES.AssignmentExpression) {
        return { isUnhandled: false }
      }

      // First, check expressions whose resulting types may not be Result-like
      if (node.type === AST_NODE_TYPES.SequenceExpression) {
        // Any child in a comma expression could return a potentially unhandled
        // Result, so we check them all regardless of whether the final returned
        // value is Result-like.
        return (
          node.expressions
            .map((item) => isUnhandledResult(checker, item))
            .find((result) => result.isUnhandled) ?? { isUnhandled: false }
        )
      }

      if (node.type === AST_NODE_TYPES.UnaryExpression && node.operator === 'void') {
        // Similarly, a `void` expression always returns undefined, so we need to
        // see what's inside it without checking the type of the overall expression.
        return isUnhandledResult(checker, node.argument)
      }

      const tsNode = services.esTreeNodeToTSNodeMap.get(node)

      // Check the type. At this point it can't be unhandled if it isn't a Result
      // or array thereof.

      if (isResultArray(tsNode)) {
        return { isUnhandled: true, resultArray: true }
      }

      if (!util.isResultType(checker, tsNode, checker.getTypeAtLocation(tsNode))) {
        return { isUnhandled: false }
      }

      if (node.type === AST_NODE_TYPES.CallExpression) {
        return { isUnhandled: true }
      } else if (node.type === AST_NODE_TYPES.ConditionalExpression) {
        // We must be getting the Result-like value from one of the branches of the
        // ternary. Check them directly.
        const alternateResult = isUnhandledResult(checker, node.alternate)
        if (alternateResult.isUnhandled) {
          return alternateResult
        }
        return isUnhandledResult(checker, node.consequent)
      } else if (node.type === AST_NODE_TYPES.LogicalExpression) {
        const leftResult = isUnhandledResult(checker, node.left)
        if (leftResult.isUnhandled) {
          return leftResult
        }
        return isUnhandledResult(checker, node.right)
      }

      // Anything else is unhandled.
      return { isUnhandled: true }
    }

    function isResultArray(node: ts.Node): boolean {
      const type = checker.getTypeAtLocation(node)
      for (const ty of tsutils
        .unionTypeParts(type)
        .map((t) => checker.getApparentType(t))) {
        if (checker.isArrayType(ty)) {
          const arrayType = checker.getTypeArguments(ty as ts.TypeReference)[0]
          if (util.isResultType(checker, node, arrayType)) {
            return true
          }
        }

        if (checker.isTupleType(ty)) {
          for (const tupleElementType of checker.getTypeArguments(
            ty as ts.TypeReference,
          )) {
            if (util.isResultType(checker, node, tupleElementType)) {
              return true
            }
          }
        }
      }
      return false
    }
  },
})
