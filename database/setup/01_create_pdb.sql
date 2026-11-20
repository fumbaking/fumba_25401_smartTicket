-- =============================================================================
-- [Phase III] 01_create_pdb.sql : create, open and save the state of the PDB
-- Student   : FUMBA Huriro
-- Student ID: 25401
-- Group     : B
-- Project   : SmartTicket (Smart Event Ticketing System)
-- Course    : INSY 8311 Database Development with PL/SQL (AUCA)
-- Database  : Oracle Database 21c Enterprise Edition 21.3, CDB "orcl" (local install)
-- Run as    : sqlplus / as sysdba   (connected to CDB$ROOT)
-- =============================================================================
-- PDB name pattern GroupName_StudentID_FirstName_ProjectName_DB:
--   b_25401_fumba_smartticket_db  (28 characters: lowercase, digits, underscores)
-- The CDB does not use Oracle-managed files (db_create_file_dest is empty), so
-- FILE_NAME_CONVERT tells Oracle where to copy the seed's data files.
-- The ADMIN USER clause creates the Task 2 admin user (see 02_create_user.sql).

SET ECHO ON
SET LINESIZE 200
COLUMN name FORMAT a32

SHOW CON_NAME

CREATE PLUGGABLE DATABASE b_25401_fumba_smartticket_db
  ADMIN USER fumba_admin IDENTIFIED BY fumba
  ROLES = (DBA)
  FILE_NAME_CONVERT = ('D:\APP\ORACLE\ORADATA\ORCL\PDBSEED\',
                       'D:\APP\ORACLE\ORADATA\ORCL\B_25401_FUMBA_SMARTTICKET_DB\');

-- Open the PDB and keep it open after a CDB restart
ALTER PLUGGABLE DATABASE b_25401_fumba_smartticket_db OPEN;
ALTER PLUGGABLE DATABASE b_25401_fumba_smartticket_db SAVE STATE;

-- Check
SELECT name, open_mode FROM v$pdbs;
SELECT con_name, instance_name, state FROM dba_pdb_saved_states;
