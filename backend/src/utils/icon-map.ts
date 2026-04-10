/**
 * Icon map for property amenities and nearby places.
 * Maps amenity/place display names to their corresponding Nest by Kolte Patil SVG filenames.
 * Icons are served statically at: /icons/<filename>
 */

const ICON_MAP: Record<string, string> = {
  // ── Property Amenities — by display label ──────────────────────────────────
  'CCTV Cameras':        'CCTV Cameras.svg',
  'Reserved Parking':    'Reserved Parking.svg',
  '24/7 Security':       '7 Security.svg',
  'Power Backup':        'Power Backup.svg',
  'Lift':                'Lift.svg',
  'Gym':                 'Gym.svg',
  'Swimming Pool':       'Swimming Pool.svg',
  'Garden':              'Garden.svg',
  'Club House':          'Club House.svg',
  'Children Play Area':  'Children Play Area.svg',

  // ── Property Amenities — by slug value (TenantProject JSONB data) ──────────
  'cctv':                'CCTV Cameras.svg',
  'parking':             'Reserved Parking.svg',
  'security':            '7 Security.svg',
  'power_backup':        'Power Backup.svg',
  'lift':                'Lift.svg',
  'gym':                 'Gym.svg',
  'pool':                'Swimming Pool.svg',
  'garden':              'Garden.svg',
  'club_house':          'Club House.svg',
  'children_play_area':  'Children Play Area.svg',

  // ── Nearby Places — by display name ───────────────────────────────────────
  'Hospital':            'Hospital.svg',
  'School':              'School.svg',
  'Shopping Mall':       'Shopping Mall.svg',
  'Airport':             'Airport.svg',
  'Railway Station':     'Railway Station.svg',
  'Metro Station':       'Metro Station.svg',
  'Bus Stand':           'Bus Stand.svg',
  'Bank':                'Bank.svg',
  'Pharmacy':            'Pharmacy.svg',
  'Restaurant':          'Restaurant.svg',
};


/**
 * Returns the full icon URL for a given amenity or nearby place name.
 * Falls back to 'Children Play Area.svg' (generic) for unrecognised names.
 *
 * @param baseUrl  - The server base URL, e.g. "http://localhost:3002"
 * @param name     - The amenity/place name, e.g. "Gym", "Hospital"
 * @returns Full URL string or null if baseUrl is missing
 */
export function getIconUrl(baseUrl: string, name: string): string | null {
  if (!baseUrl) return null;
  const filename = ICON_MAP[name] ?? 'Children Play Area.svg'; // generic fallback
  return `${baseUrl}/icons/${encodeURIComponent(filename)}`;
}
