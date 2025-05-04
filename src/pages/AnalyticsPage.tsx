
import React, { useState } from "react";
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
  Indian,
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

// Mock data for the analytics charts and tables
const generateMockDonationData = (days: number) => {
  const data = [];
  const today = new Date();
  
  for (let i = days; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    
    // Generate a random donation amount between 500 and 5000
    const amount = Math.floor(Math.random() * 4500) + 500;
    // More donations during weekends and peak hours
    const factor = date.getDay() === 0 || date.getDay() === 6 ? 1.5 : 1;
    
    data.push({
      date: date.toISOString().split('T')[0],
      amount: Math.floor(amount * factor),
      // Add some variation to the chart
      viewers: Math.floor((Math.random() * 200) + 100),
    });
  }
  
  return data;
};

// Generate random recent donations
const generateRecentDonations = () => {
  const names = ["Rahul S.", "Priya M.", "Amit K.", "Neha G.", "Vijay P.", "Sneha D.", 
                "Arjun R.", "Kavita T.", "Deepak S.", "Ananya B."];
  const messages = [
    "Great stream! Keep it up!",
    "Love your content!",
    "This game is amazing, you're doing great",
    "First time watching, definitely coming back",
    "You deserve more viewers!",
    "Thanks for the entertainment",
    "",
    "Can you play my favorite song next?",
    "Hilarious reaction!",
    ""
  ];
  
  const donations = [];
  
  for (let i = 0; i < 10; i++) {
    const today = new Date();
    const minutesAgo = Math.floor(Math.random() * 120);
    const timestamp = new Date(today.getTime() - minutesAgo * 60000);
    
    donations.push({
      id: i,
      name: names[i],
      amount: Math.floor(Math.random() * 900) + 100,
      message: messages[i],
      timestamp: timestamp,
    });
  }
  
  return donations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
};

const chartData = generateMockDonationData(30);
const recentDonations = generateRecentDonations();

// Calculate analytics metrics
const calculateMetrics = (donations: any[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayDonations = recentDonations.filter(
    d => d.timestamp.getTime() >= today.getTime()
  );
  
  const todayTotal = todayDonations.reduce((sum, d) => sum + d.amount, 0);
  const numberOfGifts = todayDonations.length;
  const averageDonation = numberOfGifts > 0 ? Math.round(todayTotal / numberOfGifts) : 0;
  
  // Find top supporter
  let topSupporter = null;
  let maxAmount = 0;
  
  for (const donation of todayDonations) {
    if (donation.amount > maxAmount) {
      maxAmount = donation.amount;
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

const metrics = calculateMetrics(recentDonations);

const AnalyticsPage = () => {
  const [dateRange, setDateRange] = useState("7d");
  const [minAmount, setMinAmount] = useState(0);
  
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
  
  // Filter chart data based on selected date range
  const filteredChartData = () => {
    const days = parseInt(dateRange.replace('d', ''));
    return chartData.slice(-days);
  };

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
            <Indian className="h-4 w-4 text-muted-foreground" />
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
              {metrics.topSupporter ? metrics.topSupporter.name : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {metrics.topSupporter ? formatIndianRupees(metrics.topSupporter.amount) : "No donations today"}
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
              {recentDonations
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
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
