import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Haversine distance in meters
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Ray casting point-in-polygon
function pointInPolygon(lat: number, lng: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][1], yi = polygon[i][0]; // [lng, lat] format
    const xj = polygon[j][1], yj = polygon[j][0];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_lat, user_lng } = await req.json();

    if (typeof user_lat !== 'number' || typeof user_lng !== 'number') {
      return new Response(JSON.stringify({ error: 'Invalid coordinates' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get auth user
    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    if (authHeader) {
      const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { data: { user } } = await anonClient.auth.getUser(authHeader.replace('Bearer ', ''));
      userId = user?.id ?? null;
    }

    // Fetch all active geofence zones
    const { data: zones, error: zonesError } = await supabase
      .from('geofence_zones')
      .select('*')
      .eq('is_active', true);

    if (zonesError) throw zonesError;

    const triggeredZones: any[] = [];
    let isInSafeZone = false;

    for (const zone of zones || []) {
      let isInside = false;

      if (zone.geometry_type === 'circle' && zone.center_lat && zone.center_lng && zone.radius_meters) {
        const dist = haversineDistance(user_lat, user_lng, Number(zone.center_lat), Number(zone.center_lng));
        isInside = dist <= Number(zone.radius_meters);
      } else if (zone.geometry_type === 'polygon' && zone.polygon_coords) {
        isInside = pointInPolygon(user_lat, user_lng, zone.polygon_coords as number[][]);
      }

      if (zone.zone_type === 'safe' && isInside) {
        isInSafeZone = true;
      }

      if (isInside && zone.zone_type !== 'safe') {
        triggeredZones.push({
          id: zone.id,
          name: zone.name,
          zone_type: zone.zone_type,
          severity: zone.severity,
          description: zone.description,
        });
      }
    }

    // Auto-create emergency alert if user is in a danger/restricted zone
    if (userId && triggeredZones.length > 0) {
      const highestSeverity = triggeredZones.find(z => z.severity === 'critical') || triggeredZones[0];

      // Check if there's already an active alert for this user in the last 10 minutes
      const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
      const { data: existing } = await supabase
        .from('emergency_alerts')
        .select('id')
        .eq('user_id', userId)
        .eq('alert_type', 'geofence_violation')
        .eq('status', 'active')
        .gte('created_at', tenMinAgo)
        .limit(1);

      if (!existing || existing.length === 0) {
        await supabase.from('emergency_alerts').insert({
          user_id: userId,
          alert_type: 'geofence_violation',
          location_lat: user_lat,
          location_lng: user_lng,
          status: 'active',
          response_notes: `Server-validated: User entered ${highestSeverity.name} (${highestSeverity.severity})`
        });
      }

      // Save location
      await supabase.from('user_locations').insert({
        user_id: userId,
        location_lat: user_lat,
        location_lng: user_lng,
        is_in_danger_zone: true
      });
    }

    return new Response(JSON.stringify({
      is_in_safe_zone: isInSafeZone,
      triggered_zones: triggeredZones,
      zones_checked: zones?.length ?? 0,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (err) {
    console.error('Geofence check error:', err);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
