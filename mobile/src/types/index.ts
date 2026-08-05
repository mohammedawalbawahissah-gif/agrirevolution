export type UserRole = "farmer" | "dealer" | "buyer" | "admin";

export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  phone_number: string;
  role: UserRole;
  preferred_access_mode: "app" | "ussd" | "voice";
  community: string;
  district: string;
  preferred_language: string;
  is_verified: boolean;
  created_at: string;
}

export interface WeatherForecast {
  id: number;
  community: string;
  district: string;
  forecast_date: string;
  rainfall_mm: string | null;
  temperature_high_c: string | null;
  temperature_low_c: string | null;
  humidity_percent: string | null;
}

export interface PlantingRecommendation {
  id: number;
  farmer: number;
  crop: string;
  recommended_action: "plant" | "harvest" | "request_equipment" | "hold";
  recommended_window_start: string;
  recommended_window_end: string;
  ai_rationale: string;
  confidence_score: string | null;
}

export interface Equipment {
  id: number;
  dealer: number;
  name: string;
  category: "ploughing" | "planting" | "harvesting" | "spraying" | "transport";
  rate_per_acre_ghs: string;
  is_available: boolean;
  description: string;
}

export interface EquipmentBooking {
  id: number;
  farmer: number;
  equipment: number;
  requested_date: string;
  acreage: string;
  status: "requested" | "confirmed" | "in_progress" | "completed" | "cancelled";
  total_cost_ghs: string | null;
  requested_via: "app" | "ussd" | "voice";
}

export interface Order {
  id: number;
  listing: number;
  buyer: number;
  agreed_price_ghs: string;
  status: "pending" | "accepted" | "paid" | "delivered" | "cancelled";
}

export interface ProduceListing {
  id: number;
  farmer: number;
  crop: string;
  quantity_kg: string;
  photo_url: string;
  ai_grade: "A" | "B" | "C" | "ungraded";
  ai_grading_notes: string;
  fair_price_band_low_ghs: string | null;
  fair_price_band_high_ghs: string | null;
  status: "listed" | "reserved" | "sold" | "expired";
}
