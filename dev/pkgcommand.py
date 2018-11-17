import json
import urllib.request
import zipfile
from os import listdir, remove
from os.path import isfile, join

commands = json.load(open('../data/commands.json', encoding='utf8'))
pkgcmds = {}
envs = json.load(open('../data/environments.json', encoding='utf8'))
urllib.request.urlretrieve('https://github.com/LaTeXing/LaTeX-cwl/archive/master.zip', 'cwl.zip')
zip_ref = zipfile.ZipFile('cwl.zip', 'r')
zip_ref.extractall('cwl/')
zip_ref.close()
remove('cwl.zip')

cwl_files = []
for f in listdir('cwl/LaTeX-cwl-master'):
    if isfile(join('cwl/LaTeX-cwl-master', f)) and f[-4:] == '.cwl':
        cwl_files.append(f)
    else:
        remove(join('cwl/LaTeX-cwl-master', f))

for cwl_file in cwl_files:
    with open(join('cwl/LaTeX-cwl-master', cwl_file), encoding='utf8') as f:
        lines = f.readlines()
    for line in lines:
        if line[0] == '#':
            continue
        if line[:7] == '\\begin{':
            env = line[line.index('{') + 1:line.index('}')]
            if env in envs:
                continue
            envs.append(env)
        if line[:5] == '\\end{':
            continue
        if line[0] != '\\':
            continue
        try:
            curly = line.index('{')
        except:
            curly = 10000
        try:
            squared = line.index('[')
        except:
            squared = 10000
        try:
            hash_ = line.index('#')
        except:
            hash_ = 10000
        if min(curly, squared, hash_) == 10000:
            command = line[1:]
        else:
            command = line[1:min(curly, squared, hash_)]
        if command[-1] == '\n':
            command = command[:-1]
        if command in commands:
            continue
        command_dict = { 'command': command, 'detail': f'Provided by `{cwl_file[:-4]}`.' }
        if line.count('{') > 0:
            command_dict['snippet'] = command + \
                ''.join(['{${' + str(index + 1) + '}}' for index in range(line.count('{'))])
        pkgcmds[command] = command_dict

    remove(join('cwl/LaTeX-cwl-master', cwl_file))

json.dump(envs, open('../data/environments.json', 'w', encoding='utf8'), indent=2)
json.dump(pkgcmds, open('../data/packagecommands.json', 'w', encoding='utf8'), indent=2)
