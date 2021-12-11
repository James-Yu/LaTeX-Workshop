'''
This script fetches the latest list of packages and their descriptions
from CTAN at https://ctan.org/pkg and save the result as a json file.

The result is used to generate usepackage and documentclass
intellisense for LaTeX Workshop.
'''

from pathlib import Path
import json
from pyintel import CtanPkg

CTAN_SOURCE = 'https://ctan.org/json/2.0/packages'

ctanPkg = CtanPkg(Path('./extra-packagenames.json').absolute(), CTAN_SOURCE)
packages = ctanPkg.get_packages()
json.dump(packages, open('../data/packagenames.json', 'w+', encoding='utf-8'),
        separators=(',', ': '), sort_keys=True, indent=2, ensure_ascii=False)

classes = ctanPkg.get_classes()
json.dump(classes, open('../data/classnames.json', 'w+', encoding='utf-8'),
        separators=(',', ': '), sort_keys=True, indent=2, ensure_ascii=False)
