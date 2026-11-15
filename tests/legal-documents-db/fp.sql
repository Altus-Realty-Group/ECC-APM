-- Deterministic fingerprint of the public schema (structure, ACLs, policies, triggers, function bodies, row COUNTS) and of the two runtime roles.
-- Variables: -v tables=<regex on relation names> -v funcs=<regex on function names>. Output: one line per fact, sorted.
SELECT x FROM (
  SELECT 'col '||table_name||'.'||column_name||' '||data_type||' '||is_nullable||' '||coalesce(column_default,'') x
    FROM information_schema.columns WHERE table_schema='public' AND table_name ~ :'tables'
  UNION ALL SELECT 'con '||conrelid::regclass||' '||conname||' '||pg_get_constraintdef(oid)||' validated='||convalidated::text
    FROM pg_constraint WHERE connamespace='public'::regnamespace AND conrelid<>0 AND conrelid::regclass::text ~ :'tables'
  UNION ALL SELECT 'idx '||indexdef FROM pg_indexes WHERE schemaname='public' AND tablename ~ :'tables'
  UNION ALL SELECT 'trg '||pg_get_triggerdef(oid) FROM pg_trigger WHERE NOT tgisinternal AND tgrelid::regclass::text ~ :'tables'
  UNION ALL SELECT 'pol '||tablename||' '||policyname||' '||cmd||' '||roles::text||' '||coalesce(qual,'')||' '||coalesce(with_check,'')
    FROM pg_policies WHERE schemaname='public' AND tablename ~ :'tables'
  UNION ALL SELECT 'rel '||relname||' kind='||relkind::text||' rls='||relrowsecurity::text||'/'||relforcerowsecurity::text||' owner='||relowner::regrole||' acl='||coalesce(relacl::text,'')||' opts='||coalesce(reloptions::text,'')
    FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind IN ('r','v','p') AND relname ~ :'tables'
  UNION ALL SELECT 'view '||viewname||' '||md5(definition) FROM pg_views WHERE schemaname='public' AND viewname ~ :'tables'
  UNION ALL SELECT 'fn '||proname||'('||pg_get_function_identity_arguments(oid)||') '||md5(prosrc)||' acl='||coalesce(proacl::text,'')||' secdef='||prosecdef::text
    FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname ~ :'funcs'
  UNION ALL SELECT 'cnt '||relname||' '||(xpath('/row/c/text()', query_to_xml(format('select count(*) as c from public.%I', relname), false, true, '')))[1]::text
    FROM pg_class WHERE relnamespace='public'::regnamespace AND relkind='r' AND relname ~ :'tables'
  UNION ALL SELECT 'role '||rolname||' login='||rolcanlogin::text||' bypassrls='||rolbypassrls::text||' super='||rolsuper::text||' createrole='||rolcreaterole::text||' createdb='||rolcreatedb::text
         ||' inherit='||rolinherit::text||' repl='||rolreplication::text||' conn='||rolconnlimit::text||' cfg='||coalesce(rolconfig::text,'')
    FROM pg_roles WHERE rolname IN ('ecc_legal_runtime','ecc_documents_runtime')
  UNION ALL SELECT 'member '||roleid::regrole||' '||member::regrole FROM pg_auth_members
    WHERE roleid::regrole::text IN ('ecc_legal_runtime','ecc_documents_runtime') OR member::regrole::text IN ('ecc_legal_runtime','ecc_documents_runtime')
  UNION ALL SELECT 'dep '||r.rolname||' '||d.deptype::text||' '||count(*)::text FROM pg_shdepend d JOIN pg_roles r ON r.oid=d.refobjid
    WHERE r.rolname IN ('ecc_legal_runtime','ecc_documents_runtime') AND d.dbid=(SELECT oid FROM pg_database WHERE datname=current_database())
    GROUP BY r.rolname, d.deptype
) s ORDER BY x;
