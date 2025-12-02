import { SessionService } from '../services/session.service';
import { UserService, User } from '../services/user.service';

/**
 * Utility functions for user avatar display
 */
export class UserAvatarUtil {
  /**
   * Get user initials from name
   */
  static getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }

  /**
   * Get avatar color for a user (with fallback)
   * Handles empty strings by treating them as null
   */
  static getAvatarColor(avatarColor?: string | null): string {
    // Normalize empty strings to null
    const normalizedColor = avatarColor && avatarColor.trim() !== '' 
      ? avatarColor 
      : null;
    return normalizedColor || '#0A1A3A'; // Default navy blue
  }

  /**
   * Generate a consistent color based on user ID (fallback when avatarColor is not available)
   */
  static generateColorFromId(userId: number): string {
    const colors = [
      '#0A1A3A', '#FFC107', '#2196F3', '#4CAF50', '#9C27B0',
      '#F44336', '#00BCD4', '#FF5722', '#673AB7', '#E91E63',
      '#009688', '#3F51B5', '#795548', '#607D8B', '#FF9800'
    ];
    return colors[userId % colors.length];
  }

  /**
   * Get avatar color for a user by name, checking session first for current user
   * This ensures the current user's avatar color is always from the session (source of truth)
   * Handles empty strings by treating them as null
   */
  static getUserAvatarColorByName(
    userName: string,
    sessionService: SessionService,
    userService: UserService
  ): string {
    // First check if this is the current logged-in user
    const sessionData = sessionService.getSessionData();
    if (sessionData && sessionData.name === userName) {
      // Use session data for current user (always up-to-date)
      // Normalize empty strings to null
      const sessionColor = sessionData.avatarColor && sessionData.avatarColor.trim() !== '' 
        ? sessionData.avatarColor 
        : null;
      if (sessionColor) {
        return this.getAvatarColor(sessionColor);
      }
      // Fallback to generated color from userId
      return this.generateColorFromId(sessionData.userId);
    }

    // For other users, look up from user service
    const user = userService.getUserByName(userName);
    if (user) {
      // Normalize empty strings to null
      const userColor = user.avatarColor && user.avatarColor.trim() !== '' 
        ? user.avatarColor 
        : null;
      if (userColor) {
        return this.getAvatarColor(userColor);
      }
      // If user found but no avatarColor, generate from userId
      return this.generateColorFromId(user.userId);
    }
    return this.generateColorFromId(0);
  }

  /**
   * Get avatar color for a user by ID, checking session first for current user
   * Handles empty strings by treating them as null
   */
  static getUserAvatarColorById(
    userId: number,
    sessionService: SessionService,
    userService: UserService
  ): string {
    // First check if this is the current logged-in user
    const sessionData = sessionService.getSessionData();
    if (sessionData && sessionData.userId === userId) {
      // Use session data for current user (always up-to-date)
      // Normalize empty strings to null
      const sessionColor = sessionData.avatarColor && sessionData.avatarColor.trim() !== '' 
        ? sessionData.avatarColor 
        : null;
      if (sessionColor) {
        return this.getAvatarColor(sessionColor);
      }
      // Fallback to generated color from userId
      return this.generateColorFromId(sessionData.userId);
    }

    // For other users, look up from user service
    const user = userService.getUserById(userId);
    if (user) {
      // Normalize empty strings to null
      const userColor = user.avatarColor && user.avatarColor.trim() !== '' 
        ? user.avatarColor 
        : null;
      if (userColor) {
        return this.getAvatarColor(userColor);
      }
      // If user found but no avatarColor, generate from userId
      return this.generateColorFromId(user.userId);
    }
    return this.generateColorFromId(userId);
  }
}


