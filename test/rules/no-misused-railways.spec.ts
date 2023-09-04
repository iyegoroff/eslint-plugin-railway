import { RuleTester } from '@typescript-eslint/rule-tester'

import { rule } from '../../src/rules/no-misused-railways'

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

ruleTester.run('no-misused-railways', rule, {
  valid: [
    `
    if (true) {
    }
        `,
    `
    if ({ tag: 'success', success: 1 }) {
    }
        `,
    `
    if ({ tag: 'failure', failure: 1 }) {
    }
        `,
    `
    if ({ tag: 'success' as const, failure: 1 }) {
    }
        `,
    `
    if ({ tag: 'failure' as const, success: 1 }) {
    }
        `,
    {
      code: `
    import { Result } from 'ts-railway'
    if (Result.success(1)) {
    }
          `,
      options: [{ checksConditionals: false }],
    },
    {
      code: `
    import { Result } from 'ts-railway'
    if (Result.failure(1)) {
    }
          `,
      options: [{ checksConditionals: false }],
    },
    `
    if (true) {
    } else if (false) {
    } else {
    }
        `,
    {
      code: `
    import { Result } from 'ts-railway'
    if (Result.success(1)) {
    } else if (Result.failure(1)) {
    } else {
    }
          `,
      options: [{ checksConditionals: false }],
    },
    'for (;;) {}',
    'for (let i; i < 10; i++) {}',
    {
      code: 'import { Result } from "ts-railway"; for (let i; Result.success(1); i++) {}',
      options: [{ checksConditionals: false }],
    },
    {
      code: 'for (let i; { tag: "failure", failure: 1 }; i++) {}',
      options: [{ checksConditionals: false }],
    },
    'do {} while (true);',
    {
      code: 'import { Result } from "ts-railway"; do {} while (Result.success(1));',
      options: [{ checksConditionals: false }],
    },
    'while (true) {}',
    {
      code: 'while ({ tag: "failure", failure: 1 }) {}',
      options: [{ checksConditionals: false }],
    },
    'true ? 123 : 456;',
    {
      code: '({ tag: "success", success: 1 }) ? 123 : 456;',
      options: [{ checksConditionals: false }],
    },
    `
    if (!true) {
    }
        `,
    {
      code: `
    import { Result } from "ts-railway"
    if (!Result.failure(1)) {
    }
          `,
      options: [{ checksConditionals: false }],
    },
    'import { Result } from "ts-railway"; (Result.success(1).tag === "success") || false;',
    {
      code: 'import { Result } from "ts-railway"; Result.success(1) || false;',
      options: [{ checksConditionals: false }],
    },
    '(true && ({ tag: "success", success: 1}.tag === "failure")) || false;',
    {
      code: '(true && { tag: "success", success: 1}) || false;',
      options: [{ checksConditionals: false }],
    },
    'false || (true && { tag: "success", success: 1});',
    'import { Result } from "ts-railway"; (true && Result.failure(1)) || false;',
    `
    import { Result } from "ts-railway";
    function test() {
      if (Result.success(1).tag) {
      }
    }
        `,
    `
    import { Result } from "ts-railway"
    function test() {
      declare const mixed: Result<number, never> | undefined;
      if (mixed && mixed.tag === 'success') {
        return mixed.success
      }
    }
        `,
    `
    import { Result } from "ts-railway"
    if (~Result.success(1)) {
    }
        `,
    `
    import {Result} from 'ts-railway'
    const val: Result<number, never> | {tag: 'foo', success: 1} = {tag: 'foo', success: 1}
    if (val) {
    }
        `,
    '[1, 2, 3].forEach(val => {});',
    {
      code: 'import { Result } from "ts-railway"; [1, 2, 3].forEach(Result.success);',
      options: [{ checksVoidReturn: false }],
    },
    `const foo = (x: () => void) => { x() }; foo(() => 1);`,
    {
      code: `
        import { Result } from "ts-railway";
        const foo = (x: () => void) => { x() };
        foo(() => Result.failure(1));
      `,
      options: [{ checksVoidReturn: false }],
    },
    `
    import { Result } from "ts-railway";
    Result.combine(
      ...['abc', 'def'].map(val => {
        return Result.success(val)
      }),
    );
        `,
    `
    import { Result } from "ts-railway";
    const fn: (arg: () => Result<1, void> | void) => void = () => {};
    fn(() => Result.success(1));
        `,
    `
    import { Result } from "ts-railway";
    declare const returnsPromise: (() => Result<1, 2>) | null;
    if (returnsPromise?.()) {
    }
        `,
    `
    import { Result } from "ts-railway";
    declare const returnsPromise: { call: () => Result<void, void> } | null;
    if (returnsPromise?.call()) {
    }
        `,
    'import { Result } from "ts-railway"; Result.failure(1) ?? false;',
    `
    import { Result } from "ts-railway";
    function test(a: Result<void, 1> | undefinded) {
      const foo = a ?? Result.failure(1);
    }
        `,
    `
    import { Result } from "ts-railway";
    function test(p: Result<boolean, 1> | undefined, bool: boolean) {
      if (p ?? bool) {
      }
    }
        `,
    `
    import { Result } from "ts-railway";
    function test(p: Result<boolean | undefined, void>, bool: boolean) {
      if (Result.match({ success: (s) => s, failure: () => false }) ?? bool) {
      }
    }
        `,
    `
    import { Result } from "ts-railway";
    function test(p: Result<boolean, void> | undefined) {
      if ((p ?? p.tag === 'success')) {
      }
    }
        `,
    `
    import { Result } from "ts-railway";
    let f;
    f = () => Result.success(10);
        `,
    `
    import { Result } from "ts-railway";
    let f: () => Result<number, void>;
    f = () => Result.success(10);
    const g = () => Result.failure(0);
    const h: () => Result<number, void> = () => Result.failure(10);
        `,
    `
    const obj = {
      f: () => ({ tag: 'failure' as const, failure: 1 }),
    };
        `,
    `
    import { Result } from "ts-railway";
    const f = () => Result.success(123);
    const obj = {
      f,
    };
        `,
    `
    import { Result } from "ts-railway";
    const obj = {
      f() {
        return Result.failure(0);
      },
    };
        `,
    `
    import { Result } from "ts-railway";
    type O = { f: () => Result<number, void>; g: () => Result<number, void> };
    const g = () => Result.success(0);
    const obj: O = {
      f: () => Result.success(10),
      g,
    };
        `,
    `
    import { Result } from "ts-railway";
    type O = { f: () => Result<number, void> };
    const name = 'f';
    const obj: O = {
      [name]() {
        return Result.success(10);
      },
    };
        `,
    `
    const obj: number = {
      g() {
        return 10;
      },
    };
        `,
    `
    import { Result } from "ts-railway";
    const obj = {
      f: () => Result.failure('foo'),
      g() {
        return Result.success(0);
      },
    };
        `,
    `
    import { Result } from "ts-railway";
    function f() {
      return () => Result.success(0);
    }
    function g() {
      return;
    }
        `,
    {
      code: `
    import { Result } from "ts-railway";
    type O = {
      bool: boolean;
      func: () => Result<number, void>;
    };
    const Component = (obj: O) => null;
    <Component bool func={() => Result.success(10)} />;
          `,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    {
      code: `
    import { Result } from "ts-railway";
    const Component: any = () => null;
    <Component func={() => Result.failure(10)} />;
          `,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    {
      code: `
    import { Result } from "ts-railway";
    interface ItLike {
      (name: string, callback: () => Result<number, void>): void;
      (name: string, callback: () => void): void;
    }
    declare const it: ItLike;
    it('', () => Result.success(1));
          `,
    },
    {
      code: `
    import { Result } from "ts-railway";
    interface ItLike {
      (name: string, callback: () => void): void;
      (name: string, callback: () => Result<void, number>): void;
    }
    declare const it: ItLike;
    it('', () => Result.failure(1));
          `,
    },
    {
      code: `
    import { Result } from "ts-railway";
    interface ItLike {
      (name: string, callback: () => void): void;
    }
    interface ItLike {
      (name: string, callback: () => Result<number, void>): void;
    }
    declare const it: ItLike;
    it('', () => Result.success(1));
          `,
    },
    {
      code: `
    import { Result } from "ts-railway";
    interface ItLike {
      (name: string, callback: () => Result<number, void>): void;
    }
    interface ItLike {
      (name: string, callback: () => void): void;
    }
    declare const it: ItLike;
    it('', () => ({tag: 'success' as const, success: 1}));
          `,
    },
    {
      code: `
    import { Result } from "ts-railway";
    interface Props {
      onEvent: (() => void) | (() => Result<number, void>);
    }
    declare function Component(props: Props): any;
    const _ = <Component onEvent={() => Result.success(1)} />;
          `,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    `
    import { Result } from "ts-railway";
    console.log({
      ...(Result.match(
        { success: s => s, failure: () => ({})},
        Result.success({ key: 42 })
      ))
    });
        `,
    `
    import { Result } from "ts-railway";
    const getData = () => Result.success({ key: 42 });
    console.log({
      someData: 42,
      ...(Result.match({success: s => s, failure: () => ({})}, getData())),
    });
        `,
    `
    import { Result } from "ts-railway";
    declare const condition: boolean;
    const r = Result.success({ key: 42 });
    const matcher = { success: (s: Record<string, number>) => s, failure: () => ({}) }
    console.log({ ...(condition && (Result.match(matcher)(r))) });
    console.log({ ...(condition || (Result.match(matcher)(r))) });
    console.log({ ...(condition ? {} : Result.match(matcher)(r)) });
    console.log({ ...(condition ? Result.match(matcher)(r) : {}) });
        `,
    `
    import { Result } from "ts-railway";
    console.log(
      [...(Result.match({success: s => s, failure: () => 24}, Result.succes(42)))]
    );
        `,
    {
      code: `
    import { Result } from "ts-railway";
    console.log({ ...Result.success({ key: 42 }) });
          `,
      options: [{ checksSpreads: false }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const getData = () => Result.success({ key: 42 });
    console.log({
      someData: 42,
      ...getData(),
    });
          `,
      options: [{ checksSpreads: false }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    declare const condition: boolean;
    console.log({ ...(condition && Result.failure({ key: 42 })) });
    console.log({ ...(condition || Result.failure({ key: 42 })) });
    console.log({ ...(condition ? {} : Result.failure({ key: 42 })) });
    console.log({ ...(condition ? Result.failure({ key: 42 }) : {}) });
          `,
      options: [{ checksSpreads: false }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    // This is invalid Typescript, but it shouldn't trigger this linter specifically
    console.log([...Result.success(42)]);
          `,
      options: [{ checksSpreads: false }],
    },
    `
    import { Result } from "ts-railway";
    function spreadAny(..._args: any): void {}
    spreadAny(
      true,
      () => Result.success(1),
      () => Result.success(false),
    );
        `,
    `
    import { Result } from "ts-railway";
    function spreadArrayAny(..._args: Array<any>): void {}
    spreadArrayAny(
      true,
      () => Result.failure(1),
      () => Result.failure(false),
    );
        `,
    `
    import { Result } from "ts-railway";
    function spreadArrayUnknown(..._args: Array<unknown>): void {}
    spreadArrayUnknown(() => Result.success(true), 1, 2);
    function spreadArrayFuncPromise(
      ..._args: Array<() => Result<undefined, void>>
    ): void {}
    spreadArrayFuncPromise(
      () => Result.success(undefined),
      () => Result.success(undefined),
    );
        `,
    // Prettier adds a () but this tests arguments being undefined, not []
    /// eslint-disable-next-line @typescript-eslint/internal/plugin-test-formatting
    `
    class TakeCallbacks {
      constructor(...callbacks: Array<() => void>) {}
    }
    new TakeCallbacks;
    new TakeCallbacks();
    new TakeCallbacks(
      () => 1,
      () => true,
    );
        `,
    `
    function restTuple(...args: []): void;
    function restTuple(...args: [string]): void;
    function restTuple(..._args: string[]): void {}
    restTuple();
    restTuple('Hello');
        `,
    `
      let value: Record<string, () => void>;
      value.sync = () => {};
    `,
    `
      type ReturnsRecord = () => Record<string, () => void>;
      const test: ReturnsRecord = () => {
        return { sync: () => {} };
      };
    `,
    `
      type ReturnsRecord = () => Record<string, () => void>;
      function sync() {}
      const test: ReturnsRecord = () => {
        return { sync };
      };
    `,
    `
      function withTextRecurser<Text extends string>(
        recurser: (text: Text) => void,
      ): (text: Text) => void {
        return (text: Text): void => {
          if (text.length) {
            return;
          }
          return recurser(node);
        };
      }
    `,
    // https://github.com/typescript-eslint/typescript-eslint/issues/6637
    {
      code: `
            type OnSelectNodeFn = (node: string | null) => void;
            interface ASTViewerBaseProps {
              readonly onSelectNode?: OnSelectNodeFn;
            }
            declare function ASTViewer(props: ASTViewerBaseProps): null;
            declare const onSelectFn: OnSelectNodeFn;
            <ASTViewer onSelectNode={onSelectFn} />;
          `,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      options: [{ checksVoidReturn: { attributes: true } }],
    },
    `
    type O = { f: () => void };
    const f = () => ({tag: 'failure' as const, success: 0});
    const obj: O = {
      f,
    };
          `,
  ],

  invalid: [
    {
      code: `
    import { Result } from 'ts-railway'
    if (Result.success(1)) {
    }
          `,
      errors: [
        {
          line: 3,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    import { Result } from 'ts-railway'
    if (Result.failure(1)) {
    }
          `,
      errors: [
        {
          line: 3,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    if ({ tag: 'success' as const, success: 1 }) {
    }
              `,
      errors: [
        {
          line: 2,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    if ({ tag: 'failure' as const, failure: 1 }) {
    }
              `,
      errors: [
        {
          line: 2,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
        import { Result } from 'ts-railway'
        if (Result.success(1)) {
        } else if (Result.failure(1)) {
        } else {
        }
              `,
      errors: [
        {
          line: 3,
          messageId: 'conditional',
        },
        {
          line: 4,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
      import { Result } from "ts-railway"
      function test() {
        const mixed: Result<number, never> | undefined = Result.success(1);
        if (mixed && mixed.tag === 'success') {
          return mixed.success
        }
      }
          `,
      errors: [
        {
          line: 5,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
      import {Result} from 'ts-railway'
      const val: Result<number, never> | {tag: 'foo', success: 1} = {tag: 'success', success: 1}
      if (val) {
      }
          `,
      errors: [
        {
          line: 4,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: 'import {Result} from "ts-railway"; for (let i; Result.success(1); i++) {}',
      errors: [
        {
          line: 1,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: 'import {Result} from "ts-railway"; do {} while (Result.failure(1));',
      errors: [
        {
          line: 1,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: 'while (({tag: "success" as const, success: []})) {}',
      errors: [
        {
          line: 1,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: 'import {Result} from "ts-railway"; Result.success(1) ? 123 : 456;',
      errors: [
        {
          line: 1,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    import {Result} from "ts-railway";
    if (!Result.failure(1)) {
    }
          `,
      errors: [
        {
          line: 3,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: '({tag: "failure" as const, failure: 1}) || false;',
      errors: [
        {
          line: 1,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    import {Result} from "ts-railway";
    [Result.success(1), Result.failure(2)].forEach(val => val);
          `,
      errors: [
        {
          line: 3,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: 'import { Result } from "ts-railway"; [0, 2, 3].forEach(Result.success);',
      errors: [
        {
          line: 1,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const foo = (x: () => void) => { x() };
    foo(() => Result.failure(1));
          `,
      errors: [
        {
          line: 4,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    const fnWithCallback = (arg: string, cb: (err: any, res: string) => void) => {
      cb(null, arg);
    };
    fnWithCallback('val', (err, res) => {
      return {tag: 'success' as const, success: res}
    });
          `,
      errors: [
        {
          line: 5,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const fnWithCallback = (arg: string, cb: (err: any, res: string) => void) => {
      cb(null, arg);
    };
    fnWithCallback('val', (err, res) => err ? Result.failure(err) : Result.success(res));
          `,
      errors: [
        {
          line: 6,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const fnWithCallback = (arg: string, cb: (err: any, res: string) => void) => {
      cb(null, arg);
    };
    fnWithCallback('val', (err, res) => {
      if (err) {
        return 'abc';
      } else {
        return Result.success(res);
      }
    });
          `,
      errors: [
        {
          line: 6,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const fnWithCallback:
      | ((arg: string, cb: (err: any, res: string) => void) => void)
      | null = (arg, cb) => {
      cb(null, arg);
    };
    fnWithCallback?.('val', (err, res) => Result.success(res));
          `,
      errors: [
        {
          line: 8,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    const fnWithCallback:
      | ((arg: string, cb: (err: any, res: string) => void) => void)
      | null = (arg, cb) => {
      cb(null, arg);
    };
    fnWithCallback('val', (err, res) => {
      if (err) {
        return 'abc';
      } else {
        return {tag: 'success' as const, success: 5};
      }
    });
          `,
      errors: [
        {
          line: 7,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function test(bool: boolean, p: Result<void, void>) {
      if (bool || p) {
      }
    }
          `,
      errors: [
        {
          line: 4,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function test(bool: boolean, p: Result<void, void>) {
      if (bool && p) {
      }
    }
          `,
      errors: [
        {
          line: 4,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    function test(a: any, p: {tag: 'failure', failure: number}) {
      if (a ?? p) {
      }
    }
          `,
      errors: [
        {
          line: 3,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function test(p: Result<void, void> | undefined) {
      if (p ?? Result.failure(1)) {
      }
    }
          `,
      errors: [
        {
          line: 4,
          messageId: 'conditional',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    let f: () => void;
    f = () => {
      return Result.success(1);
    };
          `,
      errors: [
        {
          line: 4,
          messageId: 'voidReturnVariable',
        },
      ],
    },
    {
      code: `
      import { Result } from "ts-railway";
      let f: () => void;
      f = () => {
        return Result.failure(1);
      };
            `,
      errors: [
        {
          line: 4,
          messageId: 'voidReturnVariable',
        },
      ],
      options: [{ checksVoidReturn: { variables: true } }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const f: () => void = () => {
      return Result.success(1);
    };
    const g = () => Result.failure(1),
      h: () => void = () => Result.failure(1);
          `,
      errors: [
        {
          line: 3,
          messageId: 'voidReturnVariable',
        },
        {
          line: 7,
          messageId: 'voidReturnVariable',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const obj: {
      f?: () => void;
    } = {};
    obj.f = () => {
      return Result.success(0);
    };
          `,
      errors: [
        {
          line: 6,
          messageId: 'voidReturnVariable',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type O = { f: () => void };
    const obj: O = {
      f: () => Result.success('foo'),
    };
          `,
      errors: [
        {
          line: 5,
          messageId: 'voidReturnProperty',
        },
      ],
    },
    {
      code: `
      import { Result } from "ts-railway";
      type O = { f: () => void };
      const obj: O = {
        f: () => Result.success('foo'),
      };
            `,
      errors: [
        {
          line: 5,
          messageId: 'voidReturnProperty',
        },
      ],
      options: [{ checksVoidReturn: { properties: true } }],
    },
    {
      code: `
    type O = { f: () => void };
    const f = () => ({tag: 'failure' as const, failure: 0});
    const obj: O = {
      f,
    };
          `,
      errors: [
        {
          line: 5,
          messageId: 'voidReturnProperty',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type O = { f: () => void };
    const obj: O = {
      f() {
        return Result.success(0);
      },
    };
          `,
      errors: [
        {
          line: 5,
          messageId: 'voidReturnProperty',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type O = { f: () => void; g: () => void; h: () => void };
    function f(): O {
      const h = () => Result.success(0);
      return {
        f() {
          return Result.failure(123);
        },
        g: () => Result.failure(0),
        h,
      };
    }
          `,
      errors: [
        {
          line: 7,
          messageId: 'voidReturnProperty',
        },
        {
          line: 10,
          messageId: 'voidReturnProperty',
        },
        {
          line: 11,
          messageId: 'voidReturnProperty',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function f(): () => void {
      return () => Result.success(0);
    }
          `,
      errors: [
        {
          line: 4,
          messageId: 'voidReturnReturnValue',
        },
      ],
    },
    {
      code: `
    function f(): () => void {
      return () => ({ tag: 'success' as const, success: 1 });
    }
          `,
      errors: [
        {
          line: 3,
          messageId: 'voidReturnReturnValue',
        },
      ],
      options: [{ checksVoidReturn: { returns: true } }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type O = {
      func: () => void;
    };
    const Component = (obj: O) => null;
    <Component func={() => Result.success(0)} />;
          `,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      errors: [
        {
          line: 7,
          messageId: 'voidReturnAttribute',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type O = {
      func: () => void;
    };
    const Component = (obj: O) => null;
    <Component func={() => Result.failure(1)} />;
          `,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      errors: [
        {
          line: 7,
          messageId: 'voidReturnAttribute',
        },
      ],
      options: [{ checksVoidReturn: { attributes: true } }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type O = {
      func: () => void;
    };
    const g = () => Result.success('foo');
    const Component = (obj: O) => null;
    <Component func={g} />;
          `,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      errors: [
        {
          line: 8,
          messageId: 'voidReturnAttribute',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    interface ItLike {
      (name: string, callback: () => number): void;
      (name: string, callback: () => void): void;
    }
    declare const it: ItLike;
    it('', () => Result.success(1));
          `,
      errors: [
        {
          line: 8,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    interface ItLike {
      (name: string, callback: () => number): void;
    }
    interface ItLike {
      (name: string, callback: () => void): void;
    }
    declare const it: ItLike;
    it('', () => Result.success(1));
          `,
      errors: [
        {
          line: 10,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    interface ItLike {
      (name: string, callback: () => void): void;
    }
    interface ItLike {
      (name: string, callback: () => number): void;
    }
    declare const it: ItLike;
    it('', () => ({tag: 'success' as const, success: 1}));
          `,
      errors: [
        {
          line: 9,
          messageId: 'voidReturnArgument',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    console.log({ ...Result.success({ key: 42 }) });
          `,
      errors: [
        {
          line: 3,
          messageId: 'spread',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    const getData = () => Result.success({ key: 42 });
    console.log({
      someData: 42,
      ...getData(),
    });
          `,
      errors: [
        {
          line: 6,
          messageId: 'spread',
        },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    declare const condition: boolean;
    console.log({ ...(condition && Result.failure({ key: 42 })) });
    console.log({ ...(condition || Result.failure({ key: 42 })) });
    console.log({ ...(condition ? {} : Result.failure({ key: 42 })) });
    console.log({ ...(condition ? Result.failure({ key: 42 }) : {}) });
          `,
      errors: [
        { line: 4, messageId: 'spread' },
        { line: 5, messageId: 'spread' },
        { line: 6, messageId: 'spread' },
        { line: 7, messageId: 'spread' },
      ],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function restPromises(first: Boolean, ...callbacks: Array<() => void>): void {}
    restPromises(
      true,
      () => Result.success(true),
      () => Result.success(null),
      () => true,
      () => Result.success('Hello'),
    );
          `,
      errors: [
        { line: 6, messageId: 'voidReturnArgument' },
        { line: 7, messageId: 'voidReturnArgument' },
        { line: 9, messageId: 'voidReturnArgument' },
      ],
    },
    {
      code: `
    type MyUnion = (() => void) | boolean;
    function restUnion(first: string, ...callbacks: Array<MyUnion>): void {}
    restUnion('Testing', false, () => ({tag: 'success' as const, success: 1}));
          `,
      errors: [{ line: 4, messageId: 'voidReturnArgument' }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function restTupleOne(first: string, ...callbacks: [() => void]): void {}
    restTupleOne('My string', () => Result.failure(1));
          `,
      errors: [{ line: 4, messageId: 'voidReturnArgument' }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function restTupleTwo(
      first: boolean,
      ...callbacks: [undefined, () => void, undefined]
    ): void {}
    restTupleTwo(true, undefined, () => Result.success(true), undefined);
          `,
      errors: [{ line: 7, messageId: 'voidReturnArgument' }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    declare let b: boolean
    const r = b ? Result.success(1) : Result.success('abc')
    function restTupleFour(
      first: number,
      ...callbacks: [() => void, boolean, () => void, () => void]
    ): void;
    restTupleFour(
      1,
      () => r,
      false,
      () => {},
      () => r,
    );
          `,
      errors: [
        { line: 11, messageId: 'voidReturnArgument' },
        { line: 14, messageId: 'voidReturnArgument' },
      ],
    },
    {
      // Prettier adds a () but this tests arguments being undefined, not []
      /// eslint-disable-next-line @typescript-eslint/internal/plugin-test-formatting
      code: `
    class TakesVoidCb {
      constructor(first: string, ...args: Array<() => void>);
    }
    new TakesVoidCb;
    new TakesVoidCb();
    new TakesVoidCb(
      'Testing',
      () => {},
      () => ({ tag: 'success' as const, success: true }),
    );
          `,
      errors: [{ line: 10, messageId: 'voidReturnArgument' }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    function restTuple(...args: []): void;
    function restTuple(...args: [boolean, () => void]): void;
    function restTuple(..._args: any[]): void {}
    restTuple();
    restTuple(true, () => Result.success(1));
          `,
      errors: [{ line: 7, messageId: 'voidReturnArgument' }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type ReturnsRecord = () => Record<string, () => void>;
    const test: ReturnsRecord = () => {
      return { result: () => Result.failure(1) };
    };
          `,
      errors: [{ line: 5, messageId: 'voidReturnProperty' }],
    },
    {
      code: `
    let value: Record<string, () => void>;
    value.result = () => ({tag: 'failure' as const, failure: 1});
          `,
      errors: [{ line: 3, messageId: 'voidReturnVariable' }],
    },
    {
      code: `
    import { Result } from "ts-railway";
    type ReturnsRecord = () => Record<string, () => void>;
    function result() { return Result.success(1) }
    const test: ReturnsRecord = () => {
      return { result };
    };
          `,
      errors: [{ line: 6, messageId: 'voidReturnProperty' }],
    },
  ],
})
