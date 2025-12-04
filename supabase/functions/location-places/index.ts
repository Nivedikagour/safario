import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Place {
  name: string;
  description: string;
  imageUrl: string;
  distance?: string;
  category?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { lat, lng } = await req.json();

    if (!lat || !lng) {
      throw new Error('Latitude and longitude are required');
    }

    const MAPBOX_TOKEN = Deno.env.get('MAPBOX_TOKEN') || Deno.env.get('VITE_MAPBOX_TOKEN');
    
    if (!MAPBOX_TOKEN) {
      console.error('Mapbox token not configured');
      return new Response(
        JSON.stringify({ data: getDefaultPlaces() }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, get the city name using reverse geocoding
    const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality,neighborhood&access_token=${MAPBOX_TOKEN}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();
    
    const cityName = geocodeData.features?.[0]?.text || 
                     geocodeData.features?.[0]?.place_name?.split(',')[0] || 
                     'Your Area';
    
    console.log('Detected location:', cityName);

    // Search for nearby tourist attractions, landmarks, and points of interest
    const categories = [
      'tourism',
      'historic',
      'museum', 
      'park',
      'landmark',
      'monument',
      'temple',
      'church',
      'mosque'
    ];

    const searchQuery = 'tourist attractions landmarks monuments temples museums parks';
    const poiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?proximity=${lng},${lat}&limit=8&types=poi&access_token=${MAPBOX_TOKEN}`;
    
    console.log('Fetching nearby POIs...');
    const poiResponse = await fetch(poiUrl);
    const poiData = await poiResponse.json();

    if (!poiData.features || poiData.features.length === 0) {
      console.log('No POIs found, returning defaults');
      return new Response(
        JSON.stringify({ data: { city: cityName, places: getDefaultPlaces().places } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const places: Place[] = poiData.features.slice(0, 4).map((feature: any) => {
      const [poiLng, poiLat] = feature.center;
      const distance = calculateDistance(lat, lng, poiLat, poiLng);
      const category = feature.properties?.category || feature.place_type?.[0] || 'attraction';
      
      // Get a relevant image based on the place category
      const imageUrl = getPlaceImage(feature.text, category, feature.properties?.maki);

      return {
        name: feature.text || 'Unknown Place',
        description: feature.properties?.address || feature.place_name?.split(',').slice(1, 2).join('') || `${distance} away`,
        imageUrl,
        distance,
        category: formatCategory(category),
      };
    });

    console.log(`Found ${places.length} nearby places`);

    return new Response(
      JSON.stringify({ 
        data: { 
          city: cityName, 
          places 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ data: getDefaultPlaces() }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): string {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c;
  
  if (distance < 1) {
    return `${Math.round(distance * 1000)}m`;
  }
  return `${distance.toFixed(1)}km`;
}

function formatCategory(category: string): string {
  const categoryMap: Record<string, string> = {
    'poi': 'Point of Interest',
    'tourism': 'Tourist Spot',
    'historic': 'Historic Site',
    'museum': 'Museum',
    'park': 'Park',
    'landmark': 'Landmark',
    'monument': 'Monument',
    'temple': 'Temple',
    'place_of_worship': 'Place of Worship',
  };
  return categoryMap[category.toLowerCase()] || 'Attraction';
}

function getPlaceImage(name: string, category: string, maki?: string): string {
  // Map of place types to relevant Unsplash images
  const imageMap: Record<string, string[]> = {
    temple: [
      'https://images.unsplash.com/photo-1564804955013-e02ad9516e6a',
      'https://images.unsplash.com/photo-1545562083-c583d014b4d5',
    ],
    museum: [
      'https://images.unsplash.com/photo-1565060169194-19fabf63012c',
      'https://images.unsplash.com/photo-1554907984-15263bfd63bd',
    ],
    park: [
      'https://images.unsplash.com/photo-1562979314-bee7453e911c',
      'https://images.unsplash.com/photo-1519331379826-f10be5486c6f',
    ],
    monument: [
      'https://images.unsplash.com/photo-1587474260584-136574528ed5',
      'https://images.unsplash.com/photo-1564804955013-e02ad9516e6a',
    ],
    historic: [
      'https://images.unsplash.com/photo-1595658658481-d53d3f999875',
      'https://images.unsplash.com/photo-1566552881560-0be862a7c445',
    ],
    landmark: [
      'https://images.unsplash.com/photo-1570168007204-dfb528c6958f',
      'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad',
    ],
    default: [
      'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800',
      'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1',
      'https://images.unsplash.com/photo-1530789253388-582c481c54b0',
      'https://images.unsplash.com/photo-1507525428034-b723cf961d3e',
    ],
  };

  // Try to match by category or maki icon
  const lowerCategory = category.toLowerCase();
  const lowerName = name.toLowerCase();
  
  let images = imageMap.default;
  
  if (lowerName.includes('temple') || lowerCategory.includes('temple') || maki === 'religious-buddhist' || maki === 'religious-hindu') {
    images = imageMap.temple;
  } else if (lowerName.includes('museum') || lowerCategory.includes('museum')) {
    images = imageMap.museum;
  } else if (lowerName.includes('park') || lowerName.includes('garden') || lowerCategory.includes('park')) {
    images = imageMap.park;
  } else if (lowerName.includes('monument') || lowerName.includes('memorial') || lowerCategory.includes('monument')) {
    images = imageMap.monument;
  } else if (lowerName.includes('fort') || lowerName.includes('palace') || lowerCategory.includes('historic')) {
    images = imageMap.historic;
  } else if (lowerCategory.includes('landmark')) {
    images = imageMap.landmark;
  }

  // Return a random image from the category
  return images[Math.floor(Math.random() * images.length)];
}

function getDefaultPlaces() {
  return {
    city: "Popular Destinations",
    places: [
      { name: "Gateway of India", description: "Iconic Mumbai landmark", imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f" },
      { name: "Eiffel Tower", description: "Iconic Paris landmark", imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f" },
      { name: "Big Ben", description: "Iconic London landmark", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad" },
      { name: "Tanah Lot Temple", description: "Iconic Bali temple", imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4" },
    ],
  };
}
