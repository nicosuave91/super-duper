# Local DB setup

Run `001_init.sql` then `002_billing.sql` against your local Postgres.

Example:
- psql "$DATABASE_URL" -f 001_init.sql
- psql "$DATABASE_URL" -f 002_billing.sql
