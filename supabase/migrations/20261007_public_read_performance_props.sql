-- Tryb publiczny tylko do odczytu (20260320_enable_public_read_only.sql) pominął performance_props,
-- więc bez logowania rozpiski i listy zadań były puste. Odczyt jak dla pozostałych tabel spektaklu:
-- rekwizyty spektakli, które nie są usunięte.

DROP POLICY IF EXISTS "Public read access to performance_props" ON public.performance_props;
CREATE POLICY "Public read access to performance_props"
    ON public.performance_props FOR SELECT
    TO anon, authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.performances
            WHERE performances.id = performance_props.performance_id
            AND performances.deleted_at IS NULL
        )
    );
