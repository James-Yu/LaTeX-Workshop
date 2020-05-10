from pathlib import Path
import json

# From the shell, run
# sed 's/.*commands:>[^=]*={\([^}]*\)}.*$/\1/' interface3.idx | awk '{print $2;}' | sed 's/\\verb\*&\([^&]*\)&/\1/g' | sed 's/!//g' | sed 's/\\_/_/g' | sort | uniq > expl3.cwl
# 
# Then, some lines have to be manually removed

cmds = []
for line in open('expl3.cwl', encoding='utf8'):
    c = line.rstrip()
    if c.endswith('TF'):
        root_c = c[0:-2]
        for suffix in ['T', 'F', 'TF']:
            cmds.append(root_c + suffix)
    else:
        cmds.append(c)

with open('expl3-2.cwl', encoding='utf8', mode='w') as fp:
    fp.writelines([c + '\n' for c in cmds])
