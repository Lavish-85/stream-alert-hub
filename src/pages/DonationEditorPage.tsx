
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DonationPageCustomizerFull } from "@/components/donation/DonationPageCustomizerFull";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DonationEditorPage = () => {
  const { user } = useAuth();
  
  if (!user) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <CardTitle>Donation Page Editor</CardTitle>
            <CardDescription>You need to be logged in to access this page</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center">
          <Button variant="ghost" size="sm" asChild className="mr-2">
            <Link to="/settings">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Settings
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Donation Page Editor</h1>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        <DonationPageCustomizerFull />
      </div>
    </div>
  );
};

export default DonationEditorPage;
