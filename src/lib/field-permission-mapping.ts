// Field permission mapping configuration
// Maps specific form field names to broader database permission categories

export interface FieldMapping {
  formField: string;
  permissionCategory: string;
  description: string;
  requiresHigherPrivilege?: boolean;
}

export const FIELD_PERMISSION_MAPPING: Record<string, string> = {
  // Basic Details category
  'title': 'basic_details',
  'destination': 'basic_details',
  'dates': 'basic_details',
  'description': 'basic_details',
  'theme': 'basic_details',
  'max_participants': 'basic_details',
  
  // Pricing category
  'price': 'pricing',
  'deposit_amount': 'pricing',
  'payment_options': 'pricing',
  'cancellation_policy': 'pricing',
  
  // Itinerary category  
  'program': 'itinerary',
  'activities': 'itinerary',
  'schedule': 'itinerary',
  'daily_plan': 'itinerary',
  
  // Requirements category
  'requirements': 'requirements',
  'physical_requirements': 'requirements',
  'skill_requirements': 'requirements',
  'equipment_needed': 'requirements',
  
  // Advanced Features category
  'special_features': 'advanced_features',
  'custom_options': 'advanced_features',
  'premium_services': 'advanced_features',
  'backup_plans': 'advanced_features'
};

export const PERMISSION_CATEGORIES = {
  'basic_details': {
    displayName: 'Basic Details',
    description: 'Trip title, destination, dates, and description',
    requiredLevel: 'apprentice'
  },
  'pricing': {
    displayName: 'Pricing & Payment',
    description: 'Trip price, deposits, and payment terms',
    requiredLevel: 'master_sensei'
  },
  'itinerary': {
    displayName: 'Itinerary & Program',
    description: 'Trip activities and daily schedule',
    requiredLevel: 'journey_guide'
  },
  'requirements': {
    displayName: 'Requirements',
    description: 'Physical and skill requirements for participants',
    requiredLevel: 'journey_guide'
  },
  'advanced_features': {
    displayName: 'Advanced Features',
    description: 'Special features and premium services',
    requiredLevel: 'master_sensei'
  }
};

/**
 * Maps a form field name to its permission category
 */
export function getFieldPermissionCategory(fieldName: string): string {
  return FIELD_PERMISSION_MAPPING[fieldName] || 'basic_details';
}

/**
 * Gets the minimum required level for a field
 */
export function getFieldRequiredLevel(fieldName: string): string {
  const category = getFieldPermissionCategory(fieldName);
  return PERMISSION_CATEGORIES[category]?.requiredLevel || 'apprentice';
}

/**
 * Gets all fields that belong to a specific category
 */
export function getFieldsByCategory(category: string): string[] {
  return Object.entries(FIELD_PERMISSION_MAPPING)
    .filter(([, cat]) => cat === category)
    .map(([field]) => field);
}

/**
 * Checks if a sensei level can access a field category
 */
export function canAccessFieldCategory(senseiLevel: string, category: string): boolean {
  const requiredLevel = PERMISSION_CATEGORIES[category]?.requiredLevel;
  if (!requiredLevel) return true;
  
  const levelHierarchy = ['apprentice', 'journey_guide', 'master_sensei'];
  const currentLevelIndex = levelHierarchy.indexOf(senseiLevel);
  const requiredLevelIndex = levelHierarchy.indexOf(requiredLevel);
  
  return currentLevelIndex >= requiredLevelIndex;
}

/**
 * Checks if a sensei level can edit a specific field
 */
export function canEditField(senseiLevel: string, fieldName: string): boolean {
  const category = getFieldPermissionCategory(fieldName);
  return canAccessFieldCategory(senseiLevel, category);
}