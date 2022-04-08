import * as path from 'path'

export function getExtensionDevelopmentPath(): string {
    const extPath = path.resolve(__dirname, '../../../')
    return extPath
}
