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
      rememberUsername: insertUser.rememberUsername ?? false,
      lastLogin: null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async validateLogin(loginData: LoginData): Promise<{ success: boolean; user?: User; message: string }> {
    // For this demo, we'll accept any username/password combination
    // Create a new user if they don't exist
    let user = await this.getUserByUsername(loginData.username);
    
    if (!user) {
      // Create new user on the fly
      user = await this.createUser({
        username: loginData.username,
        password: loginData.password,
        rememberUsername: loginData.rememberUsername,
      });
    } else {
      // Update existing user preferences
      user.rememberUsername = loginData.rememberUsername;
      user.lastLogin = new Date();
      this.users.set(user.id, user);
    }

    return {
      success: true,
      user,
      message: "Login successful",
    };
  }

  async logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
    const id = randomUUID();
    const loginAttempt: LoginAttempt = {
      ...attempt,
      id,
      ipAddress: attempt.ipAddress ?? null,
      userAgent: attempt.userAgent ?? null,
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
