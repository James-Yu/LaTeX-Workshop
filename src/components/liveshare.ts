import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import * as vsls from 'vsls/vscode'

const serviceName = 'latexFiles'
const fileUpdatedNotificationName = 'fileUpdated'

interface FileUpdatedArgs {
    fileName: string,
    content: string
}

export class LiveShare {

    private liveshare: vsls.LiveShare | undefined | null
    private hostService: vsls.SharedService | undefined | null
    private role: vsls.Role = vsls.Role.None

    constructor() {
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
        if (this.sessionRole === vsls.Role.Guest) {
            this.initGuest()
        } else if (this.sessionRole === vsls.Role.Host) {
            this.initHost()
        }
    }

    private async initHost() {
        if (this.liveshare) {
            this.hostService = await this.liveshare.shareService(serviceName)
        }
    }

    private async initGuest() {
        if (this.liveshare) {
            const service = await this.liveshare.getSharedService(serviceName)
            if (!service) {
                return
            }
            service.onNotify(fileUpdatedNotificationName, (args) => {
                const fileUpdatedArgs = args as FileUpdatedArgs
                const buffer = new Buffer(fileUpdatedArgs.content, 'binary')
                fs.promises.writeFile(`${os.tmpdir}/LiveShareLatex/${fileUpdatedArgs.fileName}`, buffer)
            })
        }
    }

    get isGuest(): boolean {
        return this.role === vsls.Role.Guest
    }

    async sendFileUpdateToGuests(filePath: string) {
        if (this.hostService) {
            const content = await fs.promises.readFile(filePath)
            const fileUpdatedArgs: FileUpdatedArgs = {
                fileName: path.basename(filePath),
                content: content.toString('binary')
            }
            this.hostService.notify(fileUpdatedNotificationName, fileUpdatedArgs)
        }
    }

}
