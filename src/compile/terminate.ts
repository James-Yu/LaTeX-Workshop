import * as cp from 'child_process'
import { lw } from '../lw'
import { queue } from './queue'

const logger = lw.log('Build', 'Recipe')

/**
 * Terminate current process of LaTeX building. OS-specific (pkill for linux
 * and macos, taskkill for win) kill command is first called with process
 * pid. No matter whether it succeeded, `kill()` of `child_process` is later
 * called to "double kill". Also, all subsequent tools in queue are cleared,
 * including ones in the current recipe and (if available) those from the
 * cached recipe to be executed.
 */
export function terminate() {
    if (lw.compile.process === undefined) {
        logger.log('LaTeX build process to kill is not found.')
        return
    }
    const pid = lw.compile.process.pid
    try {
        logger.log(`Kill child processes of the current process with PID ${pid}.`)
        if (process.platform === 'linux' || process.platform === 'darwin') {
            cp.execSync(`pkill -P ${pid}`, { timeout: 1000 })
        } else if (process.platform === 'win32') {
            cp.execSync(`taskkill /F /T /PID ${pid}`, { timeout: 1000 })
        }
    } catch (e) {
        logger.logError('Failed killing child processes of the current process.', e)
    } finally {
        queue.clear()
        lw.compile.process.kill()
        logger.log(`Killed the current process with PID ${pid}`)
    }
}
