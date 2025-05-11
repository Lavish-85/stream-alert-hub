
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DownloadCloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { Donation, DonationAnalytics, RecentDonation } from "@/types/donation";
import DonationMetricsCards from "@/components/analytics/DonationMetricsCards";
import DonationChart from "@/components/analytics/DonationChart";
import RecentDonationsTable from "@/components/analytics/RecentDonationsTable";

// Function to fetch donations from Supabase - now filters out test donations
const fetchDonations = async () => {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .not('payment_id', 'like', 'test_%')  // Filter out test donations by prefix
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching donations:', error);
    throw error;
  }
  
  return data as Donation[];
};

// Generate donation analytics data from real donations
const generateDonationAnalytics = (donations: Donation[], days: number = 30) => {
  const data: DonationAnalytics[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);
  
  // Create a map for each day
  const dailyMap: Record<string, DonationAnalytics> = {};
  
  // Initialize the map with zero values for each day
  for (let i = 0; i <= days; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];
    dailyMap[dateStr] = {
      date: dateStr,
      amount: 0,
      // Add some random viewers data since it's not in the donations table
      viewers: Math.floor((Math.random() * 200) + 100)
    };
  }
  
  // Aggregate donation amounts by date
  donations.forEach(donation => {
    const donationDate = new Date(donation.created_at).toISOString().split('T')[0];
    if (donationDate in dailyMap) {
      dailyMap[donationDate].amount += Number(donation.amount);
    }
  });
  
  // Convert the map to an array
  return Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));
};

// Format donations for the recent donations table
const formatRecentDonations = (donations: Donation[]): RecentDonation[] => {
  return donations.map(donation => ({
    id: donation.id,
    name: donation.donor_name,
    amount: Number(donation.amount),
    message: donation.message,
    timestamp: new Date(donation.created_at)
  }));
};

// Calculate analytics metrics from real donations
const calculateMetrics = (donations: Donation[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayDonations = donations.filter(
    d => new Date(d.created_at).getTime() >= today.getTime()
  );
  
  const todayTotal = todayDonations.reduce((sum, d) => sum + Number(d.amount), 0);
  const numberOfGifts = todayDonations.length;
  const averageDonation = numberOfGifts > 0 ? Math.round(todayTotal / numberOfGifts) : 0;
  
  // Find top supporter
  let topSupporter = null;
  let maxAmount = 0;
  
  for (const donation of todayDonations) {
    if (Number(donation.amount) > maxAmount) {
      maxAmount = Number(donation.amount);
      topSupporter = donation;
    }
  }

  // Calculate unique donors
  const uniqueDonors = new Set(donations.map(d => d.donor_name)).size;
  
  return {
    todayTotal,
    numberOfGifts,
    averageDonation,
    topSupporter,
    totalDonors: uniqueDonors
  };
};

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState("7d");
  const [minAmount, setMinAmount] = useState(0);
  
  const queryClient = useQueryClient();
  
  // Fetch donations using React Query
  const { data: donations, isLoading, error } = useQuery({
    queryKey: ['donations'],
    queryFn: fetchDonations
  });
  
  // Setup realtime subscription for new donations
  useEffect(() => {
    const channel = supabase
      .channel('analytics-donations')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donations'
        },
        (payload) => {
          // Fix TypeScript error by adding proper type checking
          // Check if payload.new exists and is an object
          if (payload.new && typeof payload.new === 'object') {
            // Check if payment_id property exists and it's not a test donation
            if (
              'payment_id' in payload.new && 
              typeof payload.new.payment_id === 'string' && 
              !payload.new.payment_id.startsWith('test_')
            ) {
              // Use React Query's invalidation instead of page reload
              queryClient.invalidateQueries({ queryKey: ['donations'] });
              
              // Show a toast notification about the donation update
              const action = payload.eventType === 'INSERT' ? 'received' : 'updated';
              toast({
                title: `Donation ${action}`,
                description: "Analytics data has been refreshed",
              });
            }
          }
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const formatIndianRupees = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };
  
  const formatDate = (dateString: string) => {
    const options: Intl.DateTimeFormatOptions = { day: '2-digit', month: 'short' };
    return new Date(dateString).toLocaleDateString('en-IN', options);
  };
  
  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.round(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const hours = Math.floor(diffMins / 60);
    if (hours === 1) return '1 hour ago';
    if (hours < 24) return `${hours} hours ago`;
    
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    return `${days} days ago`;
  };
  
  // Process data once donations are loaded
  const allChartData = donations ? generateDonationAnalytics(donations, parseInt(dateRange.replace('d', ''))) : [];
  const recentDonations = donations ? formatRecentDonations(donations) : [];
  const metrics = donations ? calculateMetrics(donations) : { 
    todayTotal: 0, 
    numberOfGifts: 0, 
    averageDonation: 0, 
    topSupporter: null, 
    totalDonors: 0 
  };
  
  // Filter chart data based on selected date range
  const chartData = () => {
    const days = parseInt(dateRange.replace('d', ''));
    return allChartData.slice(-days);
  };

  const handleExportCSV = () => {
    if (!donations || donations.length === 0) {
      toast({
        title: "No data to export",
        description: "There are no donations to export at this time.",
        variant: "destructive",
      });
      return;
    }

    // Create CSV content
    const headers = ["ID", "Donor Name", "Amount", "Date", "Message"];
    const csvRows = [
      headers.join(","),
      ...donations.map(d => [
        d.id,
        `"${d.donor_name.replace(/"/g, '""')}"`, // Escape quotes in donor names
        d.amount,
        new Date(d.created_at).toLocaleDateString(),
        `"${d.message ? d.message.replace(/"/g, '""') : ''}"`
      ].join(","))
    ];
    
    const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
    const encodedUri = encodeURI(csvContent);
    
    // Create download link and click it
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `donations_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Successful",
      description: "Your donation data has been exported as a CSV file.",
    });
  };

  // Handle loading and error states
  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto p-8 flex justify-center items-center">
        <p className="text-lg">Loading analytics data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto p-8">
        <div className="bg-red-50 p-4 rounded-md border border-red-200">
          <h2 className="text-red-700 text-lg font-medium">Error loading donation data</h2>
          <p className="text-red-600 mt-2">Please try again later or contact support.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-1">Analytics Dashboard</h1>
          <p className="text-muted-foreground">
            Track your donation performance and viewer engagement
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Date Range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">Last 24h</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <DownloadCloud className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <DonationMetricsCards 
        todayTotal={metrics.todayTotal}
        numberOfGifts={metrics.numberOfGifts}
        averageDonation={metrics.averageDonation}
        topSupporter={metrics.topSupporter}
        formatIndianRupees={formatIndianRupees}
        totalDonors={metrics.totalDonors}
      />

      {/* Chart Section */}
      <DonationChart 
        chartData={chartData()}
        formatDate={formatDate}
      />

      {/* Donations Table */}
      <RecentDonationsTable
        donations={recentDonations}
        minAmount={minAmount}
        setMinAmount={setMinAmount}
        formatIndianRupees={formatIndianRupees}
        formatTimestamp={formatTimestamp}
      />
    </div>
  );
};

export default AnalyticsPage;
