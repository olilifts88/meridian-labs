"""Public-safe recorded runs and stateless scenario execution. No model dispatcher."""
import copy
import datetime as dt
import hashlib
import json
import time
import uuid
from pathlib import Path

from .showcase import ROOT, load_json
from .call_crm import simulate, evaluate as evaluate_calls

SNAPSHOT = ROOT / 'examples' / 'recorded-runs' / 'pilot-2026-10-28.json'
SCHEMA = 'recorded-workflow-showcase-v1'
CHOICES = ('pending', 'approve', 'reject')


def text_digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def check_record(record):
    if not record:
        return None
    return {k: copy.deepcopy(record[k]) for k in
            ('rubric', 'outcome', 'criteria', 'error', 'not_assessed') if k in record}


def export_snapshot(directory, destination=SNAPSHOT):
    """Explicit export from verified private receipts. Never export auth or review prose."""
    from .ai_pilot import report, verify, prompt, digest
    directory=Path(directory)
    result=report(directory)
    if result['status']!='complete' or result['attempted']!=40:
        raise ValueError('Export requires the complete 40-answer pilot')
    experiment=verify(load_json(directory/'experiment.json'))
    cases={c['id']:c for c in experiment['cases']}
    configs={c['id']:c for c in experiment['configurations']}
    records=[]
    for row in result['answers']:
        config=configs[row['configuration']]
        records.append({'id':row['id'],'case_id':row['case_id'],'configuration':row['configuration'],
            'recorded_at':row['finished_at'],'answer':row['answer'],'answer_sha256':text_digest(row['answer']),
            'evidence':copy.deepcopy(row['source']['evidence']),
            'task_instructions':prompt(cases[row['case_id']],config,experiment).split('Evidence:\n',1)[0],
            'requested_model':row['requested_model'],'requested_effort':row['requested_effort'],
            'actual_model':row.get('actual_model'),'actual_effort':row.get('actual_effort'),
            'generation_duration_ms':row['generation_duration_ms'],'usage':copy.deepcopy(row.get('usage')),
            'original_checks':check_record(row['original_evaluation']),
            'revised_checks':check_record(row.get('recheck_evaluation')),
            'owner_review':row.get('human_review',{}).get('human_label') if row.get('human_review') else None,
            'provenance':{'dataset_digest':result['dataset_digest'],'prompt_digest':row['prompt_digest'],
                          'receipt_digest':row['receipt_digest'],'answer_set_revision':result['review_revision']}})
    value={'schema':SCHEMA,'experiment':experiment,'records':records,
           'description':'Forty genuine subscription-model answers on fictional inputs. Raw execution receipts and private review prose are excluded.',
           'usage_scope':result['measurement_scope'],
           'routing_note':'Fixed requested model and instruction configurations, not an automatic model-routing benchmark.',
           'cost_note':'Tokens are measured; cash cost and savings are unavailable. Subscription charges are separate.',
           'review_note':'Owner review is a published snapshot, not a visitor approval or an unseen accuracy study.'}
    value['digest']=digest(value)
    destination=Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
    destination.write_text(json.dumps(value,indent=2)+'\n')
    return load_snapshot(destination)


def load_snapshot(path=SNAPSHOT):
    from .ai_pilot import verify, digest
    value=load_json(Path(path))
    if value.get('schema')!=SCHEMA or value.get('digest')!=digest({k:v for k,v in value.items() if k!='digest'}):
        raise ValueError('Recorded showcase snapshot failed its integrity check')
    experiment=verify(value['experiment'])
    allowed={c['id']+'--'+case['id'].replace(':','-'):(case, c)
             for c in experiment['configurations'] for case in experiment['cases']}
    rows=value.get('records',[])
    if len(rows)!=40 or len({r['id'] for r in rows})!=40 or set(r['id'] for r in rows)!=set(allowed):
        raise ValueError('Recorded showcase needs all 40 unique answers')
    for row in rows:
        case,config=allowed[row['id']]
        if (row['answer_sha256']!=text_digest(row['answer']) or row['case_id']!=case['id']
                or row['configuration']!=config['id'] or row['requested_model']!=config['model']
                or row['provenance']['dataset_digest']!=experiment['digest']):
            raise ValueError('Recorded answer is not bound to its scenario')
    return value


