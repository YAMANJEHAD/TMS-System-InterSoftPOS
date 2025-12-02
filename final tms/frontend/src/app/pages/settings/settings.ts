import { Component, OnInit, ChangeDetectorRef, OnDestroy, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpService } from '../../../services/http.service';
import { SessionService } from '../../../services/session.service';
import { UserService } from '../../../services/user.service';
import { UserColorService } from '../../../services/user-color.service';
import { ToastService } from '../../../services/toast.service';
import { ThemeService, ThemeMode } from '../../../services/theme.service';
import { API_CONFIG } from '../../../config/api.config';
import { LoaderComponent } from '../../components/loader/loader';
import { BreadcrumbComponent } from '../../components/breadcrumb/breadcrumb';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, LoaderComponent, BreadcrumbComponent],
  templateUrl: './settings.html',
  styleUrl: './settings.scss'
})
export class SettingsComponent implements OnInit, OnDestroy {
  sessionData: any = null;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  // Profile form
  profileForm = {
    name: '',
    phone: '',
    avatar_color: '',
    theme: 'system' as ThemeMode
  };
  
  // Password form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  showPasswordForm = false;
  showNewPassword = false;
  showConfirmPassword = false;
  
  private themeSubscription?: Subscription;

  constructor(
    private httpService: HttpService,
    private sessionService: SessionService,
    private userService: UserService,
    private userColorService: UserColorService,
    private toastService: ToastService,
    private themeService: ThemeService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    const sessionData = this.sessionService.getSessionData();
    if (!sessionData) {
      this.router.navigate(['/login']);
      return;
    }
    
    this.sessionData = sessionData;
    this.profileForm.name = sessionData.name;
    this.profileForm.phone = sessionData.phone ? String(sessionData.phone) : '';
    this.profileForm.avatar_color = sessionData.avatarColor || '';
    
    // Get current theme from theme service
    const currentTheme = this.themeService.getCurrentTheme();
    this.profileForm.theme = currentTheme || 'system';
    
    // Subscribe to theme changes
    this.themeSubscription = this.themeService.currentTheme$.subscribe(theme => {
      this.profileForm.theme = theme;
      this.cdr.detectChanges();
    });
  }
  
  ngOnDestroy(): void {
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
  }

  updateProfile(): void {
    if (!this.profileForm.name) {
      this.errorMessage = 'Name is required';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    const payload = {
      name: this.profileForm.name,
      phone: this.profileForm.phone ?? '',
      avatar_color: this.profileForm.avatar_color ?? '',
      theme: this.profileForm.theme ?? 'system'
    };

    // Update theme immediately using theme service
    if (this.profileForm.theme === 'light' || this.profileForm.theme === 'dark' || this.profileForm.theme === 'system') {
      this.themeService.setTheme(this.profileForm.theme, false); // Don't save to API yet, we'll do it in the HTTP call
    }

    // UpdateUserByUser uses PUT /api/Users (without id)
    this.httpService.put(API_CONFIG.ENDPOINTS.USERS.UPDATE_BY_USER, payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
        this.isLoading = false;
        this.successMessage = 'Profile updated successfully';
        this.toastService.success('Profile updated successfully');
        // Update session data - map avatar_color to avatarColor (camelCase)
        const updatedData = {
          ...this.sessionData,
          name: this.profileForm.name,
          phone: this.profileForm.phone,
          avatarColor: this.profileForm.avatar_color, // Map snake_case to camelCase
          theme: this.profileForm.theme
        };
        this.sessionService.setSessionData(updatedData);
        this.sessionData = updatedData; // Update local reference
        
        // Update user color service immediately so all components see the change
        const sessionData = this.sessionService.getSessionData();
        if (sessionData) {
          this.userColorService.updateUserColor(sessionData.userId, this.profileForm.avatar_color);
        }
        
        // Refresh user service cache so other components see the updated avatar color
        // (Note: Current user's avatar will always use session data, but this ensures consistency)
        this.userService.refreshUsers().catch(err => {
          console.warn('Failed to refresh user cache:', err);
        });
        
        // Update theme service (it will save to API)
        if (this.profileForm.theme === 'light' || this.profileForm.theme === 'dark' || this.profileForm.theme === 'system') {
          this.themeService.setTheme(this.profileForm.theme, true);
        }
        
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMessage = '';
            this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 3000);
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.isLoading = false;
        this.errorMessage = 'Failed to update profile. Please try again.';
        this.toastService.error('Failed to update profile. Please try again.');
        console.error('Error updating profile:', error);
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }
  
  onThemeChange(): void {
    // Update theme immediately when user changes it in the dropdown
    if (this.profileForm.theme === 'light' || this.profileForm.theme === 'dark' || this.profileForm.theme === 'system') {
      this.themeService.setTheme(this.profileForm.theme, true);
    }
  }

  resetPassword(): void {
    if (!this.passwordForm.newPassword || !this.passwordForm.confirmPassword) {
      this.errorMessage = 'Please fill in all password fields';
      return;
    }

    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.errorMessage = 'New passwords do not match';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.successMessage = '';

    // Send password as an object with camelCase (ASP.NET Core default JSON serialization uses camelCase)
    const payload = {
      password: this.passwordForm.newPassword,
      confirmPassword: this.passwordForm.confirmPassword
    };
    console.log('Sending reset password request:', payload);
    console.log('Endpoint:', API_CONFIG.ENDPOINTS.USERS.RESET_PASSWORD);
    
    this.httpService.patch(API_CONFIG.ENDPOINTS.USERS.RESET_PASSWORD, payload).subscribe({
      next: () => {
        this.ngZone.run(() => {
        this.isLoading = false;
        this.successMessage = 'Password reset successfully';
        this.toastService.success('Password reset successfully');
        this.passwordForm = {
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        };
        this.showPasswordForm = false;
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        setTimeout(() => {
          this.successMessage = '';
            this.cdr.markForCheck();
          this.cdr.detectChanges();
        }, 3000);
        });
      },
      error: (error) => {
        this.ngZone.run(() => {
        this.isLoading = false;
        console.error('Error resetting password:', error);
        console.error('Error details:', error.error);
        console.error('Error status:', error.status);
        console.error('Error message:', error.message);
        console.error('Full error object:', JSON.stringify(error, null, 2));
        // Try to extract the actual error message from the response
        const errorMsg = error.error?.message || 
                        (typeof error.error === 'string' ? error.error : null) ||
                        error.message || 
                        'Failed to reset password. Please try again.';
        this.errorMessage = errorMsg;
        this.toastService.error(errorMsg);
          this.cdr.markForCheck();
        this.cdr.detectChanges();
        });
      }
    });
  }

  toggleNewPasswordVisibility(): void {
    this.showNewPassword = !this.showNewPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}

