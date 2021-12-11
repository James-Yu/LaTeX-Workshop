import requests
from pyintel import generate_unimathsymbols_intel


SYMBOLS_URL = 'http://milde.users.sourceforge.net/LUCR/Math/data/unimathsymbols.txt'
try:
    r = requests.get(SYMBOLS_URL)
    with open('unimathsymbols.txt', 'wb') as f:
        f.write(r.content)
    generate_unimathsymbols_intel('unimathsymbols.txt', '../data/unimathsymbols.json')
except Exception:
    print('Cannot retrieve unimathsymbols.txt')
