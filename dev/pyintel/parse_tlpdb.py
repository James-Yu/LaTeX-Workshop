#!/usr/bin/env python

#
# This software is Copyright (c) 2010-2016
# Adam Maxwell. All rights reserved.
# 
# Redistribution and use in source and binary forms, with or without
# modification, are permitted provided that the following conditions
# are met:
# 
# - Redistributions of source code must retain the above copyright
# notice, this list of conditions and the following disclaimer.
# 
# - Redistributions in binary form must reproduce the above copyright
# notice, this list of conditions and the following disclaimer in
# the documentation and/or other materials provided with the
# distribution.
# 
# - Neither the name of Adam Maxwell nor the names of any
# contributors may be used to endorse or promote products derived
# from this software without specific prior written permission.
# 
# THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
# "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
# LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
# A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
# OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
# SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
# LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
# DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
# THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
# (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
# OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
#
    
# Python 2.x and 3.x handle strings differently.  In python 3.x, all strings are unicode instances.  That means they
# don't have the decode() method.  As a hack, I'm testing the version number and using decode() only if the python
# version number is less than 3.
import sys
python_major_version = sys.version_info[0]

# Changed exception handlers to use 'except Exception as e'
# which breaks compatibility with python 2.5.x and earlier. According to
# some rando, Snow Leopard shipped with 2.6 as default, so this should be okay.
    
# sys.stdout has been changed between python 2 and 3.  The result is that when you write to sys.stdout, it accepts bytes
# rather than strings now.  This trips up plistlib.PlistWriter, which expects to be writing strings.  As a hack around
# that, I'm writing to a StringIO object, and then writing that to sys.stdout.  Not the best way of doing things, but
# until I know of something better, this is it.
import io
    
class TLPackage(object):
    """TeX Live Package
    
    Conceptually this is nothing more than a dictionary.  It's able to
    convert itself to an sqlite3 row and a dictionary value.
    
    """
    mirror = None
    
    def __init__(self):
        super(TLPackage, self).__init__()
        self.name = None
        self.category = None
        self.shortdesc = None
        self.longdesc = None
        self.catalogue = None
        self.relocated = 0
        
        self.runfiles = []
        self.runsize = None
        
        self.srcfiles = []
        self.srcsize = None
        
        self.docfiles = []
        self.docsize = None
        
        # maps keys (doc filenames) to maps of attributes (details, language)
        self.docfiledata = {}
        
        self.executes = []
        self.postactions = []
        
        # maps keys (arch name) to lists of files
        self.binfiles = {}
        # maps keys (arch name) to integer size
        self.binsize = {}
        
        self.depends = []
        self.revision = None
        
        self.cataloguedata = {}
        
        self.extradata = {}
        
    def add_pair(self, key, value):
        """For data that I don't care about at the moment"""
        self.extradata[key] = value
        
    def __str__(self):
        return repr(self)
        
    def __repr__(self):
        s = "%s: %s\n  srcsize=%s\n  srcfiles=%s" % (self.name, self.shortdesc, self.srcsize, self.srcfiles)
        s += "\n  binsize = %s\n  binfiles = %s" % (self.binsize, self.binfiles)
        s += "\n  docsize = %s\n  docfiles = %s\n  docfiledata = %s" % (self.docsize, self.docfiles, self.docfiledata)
        s += "\n  runsize = %s\n  runfiles = %s" % (self.runsize, self.runfiles)
        s += "\n  depends = %s" % (self.depends)
        s += "\n  longdesc = %s" % (self.longdesc)
        s += "\n  cataloguedata = %s" % (self.cataloguedata)
        for k in self.extradata:
            s += "\n  %s = %s" % (k, self.extradata[k])
        return s
        
    def dictionary_value(self):
        """Returns a dictionary with name as key and attributes as key-value pairs.
        
        NOTE: not all attributes are saved, because I don't need all of them.  So if
        you don't see one in the plist, it may just need to be added as a line here.
        
        """
        kv = {}
        kv["name"] = self.name
        if self.category: kv["category"] = self.category
        if self.revision: kv["revision"] = self.revision
        if self.shortdesc: kv["shortDescription"] = self.shortdesc
        if self.longdesc: kv["longDescription"] = self.longdesc
        if self.catalogue: kv["catalogue"] = self.catalogue
        if self.runfiles: kv["runFiles"] = self.runfiles
        if self.srcfiles: kv["sourceFiles"] = self.srcfiles
        if self.binfiles: kv["binFiles"] = self.binfiles
        if self.cataloguedata: kv["catalogueData"] = self.cataloguedata
        if self.depends: kv["depends"] = self.depends
        if self.docfiles: kv["docFiles"] = self.docfiles
        if self.extradata: kv["extradata"] = self.extradata
        if self.docfiledata: kv["docFileData"] = self.docfiledata
        return kv
        
    def insert_in_packages(self, conn):
        """Inserts in an open SQLite3 database.  Limited support."""
        # c.execute("""CREATE table packages (name text, category text, revision real, shortdesc text, longdesc text, srcfiles blob, binfiles blob, docfiles blob)""")
        c = conn.cursor()
        c.execute("""INSERT into packages values (?,?,?,?,?,?,?,?)""", (self.name, self.category, self.revision, self.shortdesc, self.longdesc, self.runfiles, self.srcfiles, self.docfiles))
        conn.commit()

