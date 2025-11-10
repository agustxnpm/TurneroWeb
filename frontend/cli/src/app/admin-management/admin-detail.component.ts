import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AdminManagementService } from '../services/admin-management.service';
import { DataPackage } from '../data.package';

@Component({
  selector: 'app-admin-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, ReactiveFormsModule],
  templateUrl: './admin-detail.component.html',
  styleUrls: ['./admin-detail.component.css']
})
export class AdminDetailComponent {
  form: any;

  isSubmitting = false;

  constructor(
    private fb: FormBuilder,
    private adminService: AdminManagementService,
    public router: Router,
    public route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      apellido: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      dni: ['', Validators.required],
      telefono: ['']
    });
    const id = this.route.snapshot.params['id'];
    if (id) {
      // Para edición futura: cargar datos
      this.adminService.getAdmin(+id).subscribe({
        next: (pkg: DataPackage) => {
          const data: any = pkg.data;
          this.form.patchValue({
            nombre: data.nombre,
            apellido: data.apellido,
            email: data.email,
            dni: data.dni,
            telefono: data.telefono
          });
        }
      });
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.isSubmitting = true;
    const payload = this.form.value;
    this.adminService.createAdmin(payload).subscribe({
      next: (pkg: DataPackage) => {
        this.isSubmitting = false;
        this.router.navigate(['/admin/users']);
      },
      error: (err) => {
        console.error('Error creando admin', err);
        this.isSubmitting = false;
      }
    });
  }
}
