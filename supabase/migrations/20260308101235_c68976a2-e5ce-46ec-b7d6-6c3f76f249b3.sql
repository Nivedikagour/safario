
-- Create geofence_zones table for storing polygon and circle geofence definitions
CREATE TABLE public.geofence_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  zone_type TEXT NOT NULL DEFAULT 'danger', -- 'danger', 'safe', 'restricted'
  geometry_type TEXT NOT NULL DEFAULT 'circle', -- 'circle' or 'polygon'
  center_lat NUMERIC,
  center_lng NUMERIC,
  radius_meters NUMERIC, -- for circle type
  polygon_coords JSONB, -- for polygon type: array of [lng, lat] pairs
  severity TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geofence_zones ENABLE ROW LEVEL SECURITY;

-- Everyone can read active zones (needed for map display)
CREATE POLICY "Anyone can view active geofence zones"
  ON public.geofence_zones
  FOR SELECT
  USING (is_active = true);

-- Only authorities/admins can create zones
CREATE POLICY "Authorities can create geofence zones"
  ON public.geofence_zones
  FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'authority') OR has_role(auth.uid(), 'admin')
  );

-- Only authorities/admins can update zones
CREATE POLICY "Authorities can update geofence zones"
  ON public.geofence_zones
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'authority') OR has_role(auth.uid(), 'admin')
  );

-- Only admins can delete zones
CREATE POLICY "Admins can delete geofence zones"
  ON public.geofence_zones
  FOR DELETE
  USING (has_role(auth.uid(), 'admin'));

-- Seed some default danger zones (common tourist areas)
INSERT INTO public.geofence_zones (name, zone_type, geometry_type, center_lat, center_lng, radius_meters, severity, description) VALUES
  ('Sample Danger Zone 1', 'danger', 'circle', 22.7196, 75.8577, 500, 'high', 'Known high-crime area - stay alert'),
  ('Sample Restricted Zone', 'restricted', 'circle', 22.7255, 75.8800, 300, 'critical', 'Military restricted zone - do not enter'),
  ('Sample Safe Zone', 'safe', 'circle', 22.7196, 75.8577, 2000, 'low', 'Tourist-friendly safe perimeter');
