// South Africa's 8 official metros, one representative point each — used for
// SEO landing pages (specialty × city). Deliberately coarser than the full
// saLocations autocomplete list: combining every suburb with every
// specialty would produce hundreds of near-duplicate thin pages, which
// hurts SEO rather than helping it. One solid page per metro is the right
// grain size, matching how directory sites like Zocdoc structure city pages.
export type Metro = { name: string; slug: string; lat: number; lng: number }

export const metros: Metro[] = [
  { name: 'Johannesburg', slug: 'johannesburg', lat: -26.2041, lng: 28.0473 },
  { name: 'Cape Town', slug: 'cape-town', lat: -33.9249, lng: 18.4241 },
  { name: 'Pretoria', slug: 'pretoria', lat: -25.7479, lng: 28.2293 },
  { name: 'Durban', slug: 'durban', lat: -29.8587, lng: 31.0218 },
  { name: 'Ekurhuleni', slug: 'ekurhuleni', lat: -26.2309, lng: 28.1753 },
  { name: 'Gqeberha', slug: 'gqeberha', lat: -33.9608, lng: 25.6022 },
  { name: 'East London', slug: 'east-london', lat: -33.0153, lng: 27.9116 },
  { name: 'Bloemfontein', slug: 'bloemfontein', lat: -29.0852, lng: 26.1596 },
]

export function findMetroBySlug(slug: string): Metro | undefined {
  return metros.find((m) => m.slug === slug)
}
