#!/usr/bin/env python3
"""Verify an Ekolocs account archive offline; optionally prepare (never execute) recovery files."""
import argparse, getpass, hashlib, io, json, os, pathlib, tarfile, uuid
MAGIC=b'EKOLOCS-BACKUP-1\n'
TABLES=('profiles','biens','lots','baux','locataires','affectations_lots_baux','paiements','quittances','depenses','financements','documents','alertes')
LINKS={'biens':{'parent_bien_id':'biens','parent_lot_id':'lots'},'lots':{'bien_id':'biens','parent_lot_id':'lots'},'baux':{'bien_id':'biens','lot_id':'lots'},'locataires':{'bien_id':'biens','bail_id':'baux','lot_id':'lots'},'affectations_lots_baux':{'bail_id':'baux','lot_id':'lots'},'paiements':{'bien_id':'biens','locataire_id':'locataires','bail_id':'baux'},'quittances':{'bien_id':'biens','locataire_id':'locataires'},'depenses':{'bien_id':'biens'},'financements':{'bien_id':'biens'},'documents':{'bien_id':'biens','lot_id':'lots'},'alertes':{'bien_id':'biens','locataire_id':'locataires'}}
def read_archive(path,password):
 from cryptography.hazmat.primitives.ciphers.aead import AESGCM
 from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
 from cryptography.hazmat.primitives import hashes
 raw=pathlib.Path(path).read_bytes()
 if not raw.startswith(MAGIC) or len(raw)<len(MAGIC)+44: raise ValueError('Format de sauvegarde inconnu.')
 at=len(MAGIC);salt=raw[at:at+16];iv=raw[at+16:at+28]
 key=PBKDF2HMAC(algorithm=hashes.SHA256(),length=32,salt=salt,iterations=310000).derive(password.encode())
 try: plain=AESGCM(key).decrypt(iv,raw[at+28:],MAGIC)
 except Exception as exc: raise ValueError('Phrase secrète incorrecte ou archive altérée.') from exc
 files={}
 with tarfile.open(fileobj=io.BytesIO(plain),mode='r:') as archive:
  for member in archive.getmembers():
   parts=pathlib.PurePosixPath(member.name)
   if not member.isfile() or member.name.startswith('/') or '\\' in member.name or any(s in ('','.', '..') for s in member.name.split('/')) or member.name in files: raise ValueError('Chemin invalide ou dupliqué dans l’archive.')
   files[member.name]=archive.extractfile(member).read()
 return verify_files(files)
def verify_files(files):
 manifest=json.loads(files['manifest.json']);data=json.loads(files['data.json'])
 if manifest.get('format')!='ekolocs-account' or manifest.get('version')!=1: raise ValueError('Version inconnue.')
 owner=manifest['owner_id'];uuid.UUID(owner)
 if set(data)!=set(TABLES) or set(manifest['tables'])!=set(TABLES): raise ValueError('Tables manquantes ou inattendues.')
 checks=manifest['files'];paths=[c['path'] for c in checks]
 if len(paths)!=len(set(paths)) or set(paths)!=(set(files)-{'manifest.json'}): raise ValueError('Inventaire de fichiers incohérent.')
 for c in checks:
  value=files[c['path']]
  if len(value)!=c['bytes'] or hashlib.sha256(value).hexdigest()!=c['sha256']: raise ValueError('Empreinte de fichier incorrecte.')
  if c['path']!='data.json' and not c['path'].startswith('files/documents/'+owner+'/'): raise ValueError('Document extérieur au compte.')
 ids={}
 for table in TABLES:
  if not isinstance(data[table],list) or len(data[table])!=manifest['tables'][table]: raise ValueError('Nombre de lignes incohérent.')
  ids[table]=set()
  for row in data[table]:
   uuid.UUID(row['id'])
   if row['id'] in ids[table] or (row['id'] if table=='profiles' else row.get('proprietaire_id'))!=owner: raise ValueError('Ligne dupliquée ou extérieure au compte.')
   ids[table].add(row['id'])
 for table,links in LINKS.items():
  for row in data[table]:
   for column,target in links.items():
    if row.get(column) and row[column] not in ids[target]: raise ValueError('Référence non sauvegardée : '+table+'.'+column)
 return manifest,data,files

