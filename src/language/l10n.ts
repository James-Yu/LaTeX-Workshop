import * as vscode from 'vscode'
import * as path from 'path'
import { lw } from '../lw'

let localeStrings: {[key: string]: string} | undefined
async function retrieveLangString(): Promise<{[key: string]: string}> {
    if (localeStrings !== undefined) {
        return localeStrings
    }
    let langPath = path.resolve(lw.extensionRoot, `package.nls.${vscode.env.language}.json`)
    if (!await lw.file.exists(langPath)) {
        langPath = path.resolve(lw.extensionRoot, 'package.nls.json')
    }
    localeStrings = JSON.parse(await lw.file.read(langPath) ?? '{}') as {[key: string]: string}
    return localeStrings
}

export async function getLocaleString(key: string): Promise<string> {
    return (await retrieveLangString())[key] ?? key
}
