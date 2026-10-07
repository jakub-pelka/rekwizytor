-- Przepływ 3 redesignu: magazyn jak pliki i foldery (POMYSLY 13).
-- Pomieszczenie › pojemnik (szafa, półka, kufer, pudło; do 3 poziomów) › grupa (GRP-) › przedmiot (REK-, opcjonalnie).
-- Wyłącznie zmiany dodające. Dotychczasowe groups.short_id (kody w linkach QR) zostają bez zmian;
-- numery z design systemu trafiają do nowej kolumny code.

BEGIN;

-- Numery: GRP-0001, REK-0001, MSC-0001.
CREATE SEQUENCE IF NOT EXISTS public.group_code_seq;
CREATE SEQUENCE IF NOT EXISTS public.item_code_seq;
CREATE SEQUENCE IF NOT EXISTS public.location_code_seq;

-- Miejsca: pomieszczenie albo pojemnik.
ALTER TABLE public.locations
    ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'room',
    ADD COLUMN IF NOT EXISTS code text,
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

ALTER TABLE public.locations DROP CONSTRAINT IF EXISTS locations_kind_check;
ALTER TABLE public.locations
    ADD CONSTRAINT locations_kind_check CHECK (kind IN ('room', 'wardrobe', 'shelf', 'trunk', 'box', 'container'));

-- Istniejące miejsca w innym miejscu to pojemniki.
UPDATE public.locations SET kind = 'container' WHERE belongs_to IS NOT NULL AND kind = 'room';

UPDATE public.locations SET code = 'MSC-' || lpad(nextval('public.location_code_seq')::text, 4, '0')
WHERE code IS NULL AND belongs_to IS NOT NULL;

-- Grupy: numer, przybliżona liczba („ok. 30 szt.”) i kolejność w miejscu (ta sama w liście i w porządkowaniu).
ALTER TABLE public.groups
    ADD COLUMN IF NOT EXISTS code text,
    ADD COLUMN IF NOT EXISTS approx_count integer,
    ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;

UPDATE public.groups SET code = 'GRP-' || lpad(nextval('public.group_code_seq')::text, 4, '0') WHERE code IS NULL;

-- Przedmioty: rozpisane z grupy („Rozpisz na przedmioty”) albo luzem w pojemniku (np. kask na półce).
CREATE TABLE IF NOT EXISTS public.group_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE,
    location_id uuid REFERENCES public.locations(id) ON DELETE SET NULL,
    name text NOT NULL,
    code text,
    description text,
    status text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'in_repair', 'loaned', 'missing')),
    status_note text,
    sort_order integer NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_group_items_group ON public.group_items(group_id);
CREATE INDEX IF NOT EXISTS idx_group_items_location ON public.group_items(location_id);

-- Numery nadawane automatycznie przy dodawaniu.
CREATE OR REPLACE FUNCTION public.assign_storage_code() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF NEW.code IS NULL THEN
        IF TG_TABLE_NAME = 'groups' THEN
            NEW.code := 'GRP-' || lpad(nextval('public.group_code_seq')::text, 4, '0');
        ELSIF TG_TABLE_NAME = 'group_items' THEN
            NEW.code := 'REK-' || lpad(nextval('public.item_code_seq')::text, 4, '0');
        ELSIF TG_TABLE_NAME = 'locations' AND NEW.belongs_to IS NOT NULL THEN
            NEW.code := 'MSC-' || lpad(nextval('public.location_code_seq')::text, 4, '0');
        END IF;
    END IF;
    RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS groups_assign_code ON public.groups;
CREATE TRIGGER groups_assign_code BEFORE INSERT ON public.groups FOR EACH ROW EXECUTE FUNCTION public.assign_storage_code();
DROP TRIGGER IF EXISTS group_items_assign_code ON public.group_items;
CREATE TRIGGER group_items_assign_code BEFORE INSERT ON public.group_items FOR EACH ROW EXECUTE FUNCTION public.assign_storage_code();
DROP TRIGGER IF EXISTS locations_assign_code ON public.locations;
CREATE TRIGGER locations_assign_code BEFORE INSERT OR UPDATE OF belongs_to ON public.locations FOR EACH ROW EXECUTE FUNCTION public.assign_storage_code();

-- Wpis w rozpisce może wskazać konkretny przedmiot, nie tylko grupę.
ALTER TABLE public.performance_props
    ADD COLUMN IF NOT EXISTS item_id uuid REFERENCES public.group_items(id) ON DELETE SET NULL;

-- RLS jak w reszcie magazynu.
ALTER TABLE public.group_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read access to group_items" ON public.group_items;
CREATE POLICY "Public read access to group_items"
    ON public.group_items FOR SELECT TO anon, authenticated USING (deleted_at IS NULL);
DROP POLICY IF EXISTS "Approved users can manage group_items" ON public.group_items;
CREATE POLICY "Approved users can manage group_items"
    ON public.group_items FOR ALL TO authenticated
    USING (public.is_approved()) WITH CHECK (public.is_approved());

COMMIT;
