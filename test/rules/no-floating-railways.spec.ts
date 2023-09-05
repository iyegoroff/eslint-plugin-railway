import { RuleTester } from '@typescript-eslint/rule-tester'

import { rule } from '../../src/rules/no-floating-railways'

import { getFixturesRootDir } from '../getFixturesDir'

const rootDir = getFixturesRootDir()

const ruleTester = new RuleTester({
  parserOptions: {
    ecmaVersion: 2018,
    tsconfigRootDir: rootDir,
    project: './tsconfig.json',
  },
  parser: '@typescript-eslint/parser',
})

ruleTester.run('no-floating-promises', rule, {
  valid: [
    `
    import {Result} from 'ts-railway'
    function test() {
      return Result.success('value');
    }
        `,
    `
    import {Result} from 'ts-railway'
    function test() {
      void 1;
    }
        `,
  ],

  invalid: [
    {
      code: `
    import {Result} from 'ts-railway'
    function test() {
      Result.success('value');
      Result.failure('value');
    }
      `,
      errors: [
        {
          line: 4,
          messageId: 'floating',
        },
        {
          line: 5,
          messageId: 'floating',
        },
      ],
    },
    {
      code: `
    import {Result} from 'ts-railway'
    const test = {
      foo: {
        bar: Result.success(5)
      }
    }
    test?.foo?.bar;
      `,
      errors: [
        {
          line: 8,
          messageId: 'floating',
        },
      ],
    },
    {
      code: `
    import {Result} from 'ts-railway'
    declare const b: boolean;
    (b ? Result.success(1) : 2);
    (b ? 1 : Result.failure(2));
      `,
      errors: [
        {
          line: 4,
          messageId: 'floating',
        },
        {
          line: 5,
          messageId: 'floating',
        },
      ],
    },
    {
      code: `
    import {Result} from 'ts-railway'
    (Result.success(1), Result.failure(2), 3);
      `,
      errors: [
        {
          line: 3,
          messageId: 'floating',
        },
      ],
    },
    {
      code: `
    import {Result} from 'ts-railway'
    declare const b: boolean;
    b && Result.failure(2);
    declare const foo: Result<number, void> | boolean
    foo && Result.failure(2);
      `,
      errors: [
        {
          line: 4,
          messageId: 'floating',
        },
        {
          line: 6,
          messageId: 'floating',
        },
      ],
    },
    {
      code: `
    import {Result} from 'ts-railway';
    function test() {
      void Result.success(1);
    }
          `,
      errors: [
        {
          line: 4,
          messageId: 'floating',
        },
      ],
    },
  ],
})
