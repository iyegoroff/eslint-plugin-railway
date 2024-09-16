import * as ts from 'typescript'

export function isRestParameterDeclaration(decl: ts.Declaration): boolean {
  return ts.isParameter(decl) && decl.dotDotDotToken != null
}
