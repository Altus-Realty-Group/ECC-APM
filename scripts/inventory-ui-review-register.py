import csv,re
from pathlib import Path
root=Path.cwd()/'docs/ui-recovery'
text=(root/'ECC_UI_RECOVERY_AND_REBUILD_PLAN.md').read_text()
existing_path=root/'experience-review-register.csv'
existing={r['design_id']:r for r in csv.DictReader(existing_path.open())} if existing_path.exists() else {}
records=[]
for line in text.splitlines():
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
with (root/'experience-review-register.csv').open('w',newline='') as f:
 w=csv.writer(f);w.writerow(['design_id','surface_or_location','purpose_or_contents','data_or_behavior','links_or_requirement','approval','required_states','required_viewports','source_sha_and_evidence','dion_decision']);w.writerows(records)
print('review_items',len(records),'planned',sum(r[0].startswith('PL') for r in records))
