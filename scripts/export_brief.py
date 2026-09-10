#!/usr/bin/env python3
"""Export an inspectable strategy brief to editable PowerPoint, without dependencies."""
import argparse
import copy
import io
import json
from pathlib import Path
import re
import sys
import textwrap
import xml.etree.ElementTree as ET
import zipfile

from analysis import evaluate_model
from state_store import InvalidState, read_state, validate

NS = {'p': 'http://schemas.openxmlformats.org/presentationml/2006/main',
      'a': 'http://schemas.openxmlformats.org/drawingml/2006/main',
      'r': 'http://schemas.openxmlformats.org/officeDocument/2006/relationships'}
REL = 'http://schemas.openxmlformats.org/package/2006/relationships'
CT = 'http://schemas.openxmlformats.org/package/2006/content-types'
for prefix, uri in NS.items():
    ET.register_namespace(prefix, uri)
# Namespace prefixes inside QName-valued attributes are not rewritten by ET.
# Keep dcterms declared for xsi:type="dcterms:W3CDTF" in core properties.
for prefix, uri in {
        'cp': 'http://schemas.openxmlformats.org/package/2006/metadata/core-properties',
        'dc': 'http://purl.org/dc/elements/1.1/',
        'dcterms': 'http://purl.org/dc/terms/',
        'xsi': 'http://www.w3.org/2001/XMLSchema-instance'}.items():
    ET.register_namespace(prefix, uri)
TEMPLATE = Path(__file__).resolve().parent.parent / 'assets' / 'brief-template.pptx'
MAX_SLIDES = 200
MAX_SLIDE_NOTES_BYTES = 256_000
MAX_TOTAL_NOTES_BYTES = 2_000_000


class NotesBuffer:
    """Fail while collecting references, before multiplying large text payloads."""
    def __init__(self):
        self.chunks = []
        self.size = 0

    def append(self, value):
        value = clean_text(value)
        size = self.size + len(value.encode('utf-8')) + (2 if self.chunks else 0)
        if size > MAX_SLIDE_NOTES_BYTES:
            raise InvalidState('A brief section has too much supporting material for PowerPoint speaker notes '
                               '(256 KB per section). Split its references across sections or use the full JSON/HTML export.')
        self.chunks.append(value)
        self.size = size

    def text(self):
        return '\n\n'.join(self.chunks)


def xml(element):
    namespace = element.tag.split('}')[0].lstrip('{')
    if namespace in {CT, REL}:
        # Office requires these package parts to use their default namespace.
        ET.register_namespace('', namespace)
    return ET.tostring(element, encoding='utf-8', xml_declaration=True)


def clean_text(value):
    # XML 1.0 forbids control characters even when JSON accepts them.
    return re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\ud800-\udfff\ufffe\uffff]', '\ufffd', str(value))


def lines(value, width=82):
    result = []
    for para in clean_text(value).splitlines():
        result.extend(textwrap.wrap(para, width=width, break_long_words=True,
                                    break_on_hyphens=False) or [''])
    return result or ['']


def text_body(body, value):
    prototype = body.find('a:p', NS)
    for paragraph in list(body.findall('a:p', NS)):
        body.remove(paragraph)
    for line in clean_text(value).split('\n'):
        para = copy.deepcopy(prototype) if prototype is not None else ET.Element('{'+NS['a']+'}p')
        for child in list(para):
            if child.tag != '{'+NS['a']+'}pPr':
                para.remove(child)
        run = ET.SubElement(para, '{'+NS['a']+'}r')
        ET.SubElement(run, '{'+NS['a']+'}t').text = line
        body.append(para)


def reference_notes(state, section, models, cache=None):
    cache = cache if cache is not None else {}
    nodes = cache.setdefault('nodes', {node['id']: node for node in state['nodes']})
    sources = cache.setdefault('sources', {source['id']: source for source in state.get('sources', [])})
    computed_models = cache.setdefault('computed', {})
    records = cache.setdefault('records', {})
    notes = NotesBuffer()
    included = set()

    def record(kind, ident, value):
        key = (kind, ident)
        if key in included:
            return False
        if key not in records:
            records[key] = kind+' '+ident+':\n'+json.dumps(value, ensure_ascii=False, indent=2)
        notes.append(records[key])
        included.add(key)
        return True

    def source(ident):
        record('Source', ident, sources[ident])

    def node(ident):
        item = nodes[ident]
        if record('Tree', ident, item):
            for source_id in item.get('sourceIds', []):
                source(source_id)

    for ident in section.get('nodeIds', []):
        node(ident)
    for ident in section.get('sourceIds', []):
        source(ident)
    numbers = []
    for ref in section.get('modelRefs', []):
        model = models[ref['modelId']]
        variable = next(v for v in model['variables'] if v['id'] == ref['variableId'])
        if model['id'] not in computed_models:
            computed_models[model['id']] = evaluate_model(model)
        computed = computed_models[model['id']]
        scenario = ref['scenario']
        error = computed['errors'][variable['id']][scenario]
        value = computed['values'][variable['id']][scenario]
        rendered = 'Unresolved: '+error if error else f'{value:,.6g} {variable["unit"]}'.strip()
        numbers.append(f'{variable["label"]} ({scenario}): {rendered}')
        if record('Model', model['id'], model):
            if model.get('nodeId'):
                node(model['nodeId'])
            for v in model['variables']:
                for ident in v.get('sourceIds', []):
                    source(ident)
    return numbers, notes.text()


