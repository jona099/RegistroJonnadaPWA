import { Injectable, signal, computed, effect, inject, Injector } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import { 
  getFirestore, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  collection, 
  Firestore,
  setLogLevel
} from 'firebase/firestore';
import { environment } from '../../environments/environment.prod';

// --- Interfaz de Datos ---
// ... (sin cambios)
export interface WorkLog {
  id: string; // Clave 'YYYY-MM-DD'
  date: number; // Timestamp (para facilitar consultas si fuera necesario)
  center: string;
  isWeekendOrHoliday: boolean; // Se calcula al guardar
}

// --- Servicio de Jornada ---
// ... (sin cambios)
@Injectable({
  providedIn: 'root',
})
export class JornadaService {
  
  // --- Estado Principal (Señales) ---
  
  // ... (sin cambios)
  private db!: Firestore;
  private auth!: any;
  private appId = signal<string>('default-app-id');
  private userId = signal<string | null>(null);
  
  // ... (sin cambios)
  public workLogs = signal<WorkLog[]>([]);
  
  // ... (sin cambios)
  public currentMonth = signal<Date>(new Date());
  
  // ... (sin cambios)
  public frequentCenters = ['Urgencias General', 'Maternidad'];
  
  // ... (sin cambios)
  private nationalHolidays = signal<string[]>([
    '2025-01-01', // Año Nuevo
    '2025-01-06', // Epifanía del Señor
    '2025-04-18', // Viernes Santo
    '2025-05-01', // Fiesta del Trabajo
    '2025-08-15', // Asunción de la Virgen
    '2025-10-12', // Fiesta Nacional de España (Domingo)
    '2025-11-01', // Todos los Santos
    '2025-12-06', // Día de la Constitución
    '2025-12-08', // Inmaculada Concepción
    '2025-12-25', // Navidad
  ]);

  // --- NUEVO: Inyector ---
  // Necesitamos el Injector para que el effect funcione correctamente.
  private injector = inject(Injector);

  // --- Constructor e Inicialización ---
  constructor() {
    this.initializeFirebase();
    // --- CAMBIO: Llamamos al listener DESDE el constructor ---
    // El constructor SÍ es un contexto de inyección.
    // El 'effect' dentro del listener se ejecutará, verá que userId es null,
    // y esperará hasta que 'onAuthStateChanged' actualice la señal 'userId'.
    this.setupWorkLogListener();
  }

  /**
   * Inicializa Firebase, autentica al usuario y establece el listener de la base de datos.
   */
  private async initializeFirebase() {
    try {
      // 1. Cargar configuración de Firebase desde el entorno
      // ... (sin cambios)
      const firebaseConfig = environment.firebaseConfig;
      if (!firebaseConfig.projectId) {
        console.error('Error: projectId no está definido en environment.prod.ts');
        return;
      }
      
      const app = initializeApp(firebaseConfig);
      this.db = getFirestore(app);
      this.auth = getAuth(app);
      
      // ... (sin cambios)
      setLogLevel('debug');
      
      // ... (sin cambios)
      this.appId.set(firebaseConfig.projectId);

      // 2. Autenticar al usuario
      // ... (sin cambios)
      onAuthStateChanged(this.auth, (user) => {
        if (user) {
          // Usuario autenticado (con token o anónimo)
          this.userId.set(user.uid);
          console.log('Usuario autenticado:', user.uid);
          
          // --- CAMBIO: Eliminamos la llamada al listener de aquí ---
          // this.setupWorkLogListener(); // <- ESTO SE HA IDO AL CONSTRUCTOR
          
        } else {
          // No hay usuario, intentar autenticación anónima
          // ... (sin cambios)
          console.log('Sin usuario, intentando inicio anónimo...');
          signInAnonymously(this.auth).catch((error) => {
            console.error('Error en autenticación anónima:', error);
          });
        }
      });

    } catch (error) {
      console.error('Error inicializando Firebase:', error);
    }
  }

