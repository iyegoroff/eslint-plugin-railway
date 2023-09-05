import type { TSESTree } from '@typescript-eslint/utils'
import { AST_NODE_TYPES } from '@typescript-eslint/utils'
import * as ts from 'typescript'

import * as util from '../util'

type Options = []

type MessageId = 'floating'

const messageBase = 'Results must be handled.'

export const name = 'no-floating-railways' as const

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

        const { isUnhandled } = isUnhandledResult(checker, expression)

        if (isUnhandled) {
          context.report({
            node,
            messageId: 'floating',
          })
        }
      },
    }

    function isUnhandledResult(
      checker: ts.TypeChecker,
      node: TSESTree.Node,
    ): { isUnhandled: boolean } {
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

      // Check the type. At this point it can't be unhandled if it isn't a Result
      const n = services.esTreeNodeToTSNodeMap.get(node)
      if (!util.isResultType(checker, n, checker.getTypeAtLocation(n))) {
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
      } else if (
        node.type === AST_NODE_TYPES.MemberExpression ||
        node.type === AST_NODE_TYPES.Identifier ||
        node.type === AST_NODE_TYPES.NewExpression
      ) {
        // If it is just a property access chain or a `new` call (e.g. `foo.bar`),
        // the Result is not handled because it doesn't have the
        // necessary then/catch call at the end of the chain.
        return { isUnhandled: true }
      } else if (node.type === AST_NODE_TYPES.LogicalExpression) {
        const leftResult = isUnhandledResult(checker, node.left)
        if (leftResult.isUnhandled) {
          return leftResult
        }
        return isUnhandledResult(checker, node.right)
      }

      // We conservatively return false for all other types of expressions because
      // we don't want to accidentally fail if the Result is handled internally but
      // we just can't tell.
      return { isUnhandled: false }
    }
  },
})
