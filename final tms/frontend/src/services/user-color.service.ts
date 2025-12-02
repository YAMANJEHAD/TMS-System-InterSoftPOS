import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * Service for managing user avatar colors
 * Stores colors from API and provides reactive updates
 */
@Injectable({
  providedIn: 'root'
})
export class UserColorService {
  private colorsMap = new Map<number, string>();
  private colorsSubject = new BehaviorSubject<Map<number, string>>(new Map());

  /**
   * Observable for color changes
   */
  public colors$: Observable<Map<number, string>> = this.colorsSubject.asObservable();

  /**
   * Set colors for all users from API data
   * Prioritizes avatarColor from API, falls back to generated color
   * Handles empty strings by treating them as null
   */
  setUsers(users: Array<{ userId: number; avatarColor: string | null }>): void {
    users.forEach(user => {
      // Normalize empty strings to null, then use default color if null/empty
      const normalizedColor = user.avatarColor && user.avatarColor.trim() !== '' 
        ? user.avatarColor 
        : null;
      const color = normalizedColor || this.getDefaultColor(user.userId);
      this.colorsMap.set(user.userId, color);
    });
    this.colorsSubject.next(new Map(this.colorsMap));
  }

  /**
   * Get color for a specific user
   * Returns the color from map or generates a default if not found
   */
  getColor(userId: number): string {
    return this.colorsMap.get(userId) || this.getDefaultColor(userId);
  }

  /**
   * Get color as Observable for reactive updates
   */
  getColor$(userId: number): Observable<string> {
    return this.colors$.pipe(
      map(colors => colors.get(userId) || this.getDefaultColor(userId))
    );
  }

  /**
   * Update color for a specific user
   * This is called when a user updates their avatar color
   * Handles empty strings by treating them as null
   */
  updateUserColor(userId: number, avatarColor: string | null): void {
    // Normalize empty strings to null, then use default color if null/empty
    const normalizedColor = avatarColor && avatarColor.trim() !== '' 
      ? avatarColor 
      : null;
    const color = normalizedColor || this.getDefaultColor(userId);
    this.colorsMap.set(userId, color);
    this.colorsSubject.next(new Map(this.colorsMap));
  }

  /**
   * Generate a consistent default color based on user ID
   * Same userId will always generate the same color
   */
  private getDefaultColor(userId: number): string {
    const colors = [
      '#0A1A3A', '#FFC107', '#2196F3', '#4CAF50', '#9C27B0',
      '#F44336', '#00BCD4', '#FF5722', '#673AB7', '#E91E63',
      '#009688', '#3F51B5', '#795548', '#607D8B', '#FF9800'
    ];
    return colors[userId % colors.length];
  }

  /**
   * Clear all colors (useful on logout)
   */
  clear(): void {
    this.colorsMap.clear();
    this.colorsSubject.next(new Map());
  }
}
