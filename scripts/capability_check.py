"""Read-only repository capability inventory; verification is explicit and offline."""
import argparse
import ast
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
EXCLUDED = {'.git','private-data','local-telemetry','usage-reports','local-mirror','.auth','.venv','__pycache__'}


def safe_file(relative, root=ROOT):
    path = Path(relative)
    if path.is_absolute() or '..' in path.parts or any(p in EXCLUDED or p.startswith('.env') for p in path.parts):
        raise ValueError('Excluded or unsafe repository path: '+str(relative))
    full = (root/path).resolve()
    if root.resolve() not in full.parents:
        raise ValueError('Path leaves repository')
    if any(p in EXCLUDED or p.startswith('.env') for p in full.relative_to(root.resolve()).parts):
        raise ValueError('Resolved path is excluded')
    return full


def symbols(path):
    tree = ast.parse(path.read_text(encoding='utf-8'))
    found = set()
    def walk(node, prefix=''):
        for child in ast.iter_child_nodes(node):
            if isinstance(child,(ast.FunctionDef,ast.AsyncFunctionDef,ast.ClassDef)):
                name = prefix+child.name
                found.add(name)
                walk(child,name+'.')
            else:
                walk(child,prefix)
    walk(tree)
    return found


def inspect_capability(capability):
    required = list(dict.fromkeys(capability['files']+capability['tests']))
    missing = [f for f in required if not safe_file(f).is_file()]
    absent_by_kind = {'symbols':[],'test_symbols':[]}
    for mapping in ('symbols','test_symbols'):
        for file, names in capability.get(mapping,{}).items():
            available = symbols(safe_file(file)) if safe_file(file).is_file() else set()
            absent_by_kind[mapping] += [file+':'+name for name in names if name not in available]
    evidence = capability.get('recorded_evidence')
    planned = capability.get('status') == 'planned'
    return {'id':capability['id'],'claim':capability['claim'],
            'status':'planned' if planned else 'implemented',
            'code_present':None if planned else not any(f in capability['files'] for f in missing) and not absent_by_kind['symbols'],
            'test_present':None if planned else not any(f in capability['tests'] for f in missing) and not absent_by_kind['test_symbols'],
            'observed_passing_this_run':False,'missing_files':missing,
            'missing_symbols':absent_by_kind['symbols']+absent_by_kind['test_symbols'],
            'recorded_evidence':evidence if evidence and safe_file(evidence).is_file() else None,
            'recorded_evidence_note':'Dated observations, not proof of a new live run.' if evidence else None,
            'entrypoint':capability['entrypoint'],'files':required,'known_gaps':capability['known_gaps']}


def git_files():
    def command(args):
        p=subprocess.run(['git',*args],cwd=ROOT,capture_output=True,check=True)
        return set(p.stdout.decode().split('\0'))-{''}
    tracked=command(['ls-files','-z'])
    all_files=command(['ls-files','-z','--cached','--others','--exclude-standard'])
    return tracked,all_files


def checkout_state():
    if shutil.which('git'):
        commit=subprocess.run(['git','rev-parse','HEAD'],cwd=ROOT,capture_output=True,text=True)
        if commit.returncode==0:
            state=subprocess.run(['git','status','--porcelain'],cwd=ROOT,capture_output=True,text=True,check=True)
            return {'commit':commit.stdout.strip(),'working_tree_clean':not state.stdout.strip(),'source_kind':'git_checkout'}
    return {'commit':None,'working_tree_clean':None,'source_kind':'source_archive'}


def search_repo(pattern, limit=60):
    regex=re.compile(pattern)
    tracked,files=git_files()
    rows=[]
    for relative in sorted(files):
        try:
            file=safe_file(relative)
            if not file.is_file() or file.stat().st_size>1024*1024:
                continue
            for number,line in enumerate(file.read_text(encoding='utf-8').splitlines(),1):
                if regex.search(line):
                    rows.append({'path':relative,'line':number,'source_status':'tracked' if relative in tracked else 'uncommitted_provisional',
                                 'text':line[:250]})
                    if len(rows)>=limit:return rows
        except (ValueError,UnicodeError,OSError):
            continue
    return rows


def verify(groups):
    node=os.environ.get('MERIDIAN_NODE') or shutil.which('node')
    commands={'python':[sys.executable,'-m','unittest','discover','-s','tests'],
              'scenarios':[sys.executable,'demo.py','evaluate'],
              'javascript':[node,'--test','tests/n8n.test.mjs','tests/n8n-deploy.test.mjs','tests/n8n-mirror.test.mjs','tests/calibration-feedback.test.cjs'],
              'exports':[node,'scripts/build-n8n.mjs','--check']}
    env=dict(os.environ,PYTHONPATH=str(ROOT/'src'))
    results={}
    for group in sorted(groups):
        command=commands[group]
        if command[0] is None:
            results[group]={'passed':False,'detail':'Node 24+ is required for this check'}
            continue
        result=subprocess.run(command,cwd=ROOT,env=env,capture_output=True,text=True,timeout=90)
        results[group]={'passed':result.returncode==0,'returncode':result.returncode,
                        'detail':(result.stdout+result.stderr)[-2500:]}
    return results


def main(argv=None):
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--capability',help='One capability ID from capabilities.json')
    parser.add_argument('--search',help='Search nonignored repository text, including hidden .n8n sources')
    parser.add_argument('--verify',action='store_true',help='Run mapped offline checks; never dispatch a model')
    args=parser.parse_args(argv)
    try:
        manifest=json.loads((ROOT/'capabilities.json').read_text())
        caps=[c for c in manifest['capabilities'] if args.capability is None or c['id']==args.capability]
        if not caps:raise ValueError('Unknown capability ID')
        rows=[inspect_capability(c) for c in caps]
        report={'schema_version':1,'capabilities':rows}
        report.update(checkout_state())
        if args.search:
            if report['source_kind']!='git_checkout':
                raise ValueError('Search requires a Git checkout so repository ignore rules can be respected')
            report['search_results']=search_repo(args.search)
        if args.verify:
            checks=verify({g for c in caps for g in c['verification_groups']})
            report['offline_verification']=checks
            for row,capability in zip(rows,caps):
                row['observed_passing_this_run']=row['status']!='planned' and all(checks[g]['passed'] for g in capability['verification_groups'])
        print(json.dumps(report,indent=2))
        return 0 if all((not r['missing_files'] if r['status']=='planned' else
                        r['code_present'] and r['test_present'] and (not args.verify or r['observed_passing_this_run'])) for r in rows) else 1
    except (ValueError,OSError,subprocess.SubprocessError) as error:
        parser.exit(2,str(error)+'\n')


if __name__=='__main__':raise SystemExit(main())
