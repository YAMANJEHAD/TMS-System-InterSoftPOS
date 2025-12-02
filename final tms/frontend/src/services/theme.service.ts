import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { HttpService } from './http.service';
import { SessionService } from './session.service';
import { API_CONFIG } from '../config/api.config';

export type ThemeMode = 'light' | 'dark' | 'system';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private currentThemeSubject: BehaviorSubject<ThemeMode>;
  public currentTheme$: Observable<ThemeMode>;
  
  private effectiveThemeSubject: BehaviorSubject<'light' | 'dark'>;
  public effectiveTheme$: Observable<'light' | 'dark'>;

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService
  ) {
    // Check if user is logged in and has theme in session (priority source)
    const sessionData = this.sessionService.getSessionData();
    let initialTheme: ThemeMode = 'system';
    
    if (sessionData && sessionData.theme) {
      // User is logged in and has theme in session - use it (highest priority)
      const sessionTheme = sessionData.theme.trim();
      if (sessionTheme === 'light' || sessionTheme === 'dark' || sessionTheme === 'system') {
        initialTheme = sessionTheme as ThemeMode;
      }
    } else {
      // Fallback to localStorage if no session theme
      const storedTheme = localStorage.getItem('theme') as ThemeMode;
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')) {
        initialTheme = storedTheme;
      }
    }
    
    this.currentThemeSubject = new BehaviorSubject<ThemeMode>(initialTheme);
    this.currentTheme$ = this.currentThemeSubject.asObservable();
    
    // Calculate effective theme (light or dark)
    const effectiveTheme = this.calculateEffectiveTheme(initialTheme);
    this.effectiveThemeSubject = new BehaviorSubject<'light' | 'dark'>(effectiveTheme);
    this.effectiveTheme$ = this.effectiveThemeSubject.asObservable();
    
    // Listen to system preference changes (only if theme is 'system')
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', () => {
        if (this.currentThemeSubject.value === 'system') {
          this.updateEffectiveTheme();
        }
      });
    }
    
    // Apply initial theme
    this.applyTheme(initialTheme);
  }

  /**
   * Get the current theme mode (light, dark, or system)
   */
  getCurrentTheme(): ThemeMode {
    return this.currentThemeSubject.value;
  }

  /**
   * Get the effective theme (light or dark) that is actually applied
   */
  getEffectiveTheme(): 'light' | 'dark' {
    return this.effectiveThemeSubject.value;
  }

  /**
   * Calculate the effective theme based on mode and system preference
   * If theme is explicitly 'light' or 'dark', return it directly (ignore system)
   * Only use system preference when theme is 'system'
   */
  private calculateEffectiveTheme(theme: ThemeMode): 'light' | 'dark' {
    // If user explicitly chose 'light' or 'dark', use it directly
    if (theme === 'light' || theme === 'dark') {
      return theme;
    }
    
    // Only use system preference when theme is 'system'
    if (theme === 'system') {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
      return 'light';
    }
    
    // Default to light if unknown
    return 'light';
  }

  /**
   * Update the effective theme when system preference changes
   */
  private updateEffectiveTheme(): void {
    const effectiveTheme = this.calculateEffectiveTheme(this.currentThemeSubject.value);
    this.effectiveThemeSubject.next(effectiveTheme);
    this.applyThemeToDocument(effectiveTheme);
  }

  /**
   * Set theme and save to API and localStorage
   * When theme is 'light' or 'dark', it explicitly applies that theme
   * and does NOT follow system preference
   */
  setTheme(theme: ThemeMode, saveToApi: boolean = true): void {
    this.currentThemeSubject.next(theme);
    localStorage.setItem('theme', theme);
    
    // Calculate effective theme
    const effectiveTheme = this.calculateEffectiveTheme(theme);
    this.effectiveThemeSubject.next(effectiveTheme);
    
    // Explicitly apply the effective theme to document
    // This ensures 'light' stays light and 'dark' stays dark
    this.applyThemeToDocument(effectiveTheme);
    
    // Save to API if user is logged in
    if (saveToApi && this.sessionService.isLoggedIn()) {
      this.saveThemeToApi(theme);
    }
  }

  /**
   * Apply theme to document
   */
  private applyTheme(theme: ThemeMode): void {
    const effectiveTheme = this.calculateEffectiveTheme(theme);
    this.applyThemeToDocument(effectiveTheme);
  }

  /**
   * Apply theme class to document body
   */
  private applyThemeToDocument(theme: 'light' | 'dark'): void {
    const htmlElement = document.documentElement;
    const bodyElement = document.body;
    
    // Remove existing theme classes
    htmlElement.classList.remove('theme-light', 'theme-dark');
    bodyElement.classList.remove('theme-light', 'theme-dark');
    
    // Add new theme class
    htmlElement.classList.add(`theme-${theme}`);
    bodyElement.classList.add(`theme-${theme}`);
    
    // Set data attribute for CSS selectors
    htmlElement.setAttribute('data-theme', theme);
  }

  /**
   * Save theme preference to API
   */
  private saveThemeToApi(theme: ThemeMode): void {
    const sessionData = this.sessionService.getSessionData();
    if (!sessionData) return;

    const payload = {
      name: sessionData.name || '',
      phone: sessionData.phone || '',
      avatar_color: sessionData.avatarColor || '',
      theme: theme
    };

    this.httpService.put(API_CONFIG.ENDPOINTS.USERS.UPDATE_BY_USER, payload).subscribe({
      next: () => {
        // Update session data
        const updatedData = {
          ...sessionData,
          theme: theme
        };
        this.sessionService.setSessionData(updatedData);
      },
      error: (error) => {
        console.error('Error saving theme to API:', error);
        // Don't show error to user, theme is still saved locally
      }
    });
  }

  /**
   * Load theme from API (called after login)
   * This takes absolute priority and overrides any system preference
   */
  loadThemeFromApi(): void {
    const sessionData = this.sessionService.getSessionData();
    if (sessionData && sessionData.theme) {
      const theme = sessionData.theme.trim();
      if (theme === 'light' || theme === 'dark' || theme === 'system') {
        // Force apply the theme from API, ignoring system preference
        // This ensures user's explicit choice is always respected
        this.setTheme(theme as ThemeMode, false); // Don't save back to API, just apply
        
        // If theme is 'light' or 'dark', explicitly apply it (don't let system override)
        if (theme === 'light' || theme === 'dark') {
          // Force apply the explicit theme
          this.applyThemeToDocument(theme as 'light' | 'dark');
        }
      }
    } else {
      // If no theme in session, check localStorage as fallback
      const storedTheme = localStorage.getItem('theme') as ThemeMode;
      if (storedTheme && (storedTheme === 'light' || storedTheme === 'dark' || storedTheme === 'system')) {
        this.setTheme(storedTheme, false);
      }
    }
  }

  /**
   * Toggle between light and dark (ignores system mode)
   */
  toggleTheme(): void {
    const current = this.getEffectiveTheme();
    this.setTheme(current === 'light' ? 'dark' : 'light');
  }
}

