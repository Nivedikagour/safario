import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PlaceData {
  city: string;
  places: Array<{
    name: string;
    description: string;
    imageUrl: string;
  }>;
}

const cityPlaces: Record<string, PlaceData> = {
  mumbai: {
    city: "Mumbai",
    places: [
      { name: "Gateway of India", description: "Iconic Mumbai landmark", imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f" },
      { name: "Marine Drive", description: "Queen's Necklace promenade", imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5" },
      { name: "Elephanta Caves", description: "Ancient rock-cut temples", imageUrl: "https://images.unsplash.com/photo-1595658658481-d53d3f999875" },
      { name: "Taj Mahal Palace", description: "Luxury heritage hotel", imageUrl: "https://images.unsplash.com/photo-1566552881560-0be862a7c445" },
    ],
  },
  bangalore: {
    city: "Bangalore",
    places: [
      { name: "Lalbagh Botanical Garden", description: "Historic garden with diverse flora", imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2" },
      { name: "Bangalore Palace", description: "Tudor-style architectural marvel", imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2" },
      { name: "Cubbon Park", description: "Lush green urban park", imageUrl: "https://images.unsplash.com/photo-1562979314-bee7453e911c" },
      { name: "Vidhana Soudha", description: "Magnificent legislative building", imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2" },
    ],
  },
  bengaluru: {
    city: "Bengaluru",
    places: [
      { name: "Lalbagh Botanical Garden", description: "Historic garden with diverse flora", imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2" },
      { name: "Bangalore Palace", description: "Tudor-style architectural marvel", imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2" },
      { name: "Cubbon Park", description: "Lush green urban park", imageUrl: "https://images.unsplash.com/photo-1562979314-bee7453e911c" },
      { name: "Vidhana Soudha", description: "Magnificent legislative building", imageUrl: "https://images.unsplash.com/photo-1596176530529-78163a4f7af2" },
    ],
  },
  delhi: {
    city: "Delhi",
    places: [
      { name: "India Gate", description: "War memorial monument", imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5" },
      { name: "Red Fort", description: "Historic Mughal fortress", imageUrl: "https://images.unsplash.com/photo-1597059284989-f6e5c217a f7c" },
      { name: "Qutub Minar", description: "UNESCO World Heritage Site", imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5" },
      { name: "Lotus Temple", description: "Architectural marvel", imageUrl: "https://images.unsplash.com/photo-1587474260584-136574528ed5" },
    ],
  },
  bali: {
    city: "Bali",
    places: [
      { name: "Tanah Lot Temple", description: "Iconic sea temple", imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4" },
      { name: "Ubud Rice Terraces", description: "Stunning agricultural landscapes", imageUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47" },
      { name: "Uluwatu Temple", description: "Clifftop temple with ocean views", imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4" },
      { name: "Sacred Monkey Forest", description: "Nature reserve and temple complex", imageUrl: "https://images.unsplash.com/photo-1555400038-63f5ba517a47" },
    ],
  },
  london: {
    city: "London",
    places: [
      { name: "Big Ben", description: "Iconic clock tower", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad" },
      { name: "Tower Bridge", description: "Victorian bridge landmark", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad" },
      { name: "London Eye", description: "Giant observation wheel", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad" },
      { name: "Buckingham Palace", description: "Royal residence", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad" },
    ],
  },
  paris: {
    city: "Paris",
    places: [
      { name: "Eiffel Tower", description: "Iconic iron lattice tower", imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f" },
      { name: "Louvre Museum", description: "World's largest art museum", imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f" },
      { name: "Notre-Dame", description: "Gothic cathedral", imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f" },
      { name: "Arc de Triomphe", description: "Monumental arch", imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f" },
    ],
  },
};

const defaultPlaces: PlaceData = {
  city: "Popular Destinations",
  places: [
    { name: "Gateway of India", description: "Iconic Mumbai landmark", imageUrl: "https://images.unsplash.com/photo-1570168007204-dfb528c6958f" },
    { name: "Eiffel Tower", description: "Iconic Paris landmark", imageUrl: "https://images.unsplash.com/photo-1511739001486-6bfe10ce785f" },
    { name: "Big Ben", description: "Iconic London landmark", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad" },
    { name: "Tanah Lot Temple", description: "Iconic Bali temple", imageUrl: "https://images.unsplash.com/photo-1537996194471-e657df975ab4" },
  ],
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

    // Use Nominatim for reverse geocoding
    const geocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=10&addressdetails=1`;
    const geocodeResponse = await fetch(geocodeUrl, {
      headers: {
        'User-Agent': 'Safario-Travel-App/1.0'
      }
    });

    if (!geocodeResponse.ok) {
      console.error('Geocoding failed');
      return new Response(
        JSON.stringify({ data: defaultPlaces }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const geocodeData = await geocodeResponse.json();
    const city = geocodeData.address?.city || 
                 geocodeData.address?.town || 
                 geocodeData.address?.village ||
                 geocodeData.address?.state ||
                 '';

    console.log('Detected city:', city);

    // Find matching city in our database (case-insensitive)
    const cityKey = city.toLowerCase().replace(/\s+/g, '');
    const places = cityPlaces[cityKey] || defaultPlaces;

    return new Response(
      JSON.stringify({ data: places }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ data: defaultPlaces }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
