import { foo } from '../src'

describe('__my_package_name__ test', () => {
  test('foo', () => {
    expect(foo()).toEqual('bar')
  })
})
