
export interface Donation {
  id: number;
  payment_id: string;
  amount: number;
  donor_name: string;
  message: string | null;
  created_at: string;
  user_id?: string | null;
}

export interface DonationAnalytics {
  date: string;
  amount: number;
  viewers: number;
}

export interface RecentDonation {
  id: number;
  name: string;
  amount: number;
  message: string | null;
  timestamp: Date;
}

export interface DonationPageSettings {
  id?: string;
  user_id: string;
  title: string;
  description: string;
  primary_color: string;
  secondary_color: string;
  background_image?: string | null;
  goal_amount: number;
  show_donation_goal: boolean;
  show_recent_donors: boolean;
  custom_thank_you_message: string;
  created_at?: string;
  updated_at?: string;
}
