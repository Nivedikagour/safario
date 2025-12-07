import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';

interface MapComponentProps {
  location: { lat: number; lng: number } | null;
  destination?: string | null;
}

const MapComponent = ({ location, destination }: MapComponentProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const marker = useRef<mapboxgl.Marker | null>(null);
  const destinationMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<{ lat: number; lng: number } | null>(null);

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

  // Geocode destination
  useEffect(() => {
    const geocodeDestination = async () => {
      if (!destination || !mapboxToken) return;
      
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(destination)}.json?access_token=${mapboxToken}&limit=1`
        );
        const data = await response.json();
        
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setDestinationCoords({ lat, lng });
        }
      } catch (err) {
        console.error('Failed to geocode destination:', err);
      }
    };
    
    geocodeDestination();
  }, [destination, mapboxToken]);

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

    // Define safe perimeter around user's starting location (1km radius)
    const safePerimeter = {
      centerLng: location.lng,
      centerLat: location.lat,
      radius: 1000, // 1km safe zone
      name: 'Safe Tourism Area'
    };

    // Define specific danger zones
    const dangerZones = [
      { lng: location.lng + 0.012, lat: location.lat + 0.008, name: 'High Crime Area', radius: 300 },
      { lng: location.lng - 0.015, lat: location.lat + 0.01, name: 'Unsafe Zone', radius: 250 },
      { lng: location.lng + 0.008, lat: location.lat - 0.012, name: 'Restricted Area', radius: 200 },
    ];

    // Function to calculate distance in meters
    const calculateDistance = (lng1: number, lat1: number, lng2: number, lat2: number) => {
      const R = 6371000; // Earth's radius in meters
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      return R * c;
    };

    // Function to check geofencing
    const checkGeofencing = (userLng: number, userLat: number) => {
      // Check if user is outside safe perimeter
      const distanceFromCenter = calculateDistance(
        safePerimeter.centerLng, safePerimeter.centerLat,
        userLng, userLat
      );
      
      if (distanceFromCenter > safePerimeter.radius) {
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('⚠️ Outside Safe Zone!', {
            body: `You have left the ${safePerimeter.name}. Please return to the safe area!`,
            icon: '/favicon.ico',
          });
        }
      }

      // Check if user entered specific danger zones
      dangerZones.forEach(zone => {
        const distance = calculateDistance(zone.lng, zone.lat, userLng, userLat);
        
        if (distance <= zone.radius) {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🚨 Danger Zone Alert!', {
              body: `You are entering ${zone.name}. Please be extremely cautious!`,
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

      // Create circle GeoJSON for safe perimeter
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
        coords.push(coords[0]); // Close the polygon
        return coords;
      };

      // Add safe perimeter (green circle)
      map.current!.addSource('safe-perimeter', {
        type: 'geojson',
        data: {
          type: 'Feature',
          properties: { name: safePerimeter.name },
          geometry: {
            type: 'Polygon',
            coordinates: [createCircle(safePerimeter.centerLng, safePerimeter.centerLat, safePerimeter.radius / 1000)]
          },
        },
      });

      map.current!.addLayer({
        id: 'safe-perimeter-fill',
        type: 'fill',
        source: 'safe-perimeter',
        paint: {
          'fill-color': '#10b981',
          'fill-opacity': 0.1,
        },
      });

      map.current!.addLayer({
        id: 'safe-perimeter-line',
        type: 'line',
        source: 'safe-perimeter',
        paint: {
          'line-color': '#10b981',
          'line-width': 3,
          'line-dasharray': [2, 2],
        },
      });

      // Add danger zones
      dangerZones.forEach((zone, index) => {
        map.current!.addSource(`danger-zone-${index}`, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { name: zone.name },
            geometry: {
              type: 'Polygon',
              coordinates: [createCircle(zone.lng, zone.lat, zone.radius / 1000)]
            },
          },
        });

        map.current!.addLayer({
          id: `danger-zone-fill-${index}`,
          type: 'fill',
          source: `danger-zone-${index}`,
          paint: {
            'fill-color': '#ef4444',
            'fill-opacity': 0.3,
          },
        });

        map.current!.addLayer({
          id: `danger-zone-line-${index}`,
          type: 'line',
          source: `danger-zone-${index}`,
          paint: {
            'line-color': '#ef4444',
            'line-width': 2,
          },
        });

        // Add danger zone label
        map.current!.addLayer({
          id: `danger-zone-label-${index}`,
          type: 'symbol',
          source: `danger-zone-${index}`,
          layout: {
            'text-field': zone.name,
            'text-size': 12,
            'text-anchor': 'center',
          },
          paint: {
            'text-color': '#dc2626',
            'text-halo-color': '#ffffff',
            'text-halo-width': 2,
          },
        });
      });

      // Initial geofencing check
      checkGeofencing(location.lng, location.lat);

      // Add route if destination exists
      if (destinationCoords && location) {
        // Add destination marker
        destinationMarker.current = new mapboxgl.Marker({ color: '#ef4444' })
          .setLngLat([destinationCoords.lng, destinationCoords.lat])
          .setPopup(new mapboxgl.Popup().setHTML(`<strong>${destination}</strong>`))
          .addTo(map.current!);

        // Fetch route from Mapbox Directions API
        fetch(
          `https://api.mapbox.com/directions/v5/mapbox/driving/${location.lng},${location.lat};${destinationCoords.lng},${destinationCoords.lat}?geometries=geojson&access_token=${mapboxToken}`
        )
          .then(res => res.json())
          .then(data => {
            if (data.routes && data.routes.length > 0) {
              const route = data.routes[0].geometry;

              map.current!.addSource('route', {
                type: 'geojson',
                data: {
                  type: 'Feature',
                  properties: {},
                  geometry: route
                }
              });

              map.current!.addLayer({
                id: 'route',
                type: 'line',
                source: 'route',
                layout: {
                  'line-join': 'round',
                  'line-cap': 'round'
                },
                paint: {
                  'line-color': '#3b82f6',
                  'line-width': 5,
                  'line-opacity': 0.8
                }
              });

              // Fit bounds to show entire route
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
  }, [location, mapboxToken, destinationCoords, destination]);

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
        <div className="flex flex-col gap-2 text-xs">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full border-2 border-dashed border-green-500 bg-green-500/20" />
            <span>Safe Perimeter (1km)</span>
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
        <p className="text-muted-foreground text-[10px] mt-2">⚠️ Alerts if you exit safe area</p>
      </div>
    </div>
  );
};

export default MapComponent;
