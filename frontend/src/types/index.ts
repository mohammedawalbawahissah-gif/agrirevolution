export interface Paginated<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export type UserRole = "farmer" | "dealer" | "buyer" | "admin";

export type BuyerType = "wholesaler" | "retailer" | "restaurant" | "processor" | "exporter";

export const BUYER_TYPE_LABELS: Record<BuyerType, string> = {
  wholesaler: "Wholesaler",
  retailer: "Retailer",
  restaurant: "Restaurant",
  processor: "Food Processor",
  exporter: "Exporter",
};

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

export interface FarmerProfile {
  id: number;
  user: User;
  farm_size_acres: string | null;
  primary_crops: string;
  gps_latitude: string | null;
  gps_longitude: string | null;
}

export interface DealerProfile {
  id: number;
  user: User;
  business_name: string;
  service_radius_km: number;
  is_active: boolean;
}

export interface BuyerProfile {
  id: number;
  user: User;
  business_name: string;
  buyer_type: BuyerType | "";
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

export type PaymentChannel = "mtn_momo" | "vodafone_cash" | "airteltigo" | "card";

export const PAYMENT_CHANNEL_LABELS: Record<PaymentChannel, string> = {
  mtn_momo: "MTN MoMo",
  vodafone_cash: "Vodafone Cash",
  airteltigo: "AirtelTigo Money",
  card: "Card (Hubtel Checkout)",
};

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
  delivery_method: "pickup" | "delivery";
  delivery_location: string;
  payment_channel: PaymentChannel | "";
}

export interface Transaction {
  id: number;
  user: number;
  purpose: "equipment_booking" | "produce_sale";
  channel: PaymentChannel;
  amount_ghs: string;
  status: "pending" | "success" | "failed";
  provider_reference: string;
  created_at: string;
}

export interface AdminStats {
  users: { farmer: number; dealer: number; buyer: number; admin: number; total: number };
  equipment: { total: number; available: number };
  bookings: { total: number; by_status: Record<string, number> };
  listings: { total: number; by_status: Record<string, number>; by_grade: Record<string, number> };
  orders: { total: number; by_status: Record<string, number> };
  transactions: { total: number; total_amount_ghs: string };
}

export interface Order {
  id: number;
  listing: number;
  buyer: number;
  agreed_price_ghs: string;
  status: "pending" | "accepted" | "paid" | "delivered" | "cancelled";
  delivery_method: "pickup" | "delivery";
  delivery_address: string;
  payment_method: PaymentChannel | "";
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
  delivery_method: "pickup" | "delivery" | "both";
  delivery_location: string;
  accepted_payment_methods: PaymentChannel[];
}

export interface AppNotification {
  id: number;
  user: number;
  channel: "sms" | "push" | "voice";
  category: "weather_alert" | "booking_update" | "listing_update" | "payment_update";
  message: string;
  is_sent: boolean;
  sent_at: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
