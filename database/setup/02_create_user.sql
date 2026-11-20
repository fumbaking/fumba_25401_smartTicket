-- =============================================================================
-- [Phase III] 02_create_user.sql : PDB admin user fumba_admin with the DBA role
-- Student   : FUMBA Huriro
-- Student ID: 25401
-- Group     : B
-- Project   : SmartTicket (Smart Event Ticketing System)
-- Course    : INSY 8311 Database Development with PL/SQL (AUCA)
-- Run as    : sqlplus / as sysdba   (connected to CDB$ROOT)
-- =============================================================================
-- fumba_admin was created by the ADMIN USER clause of CREATE PLUGGABLE DATABASE
-- (01_create_pdb.sql). That clause gives the user the local role PDB_DBA, and
-- ROLES = (DBA) grants DBA to PDB_DBA, so DBA reached the user only indirectly.
-- The brief asks for DBA on the user itself, so it is granted directly here.
-- Password = first name: lab-only convention, never used on a real system.

SET ECHO ON
SET LINESIZE 200
COLUMN granted_role FORMAT a20

ALTER SESSION SET CONTAINER = b_25401_fumba_smartticket_db;

GRANT DBA TO fumba_admin;

-- Task 5: EM Express HTTPS port for this PDB = 55 + last two digits of 25401
-- Then open https://localhost:5501/em and log in as fumba_admin
EXEC DBMS_XDB_CONFIG.SETHTTPSPORT(5501);
SELECT DBMS_XDB_CONFIG.GETHTTPSPORT() AS em_https_port FROM dual;

-- Connect as the admin user to the PDB (screenshot evidence for Task 2)
CONNECT fumba_admin/fumba@//localhost:1521/b_25401_fumba_smartticket_db

SHOW USER
SHOW CON_NAME
SELECT granted_role FROM user_role_privs ORDER BY 1;
SELECT TO_CHAR(SYSDATE, 'YYYY-MM-DD HH24:MI:SS') AS now FROM dual;
