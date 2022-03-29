import * as path from 'path'

export function getExtensionDevelopmentPath(): string {
    const extPath = path.resolve(__dirname, '../../')
    return extPath
}

export function decycle(obj: unknown, memo = new Set<unknown>()): any {
    if (!obj) {
        return obj
    }
    if (typeof obj !== 'object') {
        return obj
    }
    memo.add(obj)
    if (obj instanceof Array) {
        return obj.map(e => decycle(e, memo))
    }
    const ret = Object.create(null)
    Object.entries(obj).forEach(([key, val]) => {
        if (typeof val === 'object') {
            if (memo.has(val)) {
                if (Object.values(val).every(e => typeof e !== 'object')) {
                    ret[key] = val
                } else {
                    ret[key] = `(cyclic ref)`
                }
            } else {
                memo.add(val)
                ret[key] = decycle(val, memo)
            }
        } else {
            ret[key] = decycle(val, memo)
        }

    })
    return ret
}
