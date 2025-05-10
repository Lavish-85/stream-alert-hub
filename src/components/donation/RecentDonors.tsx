import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface Donor {
  id: string;
  name: string;
  amount: number;
  date: string;
  avatarUrl?: string;
}

interface RecentDonorsProps {
  channelId: string;
  initialDonors?: Donor[];
  className?: string;
}

const RecentDonors: React.FC<RecentDonorsProps> = ({ channelId, initialDonors = [], className = "" }) => {
  const [donors, setDonors] = useState<Donor[]>(initialDonors);
  const [isLoading, setIsLoading] = useState<boolean>(initialDonors.length === 0);

  // Fetch recent donors on component mount if no initial donors provided
  useEffect(() => {
    const fetchDonors = async () => {
      if (initialDonors.length > 0) {
        return; // Skip fetching if initial donors are provided
      }

      try {
        setIsLoading(true);
        const { data: donations, error } = await supabase
          .from('donations')
          .select('amount, donor_name, created_at')
          .eq('user_id', channelId)
          .order('created_at', { ascending: false })
          .limit(5);

        if (error) {
          console.error("Error fetching donors:", error);
          return;
        }

        if (donations) {
          const mappedDonors = donations.map(donation => ({
            id: `${donation.donor_name}-${donation.created_at}`,
            name: donation.donor_name,
            amount: donation.amount,
            date: new Date(donation.created_at || '').toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            }),
          }));
          
          setDonors(mappedDonors);
        }
      } catch (err) {
        console.error("Exception fetching donors:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDonors();
  }, [channelId, initialDonors.length]);

  // Set up real-time subscription for new donations
  useEffect(() => {
    if (!channelId) return;

    // Create a Supabase real-time channel subscription
    const channel = supabase
      .channel('public:donations')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'donations',
          filter: `user_id=eq.${channelId}`
        },
        (payload) => {
          console.log("New donation received:", payload);
          const newDonation = payload.new;
          
          // Create a donor object from the new donation
          const newDonor: Donor = {
            id: `${newDonation.donor_name}-${newDonation.created_at}`,
            name: newDonation.donor_name,
            amount: newDonation.amount,
            date: new Date(newDonation.created_at || '').toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric'
            }),
          };

          // Update the donors list (keeping only the 5 most recent)
          setDonors(currentDonors => {
            // Add the new donor at the beginning and keep only the 5 most recent
            const updatedDonors = [newDonor, ...currentDonors].slice(0, 5);
            
            // Show toast notification for new donation
            toast({
              title: "New Donation!",
              description: `${newDonor.name} just donated ₹${newDonor.amount}`,
            });
            
            return updatedDonors;
          });
        }
      )
      .subscribe();

    // Cleanup function to unsubscribe when component unmounts
    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelId]);

  return (
    <Card className={`shadow-md ${className}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Users className="mr-2 h-4 w-4" />
          Recent Supporters
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-2">Loading donors...</p>
          ) : donors.length > 0 ? (
            donors.map((donor) => (
              <div key={donor.id} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={donor.avatarUrl} alt={donor.name} />
                    <AvatarFallback className="text-xs">{donor.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="text-sm font-medium truncate max-w-[120px]">{donor.name}</div>
                </div>
                <div className="flex flex-col items-end">
                  <div className="text-sm font-semibold">₹{donor.amount}</div>
                  <div className="text-xs text-muted-foreground">{donor.date}</div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-center text-sm text-muted-foreground py-2">No donations yet</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentDonors;
