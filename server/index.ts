import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

// Function to check if IP is in CIDR range
function isIPInCIDR(ip: string, cidr: string): boolean {
  const [range, bitsStr] = cidr.split('/');
  const bits = parseInt(bitsStr || '32', 10);
  const mask = ~(2 ** (32 - bits) - 1);
  return (ip2int(ip) & mask) === (ip2int(range) & mask);
}

function ip2int(ip: string): number {
  return ip.split('.').reduce((int, oct) => (int << 8) + parseInt(oct, 10), 0) >>> 0;
}

// Amazon and Microsoft cloud IP ranges (major CIDR blocks)
const blockedCIDRs = [
  // Amazon AWS - Major US regions
  '18.204.0.0/14',
  '18.208.0.0/13', 
  '18.232.0.0/14',
  '23.20.0.0/14',
  '34.192.0.0/12',
  '34.224.0.0/12',
  '50.16.0.0/15',
  '52.0.0.0/11',
  '54.0.0.0/8',
  '3.0.0.0/8',
  
  // Microsoft Azure - Major ranges
  '13.64.0.0/11',
  '13.96.0.0/13',
  '13.104.0.0/14',
  '20.0.0.0/8',
  '40.64.0.0/10',
  '52.96.0.0/12',
  '104.40.0.0/13',
  '137.116.0.0/14',
  '138.91.0.0/16',
  '157.55.0.0/16',
  '168.61.0.0/16',
  '191.232.0.0/13'
];

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Bot blocking middleware - block known bad bots and scanners
app.use((req, res, next) => {
  const userAgent = req.headers['user-agent'] || '';
  const blockedAgents = /AhrefsBot|SemrushBot|MJ12bot|HTTrack|nmap|sqlmap|curl|wget|scrapy|python-requests|nikto|dirb|dirbuster|gobuster|masscan|zmap|shodan|censys|nuclei|httpx|subfinder|ffuf|wfuzz|burpsuite|acunetix|nessus|openvas|metasploit|w3af|skipfish|arachni|uniscan|vega|zgrab|binaryedge|bot|crawler|spider|scraper|harvester|extractor|copier|offline|download/i;
  
  // Check User-Agent blocking first (fast check)
  if (blockedAgents.test(userAgent)) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  
  next();
});

// IP blocking middleware - block Amazon and Microsoft cloud IPs
app.use((req, res, next) => {
  // Get real IP address (handles proxies and load balancers)
  const rawIP = (req.headers['x-forwarded-for'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    '';
  
  // Extract first IP from comma-separated list
  const clientIP = rawIP.split(',')[0].trim();
  
  // Skip local/private IPs
  if (clientIP.startsWith('127.') || clientIP.startsWith('192.168.') || 
      clientIP.startsWith('10.') || clientIP.match(/^172\.(1[6-9]|2[0-9]|3[01])\./)) {
    return next();
  }
  
  // Check if IP is in blocked CIDR ranges
  for (const cidr of blockedCIDRs) {
    try {
      if (isIPInCIDR(clientIP, cidr)) {
        return res.status(403).json({ message: 'Forbidden' });
      }
    } catch (error) {
      // Skip invalid IP format
      continue;
    }
  }
  
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
