from pathlib import Path
import re
import json

dtx_files = Path('/usr/local/texlive/2019/texmf-dist/source/latex/l3kernel/').glob('*.dtx')

def parse_file(fpath, _type):
    objs = []
    inside_documentation = False
    with open(fpath) as fp:
        for line in fp:
            if re.search(r'\\begin{documentation}', line):
                inside_documentation = True
                continue
            if not inside_documentation:
                continue
            if re.search(r'\\end{documentation}', line):
                inside_documentation = False
                break
            match = re.search(rf'\\begin{{{_type}}}(?:\[[^\]]*\])?{{([^}}]*)}}', line)
            if match is not None:
                obj_str = match.group(1)
                objs.extend([m for m in (o.strip() for o in obj_str.split(',')) if m.startswith('\\')])
    return objs


functions = {}
for f in dtx_files:
    if f.match('l3doc.dtx'):
        continue
    ans = parse_file(f.as_posix(), 'function')
    ans.extend(parse_file(f.as_posix(), 'variable'))
    if len(ans) > 0:
        functions[f.name] = list(set(ans))

json.dump(functions, open('funcs.json', 'w'), indent=2)
