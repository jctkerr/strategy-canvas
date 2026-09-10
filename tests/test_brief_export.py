"""Communication snapshots must be current, complete and editable XML."""
import copy
import io
import json
from pathlib import Path
import sys
import unittest
from unittest import mock
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'scripts'))
import export_brief
from export_brief import pptx_document, storyline, NS
from state_store import InvalidState, validate


class BriefExportTests(unittest.TestCase):
    def setUp(self):
        self.state = json.loads((ROOT / 'examples' / 'demo.json').read_text())
        self.state['revision'] = 2
        node = self.state['nodes'][0]['id']
        self.state['analysis'] = {
            'models': [{'id':'workshop', 'title':'Fictional workshop', 'nodeId':node,
                        'outputId':'net', 'variables':[
                {'id':'revenue','label':'Revenue','unit':'GBP','basis':'Fictional test',
                 'values':{'low':100,'base':150,'high':200}},
                {'id':'fixed','label':'Fixed cost','unit':'GBP','basis':'Fictional test',
                 'values':{'low':120,'base':120,'high':120}},
                {'id':'net','label':'Net result','unit':'GBP','basis':'Arithmetic only', 'formula':'revenue-fixed'}]}],
            'brief': {'situation':'Fictional workshop only.', 'complication':'Demand remains unknown.',
                      'answer':'No decision yet.', 'basedOnRevision':1,
                      'sections':[{'id':'costs','claim':'Costs determine the surplus',
                                   'body':'Illustrative figures alone do not establish viability.',
                                   'nodeIds':[node], 'sourceIds':[], 'modelRefs':[
                            {'modelId':'workshop','variableId':'net','scenario':'base'}]}]}}

    def test_native_text_current_results_notes_and_exact_snapshot(self):
        with zipfile.ZipFile(io.BytesIO(pptx_document(self.state))) as package:
            document = ET.fromstring(package.read('ppt/slides/slide3.xml'))
            texts = [n.text or '' for n in document.findall('.//a:t', NS)]
            self.assertTrue(any('30 GBP' in value for value in texts))
            self.assertTrue(document.findall('.//p:sp/p:txBody', NS))
            self.assertFalse(document.findall('.//p:pic', NS))
            notes = package.read('ppt/notesSlides/notesSlide3.xml').decode()
            self.assertIn('revenue-fixed', notes)
            self.assertIn('Demand remains unknown.', package.read('ppt/slides/slide1.xml').decode())
            self.assertEqual(json.loads(package.read('strategy-canvas.json')), self.state)
            self.assertIn(b'<Types xmlns=', package.read('[Content_Types].xml'))
            self.assertIn(b'<Relationships xmlns=', package.read('ppt/_rels/presentation.xml.rels'))
            for name in package.namelist():
                if name.endswith(('.xml', '.rels')):
                    ET.fromstring(package.read(name))

    def test_changed_input_blocks_stale_prose_then_current_reexport(self):
        self.state['analysis']['models'][0]['variables'][1]['values']['base'] = 150
        self.state['revision'] = 3
        with self.assertRaisesRegex(InvalidState, 'stale'):
            pptx_document(self.state)
        self.state['analysis']['brief']['basedOnRevision'] = 3
        self.state['revision'] = 4
        with zipfile.ZipFile(io.BytesIO(pptx_document(self.state))) as package:
            slide = package.read('ppt/slides/slide3.xml').decode()
            self.assertIn('0 GBP', slide)
            self.assertNotIn('30 GBP', slide)

    def test_core_property_qname_prefixes_remain_declared(self):
        # Parsing XML alone misses an undeclared prefix in an xsi:type value;
        # PowerPoint repairs that package even though ElementTree accepts it.
        with zipfile.ZipFile(io.BytesIO(pptx_document(self.state))) as package:
            core = package.read('docProps/core.xml')
        namespaces = dict(event for _, event in ET.iterparse(io.BytesIO(core), events=('start-ns',)))
        document = ET.fromstring(core)
        types = [element.get('{http://www.w3.org/2001/XMLSchema-instance}type')
                 for element in document]
        self.assertEqual(types.count('dcterms:W3CDTF'), 2)
        for value in filter(None, types):
            self.assertEqual(namespaces[value.split(':', 1)[0]], 'http://purl.org/dc/terms/')

    def test_references_are_deduplicated_and_model_evaluations_cached(self):
        source = {'id':'basis', 'provider':'web', 'url':'https://example.com/fictional',
                  'title':'Invented example', 'summary':'Illustrative assumption, not observed demand.',
                  'checkedAt':'2026-09-10'}
        node_source = {**source, 'id':'node-basis', 'title':'Node evidence boundary'}
        self.state['sources'] = [source, node_source]
        self.state['nodes'][0]['sourceIds'] = ['basis']
        self.state['nodes'][1]['sourceIds'] = ['node-basis']
        model = self.state['analysis']['models'][0]
        model['nodeId'] = self.state['nodes'][1]['id']
        for index in range(97):
            model['variables'].append({'id':f'input_{index}', 'label':f'Input {index}', 'unit':'GBP',
                'basis':'Invented supporting assumption. '*30, 'sourceIds':['basis'],
                'values':{'low':1, 'base':2, 'high':3}})
        section = self.state['analysis']['brief']['sections'][0]
        section['sourceIds'] = ['basis']
        section['modelRefs'] = [{'modelId':'workshop', 'variableId':v['id'], 'scenario':'base'}
                                for v in model['variables'][:50]]
        self.state['analysis']['brief']['sections'].append({**copy.deepcopy(section), 'id':'repeat'})
        before = copy.deepcopy(self.state)
        with mock.patch.object(export_brief, 'evaluate_model', wraps=export_brief.evaluate_model) as evaluate:
            slides = storyline(self.state)
        self.assertEqual(evaluate.call_count, 1)
        self.assertEqual(self.state, before)
        full_notes = [slide['notes'] for slide in slides if 'Model workshop:' in slide['notes']]
        self.assertEqual(len(full_notes), 2)
        for note in full_notes:
            self.assertEqual(note.count('Model workshop:'), 1)
            self.assertEqual(note.count('Source basis:'), 1)
            self.assertEqual(note.count('Source node-basis:'), 1)
            self.assertIn('Illustrative assumption, not observed demand.', note)
        self.assertTrue(any('Continued from slide 3.' in slide['notes'] for slide in slides))
        self.assertLess(sum(len(s['notes'].encode('utf-8')) for s in slides), 256_000)

    def test_oversized_reference_section_fails_before_processing_more_sections(self):
        model = self.state['analysis']['models'][0]
        for index in range(97):
            model['variables'].append({'id':f'input_{index}', 'label':f'Input {index}', 'unit':'GBP',
                'basis':'x'*3000, 'values':{'low':1, 'base':2, 'high':3}})
        section = self.state['analysis']['brief']['sections'][0]
        self.state['analysis']['brief']['sections'] = [{**copy.deepcopy(section), 'id':f's_{i}'} for i in range(50)]
        validate(self.state)
        with mock.patch.object(export_brief, 'reference_notes', wraps=export_brief.reference_notes) as references:
            with self.assertRaisesRegex(InvalidState, '256 KB per section'):
                storyline(self.state)
        self.assertEqual(references.call_count, 1)

    def test_workplan_preserves_linked_node_sources_in_notes(self):
        self.state['sources'] = [{'id':'basis', 'provider':'web', 'url':'https://example.com/fictional',
            'title':'Invented example', 'summary':'Demand is not established.', 'checkedAt':'2026-09-10'}]
        self.state['nodes'][0]['sourceIds'] = ['basis']
        self.state['analysis']['workplan'] = [{'id':'demand', 'nodeId':self.state['nodes'][0]['id'],
            'title':'Check demand', 'analysis':'Inspect pre-orders', 'evidenceNeeded':'Paid demand',
            'source':'Planned customer review', 'priorityReason':'Could change the decision', 'owner':'',
            'dueDate':'', 'status':'open', 'finding':'', 'limitations':'No results yet'}]
        notes = storyline(self.state)[-1]['notes']
        self.assertIn('Source basis:', notes)
        self.assertIn('Demand is not established.', notes)
        self.assertIn('"status": "open"', notes)

    def test_total_notes_budget_is_checked_incrementally(self):
        model = self.state['analysis']['models'][0]
        for index in range(20):
            model['variables'].append({'id':f'input_{index}', 'label':f'Input {index}', 'unit':'GBP',
                'basis':'x'*5000, 'values':{'low':1, 'base':2, 'high':3}})
        section = self.state['analysis']['brief']['sections'][0]
        self.state['analysis']['brief']['sections'] = [{**copy.deepcopy(section), 'id':f's_{i}'} for i in range(50)]
        validate(self.state)
        with mock.patch.object(export_brief, 'reference_notes', wraps=export_brief.reference_notes) as references:
            with self.assertRaisesRegex(InvalidState, '2 MB total'):
                storyline(self.state)
        self.assertLess(references.call_count, 25)

    def test_slide_budget_rejects_before_building_the_whole_storyline(self):
        section = self.state['analysis']['brief']['sections'][0]
        section['body'] = 'Many long authored paragraphs. '*600
        self.state['analysis']['brief']['sections'] = [{**copy.deepcopy(section), 'id':f's_{i}'} for i in range(50)]
        validate(self.state)
        with mock.patch.object(export_brief, 'reference_notes', wraps=export_brief.reference_notes) as references:
            with self.assertRaisesRegex(InvalidState, '200-slide'):
                storyline(self.state)
        self.assertLess(references.call_count, 10)

    def test_errors_are_visible_instead_of_plausible_figures(self):
        self.state['analysis']['models'][0]['variables'][2]['formula'] = 'revenue/0'
        result = storyline(self.state)[2]['body']
        self.assertIn('Unresolved:', result)
        self.assertNotIn('30 GBP', result)

    def test_long_authored_text_survives_pagination_and_xml_controls(self):
        self.state['analysis']['brief']['sections'][0]['body'] = ('Long authored sentence. '*200)+'END & < > \x01'
        slides = storyline(self.state)
        self.assertTrue(any('END & < >' in slide['body'] for slide in slides))
        self.assertTrue(all(len(slide['body'].splitlines()) <= 10 for slide in slides))
        with zipfile.ZipFile(io.BytesIO(pptx_document(self.state))) as package:
            for name in package.namelist():
                if name.endswith('.xml'):
                    ET.fromstring(package.read(name))

    def test_missing_brief_remains_valid_tree_but_has_no_fake_deck(self):
        del self.state['analysis']['brief']
        with self.assertRaisesRegex(InvalidState, 'Write a brief'):
            pptx_document(self.state)


if __name__ == '__main__':
    unittest.main()
