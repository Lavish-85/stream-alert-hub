
import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDesigner } from "@/components/alerts/AlertDesigner";

const AlertDesignerPage = () => {
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <Link to="/alerts" className="text-primary hover:underline flex items-center">
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Alert Settings
        </Link>
        <h1 className="text-3xl font-bold mt-2">Alert Designer</h1>
        <p className="text-muted-foreground">
          Create custom alert designs with complete creative freedom
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Canvas Editor</CardTitle>
          <CardDescription>
            Drag and drop elements to create your perfect donation alert
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDesigner />
        </CardContent>
      </Card>
    </div>
  );
};

export default AlertDesignerPage;
