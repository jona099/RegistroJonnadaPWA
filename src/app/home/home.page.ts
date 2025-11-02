import { Component, inject } from '@angular/core';
import { JornadaService } from '../services/jornada.service';
import { CommonModule, TitleCasePipe } from '@angular/common'; // Importar CommonModule
import { RouterLink } from '@angular/router'; // Importar RouterLink
import { 
  IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader, 
  IonCardTitle, IonCardContent, IonItem, IonIcon, IonLabel, 
  IonButton 
} from '@ionic/angular/standalone'; // Importar componentes standalone

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true, // Marcar como standalone
  imports: [ // Añadir TODOS los componentes e imports necesarios
    CommonModule, 
    RouterLink,
    TitleCasePipe,
    IonHeader, IonToolbar, IonTitle, IonContent, IonCard, IonCardHeader,
    IonCardTitle, IonCardContent, IonItem, IonIcon, IonLabel,
    IonButton
  ]
})
export class HomePage {
  
  public jornadaService = inject(JornadaService);

  constructor() {
    // El servicio se inyecta y está listo para usarse en el HTML.
  }

  // Nota: El botón de navegación usa routerLink, 
  // por lo que no necesitas la función goToCalendar() aquí.
}