def catalog(snapshot_path=SNAPSHOT):
    value=load_snapshot(snapshot_path)
    from .showcase_measurement import enrich, routing_summary, RATE_CARD
    cases={c['id']:c for c in value['experiment']['cases']}
    records=[enrich(r,cases[r['case_id']]) for r in value['records']]
    return {'rate_card':copy.deepcopy(RATE_CARD),'routing':routing_summary(list(cases.values()),records),
            'schema':SCHEMA,'snapshot_digest':value['digest'],
            'cases':[{k:c[k] for k in ('id','workflow','title','success')} for c in value['experiment']['cases']],
            'configurations':copy.deepcopy(value['experiment']['configurations']),
            'records':records,
            'model_calls':0,'routing_note':value['routing_note'],'cost_note':value['cost_note'],
            'usage_scope':value['usage_scope'],'review_note':value['review_note']}


def _outcome(case, assessment, choice):
    """Only apply simulated actions after the recorded answer passes fresh checks."""
    if assessment['outcome']!='Pass':
        return {'state':'held_by_checks','summary':'The answer needs changes. Checks held it before any simulated action.',
                'actions':[],'details':[],'external_writes':False}
    result=assessment['workflow_result'];flow=case['workflow']
    if flow=='call-crm':
        fixture=copy.deepcopy(case['fixture']);fixture['calls'][0]['facts']=assessment['generated']['facts']
        initial=simulate(fixture,through=1)
        pending=[a for a in initial['actions'] if a['state']=='pending']
        decisions=[] if choice=='pending' else [
            {'id':a['id'],'revision':a['revision'],'verdict':choice,
             'reason':'Visitor scenario decision; no external action.'} for a in pending]
        final=simulate(fixture,through=1,decisions=decisions)
        evaluated=evaluate_calls(final,fixture)
        state='awaiting_approval' if pending and choice=='pending' else 'simulated_rejected' if pending and choice=='reject' else 'simulated_complete'
        return {'state':state,'summary':'CRM changes and issue links are simulated. Your choice applies only to pending approvals; supported automatic stage changes follow the workflow rules.',
                'actions':[{k:a.get(k) for k in ('id','field','before','after','state','mode','human_approved')} for a in final['actions']],
                'details':[{'issue':i['id'],'title':i['title'],'priority':i['priority']} for i in final['issues']],
                'deals':final['deals'],'domain_checks':evaluated['checks'],'external_writes':False}
    gaps=(result.get('evidence_gaps',0)>0 or result.get('controls_needing_follow_up',0)>0)
    if gaps:
        return {'state':'needs_evidence','summary':'The answer correctly identifies an evidence gap. A scenario approval cannot supply the missing or fresh evidence.',
                'actions':[],'details':result.get('controls',result.get('answers',[])),'external_writes':False}
    targets={'release-notes':'release-note draft','vulnerabilities':'triage report','questionnaire':'questionnaire draft','soc2':'evidence-review summary'}
    state={'pending':'awaiting_approval','approve':'simulated_complete','reject':'simulated_rejected'}[choice]
    verb={'pending':'awaits your simulated approval','approve':'is approved in this simulation','reject':'is rejected in this simulation'}[choice]
    return {'state':state,'summary':f"The {targets[flow]} {verb}. Nothing is published, sent or certified.",
            'actions':[{'field':targets[flow],'state':{'pending':'pending','approve':'applied','reject':'rejected'}[choice],
                        'mode':'human_review','human_approved':choice=='approve'}],
            'details':result.get('findings',result.get('answers',result.get('controls',[]))),'external_writes':False}


