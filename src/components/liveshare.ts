import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as vscode from 'vscode'
import * as vsls from 'vsls/vscode'
import { Extension } from 'src/main'

const serviceName = 'pdfSync'
const pdfUpdateNotificationName = 'pdfUpdated'
const requestPdfRequestName = 'getPdf'
const invokeRemoteCommandRequestName = 'invokeRemoteCommand'
const logUpdateNotificationName = 'logUpdated'
const compilerUpdateNotificationName = 'compilerUpdated'

interface PdfArgs {
    relativePath: string,
    content: string
}

export class LiveShare {

    private readonly extension: Extension

    private liveshare: vsls.LiveShare | undefined | null
    private hostService: vsls.SharedService | undefined | null
    private guestService: vsls.SharedServiceProxy | undefined | null
    private role: vsls.Role = vsls.Role.None

    constructor(extension: Extension) {
        this.extension = extension
        this.init()
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
        if (this.role === vsls.Role.Guest) {
            this.initGuest()
        } else if (this.role === vsls.Role.Host) {
            this.initHost()
        }
    }

    getOutDir(fullPath: string | undefined): string {
        if (this.role === vsls.Role.Guest) {
            return `${os.tmpdir}/LiveShareLatex`
        } else {
            return this.extension.manager.getOutDir(fullPath)
        }
    }

    get isGuest(): boolean {
        return this.role === vsls.Role.Guest
    }

    get isHost(): boolean {
        return this.role === vsls.Role.Host
    }

    remoteCommand(command: string, callback: (...args: any[]) => any) {
        return (...args: any[]) => {
            if (!this.isGuest) {
                return callback(...args)
            }
            if (this.guestService) {
                this.guestService.request(invokeRemoteCommandRequestName, [command, args])
            }
        }
    }

    /********************************************************************
     *
     * Host
     *
     * *****************************************************************/

    private async initHost() {
        if (this.liveshare) {
            this.hostService = await this.liveshare.shareService(serviceName)
            if (this.hostService) {
                this.hostService.onRequest(requestPdfRequestName, async (args: any[]) => await this.onRequestPdf(args[0]))
                this.hostService.onRequest(invokeRemoteCommandRequestName, (args: any[]) => { this.invokeRemoteCommand(args[0], args[1]) })
            }
        }
    }

    private getPathRelativeToOutDir(fullPath: string) {
        const outDir = this.getOutDir(fullPath)
        return path.relative(outDir, fullPath)
    }

    private async getPdfArgs(pdfPath: string): Promise<PdfArgs> {
        const content = await fs.promises.readFile(pdfPath)
        return {
            relativePath: this.getPathRelativeToOutDir(pdfPath),
            content: content.toString('binary')
        }
    }

    private async onRequestPdf(relativeTexPath: string) {
        const texPath = this.liveshare?.convertSharedUriToLocal(vscode.Uri.parse(relativeTexPath).with({ scheme: 'vsls' })) as vscode.Uri
        const pdfPath = this.extension.manager.tex2pdf(texPath.fsPath)
        this.extension.manager.watchPdfFile(pdfPath)
        const fileArgs = await this.getPdfArgs(pdfPath)
        return fileArgs
    }

    private invokeRemoteCommand(command: string, rest: any[]) {
        return vscode.commands.executeCommand(command, ...rest)
    }

    async sendPdfUpdateToGuests(pdfPath: string) {
        if (this.hostService) {
            const fileArgs = await this.getPdfArgs(pdfPath)
            this.hostService.notify(pdfUpdateNotificationName, fileArgs)
        }
    }

    sendLogUpdateToGuests(message: string) {
        if (this.hostService) {
            this.hostService.notify(logUpdateNotificationName, { message })
        }
    }

    sendCompilerUpdateToGuests(message: string) {
        if (this.hostService) {
            this.hostService.notify(compilerUpdateNotificationName, { message })
        }
    }

    /********************************************************************
     *
     * Guest
     *
     * *****************************************************************/

    private async initGuest() {
        if (this.liveshare) {
            this.guestService = await this.liveshare.getSharedService(serviceName)
            if (this.guestService) {
                this.guestService.onNotify(pdfUpdateNotificationName, async (args) => await this.onPdfUpdated(args as PdfArgs))
                this.guestService.onNotify(logUpdateNotificationName, async (args) => await this.onLogUpdated((args as any).message))
                this.guestService.onNotify(compilerUpdateNotificationName, async (args) => await this.onCompilerUpdated((args as any).message))
            }
        }
    }

    private getPathWithOutDir(relativePath: string) {
        const outDir = this.getOutDir(relativePath)
        return path.join(outDir, relativePath)
    }

    private async writePdf(pdfArgs: PdfArgs) {
        const buffer = new Buffer(pdfArgs.content, 'binary')
        const pdfPath = this.getPathWithOutDir(pdfArgs.relativePath)
        try {
            await fs.promises.mkdir(path.dirname(pdfPath))
        } catch { /* directory already exists */ }
        await fs.promises.writeFile(pdfPath, buffer)
    }

    private async onPdfUpdated(fileArgs: PdfArgs) {
        await this.writePdf(fileArgs)
    }

    private async onLogUpdated(message: string) {
        this.extension.logger.addLogMessage(`[Remote] ${message}`)
    }

    private async onCompilerUpdated(message: string) {
        this.extension.logger.addCompilerMessage(`[Remote] ${message}`)
    }

    async requestPdf(texPath: string) {
        if (this.guestService) {
            const results = await this.guestService.request(requestPdfRequestName, [texPath])
            await this.writePdf(results)
        }
    }

}
