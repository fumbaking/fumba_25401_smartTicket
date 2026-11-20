-- =============================================================================
-- [Phase III] 04_archive_log.sql : check and enable ARCHIVELOG mode
-- Student   : FUMBA Huriro
-- Student ID: 25401
-- Group     : B
-- Project   : SmartTicket (Smart Event Ticketing System)
-- Course    : INSY 8311 Database Development with PL/SQL (AUCA)
-- Run as    : sqlplus / as sysdba   (connected to CDB$ROOT)
-- =============================================================================
-- Why archive logging cannot be enabled for a single PDB:
--   All PDBs in a CDB share one set of online redo logs and one instance, so
--   redo from every PDB is written to the same log files. Archiving copies those
--   shared log files, so it is a property of the whole CDB (V$DATABASE.LOG_MODE)
--   and can only be switched by SYSDBA in CDB$ROOT while the CDB is mounted,
--   which means restarting every PDB in it. A PDB has no LOG_MODE of its own.
--
-- The steps below were run on my own local installation only. They restart the
-- whole CDB and must NOT be run on the shared lab server.

SET ECHO ON
SET LINESIZE 200
COLUMN name FORMAT a30

-- 1. Current mode (before: NOARCHIVELOG)
ARCHIVE LOG LIST
SELECT name, log_mode FROM v$database;

-- 2. Enable ARCHIVELOG: the database must be mounted, not open
SHUTDOWN IMMEDIATE
STARTUP MOUNT
ALTER DATABASE ARCHIVELOG;
ALTER DATABASE OPEN;

-- 3. Confirm (after: ARCHIVELOG, automatic archival enabled)
ARCHIVE LOG LIST
SELECT name, log_mode FROM v$database;
ALTER SYSTEM SWITCH LOGFILE;

-- The PDB reopens by itself because its state was saved in 01_create_pdb.sql
SELECT name, open_mode FROM v$pdbs;
SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS taken_at FROM dual;
