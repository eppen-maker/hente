import json, io
data = open('data.json', encoding='utf-8').read()
tpl = open('template.html', encoding='utf-8').read()
open('ringeliste.html','w',encoding='utf-8').write(tpl.replace('/*__DATA__*/null', data))
print('ok')
