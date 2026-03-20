-- Enable public read-only access for portfolio showcase
-- Anonymous users can view data but cannot modify anything

-- Groups table - public read access
CREATE POLICY "Public read access to groups"
ON public.groups FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Performances table - public read access
CREATE POLICY "Public read access to performances"
ON public.performances FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Notes table - public read access
CREATE POLICY "Public read access to notes"
ON public.notes FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Locations table - public read access (needed for groups)
CREATE POLICY "Public read access to locations"
ON public.locations FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Items table - public read access
CREATE POLICY "Public read access to items"
ON public.items FOR SELECT
TO anon, authenticated
USING (deleted_at IS NULL);

-- Performance items table - public read access
CREATE POLICY "Public read access to performance_items"
ON public.performance_items FOR SELECT
TO anon, authenticated
USING (true);

-- Scene checklists - public read access
CREATE POLICY "Public read access to scene_checklists"
ON public.scene_checklists FOR SELECT
TO anon, authenticated
USING (true);

-- Scene checklist items - public read access
CREATE POLICY "Public read access to scene_checklist_items"
ON public.scene_checklist_items FOR SELECT
TO anon, authenticated
USING (true);

-- Scenes table - public read access
CREATE POLICY "Public read access to scenes"
ON public.scenes FOR SELECT
TO anon, authenticated
USING (true);

-- Profiles table - public read access (only for display names, not sensitive data)
CREATE POLICY "Public read access to profiles"
ON public.profiles FOR SELECT
TO anon, authenticated
USING (true);

-- Note: Write, update, delete policies remain unchanged (require authenticated + approved status)
