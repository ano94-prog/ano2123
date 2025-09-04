import { type User, type InsertUser, type LoginData, type InsertLoginAttempt, type LoginAttempt } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateLogin(loginData: LoginData): Promise<{ success: boolean; user?: User; message: string }>;
  logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt>;
  updateUserRememberPreference(username: string, remember: boolean): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private loginAttempts: Map<string, LoginAttempt>;

  constructor() {
    this.users = new Map();
    this.loginAttempts = new Map();
    
    // Create a demo user for testing
    const demoUser: User = {
      id: randomUUID(),
      username: "demo@telstra.com",
      password: "password123", // In real app, this would be hashed
      rememberUsername: false,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(demoUser.id, demoUser);
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async validateLogin(loginData: LoginData): Promise<{ success: boolean; user?: User; message: string }> {
    const user = await this.getUserByUsername(loginData.username);
    
    if (!user) {
      return {
        success: false,
        message: "Username not found. Please check your username or create a new Telstra ID.",
      };
    }

    // In a real application, you would verify the password hash here
    // For this demo, we'll simulate a successful login for the demo user
    if (user.username === "demo@telstra.com") {
      // Update remember preference and last login
      user.rememberUsername = loginData.rememberUsername;
      user.lastLogin = new Date();
      this.users.set(user.id, user);

      return {
        success: true,
        user,
        message: "Login successful",
      };
    }

    return {
      success: false,
      message: "Invalid credentials. Please try again.",
    };
  }

  async logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
    const id = randomUUID();
    const loginAttempt: LoginAttempt = {
      ...attempt,
      id,
      timestamp: new Date(),
    };
    this.loginAttempts.set(id, loginAttempt);
    return loginAttempt;
  }

  async updateUserRememberPreference(username: string, remember: boolean): Promise<void> {
    const user = await this.getUserByUsername(username);
    if (user) {
      user.rememberUsername = remember;
      this.users.set(user.id, user);
    }
  }
}

export const storage = new MemStorage();
