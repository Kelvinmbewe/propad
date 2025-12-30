SELECT typname FROM pg_type WHERE typname = 'TrustTier';
SELECT migration_name FROM _prisma_migrations ORDER BY started_at DESC LIMIT 5;
