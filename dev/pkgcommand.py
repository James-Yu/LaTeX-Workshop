import json
import urllib.request
import zipfile
from shutil import copy
import argparse
import sys
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
INFILES = None

parser = argparse.ArgumentParser()
parser.add_argument('-o', '--outdir', help='Directory where to write the JSON files. Default is {}'.format(OUT_DIR), type=str)
parser.add_argument('-i', '--infile', help='Files to process. Default is the content of https://github.com/LaTeXing/LaTeX-cwl/', type=str, nargs='+')
args = parser.parse_args()

if args.outdir:
    OUT_DIR = Path(args.outdir).expanduser().resolve()
    if not OUT_DIR.is_dir():
        print('The path passed to --outdir is not a directory: {}'.format(args.outdir))
        sys.exit(0)
if args.infile:
    INFILES = args.infile


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

def dump_dict(dictionnary, out_json):
    if dictionnary != {}:
        json.dump(dictionnary, open(out_json, 'w', encoding='utf8'), indent=2, ensure_ascii=False)


def parse_cwl_files(cwl_files):
    cwlIntel = CwlIntel(COMMANDS_FILE, ENVS_FILE, UNIMATHSYMBOLS)
    for cwl_file in cwl_files:
        # Skip some files
        if cwl_file.name in FILES_TO_IGNORE:
            continue
        remove_spaces = False
        if cwl_file.name in FILES_TO_REMOVE_SPACES_IN:
            remove_spaces = True
        (pkg_cmds, pkg_envs) = cwlIntel.parse_cwl_file(cwl_file, remove_spaces)
        dump_dict(pkg_envs, OUT_DIR.joinpath(cwl_file.stem + '_env.json'))
        dump_dict(pkg_cmds, OUT_DIR.joinpath(cwl_file.stem + '_cmd.json'))


if __name__ == '__main__':
    do_copy = False
    if INFILES is None:
        cwl_files = get_cwl_files()
        do_copy = True
    else:
        # Convert to an array of Path objects
        cwl_files = [Path(f) for f in INFILES]

    parse_cwl_files(cwl_files)

    if do_copy:
        # Handle aggregated files
        for scr in ['scrartcl', 'scrreprt', 'scrbook']:
            dest = OUT_DIR.joinpath('class-' + scr)
            copy(OUT_DIR.joinpath('class-scrartcl,scrreprt,scrbook_cmd.json'), dest.as_posix() + '_cmd.json')
            copy(OUT_DIR.joinpath('class-scrartcl,scrreprt,scrbook_env.json'), dest.as_posix() + '_env.json')
