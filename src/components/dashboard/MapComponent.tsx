import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

interface MapComponentProps {
  location: { lat: number; lng: number } | null;
}

const MapComponent = ({ location }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);

  useEffect(() => {
    if (!mapContainer.current || !location) return;

    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
    
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not found');
      return;
    }

    mapboxgl.accessToken = MAPBOX_TOKEN;
    
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

    // Add geofencing zones (example danger zones)
    map.current.on('load', () => {
      if (!map.current) return;

      // Example: Add a circular danger zone
      map.current.addSource('danger-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            name: 'High Crime Area',
          },
          geometry: {
            type: 'Point',
            coordinates: [location.lng + 0.01, location.lat + 0.01],
          },
        },
      });

      map.current.addLayer({
        id: 'danger-zone-circle',
        type: 'circle',
        source: 'danger-zone',
        paint: {
          'circle-radius': 50,
          'circle-color': '#ef4444',
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ef4444',
        },
      });

      // Add safe zone
      map.current.addSource('safe-zone', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: {
            name: 'Tourist Safe Zone',
          },
          geometry: {
            type: 'Point',
            coordinates: [location.lng - 0.01, location.lat - 0.01],
          },
        },
      });

      map.current.addLayer({
        id: 'safe-zone-circle',
        type: 'circle',
        source: 'safe-zone',
        paint: {
          'circle-radius': 50,
          'circle-color': '#10b981',
          'circle-opacity': 0.3,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#10b981',
        },
      });
    });

    return () => {
      map.current?.remove();
    };
  }, [location]);

  // Update marker position when location changes
  useEffect(() => {
    if (location && marker.current) {
      marker.current.setLngLat([location.lng, location.lat]);
      map.current?.flyTo({ center: [location.lng, location.lat], zoom: 13 });
    }
  }, [location]);

  if (!location) {
    return (
      <div className="bg-accent/10 rounded-lg h-96 flex items-center justify-center">
        <p className="text-muted-foreground">Waiting for location...</p>
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
