
import React, { useState, useEffect } from 'react';
import { DonationPageCustomizer } from '@/components/donation/DonationPageCustomizer';
import DonationPagePreview from '@/components/donation/DonationPagePreview';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brush, ExternalLink } from "lucide-react";
import { Button } from '@/components/ui/button';
import { DonationPageSettings } from '@/types/donation';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import DonationLinkCard from '../donation/DonationLinkCard';

// Create a type-safe way to use the donation_page_settings table
const donationPageSettingsTable = 'donation_page_settings';

const defaultSettings: DonationPageSettings = {
  user_id: "",
  title: "Support My Stream",
  description: "Your donation will help me create better content!",
  primary_color: "#8445ff",
  secondary_color: "#4b1493",
  goal_amount: 10000,
  show_donation_goal: true,
  show_recent_donors: true,
  custom_thank_you_message: "Thank you for your donation! Your support means the world to me.",
};

const DonationCustomizationTab = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<DonationPageSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [streamerInfo, setStreamerInfo] = useState<{ name?: string; avatar_url?: string }>({});

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        // Fetch streamer profile
        const { data: profile } = await supabase
          .from('profiles')
          .select('display_name, streamer_name, avatar_url')
          .eq('id', user.id)
          .single();
          
        if (profile) {
          setStreamerInfo({
            name: profile.streamer_name || profile.display_name,
            avatar_url: profile.avatar_url
          });
        }
        
        // Fetch donation page settings
        // @ts-ignore - Ignore TypeScript error as the table exists in the database
        const { data: settingsData } = await supabase
          .from(donationPageSettingsTable)
          .select('*')
          .eq('user_id', user.id)
          .single();
          
        if (settingsData) {
          setSettings(settingsData as unknown as DonationPageSettings);
        } else {
          setSettings({
            ...defaultSettings,
            user_id: user.id
          });
        }
      } catch (err) {
        console.error("Error fetching data:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchData();
    
    // Listen for changes to the donation_page_settings table
    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: donationPageSettingsTable,
          filter: `user_id=eq.${user?.id}`
        },
        async (payload) => {
          if (payload.new) {
            setSettings(payload.new as unknown as DonationPageSettings);
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Handle loading state
  if (isLoading && !user?.id) {
    return (
      <div className="flex justify-center items-center h-64">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="w-full md:w-2/3">
          <Tabs defaultValue="customize">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="customize">Customize</TabsTrigger>
              <TabsTrigger value="share">Share</TabsTrigger>
            </TabsList>
            <TabsContent value="customize">
              <DonationPageCustomizer />
            </TabsContent>
            <TabsContent value="share">
              <DonationLinkCard userId={user?.id || ""} />
            </TabsContent>
          </Tabs>
        </div>
        
        <div className="w-full md:w-1/3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <Brush className="mr-2 h-5 w-5 text-brand-500" />
                Preview
              </CardTitle>
              <CardDescription>
                See how your donation page will look
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <DonationPagePreview settings={settings} streamerInfo={streamerInfo} />
            </CardContent>
          </Card>
        </div>
      </div>
      
      <Alert>
        <AlertDescription className="text-sm">
          <p>Your customizations are automatically applied to your donation page. Any viewer who visits your donation link will see these changes.</p>
          <div className="mt-3">
            <Button size="sm" variant="outline">
              <ExternalLink className="mr-2 h-4 w-4" />
              View Live Donation Page
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default DonationCustomizationTab;
