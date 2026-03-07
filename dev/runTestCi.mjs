import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const workspaceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const filteredSubstrings = [
    'product.json#extensionEnabledApiProposals',
    'Failed to connect to the bus:',
    'is not in the list of known options',
    'gpu_memory_buffer_support_x11',
    'CoreText note:',
    'CTFontLogSystemFontNameRequest',
    'error messaging the mach port for IMKCFRunLoopWakeUpReliable'
]

const useXvfb = process.env.CI_USE_XVFB === '1'
const command = useXvfb ? 'xvfb-run' : process.execPath
const args = useXvfb ? ['-a', process.execPath, './out/test/runTest.js'] : ['./out/test/runTest.js']

const child = spawn(command, args, {
    cwd: workspaceRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe']
})

child.on('error', error => {
    console.error(error.message)
    process.exit(1)
})

function shouldFilter(line) {
    return filteredSubstrings.some(substring => line.includes(substring))
}

function pipeFiltered(stream, output) {
    let buffer = ''
    stream.setEncoding('utf8')

    stream.on('data', chunk => {
        buffer += chunk
        const lines = buffer.split(/\r?\n/)
        buffer = lines.pop() ?? ''
        for (const line of lines) {
            if (!shouldFilter(line)) {
                output.write(line + '\n')
            }
        }
    })

    stream.on('end', () => {
        if (buffer && !shouldFilter(buffer)) {
            output.write(buffer)
        }
    })
}

pipeFiltered(child.stdout, process.stdout)
pipeFiltered(child.stderr, process.stderr)

child.on('close', code => {
    process.exit(code ?? 1)
})