def _attributes_from_line(line):
    """Parse an attribute line.
    
    Arguments:
    line -- a single line from the tlpdb
    
    Returns:
    A dictionary of attributes
    
    Example input lines:
    
        arch=x86_64-darwin size=1
        details="Package introduction" language="de"
        RELOC/doc/platex/pxbase/README details="Readme" language="ja"
    
    """
    
    key = None
    value = None
    chars = []
    quote_count = 0
    attrs = {}
    for c in line:

        if c == "=":
            
            if key == None:
                assert quote_count == 0, "possibly quoted key in line %s" % (line)
                key = "".join(chars)
                chars = []
            else:
                chars.append(c)
        
        elif c == "\"":
            
            quote_count += 1
            
        elif c == " ":
            
            # if quotes are matched, we've reached the end of a key-value pair
            if quote_count % 2 == 0:
                assert key != None, "no key found for %s" % (line)
                assert key not in attrs, "key already assigned for line %s" % (line)
                attrs[key] = "".join(chars)
                
                # reset parser state
                chars = []
                key = None
                quote_count = 0
            else:
                chars.append(c)
                
        else:
            chars.append(c)
    
    assert key != None, "no key found for %s" % (line)
    assert len(chars), "no values found for line %s" % (line)
    attrs[key] = "".join(chars)
    return attrs

