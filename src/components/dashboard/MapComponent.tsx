import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MapComponentProps {
  location: { lat: number; lng: number } | null;
  destination?: string | null;
}

interface GeofenceZone {
  id: string;
  name: string;
  zone_type: string;
  geometry_type: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_meters: number | null;
  polygon_coords: number[][] | null;
  severity: string;
  description: string | null;
}

const MapComponent = ({ location, destination }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geofenceZones, setGeofenceZones] = useState<GeofenceZone[]>([]);
  const lastServerCheckRef = useRef<number>(0);
  const alertSentRef = useRef<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUserId(session.user.id);
    };
    getUser();
  }, []);

  // Fetch Mapbox token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (error) throw error;
        if (data?.token) setMapboxToken(data.token);
        else setError('Mapbox token not configured');
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setError('Failed to load map configuration');
      }
    };
    fetchToken();
  }, []);

  // Fetch geofence zones from database
  useEffect(() => {
    const fetchZones = async () => {
      try {
        const { data, error } = await supabase
          .from('geofence_zones')
          .select('*')
          .eq('is_active', true);
        if (error) throw error;
        setGeofenceZones((data || []) as GeofenceZone[]);
      } catch (err) {
        console.error('Failed to fetch geofence zones:', err);
      }
    };
    fetchZones();
  }, []);

  // Geocode destination
  useEffect(() => {
    const geocodeDestination = async () => {
      if (!destination || !mapboxToken) return;
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${mapboxToken}&limit=1`
        );
        const data = await response.json();
        if (data.features?.length > 0) {
          const [lng, lat] = data.features[0].center;
          setDestinationCoords({ lat, lng });
        }
      } catch (err) {
        console.error('Failed to geocode destination:', err);
      }
    };
    geocodeDestination();
  }, [destination, mapboxToken]);

  // Server-side geofence check
  const serverGeofenceCheck = useCallback(async (lat: number, lng: number) => {
    const now = Date.now();
    // Throttle server checks to once every 30 seconds
    if (now - lastServerCheckRef.current < 30000) return;
    lastServerCheckRef.current = now;

    try {
      const { data, error } = await supabase.functions.invoke('geofence-check', {
        body: { user_lat: lat, user_lng: lng }
      });
      if (error) throw error;

      if (data?.triggered_zones?.length > 0) {
        const zone = data.triggered_zones[0];
        toast.error(`🚨 SERVER ALERT: You are in ${zone.name} (${zone.severity}). Authorities notified!`, {
          duration: 10000,
        });
      }
    } catch (err) {
      console.error('Server geofence check failed:', err);
    }
  }, []);

  // Client-side geofence check (fast, immediate feedback)
  const clientGeofenceCheck = useCallback((userLng: number, userLat: number) => {
    const calculateDistance = (lng1: number, lat1: number, lng2: number, lat2: number) => {
      const R = 6371000;
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    const pointInPolygon = (lat: number, lng: number, polygon: number[][]) => {
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i][1], yi = polygon[i][0];
        const xj = polygon[j][1], yj = polygon[j][0];
        const intersect = ((yi > lng) !== (yj > lng)) &&
          (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    };

    let inDanger = false;
    let inSafe = false;

    for (const zone of geofenceZones) {
      let isInside = false;

      if (zone.geometry_type === 'circle' && zone.center_lat && zone.center_lng && zone.radius_meters) {
        const dist = calculateDistance(userLng, userLat, Number(zone.center_lng), Number(zone.center_lat));
        isInside = dist <= Number(zone.radius_meters);
      } else if (zone.geometry_type === 'polygon' && zone.polygon_coords) {
        isInside = pointInPolygon(userLat, userLng, zone.polygon_coords);
      }

      if (zone.zone_type === 'safe' && isInside) inSafe = true;
      if (isInside && zone.zone_type !== 'safe') {
        inDanger = true;
        if (!alertSentRef.current) {
          alertSentRef.current = true;
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(`🚨 ${zone.zone_type === 'restricted' ? 'Restricted' : 'Danger'} Zone!`, {
              body: `You entered ${zone.name}. ${zone.description || 'Stay alert!'}`,
              icon: '/favicon.ico',
            });
          }
          toast.error(`⚠️ You entered ${zone.name} (${zone.severity})`, { duration: 8000 });
          // Trigger server-side validation
          serverGeofenceCheck(userLat, userLng);
        }
      }
    }

    if (!inDanger && !inSafe && geofenceZones.some(z => z.zone_type === 'safe')) {
      if (!alertSentRef.current) {
        alertSentRef.current = true;
        toast.warning('⚠️ You left the safe zone perimeter', { duration: 5000 });
        serverGeofenceCheck(userLat, userLng);
      }
    }

    if (!inDanger && inSafe) {
      alertSentRef.current = false; // Reset when back in safe zone
    }
  }, [geofenceZones, serverGeofenceCheck]);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !location || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [location.lng, location.lat],
      zoom: 13,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([location.lng, location.lat])
      .addTo(map.current);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const createCircle = (centerLng: number, centerLat: number, radiusKm: number, points = 64) => {
      const coords = [];
      for (let i = 0; i < points; i++) {
        const angle = (i / points) * 2 * Math.PI;
        const dx = radiusKm * Math.cos(angle);
        const dy = radiusKm * Math.sin(angle);
        const lat = centerLat + (dy / 111.32);
        const lng = centerLng + (dx / (111.32 * Math.cos(centerLat * Math.PI / 180)));
        coords.push([lng, lat]);
      }
      coords.push(coords[0]);
      return coords;
    };

    map.current.on('load', () => {
      if (!map.current) return;

      // Render all geofence zones from database
      geofenceZones.forEach((zone, index) => {
        let coordinates: number[][] = [];

        if (zone.geometry_type === 'circle' && zone.center_lat && zone.center_lng && zone.radius_meters) {
          coordinates = createCircle(Number(zone.center_lng), Number(zone.center_lat), Number(zone.radius_meters) / 1000);
        } else if (zone.geometry_type === 'polygon' && zone.polygon_coords) {
          coordinates = zone.polygon_coords;
          if (coordinates.length > 0 && (coordinates[0][0] !== coordinates[coordinates.length - 1][0] || coordinates[0][1] !== coordinates[coordinates.length - 1][1])) {
            coordinates.push(coordinates[0]);
          }
        }

        if (coordinates.length === 0) return;

        const colors: Record<string, { fill: string; line: string }> = {
          safe: { fill: '#10b981', line: '#10b981' },
          danger: { fill: '#ef4444', line: '#ef4444' },
          restricted: { fill: '#f59e0b', line: '#f59e0b' },
        };
        const color = colors[zone.zone_type] || colors.danger;

        const sourceId = `geofence-zone-${index}`;

        map.current!.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: zone.name },
            geometry: { type: 'Polygon', coordinates: [coordinates] },
          },
        });

        map.current!.addLayer({
          id: `${sourceId}-fill`,
          type: 'fill',
          source: sourceId,
          paint: {
            'fill-color': color.fill,
            'fill-opacity': zone.zone_type === 'safe' ? 0.08 : 0.25,
          },
        });

        map.current!.addLayer({
          id: `${sourceId}-line`,
          type: 'line',
          source: sourceId,
          paint: {
            'line-color': color.line,
            'line-width': zone.zone_type === 'safe' ? 3 : 2,
            'line-dasharray': zone.zone_type === 'safe' ? [2, 2] : [1],
          },
        });

        map.current!.addLayer({
          id: `${sourceId}-label`,
          type: 'symbol',
          source: sourceId,
          layout: {
            'text-field': `${zone.zone_type === 'restricted' ? '🚫 ' : zone.zone_type === 'danger' ? '⚠️ ' : '✅ '}${zone.name}`,
            'text-size': 12,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': color.line,
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        });

        // Popup on click
        map.current!.on('click', `${sourceId}-fill`, () => {
          const popup = new mapboxgl.Popup({ closeOnClick: true })
            .setLngLat([Number(zone.center_lng || 0), Number(zone.center_lat || 0)])
            .setHTML(`
              <div style="padding:8px">
                <strong>${zone.name}</strong><br/>
                <span style="color:${color.line};text-transform:capitalize">${zone.zone_type} • ${zone.severity}</span><br/>
                <small>${zone.description || ''}</small>
              </div>
            `)
            .addTo(map.current!);
        });
      });

      // Run initial client-side geofence check
      clientGeofenceCheck(location.lng, location.lat);
      // Also run a server-side check on load
      serverGeofenceCheck(location.lat, location.lng);

      // Add route if destination
      if (destinationCoords && location) {
        destinationMarker.current = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([destinationCoords.lng, destinationCoords.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>${destination}</strong>`))
          .addTo(map.current!);

        fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${location.lng},${location.lat};${destinationCoords.lng},${destinationCoords.lat}?geometries=geojson&access_token=${mapboxToken}`
        )
          .then(res => res.json())
          .then(data => {
            if (data.routes?.length > 0) {
              const route = data.routes[0].geometry;
              map.current!.addSource('route', {
                type: 'geojson',
                data: { type: 'Feature', properties: {}, geometry: route }
              });
              map.current!.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: { 'line-join': 'round', 'line-cap': 'round' },
                paint: { 'line-color': '#3b82f6', 'line-width': 5, 'line-opacity': 0.8 }
              });
              const coordinates = route.coordinates;
              const bounds = coordinates.reduce((bounds: mapboxgl.LngLatBounds, coord: [number, number]) => {
                return bounds.extend(coord);
              }, new mapboxgl.LngLatBounds(coordinates[0], coordinates[0]));
              map.current!.fitBounds(bounds, { padding: 50 });
            }
          })
          .catch(err => console.error('Failed to fetch route:', err));
      }
    });

    return () => {
      destinationMarker.current?.remove();
      map.current?.remove();
    };
  }, [location, mapboxToken, destinationCoords, destination, geofenceZones, clientGeofenceCheck, serverGeofenceCheck]);

  // Update marker on location change
  useEffect(() => {
    if (location && marker.current) {
      marker.current.setLngLat([location.lng, location.lat]);
      map.current?.flyTo({ center: [location.lng, location.lat], zoom: 13 });
      // Re-check geofences on position update
      clientGeofenceCheck(location.lng, location.lat);
    }
  }, [location, clientGeofenceCheck]);

  if (error) {
    return (
      <div className="bg-destructive/10 rounded-lg h-96 flex items-center justify-center">
        <p className="text-destructive">{error}</p>
      </div>
    );
  }

  if (!mapboxToken || !location) {
    return (
      <div className="bg-accent/10 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">{!mapboxToken ? 'Loading map...' : 'Waiting for location...'}</p>
      </div>
    );
  }

  return (
    <div className="relative w-full h-96 rounded-lg overflow-hidden">
      <div ref={mapContainer} className="absolute inset-0" />
      <div className="absolute bottom-4 left-4 bg-card/90 backdrop-blur-sm p-3 rounded-lg shadow-lg">
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-dashed border-green-500 bg-green-500/20" />
            <span>Safe Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Danger Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500" />
            <span>Restricted Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Your Location</span>
          </div>
        </div>
        <p className="text-muted-foreground text-[10px] mt-2">
          🚨 Geofencing: Client + Server validated • Auto-alerts authorities
        </p>
      </div>
    </div>
  );
};

export default MapComponent;