  /**
   * Configura el listener de Firestore (onSnapshot) para escuchar cambios
   * en los registros de trabajo del mes actual en tiempo real.
   */
  private setupWorkLogListener() {
    // --- CAMBIO: Pasamos el injector al effect ---
    // Esto asegura que el effect se registre correctamente con Angular,
    // incluso si la lógica interna se dispara por eventos de Firebase.
    effect(() => {
      const uid = this.userId();
      if (!uid) {
        console.log('Listener pausado: Usuario no autenticado.');
        this.workLogs.set([]); // Limpiar logs si el usuario se desloga
        return;
      }

      console.log(`Configurando listener de Firestore para el usuario: ${uid}`);

      // ... (lógica interna del effect sin cambios)
      const collectionPath = `/artifacts/${this.appId()}/users/${uid}/work_registry`;
      const logsCollection = collection(this.db, collectionPath);

      // (Nota: Para una app escalable, aquí se filtraría por mes (query/where). 
      // Por simplicidad del ejercicio, traemos todos y filtramos en cliente).
      
      const unsubscribe = onSnapshot(
        logsCollection,
        (snapshot) => {
          const logs: WorkLog[] = [];
          snapshot.forEach((doc) => {
            logs.push(doc.data() as WorkLog);
          });
          this.workLogs.set(logs);
          console.log(`Logs cargados/actualizados: ${logs.length} registros.`);
        },
        (error) => {
          console.error('Error en el listener de Firestore:', error);
        }
      );

      // El 'effect' de Angular gestiona la limpieza (unsubscribe) automáticamente
      // al destruirse el servicio o cuando el efecto se re-ejecuta.
    }, { injector: this.injector }); // <-- AÑADIDO EL INJECTOR
  }

  // --- Métodos de Persistencia (Firebase) ---

  /**
   * Guarda o actualiza un registro de trabajo en Firestore.
   * @param log El objeto WorkLog a guardar.
   */
  async saveWorkLog(log: WorkLog) {
    const uid = this.userId();
    if (!uid) {
      // Este 'if' ahora es más robusto porque el flujo de auth es correcto.
      console.error('No se puede guardar: Usuario no autenticado.');
      return;
    }

    const docPath = `/artifacts/${this.appId()}/users/${uid}/work_registry/${log.id}`;
    try {
      await setDoc(doc(this.db, docPath), log);
      console.log('Documento guardado:', log.id);
    } catch (error) {
      console.error('Error guardando documento:', error);
    }
  }

  // ... (El resto del archivo: deleteWorkLog, monthDays, monthlySummary, etc., no tienen cambios) ...

  /**
   * Elimina un registro de trabajo de Firestore.
   * @param logId El ID del log (formato 'YYYY-MM-DD').
   */
  async deleteWorkLog(logId: string) {
    const uid = this.userId();
    if (!uid) {
      console.error('No se puede eliminar: Usuario no autenticado.');
      return;
    }

    const docPath = `/artifacts/${this.appId()}/users/${uid}/work_registry/${logId}`;
    try {
      await deleteDoc(doc(this.db, docPath));
      console.log('Documento eliminado:', logId);
    } catch (error) {
      console.error('Error eliminando documento:', error);
    }
  }

  // --- Lógica de Calendario (Señales Computadas) ---