def packages_from_tlpdb(flat_tlpdb, allow_partial=False):
    """Creates a list of TLPackage objects from the given file-like object.
    
    Arguments:
    flat_tlpdb -- A file or file-like object, open for reading
    allow_partial -- Pass True if you want to return partial data after an error;
    useful in case of a partial tlpdb download. Default is to raise an exception.
    
    Returns:
    A list of TLPackage objects
    
    """            
    
    package = None
    package_index = 0
    all_packages = []
    index_map = {}
    last_key = None
    last_arch = None

    for line_idx, line in enumerate(flat_tlpdb):
    
        # seems to be absent in TL 2020 (not in stderr?)
        if line_idx == 0 and line.startswith("location-url\t"):
            TLPackage.mirror = line[len("location-url\t"):].strip()
            continue
            
        # comment lines; supported, but not currently used
        if line.startswith("#"):
            continue
                
        line = line.strip("\r\n")
    
        if len(line) == 0:
            all_packages.append(package)
            index_map[package.name] = package_index
            
            package_index += 1
            package = None
            last_key = None
            last_arch = None
        else:
            
            try:
                # the first space token is a delimiter
                key, ignored, value = line.partition(" ")
                            
                if package == None:
                    assert key == "name", "first line must be a name"
                    package = TLPackage()
        
                line_has_key = True
                if len(key) == 0:
                    key = last_key
                    line_has_key = False
                        
                if key == "name":
                    package.name = value
                elif key == "category":
                    package.category = value
                elif key == "revision":
                    package.revision = int(value)
                elif key == "relocated":
                    package.relocated = int(value)
                elif key == "shortdesc":
                    if python_major_version < 3:
                        package.shortdesc = value.decode("utf-8")
                    else:
                        package.shortdesc = value
                elif key == "longdesc":
                    oldvalue = "" if package.longdesc == None else package.longdesc
                    if python_major_version < 3:
                        package.longdesc = oldvalue + " " + value.decode("utf-8")
                    else:
                        package.longdesc = oldvalue + " " + value
                elif key == "depend":
                    package.depends.append(value)
                elif key == "catalogue":
                    package.catalogue = value
                elif key.startswith("catalogue-"):
                    catkey = key[len("catalogue-"):]
                    package.cataloguedata[catkey] = value
                elif key == "srcfiles":
                    if line_has_key:
                        attrs = _attributes_from_line(value)
                        assert "size" in attrs, "missing size for %s : %s" % (package.name, key)
                        package.srcsize = int(attrs["size"])
                    else:
                        package.srcfiles.append(value)
                elif key == "binfiles":
                    if line_has_key:
                        attrs = _attributes_from_line(value)
                        assert "arch" in attrs, "missing arch for %s : %s" % (package.name, key)
                        last_arch = attrs["arch"]
                        assert "size" in attrs, "missing size for %s : %s" % (package.name, key)
                        package.binsize[last_arch] = int(attrs["size"])
                    else:
                        oldvalue = package.binfiles[last_arch] if last_arch in package.binfiles else []
                        oldvalue.append(value)
                        package.binfiles[last_arch] = oldvalue
                elif key == "docfiles":
                    # There's an exception handler here because a TL update introduced this abomination:
                    #   texmf-dist/doc/latex/pythontex/pythontex_quickstart.pdf details=""Quick start" documentation"
                    # due to a bug in the TeX Catalogue. TLPOBJ.pm uses a gruesome special case to handle this, but
                    # I'm just going to ignore it unless/until it happens again, since it's supposed to be fixed in
                    # the tlpdb at some point.
                    try:
                        if line_has_key:
                            attrs = _attributes_from_line(value)
                            assert "size" in attrs, "missing size for %s : %s" % (package.name, key)
                            package.docsize = int(attrs["size"])
                        else:
                            values = value.split(" ")
                            if len(values) > 1:
                                package.docfiledata[values[0]] = _attributes_from_line(" ".join(values[1:]))
                            package.docfiles.append(values[0])
                    except Exception as e:
                        sys.stderr.write("skipping bad docfile line %d in package %s: %s\n" % (line_idx, package.name, line))
                elif key == "runfiles":
                    if line_has_key:
                        attrs = _attributes_from_line(value)
                        assert "size" in attrs, "missing size for %s : %s" % (package.name, key)
                        package.runsize = int(attrs["size"])
                    else:
                        package.runfiles.append(value)
                elif key == "postaction":
                    package.postactions.append(value)
                elif key == "execute":
                    package.executes.append(value)
                else:
                    package.add_pair(key, value)
                    #assert False, "unhandled line %s" % (line)
                
                last_key = key
            except Exception as e:
                if allow_partial:
                    sys.stderr.write("parsed up to junk line \"%s\"\n" % (line))
                    break
                else:
                    raise e

    return all_packages, index_map
    
def _save_as_sqlite(packages, absolute_path):
    """Save a list of packages as an SQLite3 binary file.
    
    Arguments:
    packages -- a list of TLPackage objects
    absolute_path -- output path for the database
    
    An existing file at this path will be removed before writing, to ensure that
    you end up with a consistent database.  This is mainly for symmetry with the
    plist writing method.
    
    Not all values are saved to sqlite.  Notably runfiles and other dictionary
    types are not written at present, since they should probably be in a separate
    table.
    
    """
    import sqlite3
    import os
    import errno
    
    def _adapt_list(lst):
        if lst is None or len(lst) == 0:
            return None
        return buffer("\0".join(lst).encode("utf-8"))

    sqlite3.register_adapter(list, _adapt_list)
    sqlite3.register_adapter(tuple, _adapt_list)
    
    # plistlib will overwrite the previous file, so do the same with sqlite
    # instead of adding rows
    try:
        os.remove(absolute_path)
    except OSError as e:
        if e.errno != errno.ENOENT:
            raise e
            
    assert os.path.exists(absolute_path) == False, "File exists: %s" % (absolute_path)
    conn = sqlite3.connect(absolute_path, detect_types=sqlite3.PARSE_DECLTYPES)
    c = conn.cursor()
    c.execute("""CREATE table packages (name text, category text, revision real, shortdesc text, longdesc text, runfiles blob, srcfiles blob, docfiles blob)""")
    for pkg in all_packages:
        pkg.insert_in_packages(conn)
    
    conn.close()
    
