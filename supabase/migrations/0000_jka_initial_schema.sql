-- Create standard tables
CREATE TABLE members (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    current_rank TEXT,
    dojo_id UUID,
    expiry_date DATE
);

CREATE TABLE dojos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    lat NUMERIC,
    lng NUMERIC,
    head_instructor_id UUID REFERENCES members(id),
    schedule JSONB
);

CREATE TABLE belt_ranks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name_en TEXT NOT NULL,
    name_bn TEXT NOT NULL,
    color_hex TEXT NOT NULL,
    required_kata TEXT
);

CREATE TABLE gradings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id),
    from_rank_id UUID REFERENCES belt_ranks(id),
    to_rank_id UUID REFERENCES belt_ranks(id),
    result TEXT,
    certificate_url TEXT
);

CREATE TABLE tournament_matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tournament_id UUID,
    participant_a_id UUID REFERENCES members(id),
    participant_b_id UUID REFERENCES members(id),
    winner_id UUID REFERENCES members(id)
);

CREATE TABLE shop_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    member_id UUID REFERENCES members(id),
    total_bdt NUMERIC NOT NULL,
    payment_status TEXT NOT NULL,
    items_json JSONB
);

-- Enable Row Level Security (RLS)
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE dojos ENABLE ROW LEVEL SECURITY;
ALTER TABLE gradings ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Members can view their own data
CREATE POLICY "Members can view own data" 
ON members FOR SELECT 
USING (auth.uid() = id);

-- Dojo Heads can view members of their specific dojo
CREATE POLICY "Dojo Heads can view their dojo members" 
ON members FOR SELECT 
USING (
    auth.uid() IN (
        SELECT head_instructor_id FROM dojos WHERE id = members.dojo_id
    )
);

-- Students can see their own gradings
CREATE POLICY "Members see own gradings"
ON gradings FOR SELECT
USING (auth.uid() = member_id);

-- Dojo Heads can see gradings of their students
CREATE POLICY "Dojo Heads see dojo gradings"
ON gradings FOR SELECT
USING (
    member_id IN (
        SELECT id FROM members WHERE dojo_id IN (
            SELECT id FROM dojos WHERE head_instructor_id = auth.uid()
        )
    )
);

-- Students can see their own shop orders
CREATE POLICY "Members see own orders"
ON shop_orders FOR SELECT
USING (auth.uid() = member_id);
