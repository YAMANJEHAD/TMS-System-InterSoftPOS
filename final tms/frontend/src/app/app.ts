import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { SidebarComponent } from './components/layout/sidebar/sidebar';
import { HeaderComponent } from './components/layout/header/header';
import { ToastComponent } from './components/toast/toast';
import { SessionService } from '../services/session.service';
import { ThemeService } from '../services/theme.service';
import { UserService } from '../services/user.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, SidebarComponent, HeaderComponent, ToastComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit {
  constructor(
    private router: Router,
    private sessionService: SessionService,
    private themeService: ThemeService,
    private userService: UserService
  ) {}

  ngOnInit(): void {
    // Load theme from API if user is logged in (priority: session > localStorage > system)
    if (this.sessionService.isLoggedIn()) {
      // Force load theme from API/session immediately
      this.themeService.loadThemeFromApi();
      
      // Load all users from API to ensure avatar colors are available
      this.userService.loadAllUsers().catch(err => {
        console.warn('Failed to load users on app init:', err);
      });
    }
    
    // Also listen to navigation events to reload theme after login
    // This ensures theme is applied when user navigates from login to dashboard
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        if (this.sessionService.isLoggedIn()) {
          // Reload theme from API to ensure it's applied after login
          this.themeService.loadThemeFromApi();
        }
      });
    
    // Subscribe to session changes to apply theme immediately after login
    this.sessionService.sessionDataChanges$.subscribe(sessionData => {
      if (sessionData) {
        // User just logged in or session was updated - load theme immediately
        setTimeout(() => {
          this.themeService.loadThemeFromApi();
        }, 0);
      }
    });
  }

  isLoginPage(): boolean {
    return this.router.url === '/login';
  }

  isLoggedIn(): boolean {
    return this.sessionService.isLoggedIn();
  }
}