def storyline(state):
    """Derive slides from authored claims, never manufacture a recommendation."""
    validate(state)
    analysis = state.get('analysis', {})
    brief = analysis.get('brief')
    if not brief:
        raise InvalidState('Write a brief in Analysis before exporting PowerPoint.')
    if state['revision'] > brief['basedOnRevision'] + 1:
        raise InvalidState('The brief may be stale. Check its wording against the latest reasoning in Analysis before exporting PowerPoint.')
    models = {model['id']: model for model in analysis.get('models', [])}
    slides = []
    cache = {}
    total_notes_bytes = 0

    def add(title, body, notes=''):
        nonlocal total_notes_bytes
        title_lines = lines(title, 52)
        # Long authored claims retain their full wording on a dedicated title continuation.
        title_pages = [title_lines[i:i+3] for i in range(0, len(title_lines), 3)]
        body_lines = lines(body)
        body_pages = [body_lines[i:i+10] for i in range(0, len(body_lines), 10)]
        count = len(title_pages) + len(body_pages) - 1
        if len(slides) + count > MAX_SLIDES:
            raise InvalidState('This brief is too long for a 200-slide export. Shorten the brief or use the full JSON/HTML export.')
        full_notes = NotesBuffer()
        for value in (title, body, notes):
            full_notes.append(value)
        first_slide = len(slides) + 1
        continuation = (f'Continued from slide {first_slide}. Full authored wording, linked sources and assumptions '
                        'are in that slide\'s speaker notes. The exact strategy snapshot is also embedded in strategy-canvas.json.')
        notes_size = full_notes.size + (count - 1) * len(continuation.encode('utf-8'))
        if total_notes_bytes + notes_size > MAX_TOTAL_NOTES_BYTES:
            raise InvalidState('This brief has too much supporting material for PowerPoint speaker notes '
                               '(2 MB total). Split the brief or use the full JSON/HTML export.')
        total_notes_bytes += notes_size
        for index, heading in enumerate(title_pages):
            slides.append({'title': '\n'.join(heading),
                           'body': '\n'.join(body_pages[0]) if index == len(title_pages)-1 else '',
                           'notes': full_notes.text() if index == 0 else continuation})
        for page in body_pages[1:]:
            slides.append({'title': '\n'.join(title_pages[0]), 'body': '\n'.join(page),
                           'notes': continuation})

    add(state['question'], '\n\n'.join(x for x in [brief['situation'], brief['complication']] if x),
        f'Strategy Canvas revision {state["revision"]}. Authored draft, not an independent strategy review.\n'+state['context'])
    add('Current answer', brief['answer'] or 'The choice remains open.')
    for section in brief['sections']:
        numbers, notes = reference_notes(state, section, models, cache)
        source_labels = ['Source: '+s for s in section.get('sourceIds', [])]
        add(section['claim'], '\n\n'.join([section['body'], *numbers, *source_labels]), notes)
    for item in analysis.get('workplan', []):
        body = '\n\n'.join(x for x in [item['analysis'], 'Evidence needed: '+item['evidenceNeeded'],
                            'Why this matters: '+item['priorityReason'],
                            ('Finding: '+item['finding']) if item['finding'] else '',
                            ('Limitations: '+item['limitations']) if item['limitations'] else ''] if x)
        _, linked_notes = reference_notes(state, {'nodeIds': [item['nodeId']]}, models, cache)
        add(item['title'], body, json.dumps(item, ensure_ascii=False, indent=2)+'\n\n'+linked_notes)
    return slides