def run_scenario(request, snapshot_path=SNAPSHOT):
    """Re-evaluate a preset recorded answer and run domain mechanics without inference."""
    from .ai_pilot import assessment, RECHECK_RUBRIC
    if not isinstance(request,dict) or set(request)-{'record_id','review_choice'}:
        raise ValueError('Choose a recorded answer and a simulated approval only')
    choice=request.get('review_choice','pending')
    if choice not in CHOICES:raise ValueError('Unknown simulated approval choice')
    value=load_snapshot(snapshot_path)
    record=next((r for r in value['records'] if r['id']==request.get('record_id')),None)
    if record is None:raise ValueError('Choose one of the recorded preset answers')
    case=next(c for c in value['experiment']['cases'] if c['id']==record['case_id'])
    from .showcase_measurement import enrich
    record=enrich(record,case)
    start=time.perf_counter()
    fresh=assessment(case,record['answer'],RECHECK_RUBRIC)
    outcome=_outcome(case,fresh,choice)
    actions=outcome['actions']
    safeguards=[{'criterion':'Answer rechecked against its frozen evidence','verdict':'Pass'},
                {'criterion':'Failed answers held before action','verdict':'Pass' if fresh['outcome']=='Pass' or not actions else 'Needs improvement'},
                {'criterion':'Commercial or review actions require the chosen approval','verdict':'Pass' if all(
                    a['state']!='applied' or a.get('mode')=='automatic' or (choice=='approve' and a.get('human_approved') is True) for a in actions) else 'Needs improvement'},
                {'criterion':'No external business writes or model calls','verdict':'Pass'}]
    return {'schema':'visitor-scenario-result-v1','kind':'visitor_scenario','id':'scenario-'+str(uuid.uuid4()),
            'created_at':dt.datetime.now(dt.timezone.utc).isoformat(),'source_run_id':record['id'],
            'snapshot_digest':value['digest'],'record':copy.deepcopy(record),'case':{k:case[k] for k in ('id','workflow','title','success')},
            'review_choice':choice,'fresh_checks':check_record(fresh),'outcome':outcome,'scenario_checks':safeguards,
            'execution':{'model_calls':0,'new_model_tokens':0,'external_writes':False,
                         'local_duration_ms':round((time.perf_counter()-start)*1000,3),
                         'method':'Local Python workflow checks and simulation using an unchanged recorded AI answer.'},
            'benchmark_contribution':False}


def pilot_summary(snapshot_path=SNAPSHOT):
    """Read-only setup comparison for the standalone download; no private review API."""
    data=catalog(snapshot_path);summaries=[]
    for config in data['configurations']:
        rows=[r for r in data['records'] if r['configuration']==config['id']]
        known=[r['usage']['input_tokens']+r['usage']['output_tokens'] for r in rows]
        passed=sum(r['original_checks']['outcome']=='Pass' for r in rows)
        summaries.append({**config,'planned':10,'attempted':len(rows),'completed':len(rows),
          'checks_passed':passed,'recheck_passed':sum((r['revised_checks'] or r['original_checks'])['outcome']=='Pass' for r in rows),
          'human_reviewed':sum(bool(r['owner_review']) for r in rows),'human_correct':sum(r['owner_review']=='Pass' for r in rows),
          'human_unsure':sum(r['owner_review']=='Unverified' for r in rows),
          'mean_generation_duration_ms':round(sum(r['generation_duration_ms'] for r in rows)/len(rows),2),
          'measured_tokens':sum(known),'token_coverage':f'{len(rows)}/{len(rows)}','latency_coverage':f'{len(rows)}/{len(rows)}',
          'tokens_per_check_success':round(sum(known)/passed,2) if passed else None})
    return {'status':'complete','attempted':40,'planned_answers':40,'new_model_calls':0,'cases':data['cases'],
            'configurations':summaries,'answers':[],'private_review_available':False,
            'agreement':{'agreed':0,'reviewed_with_clear_verdict':0},'read_only_snapshot':True}
