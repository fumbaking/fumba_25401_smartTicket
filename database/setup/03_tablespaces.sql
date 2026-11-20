-- =============================================================================
-- [Phase III] 03_tablespaces.sql : data, index and temporary tablespaces
-- Student   : FUMBA Huriro
-- Student ID: 25401
-- Group     : B
-- Project   : SmartTicket (Smart Event Ticketing System)
-- Course    : INSY 8311 Database Development with PL/SQL (AUCA)
-- Run as    : fumba_admin/fumba@//localhost:1521/b_25401_fumba_smartticket_db
-- =============================================================================
--   smartticket_data : 100M, AUTOEXTEND ON NEXT 10M MAXSIZE 1G   (tables)
--   smartticket_idx  :  50M, AUTOEXTEND ON NEXT 10M MAXSIZE 500M (indexes)
--   smartticket_temp :  50M, AUTOEXTEND ON NEXT 10M MAXSIZE 500M (sorts, temp)

SET ECHO ON
SET LINESIZE 200

CREATE TABLESPACE smartticket_data
  DATAFILE 'D:\APP\ORACLE\ORADATA\ORCL\B_25401_FUMBA_SMARTTICKET_DB\SMARTTICKET_DATA01.DBF'
  SIZE 100M AUTOEXTEND ON NEXT 10M MAXSIZE 1G;

CREATE TABLESPACE smartticket_idx
  DATAFILE 'D:\APP\ORACLE\ORADATA\ORCL\B_25401_FUMBA_SMARTTICKET_DB\SMARTTICKET_IDX01.DBF'
  SIZE 50M AUTOEXTEND ON NEXT 10M MAXSIZE 500M;

CREATE TEMPORARY TABLESPACE smartticket_temp
  TEMPFILE 'D:\APP\ORACLE\ORADATA\ORCL\B_25401_FUMBA_SMARTTICKET_DB\SMARTTICKET_TEMP01.DBF'
  SIZE 50M AUTOEXTEND ON NEXT 10M MAXSIZE 500M;

-- Defaults and quotas for the admin user
ALTER USER fumba_admin
  DEFAULT TABLESPACE smartticket_data
  TEMPORARY TABLESPACE smartticket_temp
  QUOTA UNLIMITED ON smartticket_data
  QUOTA UNLIMITED ON smartticket_idx;

-- Check
COLUMN tablespace_name FORMAT a20
SELECT tablespace_name, ROUND(bytes/1024/1024) AS size_mb, autoextensible,
       ROUND(increment_by * 8192/1024/1024) AS next_mb, ROUND(maxbytes/1024/1024) AS max_mb
FROM   dba_data_files WHERE tablespace_name LIKE 'SMARTTICKET%'
UNION ALL
SELECT tablespace_name, ROUND(bytes/1024/1024), autoextensible,
       ROUND(increment_by * 8192/1024/1024), ROUND(maxbytes/1024/1024)
FROM   dba_temp_files WHERE tablespace_name LIKE 'SMARTTICKET%';
