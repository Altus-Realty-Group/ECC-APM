import csv,re
from pathlib import Path
root=Path.cwd()/'docs/ui-recovery'
text=(root/'ECC_UI_RECOVERY_AND_REBUILD_PLAN.md').read_text()
existing_path=root/'experience-review-register.csv'
existing={r['design_id']:r for r in csv.DictReader(existing_path.open())} if existing_path.exists() else {}
records=[]
section=None
for line in text.splitlines():
 if line.startswith("## "):
  match=re.match(r"## (\d+)\.",line);section=int(match.group(1)) if match else None
 if section not in {3,4,5,6,7}:continue
 if not line.startswith('|'):continue
 cells=[x.strip() for x in line.strip('|').split('|')]
 first=cells[0]
 ids=re.findall(r'\b(?:G\d{2}|CC\d{2}|P\d{2}|A\d{2}|LR\d{2}|L\d{2}|(?:PR|UN|LE|TE|OW)-[A-Z]+[0-9]*)\b',first)
 if not ids:continue
 for id in ids:
  if any(r[0]==id for r in records):continue
  records.append([id,first,*(cells[1:4]+["", "", ""])[:3], 'NOT APPROVED','populated; confirmed empty; partial/unknown; zero; loading; failure; denied/session; stale/conflict','desktop; tablet; 390px phone','',''])
planned=False
for line in text.splitlines():
 if line.startswith('## 8.'):planned=True
 if line.startswith('## 9.'):planned=False
 if planned and line.startswith('| `/'):
  cells=[x.strip() for x in line.strip('|').split('|')]
  records.append([f'PL{1+sum(r[0].startswith("PL") for r in records):02}',cells[0],cells[1],cells[2],'planned data contract required','NOT APPROVED','designed; populated; empty; unknown; failure; denied; stale','desktop; tablet; 390px phone','',''])
assert len({r[0] for r in records})==len(records),'duplicate IDs'
for row in records:
 old=existing.get(row[0])
 if old:
  if all(str(row[i])==old[k] for i,k in enumerate(['design_id','surface_or_location','purpose_or_contents','data_or_behavior','links_or_requirement'])) and row[6]==old['required_states'] and row[7]==old['required_viewports']:
   row[5],row[8],row[9]=old['approval'],old['source_sha_and_evidence'],old['dion_decision']
  elif old['source_sha_and_evidence'] or old['dion_decision'] or old['approval']!='NOT APPROVED':
   row[8]=old['source_sha_and_evidence'];row[9]='Specification changed; previous decision retained for review: '+old['approval']+' / '+old['dion_decision']
for id,old in existing.items():
 if not any(r[0]==id for r in records):
  records.append([old[k] for k in ['design_id','surface_or_location','purpose_or_contents','data_or_behavior','links_or_requirement']]+['REMOVAL NEEDS REVIEW',old['required_states'],old['required_viewports'],old['source_sha_and_evidence'],old['dion_decision']])
def review_batch(id):
 if id.startswith(('CC','G')) or id=='P01':return 'Command Center baseline'
 if id.startswith(('PR-','UN-')) or id in {'P02','P03','P23','P24'}:return 'Property and Unit'
 if id.startswith(('LE-','TE-')) or id in {'P04','P05','P25','P26'}:return 'Lease and Tenant'
 if id.startswith('OW-') or id in {'P06','P27'}:return 'Ownership'
 if id.startswith(('LR','L0')) or id in {'P13','P14'}:return 'Legal'
 return 'Backlog' if id.startswith('PL') else 'Other operating slice'
for row in records:
 old=existing.get(row[0],{})
 unchanged=all(str(row[i])==old.get(k) for i,k in enumerate(['design_id','surface_or_location','purpose_or_contents','data_or_behavior','links_or_requirement'])) and row[6]==old.get('required_states') and row[7]==old.get('required_viewports') and row[5]!='REMOVAL NEEDS REVIEW'
 row.extend([old.get('codex_visual_review','PENDING') if unchanged else 'PENDING',review_batch(row[0])])
with (root/'experience-review-register.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['design_id','surface_or_location','purpose_or_contents','data_or_behavior','links_or_requirement','approval','required_states','required_viewports','source_sha_and_evidence','dion_decision','codex_visual_review','visual_review_batch']);w.writerows(records)
print('review_items',len(records),'planned',sum(r[0].startswith('PL') for r in records))
