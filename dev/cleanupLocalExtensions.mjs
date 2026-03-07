import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'))

const publishers = Array.from(new Set([
    packageJson.publisher,
    'thinksyncs',
    'ToppyMicrosServices'
].filter(Boolean)))
const extensionName = packageJson.name
const extensionIds = publishers.map(publisher => `${publisher}.${extensionName}`)

const extensionDirs = [
    path.join(os.homedir(), '.vscode', 'extensions'),
    path.join(os.homedir(), '.vscode-insiders', 'extensions')
]

function uninstallRegisteredExtension(extensionId) {
    const result = spawnSync('code', ['--uninstall-extension', extensionId], {
        stdio: 'pipe',
        encoding: 'utf8'
    })
    if (result.error) {
        console.log(`[skip] code CLI unavailable for ${extensionId}: ${result.error.message}`)
        return
    }
    const output = [result.stdout, result.stderr].filter(Boolean).join('').trim()
    if (output) {
        console.log(output)
    }
}

function removeStaleExtensionDirectories(baseDir) {
    if (!fs.existsSync(baseDir)) {
        return []
    }
    const entries = fs.readdirSync(baseDir, { withFileTypes: true })
    const removed = []
    for (const entry of entries) {
        if (!entry.isDirectory()) {
            continue
        }
        if (!extensionIds.some(extensionId => entry.name === extensionId || entry.name.startsWith(`${extensionId}-`))) {
            continue
        }
        const fullPath = path.join(baseDir, entry.name)
        fs.rmSync(fullPath, { recursive: true, force: true })
        removed.push(fullPath)
    }
    return removed
}

console.log(`Cleaning local installs for: ${extensionIds.join(', ')}`)

for (const extensionId of extensionIds) {
    uninstallRegisteredExtension(extensionId)
}

let removedAny = false
for (const extensionDir of extensionDirs) {
    const removed = removeStaleExtensionDirectories(extensionDir)
    if (removed.length > 0) {
        removedAny = true
        for (const entry of removed) {
            console.log(`[removed] ${entry}`)
        }
    }
}

if (!removedAny) {
    console.log('No stale local extension directories found.')
}