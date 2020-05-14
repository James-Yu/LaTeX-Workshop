from pathlib import Path
import re
import json
import itertools

dtx_files = Path('/usr/local/texlive/2019/texmf-dist/source/latex/l3kernel/').glob('*.dtx')
dtx_files_to_ignore = ['l3doc.dtx']

def exclude(entry: str) -> bool:
    return not re.match(r'\\(?!(?:::)|(?:__))', entry)

def expand_variants(entry: str, options):
    if options is None:
        return [entry]
    if 'pTF' in options:
        try:
            (base, signature) = entry.split(':')
            variants = [base + '_p:' + signature]
            variants.extend([entry + v for v in ('T', 'F', 'TF')])
            return variants
        except ValueError as e:
            print(f'Wrong format for {entry} with {options}')
            print('\t', e)
            return []
    elif 'TF' in options:
        return [entry + v for v in ('T', 'F', 'TF')]
    elif 'noTF' in options:
        return [entry + v for v in ('', 'T', 'F', 'TF')]
    else:
        return [entry]


def parse_doc_block(block_content: str, _type: str):
    objs = []
    for  match in re.findall(rf'\\begin{{{_type}}}(?:\[([^\]]*)\])?[\s\n%]*{{([^}}]*)}}', block_content, flags=re.M):
        options = [o.strip() for o in match[0].split(',')]
        entries_str = match[1].replace('%', '')
        entries = [m for m in (o.strip() for o in ''.join(entries_str).split(',')) if not exclude(m)]
        expanded_entries = [x for e in entries for x in expand_variants(e, options)]
        objs.extend(expanded_entries)
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
        if any(f.match(i) for i in dtx_files_to_ignore):
            continue
        ans = parse_file(f.as_posix(), 'function')
        ans.extend(parse_file(f.as_posix(), 'variable'))
        if len(ans) > 0:
            entries[f.name] = list(set(ans))
    return entries

entries_dict = parse_all_files()
entries_array = list(set(itertools.chain.from_iterable(entries_dict.values())))
json.dump(entries_dict, open('funcs.json', 'w'), indent=2)
with open('expl3.cwl', encoding='utf8', mode='w') as fp:
    fp.writelines([e + '\n' for e in entries_array])
