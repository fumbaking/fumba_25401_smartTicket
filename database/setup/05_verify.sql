-- =============================================================================
-- [Phase III] 05_verify.sql : verification queries for Task 6
-- Student   : FUMBA Huriro
-- Student ID: 25401
-- Group     : B
-- Project   : SmartTicket (Smart Event Ticketing System)
-- Course    : INSY 8311 Database Development with PL/SQL (AUCA)
-- Run as    : fumba_admin/fumba@//localhost:1521/b_25401_fumba_smartticket_db
--             from the repository root, so the spool file lands in screenshots/
--   sqlplus fumba_admin/fumba@//localhost:1521/b_25401_fumba_smartticket_db @database/setup/05_verify.sql
-- Output    : screenshots/05_verify_output.txt
-- =============================================================================

SET ECHO ON
SET LINESIZE 200
SET PAGESIZE 100
SET TRIMSPOOL ON
COLUMN pdb_name             FORMAT a30
COLUMN name                 FORMAT a30
COLUMN open_mode            FORMAT a12
COLUMN username             FORMAT a14
COLUMN default_tablespace   FORMAT a18
COLUMN temporary_tablespace FORMAT a20
COLUMN tablespace_name      FORMAT a18
COLUMN contents             FORMAT a10
COLUMN autoextensible       FORMAT a4  HEADING AUTO
COLUMN file_name            FORMAT a80
COLUMN max_quota            FORMAT a10

SPOOL screenshots/05_verify_output.txt

-- 0. Who, where and when
SELECT SYS_CONTEXT('USERENV', 'CON_NAME')    AS pdb_name,
       USER                                  AS username,
       TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS run_at
FROM   dual;

-- 1. The PDB exists and is open
SELECT name, open_mode, TO_CHAR(creation_time, 'YYYY-MM-DD HH24:MI') AS created
FROM   v$pdbs;

-- 2. Admin user: default and temporary tablespaces, roles and quotas
SELECT username, default_tablespace, temporary_tablespace, account_status
FROM   dba_users
WHERE  username = 'FUMBA_ADMIN';

SELECT granted_role FROM dba_role_privs WHERE grantee = 'FUMBA_ADMIN' ORDER BY 1;

SELECT tablespace_name,
       CASE max_bytes WHEN -1 THEN 'UNLIMITED' ELSE TO_CHAR(max_bytes) END AS max_quota
FROM   dba_ts_quotas
WHERE  username = 'FUMBA_ADMIN'
ORDER  BY 1;

-- 3. Each tablespace: size, autoextend, increment and maximum size
SELECT f.tablespace_name, t.contents,
       ROUND(f.bytes / 1024 / 1024)                        AS size_mb,
       f.autoextensible,
       ROUND(f.increment_by * t.block_size / 1024 / 1024)  AS next_mb,
       ROUND(f.maxbytes / 1024 / 1024)                     AS max_mb
FROM   dba_data_files f JOIN dba_tablespaces t ON t.tablespace_name = f.tablespace_name
WHERE  f.tablespace_name LIKE 'SMARTTICKET%'
UNION ALL
SELECT f.tablespace_name, t.contents,
       ROUND(f.bytes / 1024 / 1024),
       f.autoextensible,
       ROUND(f.increment_by * t.block_size / 1024 / 1024),
       ROUND(f.maxbytes / 1024 / 1024)
FROM   dba_temp_files f JOIN dba_tablespaces t ON t.tablespace_name = f.tablespace_name
WHERE  f.tablespace_name LIKE 'SMARTTICKET%'
ORDER  BY 1;

SELECT tablespace_name, file_name FROM dba_data_files WHERE tablespace_name LIKE 'SMARTTICKET%'
UNION ALL
SELECT tablespace_name, file_name FROM dba_temp_files WHERE tablespace_name LIKE 'SMARTTICKET%'
ORDER  BY 1;

-- 4. Archive log mode of the database (a CDB-wide setting, visible from the PDB)
SELECT name, log_mode FROM v$database;

-- 5. EM Express HTTPS port of this PDB (55 + last two digits of 25401)
SELECT DBMS_XDB_CONFIG.GETHTTPSPORT() AS em_https_port FROM dual;

SPOOL OFF
