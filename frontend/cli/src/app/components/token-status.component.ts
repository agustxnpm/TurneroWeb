import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../inicio-sesion/auth.service';
import { interval, Subscription } from 'rxjs';

@Component({
  selector: 'app-token-status',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './token-status.component.html',
  styleUrl: './token-status.component.css'
})
export class TokenStatusComponent implements OnInit, OnDestroy {
  tokenInfo: any = {
    hasToken: false,
    isExpired: true,
    expiresAt: null,
    timeLeft: 'N/A'
  };
  
  isExpiringSoon = false;
  isVisible = false;
  showDebugInfo = false;
  private subscription?: Subscription;

  constructor(private authService: AuthService) {}

  ngOnInit() {
    // Solo mostrar en desarrollo o si está configurado
    this.showDebugInfo = this.authService.isAuthenticated() && 
                        (window.location.hostname === 'localhost' || 
                         localStorage.getItem('show-token-debug') === 'true');

    if (this.showDebugInfo) {
      this.updateTokenInfo();
      // Actualizar cada 30 segundos
      this.subscription = interval(30000).subscribe(() => {
        this.updateTokenInfo();
      });
    }
  }

  ngOnDestroy() {
    this.subscription?.unsubscribe();
  }

  updateTokenInfo() {
    this.tokenInfo = this.authService.getTokenInfo();
    this.isExpiringSoon = this.authService.isTokenExpiringSoon();
  }

  toggleVisibility() {
    this.isVisible = !this.isVisible;
  }

  getStatusClass(): string {
    return this.tokenInfo.hasToken ? 'text-success' : 'text-danger';
  }

  getExpirationClass(): string {
    return this.tokenInfo.isExpired ? 'text-expired' : 'text-valid';
  }

  getTimeLeftClass(): string {
    if (this.tokenInfo.timeLeft === 'Expirado' || this.tokenInfo.timeLeft === 'No token') {
      return 'text-expired';
    }
    if (this.isExpiringSoon) {
      return 'text-warning-time';
    }
    return 'text-valid';
  }

  refreshToken() {
    // Forzar refresh del token
    this.authService.refreshAccessToken().subscribe({
      next: () => {
        this.updateTokenInfo();
        console.log('Token renovado manualmente');
      },
      error: (error) => {
        console.error('Error al renovar token manualmente:', error);
        this.updateTokenInfo();
      }
    });
  }

  clearSession() {
    this.authService.handleAuthError({ status: 401 }, 'Sesión limpiada manualmente por el usuario.');
  }
}