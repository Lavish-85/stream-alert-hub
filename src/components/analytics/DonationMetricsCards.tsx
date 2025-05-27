
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BadgeIndianRupee, Users, TrendingUp, Clock } from "lucide-react";
import { Donation } from "@/types/donation";

interface DonationMetricsProps {
  todayTotal: number;
  numberOfGifts: number;
  averageDonation: number;
  topSupporter: Donation | null;
  formatIndianRupees: (amount: number) => string;
  totalDonors: number;
}

const DonationMetricsCards: React.FC<DonationMetricsProps> = ({
  todayTotal,
  numberOfGifts,
  averageDonation,
  topSupporter,
  formatIndianRupees,
  totalDonors,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Today's Donations</CardTitle>
          <BadgeIndianRupee className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatIndianRupees(todayTotal)}</div>
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
          <div className="text-2xl font-bold">{numberOfGifts}</div>
          <p className="text-xs text-muted-foreground">
            From {totalDonors} unique supporters
          </p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
          <CardTitle className="text-sm font-medium">Average Donation</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatIndianRupees(averageDonation)}</div>
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
            {topSupporter ? topSupporter.donor_name : "-"}
          </div>
          <p className="text-xs text-muted-foreground">
            {topSupporter ? formatIndianRupees(Number(topSupporter.amount)) : "No donations today"}
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default DonationMetricsCards;
