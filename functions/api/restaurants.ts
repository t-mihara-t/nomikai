interface Env {
  HOTPEPPER_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword');
  const count = url.searchParams.get('count') || '10';
  const range = url.searchParams.get('range');
  const budget = url.searchParams.get('budget');
  const partyCapacity = url.searchParams.get('party_capacity');
  const lat = url.searchParams.get('lat');
  const lng = url.searchParams.get('lng');

  const freeDrink = url.searchParams.get('free_drink');
  const card = url.searchParams.get('card');

  const apiKey = env.HOTPEPPER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'HOTPEPPER_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    key: apiKey,
    count,
    format: 'json',
  });

  if (keyword) params.set('keyword', keyword);
  if (budget) params.set('budget', budget);
  if (lat) params.set('lat', lat);
  if (lng) params.set('lng', lng);
  // range only works with lat/lng, not keyword-only search
  if (range && lat && lng) params.set('range', range);
  if (freeDrink === '1') params.set('free_drink', '1');
  if (card === '1') params.set('card', '1');
  // party_capacity is a response field only, not a search param - filtered client-side

  // At least keyword or lat/lng is required
  if (!keyword && !lat) {
    return Response.json({ error: 'keyword or lat/lng is required' }, { status: 400 });
  }

  const res = await fetch(
    `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?${params.toString()}`
  );

  if (!res.ok) {
    return Response.json(
      { error: 'Failed to fetch from HotPepper API' },
      { status: 502 }
    );
  }

  const data = await res.json() as {
    results: {
      results_available: number;
      results_returned: string;
      shop: Array<{
        id: string;
        name: string;
        address: string;
        station_name: string;
        lat: number;
        lng: number;
        catch: string;
        open: string;
        budget: { average: string; name: string };
        genre: { name: string };
        photo: { pc: { m: string } };
        urls: { pc: string };
        capacity: number;
        party_capacity: number;
        course: string;
        free_drink: string;
        free_food: string;
        private_room: string;
        lunch: string;
      }>;
      error?: Array<{ message: string }>;
    };
  };

  if (data.results.error) {
    return Response.json(
      { error: data.results.error[0]?.message || 'HotPepper API error' },
      { status: 400 }
    );
  }

  const shops = (data.results.shop || []).map((shop) => ({
    id: shop.id,
    name: shop.name,
    address: shop.address,
    station_name: shop.station_name,
    lat: shop.lat,
    lng: shop.lng,
    catch: shop.catch,
    open: shop.open,
    budget_average: shop.budget?.average || '',
    budget_name: shop.budget?.name || '',
    genre: shop.genre?.name || '',
    photo_url: shop.photo?.pc?.m || '',
    url: shop.urls?.pc || '',
    capacity: shop.capacity || 0,
    party_capacity: shop.party_capacity || 0,
    course: shop.course || '',
    free_drink: shop.free_drink || '',
    free_food: shop.free_food || '',
    private_room: shop.private_room || '',
    lunch: shop.lunch || '',
  }));

  return Response.json({
    total: data.results.results_available,
    shops,
  });
};
