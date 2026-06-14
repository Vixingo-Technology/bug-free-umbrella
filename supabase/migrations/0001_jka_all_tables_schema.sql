-- Add role column to members table with constraint
ALTER TABLE members ADD COLUMN role TEXT NOT NULL DEFAULT 'STUDENT' CHECK (role IN ('STUDENT', 'INSTRUCTOR', 'ADMIN'));

-- Drop old policies to avoid duplicates or conflicts
DROP POLICY IF EXISTS "Members can view own data" ON members;
DROP POLICY IF EXISTS "Dojo Heads can view their dojo members" ON members;
DROP POLICY IF EXISTS "Members see own gradings" ON gradings;
DROP POLICY IF EXISTS "Dojo Heads see dojo gradings" ON gradings;
DROP POLICY IF EXISTS "Members see own orders" ON shop_orders;

-- Enable Row Level Security (RLS) on remaining tables
ALTER TABLE belt_ranks ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_matches ENABLE ROW LEVEL SECURITY;

-- Helper functions to check roles securely in SQL policies
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members
        WHERE id = auth.uid() AND role = 'ADMIN'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.members
        WHERE id = auth.uid() AND role = 'INSTRUCTOR'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==========================================
-- POLICIES FOR: members
-- ==========================================

-- Select policies
CREATE POLICY "Select profile - Self" ON members
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Select profile - Instructors for dojo members" ON members
    FOR SELECT USING (
        public.is_instructor() AND 
        dojo_id IN (SELECT id FROM dojos WHERE head_instructor_id = auth.uid())
    );

CREATE POLICY "Select profile - Admins" ON members
    FOR SELECT USING (public.is_admin());

-- Update policies
CREATE POLICY "Update profile - Self" ON members
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Update profile - Admins" ON members
    FOR UPDATE USING (public.is_admin());

-- Insert/Delete policies (Admins only)
CREATE POLICY "Insert profile - Admins" ON members
    FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Delete profile - Admins" ON members
    FOR DELETE USING (public.is_admin());


-- ==========================================
-- POLICIES FOR: dojos
-- ==========================================

-- Dojos are readable by everyone (needed for dojo finder on landing page)
CREATE POLICY "Select dojos - Public" ON dojos
    FOR SELECT USING (true);

-- Update schedule/details by Instructors assigned to the Dojo
CREATE POLICY "Update dojo - Assigned Instructor" ON dojos
    FOR UPDATE USING (public.is_instructor() AND head_instructor_id = auth.uid());

CREATE POLICY "Manage dojo - Admins" ON dojos
    FOR ALL USING (public.is_admin());


-- ==========================================
-- POLICIES FOR: belt_ranks
-- ==========================================

-- Belt ranks are readable by everyone
CREATE POLICY "Select belt_ranks - Public" ON belt_ranks
    FOR SELECT USING (true);

-- Manage belt ranks (Admins only)
CREATE POLICY "Manage belt_ranks - Admins" ON belt_ranks
    FOR ALL USING (public.is_admin());


-- ==========================================
-- POLICIES FOR: gradings
-- ==========================================

-- View gradings: self, dojo head, or admin
CREATE POLICY "Select grading - Self" ON gradings
    FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Select grading - Instructor" ON gradings
    FOR SELECT USING (
        public.is_instructor() AND
        member_id IN (
            SELECT id FROM members WHERE dojo_id IN (
                SELECT id FROM dojos WHERE head_instructor_id = auth.uid()
            )
        )
    );

CREATE POLICY "Select grading - Admins" ON gradings
    FOR SELECT USING (public.is_admin());

-- Instructors can log gradings for their students
CREATE POLICY "Insert grading - Instructor" ON gradings
    FOR INSERT WITH CHECK (
        public.is_instructor() AND
        member_id IN (
            SELECT id FROM members WHERE dojo_id IN (
                SELECT id FROM dojos WHERE head_instructor_id = auth.uid()
            )
        )
    );

CREATE POLICY "Update grading - Instructor" ON gradings
    FOR UPDATE USING (
        public.is_instructor() AND
        member_id IN (
            SELECT id FROM members WHERE dojo_id IN (
                SELECT id FROM dojos WHERE head_instructor_id = auth.uid()
            )
        )
    );

-- Admins can do everything
CREATE POLICY "Manage grading - Admins" ON gradings
    FOR ALL USING (public.is_admin());


-- ==========================================
-- POLICIES FOR: tournament_matches
-- ==========================================

-- View matches: anyone logged in
CREATE POLICY "Select match - Authenticated" ON tournament_matches
    FOR SELECT USING (auth.role() = 'authenticated');

-- Instructors can submit and modify matches
CREATE POLICY "Manage match - Instructor" ON tournament_matches
    FOR ALL USING (public.is_instructor());

-- Admins can do everything
CREATE POLICY "Manage match - Admins" ON tournament_matches
    FOR ALL USING (public.is_admin());


-- ==========================================
-- POLICIES FOR: shop_orders
-- ==========================================

-- View orders: self or admin
CREATE POLICY "Select order - Self" ON shop_orders
    FOR SELECT USING (auth.uid() = member_id);

CREATE POLICY "Select order - Admins" ON shop_orders
    FOR SELECT USING (public.is_admin());

-- Create orders: self
CREATE POLICY "Insert order - Self" ON shop_orders
    FOR INSERT WITH CHECK (auth.uid() = member_id);

-- Manage orders: admin only
CREATE POLICY "Manage order - Admins" ON shop_orders
    FOR ALL USING (public.is_admin());


-- ==========================================
-- USER SYNC TRIGGER FROM AUTH TO PUBLIC
-- ==========================================

-- This function automatically creates a matching profile in public.members when a user registers in auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    fullName TEXT;
    initialRole TEXT;
BEGIN
    -- Extract full name from user metadata
    fullName := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        CONCAT(NEW.raw_user_meta_data->>'first_name', ' ', NEW.raw_user_meta_data->>'last_name'),
        'New Member'
    );
    
    -- Extract initial role, default to STUDENT
    initialRole := COALESCE(NEW.raw_user_meta_data->>'role', 'STUDENT');
    
    INSERT INTO public.members (id, full_name, email, phone, current_rank, role)
    VALUES (
        NEW.id,
        fullName,
        NEW.email,
        NEW.phone,
        COALESCE(NEW.raw_user_meta_data->>'current_rank', 'White Belt'),
        initialRole
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Setup the trigger
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
