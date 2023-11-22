import * as cp from 'child_process'
import { lw } from '../lw'
import { queue } from './queue'

const logger = lw.log('Build', 'Recipe')

/**
 * Terminate the current process of LaTeX building. This OS-specific function
 * uses a kill command (pkill for Linux and macOS, taskkill for Windows) with
 * the process PID. Regardless of success, `kill()` from the `child_process`
 * module is later called for a "double kill." Subsequent tools in the queue,
 * including those from the current recipe and (if available) those from the
 * cached recipe to be executed, are cleared.
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
            // Use pkill to kill child processes
            cp.execSync(`pkill -P ${pid}`, { timeout: 1000 })
        } else if (process.platform === 'win32') {
            // Use taskkill on Windows to forcefully terminate child processes
            cp.execSync(`taskkill /F /T /PID ${pid}`, { timeout: 1000 })
        }
    } catch (e) {
        logger.logError('Failed killing child processes of the current process.', e)
    } finally {
        // Clear all subsequent tools in the queue
        queue.clear()

        // Perform a "double kill" using kill() from child_process
        lw.compile.process.kill()
        logger.log(`Killed the current process with PID ${pid}`)
    }
}
