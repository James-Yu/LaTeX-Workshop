"""Run an instrumented PDF refresh test in a disposable VS Code profile."""
from pathlib import Path
import argparse, json, os, subprocess, tempfile
p=argparse.ArgumentParser()
p.add_argument('--code',required=True,help='Path to the VS Code application executable')
p.add_argument('--cycles',type=int,default=30)
p.add_argument('--baseline',action='store_true',help='Record baseline accumulation without asserting one live worker')
a=p.parse_args()
source=Path(__file__).resolve().parent
root=source.parents[1]
lab=Path(tempfile.mkdtemp(prefix='lw-refresh-test-'))
import shutil
shutil.copytree(source/'assets',lab/'assets')
shutil.copy(source/'integration.cjs',lab/'integration.cjs')
html=(root/'viewer/viewer.html').read_text().replace('<head>','<head>\n<script src="lab-prelude.mjs"></script>\n<script src="lab-render-test.mjs" type="module"></script>')
(lab/'assets/viewer.html').write_text(html)
(lab/'assets/lab-test-config.json').write_text(json.dumps({'count':a.cycles,'kind':'baseline' if a.baseline else 'candidate'}))
(lab/'project').mkdir()
(lab/'project/fixture.tex').write_text('% Synthetic test fixture; no compilation is needed.\n')
# A public, generated three-page PDF. No manuscript or private project is needed.
objects=[b'<< /Type /Catalog /Pages 2 0 R >>',b'<< /Type /Pages /Kids [3 0 R 5 0 R 7 0 R] /Count 3 >>']
for i in range(3):
    stream=('BT /F1 18 Tf 72 700 Td (Refresh test page '+str(i+1)+') Tj ET').encode()
    objects.append(('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 9 0 R >> >> /Contents '+str(4+2*i)+' 0 R >>').encode())
    objects.append(b'<< /Length '+str(len(stream)).encode()+b' >>\nstream\n'+stream+b'\nendstream')
objects.append(b'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>')
data=b'%PDF-1.4\n';offsets=[0]
for i,obj in enumerate(objects,1):
    offsets.append(len(data));data+=str(i).encode()+b' 0 obj\n'+obj+b'\nendobj\n'
xref=len(data);data+=b'xref\n0 10\n0000000000 65535 f \n'
for pos in offsets[1:]: data+=f'{pos:010d} 00000 n \n'.encode()
data+=f'trailer\n<< /Size 10 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n'.encode()
(lab/'project/fixture.pdf').write_bytes(data)
(lab/'user-data/User').mkdir(parents=True)
(lab/'argv.json').write_text('{"enable-crash-reporter":false,"disable-hardware-acceleration":true}')
(lab/'user-data/User/settings.json').write_text(json.dumps({'update.mode':'none','extensions.autoUpdate':False,'telemetry.telemetryLevel':'off','security.workspace.trust.enabled':False,'latex-workshop.latex.autoBuild.run':'never','latex-workshop.view.pdf.viewer':'tab'}))
args=[a.code,'--user-data-dir='+str(lab/'user-data'),'--extensions-dir='+str(lab/'extensions'),'--extensionDevelopmentPath='+str(root),'--extensionTestsPath='+str(lab/'integration.cjs'),'--disable-gpu','--skip-welcome','--skip-release-notes','--new-window',str(lab/'project')]
print('Results and disposable profile:',lab,flush=True)
with (lab/'test.log').open('w') as log:
    result=subprocess.run(args,env={**os.environ,'VSCODE_PORTABLE':str(lab)},stdout=log,stderr=subprocess.STDOUT,timeout=1800)
print((lab/'test.log').read_text())
raise SystemExit(result.returncode)
