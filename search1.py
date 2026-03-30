import urllib.request as r
import urllib.parse as p
import re

def search(q):
    data=p.urlencode({'q': q}).encode()
    req=r.Request('https://lite.duckduckgo.com/lite/', data=data, headers={'User-Agent':'Mozilla/5.0'})
    html=r.urlopen(req).read().decode('utf-8')
    snippets=[re.sub(r'<[^>]+>','', x).strip() for x in re.findall(r'<td class="result-snippet">.*?</td>', html, re.S)]
    for chunk in snippets:
        print(chunk)
        print("---")

search('"Skull king" board game "pirates abilities"')
