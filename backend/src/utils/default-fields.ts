/**
 * Default field definitions for new tenant portals
 * Based on Kolte Patil project creation form structure
 */

export const DEFAULT_SECTIONS = [
  { name: 'Property Information', order: 1 },
  { name: 'Project Details', order: 2 },
  { name: 'Location & Attachments', order: 3 },
];

// Default property amenities with icon mappings
export const DEFAULT_PROPERTY_AMENITIES = [
  'CCTV Cameras',
  'Reserved Parking',
  '24/7 Security',
  'Power Backup',
  'Lift',
  'Gym',
  'Swimming Pool',
  'Garden',
  'Club House',
  'Children Play Area',
];

// Default nearby places categories
export const DEFAULT_NEARBY_PLACES = [
  'Hospital',
  'School',
  'Shopping Mall',
  'Airport',
  'Railway Station',
  'Metro Station',
  'Bus Stand',
  'Bank',
  'Pharmacy',
  'Restaurant',
];

export const DEFAULT_FIELDS = [
  // Section 1: Property Information
  {
    key: 'projectName',
    label: 'Project Name',
    type: 'TEXT',
    section: 'Property Information',
    order: 1,
    required: true,
    placeholder: 'Enter project name',
    showInList: true,
  },
  {
    key: 'location',
    label: 'Location',
    type: 'TEXT',
    section: 'Property Information',
    order: 2,
    required: true,
    placeholder: 'Enter project location',
    showInList: true,
  },
  {
    key: 'price',
    label: 'Starting Price',
    type: 'PRICE',
    section: 'Property Information',
    order: 3,
    required: true,
    placeholder: '₹ 45 Lac',
    showInList: true,
  },
  {
    key: 'bannerImages',
    label: 'Banner Images',
    type: 'IMAGE_MULTI',
    section: 'Property Information',
    order: 4,
    required: true,
    showInList: false,
  },

  // Section 2: Project Details
  {
    key: 'bedrooms',
    label: 'Bedrooms',
    type: 'NUMBER',
    section: 'Project Details',
    order: 1,
    required: true,
    placeholder: '2, 3, 4',
    showInList: true,
  },
  {
    key: 'bathrooms',
    label: 'Bathrooms',
    type: 'NUMBER',
    section: 'Project Details',
    order: 2,
    required: false,
    placeholder: '2, 3',
    showInList: false,
  },
  {
    key: 'area',
    label: 'Carpet Area',
    type: 'AREA',
    section: 'Project Details',
    order: 3,
    required: true,
    placeholder: '850 - 1200 sq.ft',
    showInList: true,
  },
  {
    key: 'furnishing',
    label: 'Furnishing',
    type: 'SELECT',
    section: 'Project Details',
    order: 4,
    required: false,
    options: ['Unfurnished', 'Semi-Furnished', 'Fully Furnished'],
    showInList: true,
  },
  {
    key: 'projectStatus',
    label: 'Project Status',
    type: 'SELECT',
    section: 'Project Details',
    order: 5,
    required: true,
    options: ['ONGOING', 'LATEST', 'COMPLETED'],
    showInList: true,
  },
  {
    key: 'description',
    label: 'Description',
    type: 'TEXT',
    section: 'Project Details',
    order: 6,
    required: true,
    placeholder: 'Describe the project highlights, features, etc.',
    showInList: false,
  },
  {
    key: 'communityAmenities',
    label: 'Community Amenities',
    type: 'IMAGE_MULTI',
    section: 'Project Details',
    order: 7,
    required: false,
    showInList: false,
  },
  {
    key: 'propertyAmenities',
    label: 'Property Amenities',
    type: 'MULTISELECT',
    section: 'Project Details',
    order: 8,
    required: false,
    options: DEFAULT_PROPERTY_AMENITIES,
    showInList: true,
  },

  // Section 3: Location & Attachments
  {
    key: 'nearbyPlaces',
    label: 'Nearby Places',
    type: 'LOCATION',
    section: 'Location & Attachments',
    order: 1,
    required: false,
    showInList: false,
  },
  {
    key: 'locationIframe',
    label: 'Location Map Embed',
    type: 'TEXT',
    section: 'Location & Attachments',
    order: 2,
    required: false,
    placeholder: '<iframe src="..."></iframe>',
    showInList: false,
  },
  {
    key: 'brochure',
    label: 'Project Brochure',
    type: 'FILE',
    section: 'Location & Attachments',
    order: 3,
    required: true,
    showInList: false,
  },
];

export interface DefaultFieldInput {
  key: string;
  label: string;
  type: string;
  section: string;
  order: number;
  required: boolean;
  placeholder?: string;
  options?: string[];
  showInList: boolean;
  imageWidth?: number;
  imageHeight?: number;
}
