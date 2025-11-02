import { Component, inject } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common'; // Necesario para pipes (como titlecase)
import { JornadaService } from '../services/jornada'; // Importa tu servicio
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule], // Añadir CommonModule
})
export class HomePage {
  // Inyección del servicio de datos
  // Esto permite acceder a jornadaService.monthlySummary() y jornadaService.getCurrentMonthName()
  public jornadaService = inject(JornadaService);

  constructor(private routerLink:Router) {
    // Aquí puedes añadir lógica de inicialización si fuera necesaria.
    // Como el servicio ya maneja la carga de datos, el constructor puede quedar vacío.
  }

goToCalendar() {
    this.routerLink.navigateByUrl('/calendar');
  }
}
