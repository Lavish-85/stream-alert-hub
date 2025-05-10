
-- Create donation page settings table
CREATE TABLE IF NOT EXISTS public.donation_page_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL DEFAULT 'Support My Stream',
  description TEXT NOT NULL DEFAULT 'Your donation will help me create better content!',
  primary_color TEXT NOT NULL DEFAULT '#8445ff',
  secondary_color TEXT NOT NULL DEFAULT '#4b1493',
  background_color TEXT NOT NULL DEFAULT '#f8f9fa',
  background_image TEXT,
  goal_amount INTEGER NOT NULL DEFAULT 10000,
  show_donation_goal BOOLEAN NOT NULL DEFAULT true,
  show_recent_donors BOOLEAN NOT NULL DEFAULT true,
  custom_thank_you_message TEXT NOT NULL DEFAULT 'Thank you for your donation! Your support means the world to me.',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add Row Level Security (RLS)
ALTER TABLE public.donation_page_settings ENABLE ROW LEVEL SECURITY;

-- Add policy to allow users to view their own settings
CREATE POLICY "Users can view their own donation page settings" 
ON public.donation_page_settings 
FOR SELECT 
USING (auth.uid() = user_id);

-- Add policy to allow users to insert their own settings
CREATE POLICY "Users can create their own donation page settings" 
ON public.donation_page_settings 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Add policy to allow users to update their own settings
CREATE POLICY "Users can update their own donation page settings" 
ON public.donation_page_settings 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Add policy to allow users to delete their own settings
CREATE POLICY "Users can delete their own donation page settings" 
ON public.donation_page_settings 
FOR DELETE 
USING (auth.uid() = user_id);

-- Enable realtime subscriptions for this table
ALTER TABLE public.donation_page_settings REPLICA IDENTITY FULL;
