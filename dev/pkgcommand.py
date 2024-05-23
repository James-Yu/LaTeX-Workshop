# python pkgcommand.py -a -o ../dev/packages
# python pkgcommand.py -o ../data/packages

import json
import argparse
import sys
import dataclasses
from pathlib import Path
from typing import List
from pyintel import CwlIntel

FILES_TO_IGNORE = ['diagxy.cwl', 'calculator.cwl', 'calculus.cwl', 'expl3.cwl']
FILES_TO_REMOVE_SPACES_IN = ['chemformula.cwl', 'context-document.cwl', 'class-beamer.cwl', 'csquotes.cwl', 'datatool.cwl', 'newclude.cwl', 'pgfplots.cwl', 'tabu.cwl', 'tikz.cwl']

CWD = Path(__file__).expanduser().resolve().parent
UNIMATHSYMBOLS = CWD.joinpath('unimathsymbols.txt').resolve()
COMMANDS_FILE = CWD.joinpath('../data/commands.json').resolve()
ENVS_FILE = CWD.joinpath('../data/environments.json').resolve()
OUT_DIR = CWD.joinpath('../data/packages').resolve()
INFILES = None

parser = argparse.ArgumentParser()
parser.add_argument('-o', '--outdir', help=f'Directory where to write the JSON files. Default is {OUT_DIR}', type=str)
parser.add_argument('-i', '--infile', help='Files to process. Default is the content from cwl.list and cwl/ folder', type=str, nargs='+')
parser.add_argument('-a', '--all', help='Process all .cwl files in cwl/ folder', action='store_true')
args = parser.parse_args()

if args.outdir:
    OUT_DIR = Path(args.outdir).expanduser().resolve()
    if not OUT_DIR.is_dir():
        print(f'The path passed to --outdir is not a directory: {args.outdir}')
        sys.exit(0)
if args.infile:
    INFILES = args.infile
if args.all:
    INFILES = [f for f in CWD.joinpath('cwl').iterdir() if f.suffix == '.cwl']


def get_cwl_files() -> List[Path]:
    """ Get the list of cwl files from github if not already available on disk."""
    files = []
    with open('cwl.list', mode='r', encoding='utf8') as l:
        candidates = l.read().splitlines()
    for f in CWD.joinpath('cwl').iterdir():
        if f.suffix == '.cwl' and f.name in candidates:
            files.append(f)
    return files

def dump_dict(dictionary, out_json):
    if dictionary != {}:
        json.dump(dictionary, open(out_json, 'w', encoding='utf8'), indent=2, ensure_ascii=False)


def parse_cwl_files(cwl_files):
    cwlIntel = CwlIntel(COMMANDS_FILE, ENVS_FILE, UNIMATHSYMBOLS)
    for cwl_file in cwl_files:
        # Skip some files
        print(cwl_file)
        if cwl_file.name in FILES_TO_IGNORE:
            continue
        remove_spaces = False
        if cwl_file.name in FILES_TO_REMOVE_SPACES_IN:
            remove_spaces = True
        pkg = cwlIntel.parse_cwl_file(cwl_file, remove_spaces)
        with open(OUT_DIR.joinpath(change_json_name(cwl_file.stem) + '.json'), 'w', encoding='utf8') as fp:
            json.dump(dataclasses.asdict(pkg, dict_factory=lambda x: {k: v for (k, v) in x if v is not None}), fp, indent=2, ensure_ascii=False)

def change_json_name(file_stem):
    if (file_stem in ['yathesis']):
        return 'class-' + file_stem
    return file_stem

if __name__ == '__main__':
    if INFILES is None:
        cwl_files = get_cwl_files()
    else:
        # Convert to an array of Path objects
        cwl_files = [Path(f) for f in INFILES]

    parse_cwl_files(cwl_files)
