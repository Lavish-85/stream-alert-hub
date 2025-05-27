
import * as React from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Zap, Link } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const AuthPage = () => {
  const { isLoading, signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [streamerName, setStreamerName] = useState("");
  const [channelLink, setChannelLink] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    
    try {
      if (mode === "signin") {
        await signIn(email, password);
      } else {
        await signUp(email, password, {
          streamer_name: streamerName,
          channel_link: channelLink
        });
      }
    } catch (error: any) {
      console.error("Auth error:", error);
      if (error.message.includes("User already registered")) {
        setErrorMessage("This email is already registered. Please sign in instead.");
      } else {
        setErrorMessage(error.message || "An error occurred during authentication");
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary p-3">
              <Zap className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold">StreamDonate</h1>
          <p className="text-muted-foreground">
            Accept and manage donations for your streams
          </p>
        </div>

        <Card className="w-full">
          <CardHeader>
            <CardTitle>
              {mode === "signin" ? "Sign In" : "Create Account"}
            </CardTitle>
            <CardDescription>
              {mode === "signin"
                ? "Enter your email to sign in to your account"
                : "Enter your details to create a new account"}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-md bg-destructive/15 text-destructive text-sm">
                  {errorMessage}
                </div>
              )}
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  {mode === "signin" && (
                    <Button
                      variant="link"
                      className="px-0 text-xs"
                      onClick={() => {
                        // Future: implement password reset
                        alert("Password reset functionality will be added soon!");
                      }}
                    >
                      Forgot password?
                    </Button>
                  )}
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              
              {mode === "signup" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="streamerName">Streamer Name</Label>
                    <Input
                      id="streamerName"
                      type="text"
                      placeholder="Your streamer name"
                      value={streamerName}
                      onChange={(e) => setStreamerName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="channelLink">
                      <div className="flex items-center gap-1">
                        <Link size={14} />
                        <span>Channel Link</span>
                      </div>
                    </Label>
                    <Input
                      id="channelLink"
                      type="url"
                      placeholder="https://twitch.tv/yourusername"
                      value={channelLink}
                      onChange={(e) => setChannelLink(e.target.value)}
                      required
                    />
                  </div>
                </>
              )}
            </CardContent>
            <CardFooter className="flex-col space-y-4">
              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {mode === "signin" ? "Signing in..." : "Creating Account..."}
                  </>
                ) : (
                  <>{mode === "signin" ? "Sign In" : "Sign Up"}</>
                )}
              </Button>
              <div className="text-center text-sm">
                {mode === "signin" ? (
                  <>
                    Don't have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0"
                      onClick={() => setMode("signup")}
                    >
                      Sign up
                    </Button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <Button
                      variant="link"
                      className="p-0"
                      onClick={() => setMode("signin")}
                    >
                      Sign in
                    </Button>
                  </>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
