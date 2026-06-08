CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Creating the applicants table for the call

CREATE TABLE applicants(
  -- Unique ID
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Applicant Information:
  first_name VARCHAR(150) NOT NULL,
  last_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  career VARCHAR(150) NOT NULL,
  first_choice_area VARCHAR(150) NOT NULL,
  university VARCHAR(150) NOT NULL,
  university_semester VARCHAR(20) NOT NULL,
  application_reason TEXT NOT NULL,
  second_choice_area VARCHAR(150),

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==============================================
-- Row Level Security (RLS)
-- Only the service_role can insert and read data.
-- The anon key does NOT have access to this table.
-- ==============================================

ALTER TABLE applicants ENABLE ROW LEVEL SECURITY;

-- Policy: Only the server (service_role) can insert applications
CREATE POLICY "Server can insert applications"
  ON applicants
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Policy: Only the server (service_role) can read applications
CREATE POLICY "Server can read applications"
  ON applicants
  FOR SELECT
  TO service_role
  USING (true);

-- Policy: Block updates (nobody can edit applications)
CREATE POLICY "Block updates"
  ON applicants
  FOR UPDATE
  USING (false);

-- Policy: Block deletions (nobody can delete applications)
CREATE POLICY "Block deletions"
  ON applicants
  FOR DELETE
  USING (false);