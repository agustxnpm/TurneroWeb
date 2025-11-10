import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DataPackage } from '../data.package';

@Injectable({
  providedIn: 'root'
})
export class AdminManagementService {
  private baseUrl = 'rest/admins';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    });
    return { headers };
  }

  getAdmins(): Observable<DataPackage> {
    return this.http.get<DataPackage>(this.baseUrl, this.getAuthHeaders());
  }

  createAdmin(payload: any): Observable<DataPackage> {
    return this.http.post<DataPackage>(this.baseUrl, payload, this.getAuthHeaders());
  }

  getAdmin(id: number): Observable<DataPackage> {
    return this.http.get<DataPackage>(`${this.baseUrl}/${id}`, this.getAuthHeaders());
  }

  updateAdmin(id: number, payload: any): Observable<DataPackage> {
    return this.http.put<DataPackage>(`${this.baseUrl}/${id}`, payload, this.getAuthHeaders());
  }

  disableAdmin(id: number): Observable<DataPackage> {
    return this.http.delete<DataPackage>(`${this.baseUrl}/${id}`, this.getAuthHeaders());
  }
}
