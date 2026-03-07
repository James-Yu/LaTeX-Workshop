import type { ClientRequest, PanelRequest } from '../../types/latex-workshop-protocol-types/index'
import * as utils from './utils.js'

export function initConnect() {
    console.warn('Internal viewer connection is disabled in this build.')
}

export async function send(message: ClientRequest) {
    void message
}

export function sendLog(message: string) {
    console.warn(message)
}

export function sendPanel(msg: PanelRequest) {
    if (!utils.isEmbedded()) {
        return
    }
    window.parent?.postMessage(msg, '*')
}

