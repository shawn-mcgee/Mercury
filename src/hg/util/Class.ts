// https://github.com/microsoft/TypeScript/issues/17572
abstract class Abstract { }
export type Class<T = { }> = typeof Abstract & { prototype: T }
export default Class