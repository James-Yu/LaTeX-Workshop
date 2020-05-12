from pathlib import Path
import re
import json

dtx_files = Path('/usr/local/texlive/2019/texmf-dist/source/latex/l3kernel/').glob('*.dtx')

def exclude(entry: str) -> bool:
    return not re.match(r'\\(?!(?:::)|(?:__))', entry)

def parse_doc_block(block_content, _type):
    objs = []
    for  match in re.findall(rf'\\begin{{{_type}}}(?:\[[^\]]*\])?[\s\n%]*{{([^}}]*)}}', block_content, flags=re.M):
        obj_str = match.replace('%', '')
        objs.extend([m for m in (o.strip() for o in ''.join(obj_str).split(',')) if not exclude(m)])
    return objs


def parse_file(fpath, _type):
    objs = []
    inside_documentation = False
    block_start = None
    block_end = None
    with open(fpath) as fp:
        lines = fp.readlines()
        # content = '\n'.join(lines)
        for i, line in enumerate(lines):
            if re.search(r'\\begin{documentation}', line):
                inside_documentation = True
                block_start = i
                continue
            if not inside_documentation:
                continue
            if inside_documentation and re.search(r'\\end{documentation}', line):
                inside_documentation = False
                block_end = i
                content = ''.join(lines[block_start:block_end])
                objs.extend(parse_doc_block(content, _type))
    return objs


def parse_all_files():
    entries = {}
    for f in dtx_files:
        if f.match('l3doc.dtx'):
            continue
        ans = parse_file(f.as_posix(), 'function')
        ans.extend(parse_file(f.as_posix(), 'variable'))
        if len(ans) > 0:
            entries[f.name] = list(set(ans))
    return entries

entries_dict = parse_all_files()
json.dump(entries_dict, open('funcs.json', 'w'), indent=2)

