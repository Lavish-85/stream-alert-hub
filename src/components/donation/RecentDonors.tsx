
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from "lucide-react";

interface Donor {
  id: string;
  name: string;
  amount: number;
  date: string;
  avatarUrl?: string;
}

interface RecentDonorsProps {
  donors: Donor[];
  className?: string;
}

const RecentDonors: React.FC<RecentDonorsProps> = ({ donors, className = "" }) => {
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
          {donors.length > 0 ? (
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
