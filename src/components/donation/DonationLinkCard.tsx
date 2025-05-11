
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndianRupee, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DonationLinkCardProps {
  userId: string;
  customUrl?: string | null;
}

const DonationLinkCard: React.FC<DonationLinkCardProps> = ({ userId, customUrl }) => {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [effectiveCustomUrl, setEffectiveCustomUrl] = useState<string | null>(null);
  const { user } = useAuth();
  
  // Ensure we have a valid user ID, falling back to the provided userId prop
  const effectiveUserId = user?.id || userId;
  
  useEffect(() => {
    // If customUrl is provided directly, use it
    if (customUrl !== undefined) {
      setEffectiveCustomUrl(customUrl);
      return;
    }
    
    // Otherwise, fetch it from the database
    const fetchCustomUrl = async () => {
      if (!effectiveUserId) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('donation_page_settings')
          .select('custom_url')
          .eq('user_id', effectiveUserId)
          .maybeSingle();
        
        if (error) throw error;
        setEffectiveCustomUrl(data?.custom_url || null);
      } catch (err) {
        console.error("Failed to fetch custom URL:", err);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomUrl();
  }, [effectiveUserId, customUrl]);
  
  // Make sure we have a valid donation link with the appropriate path component (custom URL or user ID)
  const donationLink = effectiveUserId 
    ? `${window.location.origin}/donate/${effectiveCustomUrl || effectiveUserId}` 
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
    // Validate that we have an actual user ID before opening
    if (!effectiveUserId || effectiveUserId === 'your-channel-id') {
      toast.error("User ID not available. Please refresh or log in again.");
      return;
    }
    
    // Use window.open with _blank to open in a new tab
    window.open(donationLink, '_blank', 'noopener,noreferrer');
  };

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="flex items-center">
          <IndianRupee className="mr-2 h-5 w-5 text-emerald-500" />
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
            disabled={!effectiveUserId || effectiveUserId === 'your-channel-id'}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Preview Donation Page
          </Button>
          
          {(!effectiveUserId || effectiveUserId === 'your-channel-id') && (
            <p className="text-sm text-amber-600">
              You need to be logged in to access the donation page.
            </p>
          )}
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
