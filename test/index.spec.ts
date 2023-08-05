import { foo } from '../src'

describe('eslint-plugin-railway test', () => {
  test('foo', () => {
    expect(foo()).toEqual('bar')
  })
})
