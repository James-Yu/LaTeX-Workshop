import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const workspaceRoot = path.resolve(import.meta.dirname, '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(workspaceRoot, 'package.json'), 'utf8'))
const vsixName = `${packageJson.name}-${packageJson.version}.vsix`
const vsixPath = path.join(workspaceRoot, vsixName)

function run(command, args) {
    const result = spawnSync(command, args, {
        cwd: workspaceRoot,
        stdio: 'inherit',
        shell: false
    })
    if (result.error) {
        throw result.error
    }
    if ((result.status ?? 1) !== 0) {
        process.exit(result.status ?? 1)
    }
}

const action = process.argv[2]

switch (action) {
    case 'package': {
        run('npx', ['vsce', 'package'])
        break
    }
    case 'install': {
        if (!fs.existsSync(vsixPath)) {
            console.error(`VSIX not found: ${vsixPath}`)
            console.error('Run `node ./dev/manageLocalExtension.mjs package` first.')
            process.exit(1)
        }
        run('code', ['--install-extension', vsixPath, '--force'])
        break
    }
    case 'reinstall': {
        run('node', ['./dev/cleanupLocalExtensions.mjs'])
        run('npx', ['vsce', 'package'])
        run('code', ['--install-extension', vsixPath, '--force'])
        break
    }
    default: {
        console.error('Usage: node ./dev/manageLocalExtension.mjs <package|install|reinstall>')
        process.exit(1)
    }
}