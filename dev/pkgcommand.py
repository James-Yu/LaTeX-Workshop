import json
import os.path
import urllib.request
import zipfile
from os import listdir, remove
from os.path import isfile, join, basename, splitext
import re
from typing import List, Set, Dict, Tuple, Union, Optional

commands = json.load(open('../data/commands.json', encoding='utf8'))
envs = json.load(open('../data/environments.json', encoding='utf8'))


class PlaceHolder:
    count: int
    usePlaceHolders: bool

    def __init__(self):
        self.count = 0
        self.usePlaceHolders = True

    def setUsePlaceHolders(self, trueOrFalse):
        self.usePlaceHolders = trueOrFalse

    def sub(self, matchObject) -> str:
        self.count += 1
        name = ''
        if self.usePlaceHolders:
            name = ':' + matchObject.group(2)
        return matchObject.group(1) + '${' + str(self.count) + name + '}' + matchObject.group(3)


def get_unimathsymbols_file():
    if not os.path.exists('unimathsymbols.txt'):
        urllib.request.urlretrieve('http://milde.users.sourceforge.net/LUCR/Math/data/unimathsymbols.txt', # noqa
                                   'unimathsymbols.txt')


def parse_unimathsymbols_file() -> Dict[str, Dict[str, str]]:
    get_unimathsymbols_file()
    with open(join('unimathsymbols.txt'), encoding='utf8') as f:
        lines = f.readlines()
    unimath_dict: Dict[str, Dict[str, str]] = {}
    for line in lines:
        cmds: List[str] = []
        if line[0] == '#':
            continue
        line = line.strip()
        arry = line.split('^')
        cmds.append(re.sub(r'^\\', '', arry[2]))
        cmds.append(re.sub(r'^\\', '', arry[3]))
        for m in re.finditer(r'= \\(\w+)[ ,]', arry[-1]):
            cmds.append(m.group(1))
        doc = re.sub(r'\s*[\=#xt]\s*\\\w+(\{.*?\})?\s*(\(.*?\))?\s*,', '', arry[-1])
        doc = re.sub(r'\s*[\=#xt]\s*\S+\s*,', '', doc)
        doc = doc.strip()
        for c in cmds:
            if c == '' or re.search('{', c):
                continue
            unimath_dict[c] = {'detail': arry[1], 'documentation': doc}
    return unimath_dict


def get_cwl_files() -> List[str]:
    """ Get the list of cwl files from github """
    if not os.path.exists('cwl.zip'):
        urllib.request.urlretrieve('https://github.com/LaTeXing/LaTeX-cwl/archive/master.zip',
                                   'cwl.zip')
    zip_ref = zipfile.ZipFile('cwl.zip', 'r')
    zip_ref.extractall('cwl/')
    zip_ref.close()
#    remove('cwl.zip')
    files = []
    for f in listdir('cwl/LaTeX-cwl-master'):
        if isfile(join('cwl/LaTeX-cwl-master', f)) and f[-4:] == '.cwl':
            files.append(f)
        else:
            remove(join('cwl/LaTeX-cwl-master', f))
    return files


def parse_cwl_file(
        file: str,
        unimath_dict: Dict[str, Dict[str, str]]
) -> Tuple[Dict[str, Dict[str, str]], List[str]]:
    with open(join('cwl/LaTeX-cwl-master', file), encoding='utf8') as f:
        lines = f.readlines()
    pkgcmds: Dict[str, Dict[str, str]] = {}
    pkgenvs: List[str] = []
    for line in lines:
        line = line.rstrip()
        if not line:
            continue
        if line[0] == '#':
            continue
        index_hash = line.find('#')
        if index_hash >= 0:
            line = line[:index_hash]
        if line[:7] == '\\begin{':
            env = line[line.index('{') + 1:line.index('}')]
            if env in envs:
                continue
            pkgenvs.append(env)
            continue
        if line[:5] == '\\end{':
            continue
        if line[0] != '\\':
            continue

        line = line[1:]  # Remove leading '\'
        curly_index = line.find('{')
        square_index = line.find('[')
        # if square_index == -1 and curly_index > -1:
        #     # If there is no optional argument, do not put the arguments in the snippet command
        #     command = line[:curly_index]
        # else:
        command = line
        name = re.sub(r'(\{|\[)[^\{\[\$]*(\}|\])', r'\1\2', command)
        package = splitext(basename(file))[0]
        command_dict: Dict[str, str] = {'command': command, 'package': package}
        snippet = line
        if name in commands:
            continue

        p = PlaceHolder()
        if square_index < curly_index:
            # If all the optional args are before {}, we number the {} first
            snippet = re.sub(r'(\{)([^\{\$]*)(\})', p.sub, snippet)
            snippet = re.sub(r'(\[)([^\[\$]*)(\])', p.sub, snippet)
        else:
            snippet = re.sub(r'(\{|\[)([^\{\[\$]*)(\}|\])', p.sub, snippet)

        command_dict['snippet'] = snippet
        if unimath_dict.get(name):
            command_dict['detail'] = unimath_dict[name]['detail']
            command_dict['documentation'] = unimath_dict[name]['documentation']
        pkgcmds[name] = command_dict
    remove(join('cwl/LaTeX-cwl-master', file))
    return (pkgcmds, pkgenvs)


unimath_dict = parse_unimathsymbols_file()
cwl_files = get_cwl_files()
for cwl_file in cwl_files:
    (pkgCmds, pkgEnvs) = parse_cwl_file(cwl_file, unimath_dict)
    if pkgEnvs:
        json.dump(pkgEnvs,
                  open(f'../data/packages/{cwl_file[:-4]}_env.json', 'w', encoding='utf8'),
                  indent=2)
    if pkgCmds != {}:
        json.dump(pkgCmds,
                  open(f'../data/packages/{cwl_file[:-4]}_cmd.json', 'w', encoding='utf8'),
                  indent=2,
                  ensure_ascii=False)
    # for cmd in pkgCmds:
    #     print(cmd, ': ', pkgCmds[cmd], sep = '')
