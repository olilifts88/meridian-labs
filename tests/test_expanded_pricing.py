import copy
import json
import tempfile
import unittest
from decimal import Decimal
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from workflow_portfolio.usage.pricing_engine import estimate,estimate_task
from workflow_portfolio.usage.pricing_preflight import preflight,parse_model_page

CARD=json.loads((Path(__file__).resolve().parents[1]/'src/workflow_portfolio/usage/openai-rate-card.json').read_text())

class PricingTests(unittest.TestCase):
    def row(self,**changes):
        return dict(dict(session_id='s',response_id='r',recorded_model='gpt-6.1-terra',input_tokens=12000,
                         cached_input_tokens=4000,cache_write_input_tokens=7000,cache_write_30m_tokens=3000,
                         cache_write_12h_tokens=4000,cache_write_semantics='openai-input-subset-v1',
                         output_tokens=1000,reasoning_output_tokens=700,total_tokens=13000),**changes)
    def test_cache_example_and_reasoning_subset(self):
        self.assertEqual(estimate(self.row(),CARD)[0],Decimal('.01995'))
        self.assertEqual(estimate(self.row(reasoning_output_tokens=0),CARD)[0],Decimal('.01995'))
    def test_complete_task_includes_retry_and_deduplicates(self):
        row=self.row(role='coordinator');retry=self.row(response_id='retry',role='retry')
        task=estimate_task([row,row,retry],CARD,True)
        self.assertEqual(task['estimated_usd'],'0.03990')
        self.assertEqual(task['duplicate_records_skipped'],1)
        self.assertIn('retry',task['by_role'])
        self.assertIsNone(estimate_task([row],CARD)['estimated_usd'])
        with self.assertRaises(ValueError):estimate_task([row,self.row(output_tokens=3)],CARD,True)
    def test_missing_data_unknown_model_and_unverified_writes(self):
        for change in ({'recorded_model':'future'},{'input_tokens':-1},{'cache_write_semantics':None},{'output_tokens':None}):
            self.assertIsNone(estimate(self.row(**change),CARD)[0])
    def test_preflight_failure_preserves_last_verified_card(self):
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'rates.json';path.write_text(json.dumps(CARD));before=path.read_bytes()
            def offline(url):raise OSError('Offline')
            self.assertEqual(preflight(path,offline)['status'],'saved_rates')
            self.assertEqual(path.read_bytes(),before)
    def test_parser_refuses_changed_rules(self):
        old=CARD['models']['gpt-6.1-terra']
        with self.assertRaises(ValueError):parse_model_page('gpt-6.1-terra Text tokens Input $1', 'gpt-6.1-terra',old)
    def test_refresh_atomically_archives_and_updates_all_models(self):
        def source(url):
            if 'prompt-caching' in url:return '12-hour cache writes 2.5× ordinary input'
            id=url.rsplit('/',1)[1];m=CARD['models'][id]
            return f'{id} Text tokens Input ${m["input"]} Cached input ${m["cached"]} Cache writes ${m["write_30m"]} Output ${m["output"]} 272K 2x input 1.5x output 50% of Standard 2x Standard 6x Standard Ultrafast'
        with tempfile.TemporaryDirectory() as d:
            path=Path(d)/'rates.json';path.write_text(json.dumps(CARD))
            self.assertEqual(preflight(path,source)['status'],'verified')
            self.assertEqual(len(list((path.parent/'rate-history').glob('*.json'))),1)
            self.assertEqual(len(json.loads(path.read_text())['models']),5)

if __name__=='__main__':unittest.main()
