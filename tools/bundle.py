#!/usr/bin/env python3
"""Bundle Fire Style Lab into one self-contained HTML file.

    python3 tools/bundle.py                      -> dist/fire-style-lab.html (a complete page you can share)
    python3 tools/bundle.py --fragment out.html  -> head + body content only, the form used to publish
                                                    the page as a Claude artifact (it adds its own shell)

It reads index.html, inlines css/lab.css and every <script src> in page order.
"""
import pathlib
import re
import sys

root = pathlib.Path(__file__).resolve().parent.parent
args = sys.argv[1:]
fragment = '--fragment' in args
paths = [a for a in args if not a.startswith('--')]
out = pathlib.Path(paths[0]) if paths else root / 'dist' / 'fire-style-lab.html'

html = (root / 'index.html').read_text()


def between(a, b):
    return html[html.index(a) + len(a):html.index(b)].strip()


head = between('<!-- page:head -->', '<!-- page:head-end -->')
body = between('<!-- page:start -->', '<!-- page:end -->')
css = ''.join((root / m).read_text() for m in re.findall(r'<link rel="stylesheet" href="((?!https)[^"]+)"', html))
scripts = re.findall(r'<script src="([^"]+)"></script>', html)
js = '\n'.join((root / s).read_text() for s in scripts)
assert '</script' not in js, 'a script contains a closing script tag and cannot be inlined'

page = f'{head}\n<style>\n{css}</style>\n{body}\n<script>\n{js}</script>\n'
if not fragment:
    page = ('<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            + page.replace(f'</style>\n{body}', f'</style>\n</head>\n<body>\n{body}', 1)
            + '</body>\n</html>\n')
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(page)
print(f'{out}: {out.stat().st_size:,} bytes, {len(scripts)} scripts inlined')