  /**
   * (Computada) Genera la estructura de días para el mes actual.
   * Incluye días vacíos al inicio y al final para alinear la cuadrícula.
   */
  public monthDays = computed(() => {
    const monthDate = this.currentMonth();
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    const daysInMonth = lastDayOfMonth.getDate();
    // Ajuste para que Lunes sea 0 y Domingo 6
    const startDayOfWeek = (firstDayOfMonth.getDay() + 6) % 7; 

    const days = [];
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        dayNumber: i,
        date: new Date(year, month, i),
      });
    }

    const emptyStartDays = Array(startDayOfWeek).fill(null);
    const totalSlots = days.length + startDayOfWeek;
    const emptyEndSlots = 7 - (totalSlots % 7);
    const emptyEndDays = emptyEndSlots === 7 ? [] : Array(emptyEndSlots).fill(null);
    
    return { days, emptyStartDays, emptyEndDays };
  });

  /**
   * (Computada) Calcula el resumen de estadísticas para el mes actual.
   */
  public monthlySummary = computed(() => {
    const logs = this.workLogs();
    const month = this.currentMonth().getMonth();
    const year = this.currentMonth().getFullYear();
    const today = new Date();
    
    // Filtramos los logs solo para el mes y año actual
    const relevantLogs = logs.filter(log => {
      const logDate = new Date(log.date);
      return logDate.getMonth() === month && logDate.getFullYear() === year;
    });

    const workedDays = relevantLogs.length;
    const workedHolidayDays = relevantLogs.filter(log => log.isWeekendOrHoliday).length;
    
    // Calcular total de findes/festivos en el mes
    const daysInMonth = this.monthDays().days;
    const weekendOrHolidayDays = daysInMonth.filter(day => this.isWeekendOrHoliday(day.date)).length;

    // Calcular días trabajados en la semana actual
    const currentWeekWorkedDays = relevantLogs.filter(log => {
      return this.isSameWeek(new Date(log.date), today);
    }).length;
    
    return {
      workedDays,
      workedHolidayDays,
      weekendOrHolidayDays,
      currentWeekWorkedDays,
      totalDaysInMonth: daysInMonth.length,
    };
  });

  // --- Métodos de Navegación y Ayuda ---

  /**
   * Cambia el calendario al mes anterior.
   */
  goToPreviousMonth() {
    this.currentMonth.set(
      new Date(this.currentMonth().setMonth(this.currentMonth().getMonth() - 1))
    );
  }

  /**
   * Cambia el calendario al mes siguiente.
   */
  goToNextMonth() {
    this.currentMonth.set(
      new Date(this.currentMonth().setMonth(this.currentMonth().getMonth() + 1))
    );
  }

  /**
   * Obtiene el nombre del mes actual (Ej: "Octubre").
   */
  getCurrentMonthName(): string {
    return this.currentMonth().toLocaleString('es-ES', { month: 'long' });
  }

  // --- Métodos de Lógica de Fechas (Helpers) ---

  /**
   * Formatea una fecha a la clave 'YYYY-MM-DD' usada como ID en Firestore.
   * @param date La fecha a formatear.
   */
  public formatDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Comprueba si una fecha es fin de semana (Sábado o Domingo).
   * @param date La fecha a comprobar.
   */
  public isWeekend(date: Date): boolean {
    const day = date.getDay();
    return day === 0 || day === 6; // 0 = Domingo, 6 = Sábado
  }

  /**
   * Comprueba si una fecha es un festivo nacional (de la lista 'nationalHolidays').
   * @param date La fecha a comprobar.
   */
  public isHoliday(date: Date): boolean {
    const dateKey = this.formatDateKey(date);
    return this.nationalHolidays().includes(dateKey);
  }

  /**
   * Comprueba si una fecha es fin de semana O festivo.
   * @param date La fecha a comprobar.
   */
  public isWeekendOrHoliday(date: Date): boolean {
    return this.isWeekend(date) || this.isHoliday(date);
  }

  /**
   * Comprueba si una fecha es el día de hoy.
   * @param date La fecha a comprobar.
   */
  public isToday(date: Date): boolean {
    const today = new Date();
    return this.formatDateKey(date) === this.formatDateKey(today);
  }

  /**
   * Comprueba si un día específico ha sido trabajado (según los logs).
   * @param date La fecha a comprobar.
   */
  public isDayWorked(date: Date): boolean {
    const dateKey = this.formatDateKey(date);
    return this.workLogs().some(log => log.id === dateKey);
  }

  /**
   * Comprueba si dos fechas pertenecen a la misma semana (Lunes-Domingo).
   * @param d1 Fecha 1
   * @param d2 Fecha 2
   */
  private isSameWeek(d1: Date, d2: Date): boolean {
    // Clonar las fechas para no modificarlas
    const date1 = new Date(d1.getTime());
    const date2 = new Date(d2.getTime());

    // Ajustar al inicio de la semana (Lunes)
    const day1 = (date1.getDay() + 6) % 7; // Lunes = 0, Domingo = 6
    const day2 = (date2.getDay() + 6) % 7;
    
    date1.setDate(date1.getDate() - day1);
    date2.setDate(date2.getDate() - day2);

    // Comparar el inicio de la semana
    return this.formatDateKey(date1) === this.formatDateKey(date2);
  }
}

