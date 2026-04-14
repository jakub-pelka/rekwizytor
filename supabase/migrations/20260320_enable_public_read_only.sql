-- Enable public read-only access for portfolio showcase
-- Anonymous users can view data but cannot modify anything
-- deleted_at exists on: groups, performances, locations
-- deleted_at does NOT exist on: notes, performance_items, scene_checklists, scene_checklist_items, scenes, profiles

-- Drop existing policies first (in case of partial previous run)
DROP POLICY IF EXISTS "Public read access to groups" ON public.groups;
DROP POLICY IF EXISTS "Public read access to performances" ON public.performances;
DROP POLICY IF EXISTS "Public read access to notes" ON public.notes;
DROP POLICY IF EXISTS "Public read access to locations" ON public.locations;
DROP POLICY IF EXISTS "Public read access to performance_items" ON public.performance_items;
DROP POLICY IF EXISTS "Public read access to scene_checklists" ON public.scene_checklists;
DROP POLICY IF EXISTS "Public read access to scene_checklist_items" ON public.scene_checklist_items;
DROP POLICY IF EXISTS "Public read access to scenes" ON public.scenes;
DROP POLICY IF EXISTS "Public read access to profiles" ON public.profiles;

-- Groups (has deleted_at)
CREATE POLICY "Public read access to groups"
ON public.groups FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Performances (has deleted_at)
CREATE POLICY "Public read access to performances"
ON public.performances FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Locations (has deleted_at)
CREATE POLICY "Public read access to locations"
ON public.locations FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Notes (NO deleted_at)
CREATE POLICY "Public read access to notes"
ON public.notes FOR SELECT
TO anon, authenticated
USING (true);

-- Performance items (NO deleted_at)
CREATE POLICY "Public read access to performance_items"
ON public.performance_items FOR SELECT
TO anon, authenticated
USING (true);

-- Scene checklists (NO deleted_at)
CREATE POLICY "Public read access to scene_checklists"
ON public.scene_checklists FOR SELECT
TO anon, authenticated
USING (true);

-- Scene checklist items (NO deleted_at)
CREATE POLICY "Public read access to scene_checklist_items"
ON public.scene_checklist_items FOR SELECT
TO anon, authenticated
USING (true);

-- Scenes (NO deleted_at)
CREATE POLICY "Public read access to scenes"
ON public.scenes FOR SELECT
TO anon, authenticated
USING (true);

-- Profiles (NO deleted_at)
CREATE POLICY "Public read access to profiles"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);
