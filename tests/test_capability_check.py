import importlib.util
from pathlib import Path
import json
import tempfile
import unittest
from unittest.mock import patch

ROOT=Path(__file__).resolve().parents[1]
SPEC=importlib.util.spec_from_file_location('capability_check',ROOT/'scripts/capability_check.py')
checker=importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(checker)


class CapabilityCheckTests(unittest.TestCase):
    def test_current_manifest_references_resolve_and_plans_are_not_code(self):
        manifest=json.loads((ROOT/'capabilities.json').read_text())
        for cap in manifest['capabilities']:
            result=checker.inspect_capability(cap)
            self.assertFalse(result['missing_files'],cap['id'])
            self.assertFalse(result['missing_symbols'],cap['id'])
            self.assertFalse(result['observed_passing_this_run'])
            if cap.get('status')=='planned':
                self.assertIsNone(result['code_present'])
                self.assertIsNone(result['test_present'])

    def test_sensitive_paths_and_traversal_are_excluded(self):
        for path in ('private-data/policy.json','.git/config','../outside','.env.local','local-telemetry/log.json'):
            with self.assertRaises(ValueError):checker.safe_file(path)

    def test_symlink_cannot_reach_excluded_data(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            (root/'private-data').mkdir()
            (root/'private-data'/'sample').write_text('fictional secret')
            (root/'alias').symlink_to(root/'private-data'/'sample')
            with self.assertRaises(ValueError):checker.safe_file('alias',root)

    def test_hidden_workflow_sources_remain_searchable_in_git_checkout(self):
        if checker.checkout_state()['source_kind']!='git_checkout':
            self.skipTest('Source archives have no Git ignore/index metadata')
        results=checker.search_repo('nodes',limit=60)
        self.assertTrue(any(row['path'].startswith('.n8n/') for row in results))
        self.assertFalse(any(row['path'].startswith('private-data/') for row in results))

    def test_archive_metadata_does_not_invent_a_commit(self):
        with patch.object(checker.shutil,'which',return_value=None):
            self.assertEqual(checker.checkout_state(),{'commit':None,'working_tree_clean':None,'source_kind':'source_archive'})


if __name__=='__main__':unittest.main()
