import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface MapComponentProps {
  location: { lat: number; lng: number } | null;
}

const MapComponent = ({ location }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch Mapbox token from edge function
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (error) throw error;
        if (data?.token) {
          setMapboxToken(data.token);
        } else {
          setError('Mapbox token not configured');
        }
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
        setError('Failed to load map configuration');
      }
    };
    fetchToken();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || !location || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [location.lng, location.lat],
      zoom: 13,
    });

    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Add user location marker
    marker.current = new mapboxgl.Marker({ color: '#3b82f6' })
      .setLngLat([location.lng, location.lat])
      .addTo(map.current);

    // Define danger zones with actual coordinates
    const dangerZones = [
      { lng: location.lng + 0.01, lat: location.lat + 0.01, name: 'High Crime Area', radius: 500 },
      { lng: location.lng - 0.015, lat: location.lat + 0.005, name: 'Unsafe Zone', radius: 400 },
    ];

    const safeZones = [
      { lng: location.lng - 0.01, lat: location.lat - 0.01, name: 'Tourist Safe Zone', radius: 600 },
    ];

    // Function to check if user is in danger zone
    const checkGeofencing = (userLng: number, userLat: number) => {
      dangerZones.forEach(zone => {
        const distance = Math.sqrt(
          Math.pow((userLng - zone.lng) * 111000, 2) + 
          Math.pow((userLat - zone.lat) * 111000, 2)
        );
        
        if (distance <= zone.radius) {
          // User entered danger zone - show alert
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ Danger Zone Alert', {
              body: `You are entering ${zone.name}. Please be cautious!`,
              icon: '/favicon.ico',
            });
          }
        }
      });
    };

    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    // Add geofencing zones
    map.current.on('load', () => {
      if (!map.current) return;

      // Add danger zones
      dangerZones.forEach((zone, index) => {
        map.current!.addSource(`danger-zone-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: zone.name },
            geometry: {
              type: 'Point',
              coordinates: [zone.lng, zone.lat],
            },
          },
        });

        map.current!.addLayer({
          id: `danger-zone-circle-${index}`,
          type: 'circle',
          source: `danger-zone-${index}`,
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, zone.radius / 10],
              ],
              base: 2,
            },
            'circle-color': '#ef4444',
            'circle-opacity': 0.3,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#ef4444',
          },
        });
      });

      // Add safe zones
      safeZones.forEach((zone, index) => {
        map.current!.addSource(`safe-zone-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: zone.name },
            geometry: {
              type: 'Point',
              coordinates: [zone.lng, zone.lat],
            },
          },
        });

        map.current!.addLayer({
          id: `safe-zone-circle-${index}`,
          type: 'circle',
          source: `safe-zone-${index}`,
          paint: {
            'circle-radius': {
              stops: [
                [0, 0],
                [20, zone.radius / 10],
              ],
              base: 2,
            },
            'circle-color': '#10b981',
            'circle-opacity': 0.3,
            'circle-stroke-width': 2,
            'circle-stroke-color': '#10b981',
          },
        });
      });

      // Initial geofencing check
      checkGeofencing(location.lng, location.lat);
    });

    return () => {
      map.current?.remove();
    };
  }, [location, mapboxToken]);

  // Update marker position when location changes
  useEffect(() => {
    if (location && marker.current) {
      marker.current.setLngLat([location.lng, location.lat]);
      map.current?.flyTo({ center: [location.lng, location.lat], zoom: 13 });
    }
  }, [location]);

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
        <div className="flex gap-4 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Safe Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Danger Zone</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span>Your Location</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
