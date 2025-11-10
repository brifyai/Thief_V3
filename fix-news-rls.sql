-- Deshabilitar RLS temporalmente para la tabla news para permitir inserciones
ALTER TABLE news DISABLE ROW LEVEL SECURITY;

-- O si prefieres mantener RLS pero permitir inserciones:
-- DROP POLICY IF EXISTS "Enable insert for authenticated users" ON news;
-- CREATE POLICY "Enable insert for authenticated users"
-- ON news FOR INSERT
-- WITH CHECK (true);

-- DROP POLICY IF EXISTS "Enable select for authenticated users" ON news;
-- CREATE POLICY "Enable select for authenticated users"
-- ON news FOR SELECT
-- USING (true);

-- DROP POLICY IF EXISTS "Enable update for authenticated users" ON news;
-- CREATE POLICY "Enable update for authenticated users"
-- ON news FOR UPDATE
-- USING (true)
-- WITH CHECK (true);

-- DROP POLICY IF EXISTS "Enable delete for authenticated users" ON news;
-- CREATE POLICY "Enable delete for authenticated users"
-- ON news FOR DELETE
-- USING (true);
