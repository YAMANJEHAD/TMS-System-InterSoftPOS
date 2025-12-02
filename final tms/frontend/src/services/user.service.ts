import { Injectable } from '@angular/core';
import { HttpService } from './http.service';
import { API_CONFIG } from '../config/api.config';
import { UserColorService } from './user-color.service';
import { SessionService } from './session.service';

export interface User {
  userId: number;
  name: string;
  email: string;
  roleName: string;
  departmentName: string | null;
  isActive: boolean;
  avatarColor: string | null;
  theme: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private usersMap = new Map<number, User>();
  private usersByNameMap = new Map<string, User>();
  private isLoading = false;
  private loadPromise: Promise<void> | null = null;

  constructor(
    private httpService: HttpService,
    private userColorService: UserColorService,
    private sessionService: SessionService
  ) {}

  /**
   * Load all users from API and cache them
   * This ensures avatar colors are available throughout the app
   */
  async loadAllUsers(): Promise<void> {
    // If already loading, return the existing promise
    if (this.isLoading && this.loadPromise) {
      return this.loadPromise;
    }

    // If already loaded and not stale, return immediately
    if (this.usersMap.size > 0 && !this.isLoading) {
      return Promise.resolve();
    }

    this.isLoading = true;
    this.loadPromise = new Promise((resolve, reject) => {
      // Use /api/Users endpoint to get all users with full details
      this.httpService.get<User[]>(API_CONFIG.ENDPOINTS.USERS.GET_ALL).subscribe({
        next: (users) => {
          this.usersMap.clear();
          this.usersByNameMap.clear();
          
          users.forEach(user => {
            // Normalize empty strings to null for avatarColor
            const normalizedUser: User = {
              ...user,
              avatarColor: user.avatarColor && user.avatarColor.trim() !== '' 
                ? user.avatarColor 
                : null
            };
            this.usersMap.set(normalizedUser.userId, normalizedUser);
            this.usersByNameMap.set(normalizedUser.name, normalizedUser);
          });
      
          // Update user color service with avatar colors from API
          // Normalize empty strings to null
      this.userColorService.setUsers(
            users.map(user => ({
          userId: user.userId,
              avatarColor: user.avatarColor && user.avatarColor.trim() !== '' 
                ? user.avatarColor 
                : null
        }))
      );
      
          // Sync current user's session if avatarColor changed
          this.syncCurrentUserSession(users);
      
          this.isLoading = false;
          this.loadPromise = null;
          resolve();
        },
        error: (error) => {
      console.error('Error loading users:', error);
          this.isLoading = false;
          this.loadPromise = null;
          reject(error);
    }
      });
    });

    return this.loadPromise;
  }

  /**
   * Get user by ID
   */
  getUserById(userId: number): User | undefined {
    return this.usersMap.get(userId);
  }

  /**
   * Get user by name
   */
  getUserByName(name: string): User | undefined {
    return this.usersByNameMap.get(name);
  }

  /**
   * Refresh users from API (force reload)
   */
  async refreshUsers(): Promise<void> {
    this.usersMap.clear();
    this.usersByNameMap.clear();
    return this.loadAllUsers();
  }

  /**
   * Sync current user's session data with loaded users
   * This ensures the session always has the latest avatarColor from the API
   * Handles empty strings by treating them as null
   */
  private syncCurrentUserSession(users: User[]): void {
    const sessionData = this.sessionService.getSessionData();
    if (!sessionData) {
      return;
    }

    const currentUser = users.find(u => u.userId === sessionData.userId);
    if (currentUser) {
      // Normalize empty strings to null/undefined
      const normalizedAvatarColor = currentUser.avatarColor && currentUser.avatarColor.trim() !== '' 
        ? currentUser.avatarColor 
        : undefined;
      const normalizedTheme = currentUser.theme && currentUser.theme.trim() !== '' 
        ? currentUser.theme 
        : undefined;
      
      const updatedSessionData = {
        ...sessionData,
        name: currentUser.name,
        email: currentUser.email,
        avatarColor: normalizedAvatarColor,
        theme: normalizedTheme
      };
      this.sessionService.setSessionData(updatedSessionData);
    }
  }

  /**
   * Get avatar color for a user
   * Checks session first for current user, then falls back to user data
   * Handles empty strings by treating them as null
   */
  getAvatarColor(userId: number): string | null {
    const sessionData = this.sessionService.getSessionData();
    if (sessionData && sessionData.userId === userId) {
      const color = sessionData.avatarColor;
      return color && color.trim() !== '' ? color : null;
    }
    const user = this.getUserById(userId);
    const userColor = user?.avatarColor;
    return userColor && userColor.trim() !== '' ? userColor : null;
  }

  /**
   * Get avatar color by user name
   * Handles empty strings by treating them as null
   */
  getAvatarColorByName(name: string): string | null {
    const sessionData = this.sessionService.getSessionData();
    if (sessionData && sessionData.name === name) {
      const color = sessionData.avatarColor;
      return color && color.trim() !== '' ? color : null;
    }
    const user = this.getUserByName(name);
    const userColor = user?.avatarColor;
    return userColor && userColor.trim() !== '' ? userColor : null;
  }
}
