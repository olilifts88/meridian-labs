import unittest
from decimal import Decimal
from workflow_portfolio.usage.token_cost import estimate,summarise_costs
class Costs(unittest.TestCase):
 def row(self,**kw):
  return dict(recorded_model='example-model',input_tokens=1000000,cached_input_tokens=800000,output_tokens=10000,total_tokens=1010000,reasoning_output_tokens=5000,cache_write_input_tokens=0,timestamp='2026-10-14T12:00:00Z',execution_kind='main',**kw)
 def test_long_context(self):self.assertEqual(estimate(self.row())[0],Decimal('1.11'))
 def test_threshold(self):
  r=self.row();r.update(input_tokens=272000,cached_input_tokens=200000,total_tokens=282000)
  self.assertEqual(estimate(r)[0],Decimal('.264'))
 def test_missing_model(self):
  r=self.row();r['recorded_model']='codex-auto-review';self.assertIsNone(estimate(r)[0])
 def test_missing_category(self):
  r=self.row();r.pop('cache_write_input_tokens');self.assertIsNone(estimate(r)[0])
 def test_subsets_not_added(self):
  r=self.row();a=estimate(r)[0];r['reasoning_output_tokens']=10000;self.assertEqual(a,estimate(r)[0])
 def test_bad_subset(self):
  r=self.row();r['cached_input_tokens']=2000000;self.assertIsNone(estimate(r)[0])
 def test_guardian_and_unpriced(self):
  a=self.row();b=self.row();b['execution_kind']='internal guardian';c=self.row();c['recorded_model']='future'
  s=summarise_costs([a,b,c]);self.assertEqual(s['estimated_usd'],'1.11');self.assertEqual(s['excluded_guardian_tokens'],1010000);self.assertEqual(s['unpriced_tokens'],1010000);self.assertEqual(s['weekly'][0]['tokens'],2020000)
 def test_no_priced_is_unavailable(self):
  r=self.row();r['recorded_model']='future';self.assertIsNone(summarise_costs([r])['estimated_usd'])
class CustomCardTests(unittest.TestCase):
 def test_supplied_rates_and_long_context_policy(self):
  from workflow_portfolio.usage.token_cost import CARD
  card=dict(CARD, long_context_input_multiplier=1, long_context_output_multiplier=1, models={'custom-model':{'input':1,'cached':0.1,'output':2}})
  row=Costs().row();row['recorded_model']='custom-model'
  self.assertEqual(estimate(row,card)[0],Decimal('0.30'))
 def test_missing_cache_write_semantics_is_not_zero_cost(self):
  row=Costs().row();row['cache_write_input_tokens']=2
  self.assertIsNone(estimate(row)[0])

if __name__=='__main__':unittest.main()
