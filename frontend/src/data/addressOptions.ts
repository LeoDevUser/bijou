export const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado',
  'Connecticut', 'Delaware', 'District of Columbia', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota',
  'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire',
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota',
  'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia',
  'Washington', 'West Virginia', 'Wisconsin', 'Wyoming',
];

export const CA_PROVINCES = [
  'Alberta', 'British Columbia', 'Manitoba', 'New Brunswick',
  'Newfoundland and Labrador', 'Northwest Territories', 'Nova Scotia',
  'Nunavut', 'Ontario', 'Prince Edward Island', 'Quebec', 'Saskatchewan', 'Yukon',
];

export const MX_STATES = [
  'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
  'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima', 'Durango',
  'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo', 'Jalisco',
  'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca', 'Puebla',
  'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa', 'Sonora',
  'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán', 'Zacatecas',
];

export function getStateOptions(country: string): string[] {
  if (country === 'UNITED_STATES') return US_STATES;
  if (country === 'CANADA') return CA_PROVINCES;
  if (country === 'MEXICO') return MX_STATES;
  return [];
}

export function getPostalCodePattern(country: string): string {
  if (country === 'UNITED_STATES') return '\\d{5}(-\\d{4})?';
  if (country === 'CANADA') return '[A-Za-z]\\d[A-Za-z] ?\\d[A-Za-z]\\d';
  return '\\d{5}';
}

export function getPostalCodePlaceholder(country: string): string {
  if (country === 'UNITED_STATES') return '12345';
  if (country === 'CANADA') return 'A1A 1A1';
  return '12345';
}

export function getPhonePlaceholder(country: string): string {
  if (country === 'UNITED_STATES' || country === 'CANADA') return '+1 (555) 555-5555';
  return '+52 (55) 5555-5555';
}
