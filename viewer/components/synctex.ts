import type { SynctexData, SynctexRangeData } from '../../types/latex-workshop-protocol-types/index.js'
import { sendLog } from './connection.js'

let synctexEnabled = false
export function isSyncTeXEnabled() {
    return synctexEnabled
}
export function toggleSyncTeX() {
    synctexEnabled = false
    return synctexEnabled
}

let reverseSynctexKeybinding: string = 'ctrl-click'
export function setSyncTeXKey(binding: string) {
    reverseSynctexKeybinding = binding
}

export function registerSyncTeX() {
    void reverseSynctexKeybinding
}

export function forwardSynctex(data: SynctexData | SynctexRangeData[]) {
    void data
    if (!isSyncTeXEnabled()) {
        sendLog('SyncTeX is disabled in this build.')
        return
    }
}
