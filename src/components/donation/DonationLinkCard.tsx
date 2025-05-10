
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DollarSign, Copy, Check, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DonationLinkCardProps {
  userId: string;
}

const DonationLinkCard: React.FC<DonationLinkCardProps> = ({ userId }) => {
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  
  const donationLink = `${window.location.origin}/donate/${userId}`;
  
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
          Share this link with your viewers so they can donate to you
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
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Test Donation Page
          </Button>
        </div>
      </CardContent>
      <CardFooter>
        <p className="text-sm text-muted-foreground">
          Donations will be processed through Razorpay and show up on your alerts stream.
        </p>
      </CardFooter>
    </Card>
  );
};

export default DonationLinkCard;
