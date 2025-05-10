
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RecentDonation {
  id: number;
  name: string;
  amount: number;
  message: string | null;
  timestamp: Date;
}

interface RecentDonationsTableProps {
  donations: RecentDonation[];
  minAmount: number;
  setMinAmount: (value: number) => void;
  formatIndianRupees: (amount: number) => string;
  formatTimestamp: (timestamp: Date) => string;
}

const RecentDonationsTable: React.FC<RecentDonationsTableProps> = ({
  donations,
  minAmount,
  setMinAmount,
  formatIndianRupees,
  formatTimestamp
}) => {
  const [searchTerm, setSearchTerm] = React.useState("");

  const filteredDonations = donations
    .filter(donation => donation.amount >= minAmount)
    .filter(donation => 
      donation.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

  return (
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
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
            {filteredDonations.length > 0 ? (
              filteredDonations.map((donation) => (
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
  );
};

export default RecentDonationsTable;
