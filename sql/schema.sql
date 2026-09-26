-- ==============================================================================
-- TripSync — Complete Supabase PostgreSQL Schema
-- Run this script in the Supabase SQL Editor (Dashboard -> SQL Editor -> New Query)
-- ==============================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE trip_governance_mode AS ENUM ('manager_based', 'democratic');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE trip_status AS ENUM ('planning', 'ongoing', 'completed', 'archived');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE member_role AS ENUM ('owner', 'manager', 'participant');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE member_status AS ENUM ('active', 'left', 'removed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_category AS ENUM ('hotel', 'flight', 'train', 'bus', 'cab', 'activity', 'meal', 'other');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('confirmed', 'modified', 'cancelled', 'refunded');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE expense_verification_status AS ENUM ('draft', 'pending_verification', 'verified', 'disputed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE proof_type_enum AS ENUM ('upi_screenshot', 'bill_receipt', 'no_proof');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE message_type_enum AS ENUM ('text', 'expense_alert', 'poll', 'system_audit');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method_enum AS ENUM ('upi_intent', 'upi_qr', 'cash');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE settlement_status_enum AS ENUM ('pending', 'verifying', 'completed', 'disputed');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  phone TEXT,
  upi_id TEXT, -- e.g., 'rahul@oksbi'
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger to automatically create a profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, phone, upi_id, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Traveler'),
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'upi_id',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Trips Table
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  description TEXT,
  cover_image TEXT,
  governance_mode trip_governance_mode DEFAULT 'manager_based',
  invite_code TEXT UNIQUE NOT NULL,
  status trip_status DEFAULT 'planning',
  created_by UUID REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Trip Members Table (Trip-scoped RBAC)
CREATE TABLE IF NOT EXISTS public.trip_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  role member_role DEFAULT 'participant',
  display_name TEXT NOT NULL,
  upi_id TEXT,
  status member_status DEFAULT 'active',
  left_at TIMESTAMPTZ,
  reason_for_leaving TEXT,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(trip_id, user_id)
);

-- 5. Bookings Table (Linked to itinerary & finances)
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category booking_category NOT NULL,
  vendor_name TEXT NOT NULL,
  booking_reference TEXT,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ,
  location TEXT,
  original_cost NUMERIC(12, 2) NOT NULL,
  current_cost NUMERIC(12, 2) NOT NULL,
  refund_amount NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'INR',
  status booking_status DEFAULT 'confirmed',
  paid_by_member_id UUID REFERENCES public.trip_members(id),
  participant_member_ids UUID[] NOT NULL,
  split_method TEXT DEFAULT 'equal',
  cancellation_policy TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Expenses Table (Dynamic allocations in JSONB)
CREATE TABLE IF NOT EXISTS public.expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL,
  paid_by_member_id UUID REFERENCES public.trip_members(id),
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  split_method TEXT NOT NULL,
  allocations JSONB NOT NULL, -- [{ "memberId": "uuid", "shareAmount": 1250.00 }]
  verification_status expense_verification_status DEFAULT 'pending_verification',
  proof_type proof_type_enum NOT NULL,
  proof_url TEXT,
  extracted_details JSONB,
  mismatch_flag BOOLEAN DEFAULT FALSE,
  mismatch_reason TEXT,
  verified_by UUID REFERENCES public.trip_members(id),
  verified_at TIMESTAMPTZ,
  local_offline_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Ledger Audit Logs (Powers "What Changed?")
CREATE TABLE IF NOT EXISTS public.ledger_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  trigger_event TEXT NOT NULL,
  description TEXT NOT NULL,
  affected_booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  affected_member_id UUID REFERENCES public.trip_members(id) ON DELETE SET NULL,
  snapshot_before JSONB NOT NULL,
  snapshot_after JSONB NOT NULL,
  impact_summary TEXT NOT NULL,
  performed_by UUID REFERENCES public.trip_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Chat Messages & Polls
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES public.trip_members(id) ON DELETE SET NULL,
  message_type message_type_enum DEFAULT 'text',
  content TEXT NOT NULL,
  attachment_url TEXT,
  expense_id UUID REFERENCES public.expenses(id) ON DELETE CASCADE,
  poll_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Settlements Table
CREATE TABLE IF NOT EXISTS public.settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trip_id UUID REFERENCES public.trips(id) ON DELETE CASCADE,
  payer_member_id UUID REFERENCES public.trip_members(id),
  receiver_member_id UUID REFERENCES public.trip_members(id),
  amount NUMERIC(12, 2) NOT NULL,
  payment_method payment_method_enum DEFAULT 'upi_intent',
  status settlement_status_enum DEFAULT 'pending',
  utr_number TEXT,
  breakdown_summary JSONB NOT NULL,
  receiver_confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Enable Row Level Security (RLS) with permissive development policies
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ledger_audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;

-- Permissive policies for hackathon development
CREATE POLICY "Public read profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Allow authenticated read trips" ON public.trips FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert trips" ON public.trips FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update trips" ON public.trips FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read trip_members" ON public.trip_members FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert trip_members" ON public.trip_members FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated update trip_members" ON public.trip_members FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Allow authenticated read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated modify bookings" ON public.bookings FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read expenses" ON public.expenses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated modify expenses" ON public.expenses FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated read audit logs" ON public.ledger_audit_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert audit logs" ON public.ledger_audit_logs FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read chat" ON public.chat_messages FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated insert chat" ON public.chat_messages FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow authenticated read settlements" ON public.settlements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated modify settlements" ON public.settlements FOR ALL TO authenticated USING (true);

-- 11. Storage Bucket for Receipts & Payment Proofs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trip-evidence', 'trip-evidence', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Public access to trip-evidence" ON storage.objects 
FOR SELECT USING (bucket_id = 'trip-evidence');

CREATE POLICY "Authenticated users can upload evidence" ON storage.objects 
FOR INSERT TO authenticated WITH CHECK (bucket_id = 'trip-evidence');