def pptx_document(state):
    slides = storyline(state)
    with zipfile.ZipFile(TEMPLATE) as archive:
        parts = {name: archive.read(name) for name in archive.namelist()}
    template_slide = ET.fromstring(parts['ppt/slides/slide1.xml'])
    template_notes = ET.fromstring(parts['ppt/notesSlides/notesSlide1.xml'])
    slide_rels = ET.fromstring(parts['ppt/slides/_rels/slide1.xml.rels'])
    notes_rels = ET.fromstring(parts['ppt/notesSlides/_rels/notesSlide1.xml.rels'])
    presentation = ET.fromstring(parts['ppt/presentation.xml'])
    slide_list = presentation.find('p:sldIdLst', NS)
    slide_list.clear()
    relations = ET.fromstring(parts['ppt/_rels/presentation.xml.rels'])
    for relation in list(relations):
        if relation.get('Type', '').endswith('/slide'):
            relations.remove(relation)
    content_types = ET.fromstring(parts['[Content_Types].xml'])
    for item in list(content_types):
        if re.fullmatch(r'/ppt/(slides/slide|notesSlides/notesSlide)\d+\.xml', item.get('PartName', '')):
            content_types.remove(item)
    for number, content in enumerate(slides, 1):
        slide = copy.deepcopy(template_slide)
        bodies = slide.findall('.//p:sp/p:txBody', NS)
        for body, text in zip(bodies, (content['title'], content['body'],
                                      f'Draft · revision {state["revision"]} · {number} / {len(slides)}')):
            text_body(body, text)
        parts[f'ppt/slides/slide{number}.xml'] = xml(slide)
        notes = copy.deepcopy(template_notes)
        for shape in notes.findall('.//p:sp', NS):
            placeholder = shape.find('p:nvSpPr/p:nvPr/p:ph', NS)
            if placeholder is not None and placeholder.get('type') == 'body':
                text_body(shape.find('p:txBody', NS), content['notes'])
        parts[f'ppt/notesSlides/notesSlide{number}.xml'] = xml(notes)
        for prototype, part_name, target_suffix, target in (
                (slide_rels, f'ppt/slides/_rels/slide{number}.xml.rels', '/notesSlide', f'/ppt/notesSlides/notesSlide{number}.xml'),
                (notes_rels, f'ppt/notesSlides/_rels/notesSlide{number}.xml.rels', '/slide', f'/ppt/slides/slide{number}.xml')):
            rels = copy.deepcopy(prototype)
            for rel in rels:
                if rel.get('Type', '').endswith(target_suffix):
                    rel.set('Target', target)
            parts[part_name] = xml(rels)
        rid = 'strategySlide'+str(number)
        ET.SubElement(slide_list, '{'+NS['p']+'}sldId', {'id':str(255+number), '{'+NS['r']+'}id':rid})
        ET.SubElement(relations, '{'+REL+'}Relationship', {'Id':rid, 'Type':NS['r']+'/slide', 'Target':f'/ppt/slides/slide{number}.xml'})
        for folder, kind, mime in [('slides','slide','slide'), ('notesSlides','notesSlide','notesSlide')]:
            ET.SubElement(content_types, '{'+CT+'}Override', {'PartName':f'/ppt/{folder}/{kind}{number}.xml', 'ContentType':f'application/vnd.openxmlformats-officedocument.presentationml.{mime}+xml'})
    parts['ppt/presentation.xml'] = xml(presentation)
    parts['ppt/_rels/presentation.xml.rels'] = xml(relations)
    properties = ET.fromstring(parts['docProps/app.xml'])
    for prop in properties:
        if prop.tag.rsplit('}', 1)[-1] in {'Slides', 'Notes'}:
            prop.text = str(len(slides))
        elif prop.tag.rsplit('}', 1)[-1] == 'Application':
            prop.text = 'Strategy Canvas'
    parts['docProps/app.xml'] = xml(properties)
    core = ET.fromstring(parts['docProps/core.xml'])
    for prop in core:
        name = prop.tag.rsplit('}', 1)[-1]
        if name == 'title':
            prop.text = clean_text(state['title'])
        elif name in {'creator', 'lastModifiedBy'}:
            prop.text = 'Strategy Canvas'
    parts['docProps/core.xml'] = xml(core)
    # Retain the canonical snapshot alongside speaker notes for exact handoff.
    parts['strategy-canvas.json'] = json.dumps(state, ensure_ascii=False, indent=2).encode('utf-8')
    ET.SubElement(content_types, '{'+CT+'}Default', {'Extension':'json', 'ContentType':'application/json'})
    parts['[Content_Types].xml'] = xml(content_types)
    output = io.BytesIO()
    with zipfile.ZipFile(output, 'w', compression=zipfile.ZIP_DEFLATED) as archive:
        for name, data in parts.items():
            archive.writestr(name, data)
    return output.getvalue()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument('--session', type=Path)
    source.add_argument('--state', type=Path, help='A standalone JSON export')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    try:
        state = read_state(args.session) if args.session else validate(json.loads(args.state.read_text()))
        if args.output.exists():
            raise InvalidState('Choose a new output filename; existing presentations are preserved.')
        content = pptx_document(state)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        with args.output.open('xb') as stream:
            stream.write(content)
        print(json.dumps({'file':str(args.output.resolve()),'revision':state['revision'],'slides':len(storyline(state))}))
    except (InvalidState, OSError, ValueError) as error:
        print(str(error), file=sys.stderr)
        sys.exit(2)


if __name__ == '__main__':
    main()
