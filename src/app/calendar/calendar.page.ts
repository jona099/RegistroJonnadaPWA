import { Component, ViewChild, inject } from '@angular/core';
import { JornadaService } from '../services/jornada.service';
import { CommonModule, DatePipe } from '@angular/common'; // Importar CommonModule
import { FormsModule } from '@angular/forms'; // Importar FormsModule
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonGrid, IonRow, IonCol, IonModal, IonItem, IonToggle, IonList, 
  IonListHeader, IonInput 
} from '@ionic/angular/standalone'; // Importar componentes standalone

@Component({
  selector: 'app-calendar',
  templateUrl: 'calendar.page.html',
  styleUrls: ['calendar.page.scss'],
  standalone: true, // Marcar como standalone
  imports: [ // Añadir TODOS los componentes e imports necesarios
    CommonModule, 
    FormsModule,
    DatePipe,
    IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonModal, IonItem, IonToggle, IonList,
    IonListHeader, IonInput
  ]
})
export class CalendarPage {
  // ... (El resto de tu archivo .ts no cambia)
  @ViewChild('logInModal') logInModal: IonModal | undefined;
  
  public jornadaService = inject(JornadaService);
  
  // Señales para manejar el estado del modal
  public isModalOpen = signal(false);
  public logInModalData = signal<{ date: Date, worked: boolean, center: string } | null>(null);

  constructor() {}

  openModal(date: Date) {
    const log = this.jornadaService.workLogs().get(this.jornadaService.formatDateKey(date));
    
    this.logInModalData.set({
      date: date,
      worked: !!log,
      center: log?.center || this.jornadaService.frequentCenters[0]
    });
    this.isModalOpen.set(true);
  }

  closeModal() {
    this.isModalOpen.set(false);
  }

  onWorkedToggleChange(isWorked: boolean) {
    if (isWorked && this.logInModalData()) {
      const currentData = this.logInModalData();
      if (currentData && currentData.center === '') {
        currentData.center = this.jornadaService.frequentCenters[0];
        this.logInModalData.set(currentData);
      }
    }
  }

  async saveLog() {
    const data = this.logInModalData();
    if (!data) return;

    if (data.worked) {
      // Guardar o actualizar
      await this.jornadaService.saveWorkLog(data.date, data.center);
      console.log('Log guardado para el día:', this.jornadaService.formatDateKey(data.date));
    } else {
      // Si existe un log, pero el toggle está en "false", lo borramos
      if (this.jornadaService.isDayWorked(data.date)) {
        await this.jornadaService.deleteWorkLog(data.date);
        console.log('Log eliminado para el día:', this.jornadaService.formatDateKey(data.date));
      }
    }
    this.closeModal();
  }
}

