import { TSESTree, AST_NODE_TYPES } from '@typescript-eslint/utils'

const isNodeOfTypes =
  <NodeTypes extends readonly AST_NODE_TYPES[]>(nodeTypes: NodeTypes) =>
  (
    node: TSESTree.Node | null | undefined,
  ): node is Extract<TSESTree.Node, { type: NodeTypes[number] }> =>
    !!node && nodeTypes.includes(node.type)

const functionTypes = [
  AST_NODE_TYPES.ArrowFunctionExpression,
  AST_NODE_TYPES.FunctionDeclaration,
  AST_NODE_TYPES.FunctionExpression,
] as const

export const isFunction = isNodeOfTypes(functionTypes)
