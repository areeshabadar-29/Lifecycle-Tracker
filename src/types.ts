export interface User {
  userId: number;
  email: string;
  fullName: string;
  role: 'user' | 'admin';
  phone?: string | null;
  city?: string | null;
}

export interface Category {
  category_id: number;
  name: string;
  parent_category_id: number | null;
  subcategories?: Category[];
}

export interface ItemSummary {
  item_id: number;
  name: string;
  brand: string;
  model: string;
  serial_number: string;
  description?: string;
  color?: string;
  manufacture_year?: number;
  category_id: number;
  category_name: string;
  current_owner_id: number;
  current_owner_name: string;
  current_owner_city?: string;
  purchase_date?: string;
  purchase_price?: number;
  primary_image?: string;
  latest_condition_score?: number;
  latest_condition_grade?: string;
  current_asking_price?: number;
  active_listing_id?: number;
  verified_count: number;
  repair_count: number;
  total_owners_recorded: number;
  status: 'active' | 'listed' | 'sold' | 'donated' | 'repaired';
  created_at: string;
}

export interface ItemImage {
  image_id: number;
  item_id: number;
  image_url: string;
  is_primary: boolean;
  uploaded_at: string;
}

export interface LifecycleEvent {
  event_id: number;
  item_id: number;
  performed_by: number;
  performed_by_name: string;
  performed_by_role: string;
  event_type: 'registration' | 'repair' | 'sale' | 'listing' | 'donation' | 'provenance_check' | 'condition_check';
  event_date: string;
  description: string;
}

export interface OwnershipRecord {
  ownership_id: number;
  item_id: number;
  owner_id: number;
  owner_name: string;
  owner_email?: string;
  owner_city?: string;
  transfer_id?: number;
  transfer_type?: string;
  transfer_date?: string;
  transfer_notes?: string;
  from_user_name?: string;
  start_date: string;
  end_date: string | null;
}

export interface ConditionLog {
  condition_id: number;
  item_id: number;
  event_id: number;
  assessed_by: number;
  assessed_by_name: string;
  condition_score: number;
  condition_grade: string;
  battery_health_pct?: number | null;
  battery_backup_hours?: number | null;
  notes?: string;
  assessed_at: string;
}

export interface Repair {
  repair_id: number;
  item_id: number;
  provider_id: number;
  provider_name: string;
  provider_type: string;
  provider_city: string;
  event_id: number;
  issue_id?: number | null;
  issue_title?: string | null;
  cause_id?: number | null;
  cause_description?: string | null;
  suggested_fix?: string | null;
  repair_date: string;
  description: string;
  cost: number;
  condition_before: number;
  condition_after: number;
}

export interface ProvenanceVerification {
  verification_id: number;
  item_id: number;
  verified_by: number;
  verified_by_name: string;
  verification_date: string;
  method: string;
  status: 'verified' | 'pending' | 'rejected';
  notes?: string;
}

export interface Listing {
  listing_id: number;
  item_id: number;
  seller_id: number;
  seller_name: string;
  asking_price: number;
  listing_date: string;
  status: string;
  closed_date: string | null;
  transaction_id?: number;
  buyer_id?: number;
  buyer_name?: string;
  sale_price?: number;
  sale_date?: string;
  payment_method?: string;
}

export interface Donation {
  donation_id: number;
  item_id: number;
  donor_id: number;
  donor_name: string;
  organization_id: number;
  organization_name: string;
  organization_type: string;
  organization_city: string;
  donation_date: string;
  notes?: string;
}

export interface ItemDetail {
  item: ItemSummary & {
    specifications?: Record<string, any> | string;
    parent_category_id?: number;
    parent_category_name?: string;
    registered_by_name: string;
    current_owner_email: string;
    battery_type?: string;
    battery_capacity_mah?: number;
    battery_rated_hours?: number;
  };
  images: ItemImage[];
  lifecycleEvents: LifecycleEvent[];
  ownershipChain: OwnershipRecord[];
  conditionLogs: ConditionLog[];
  repairs: Repair[];
  verifications: ProvenanceVerification[];
  listings: Listing[];
  donations: Donation[];
}

export interface ServiceProvider {
  provider_id: number;
  name: string;
  service_type: string;
  phone?: string;
  address?: string;
  city?: string;
}

export interface KnownIssueCause {
  cause_id: number;
  issue_id: number;
  cause_description: string;
  suggested_fix: string;
  difficulty: string;
  estimated_cost: number;
  needs_professional: boolean;
}

export interface KnownIssue {
  issue_id: number;
  category_id: number;
  category_name?: string;
  title: string;
  symptoms: string;
  severity: string;
  causes: KnownIssueCause[];
}

export interface Organization {
  organization_id: number;
  user_id: number;
  name: string;
  org_type: string;
  registration_no?: string;
  contact?: string;
  city?: string;
}
