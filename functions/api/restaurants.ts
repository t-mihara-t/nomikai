interface Env {
  HOTPEPPER_API_KEY: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword');
  const count = url.searchParams.get('count') || '10';

  if (!keyword) {
    return Response.json({ error: 'keyword is required' }, { status: 400 });
  }

  const apiKey = env.HOTPEPPER_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'HOTPEPPER_API_KEY is not configured' },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    key: apiKey,
    keyword,
    count,
    format: 'json',
  });

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
        catch: string;
        open: string;
        budget: { average: string; name: string };
        genre: { name: string };
        photo: { pc: { m: string } };
        urls: { pc: string };
        capacity: number;
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
    catch: shop.catch,
    open: shop.open,
    budget_average: shop.budget?.average || '',
    budget_name: shop.budget?.name || '',
    genre: shop.genre?.name || '',
    photo_url: shop.photo?.pc?.m || '',
    url: shop.urls?.pc || '',
    capacity: shop.capacity || 0,
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
