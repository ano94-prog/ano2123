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
import { Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  rememberUsername: z.boolean().default(false),
});

const passwordSchema = z.object({
  password: z.string().min(1, "Password is required"),
});

type UsernameFormData = z.infer<typeof usernameSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Login() {
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [usernameData, setUsernameData] = useState<UsernameFormData | null>(null);
  const { toast } = useToast();

  const usernameForm = useForm<UsernameFormData>({
    resolver: zodResolver(usernameSchema),
    defaultValues: {
      username: "",
      rememberUsername: false,
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: "",
    },
  });

  const checkUsernameMutation = useMutation({
    mutationFn: async (data: UsernameFormData) => {
      const response = await apiRequest("POST", "/api/auth/check-username", data);
      return response.json();
    },
    onSuccess: (result, variables) => {
      setUsernameData(variables);
      setStep('password');
    },
    onError: (error: Error) => {
      toast({
        title: "Username Check Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (passwordData: PasswordFormData) => {
      const fullLoginData = {
        ...usernameData!,
        ...passwordData,
      };
      const response = await apiRequest("POST", "/api/auth/login", fullLoginData);
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

  const onUsernameSubmit = (data: UsernameFormData) => {
    checkUsernameMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordFormData) => {
    loginMutation.mutate(data);
  };

  const goBackToUsername = () => {
    setStep('username');
    setUsernameData(null);
    passwordForm.reset();
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
            {step === 'username' ? (
              /* Step 1: Username Form */
              <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} className="space-y-4">
                {/* Username Field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-sm font-medium text-foreground">
                    Username
                  </Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="Enter your username"
                    {...usernameForm.register("username")}
                    className="w-full"
                    data-testid="input-username"
                  />
                  {usernameForm.formState.errors.username && (
                    <p 
                      className="text-destructive text-sm"
                      data-testid="text-username-error"
                    >
                      {usernameForm.formState.errors.username.message}
                    </p>
                  )}
                </div>

                {/* Remember Username Checkbox */}
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberUsername"
                    checked={usernameForm.watch("rememberUsername")}
                    onCheckedChange={(checked) => 
                      usernameForm.setValue("rememberUsername", checked as boolean)
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
                  disabled={checkUsernameMutation.isPending}
                  data-testid="button-continue"
                >
                  {checkUsernameMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Checking...
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
            ) : (
              /* Step 2: Password Form */
              <>
                {/* Back Button and Username Display */}
                <div className="flex items-center space-x-3 mb-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={goBackToUsername}
                    className="p-2 hover:bg-gray-100"
                    data-testid="button-back"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">Username</p>
                    <p className="font-medium text-foreground" data-testid="text-selected-username">
                      {usernameData?.username}
                    </p>
                  </div>
                </div>

                <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      {...passwordForm.register("password")}
                      className="w-full"
                      data-testid="input-password"
                      autoFocus
                    />
                    {passwordForm.formState.errors.password && (
                      <p 
                        className="text-destructive text-sm"
                        data-testid="text-password-error"
                      >
                        {passwordForm.formState.errors.password.message}
                      </p>
                    )}
                  </div>

                  {/* Sign In Button */}
                  <Button
                    type="submit"
                    className="w-full telstra-gradient text-white py-2.5 px-4 rounded-md font-medium hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={loginMutation.isPending}
                    data-testid="button-signin"
                  >
                    {loginMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>

                  {/* Forgot Password Link */}
                  <div className="text-center">
                    <a
                      href="#"
                      className="text-sm text-primary hover:text-primary/80 underline transition-colors"
                      onClick={(e) => {
                        e.preventDefault();
                        toast({
                          title: "Password Reset",
                          description: "Password reset functionality would be implemented here",
                        });
                      }}
                      data-testid="link-forgot-password"
                    >
                      Forgot password?
                    </a>
                  </div>
                </form>
              </>
            )}

            {/* Create Account Link - Only show on username step */}
            {step === 'username' && (
              <>
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
              </>
            )}
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
