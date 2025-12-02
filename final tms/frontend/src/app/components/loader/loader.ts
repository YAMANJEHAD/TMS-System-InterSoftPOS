import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loader',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loader.html',
  styleUrl: './loader.scss'
})
export class LoaderComponent {
  @Input() isLoading: boolean = false;
  @Input() message: string = 'Loading...';
  @Input() overlay: boolean = true; // Show overlay background
  @Input() size: 'small' | 'medium' | 'large' = 'medium';
}

