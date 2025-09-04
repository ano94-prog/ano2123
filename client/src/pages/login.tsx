import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, AlertTriangle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  rememberUsername: z.boolean().default(false),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [showPasskeyError, setShowPasskeyError] = useState(true);
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      rememberUsername: false,
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Authentication flow would continue here",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Authentication Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen telstra-bg-gradient flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        {/* Telstra Logo Section */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full telstra-gradient mb-4">
            <span className="text-2xl font-bold text-white">T</span>
          </div>
          <h1 
            className="text-2xl font-semibold text-[var(--telstra-dark-navy)] mb-2"
            data-testid="text-signin-title"
          >
            Sign in
          </h1>
          <p 
            className="text-muted-foreground text-sm"
            data-testid="text-signin-subtitle"
          >
            Sign in with your Telstra ID
          </p>
        </div>

        {/* Main Login Card */}
        <Card className="telstra-shadow border border-border">
          <CardContent className="p-6 space-y-6">
            {/* Passkey Error Message */}
            {showPasskeyError && (
              <Alert 
                variant="destructive" 
                className="bg-destructive/10 border-destructive/20"
                data-testid="alert-passkey-error"
              >
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Unable to authenticate your passkey. Try again or continue with a password.
                </AlertDescription>
              </Alert>
            )}

            {/* Login Form */}
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Username Field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="Enter your username"
                  {...form.register("username")}
                  className="w-full"
                  data-testid="input-username"
                />
                {form.formState.errors.username && (
                  <p 
                    className="text-destructive text-sm"
                    data-testid="text-username-error"
                  >
                    {form.formState.errors.username.message}
                  </p>
                )}
              </div>

              {/* Remember Username Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberUsername"
                  checked={form.watch("rememberUsername")}
                  onCheckedChange={(checked) => 
                    form.setValue("rememberUsername", checked as boolean)
                  }
                  data-testid="checkbox-remember-username"
                />
                <Label 
                  htmlFor="rememberUsername" 
                  className="text-sm text-foreground cursor-pointer"
                >
                  Remember username
                </Label>
              </div>

              {/* Continue Button */}
              <Button
                type="submit"
                className="w-full telstra-gradient text-white py-2.5 px-4 rounded-md font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loginMutation.isPending}
                data-testid="button-continue"
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Continue"
                )}
              </Button>

              {/* Recover Username Link */}
              <div className="text-center">
                <a
                  href="#"
                  className="text-sm text-primary hover:text-primary/80 underline transition-colors"
                  onClick={(e) => {
                    e.preventDefault();
                    toast({
                      title: "Username Recovery",
                      description: "Username recovery functionality would be implemented here",
                    });
                  }}
                  data-testid="link-recover-username"
                >
                  Recover username
                </a>
              </div>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">OR</span>
              </div>
            </div>

            {/* Create Account Link */}
            <div className="text-center">
              <a
                href="#"
                className="inline-flex items-center justify-center w-full py-2.5 px-4 border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors duration-200 font-medium"
                onClick={(e) => {
                  e.preventDefault();
                  toast({
                    title: "Create Account",
                    description: "Account creation functionality would be implemented here",
                  });
                }}
                data-testid="link-create-account"
              >
                Create a Telstra ID
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Footer Links */}
        <div className="mt-8 text-center space-y-2">
          <div className="flex justify-center space-x-6 text-sm text-muted-foreground">
            <a 
              href="#" 
              className="hover:text-foreground transition-colors"
              data-testid="link-privacy-policy"
            >
              Privacy Policy
            </a>
            <a 
              href="#" 
              className="hover:text-foreground transition-colors"
              data-testid="link-terms-service"
            >
              Terms of Service
            </a>
            <a 
              href="#" 
              className="hover:text-foreground transition-colors"
              data-testid="link-help"
            >
              Help
            </a>
          </div>
          <p className="text-xs text-muted-foreground" data-testid="text-copyright">
            © 2024 Telstra Corporation Limited. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
