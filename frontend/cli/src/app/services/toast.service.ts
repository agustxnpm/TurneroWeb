import { Injectable } from '@angular/core';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  private toasts: (ToastMessage & { id: number })[] = [];
  private nextId = 0;

  getToasts() {
    return this.toasts;
  }

  show(message: string, type: 'success' | 'error' | 'info' | 'warning' = 'info', duration: number = 3000) {
    const id = this.nextId++;
    const toast = { id, message, type, duration };
    
    this.toasts.push(toast);

    setTimeout(() => {
      this.remove(id);
    }, duration);

    return id;
  }

  success(message: string, duration: number = 3000) {
    return this.show(message, 'success', duration);
  }

  error(message: string, duration: number = 4000) {
    return this.show(message, 'error', duration);
  }

  info(message: string, duration: number = 3000) {
    return this.show(message, 'info', duration);
  }

  warning(message: string, duration: number = 3000) {
    return this.show(message, 'warning', duration);
  }

  remove(id: number) {
    this.toasts = this.toasts.filter(t => t.id !== id);
  }
}
