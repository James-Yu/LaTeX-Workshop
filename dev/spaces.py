from pathlib import Path
import json
import sys

cwd = Path(sys.argv[0]).parent
cmd_files = cwd.joinpath('../data/packages').glob('*.json')
all_cmds = {}
for f in cmd_files:
    f_cmds = json.load(open(f, encoding='utf8'))
    all_cmds.update(f_cmds.cmds)

cmds_with_spaces = {}
for key in all_cmds:
    if key.find(' ') >= 0:
        cmds_with_spaces[key] = all_cmds[key]

for entry in [(k, cmds_with_spaces[k]['package']) for k in cmds_with_spaces.keys()]:
    print(f'{entry[1]}: {entry[0]}')
