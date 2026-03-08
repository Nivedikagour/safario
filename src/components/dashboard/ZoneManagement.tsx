import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2, Edit2, MapPin, Save, X, Search } from 'lucide-react';

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
  is_active: boolean;
  created_at: string;
}

const ZoneManagement = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const tempMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapboxToken, setMapboxToken] = useState<string | null>(null);
  const [zones, setZones] = useState<GeofenceZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [editingZone, setEditingZone] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number }>({ lat: 22.7196, lng: 75.8577 });

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<string>('danger');
  const [formSeverity, setFormSeverity] = useState<string>('medium');
  const [formRadius, setFormRadius] = useState('500');
  const [formDescription, setFormDescription] = useState('');
  const [formLat, setFormLat] = useState('');
  const [formLng, setFormLng] = useState('');

  // Fetch token
  useEffect(() => {
    const fetchToken = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('mapbox-token');
        if (error) throw error;
        if (data?.token) setMapboxToken(data.token);
      } catch (err) {
        console.error('Failed to fetch Mapbox token:', err);
      }
    };
    fetchToken();
  }, []);

  // Fetch zones
  const fetchZones = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('geofence_zones')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setZones((data || []) as GeofenceZone[]);
    } catch (err) {
      console.error('Failed to fetch zones:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchZones(); }, [fetchZones]);

  // Search location
  const handleSearchLocation = async () => {
    if (!searchQuery.trim()) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (results.length > 0) {
        const { lat, lon } = results[0];
        const newCenter = { lat: parseFloat(lat), lng: parseFloat(lon) };
        setMapCenter(newCenter);
        map.current?.flyTo({ center: [newCenter.lng, newCenter.lat], zoom: 13 });
        toast.success(`Map centered on ${results[0].display_name?.split(',')[0]}`);
      } else {
        toast.error('Location not found');
      }
    } catch {
      toast.error('Search failed');
    }
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || !mapboxToken) return;

    mapboxgl.accessToken = mapboxToken;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: [mapCenter.lng, mapCenter.lat],
      zoom: 12,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

    // Click to place zone
    map.current.on('click', (e) => {
      if (isAdding) {
        setFormLat(e.lngLat.lat.toFixed(6));
        setFormLng(e.lngLat.lng.toFixed(6));

        tempMarker.current?.remove();
        tempMarker.current = new mapboxgl.Marker({ color: '#f59e0b', draggable: true })
          .setLngLat([e.lngLat.lng, e.lngLat.lat])
          .addTo(map.current!);

        tempMarker.current.on('dragend', () => {
          const lngLat = tempMarker.current!.getLngLat();
          setFormLat(lngLat.lat.toFixed(6));
          setFormLng(lngLat.lng.toFixed(6));
        });
      }
    });

    // Render existing zones
    map.current.on('load', () => {
      renderZonesOnMap();
    });

    return () => {
      tempMarker.current?.remove();
      map.current?.remove();
    };
  }, [mapboxToken, mapCenter]);

  // Re-render zones when they change
  useEffect(() => {
    if (map.current?.isStyleLoaded()) {
      renderZonesOnMap();
    }
  }, [zones]);

  const renderZonesOnMap = () => {
    if (!map.current) return;

    // Remove existing zone layers/sources
    const style = map.current.getStyle();
    if (style?.layers) {
      style.layers.forEach(layer => {
        if (layer.id.startsWith('zone-')) {
          map.current!.removeLayer(layer.id);
        }
      });
    }
    if (style?.sources) {
      Object.keys(style.sources).forEach(sourceId => {
        if (sourceId.startsWith('zone-')) {
          map.current!.removeSource(sourceId);
        }
      });
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

    const colors: Record<string, string> = {
      safe: '#10b981',
      danger: '#ef4444',
      restricted: '#f59e0b',
    };

    zones.filter(z => z.is_active).forEach((zone, idx) => {
      let coordinates: number[][] = [];

      if (zone.geometry_type === 'circle' && zone.center_lat && zone.center_lng && zone.radius_meters) {
        coordinates = createCircle(Number(zone.center_lng), Number(zone.center_lat), Number(zone.radius_meters) / 1000);
      } else if (zone.geometry_type === 'polygon' && zone.polygon_coords) {
        coordinates = zone.polygon_coords;
        if (coordinates.length > 0 && (coordinates[0][0] !== coordinates[coordinates.length - 1][0])) {
          coordinates.push(coordinates[0]);
        }
      }

      if (coordinates.length === 0) return;

      const sourceId = `zone-${idx}`;
      const color = colors[zone.zone_type] || colors.danger;

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
        paint: { 'fill-color': color, 'fill-opacity': 0.2 },
      });

      map.current!.addLayer({
        id: `${sourceId}-line`,
        type: 'line',
        source: sourceId,
        paint: { 'line-color': color, 'line-width': 2 },
      });

      map.current!.addLayer({
        id: `${sourceId}-label`,
        type: 'symbol',
        source: sourceId,
        layout: { 'text-field': zone.name, 'text-size': 11, 'text-anchor': 'center' },
        paint: { 'text-color': color, 'text-halo-color': '#ffffff', 'text-halo-width': 2 },
      });
    });
  };

  const resetForm = () => {
    setFormName('');
    setFormType('danger');
    setFormSeverity('medium');
    setFormRadius('500');
    setFormDescription('');
    setFormLat('');
    setFormLng('');
    setIsAdding(false);
    setEditingZone(null);
    tempMarker.current?.remove();
  };

  const handleSaveZone = async () => {
    if (!formName.trim() || !formLat || !formLng) {
      toast.error('Please provide a name and click on the map to set location');
      return;
    }

    try {
      const zoneData = {
        name: formName,
        zone_type: formType,
        geometry_type: 'circle' as const,
        center_lat: parseFloat(formLat),
        center_lng: parseFloat(formLng),
        radius_meters: parseInt(formRadius) || 500,
        severity: formSeverity,
        description: formDescription || null,
        is_active: true,
      };

      if (editingZone) {
        const { error } = await supabase
          .from('geofence_zones')
          .update(zoneData)
          .eq('id', editingZone);
        if (error) throw error;
        toast.success('Zone updated successfully');
      } else {
        const { error } = await supabase
          .from('geofence_zones')
          .insert(zoneData);
        if (error) throw error;
        toast.success('Zone created successfully');
      }

      resetForm();
      fetchZones();
    } catch (err: any) {
      toast.error(err.message || 'Failed to save zone');
    }
  };

  const handleEditZone = (zone: GeofenceZone) => {
    setEditingZone(zone.id);
    setIsAdding(true);
    setFormName(zone.name);
    setFormType(zone.zone_type);
    setFormSeverity(zone.severity);
    setFormRadius(String(zone.radius_meters || 500));
    setFormDescription(zone.description || '');
    setFormLat(String(zone.center_lat || ''));
    setFormLng(String(zone.center_lng || ''));

    if (zone.center_lat && zone.center_lng) {
      map.current?.flyTo({ center: [Number(zone.center_lng), Number(zone.center_lat)], zoom: 14 });
      tempMarker.current?.remove();
      tempMarker.current = new mapboxgl.Marker({ color: '#f59e0b', draggable: true })
        .setLngLat([Number(zone.center_lng), Number(zone.center_lat)])
        .addTo(map.current!);

      tempMarker.current.on('dragend', () => {
        const lngLat = tempMarker.current!.getLngLat();
        setFormLat(lngLat.lat.toFixed(6));
        setFormLng(lngLat.lng.toFixed(6));
      });
    }
  };

  const handleDeleteZone = async (zoneId: string) => {
    try {
      // Soft delete by deactivating
      const { error } = await supabase
        .from('geofence_zones')
        .update({ is_active: false })
        .eq('id', zoneId);
      if (error) throw error;
      toast.success('Zone deactivated');
      fetchZones();
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete zone');
    }
  };

  const handleFlyToZone = (zone: GeofenceZone) => {
    if (zone.center_lat && zone.center_lng) {
      map.current?.flyTo({ center: [Number(zone.center_lng), Number(zone.center_lat)], zoom: 14 });
    }
  };

  const getZoneColor = (type: string) => {
    switch (type) {
      case 'safe': return 'bg-green-500/20 text-green-700 border-green-500/30';
      case 'danger': return 'bg-destructive/20 text-destructive border-destructive/30';
      case 'restricted': return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-500/20 text-green-700';
      case 'medium': return 'bg-yellow-500/20 text-yellow-700';
      case 'high': return 'bg-orange-500/20 text-orange-700';
      case 'critical': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-2xl font-bold">Geofence Zone Management</h2>
        <Button
          onClick={() => { setIsAdding(true); setEditingZone(null); }}
          disabled={isAdding}
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add New Zone
        </Button>
      </div>

      {/* Search */}
      <div className="flex gap-2">
        <Input
          placeholder="Search location to center map..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchLocation()}
          className="max-w-sm text-sm"
        />
        <Button onClick={handleSearchLocation} variant="outline" size="sm">
          <Search className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Map */}
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {mapboxToken ? (
              <div ref={mapContainer} className="w-full h-[400px] sm:h-[500px]" />
            ) : (
              <div className="w-full h-[400px] flex items-center justify-center bg-accent/10">
                <p className="text-muted-foreground">Loading map...</p>
              </div>
            )}
          </Card>

          {isAdding && (
            <p className="text-sm text-muted-foreground mt-2 flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Click on the map to set the zone center. Drag the marker to adjust.
            </p>
          )}
        </div>

        {/* Form / Zone List */}
        <div className="space-y-4">
          {isAdding ? (
            <Card className="p-4 space-y-3 border-primary/30">
              <h3 className="font-semibold text-sm">{editingZone ? 'Edit Zone' : 'Create New Zone'}</h3>

              <Input
                placeholder="Zone name *"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="text-sm"
              />

              <div className="grid grid-cols-2 gap-2">
                <Select value={formType} onValueChange={setFormType}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="danger">🔴 Danger</SelectItem>
                    <SelectItem value="safe">🟢 Safe</SelectItem>
                    <SelectItem value="restricted">🟡 Restricted</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={formSeverity} onValueChange={setFormSeverity}>
                  <SelectTrigger className="text-sm">
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Input
                placeholder="Radius (meters)"
                type="number"
                value={formRadius}
                onChange={(e) => setFormRadius(e.target.value)}
                className="text-sm"
              />

              <div className="grid grid-cols-2 gap-2">
                <Input
                  placeholder="Latitude"
                  value={formLat}
                  onChange={(e) => setFormLat(e.target.value)}
                  className="text-sm font-mono"
                  readOnly
                />
                <Input
                  placeholder="Longitude"
                  value={formLng}
                  onChange={(e) => setFormLng(e.target.value)}
                  className="text-sm font-mono"
                  readOnly
                />
              </div>

              <Textarea
                placeholder="Description (optional)"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
                rows={2}
                className="text-sm"
              />

              <div className="flex gap-2">
                <Button onClick={handleSaveZone} size="sm" className="flex-1">
                  <Save className="h-3 w-3 mr-1" />
                  {editingZone ? 'Update' : 'Create'}
                </Button>
                <Button onClick={resetForm} variant="outline" size="sm">
                  <X className="h-3 w-3 mr-1" />
                  Cancel
                </Button>
              </div>
            </Card>
          ) : null}

          {/* Zone List */}
          <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
            <h3 className="font-semibold text-sm text-muted-foreground">
              Active Zones ({zones.filter(z => z.is_active).length})
            </h3>
            {loading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-20 rounded-lg bg-accent/10 animate-pulse" />
              ))
            ) : zones.filter(z => z.is_active).length === 0 ? (
              <p className="text-sm text-muted-foreground">No geofence zones created yet.</p>
            ) : (
              zones.filter(z => z.is_active).map((zone) => (
                <Card
                  key={zone.id}
                  className="p-3 bg-card/50 hover:bg-accent/10 transition-colors cursor-pointer"
                  onClick={() => handleFlyToZone(zone)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-sm truncate">{zone.name}</p>
                      <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className={`text-[10px] ${getZoneColor(zone.zone_type)}`}>
                          {zone.zone_type}
                        </Badge>
                        <Badge variant="outline" className={`text-[10px] ${getSeverityColor(zone.severity)}`}>
                          {zone.severity}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {zone.radius_meters}m
                        </span>
                      </div>
                      {zone.description && (
                        <p className="text-[11px] text-muted-foreground mt-1 line-clamp-1">{zone.description}</p>
                      )}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleEditZone(zone); }}
                      >
                        <Edit2 className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); handleDeleteZone(zone.id); }}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ZoneManagement;
