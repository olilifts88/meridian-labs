import copy
import datetime as dt
import http.client
import json
import threading
import unittest
from workflow_portfolio.domain import InputError
from workflow_portfolio.showcase import FIXTURES, load_json, run
from workflow_portfolio.showcase_server import make_server


class ShowcaseTests(unittest.TestCase):
    def setUp(self):
        self.options = {'as_of': '2026-10-26'}
        self.knowledge = load_json(FIXTURES / 'knowledge.json')

    def execute(self, flow, **options):
        return run(flow, dict(self.options, **options), self.knowledge)

    def test_release_uses_confirmed_evidence_and_deduplicates_retry(self):
        r = self.execute('release-notes')
        self.assertEqual(r['status'], 'awaiting_model_review')
        self.assertEqual(r['draft']['audiences'], ['pilot_group_east', 'pilot_group_west'])
        self.assertEqual(r['audit'][3]['event_count'], 1)
        self.assertTrue(r['audit'][3]['duplicate'])
        self.assertFalse(r['published'])
        self.assertFalse(r['external_writes'])

    def test_wrong_audience_blocks_release(self):
        r = self.execute('release-notes', audience='all-customers')
        self.assertEqual(r['status'], 'blocked')
        self.assertIn('audience_mismatch', r['findings'])

    def test_explicit_prose_overclaim_is_held_back(self):
        r = self.execute('release-notes', draft_body='CSV export is available to all customers.')
        self.assertEqual(r['status'], 'blocked')
        self.assertIn('prose_audience_overclaim', r['findings'])

    def test_release_missing_source_does_not_make_a_draft(self):
        r = self.execute('release-notes', disabled_sources=['product-change'])
        self.assertEqual(r['status'], 'needs_evidence')
        self.assertNotIn('draft', r)

    def test_unapproved_or_wrong_scope_evidence_is_not_used(self):
        self.knowledge['sources'][0]['scope'] = 'internal'
        self.assertEqual(self.execute('release-notes')['status'], 'needs_evidence')
        self.knowledge['sources'][0]['scope'] = 'public-demo'
        self.knowledge['sources'][0]['approved'] = False
        self.assertEqual(self.execute('release-notes')['status'], 'needs_evidence')

    def test_stale_sources_are_excluded_and_future_dates_do_not_pass(self):
        self.assertEqual(self.execute('release-notes', as_of='2028-01-01')['status'], 'needs_evidence')
        self.assertEqual(self.execute('release-notes', as_of='2020-01-01')['status'], 'needs_evidence')

    def test_vulnerability_priorities_owners_and_deadlines(self):
        r = self.execute('vulnerabilities')
        self.assertEqual(r['checked_packages'], 3)
        self.assertEqual(len(r['findings']), 2)
        critical, high = r['findings']
        self.assertEqual(critical['severity'], 'CRITICAL')
        self.assertEqual(critical['due_on'], '2026-10-27')
        self.assertEqual(critical['fixed_versions'], [])
        self.assertEqual(high['state'], 'overdue')
        self.assertEqual(high['owner'], 'Platform Engineering')
        self.assertEqual(high['fixed_versions'], ['1.4.2'])
        self.assertFalse(r['external_writes'])

    def test_feed_failure_is_not_a_clean_scan(self):
        r = self.execute('vulnerabilities', feed_unavailable=True)
        self.assertFalse(r['complete'])
        self.assertEqual(r['status'], 'incomplete')
        self.assertEqual(r['checked_packages'], 0)

    def test_unavailable_remediation_policy_stops_the_report(self):
        r = self.execute('vulnerabilities', disabled_sources=['remediation-policy'])
        self.assertFalse(r['complete'])

    def test_advisory_replays_do_not_duplicate_findings(self):
        data = load_json(FIXTURES / 'vulnerabilities.json')
        data['advisories'] *= 2
        r = run('vulnerabilities', self.options, self.knowledge, data)
        self.assertEqual(len(r['findings']), 2)

    def test_ecosystem_and_version_must_match(self):
        data = load_json(FIXTURES / 'vulnerabilities.json')
        data['packages'][0]['version'] = '99.0.0'
        data['packages'][1]['ecosystem'] = 'npm'
        r = run('vulnerabilities', self.options, self.knowledge, data)
        self.assertEqual(r['findings'], [])
        self.assertEqual(r['status'], 'no_matches_in_supplied_snapshot')

    def test_unknown_severity_does_not_invent_a_deadline(self):
        data = load_json(FIXTURES / 'vulnerabilities.json')
        data['advisories'][0]['severity'] = 'not classified'
        r = run('vulnerabilities', self.options, self.knowledge, data)
        unknown = next(f for f in r['findings'] if f['package'] == 'demo-web')
        self.assertEqual(unknown['state'], 'needs_severity_review')
        self.assertIsNone(unknown['due_on'])

    def test_future_detection_and_unpinned_packages_are_rejected(self):
        data = load_json(FIXTURES / 'vulnerabilities.json')
        data['packages'][0]['detected_on'] = '2027-01-01'
        with self.assertRaises(InputError):run('vulnerabilities', self.options, self.knowledge, data)
        data['packages'][0]['detected_on'] = '2026-10-01'
        data['packages'][0]['version'] = '^1.0'
        with self.assertRaises(InputError):run('vulnerabilities', self.options, self.knowledge, data)

    def test_questionnaire_cites_evidence_and_withholds_certification(self):
        r = self.execute('questionnaire')
        self.assertEqual(r['evidence_gaps'], 1)
        answers = {a['id']: a for a in r['answers']}
        self.assertEqual(len(answers['Q1']['citations']), 2)
        self.assertEqual(answers['Q4']['status'], 'needs_evidence')
        self.assertNotIn('certified', answers['Q4']['answer'])
        self.assertTrue(all(not a['approved'] for a in r['answers']))

    def test_disagreeing_sources_do_not_become_an_answer(self):
        self.knowledge['sources'][2]['content']['encryption'] = 'Different encryption claim.'
        r = self.execute('questionnaire')
        self.assertEqual(r['answers'][0]['status'], 'conflicting_evidence')
        self.assertNotIn('Different encryption claim', r['answers'][0]['answer'])

    def test_removing_a_source_creates_specific_questionnaire_gaps(self):
        r = self.execute('questionnaire', disabled_sources=['security-policy'])
        self.assertEqual(r['evidence_gaps'], 3)
        self.assertEqual(r['answers'][0]['status'], 'draft_for_review')
        self.assertEqual(r['answers'][1]['status'], 'needs_evidence')

    def test_real_data_and_duplicate_source_ids_are_rejected(self):
        self.knowledge['fictional'] = False
        with self.assertRaises(InputError):self.execute('questionnaire')
        self.knowledge['fictional'] = True
        self.knowledge['sources'].append(copy.deepcopy(self.knowledge['sources'][0]))
        with self.assertRaises(InputError):self.execute('questionnaire')


class BrowserSurfaceTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = make_server(0)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join()

    def request(self, path, method='GET', data=None, headers=None):
        c = http.client.HTTPConnection('127.0.0.1', self.server.server_port, timeout=5)
        try:
            c.request(method, path, json.dumps(data) if data is not None else None, headers or {})
            r = c.getresponse()
            return r.status, dict(r.getheaders()), r.read().decode()
        finally:c.close()

    def test_local_front_page_and_all_four_flows(self):
        status, headers, body = self.request('/')
        self.assertEqual(status, 200)
        self.assertIn('Meridian Labs', body)
        self.assertEqual(headers['Cache-Control'], 'no-store')
        self.assertIn('href="/evaluation"', body)
        status, _, body = self.request('/evaluation')
        self.assertEqual(status, 200)
        self.assertIn('Saved-output comparison', body)
        status, _, body = self.request('/api/evaluations')
        self.assertEqual(status, 200)
        self.assertEqual(json.loads(body)['passed'], json.loads(body)['attempted'])
        status, _, body = self.request('/api/benchmarks')
        self.assertEqual(status, 200)
        self.assertEqual([c['successful'] for c in json.loads(body)['candidates']], [5, 0])
        for flow in ('release-notes','vulnerabilities','questionnaire','soc2'):
            status, _, body = self.request('/api/run/'+flow, 'POST',
                      {'options': {'as_of':'2026-10-26'}}, {'Content-Type':'application/json'})
            self.assertEqual(status, 200, body)
            self.assertFalse(json.loads(body)['external_writes'])

    def test_cross_origin_and_foreign_host_are_rejected(self):
        self.assertEqual(self.request('/', headers={'Host':'untrusted.invalid'})[0], 403)
        self.assertEqual(self.request('/api/run/release-notes', 'POST', {},
            {'Content-Type':'application/json','Origin':'https://untrusted.invalid'})[0], 403)

    def test_invalid_input_and_private_paths_are_not_served(self):
        self.assertEqual(self.request('/private-data/notion-export.json')[0], 404)
        self.assertEqual(self.request('/../../.env')[0], 404)
        self.assertEqual(self.request('/api/run/questionnaire', 'POST', [],
            {'Content-Type':'application/json'})[0], 400)
        self.assertEqual(self.request('/api/run/unknown', 'POST', {},
            {'Content-Type':'application/json'})[0], 404)


if __name__ == '__main__':unittest.main()
