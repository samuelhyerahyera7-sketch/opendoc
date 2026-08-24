// Real coordinates for South African cities, towns and suburbs, used to
// power "near me" search without needing a live geocoding API. Covers all
// 8 metros plus a broad spread of secondary towns across all 9 provinces,
// not just the big cities.
export type SALocation = { name: string; lat: number; lng: number; province: string; isMetro?: boolean }

export const saLocations: SALocation[] = [
  // Gauteng — City of Johannesburg metro
  { name: 'Sandton, Johannesburg', lat: -26.1076, lng: 28.0567, province: 'Gauteng', isMetro: true },
  { name: 'Johannesburg CBD', lat: -26.2041, lng: 28.0473, province: 'Gauteng', isMetro: true },
  { name: 'Rosebank, Johannesburg', lat: -26.1462, lng: 28.0436, province: 'Gauteng', isMetro: true },
  { name: 'Randburg, Johannesburg', lat: -26.094, lng: 27.9761, province: 'Gauteng', isMetro: true },
  { name: 'Fourways, Johannesburg', lat: -26.0114, lng: 28.0089, province: 'Gauteng', isMetro: true },
  { name: 'Midrand', lat: -25.9992, lng: 28.1289, province: 'Gauteng', isMetro: true },
  { name: 'Soweto', lat: -26.2678, lng: 27.8585, province: 'Gauteng', isMetro: true },
  { name: 'Roodepoort, Johannesburg', lat: -26.1625, lng: 27.8727, province: 'Gauteng', isMetro: true },
  { name: 'Melville, Johannesburg', lat: -26.1841, lng: 28.0009, province: 'Gauteng', isMetro: true },
  { name: 'Bryanston, Johannesburg', lat: -26.0611, lng: 28.0169, province: 'Gauteng', isMetro: true },
  // Gauteng — City of Tshwane metro
  { name: 'Pretoria CBD', lat: -25.7479, lng: 28.2293, province: 'Gauteng', isMetro: true },
  { name: 'Pretoria East', lat: -25.783, lng: 28.277, province: 'Gauteng', isMetro: true },
  { name: 'Centurion', lat: -25.8603, lng: 28.1894, province: 'Gauteng', isMetro: true },
  { name: 'Hatfield, Pretoria', lat: -25.7486, lng: 28.2378, province: 'Gauteng', isMetro: true },
  { name: 'Menlyn, Pretoria', lat: -25.7825, lng: 28.2773, province: 'Gauteng', isMetro: true },
  { name: 'Mamelodi', lat: -25.7167, lng: 28.3833, province: 'Gauteng', isMetro: true },
  // Gauteng — Ekurhuleni metro
  { name: 'Germiston', lat: -26.2309, lng: 28.1753, province: 'Gauteng', isMetro: true },
  { name: 'Boksburg', lat: -26.2125, lng: 28.2594, province: 'Gauteng', isMetro: true },
  { name: 'Benoni', lat: -26.1885, lng: 28.3211, province: 'Gauteng', isMetro: true },
  { name: 'Kempton Park', lat: -26.1017, lng: 28.2308, province: 'Gauteng', isMetro: true },
  { name: 'Alberton', lat: -26.2667, lng: 28.1219, province: 'Gauteng', isMetro: true },
  { name: 'Springs', lat: -26.2531, lng: 28.4406, province: 'Gauteng', isMetro: true },
  // Gauteng — outside the metros
  { name: 'Vereeniging', lat: -26.6731, lng: 27.9256, province: 'Gauteng' },
  { name: 'Vanderbijlpark', lat: -26.7113, lng: 27.8394, province: 'Gauteng' },
  { name: 'Krugersdorp', lat: -26.1, lng: 27.7739, province: 'Gauteng' },
  { name: 'Heidelberg, Gauteng', lat: -26.5, lng: 28.3667, province: 'Gauteng' },

  // Western Cape — City of Cape Town metro
  { name: 'Cape Town CBD', lat: -33.9249, lng: 18.4241, province: 'Western Cape', isMetro: true },
  { name: 'Sea Point, Cape Town', lat: -33.915, lng: 18.385, province: 'Western Cape', isMetro: true },
  { name: 'Bellville, Cape Town', lat: -33.9, lng: 18.6292, province: 'Western Cape', isMetro: true },
  { name: 'Camps Bay, Cape Town', lat: -33.95, lng: 18.3775, province: 'Western Cape', isMetro: true },
  { name: 'Claremont, Cape Town', lat: -33.9814, lng: 18.4644, province: 'Western Cape', isMetro: true },
  { name: 'Constantia, Cape Town', lat: -34.0231, lng: 18.4322, province: 'Western Cape', isMetro: true },
  { name: 'Milnerton, Cape Town', lat: -33.865, lng: 18.4906, province: 'Western Cape', isMetro: true },
  { name: 'Khayelitsha, Cape Town', lat: -34.0397, lng: 18.6786, province: 'Western Cape', isMetro: true },
  { name: 'Mitchells Plain, Cape Town', lat: -34.0392, lng: 18.6169, province: 'Western Cape', isMetro: true },
  { name: 'Table View, Cape Town', lat: -33.8225, lng: 18.4939, province: 'Western Cape', isMetro: true },
  // Western Cape — outside the metro
  { name: 'Stellenbosch', lat: -33.9321, lng: 18.8602, province: 'Western Cape' },
  { name: 'Paarl', lat: -33.7342, lng: 18.9621, province: 'Western Cape' },
  { name: 'Worcester', lat: -33.6467, lng: 19.4486, province: 'Western Cape' },
  { name: 'George', lat: -33.963, lng: 22.4617, province: 'Western Cape' },
  { name: 'Mossel Bay', lat: -34.1833, lng: 22.1333, province: 'Western Cape' },
  { name: 'Knysna', lat: -34.0363, lng: 23.0471, province: 'Western Cape' },
  { name: 'Hermanus', lat: -34.4187, lng: 19.2345, province: 'Western Cape' },
  { name: 'Oudtshoorn', lat: -33.5906, lng: 22.2014, province: 'Western Cape' },
  { name: 'Vredenburg', lat: -32.9069, lng: 17.9889, province: 'Western Cape' },
  { name: 'Beaufort West', lat: -32.3567, lng: 22.5811, province: 'Western Cape' },

  // KwaZulu-Natal — eThekwini metro
  { name: 'Durban CBD', lat: -29.8587, lng: 31.0218, province: 'KwaZulu-Natal', isMetro: true },
  { name: 'Umhlanga, Durban', lat: -29.7268, lng: 31.0844, province: 'KwaZulu-Natal', isMetro: true },
  { name: 'Berea, Durban', lat: -29.8388, lng: 30.9986, province: 'KwaZulu-Natal', isMetro: true },
  { name: 'Westville, Durban', lat: -29.8425, lng: 30.9256, province: 'KwaZulu-Natal', isMetro: true },
  { name: 'Pinetown', lat: -29.8149, lng: 30.8708, province: 'KwaZulu-Natal', isMetro: true },
  { name: 'Chatsworth, Durban', lat: -29.9333, lng: 30.8833, province: 'KwaZulu-Natal', isMetro: true },
  // KwaZulu-Natal — outside the metro
  { name: 'Ballito', lat: -29.5389, lng: 31.2141, province: 'KwaZulu-Natal' },
  { name: 'Pietermaritzburg', lat: -29.6006, lng: 30.3794, province: 'KwaZulu-Natal' },
  { name: 'Richards Bay', lat: -28.7807, lng: 32.0383, province: 'KwaZulu-Natal' },
  { name: 'Newcastle, KwaZulu-Natal', lat: -27.7574, lng: 29.9317, province: 'KwaZulu-Natal' },
  { name: 'Ladysmith', lat: -28.5583, lng: 29.7811, province: 'KwaZulu-Natal' },
  { name: 'Margate', lat: -30.865, lng: 30.3706, province: 'KwaZulu-Natal' },

  // Eastern Cape — Nelson Mandela Bay metro
  { name: 'Gqeberha (Port Elizabeth)', lat: -33.9608, lng: 25.6022, province: 'Eastern Cape', isMetro: true },
  { name: 'Summerstrand, Gqeberha', lat: -33.9903, lng: 25.6647, province: 'Eastern Cape', isMetro: true },
  { name: 'Walmer, Gqeberha', lat: -33.9833, lng: 25.5978, province: 'Eastern Cape', isMetro: true },
  // Eastern Cape — Buffalo City metro
  { name: 'East London', lat: -33.0153, lng: 27.9116, province: 'Eastern Cape', isMetro: true },
  { name: 'Bhisho', lat: -32.85, lng: 27.4333, province: 'Eastern Cape', isMetro: true },
  // Eastern Cape — outside the metros
  { name: 'Mthatha', lat: -31.5889, lng: 28.785, province: 'Eastern Cape' },
  { name: 'Grahamstown (Makhanda)', lat: -33.3053, lng: 26.5322, province: 'Eastern Cape' },
  { name: 'Queenstown (Komani)', lat: -31.8976, lng: 26.8753, province: 'Eastern Cape' },
  { name: 'Uitenhage (Kariega)', lat: -33.7616, lng: 25.3958, province: 'Eastern Cape' },
  { name: 'Port Alfred', lat: -33.5906, lng: 26.891, province: 'Eastern Cape' },

  // Free State — Mangaung metro
  { name: 'Bloemfontein', lat: -29.0852, lng: 26.1596, province: 'Free State', isMetro: true },
  { name: 'Botshabelo', lat: -29.2589, lng: 26.7264, province: 'Free State', isMetro: true },
  // Free State — outside the metro
  { name: 'Welkom', lat: -27.9769, lng: 26.7311, province: 'Free State' },
  { name: 'Bethlehem, Free State', lat: -28.2308, lng: 28.3078, province: 'Free State' },
  { name: 'Kroonstad', lat: -27.6503, lng: 27.2333, province: 'Free State' },
  { name: 'Sasolburg', lat: -26.8145, lng: 27.8225, province: 'Free State' },

  // Mpumalanga
  { name: 'Nelspruit (Mbombela)', lat: -25.4753, lng: 30.9694, province: 'Mpumalanga' },
  { name: 'Witbank (eMalahleni)', lat: -25.8756, lng: 29.2331, province: 'Mpumalanga' },
  { name: 'Secunda', lat: -26.5225, lng: 29.1725, province: 'Mpumalanga' },
  { name: 'Ermelo', lat: -26.5333, lng: 29.9833, province: 'Mpumalanga' },
  { name: 'Barberton', lat: -25.7917, lng: 31.05, province: 'Mpumalanga' },

  // Limpopo
  { name: 'Polokwane', lat: -23.9045, lng: 29.4689, province: 'Limpopo' },
  { name: 'Tzaneen', lat: -23.8333, lng: 30.1667, province: 'Limpopo' },
  { name: 'Thohoyandou', lat: -22.9469, lng: 30.4839, province: 'Limpopo' },
  { name: 'Mokopane', lat: -24.1939, lng: 29.0119, province: 'Limpopo' },
  { name: 'Musina', lat: -22.3444, lng: 30.0453, province: 'Limpopo' },

  // North West
  { name: 'Rustenburg', lat: -25.6672, lng: 27.2424, province: 'North West' },
  { name: 'Potchefstroom', lat: -26.7145, lng: 27.0972, province: 'North West' },
  { name: 'Mahikeng', lat: -25.865, lng: 25.6403, province: 'North West' },
  { name: 'Klerksdorp', lat: -26.8521, lng: 26.6667, province: 'North West' },
  { name: 'Brits', lat: -25.6347, lng: 27.7808, province: 'North West' },

  // Northern Cape
  { name: 'Kimberley', lat: -28.7282, lng: 24.7499, province: 'Northern Cape' },
  { name: 'Upington', lat: -28.4478, lng: 21.2561, province: 'Northern Cape' },
  { name: 'Kuruman', lat: -27.4531, lng: 23.4331, province: 'Northern Cape' },
  { name: 'Springbok', lat: -29.6644, lng: 17.8861, province: 'Northern Cape' },
  { name: 'De Aar', lat: -30.6494, lng: 24.0103, province: 'Northern Cape' },
]

export function findLocationByName(name: string): SALocation | undefined {
  const q = name.trim().toLowerCase()
  if (!q) return undefined
  return (
    saLocations.find((l) => l.name.toLowerCase() === q) ??
    saLocations.find((l) => l.name.toLowerCase().startsWith(q))
  )
}

export function searchLocations(query: string, limit = 8): SALocation[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const starts = saLocations.filter((l) => l.name.toLowerCase().startsWith(q))
  const contains = saLocations.filter((l) => !l.name.toLowerCase().startsWith(q) && l.name.toLowerCase().includes(q))
  return [...starts, ...contains].slice(0, limit)
}
