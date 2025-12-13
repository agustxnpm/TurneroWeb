import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="toast-container">
      <div 
        *ngFor="let toast of toastService.getToasts()" 
        class="toast toast-{{toast.type}}">
        <span class="toast-icon">
          <span class="material-symbols-outlined">
            {{ getIcon(toast.type) }}
          </span>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      top: 0;
      left: 50%;
      transform: translateX(-50%);
      z-index: 9999;
      display: flex;
      flex-direction: column;
      gap: 12px;
      pointer-events: none;
      padding-top: 20px;
    }

    .toast {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      padding: 18px 32px;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
      min-width: 400px;
      pointer-events: auto;
      animation: slideDown 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-size: 16px;
      font-weight: 600;
    }

    @keyframes slideDown {
      from {
        transform: translateY(-100px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .toast-success {
      background: rgba(40, 167, 69, 0.92);
      color: white;
    }

    .toast-error {
      background: rgba(220, 53, 69, 0.92);
      color: white;
    }

    .toast-info {
      background: rgba(23, 162, 184, 0.92);
      color: white;
    }

    .toast-warning {
      background: rgba(255, 193, 7, 0.92);
      color: white;
    }

    .toast-icon {
      flex-shrink: 0;
      display: flex;
      align-items: center;
    }

    .toast-icon .material-symbols-outlined {
      color: white;
      font-size: 28px;
      font-weight: 600;
    }

    .toast-message {
      flex: 1;
      text-align: center;
      color: white;
      font-size: 16px;
      font-weight: 600;
      letter-spacing: 0.3px;
    }

    @media (max-width: 768px) {
      .toast-container {
        left: 10px;
        right: 10px;
        transform: none;
        padding-top: 10px;
      }

      .toast {
        min-width: auto;
        width: 100%;
        padding: 16px 24px;
        font-size: 15px;
      }

      .toast-icon .material-symbols-outlined {
        font-size: 24px;
      }

      .toast-message {
        font-size: 15px;
      }
    }
  `]
})
export class ToastComponent {
  constructor(public toastService: ToastService) {}

  getIcon(type: string): string {
    switch (type) {
      case 'success': return 'check_circle';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  }
}
