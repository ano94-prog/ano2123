import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { z } from "zod";
import { storage } from "./storage";
import { loginSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication routes
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      // Validate request body
      const loginData = loginSchema.parse(req.body);

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

  const httpServer = createServer(app);
  return httpServer;
}
