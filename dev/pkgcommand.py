import json
import urllib.request
import zipfile
from shutil import copy
from pathlib import Path
from typing import List
from pyintel import CwlIntel

FILES_TO_IGNORE = ['diagxy.cwl']
FILES_TO_REMOVE_SPACES_IN = ['chemformula.cwl', 'context-document.cwl', 'class-beamer.cwl', 'csquotes.cwl', 'datatool.cwl', 'newclude.cwl', 'pgfplots.cwl', 'tabu.cwl', 'tikz.cwl']

CWD = Path(__file__).expanduser().resolve().parent
UNIMATHSYMBOLS = CWD.joinpath('unimathsymbols.txt').resolve()
COMMANDS_FILE = CWD.joinpath('../data/commands.json').resolve()
ENVS_FILE = CWD.joinpath('../data/environments.json').resolve()
OUT_DIR = CWD.joinpath('../data/packages').resolve()


def get_cwl_files() -> List[Path]:
    """ Get the list of cwl files from github if not already available on disk."""
    cwl_zip = CWD.joinpath('cwl.zip')
    if not cwl_zip.exists:
        urllib.request.urlretrieve('https://github.com/LaTeXing/LaTeX-cwl/archive/master.zip', cwl_zip)
    zip_ref = zipfile.ZipFile(cwl_zip, 'r')
    zip_ref.extractall(CWD.joinpath('cwl/'))
    zip_ref.close()
    files = []
    for f in CWD.joinpath('cwl/LaTeX-cwl-master').iterdir():
        if f.suffix == '.cwl':
            files.append(f)
    return files


def parse_cwl_files():
    cwl_files = get_cwl_files()
    cwlIntel = CwlIntel(COMMANDS_FILE, ENVS_FILE, UNIMATHSYMBOLS)
    for cwl_file in cwl_files:
        # Skip some files
        if cwl_file.name in FILES_TO_IGNORE:
            continue
        remove_spaces = False
        if cwl_file.name in FILES_TO_REMOVE_SPACES_IN:
            remove_spaces = True
        (pkg_cmds, pkg_envs) = cwlIntel.parse_cwl_file(cwl_file, remove_spaces)
        if pkg_envs:
            json.dump(pkg_envs, open(OUT_DIR.joinpath(cwl_file.stem + '_env.json'), 'w', encoding='utf8'), indent=2, ensure_ascii=False)
        if pkg_cmds != {}:
            json.dump(pkg_cmds, open(OUT_DIR.joinpath(cwl_file.stem + '_cmd.json'), 'w', encoding='utf8'), indent=2, ensure_ascii=False)


parse_cwl_files()
# Handle aggregated files
for scr in ['scrartcl', 'scrreprt', 'scrbook']:
    dest = OUT_DIR.joinpath('class-' + scr)
    copy(OUT_DIR.joinpath('class-scrartcl,scrreprt,scrbook_cmd.json'), dest.as_posix() + '_cmd.json')
    copy(OUT_DIR.joinpath('class-scrartcl,scrreprt,scrbook_env.json'), dest.as_posix() + '_env.json')