def prepare_sql(manifest,data):
 """Restoration only into an empty account with its original Auth UUID already present."""
 owner=manifest['owner_id'];uuid.UUID(owner)
 lines=['-- Ekolocs : À RELIRE ET TESTER SUR UNE COPIE ISOLÉE. Ne supprime aucune donnée.', 'begin;', 'set local lock_timeout = \'5s\';', 'lock table '+', '.join('public.'+t for t in TABLES)+' in exclusive mode;', "do $$ begin if not exists(select 1 from auth.users where id='"+owner+"'::uuid) then raise exception 'Compte Auth d’origine absent. Restaurez les comptes avant les données.'; end if; end $$;"]
 pending=[]
 def literal(value):
  text=json.dumps(value,ensure_ascii=False,separators=(',',':'));tag='$eko_'+uuid.uuid4().hex+'$'
  while tag in text:tag='$eko_'+uuid.uuid4().hex+'$'
  return tag+text+tag+'::jsonb'
 for table in TABLES:
  owner_col='id' if table=='profiles' else 'proprietaire_id'
  lines.append("do $$ begin if exists(select 1 from public."+table+" where "+owner_col+"='"+owner+"'::uuid) then raise exception 'Destination non vide : "+table+". Aucune donnée n’a été modifiée.'; end if; end $$;")
  rows=json.loads(json.dumps(data[table]));columns=set()
  for row in rows:
   columns.update(row)
   if table in ('biens','lots'):
    for col in ('parent_bien_id','parent_lot_id'):
     if row.get(col):pending.append((table,row['id'],col,row[col]));row[col]=None
  if any(not c.replace('_','').isalnum() or not c[0].isalpha() for c in columns): raise ValueError('Colonne invalide.')
  if rows:
   names=literal(sorted(columns))
   lines.append("do $$ begin if exists(select 1 from jsonb_array_elements_text("+names+") x where not exists(select 1 from information_schema.columns c where c.table_schema='public' and c.table_name='"+table+"' and c.column_name=x)) then raise exception 'Schéma incompatible : "+table+". Appliquez les migrations correspondantes.'; end if; end $$;")
   lines.append('insert into public.'+table+' select * from jsonb_populate_recordset(null::public.'+table+','+literal(rows)+');')
 for table,row_id,column,target in pending:
  uuid.UUID(target);uuid.UUID(row_id);lines.append("update public."+table+" set "+column+"='"+target+"'::uuid where id='"+row_id+"'::uuid and proprietaire_id='"+owner+"'::uuid;")
 lines+=['commit;','-- Les fichiers Documents doivent ensuite être réimportés sous leurs chemins originaux dans le bucket privé documents.']
 return '\n'.join(lines)+'\n'

def write_package(destination,manifest,data,files):
 root=pathlib.Path(destination)
 if root.exists():raise ValueError('Le dossier de destination existe déjà. Choisissez un nouveau dossier vide.')
 root.mkdir(mode=0o700,parents=True)
 for name,content in files.items():
  target=root.joinpath(*pathlib.PurePosixPath(name).parts);target.parent.mkdir(mode=0o700,parents=True,exist_ok=True)
  with open(target,'xb') as out:os.chmod(target,0o600);out.write(content)
 with open(root/'restauration-a-relire.sql','x',encoding='utf8') as out:os.chmod(out.name,0o600);out.write(prepare_sql(manifest,data))

def main():
 parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('archive');parser.add_argument('--prepare-recovery',metavar='NOUVEAU_DOSSIER',help='Préparer des fichiers déchiffrés et du SQL sans les exécuter.');args=parser.parse_args()
 manifest,data,files=read_archive(args.archive,getpass.getpass('Phrase secrète de l’archive : '))
 print('Archive vérifiée. Tables :',len(data),'— Documents :',len(files)-2)
 if manifest.get('external_links_not_downloaded'):print('Liens externes non copiés :',len(manifest['external_links_not_downloaded']))
 if args.prepare_recovery:write_package(args.prepare_recovery,manifest,data,files);print('Dossier préparé. Aucun accès à une base et aucune restauration exécutée.')
if __name__=='__main__':
 try:main()
 except Exception as exc:raise SystemExit('Échec de vérification : '+str(exc))
