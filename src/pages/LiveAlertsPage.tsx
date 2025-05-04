
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

// Define the donation type based on our Supabase schema
interface Donation {
  id: number;
  payment_id: string;
  amount: number;
  donor_name: string;
  message: string | null;
  created_at: string;
}

const LiveAlertsPage = () => {
  const [alerts, setAlerts] = useState<Donation[]>([]);
  const [connected, setConnected] = useState(false);
  const [lastAlert, setLastAlert] = useState<Donation | null>(null);

  // Format amount as Indian Rupees
  const formatIndianRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  useEffect(() => {
    // Subscribe to real-time updates for donations
    const channel = supabase
      .channel('public:donations')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'donations' 
        }, 
        (payload) => {
          const newDonation = payload.new as Donation;
          console.log('New donation received:', newDonation);
          
          // Add to alerts list
          setAlerts(prevAlerts => [newDonation, ...prevAlerts].slice(0, 20));
          
          // Set as last alert to highlight it
          setLastAlert(newDonation);
          
          // Show toast notification
          toast(`${newDonation.donor_name} donated ${formatIndianRupees(newDonation.amount)}`, {
            description: newDonation.message || "No message",
          });
          
          // Reset last alert highlight after 5 seconds
          setTimeout(() => {
            setLastAlert(null);
          }, 5000);
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
        if (status === 'SUBSCRIBED') {
          setConnected(true);
        } else {
          setConnected(false);
        }
      });

    // Fetch the initial 20 most recent donations
    const fetchRecentDonations = async () => {
      const { data, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching recent donations:', error);
        return;
      }
      
      if (data) {
        setAlerts(data);
      }
    };

    fetchRecentDonations();

    // Cleanup on unmount
    return () => {
      channel.unsubscribe();
    };
  }, []);

  // Format the timestamp for display
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Live Donation Alerts</h1>
          <p className="text-muted-foreground">Watch donations as they come in real-time</p>
        </div>
        <Badge 
          variant={connected ? "default" : "destructive"}
          className="mt-2 sm:mt-0"
        >
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      {/* Alert Display */}
      <div className="grid gap-6">
        {alerts.length > 0 ? (
          alerts.map((donation) => (
            <Alert 
              key={donation.id}
              className={cn(
                "transition-all duration-500 p-6",
                lastAlert?.id === donation.id ? "border-brand-600 bg-brand-50/30 animate-pulse" : ""
              )}
            >
              <Bell className="h-6 w-6 mt-0.5" />
              <div className="w-full">
                <div className="flex justify-between items-start">
                  <AlertTitle className="font-semibold text-lg">
                    {donation.donor_name} donated {formatIndianRupees(donation.amount)}
                  </AlertTitle>
                  <span className="text-sm text-muted-foreground">
                    {donation.created_at ? formatTime(donation.created_at) : 'Just now'}
                  </span>
                </div>
                <AlertDescription className="mt-2 text-base text-muted-foreground">
                  {donation.message || "No message"}
                </AlertDescription>
              </div>
            </Alert>
          ))
        ) : (
          <Card className="p-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center text-xl">
                <AlertTriangle className="mr-2 h-6 w-6 text-muted-foreground" />
                No alerts yet
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-base">
                Donation alerts will appear here as they come in. When someone makes a donation, 
                you'll see it instantly!
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default LiveAlertsPage;
