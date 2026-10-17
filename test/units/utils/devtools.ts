import * as fs from 'fs/promises'
import * as path from 'path'
import WebSocket from 'ws'
import { sleep } from './async'

type Evaluate = <T = unknown>(expression: string) => Promise<T>
type Pending = { resolve: (value: unknown) => void, reject: (error: Error) => void }
type Message = {
    id?: number,
    error?: { message: string },
    result: unknown,
    method?: string,
    sessionId: string,
    params: { context: { id: number }, executionContextId: number }
}

export async function waitForViewer(predicate: () => Promise<boolean>, timeout = 15000): Promise<void> {
    const deadline = Date.now() + timeout
    while (!await predicate()) {
        if (Date.now() >= deadline) {
            throw new Error('Timed out waiting for the test PDF viewer.')
        }
        await sleep(50)
    }
}

/** Connect only to the isolated extension-test instance, never the user's editor. */
export class ViewerDevtools {
    private sequence = 0
    private readonly pending = new Map<number, Pending>()
    private readonly contexts = new Map<string, Set<number>>()
    private readonly sessions = new Map<string, string>()

    private constructor(private readonly socket: WebSocket) {
        socket.on('message', raw => {
            const message = JSON.parse(raw.toString()) as Message
            if (message.id !== undefined) {
                const pending = this.pending.get(message.id)
                this.pending.delete(message.id)
                if (message.error) {
                    pending?.reject(new Error(message.error.message))
                } else {
                    pending?.resolve(message.result)
                }
            } else if (message.method === 'Runtime.executionContextCreated') {
                const contexts = this.contexts.get(message.sessionId) ?? new Set<number>()
                contexts.add(message.params.context.id)
                this.contexts.set(message.sessionId, contexts)
            } else if (message.method === 'Runtime.executionContextsCleared') {
                this.contexts.delete(message.sessionId)
            } else if (message.method === 'Runtime.executionContextDestroyed') {
                this.contexts.get(message.sessionId)?.delete(message.params.executionContextId)
            }
        })
    }

    static async connect(): Promise<ViewerDevtools> {
        const userData = process.env['LATEXWORKSHOP_TEST_USER_DATA']
        if (!userData) {
            throw new Error('Run browser integration tests with npm test (isolated test profile required).')
        }
        const [port, endpoint] = (await fs.readFile(path.join(userData, 'DevToolsActivePort'), 'utf8')).trim().split('\n')
        const socket = new WebSocket(`ws://127.0.0.1:${port}${endpoint}`)
        await new Promise<void>((resolve, reject) => {
            socket.once('open', resolve)
            socket.once('error', reject)
        })
        return new ViewerDevtools(socket)
    }

    private send<T = unknown>(method: string, params: object = {}, sessionId?: string): Promise<T> {
        const id = ++this.sequence
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                this.pending.delete(id)
                reject(new Error(`DevTools timed out: ${method}`))
            }, 5000)
            this.pending.set(id, {
                resolve: result => { clearTimeout(timeout); resolve(result as T) },
                reject: error => { clearTimeout(timeout); reject(error) }
            })
            this.socket.send(JSON.stringify({ id, method, params, sessionId }))
        })
    }

    async viewer(title: string): Promise<Evaluate> {
        let found: Evaluate | undefined
        await waitForViewer(async () => {
            const { targetInfos } = await this.send<{ targetInfos: { type: string, targetId: string }[] }>('Target.getTargets')
            for (const target of targetInfos) {
                if (!['page', 'iframe', 'webview'].includes(target.type)) {
                    continue
                }
                if (!this.sessions.has(target.targetId)) {
                    const { sessionId } = await this.send<{ sessionId: string }>('Target.attachToTarget', { targetId: target.targetId, flatten: true })
                    this.sessions.set(target.targetId, sessionId)
                    await this.send('Runtime.enable', {}, sessionId)
                }
            }
            for (const [sessionId, contexts] of this.contexts) {
                for (const contextId of contexts) {
                    const evaluate: Evaluate = async <T>(expression: string) => {
                        const result = await this.send<{ exceptionDetails?: unknown, result: { value: T } }>('Runtime.evaluate', { expression, contextId, awaitPromise: true, returnByValue: true }, sessionId)
                        if (result.exceptionDetails) {
                            throw new Error(JSON.stringify(result.exceptionDetails))
                        }
                        return result.result.value
                    }
                    try {
                        if (await evaluate(`typeof PDFViewerApplication !== 'undefined' && !!PDFViewerApplication.pdfDocument && document.title === ${JSON.stringify(title)}`)) {
                            found = evaluate
                            return true
                        }
                    } catch { /* A context may disappear while the viewer loads. */ }
                }
            }
            return false
        })
        return found!
    }

    close() {
        this.socket.close()
    }
}
