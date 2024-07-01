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
        this.role = role
        this.hostServerPort = null
        if (this.role === vsls.Role.Guest) {
            void this.initGuest()
        } else if (this.role === vsls.Role.Host) {
            void this.initHost()
        }
    }

    get isGuest(): boolean {
        return this.role === vsls.Role.Guest
    }

    get isHost(): boolean {
        return this.role === vsls.Role.Host
    }

    private initGuest() {
        setTimeout(async () => {
            await vscode.commands.executeCommand('liveshare.listServers')
            const hostUrl = await vscode.env.clipboard.readText()
            this.hostServerPort = Number(url.parse(hostUrl).port)
        }, 1000)
    }

    public async getHostServerPort(): Promise<number> {
        if (this.hostServerPort !== undefined && this.hostServerPort !== null) {
            return this.hostServerPort
        }
        else {
            await vscode.commands.executeCommand('liveshare.listServers')
            const hostUrl = await vscode.env.clipboard.readText()
            this.hostServerPort = Number(url.parse(hostUrl).port)
            return this.hostServerPort
        }
    }

    private async initHost() {
        await this.liveshare?.shareServer({ port: lw.server.getPort(), displayName: 'latex-workshop-server' })
    }
}
