"""Build a gallery of fictional examples using the bundled editable canvas."""
import html
import json
from pathlib import Path

from render_state import html_document
from state_store import METHODS, validate


def example_html(state, canvas_id):
    document = html_document(state, offline=True, canvas_id=canvas_id)
    marker = '<div class="top-actions">'
    if document.count(marker) != 1:
        raise ValueError("The canvas examples navigation marker changed.")
    link = ('<a href="https://jctkerr.github.io/strategy-canvas/examples.html" '
            'style="font-size:11px;color:var(--muted);text-decoration:none;padding:7px" '
            'aria-label="Browse tree examples">Examples</a>')
    return document.replace(marker, marker + link, 1)


def outline(state):
    children = {node['id']: [] for node in state['nodes']}
    root = next(node for node in state['nodes'] if node['parentId'] is None)
    for node in state['nodes']:
        if node['parentId'] is not None:
            children[node['parentId']].append(node)
    lines = [root['label']]

    def walk(parent, prefix):
        for index, child in enumerate(children[parent['id']]):
            last = index == len(children[parent['id']]) - 1
            lines.append(prefix + ('└─ ' if last else '├─ ') + child['label'])
            walk(child, prefix + ('   ' if last else '│  '))

    walk(root, '')
    return '\n'.join(lines)


def build_examples(root=None, check=False):
    root = Path(root) if root else Path(__file__).resolve().parent.parent
    catalogue = json.loads((root / 'examples/tree-catalogue.json').read_text(encoding='utf-8'))
    identifiers = [entry['id'] for entry in catalogue]
    if len(identifiers) != len(set(identifiers)) or set(identifiers) != METHODS:
        raise ValueError('The gallery must include each tree method exactly once.')
    outputs = {}
    growth = validate(json.loads((root / 'examples/growth-overview.json').read_text(encoding='utf-8')))
    outputs['growth.html'] = example_html(growth, 'demo-growth.html')
    cards = []
    for entry in catalogue:
        state = validate(entry['state'])
        ident = entry['id']
        destination = 'example-' + ident + '.html'
        outputs[destination] = example_html(state, 'demo-' + destination)
        name = html.escape(entry['name'])
        source_url = entry['source']['url']
        if not source_url.startswith('https://'):
            raise ValueError('An example source must use HTTPS.')
        cards.append(
            '<article class="example"><a class="example-main" href="' + destination + '" '
            'aria-label="Open ' + name + ' example"><h3>' + name + ' ↗</h3><p>' +
            html.escape(entry['purpose']) + '</p><pre>' + html.escape(outline(state)) +
            '</pre></a><footer><span>Fictional example</span><a href="' +
            html.escape(source_url, quote=True) + '" target="_blank" rel="noopener noreferrer" '
            'aria-label="Source: ' + html.escape(entry['source']['title'], quote=True) +
            '">Source ↗</a></footer></article>'
        )
    template = (root / 'assets/examples.html').read_text(encoding='utf-8')
    if template.count('__TREE_CARDS__') != 1:
        raise ValueError('The examples gallery marker changed.')
    outputs['examples.html'] = template.replace('__TREE_CARDS__', '\n'.join(cards))
    for filename, expected in outputs.items():
        path = root / 'docs' / filename
        if check:
            if not path.exists() or path.read_text(encoding='utf-8') != expected:
                raise ValueError('Examples are stale. Run python3 scripts/build_demo.py.')
        else:
            path.write_text(expected, encoding='utf-8')


if __name__ == '__main__':
    build_examples()
