import json
import urllib.request
import zipfile
from os import listdir, remove
from os.path import isfile, join
import re


commands = json.load(open('../data/commands.json', encoding='utf8'))
envs = json.load(open('../data/environments.json', encoding='utf8'))


class PlaceHolder:
    def __init__(self):
        self.count = 0
        self.usePlaceHolders = True

    def setUsePlaceHolders(self, trueOrFalse):
        self.usePlaceHolders = trueOrFalse

    def sub(self, matchObject):
        self.count += 1
        name = ''
        if self.usePlaceHolders:
            name = ':' + matchObject.group(2)
        return  matchObject.group(1) + '${' + str(self.count) + name + '}' + matchObject.group(3)

def get_cwl_files():
    """ Get the list of cwl files from github """
    urllib.request.urlretrieve('https://github.com/LaTeXing/LaTeX-cwl/archive/master.zip', 'cwl.zip')
    zip_ref = zipfile.ZipFile('cwl.zip', 'r')
    zip_ref.extractall('cwl/')
    zip_ref.close()
    remove('cwl.zip')
    files = []
    for f in listdir('cwl/LaTeX-cwl-master'):
        if isfile(join('cwl/LaTeX-cwl-master', f)) and f[-4:] == '.cwl':
            files.append(f)
        else:
            remove(join('cwl/LaTeX-cwl-master', f))
    return files


def parse_cwl_file(file):
    with open(join('cwl/LaTeX-cwl-master', file), encoding='utf8') as f:
        lines = f.readlines()
    pkgcmds = {}
    pkgenvs = []
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
        if square_index == -1 and curly_index > -1:
            # If there is no optional argument, do not put the arguments in the snippet command
            command = line[:curly_index]
        else:
            command = line
        name = re.sub(r'(\{|\[)[^\{\[\$]*(\}|\])', r'\1\2', command)
        command_dict = {'command': command}
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
        pkgcmds[name] = command_dict
    remove(join('cwl/LaTeX-cwl-master', file))
    return (pkgcmds, pkgenvs)



cwl_files = get_cwl_files()
for cwl_file in cwl_files:
    (pkgCmds, pkgEnvs) = parse_cwl_file(cwl_file)
    if pkgEnvs:
        json.dump(pkgEnvs, open(f'../data/packages/{cwl_file[:-4]}_env.json', 'w', encoding='utf8'), indent=2)
    if pkgCmds != {}:
        json.dump(pkgCmds, open(f'../data/packages/{cwl_file[:-4]}_cmd.json', 'w', encoding='utf8'), indent=2)
    # for cmd in pkgCmds:
    #     print(cmd, ': ', pkgCmds[cmd], sep = '')
