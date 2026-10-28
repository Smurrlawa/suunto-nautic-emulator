#!/usr/bin/env python3
"""Bündelt index.html + CSS + JS zu einer einzigen, eigenständigen HTML-Datei (dist/)."""
import re, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
html = (root / 'index.html').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="([^"]+)">',
              lambda m: '<style>\n' + (root / m.group(1)).read_text(encoding='utf-8') + '\n</style>', html)
html = re.sub(r'<script src="([^"]+)"></script>',
              lambda m: '<script>\n' + (root / m.group(1)).read_text(encoding='utf-8').replace('</script', '<\\/script') + '\n</script>', html)
html = html.replace('href="docs/UNKLAR.md"', 'href="https://github.com/Smurrlawa/suunto-nautic-emulator/blob/HEAD/docs/UNKLAR.md"')
out = root / 'dist' / 'suunto-nautic-emulator.html'
out.write_text(html, encoding='utf-8')
print(out, len(html) // 1024, 'KB')
