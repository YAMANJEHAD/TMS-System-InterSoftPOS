import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, public router: Router) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      remember: [false]
    });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      return;
    }
    this.loading = true;
    this.error = null;
    const { email, password } = this.form.value;
    this.auth.login(email, password).subscribe({
      next: (response) => {
        console.log('Login response:', response);
        console.log('Session UserName after login:', sessionStorage.getItem('UserName'));
        this.loading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        console.error('Login error:', err);
        console.error('Login error details:', {
          status: err.status,
          statusText: err.statusText,
          message: err.message,
          url: err.url,
          error: err.error
        });
        this.loading = false;
        
        if (err.status === 404) {
          this.error = 'API endpoint not found (404). Please verify: 1) Backend server is running at https://localhost:49714, 2) The AuthController is registered, 3) The route matches /api/Auth/login';
        } else if (err.status === 401) {
          this.error = 'Wrong email or password';
        } else if (err.status === 0) {
          this.error = 'Unable to connect to server. Please check if the backend is running at https://localhost:49714';
        } else {
          const errorMsg = err.error?.message || err.message || err.statusText || 'Unknown error';
          this.error = `Login failed (Status: ${err.status}): ${errorMsg}`;
        }
      }
    });
  }
}
