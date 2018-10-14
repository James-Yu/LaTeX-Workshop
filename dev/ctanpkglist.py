'''
This script fetch latest list of packages and their descriptions
from CTAN at https://ctan.org/pkg and save the result as a json file.
The result is used to generate command intellisense for LaTeX Workshop.
'''

import requests, json

CTAN_SOURCE = 'https://ctan.org/json/2.0/packages'
data = {}

# fetch, iterate and adapt.
for x in json.loads(requests.get(CTAN_SOURCE).content):
  data[x['key']] = {}
  data[x['key']]['command'] = x['key']
  data[x['key']]['detail'] = 'https://ctan.org/pkg/'+ x['key']
  data[x['key']]['description'] = x['caption']

json.dump(data, open('../data/packagenames.json', 'w+', encoding='utf-8'), 
  separators=(',', ': '), sort_keys=True, indent=2, ensure_ascii=False)
