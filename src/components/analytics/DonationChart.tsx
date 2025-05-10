
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";

interface DonationChartProps {
  chartData: Array<{ date: string, amount: number, viewers: number }>;
  formatDate: (dateString: string) => string;
}

const DonationChart: React.FC<DonationChartProps> = ({ chartData, formatDate }) => {
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Donation Trends</CardTitle>
      </CardHeader>
      <CardContent className="h-[300px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
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
  );
};

export default DonationChart;
