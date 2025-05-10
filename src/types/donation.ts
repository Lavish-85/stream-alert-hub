
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
