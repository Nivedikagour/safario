-- Add role_status column to user_roles table
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS role_status text NOT NULL DEFAULT 'approved';

-- Add requested_role column to store what role user requested (if different from current)
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS requested_role text DEFAULT NULL;

-- Update existing records to have 'approved' status
UPDATE public.user_roles SET role_status = 'approved' WHERE role_status IS NULL;

-- Add check constraint for valid statuses
ALTER TABLE public.user_roles 
ADD CONSTRAINT valid_role_status CHECK (role_status IN ('pending', 'approved', 'rejected'));

-- Drop the old permissive insert policy that allows self-assignment
DROP POLICY IF EXISTS "Users can insert their own role" ON public.user_roles;

-- Drop the old permissive update policy that allows self-role-change
DROP POLICY IF EXISTS "Users can update their own role" ON public.user_roles;

-- Create new insert policy: Users can only insert their own role with 'user' role as approved, 
-- or admin/authority roles as 'pending'
CREATE POLICY "Users can request roles" 
ON public.user_roles 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND (
    (role = 'user' AND role_status = 'approved') 
    OR (role IN ('admin', 'authority') AND role_status = 'pending')
  )
);

-- Users can only view their own role
-- (already exists: "Users can view their own roles")

-- Admins can manage all roles (already exists via "Admins can manage all roles")

-- Create index for faster pending role queries
CREATE INDEX IF NOT EXISTS idx_user_roles_status ON public.user_roles(role_status);