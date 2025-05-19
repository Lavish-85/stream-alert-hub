
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Copy, Check, ExternalLink, BadgeEuro, ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DonationLinkCardProps {
  userId: string;
}

const DonationLinkCard: React.FC<DonationLinkCardProps> = ({ userId }) => {
  const [copied, setCopied] = useState(false);
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Fetch custom URL if available
  React.useEffect(() => {
    const fetchCustomUrl = async () => {
      if (!userId) return;
      
      try {
        // Using the correct table name: donation_page_settings
        const { data, error } = await supabase
          .from('donation_page_settings')
          .select('custom_url')
          .eq('user_id', userId)
          .maybeSingle();
          
        if (!error && data?.custom_url) {
          setCustomUrl(data.custom_url);
        }
      } catch (err) {
        console.error("Failed to fetch custom URL", err);
      }
    };
    
    fetchCustomUrl();
  }, [userId]);
  
  // Ensure we have a valid user ID, falling back to the provided userId prop
  const effectiveUserId = user?.id || userId;
  
  // Make sure we have a valid donation link with the appropriate user ID or custom URL
  const donationLink = customUrl 
    ? `${window.location.origin}/donate/${customUrl}` 
    : effectiveUserId 
      ? `${window.location.origin}/donate/${effectiveUserId}` 
      : `${window.location.origin}/donate/your-channel-id`;
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(donationLink);
      setCopied(true);
      toast.success("Donation link copied to clipboard!");
      
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy: ", err);
      toast.error("Failed to copy link");
    }
  };
  
  const openDonationPage = () => {
    // Validate that we have an actual user ID or custom URL before opening
    if ((!effectiveUserId || effectiveUserId === 'your-channel-id') && !customUrl) {
      toast.error("User ID not available. Please refresh or log in again.");
      return;
    }
    window.open(donationLink, '_blank');
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="mr-2 h-5 w-5 text-emerald-500" />
          Donation Link
        </CardTitle>
        <CardDescription>
          Share this link with your viewers so they can donate directly via UPI
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col space-y-4">
          <div className="flex space-x-2">
            <Input 
              value={donationLink}
              readOnly
              className="font-mono text-sm"
            />
            <Button
              size="sm"
              variant="outline"
              className={`min-w-[4rem] ${copied ? 'bg-green-50' : ''}`}
              onClick={copyToClipboard}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          
          <Button 
            variant="secondary" 
            className="w-full"
            onClick={openDonationPage}
            disabled={(!effectiveUserId || effectiveUserId === 'your-channel-id') && !customUrl}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview Donation Page
          </Button>
          
          {(!effectiveUserId || effectiveUserId === 'your-channel-id') && !customUrl && (
            <p className="text-sm text-amber-600">
              You need to be logged in to access the donation page.
            </p>
          )}

          <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-100">
            <h4 className="text-sm font-medium flex items-center text-blue-700 mb-1">
              <BadgeEuro className="h-4 w-4 mr-1" /> Sponsorship Opportunities
            </h4>
            <p className="text-xs text-blue-600">
              Your donation page now supports sponsor logos and a custom banner. 
              Customize these in the "Sponsors" tab of the donation page settings.
            </p>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Donations will be processed through UPI and show up on your alerts stream.
        </p>
      </CardFooter>
    </Card>
  );
};

export default DonationLinkCard;
