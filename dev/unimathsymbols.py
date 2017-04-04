'''
This script parses uni-math symbols from
http://milde.users.sourceforge.net/LUCR/Math/data/unimathsymbols.txt
and save the result as a json file.
The result is used to generate command intellisense for LaTeX Workshop.
'''

import json

data = {}

with open('unimathsymbols.txt', encoding='utf-8') as f:
    for line in f:
        if line[0] is '#':
            continue
        segments = line.split('^')
        if segments[3] is '':
            continue
        if segments[3][0] is '\\':
            segments[3] = segments[3][1:]
        data[segments[3]] = {
            'command': segments[3],
            'detail': segments[1],
            'documentation': segments[7].strip()
        }
        if segments[6] is not '' and segments[6][0] is not '-':
            data[segments[3]]['detail'] += ' ("{}" command)'.format(segments[6])

json.dump(data, open('unimathsymbols.json', 'w', encoding='utf-8'),
          indent=2, separators=(',', ': '), sort_keys=True, ensure_ascii=False)
