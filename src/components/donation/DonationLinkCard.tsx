
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { IndianRupee, Copy, Check, ExternalLink, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface DonationLinkCardProps {
  userId: string;
}

const DonationLinkCard: React.FC<DonationLinkCardProps> = ({ userId }) => {
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const [customUrl, setCustomUrl] = useState<string | null>(null);
  
  // Ensure we have a valid user ID, falling back to the provided userId prop
  const effectiveUserId = user?.id || userId;
  
  // Fetch custom URL if available
  const fetchCustomUrl = async () => {
    if (!effectiveUserId) return;
    
    try {
      setIsLoading(true);
      console.log("Fetching custom URL for user:", effectiveUserId);
      const { data, error } = await supabase
        .from('donation_page_settings')
        .select('custom_url')
        .eq('user_id', effectiveUserId)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching custom URL:", error);
        toast.error("Failed to load donation link");
        return;
      }
        
      if (data && data.custom_url) {
        console.log("Found custom URL:", data.custom_url);
        setCustomUrl(data.custom_url);
      } else {
        console.log("No custom URL found, using user ID");
        setCustomUrl(null);
      }
    } catch (err) {
      console.error("Exception fetching custom URL:", err);
      toast.error("Failed to load donation link");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fetch on component mount and when effectiveUserId changes
  useEffect(() => {
    fetchCustomUrl();
  }, [effectiveUserId]);
  
  // Make sure we have a valid donation link with the appropriate identifier
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
    // Validate that we have an actual identifier before opening
    if ((!effectiveUserId || effectiveUserId === 'your-channel-id') && !customUrl) {
      toast.error("User ID not available. Please refresh or log in again.");
      return;
    }
    // Add a timestamp to prevent caching issues
    window.open(`${donationLink}?t=${Date.now()}`, '_blank');
  };

  const handleRefresh = () => {
    fetchCustomUrl();
    toast.info("Refreshing donation link...");
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
          
          <div className="flex space-x-2">
            <Button 
              variant="secondary" 
              className="w-full"
              onClick={openDonationPage}
              disabled={(!effectiveUserId || effectiveUserId === 'your-channel-id') && !customUrl}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Preview Donation Page
            </Button>
            
            <Button
              variant="outline"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex-shrink-0"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
            </Button>
          </div>
          
          {((!effectiveUserId || effectiveUserId === 'your-channel-id') && !customUrl) && (
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
