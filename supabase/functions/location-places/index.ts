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
  coordinates?: { lat: number; lng: number };
  directionsUrl?: string;
}

// Curated places database for Indian cities
const cityPlacesDB: Record<string, { city: string; places: Omit<Place, 'distance' | 'directionsUrl'>[] }> = {
  ahmedabad: {
    city: "Ahmedabad",
    places: [
      { name: "Science City", description: "Interactive science museum with IMAX theater", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", category: "Museum", coordinates: { lat: 23.0707, lng: 72.5140 } },
      { name: "Parimal Garden", description: "Beautiful urban garden for relaxation", imageUrl: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f", category: "Park", coordinates: { lat: 23.0225, lng: 72.5565 } },
      { name: "Sabarmati Ashram", description: "Historic ashram of Mahatma Gandhi", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Historic Site", coordinates: { lat: 23.0607, lng: 72.5802 } },
      { name: "Kankaria Lake", description: "Lakefront entertainment zone", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", category: "Lake", coordinates: { lat: 23.0067, lng: 72.6006 } },
      { name: "Adalaj Stepwell", description: "Ancient intricately carved stepwell", imageUrl: "https://images.unsplash.com/photo-1595658658481-d53d3f999875", category: "Monument", coordinates: { lat: 23.1667, lng: 72.5833 } },
      { name: "Law Garden Night Market", description: "Famous street food and shopping market", imageUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47", category: "Market", coordinates: { lat: 23.0263, lng: 72.5601 } },
    ],
  },
  indore: {
    city: "Indore",
    places: [
      { name: "Rajwada Palace", description: "Historic palace of Holkar dynasty", imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445", category: "Palace", coordinates: { lat: 22.7196, lng: 75.8577 } },
      { name: "Sarafa Bazaar", description: "Famous night food street", imageUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47", category: "Food Street", coordinates: { lat: 22.7180, lng: 75.8569 } },
      { name: "Lal Bagh Palace", description: "Grand European-style palace", imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445", category: "Palace", coordinates: { lat: 22.7125, lng: 75.8472 } },
      { name: "Patalpani Waterfall", description: "Scenic waterfall near Indore", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", category: "Waterfall", coordinates: { lat: 22.5747, lng: 75.7775 } },
      { name: "Khajrana Ganesh Temple", description: "Famous Ganesh temple", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Temple", coordinates: { lat: 22.7424, lng: 75.9135 } },
      { name: "Central Museum", description: "Historical artifacts and sculptures", imageUrl: "https://images.unsplash.com/photo-1565060169194-19fabf63012c", category: "Museum", coordinates: { lat: 22.7243, lng: 75.8839 } },
    ],
  },
  mumbai: {
    city: "Mumbai",
    places: [
      { name: "Gateway of India", description: "Iconic arch monument overlooking the sea", imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f", category: "Monument", coordinates: { lat: 18.9220, lng: 72.8347 } },
      { name: "Marine Drive", description: "Famous promenade along the coast", imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5", category: "Promenade", coordinates: { lat: 18.9432, lng: 72.8235 } },
      { name: "Elephanta Caves", description: "Ancient rock-cut cave temples", imageUrl: "https://images.unsplash.com/photo-1595658658481-d53d3f999875", category: "Historic Site", coordinates: { lat: 18.9633, lng: 72.9315 } },
      { name: "Juhu Beach", description: "Popular beach with street food", imageUrl: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e", category: "Beach", coordinates: { lat: 19.0883, lng: 72.8263 } },
    ],
  },
  delhi: {
    city: "Delhi",
    places: [
      { name: "India Gate", description: "War memorial and iconic landmark", imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5", category: "Monument", coordinates: { lat: 28.6129, lng: 77.2295 } },
      { name: "Red Fort", description: "Historic Mughal fortress", imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445", category: "Fort", coordinates: { lat: 28.6562, lng: 77.2410 } },
      { name: "Qutub Minar", description: "UNESCO World Heritage Site", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Monument", coordinates: { lat: 28.5245, lng: 77.1855 } },
      { name: "Lotus Temple", description: "Bahá'í House of Worship", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Temple", coordinates: { lat: 28.5535, lng: 77.2588 } },
    ],
  },
  bangalore: {
    city: "Bangalore",
    places: [
      { name: "Lalbagh Botanical Garden", description: "Historic garden with diverse flora", imageUrl: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f", category: "Garden", coordinates: { lat: 12.9507, lng: 77.5848 } },
      { name: "Cubbon Park", description: "Large urban park in the city center", imageUrl: "https://images.unsplash.com/photo-1562979314-bee7453e911c", category: "Park", coordinates: { lat: 12.9763, lng: 77.5929 } },
      { name: "Bangalore Palace", description: "Tudor-style architectural marvel", imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445", category: "Palace", coordinates: { lat: 12.9987, lng: 77.5921 } },
      { name: "ISKCON Temple", description: "Beautiful Krishna temple", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Temple", coordinates: { lat: 13.0106, lng: 77.5514 } },
    ],
  },
  jaipur: {
    city: "Jaipur",
    places: [
      { name: "Hawa Mahal", description: "Palace of Winds with unique facade", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Palace", coordinates: { lat: 26.9239, lng: 75.8267 } },
      { name: "Amber Fort", description: "Majestic hilltop fort", imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445", category: "Fort", coordinates: { lat: 26.9855, lng: 75.8513 } },
      { name: "City Palace", description: "Royal palace complex", imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445", category: "Palace", coordinates: { lat: 26.9258, lng: 75.8237 } },
      { name: "Jantar Mantar", description: "Historic astronomical observation site", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Monument", coordinates: { lat: 26.9248, lng: 75.8246 } },
    ],
  },
  gujarat: {
    city: "Gujarat",
    places: [
      { name: "Science City", description: "Interactive science museum with IMAX theater", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", category: "Museum", coordinates: { lat: 23.0707, lng: 72.5140 } },
      { name: "Parimal Garden", description: "Beautiful urban garden for relaxation", imageUrl: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f", category: "Park", coordinates: { lat: 23.0225, lng: 72.5565 } },
      { name: "Sabarmati Ashram", description: "Historic ashram of Mahatma Gandhi", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Historic Site", coordinates: { lat: 23.0607, lng: 72.5802 } },
      { name: "Kankaria Lake", description: "Lakefront entertainment zone", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d", category: "Lake", coordinates: { lat: 23.0067, lng: 72.6006 } },
    ],
  },
};

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
    
    // Get city name using reverse geocoding
    let cityName = "Your Area";
    
    if (MAPBOX_TOKEN) {
      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=place,locality,district&access_token=${MAPBOX_TOKEN}`;
      const geocodeResponse = await fetch(geocodeUrl);
      const geocodeData = await geocodeResponse.json();
      
      cityName = geocodeData.features?.[0]?.text || 
                 geocodeData.features?.[0]?.place_name?.split(',')[0] || 
                 "Your Area";
    } else {
      // Fallback to Nominatim
      const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
      const geocodeResponse = await fetch(geocodeUrl, {
        headers: { 'User-Agent': 'Safario-Travel-App/1.0' }
      });
      const geocodeData = await geocodeResponse.json();
      cityName = geocodeData.address?.city || 
                 geocodeData.address?.town || 
                 geocodeData.address?.state_district ||
                 geocodeData.address?.state || 
                 "Your Area";
    }

    console.log('Detected location:', cityName);

    // Find matching city in our database (case-insensitive, partial match)
    const cityKey = Object.keys(cityPlacesDB).find(key => 
      cityName.toLowerCase().includes(key) || 
      key.includes(cityName.toLowerCase().replace(/\s+/g, ''))
    );

    let places: Place[];
    let finalCityName: string;

    if (cityKey && cityPlacesDB[cityKey]) {
      const cityData = cityPlacesDB[cityKey];
      finalCityName = cityData.city;
      
      // Calculate distance and add directions for each place
      places = cityData.places.map(place => {
        const distance = place.coordinates 
          ? calculateDistance(lat, lng, place.coordinates.lat, place.coordinates.lng)
          : undefined;
        
        const directionsUrl = place.coordinates
          ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${place.coordinates.lat},${place.coordinates.lng}&travelmode=driving`
          : undefined;

        return {
          ...place,
          distance,
          directionsUrl,
        };
      });

      // Sort by distance
      places.sort((a, b) => {
        if (!a.distance || !b.distance) return 0;
        return parseFloat(a.distance) - parseFloat(b.distance);
      });

      // Return top 4 nearest places
      places = places.slice(0, 4);
    } else {
      // Return default places with directions
      finalCityName = cityName;
      places = getDefaultPlaces(lat, lng);
    }

    console.log(`Returning ${places.length} places for ${finalCityName}`);

    return new Response(
      JSON.stringify({ 
        data: { 
          city: finalCityName, 
          places 
        } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ data: { city: "Popular Destinations", places: getDefaultPlaces(0, 0) } }),
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

function getDefaultPlaces(userLat: number, userLng: number): Place[] {
  const defaultPlaces = [
    { name: "Nearest Tourist Spot", description: "Explore your surroundings", imageUrl: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800", category: "Attraction" },
    { name: "Local Heritage Site", description: "Discover local history", imageUrl: "https://images.unsplash.com/photo-1564804955013-e02ad9516e6a", category: "Historic" },
    { name: "City Park", description: "Relax in nature", imageUrl: "https://images.unsplash.com/photo-1519331379826-f10be5486c6f", category: "Park" },
    { name: "Local Market", description: "Experience local culture", imageUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47", category: "Market" },
  ];

  return defaultPlaces.map(place => ({
    ...place,
    directionsUrl: userLat && userLng 
      ? `https://www.google.com/maps/search/tourist+attractions/@${userLat},${userLng},14z`
      : undefined,
  }));
}
