export function Version(o ?: Version.Options): Version {
  return {
    moniker: o?.moniker ?? "",
    major  : o?.major   ??  0,
    minor  : o?.minor   ??  0,
    patch  : o?.patch   ??  0,
  }
}

export interface Version {
  moniker: string
  major  : string | number
  minor  : string | number
  patch  : string | number
}

export namespace Version {
  export interface Options {
    moniker ?: string
    major   ?: string | number
    minor   ?: string | number
    patch   ?: string | number
  }

  export function toString(a: Version) {
    return `${a.moniker} ${a.major}.${a.minor}.${a.patch}`
  }
}

export default Version