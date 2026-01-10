# Database Restore Procedure

This document outlines the steps to restore the ProPad database from a backup locally or in production.

## Prerequisites

- PostgreSQL Client (`psql`, `pg_restore`)
- Access to the target database credentials
- The backup file (e.g., `backup-YYYY-MM-DD.sql` or `.dump`)

## Restore Steps

### 1. Copy Backup to Container (if running in Docker)

If you need to run the restore from within the API container (which has `postgresql-client` installed):

```bash
docker cp ./my-backup.sql propad-api-1:/tmp/backup.sql
docker exec -it propad-api-1 bash
```

### 2. Run Restore Command

**WARNING: This will overwrite existing data. Ensure you are targeting the correct database.**

For SQL plain-text dumps (generated with `pg_dump > file.sql`):

```bash
psql "$DATABASE_URL" < /tmp/backup.sql
```

For Custom format dumps (`-F c`):

```bash
pg_restore --clean --if-exists --no-acl --no-owner -d "$DATABASE_URL" /tmp/backup.dump
```

### 3. Verify Integrity

After restore, verify the application handles the data correctly:
1. Check `HealthController` via `GET /health/ready`.
2. check `AdminService` audit logs.

## Manual Backup Trigger

You can trigger a manual backup via the Admin API:

`POST /admin/backup` (Requires ADMIN role)

This will generate a backup in `/tmp` of the API container.
