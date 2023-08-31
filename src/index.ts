import { type Linter } from '@typescript-eslint/utils/ts-eslint'
import { rules } from './rules'

const config: Linter.Plugin = {
  rules,
}

export = config
