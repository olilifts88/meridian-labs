"""Build a small recorded-only showcase download from an explicit source allowlist."""
import argparse
import hashlib
import json
import re
import zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
MODULES=['__init__.py','domain.py','store.py','service.py','showcase.py','showcase_server.py',
 'showcase_assurance.py','showcase_evaluation.py','evals.py','call_crm.py','ai_pilot.py','recorded_showcase.py','showcase_measurement.py','studio.css',
 'usage/__init__.py','usage/token_cost.py','usage/example-rate-card.json',
 'showcase.html','call_crm.html','evaluation.html','workflow_home.html','demo_banner.css',
 'run_explorer.html','run_explorer.css','run_explorer.mjs','visitor_results.mjs',
 'routing/__init__.py','routing/router.py','routing/execution.py','routing/local_codex.py']
FILES=['showcase_demo.py','docs/recorded-workflows.md','docs/showcase-routing-and-costs.md','assets/meridian-labs-banner.svg','assets/meridian-labs-lockup.svg',
 'examples/recorded-runs/pilot-2026-10-28.json','examples/routing/policy.json','examples/routing/capabilities.json']
FILES += ['examples/showcase/'+name for name in ['calls.json','knowledge.json','questionnaire.json','soc2.json','vulnerabilities.json','pilot-guidance.json']]
FILES += ['docs/workflow-guidance/pilot-'+flow+'.md' for flow in ['release-notes','vulnerabilities','questionnaire','soc2','call-crm']]
FILES += ['src/workflow_portfolio/'+name for name in MODULES]


def build(destination):
    destination=Path(destination);destination.parent.mkdir(parents=True,exist_ok=True)
    sources={name:ROOT/name for name in FILES}
    sources['README.md']=ROOT/'docs/showcase-quickstart.md'
    for name,path in sources.items():
        if not path.is_file():raise ValueError('Missing showcase file: '+name)
    contents={name:path.read_bytes() for name,path in sources.items()}
    def readme_link(match):
        target=match.group(1)
        if target.startswith(('https:', 'http:', '#')):return match.group(0)
        path,sep,anchor=target.partition('#')
        resolved=(sources['README.md'].parent/path).resolve()
        relative=resolved.relative_to(ROOT).as_posix()
        if relative not in sources:raise ValueError('Packaged README links outside showcase: '+relative)
        return ']('+relative+(sep+anchor if sep else '')+')'
    readme=contents['README.md'].decode('utf-8')
    contents['README.md']=re.sub(r'\]\(([^)]+)\)',readme_link,readme).encode('utf-8')
    manifest={name:hashlib.sha256(data).hexdigest() for name,data in contents.items()}
    with zipfile.ZipFile(destination,'w',compression=zipfile.ZIP_DEFLATED) as archive:
        def add(name, data):
            # Stable metadata makes repeated builds from the same files reproducible.
            entry=zipfile.ZipInfo('meridian-workflow-showcase/'+name, date_time=(1980,1,1,0,0,0))
            entry.compress_type=zipfile.ZIP_DEFLATED
            entry.external_attr=0o100644 << 16
            archive.writestr(entry,data)
        for name,data in sorted(contents.items()):add(name,data)
        add('MANIFEST.json',json.dumps(manifest,indent=2)+'\n')
    checksum=hashlib.sha256(destination.read_bytes()).hexdigest()
    checksum_path=destination.with_suffix(destination.suffix+'.sha256')
    checksum_path.write_text(checksum+'  '+destination.name+'\n')
    return {'path':str(destination),'files':len(sources)+1,'bytes':destination.stat().st_size,
            'sha256':checksum,'checksum_path':str(checksum_path)}

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'dist/meridian-ai-workflows.zip')
    print(json.dumps(build(parser.parse_args().output),indent=2))
