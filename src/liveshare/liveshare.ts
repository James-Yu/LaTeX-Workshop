import * as vsls from 'vsls/vscode'
import * as vscode from 'vscode'
import { lw } from '../lw'
import * as url from 'url'

export class LiveShare {
    private role: vsls.Role = vsls.Role.None

    private hostServerPort: number | undefined | null

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
    }

    get isGuest(): boolean {
        return this.role === vsls.Role.Guest
    }

    get isHost(): boolean {
        return this.role === vsls.Role.Host
    }

    private async initGuest() {
        await this.getHostServerPort()
    }

    public async getHostServerPort(): Promise<number> {
        if (this.hostServerPort !== undefined && this.hostServerPort !== null) {
            return this.hostServerPort
        }
        else {
            const savedClipboard = await vscode.env.clipboard.readText()
            await vscode.commands.executeCommand('liveshare.listServers')
            const hostUrl = await vscode.env.clipboard.readText()
            await vscode.env.clipboard.writeText(savedClipboard)
            const hostServerPort = Number(url.parse(hostUrl).port)
            this.hostServerPort = hostServerPort
            return hostServerPort
        }
    }

    private async initHost() {
        await this.liveshare?.shareServer({ port: lw.server.getPort(), displayName: 'latex-workshop-server' })
    }
}
