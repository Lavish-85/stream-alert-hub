
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
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { 
  DownloadCloud, 
  TrendingUp, 
  Users, 
  BadgeIndianRupee,
  Clock 
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

// Type definitions for the donations data
interface Donation {
  id: number;
  payment_id: string;
  amount: number;
  donor_name: string;
  message: string | null;
  created_at: string;
}

// Function to fetch donations from Supabase
const fetchDonations = async () => {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) {
    console.error('Error fetching donations:', error);
    throw error;
  }
  
  return data as Donation[];
};

// Generate donation analytics data from real donations
const generateDonationAnalytics = (donations: Donation[], days: number = 30) => {
  const data = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - days);
  
  // Create a map for each day
  const dailyMap: Record<string, { date: string, amount: number, viewers: number }> = {};
  
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
const formatRecentDonations = (donations: Donation[]) => {
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
  
  return {
    todayTotal,
    numberOfGifts,
    averageDonation,
    topSupporter
  };
};

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState("7d");
  const [minAmount, setMinAmount] = useState(0);
  
  // Fetch donations using React Query
  const { data: donations, isLoading, error } = useQuery({
    queryKey: ['donations'],
    queryFn: fetchDonations
  });
  
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
  const chartData = donations ? generateDonationAnalytics(donations, parseInt(dateRange.replace('d', ''))) : [];
  const recentDonations = donations ? formatRecentDonations(donations) : [];
  const metrics = donations ? calculateMetrics(donations) : { todayTotal: 0, numberOfGifts: 0, averageDonation: 0, topSupporter: null };
  
  // Filter chart data based on selected date range
  const filteredChartData = () => {
    const days = parseInt(dateRange.replace('d', ''));
    return chartData.slice(-days);
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
          <Button variant="outline" className="gap-2">
            <DownloadCloud className="h-4 w-4" /> Export CSV
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Today's Donations</CardTitle>
            <BadgeIndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIndianRupees(metrics.todayTotal)}</div>
            <p className="text-xs text-muted-foreground">
              +12% from yesterday
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Number of Gifts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.numberOfGifts}</div>
            <p className="text-xs text-muted-foreground">
              From {recentDonations.length} unique supporters
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatIndianRupees(metrics.averageDonation)}</div>
            <p className="text-xs text-muted-foreground">
              +5% from previous period
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Top Supporter</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.topSupporter ? metrics.topSupporter.donor_name : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.topSupporter ? formatIndianRupees(Number(metrics.topSupporter.amount)) : "No donations today"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Chart Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Donation Trends</CardTitle>
        </CardHeader>
        <CardContent className="h-[300px]">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={filteredChartData()}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8445ff" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#8445ff" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate} 
                  tick={{fontSize: 12}}
                  stroke="#94a3b8" 
                />
                <YAxis 
                  tickFormatter={(value) => `₹${value}`} 
                  tick={{fontSize: 12}}
                  stroke="#94a3b8"
                />
                <RechartsTooltip 
                  formatter={(value: any) => [`₹${value}`, 'Amount']}
                  labelFormatter={(label) => formatDate(label.toString())}
                  contentStyle={{
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    border: '1px solid #e2e8f0',
                    borderRadius: '0.375rem',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                  }}
                />
                <Area 
                  type="monotone" 
                  dataKey="amount" 
                  stroke="#8445ff" 
                  fillOpacity={1} 
                  fill="url(#colorAmount)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center">
              <p className="text-muted-foreground">No donation data available for this period</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Donations Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Donations</CardTitle>
          <div className="flex items-center gap-4">
            <div className="flex flex-col space-y-1">
              <span className="text-xs text-muted-foreground">Min Amount</span>
              <div className="flex items-center gap-2">
                <Slider
                  value={[minAmount]}
                  min={0}
                  max={1000}
                  step={100}
                  className="w-[120px]"
                  onValueChange={(value) => setMinAmount(value[0])}
                />
                <span className="text-sm w-16">₹{minAmount}+</span>
              </div>
            </div>
            <Input
              placeholder="Search donor..."
              className="max-w-[180px]"
            />
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Donor</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Message</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentDonations.length > 0 ? (
                recentDonations
                  .filter(donation => donation.amount >= minAmount)
                  .map((donation) => (
                    <TableRow key={donation.id}>
                      <TableCell className="text-muted-foreground">
                        {formatTimestamp(donation.timestamp)}
                      </TableCell>
                      <TableCell className="font-medium">{donation.name}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatIndianRupees(donation.amount)}
                      </TableCell>
                      <TableCell className={cn(
                        "max-w-[300px] truncate",
                        !donation.message && "text-muted-foreground italic"
                      )}>
                        {donation.message || "No message"}
                      </TableCell>
                    </TableRow>
                  ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <p className="text-muted-foreground">No donations found</p>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
