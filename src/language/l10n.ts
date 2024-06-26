import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../lw'

let localeStrings: {[key: string]: string} | undefined
let defaultStrings: {[key: string]: string} | undefined
async function retrieveLangString() {
    const langPath = path.resolve(lw.extensionRoot, `package.nls.${vscode.env.language}.json`)
    if (await lw.file.exists(langPath)) {
        localeStrings = JSON.parse(await lw.file.read(langPath) ?? '{}') as {[key: string]: string}
    }
    const engPath = path.resolve(lw.extensionRoot, 'package.nls.json')
    defaultStrings = JSON.parse(await lw.file.read(engPath) ?? '{}') as {[key: string]: string}
}

export async function getLocaleString(key: string): Promise<string> {
    if (defaultStrings === undefined) {
        await retrieveLangString()
    }
    return localeStrings?.[key] ?? defaultStrings?.[key] ?? key
}
