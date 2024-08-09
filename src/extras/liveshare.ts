import * as vsls from 'vsls/vscode'
import * as vscode from 'vscode'
import { lw } from '../lw'
import * as url from 'url'
import * as utils from '../utils/utils'

export class LiveShare {
    private role: vsls.Role = vsls.Role.None
    private hostServerPort: number | undefined | null
    private shareServerDisposable: vscode.Disposable | undefined

    liveshare: vsls.LiveShare | undefined | null

    constructor() {
        void this.init()
    }

    private async init() {
        this.liveshare = await vsls.getApi()
        if (!this.liveshare) {
            return
        }
        this.sessionRole = this.liveshare.session.role
        this.liveshare.onDidChangeSession(e => this.sessionRole = e.session.role, null)
    }

    private set sessionRole(role: vsls.Role) {
        this.reset(role)
        if (this.role === vsls.Role.Guest) {
            void this.initGuest()
        } else if (this.role === vsls.Role.Host) {
            void this.initHost()
        }
    }

    private reset(role: vsls.Role) {
        this.role = role
        this.hostServerPort = null
        this.shareServerDisposable?.dispose()
        lw.hostConnection.resetConnectionToHost()
    }

    get isGuest(): boolean {
        return this.role === vsls.Role.Guest
    }

    get isHost(): boolean {
        return this.role === vsls.Role.Host
    }

    private async initGuest() {
        await this.getHostServerPort()
        await lw.hostConnection.connectToHostWs()
    }

    public async getHostServerPort(reset: boolean = false): Promise<number> {
        if (!reset && this.hostServerPort !== undefined && this.hostServerPort !== null) {
            return this.hostServerPort
        }
        else {
            const savedClipboard = await vscode.env.clipboard.readText()
            void vscode.commands.executeCommand('liveshare.listServers')
            // delay here instead of doing await vscode.commands.executeCommand acquires the port more reliably because await vscode.commands.executeCommand does not return until the user closes the info box of the command or clicks copy again.
            await utils.delay(500)
            const hostUrl = await vscode.env.clipboard.readText()
            const hostServerPort = Number(url.parse(hostUrl).port)
            this.hostServerPort = hostServerPort
            await vscode.env.clipboard.writeText(savedClipboard)
            return hostServerPort
        }
    }

    public async shareServer() {
        if (!this.isHost) {
            return
        }
        if (this.shareServerDisposable !== null) {
            this.shareServerDisposable?.dispose()
        }
        this.shareServerDisposable = await this.liveshare?.shareServer({ port: lw.server.getLocalPort(), displayName: 'latex-workshop-server' })
    }

    private async initHost() {
        await this.shareServer()
    }
}
