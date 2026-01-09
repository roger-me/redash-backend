-- Admin Schema Updates for Redash
-- Run this in Supabase SQL Editor

-- Add role column to app_users
ALTER TABLE app_users
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'basic' CHECK (role IN ('admin', 'basic'));

-- Set existing user (roger) as admin
UPDATE app_users SET role = 'admin' WHERE username = 'roger';

-- Create user_model_assignments table
CREATE TABLE IF NOT EXISTS user_model_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, model_id)
);

-- Enable RLS
ALTER TABLE user_model_assignments ENABLE ROW LEVEL SECURITY;

-- Create policies for user_model_assignments
CREATE POLICY "Allow all on user_model_assignments" ON user_model_assignments
  FOR ALL USING (true) WITH CHECK (true);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_user_model_assignments_user_id ON user_model_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_user_model_assignments_model_id ON user_model_assignments(model_id);

-- Add user_id to models table if not exists (for ownership)
ALTER TABLE models
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;

-- Add user_id to profiles table if not exists
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES app_users(id) ON DELETE SET NULL;
