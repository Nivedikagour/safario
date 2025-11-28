-- Add phone number to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_number text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;

-- Create app_role enum
CREATE TYPE public.app_role AS ENUM ('user', 'authority', 'admin');

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles
CREATE POLICY "Users can view their own roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all roles"
  ON public.user_roles
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Add responder fields to emergency_alerts
ALTER TABLE public.emergency_alerts ADD COLUMN IF NOT EXISTS responder_id uuid REFERENCES auth.users(id);
ALTER TABLE public.emergency_alerts ADD COLUMN IF NOT EXISTS response_notes text;
ALTER TABLE public.emergency_alerts ADD COLUMN IF NOT EXISTS responded_at timestamp with time zone;

-- Update RLS for emergency_alerts to allow authorities to view and respond
CREATE POLICY "Authorities can view all alerts"
  ON public.emergency_alerts
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'authority') OR 
    public.has_role(auth.uid(), 'admin') OR 
    auth.uid() = user_id
  );

CREATE POLICY "Authorities can update alerts"
  ON public.emergency_alerts
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'authority') OR 
    public.has_role(auth.uid(), 'admin')
  );

-- Trigger to auto-assign 'user' role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_role();