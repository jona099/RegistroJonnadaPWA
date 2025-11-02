import { Component, inject, signal, ViewChild } from '@angular/core';
import { IonicModule } from '@ionic/angular';
import { CommonModule } from '@angular/common';
import { JornadaService, WorkLog } from '../services/jornada';
import { FormsModule } from '@angular/forms'; // Necesario para ngModel en el modal
import { Router } from '@angular/router';
import { 
  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon, 
  IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, 
  IonGrid, IonRow, IonCol, IonModal, IonItem, IonToggle, IonList, 
  IonListHeader, IonInput 
} from '@ionic/angular/standalone'; 
// Definición de la interfaz de datos del modal (LogTemporal)
interface LogTemporal {
  date: Date;
  worked: boolean;
  center: string;
}

@Component({
  selector: 'app-calendar',
  templateUrl: 'calendar.page.html',
  styleUrls: ['calendar.page.scss'],
  standalone: true,
  imports: [IonicModule, CommonModule, FormsModule,  IonHeader, IonToolbar, IonTitle, IonButtons, IonButton, IonIcon,
    IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent,
    IonGrid, IonRow, IonCol, IonModal, IonItem, IonToggle, IonList,
    IonListHeader, IonInput], // Importar FormsModule
})
export class CalendarPage {
  // Referencia al modal de Ionic en la plantilla
  @ViewChild('logInModal') logInModalRef!: IonModal;
  
  // Inyección del servicio de datos
  public jornadaService = inject(JornadaService);

  // Señal para controlar la visibilidad del modal
  isModalOpen = signal(false);

  // Señal para almacenar temporalmente los datos del log que se están editando
  logInModalData = signal<LogTemporal | null>(null);

  constructor(private routerLink :Router) {}

  /**
   * Abre el modal de registro y prepara los datos para el día seleccionado.
   * @param date La fecha del día seleccionado.
   */
  openModal(date: Date) {
    const dayKey = this.jornadaService.formatDateKey(date);
    const existingLog = this.jornadaService.workLogs().find(log => log.id === dayKey);
    
    let center = '';
    let worked = false;

    if (existingLog) {
      // Cargar datos existentes
      worked = true;
      center = existingLog.center;
    } else {
      // Establecer valores predeterminados para un nuevo log (por si se marca 'Trabajado')
      center = this.jornadaService.frequentCenters[0]; 
      worked = false;
    }

    // Almacenar el log temporal en la señal
    this.logInModalData.set({
      date: date,
      worked: worked,
      center: center
    });

    this.isModalOpen.set(true);
  }

  /**
   * Cierra el modal de registro.
   */
  closeModal() {
    this.isModalOpen.set(false);
    this.logInModalData.set(null); // Limpiar los datos temporales
  }

  /**
   * Lógica para ejecutar al cambiar el toggle "Trabajado".
   * Si se desmarca, preparamos la eliminación del log.
   * @param worked Indica si el día ha sido marcado como trabajado.
   */
  onWorkedToggleChange(worked: boolean) {
    const data = this.logInModalData();
    if (data && worked) {
      // Si se marca 'Trabajado', aseguramos que haya un centro seleccionado
      if (!data.center) {
        data.center = this.jornadaService.frequentCenters[0];
      }
    }
  }

  /**
   * Guarda o elimina el registro de jornada en Firebase.
   */
  async saveLog() {
    const data = this.logInModalData();
    if (!data) return;

    const dayKey = this.jornadaService.formatDateKey(data.date);

    if (data.worked) {
      // Caso 1: Guardar (o actualizar) el log
      if (!data.center) {
         console.error('El centro de trabajo es obligatorio si el día está marcado como trabajado.');
         // Aquí podrías usar un toast o alerta de Ionic en lugar de console.error
         return;
      }
      
      const logToSave: WorkLog = {
        id: dayKey,
        date: data.date.getTime(), // Guardar como timestamp
        center: data.center,
        isWeekendOrHoliday: this.jornadaService.isWeekendOrHoliday(data.date) // Propiedad calculada
      };

      await this.jornadaService.saveWorkLog(logToSave);
      console.log(`Log guardado para el día: ${dayKey}`);

    } else {
      // Caso 2: Eliminar el log (si el toggle "Trabajado" está desmarcado)
      const existingLog = this.jornadaService.workLogs().find(log => log.id === dayKey);
      if (existingLog) {
        await this.jornadaService.deleteWorkLog(dayKey);
        console.log(`Log eliminado para el día: ${dayKey}`);
      }
    }

    this.closeModal();
  }

  goToHome() {
    this.routerLink.navigateByUrl('/home');
  }
}
