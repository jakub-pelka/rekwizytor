# Manual Steps Required for Public Read-Only Mode

## 1. Apply RLS Migration in Supabase Dashboard

You need to apply the SQL migration manually in Supabase Dashboard:

1. Go to https://supabase.com/dashboard/project/rjxcpqxhkbfhedhhxbau/sql/new
2. Copy and paste the contents of `supabase/migrations/20260320_enable_public_read_only.sql`
3. Click "Run" to execute the migration

This will enable public read-only access for:
- Groups
- Performances
- Notes
- Locations
- Items
- Performance items
- Scene checklists
- Scenes
- Profiles (display names only)

**Without this migration, anonymous users cannot view any data.**

## 2. Alternative: Manual RLS Policy Creation

If you prefer, you can create RLS policies manually in the Supabase Dashboard:

1. Go to Authentication > Policies
2. For each table (groups, performances, notes, etc.):
   - Click "New Policy"
   - Select "For SELECT operations"
   - Target roles: `anon, authenticated`
   - Policy name: "Public read access to [table_name]"
   - Using expression: `deleted_at IS NULL` (or `true` for tables without deleted_at)

## 3. Verify Public Access

After applying the migration, test anonymous access by:
1. Opening an incognito/private browser window
2. Navigating to your app without logging in
3. Checking that groups, performances, and notes are visible

## Current Status

- ✅ Migration file created: `supabase/migrations/20260320_enable_public_read_only.sql`
- ⏳ Migration needs to be applied in Supabase Dashboard
- ⏳ Code changes for notes page and login buttons are pending
