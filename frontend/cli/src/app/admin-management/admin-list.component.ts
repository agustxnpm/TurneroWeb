import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AdminManagementService } from '../services/admin-management.service';
import { DataPackage } from '../data.package';

@Component({
  selector: 'app-admin-list',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './admin-list.component.html',
  styleUrls: ['./admin-list.component.css']
})
export class AdminListComponent {
  admins: any[] = [];
  isLoading = false;

  constructor(private adminService: AdminManagementService, private router: Router) {}

  ngOnInit(): void {
    this.loadAdmins();
  }

  loadAdmins(): void {
    this.isLoading = true;
    this.adminService.getAdmins().subscribe({
      next: (pkg: DataPackage) => {
        this.admins = pkg.data || [];
        this.isLoading = false;
      },
      error: (err) => {
        console.error('Error al cargar administradores', err);
        this.isLoading = false;
      }
    });
  }

  goToCreate(): void {
    this.router.navigate(['/admin/users/new']);
  }

  goToEdit(id: number): void {
    this.router.navigate(['/admin/users', id]);
  }
}
