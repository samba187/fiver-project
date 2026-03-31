-- Enforce Row Level Security on all operational tables
ALTER TABLE reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE loisirs_children ENABLE ROW LEVEL SECURITY;

-- 1. Reservations Policies
-- Public can check for existing reservations (needed for calendar availability)
CREATE POLICY "Public can view reservations"
ON reservations FOR SELECT TO public
USING (true);

-- Public can insert new reservations
CREATE POLICY "Public can insert reservations"
ON reservations FOR INSERT TO public
WITH CHECK (true);

-- Authenticated (Staff) can update and delete reservations
CREATE POLICY "Staff can update reservations"
ON reservations FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Staff can delete reservations"
ON reservations FOR DELETE TO authenticated
USING (true);


-- 2. Clients Policies
-- Public can view clients (needed for booking flow `is_banned` check based on phone)
CREATE POLICY "Public can select clients"
ON clients FOR SELECT TO public
USING (true);

-- Public can insert new clients
CREATE POLICY "Public can insert clients"
ON clients FOR INSERT TO public
WITH CHECK (true);

-- Public can update existing clients (to increment total_bookings)
CREATE POLICY "Public can update clients"
ON clients FOR UPDATE TO public
USING (true);

-- Staff can delete clients
CREATE POLICY "Staff can delete clients"
ON clients FOR DELETE TO authenticated
USING (true);


-- 3. Academy Policies
-- Public can insert academy registrations
CREATE POLICY "Public can insert academy_players"
ON academy_players FOR INSERT TO public
WITH CHECK (true);

-- Staff can do everything else
CREATE POLICY "Staff can select academy_players"
ON academy_players FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can update academy_players"
ON academy_players FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Staff can delete academy_players"
ON academy_players FOR DELETE TO authenticated
USING (true);


-- 4. Loisirs Policies
-- Public can insert loisirs registrations
CREATE POLICY "Public can insert loisirs_children"
ON loisirs_children FOR INSERT TO public
WITH CHECK (true);

-- Staff can do everything else
CREATE POLICY "Staff can select loisirs_children"
ON loisirs_children FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Staff can update loisirs_children"
ON loisirs_children FOR UPDATE TO authenticated
USING (true);

CREATE POLICY "Staff can delete loisirs_children"
ON loisirs_children FOR DELETE TO authenticated
USING (true);
