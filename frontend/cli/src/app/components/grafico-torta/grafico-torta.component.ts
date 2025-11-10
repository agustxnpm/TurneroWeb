import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';

@Component({
  selector: 'app-grafico-torta',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './grafico-torta.component.html',
  styleUrls: ['./grafico-torta.component.css']
})
export class GraficoTortaComponent {
  @Input() labels: string[] = [];
  @Input() data: number[] = [];
  @Input() title: string = '';
  @Input() icon: string = '';

  public get chartData() {
    return {
      labels: this.labels,
      datasets: [{ data: this.data }]
    };
  }

  public hasData(): boolean {
    return this.data && this.data.length > 0 && this.data.some(value => value > 0);
  }
}
