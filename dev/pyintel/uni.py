'''
This script parses uni-math symbols from
http://milde.users.sourceforge.net/LUCR/Math/data/unimathsymbols.txt
and save the result as a json file.
The result is used to generate command intellisense for LaTeX Workshop.
'''

import json

def remove_relation_character(description):
    """
    From unimathsymbols.txt
    8. descriptive _`comments`

        The descriptive comments provide more information about the
        character, or its specific appearance or use.

        Some descriptions contain references to related commands,
        marked by a character describing the relation

        :=:  equals  (alias commands),
        :#:  approx  (compat mapping, different character with same glyph),
        :x:  → cross reference/see also (related, false friends, and name clashes),
        :t:  text    (text mode command),

        followed by requirements in parantheses, and
        delimited by commas.
    """
    tokens = description.split(',')
    sanitized_description_items = []
    for tok in tokens:
        t = tok.strip()
        if t[0] in ('x', '#', '=', 't') and t[1] == ' ':
            t = t[2:]
        sanitized_description_items.append(t)
    return ', '.join(sanitized_description_items)


def generate_unimathsymbols_intel(infile, json_out):
    """
    Generate intellisense data in json format for the unicode math symbols

    :param infile: unimathsymbols.txt
    :param json_out: the path to the unimathsymbols.json file
    """
    data = {}

    with open(infile, encoding='utf-8') as f:
        for line in f:
            if line[0] == '#':
                continue
            segments = line.split('^')
            if segments[3] == '':
                continue
            if segments[3][0] == '\\':
                segments[3] = segments[3][1:]
            data[segments[3]] = {
                'command': segments[3],
                'detail': segments[1],
                # 'documentation': segments[7].strip().capitalize()
                'documentation': remove_relation_character(segments[7]).capitalize()
            }
            if segments[6] != '' and segments[6][0] != '-':
                data[segments[3]]['detail'] += f' ("{segments[6]}" command)'

    json.dump(data, open(json_out, 'w', encoding='utf-8'),
            indent=2, separators=(',', ': '), sort_keys=True, ensure_ascii=False)