def _save_as_plist(packages, path_or_file):
    """Save a list of packages as a Mac OS X property list.
    
    Arguments:
    packages -- a list of TLPackage objects
    path_or_file -- output file (path or a file-like object) for the database
    
    The root object of the output property list is a dictionary.  Keys at
    present are "mirror" (may not exist) and "packages", which is a list
    of TLPackage dictionary values.
    
    """
    import plistlib
    plist = {}
    # only for remote tlpdb
    if TLPackage.mirror:
        plist["mirror"] = TLPackage.mirror
    plist["packages"] = []
    for pkg in all_packages:
        plist["packages"].append(pkg.dictionary_value())
    
    if python_major_version < 3:
        plistlib.writePlist(plist, path_or_file)
    else:
        # Apparently writePlistToBytes() was removed in Python 3.9, but its
        # replacement of dumps() is only available in 3.4 and later. This is
        # some silly bullshit. Try the new method first, and fall back to the
        # old one, I guess.
        try:
            bytes_output = plistlib.dumps(plist)
        except Exception as exc:
            bytes_output = plistlib.writePlistToBytes(plist)
            
        str_output = bytes_output.decode("UTF-8")
        if path_or_file == sys.stdout:
            sys.stdout.write(str_output)
        else:
            output_file = open(path_or_file, 'w')
            output_file.write(str_output)
    
if __name__ == '__main__':
    
    from optparse import OptionParser
    import sys
        
    usage = "usage: %prog [options] [tlpdb_path or stdin]"
    parser = OptionParser()
    parser.set_usage(usage)
    parser.add_option("-o", "--output", dest="output_path", help="write tlpdb to FILE", metavar="FILE", action="store", type="string")
    parser.add_option("-f", "--format", dest="output_format", help="[sqlite3 | plist] (default is to guess from output file extension)", metavar="FORMAT", action="store", type="string")
    parser.add_option("-p", "--partial", dest="allow_partial", help="read file contents until an error occurs and return partial data", action="store_true", default=False)
    
    (options, args) = parser.parse_args(sys.argv[1:])    
    
    # can't write sqlite3 to stdout (at least, not easily)
    if not options.output_path:
        if options.output_format == "sqlite3":
            sys.stderr.write("Must supply an output path for SQLite3\n")
            parser.print_help(file=sys.stderr)
            exit(1) 
        else:
            # either no format given or no output path given; in either case, this requires a plist format
            options.output_format = "plist"
            options.output_path = sys.stdout

    if not options.output_format:
        dot_idx = options.output_path.rfind(".") + 1
        if dot_idx != -1:
            options.output_format = options.output_path[dot_idx:]
            if options.output_format not in ("sqlite3", "plist"):
                sys.stderr.write("Unable to guess output format from extension .%s\n" % (options.output_format))
                parser.print_help(file=sys.stderr)
                exit(1)
        else:
            sys.stderr.write("Must supply an output format or known output path extension\n")
            parser.print_help(file=sys.stderr)
            exit(1)

    # "/usr/local/texlive/2011/tlpkg/texlive.tlpdb"
    flat_tlpdb = open(args[0], "r") if len(args) else sys.stdin
    all_packages, index_map = packages_from_tlpdb(flat_tlpdb, options.allow_partial)

    if len(all_packages) == 0:
        sys.stderr.write("Did not find any packages in TeX Live Database\n")
        exit(1)

    if options.output_format == "sqlite3":
        _save_as_sqlite(all_packages, options.output_path)
    elif options.output_format == "plist":
        _save_as_plist(all_packages, options.output_path)
        
    # pkg = all_packages[index_map["00texlive.installation"]]
    # for dep in pkg.depends:
    #     if dep.startswith("opt_"):
    #         key, ignored, value = dep[4:].partition(":")
    #         print "%s = %s" % (key, value)
    # 

    
