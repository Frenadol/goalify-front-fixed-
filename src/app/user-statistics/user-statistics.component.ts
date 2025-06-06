import { Component, OnInit, OnDestroy, ChangeDetectorRef, ViewChild, ElementRef } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDialog } from '@angular/material/dialog'; // Asegúrate que MatDialog esté importado
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { NgxChartsModule, LegendPosition } from '@swimlane/ngx-charts'; // LegendPosition importado
import { Subject, forkJoin, of } from 'rxjs';
import { catchError, takeUntil, map, finalize } from 'rxjs/operators';
import { HttpErrorResponse } from '@angular/common/http';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

import { StatisticEntry } from '../statistics/statistic.model';
// Asegúrate que esta es la importación correcta para UserChallengeDetail
import { UserChallengeDetail } from '../user-profile-details/user-profile.models';
import { HabitDetailDialogComponent } from './habit-detail-dialog/habit-detail-dialog.component'; // Asegúrate que esté importado
import { ChallengeDetailDialogComponent } from '../shared/challenge-detail-dialog/challenge-detail-dialog.component'; // Asegúrate que esté importado
import { StatisticsService } from '../statistics.service';
import { HabitService } from '../habits/habit.service';
import { ChallengeService } from '../challenges/challenge.service';
import { UserChallenge } from '../challenges/user-challenge.model';
import { Habit } from '../models/habit.model';

// Interfaces para datos de gráficos
interface ChartDataEntry {
  name: string | Date;
  value: number;
  extra?: any;
}

interface SeriesChartDataEntry {
  name: string | Date;
  series: ChartDataEntry[];
}

// Interfaz para las estadísticas mostradas con datos de hábitos enriquecidos
interface DisplayStatisticEntry extends Omit<StatisticEntry, 'fecha'> {
  fecha: Date;
  nombreHabito?: string;
  categoriaHabito?: string;
  iconoUrlHabito?: string;
  puntosBaseHabito?: number;
}

interface TimeFilterOption {
  value: string;
  viewValue: string;
}

@Component({
  selector: 'app-user-statistics',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    // MatDialogModule, // <--- ELIMINA ESTA LÍNEA
    MatListModule,
    MatDividerModule,
    HabitDetailDialogComponent,
    NgxChartsModule,
    MatSnackBarModule,
    TitleCasePipe,
    ChallengeDetailDialogComponent
  ],
  templateUrl: './user-statistics.component.html',
  styleUrls: ['./user-statistics.component.css'],
  providers: [DatePipe, TitleCasePipe]
})
export class UserStatisticsComponent implements OnInit, OnDestroy {
  private unsubscribe$ = new Subject<void>();

  allStatistics: DisplayStatisticEntry[] = [];
  displayedStatistics: DisplayStatisticEntry[] = [];
  completedChallenges: UserChallengeDetail[] = [];
  allHabits: Habit[] = [];

  isLoading: boolean = true;
  isLoadingCompletedChallenges: boolean = true;
  errorMessage: string | null = null;
  completedChallengesErrorMessage: string | null = null;
  habitsErrorMessage: string | null = null;
  generandoPDF: boolean = false;

  // Filtros
  selectedCategory: string = 'all';
  selectedHabitId: string = 'all';
  selectedPeriod: string = 'all'; // Renombrado de selectedTimePeriod
  categories: string[] = []; // Renombrado de availableCategories
  habitsForFilter: { id: string; nombre: string }[] = []; // Renombrado de availableHabits

  // Opciones para el filtro de tiempo
  timeFilterOptions: TimeFilterOption[] = [ // Añadido
    { value: 'all', viewValue: 'Todo el tiempo' },
    { value: '7days', viewValue: 'Últimos 7 días' },
    { value: '30days', viewValue: 'Últimos 30 días' },
    { value: '90days', viewValue: 'Últimos 90 días' }
  ];

  // Datos para gráficos
  completionOverTimeChart: SeriesChartDataEntry[] = [];
  categoryDistributionChart: ChartDataEntry[] = []; // Este es "Distribución por Hábito"
  habitPerformanceChart: ChartDataEntry[] = []; // CAMBIADO DE SeriesChartDataEntry[] a ChartDataEntry[]
  pointsByHabitChart: ChartDataEntry[] = [];
  streakComparisonChart: ChartDataEntry[] = [];
  completionConsistencyChart: SeriesChartDataEntry[] = [];

  // Opciones de gráficos
  public legendPosition: LegendPosition = LegendPosition.Right; // Usa el enum
  public LegendPosition = LegendPosition; // Expone el enum a la plantilla
  public colorScheme: any = {
    domain: [
      '#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#3B7CDE', '#FF8C00', 
      '#A0522D', '#FF69B4', '#8A2BE2', '#00C853', '#FFD600', '#D50000',
      '#2962FF', '#C51162', '#FF6D00', '#00B8D4', '#6200EA', '#00BFA5'
      // Añadidos más colores para mayor variedad
    ]
  };
  public currentViewMode: 'list' | 'charts' = 'list';

  // Mapa de puntos base por hábito
  private PUNTOS_POR_HABITO_PREDEFINIDO: { [key: string]: number } = {
    "Hacer ejercicio": 20,
    "Leer un libro": 15,
    "Meditar": 10,
    "Beber más agua": 5,
    "Comer saludable": 15,
    "Dormir bien": 10,
    "Dejar de fumar": 25
    // Asegúrate que las claves aquí coincidan EXACTAMENTE con los nombres de los hábitos
    // que vienen de `habit.nombre` (mayúsculas, minúsculas, espacios).
  };

  constructor(
    private statisticsService: StatisticsService,
    private habitService: HabitService,
    private challengeService: ChallengeService,
    private cdr: ChangeDetectorRef,
    private datePipe: DatePipe,
    private titleCasePipe: TitleCasePipe,
    public dialog: MatDialog, // Inyectar MatDialog
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
    this.loadCompletedChallenges();
  }

  ngOnDestroy(): void {
    this.unsubscribe$.next();
    this.unsubscribe$.complete();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.habitsErrorMessage = null;

    forkJoin({
      stats: this.statisticsService.getMyStatistics().pipe(catchError(err => {
        this.errorMessage = err.message || 'Error al cargar estadísticas.';
        return of([]);
      })),
      habits: this.habitService.getAllUserHabits().pipe(catchError(err => {
        this.habitsErrorMessage = err.message || 'Error al cargar la lista de hábitos para los filtros.';
        return of([]);
      }))
    })
    .pipe(
      takeUntil(this.unsubscribe$),
      finalize(() => {
        this.isLoading = false;
        this.cdr.detectChanges();
      })
    )
    .subscribe(({ stats, habits }) => {
      this.allHabits = habits;
      if (this.allHabits.length > 0) {
        this.habitsForFilter = this.allHabits.map(h => ({ id: h.id.toString(), nombre: h.nombre }));
      } else if (!this.habitsErrorMessage) {
        this.habitsErrorMessage = this.habitsErrorMessage || 'No tienes hábitos creados para filtrar o mostrar detalles.';
      }

      this.allStatistics = stats.map(stat => {
        const habit = this.allHabits.find(h => h.id === stat.idHabito);
        const habitName = habit?.nombre || 'Hábito Desconocido'; // Nombre del hábito

        // CALCULAR PUNTOS AQUÍ PARA LA VISTA DE LISTA
        const puntosParaEstaEntrada = this.PUNTOS_POR_HABITO_PREDEFINIDO[habitName] || 0;
        // Para depurar, puedes añadir un console.log:
        // console.log(`Hábito: '${habitName}', Puntos Base del Mapa: ${this.PUNTOS_POR_HABITO_PREDEFINIDO[habitName]}, Puntos Calculados: ${puntosParaEstaEntrada}`);


        return {
          ...stat,
          fecha: new Date(stat.fecha),
          nombreHabito: habitName,
          categoriaHabito: (habit?.categoria && habit.categoria.trim() !== '') ? habit.categoria.trim() : 'Sin Categoría Asignada',
          iconoUrlHabito: habit?.iconoUrl,
          puntosBaseHabito: habit?.puntosRecompensa, // O habit?.puntosBase si es el correcto
          puntosGanados: puntosParaEstaEntrada // ASIGNAR LOS PUNTOS CALCULADOS
        };
      }).sort((a, b) => b.fecha.getTime() - a.fecha.getTime());

      this.extractCategories();
      this.applyFilters(); // applyFilters usará displayedStatistics que ahora tienen puntosGanados
    });
  }

  loadCompletedChallenges(): void {
    this.isLoadingCompletedChallenges = true;
    this.completedChallengesErrorMessage = null;
    this.challengeService.getCompletedUserChallenges()
      .pipe(
        takeUntil(this.unsubscribe$),
        map(userChallenges => userChallenges.map(uc => { // uc es de tipo UserChallenge
          // Mapear desde uc (UserChallenge) a UserChallengeDetail
          // Asegurando que UserChallengeDetail tiene fechaInicio y fechaFin como opcionales
          const detail: UserChallengeDetail = {
            id: uc.desafioId,
            nombre: uc.nombreDesafio || 'Desafío Completado',
            descripcion: uc.descripcionDesafio,
            // Las siguientes propiedades pueden no estar en UserChallenge.
            // Si UserChallengeDetail las requiere, necesitarás obtenerlas
            // del Challenge original o que el backend las incluya.
            fechaInicio: undefined, // Placeholder - Idealmente vendría del Challenge original
            fechaFin: undefined,    // Placeholder - Idealmente vendría del Challenge original
            puntosRecompensa: uc.puntosDesafio,
            // El 'estado' en UserChallengeDetail se refiere al estado del Challenge original,
            // no al estado de participación del usuario.
            estado: undefined, // Placeholder - Estado del Challenge original
            tipo: undefined,       // No disponible en UserChallenge
            categoria: undefined,  // No disponible en UserChallenge
            imageUrl: undefined,   // No disponible en UserChallenge
            userChallengeData: uc, // Aquí va el UserChallenge completo
            isCompletingAction: false
          };
          // Si tienes acceso a las fechas del desafío original a través de uc, úsalas aquí.
          // Por ejemplo, si uc tuviera uc.challenge.fechaInicio:
          // fechaInicio: uc.challenge?.fechaInicio ? new Date(uc.challenge.fechaInicio) : undefined,
          // fechaFin: uc.challenge?.fechaFin ? new Date(uc.challenge.fechaFin) : undefined,
          // categoria: uc.challenge?.categoria,
          // tipo: uc.challenge?.tipo,
          // imageUrl: uc.challenge?.imageUrl,
          // estado: uc.challenge?.estado,
          return detail;
        })),
        finalize(() => {
          this.isLoadingCompletedChallenges = false;
          this.cdr.detectChanges();
        })
      )
      .subscribe({
        next: (details) => {
          this.completedChallenges = details.sort((a,b) =>
            new Date(b.userChallengeData?.fechaCompletado || Date.now()).getTime() - new Date(a.userChallengeData?.fechaCompletado || Date.now()).getTime()
          );
        },
        error: (err: HttpErrorResponse) => {
          this.completedChallengesErrorMessage = err.message || 'Error al cargar desafíos completados.';
        }
      });
  }

  private async prepareAndEnrichStatistics(rawStats: StatisticEntry[]): Promise<DisplayStatisticEntry[]> {
    // Esta función es llamada por prepareChartData, que opera sobre this.displayedStatistics.
    // this.displayedStatistics ya debería tener los puntos calculados por loadInitialData y applyFilters.
    // Por lo tanto, el cálculo de puntos aquí podría ser redundante o necesitar sincronización.

    // Por simplicidad y para asegurar que los gráficos usen la misma lógica de puntos que la lista,
    // vamos a asumir que las entradas en rawStats (que vienen de displayedStatistics)
    // ya tienen un 'nombreHabito' y podemos recalcular/verificar los puntos.
    
    return rawStats.map(stat => {
      // Asumimos que 'stat' es del tipo DisplayStatisticEntry y ya tiene 'nombreHabito'
      const displayStat = stat as DisplayStatisticEntry;
      const habitName = displayStat.nombreHabito || 'Hábito Desconocido';
      
      // Recalcular puntos para asegurar consistencia con el mapa,
      // o usar los puntos ya asignados si confiamos en el procesamiento anterior.
      // Para consistencia, recalculemos:
      const puntosParaEstaEntrada = this.PUNTOS_POR_HABITO_PREDEFINIDO[habitName] || 0;

      // console.log(`(Enrich for Charts) Hábito: '${habitName}', Puntos: ${puntosParaEstaEntrada}`);


      // Devolvemos un objeto que coincide con DisplayStatisticEntry,
      // asegurando que 'puntosGanados' esté establecido.
      return {
        ...displayStat, // Mantiene todas las propiedades existentes de DisplayStatisticEntry
        puntosGanados: puntosParaEstaEntrada
      };
    });
  }

  extractCategories(): void {
    const uniqueCategories = new Set(
      this.allStatistics.map(stat => 
        (stat.categoriaHabito && stat.categoriaHabito.trim() !== '') ? stat.categoriaHabito.trim() : 'Sin Categoría Asignada'
      )
    );
    this.categories = ['all', ...Array.from(uniqueCategories)];
  }

  applyFilters(): void {
    let filtered = this.allStatistics;

    if (this.selectedCategory !== 'all') {
      filtered = filtered.filter(stat => stat.categoriaHabito === this.selectedCategory);
    }

    if (this.selectedHabitId !== 'all') {
      filtered = filtered.filter(stat => stat.idHabito.toString() === this.selectedHabitId);
    }

    if (this.selectedPeriod !== 'all') {
      const now = new Date();
      let startDate = new Date();
      if (this.selectedPeriod === '7days') {
        startDate.setDate(now.getDate() - 7);
      } else if (this.selectedPeriod === '30days') {
        startDate.setDate(now.getDate() - 30);
      } else if (this.selectedPeriod === '90days') {
        startDate.setDate(now.getDate() - 90);
      }
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(stat => stat.fecha >= startDate);
    }

    this.displayedStatistics = filtered;
    this.prepareChartData();
    this.cdr.detectChanges();
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  // MÉTODO FALTANTE: setViewMode
  setViewMode(mode: 'list' | 'charts'): void {
    this.currentViewMode = mode;
    if (mode === 'charts' && this.displayedStatistics.length > 0) {
      this.prepareChartData();
    }
    this.cdr.detectChanges();
  }

  // MÉTODO FALTANTE: isAnyFilterActive
  isAnyFilterActive(): boolean {
    return this.selectedCategory !== 'all' ||
           this.selectedHabitId !== 'all' ||
           this.selectedPeriod !== 'all';
  }

  prepareChartData(): void {
    if (!this.displayedStatistics || this.displayedStatistics.length === 0) {
      this.completionOverTimeChart = [];
      this.categoryDistributionChart = [];
      this.habitPerformanceChart = [];
      this.pointsByHabitChart = [];
      this.streakComparisonChart = [];
      this.completionConsistencyChart = []; // Asegúrate de limpiarlo también
      this.cdr.detectChanges();
      return;
    } // LLAVE DE CIERRE QUE FALTABA PARA EL IF INICIAL

    // 1. Finalización a lo largo del tiempo (agrupado por día)
    const completionByDate: { [key: string]: number } = {};
    this.displayedStatistics.forEach(stat => {
      const dateStr = this.datePipe.transform(stat.fecha, 'yyyy-MM-dd') || 'unknown-date';
      completionByDate[dateStr] = (completionByDate[dateStr] || 0) + 1;
    });
    const singleSeriesCompletions = Object.entries(completionByDate)
      .map(([date, count]) => ({ name: new Date(date), value: count }))
      .sort((a, b) => (a.name as Date).getTime() - (b.name as Date).getTime());
    this.completionOverTimeChart = [{
        name: 'Completados',
        series: singleSeriesCompletions
    }];
    console.log('Data for completionOverTimeChart:', JSON.parse(JSON.stringify(this.completionOverTimeChart)));

    // 2. Distribución por HÁBITO (Gráfico de Pastel)
    const completionsByHabitName: { [key: string]: number } = {};
    this.displayedStatistics.forEach(stat => {
      const habitName = stat.nombreHabito || 'Hábito Desconocido';
      completionsByHabitName[habitName] = (completionsByHabitName[habitName] || 0) + 1;
    });
    this.categoryDistributionChart = Object.entries(completionsByHabitName).map(([name, value]) => ({
        name: this.titleCasePipe.transform(name), // Aplicar TitleCase para consistencia en gráficos
        value
    }));
    console.log('Data for Distribution by Habit (categoryDistributionChart):', JSON.parse(JSON.stringify(this.categoryDistributionChart)));

    // 3. Rendimiento de Hábitos (Completados por Hábito) - Gráfico de barras
    const completionsByHabitForPerformance: { [key: string]: number } = {}; // Renombrar para evitar confusión
    this.displayedStatistics.forEach(statEntry => {
      const habitName = statEntry.nombreHabito || 'Desconocido';
      completionsByHabitForPerformance[habitName] = (completionsByHabitForPerformance[habitName] || 0) + 1;
    });
    this.habitPerformanceChart = Object.entries(completionsByHabitForPerformance).map(([name, value]) => ({
      name: this.titleCasePipe.transform(name),
      value
    }));
    console.log('Data for habitPerformanceChart (now ChartDataEntry[]):', JSON.parse(JSON.stringify(this.habitPerformanceChart)));

    // 4. Puntos por Hábito (Gráfico)
    const calculatedPointsByHabit: { [key: string]: number } = {};
    for (const habitName in completionsByHabitForPerformance) { // Usar el mismo conteo de hábitos
      if (completionsByHabitForPerformance.hasOwnProperty(habitName)) {
        const count = completionsByHabitForPerformance[habitName];
        // Para el nombre en PUNTOS_POR_HABITO_PREDEFINIDO, necesitamos el nombre original, no el transformado por TitleCase
        // Así que buscamos el nombre original. Si todos los nombres de hábitos ya están en TitleCase, esto es más simple.
        // Asumamos que los nombres en PUNTOS_POR_HABITO_PREDEFINIDO son los mismos que stat.nombreHabito
        const originalHabitName = Object.keys(this.PUNTOS_POR_HABITO_PREDEFINIDO).find(key => key.toLowerCase() === habitName.toLowerCase()) || habitName;
        const basePoints = this.PUNTOS_POR_HABITO_PREDEFINIDO[originalHabitName] || 0;
        calculatedPointsByHabit[this.titleCasePipe.transform(habitName)] = count * basePoints; // Usar nombre en TitleCase para el gráfico
      }
    }
    this.pointsByHabitChart = Object.entries(calculatedPointsByHabit).map(([name, value]) => ({
      name, // Ya está en TitleCase
      value
    }));
    console.log('Data for pointsByHabitChart (calculated for chart):', JSON.parse(JSON.stringify(this.pointsByHabitChart)));

    // 5. Comparación de Rachas
    this.streakComparisonChart = this.allHabits
      .filter(h => h.rachaActual && h.rachaActual > 0)
      .map(habit => ({
        name: this.titleCasePipe.transform(habit.nombre),
        value: habit.rachaActual || 0
      }))
      .sort((a,b) => b.value - a.value)
      .slice(0,10);
    console.log('Data for streakComparisonChart:', JSON.parse(JSON.stringify(this.streakComparisonChart)));

    // 6. Consistencia de Finalización (por día de la semana)
    const completionByDayOfWeek: { [key: string]: number } = {
      'Dom': 0, 'Lun': 0, 'Mar': 0, 'Mié': 0, 'Jue': 0, 'Vie': 0, 'Sáb': 0
    };
    const dayMapping = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    console.log('[DEBUG] displayedStatistics for Consistency Chart:', JSON.parse(JSON.stringify(this.displayedStatistics)));

    this.displayedStatistics.forEach((stat, index) => {
      try {
        const dateObj = new Date(stat.fecha);
        // Verificar si la fecha es válida
        if (isNaN(dateObj.getTime())) {
          console.warn(`[DEBUG] Invalid date for stat at index ${index}:`, stat.fecha, stat);
          return; // Saltar esta entrada
        }

        const dayIndex = dateObj.getDay(); // 0 (Dom) a 6 (Sáb)
        const dayName = dayMapping[dayIndex];

        // console.log(`[DEBUG] Stat ${index}: Fecha=${stat.fecha}, DateObj=${dateObj}, DayIndex=${dayIndex}, DayName=${dayName}`);

        if (dayName) {
          completionByDayOfWeek[dayName] = (completionByDayOfWeek[dayName] || 0) + 1;
        } else {
          console.warn(`[DEBUG] Could not map dayIndex ${dayIndex} to a dayName for stat:`, stat);
        }
      } catch (e) {
        console.error(`[DEBUG] Error processing date for stat at index ${index}:`, stat.fecha, e);
      }
    });

    console.log('[DEBUG] completionByDayOfWeek after processing:', JSON.parse(JSON.stringify(completionByDayOfWeek)));

    // Primero, crea el array de ChartDataEntry para los días
    const dailyData: ChartDataEntry[] = Object.keys(completionByDayOfWeek).map(dayName => ({
      name: dayName, // 'Dom', 'Lun', etc.
      value: completionByDayOfWeek[dayName]
    }));

    // Luego, envuélvelo en la estructura SeriesChartDataEntry[]
    this.completionConsistencyChart = [ // Array que contiene las series
      {
        name: 'Completados por Día', // Nombre de la serie
        series: dailyData // Array de puntos de datos para esta serie
      }
    ];

    console.log('[DEBUG] Generated completionConsistencyChart:', JSON.parse(JSON.stringify(this.completionConsistencyChart)));

    this.cdr.detectChanges();
  }

  // MÉTODO FALTANTE: openHabitDetailDialog
  openHabitDetailDialog(statistic: DisplayStatisticEntry): void {
    const habitToDisplay = this.allHabits.find(h => h.id.toString() === statistic.idHabito.toString());
    if (habitToDisplay) {
      this.dialog.open(HabitDetailDialogComponent, {
        width: '450px',
        data: { habit: habitToDisplay, statisticDate: statistic.fecha, pointsAwarded: statistic.puntosGanados }
      });
    } else {
      this.snackBar.open('No se pudieron cargar los detalles completos del hábito.', 'Cerrar', { duration: 3000 });
    }
  }

  // MÉTODO FALTANTE: onChartSelect
  onChartSelect(event: any): void {
    // Podrías usar esto para mostrar más detalles o filtrar basado en la selección del gráfico
    console.log('Elemento del gráfico seleccionado:', event);
    // Ejemplo: si quieres mostrar un snackbar con la información
    if (event && event.name && event.value !== undefined) {
       this.snackBar.open(`Hábito: ${event.name} - Valor: ${event.value}`, 'OK', { duration: 2000 });
    }
  }

  // MÉTODO FALTANTE: openChallengeDetailDialog
  openChallengeDetailDialog(challenge: UserChallengeDetail): void {
    this.dialog.open(ChallengeDetailDialogComponent, {
      width: '500px',
      data: { challenge: challenge } // Asegúrate que ChallengeDetailDialogComponent espera esta data
    });
  }

  // Método para descargar PDF
  descargarPerfilPDF(): void {
    this.generandoPDF = true;
    
    setTimeout(() => {
      this.generarPDF();
    }, 500);
  }

  private async generarPDF(): Promise<void> {
  try {
    this.snackBar.open('Generando PDF visual, por favor espera...', '', { duration: 3000 });
    
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Colores de marca
    const colorPrimario = [83, 109, 254]; // RGB: #536DFE (azul)
    const colorSecundario = [255, 64, 129]; // RGB: #FF4081 (rosa)
    const colorExito = [76, 175, 80]; // RGB: #4CAF50 (verde)
    const colorInfo = [3, 169, 244]; // RGB: #03A9F4 (azul claro)
    const colorGris = [158, 158, 158]; // RGB: #9E9E9E
    
    // ENCABEZADO CON ESTILO
    // Fondo de encabezado
    pdf.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
    pdf.rect(0, 0, pageWidth, 40, 'F');
    
    // Título
    pdf.setTextColor(255, 255, 255); // Texto blanco
    pdf.setFontSize(22);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Mi Progreso y Estadísticas en Goalify', pageWidth / 2, 20, { align: 'center' });
    
    // Fecha
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const fechaActual = new Date().toLocaleDateString();
    pdf.text(`Generado el ${fechaActual}`, pageWidth / 2, 30, { align: 'center' });
    
    let posY = 50; // Posición inicial después del encabezado
    
    // Inicializar valores para el perfil de usuario
    const nombreUsuario = 'xusma'; // Puedes reemplazar esto con el nombre de usuario real si lo tienes disponible
    const puntosActuales = this.calcularPuntosTotales();
    const nivelUsuario = this.calcularNivel();
    const puntosRecord = this.calcularPuntosRecord();
    const habitosCompletadosHoy = this.contarHabitosCompletadosHoy();
    const rangoUsuario = this.determinarRango(puntosActuales);
    
    // SECCIÓN DE PERFIL DE USUARIO CON ESTILO VISUAL
    // Título de la sección con fondo
    pdf.setFillColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
    pdf.rect(10, posY - 7, pageWidth - 20, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PERFIL DE USUARIO', pageWidth / 2, posY, { align: 'center' });
    posY += 15;
    
    // Datos del perfil con iconos simulados
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(11);
    pdf.setDrawColor(colorGris[0], colorGris[1], colorGris[2]);
    pdf.setLineWidth(0.1);
    
    // Marco para el perfil
    pdf.roundedRect(15, posY - 5, pageWidth - 30, 85, 3, 3, 'S');
    
    // Creamos una estructura de datos para todos los campos del perfil
    const perfilData = [
      { label: "Usuario:", value: nombreUsuario, color: colorInfo },
      { label: "Puntos Actuales:", value: puntosActuales.toString(), color: colorPrimario },
      { label: "Nivel:", value: nivelUsuario.toString(), color: colorExito },
      { label: "Puntos Récord:", value: puntosRecord.toString(), color: colorSecundario },
      { label: "Desafíos Completados:", value: this.completedChallenges.length.toString(), color: colorInfo },
      { label: "Hábitos Completados Hoy:", value: habitosCompletadosHoy.toString(), color: colorPrimario },
      { label: "Total de Hábitos Completados:", value: this.displayedStatistics.length.toString(), color: colorExito },
      { label: "Rango:", value: rangoUsuario, color: colorSecundario }
    ];
    
    // Calculamos el ancho máximo de las etiquetas para alinear los valores
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    let maxLabelWidth = 0;
    perfilData.forEach(item => {
      const labelWidth = pdf.getTextWidth(item.label);
      maxLabelWidth = Math.max(maxLabelWidth, labelWidth);
    });
    
    // Añadimos un poco de espacio después de la etiqueta más larga
    const labelPadding = 5;
    const startX = 30;
    const valueX = startX + maxLabelWidth + labelPadding;
    
    // Ahora dibujamos cada fila con el círculo, la etiqueta y el valor alineado
    perfilData.forEach((item, index) => {
      const rowY = posY + (index * 10);
      
      // Círculo de color
      pdf.setFillColor(item.color[0], item.color[1], item.color[2]);
      pdf.circle(22, rowY + 2, 3, 'F');
      
      // Etiqueta en negrita
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(0, 0, 0);
      pdf.text(item.label, startX, rowY);
      
      // Valor en texto normal
      pdf.setFont('helvetica', 'normal');
      pdf.text(item.value, valueX, rowY);
    });
    
    // Actualizamos la posición Y para después de la tabla
    posY += 80;
    
    // Barra de progreso horizontal con estilo mejorado
    pdf.setDrawColor(220, 220, 220);
    pdf.setFillColor(245, 245, 245);
    pdf.roundedRect(30, posY, pageWidth - 60, 8, 4, 4, 'FD');

    // Calcular porcentaje de progreso (máx 20,000 puntos)
    const porcentajeProgreso = Math.min((puntosActuales / 20000) * 100, 100);
    const anchoProgreso = ((pageWidth - 60) * porcentajeProgreso) / 100;

    // Dibujar barra de progreso llena
    pdf.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
    pdf.roundedRect(30, posY, anchoProgreso, 8, 4, 4, 'F');

    // Texto de progreso centrado
    pdf.setTextColor(0);
    pdf.setFontSize(8);
    pdf.text(`${Math.round(porcentajeProgreso)}% (${puntosActuales}/20000 pts)`, pageWidth / 2, posY + 5, { align: 'center' });

    posY += 15;
    
    // SECCIÓN DE RESUMEN DE ACTIVIDAD
    // Título con fondo
    pdf.setFillColor(colorInfo[0], colorInfo[1], colorInfo[2]);
    pdf.rect(10, posY - 7, pageWidth - 20, 10, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RESUMEN DE ACTIVIDAD', pageWidth / 2, posY, { align: 'center' });
    posY += 15;
    
    // Tarjetas de resumen en una fila
    pdf.setTextColor(0, 0, 0);
    const cardWidth = (pageWidth - 40) / 3;
    
    // Tarjeta 1: Total de hábitos
    pdf.setFillColor(colorPrimario[0], colorPrimario[1], colorSecundario[2], 0.1); // Color con transparencia
    pdf.roundedRect(15, posY, cardWidth, 30, 2, 2, 'F');
    pdf.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
    pdf.rect(15, posY, cardWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('TOTAL HÁBITOS', 15 + cardWidth/2, posY + 5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${this.allHabits.length}`, 15 + cardWidth/2, posY + 20, { align: 'center' });
    
    // Tarjeta 2: Registros totales
    pdf.setFillColor(colorSecundario[0], colorSecundario[1], colorSecundario[2], 0.1);
    pdf.roundedRect(25 + cardWidth, posY, cardWidth, 30, 2, 2, 'F');
    pdf.setFillColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
    pdf.rect(25 + cardWidth, posY, cardWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('REGISTROS', 25 + cardWidth + cardWidth/2, posY + 5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.text(`${this.displayedStatistics.length}`, 25 + cardWidth + cardWidth/2, posY + 20, { align: 'center' });
    
    // Tarjeta 3: Desafíos completados
    pdf.setFillColor(colorExito[0], colorExito[1], colorExito[2], 0.1);
    pdf.roundedRect(35 + 2*cardWidth, posY, cardWidth, 30, 2, 2, 'F');
    pdf.setFillColor(colorExito[0], colorExito[1], colorExito[2]);
    pdf.rect(35 + 2*cardWidth, posY, cardWidth, 7, 'F');
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8);
    pdf.text('DESAFÍOS', 35 + 2*cardWidth + cardWidth/2, posY + 5, { align: 'center' });
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.text(`${this.completedChallenges.length}`, 35 + 2*cardWidth + cardWidth/2, posY + 20, { align: 'center' });
    
    posY += 40;
    
    // TABLA DE HÁBITOS MÁS REALIZADOS
    if (this.habitPerformanceChart.length > 0) {
      if (posY > pageHeight - 80) {
        pdf.addPage();
        posY = 20;
      }
      
      // Cabecera de tabla con color
      pdf.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
      pdf.rect(10, posY - 7, pageWidth - 20, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('HÁBITOS MÁS REALIZADOS', pageWidth / 2, posY, { align: 'center' });
      posY += 15;
      
      // Fondo para la tabla
      pdf.setFillColor(245, 245, 245); // Color gris claro
      pdf.rect(15, posY - 5, pageWidth - 30, 8 + (Math.min(this.habitPerformanceChart.length, 8) * 8), 'F');
      
      // Cabecera de columnas
      pdf.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2], 0.7);
      pdf.rect(15, posY - 5, pageWidth - 30, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('HÁBITO', 30, posY);
      pdf.text('COMPLETADOS', pageWidth - 40, posY);
      posY += 8;
      
      // Filas de datos
      const sortedHabits = [...this.habitPerformanceChart].sort((a, b) => b.value - a.value);
      pdf.setTextColor(50, 50, 50);
      
      // Alternar colores para las filas
      sortedHabits.slice(0, 8).forEach((habit, idx) => {
        if (idx % 2 === 0) {
          pdf.setFillColor(240, 240, 240);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.rect(15, posY - 4, pageWidth - 30, 8, 'F');
        
        pdf.setFont('helvetica', 'normal');
        pdf.text(habit.name.toString().slice(0, 30), 30, posY);
        
        // Añadir una pequeña barra de visualización
        const maxValue = Math.max(...sortedHabits.map(h => h.value));
        const barWidth = Math.max(5, (habit.value / maxValue) * 50);
        pdf.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2]);
        pdf.rect(pageWidth - 70, posY - 3, barWidth, 5, 'F');
        
        pdf.text(habit.value.toString(), pageWidth - 40, posY);
        posY += 8;
      });
      posY += 10;
    }
    
    // GRÁFICO VISUAL DE PUNTOS POR HÁBITO
    if (this.pointsByHabitChart.length > 0) {
      if (posY > pageHeight - 90) {
        pdf.addPage();
        posY = 20;
      }
      
      // Cabecera con color
      pdf.setFillColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
      pdf.rect(10, posY - 7, pageWidth - 20, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('PUNTOS ACUMULADOS POR HÁBITO', pageWidth / 2, posY, { align: 'center' });
      posY += 15;
      
      // Fondo para la tabla
      pdf.setFillColor(245, 245, 245);
      pdf.rect(15, posY - 5, pageWidth - 30, 8 + (Math.min(this.pointsByHabitChart.length, 8) * 8), 'F');
      
      // Cabecera de columnas
      pdf.setFillColor(colorSecundario[0], colorSecundario[1], colorSecundario[2], 0.7);
      pdf.rect(15, posY - 5, pageWidth - 30, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('HÁBITO', 30, posY);
      pdf.text('PUNTOS', pageWidth - 40, posY);
      posY += 8;
      
      // Filas con barras de progreso
      const sortedPoints = [...this.pointsByHabitChart].sort((a, b) => b.value - a.value);
      const maxPoints = Math.max(...sortedPoints.map(p => p.value));
      
      sortedPoints.slice(0, 8).forEach((point, idx) => {
        if (idx % 2 === 0) {
          pdf.setFillColor(240, 240, 240);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.rect(15, posY - 4, pageWidth - 30, 8, 'F');
        
        pdf.setTextColor(50, 50, 50);
        pdf.setFont('helvetica', 'normal');
        pdf.text(point.name.toString().slice(0, 30), 30, posY);
        
        // Calcular ancho de barra basado en porcentaje del máximo
        const barWidth = Math.max(5, (point.value / maxPoints) * 50);
        pdf.setFillColor(colorSecundario[0], colorSecundario[1], colorSecundario[2]);
        pdf.rect(pageWidth - 70, posY - 3, barWidth, 5, 'F');
        
        pdf.text(point.value.toString(), pageWidth - 40, posY);
        posY += 8;
      });
      posY += 10;
    }
    
    // DESAFÍOS COMPLETADOS
    if (this.completedChallenges.length > 0) {
      if (posY > pageHeight - 80) {
        pdf.addPage();
        posY = 20;
      }
      
      // Cabecera de sección
      pdf.setFillColor(colorExito[0], colorExito[1], colorExito[2]);
      pdf.rect(10, posY - 7, pageWidth - 20, 10, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(14);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DESAFÍOS COMPLETADOS', pageWidth / 2, posY, { align: 'center' });
      posY += 15;
      
      // Fondo para la tabla
      pdf.setFillColor(245, 245, 245);
      pdf.rect(15, posY - 5, pageWidth - 30, 8 + (Math.min(this.completedChallenges.length, 5) * 10), 'F');
      
      // Cabecera de columnas
      pdf.setFillColor(colorExito[0], colorExito[1], colorExito[2], 0.7);
      pdf.rect(15, posY - 5, pageWidth - 30, 8, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.text('NOMBRE', 25, posY);
      pdf.text('PUNTOS', pageWidth - 60, posY);
      pdf.text('FECHA', pageWidth - 30, posY);
      posY += 8;
      
      pdf.setTextColor(50, 50, 50);
      this.completedChallenges.slice(0, 5).forEach((challenge, idx) => {
        if (idx % 2 === 0) {
          pdf.setFillColor(240, 240, 240);
        } else {
          pdf.setFillColor(255, 255, 255);
        }
        pdf.rect(15, posY - 4, pageWidth - 30, 10, 'F');
        
        // Icono desafío (simulado con un círculo)
        pdf.setFillColor(colorExito[0], colorExito[1], colorExito[2]);
        pdf.circle(20, posY + 2, 2, 'F');
        
        pdf.setFont('helvetica', 'normal');
        // Nombre con truncado seguro
        const nombreDesafio = challenge.nombre || 'Sin nombre';
        pdf.text(nombreDesafio.slice(0, 25) + (nombreDesafio.length > 25 ? '...' : ''), 25, posY);
        
        // Puntos con color destacado
        const puntosDesafio = challenge.puntosRecompensa?.toString() || '0';
        pdf.setTextColor(colorExito[0], colorExito[1], colorExito[2]);
        pdf.setFont('helvetica', 'bold');
        pdf.text(puntosDesafio, pageWidth - 60, posY);
        
        // Fecha
        pdf.setTextColor(100, 100, 100);
        pdf.setFont('helvetica', 'normal');
        const fechaStr = challenge.userChallengeData?.fechaCompletado 
          ? new Date(challenge.userChallengeData.fechaCompletado).toLocaleDateString()
          : 'N/A';
        pdf.text(fechaStr, pageWidth - 30, posY);
        
        posY += 10;
      });
    }
    
    // Pie de página en todas las páginas
    const totalPages = pdf.internal.pages.length - 1;
    
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      
      // Línea decorativa en pie de página
      pdf.setDrawColor(colorGris[0], colorGris[1], colorGris[2]);
      pdf.setLineWidth(0.5);
      pdf.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
      
      // Texto de pie de página
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);
      pdf.text(`Página ${i} de ${totalPages}`, 15, pageHeight - 8);
      pdf.text('Goalify - Tu aplicación de hábitos y metas', pageWidth / 2, pageHeight - 8, { align: 'center' });
      pdf.text(fechaActual, pageWidth - 15, pageHeight - 8, { align: 'right' });
    }
    
    // Guardar con un nombre descriptivo
    const nombreArchivo = `Goalify-Estadisticas-${fechaActual.replace(/\//g, '-')}.pdf`;
    pdf.save(nombreArchivo);
    
    this.snackBar.open('¡PDF visual generado con éxito!', 'Cerrar', { duration: 3000 });
  } catch (error) {
    console.error('Error al generar el PDF visual:', error);
    this.snackBar.open('Error al generar el PDF. Por favor intenta de nuevo.', 'Cerrar', { duration: 4000 });
  } finally {
    this.generandoPDF = false;
    this.cdr.detectChanges();
  }
}

// Métodos auxiliares para el perfil de usuario
private calcularPuntosTotales(): number {
  let total = 0;
  
  // Suma de puntos por hábitos completados
  this.displayedStatistics.forEach(stat => {
    total += stat.puntosGanados || 0;
  });
  
  // Suma de puntos por desafíos completados
  this.completedChallenges.forEach(challenge => {
    total += challenge.puntosRecompensa || 0;
  });
  
  return total;
}

private calcularNivel(): number {
  const puntosTotales = this.calcularPuntosTotales();
  
  // Ejemplo de cálculo básico de nivel (personaliza según tu lógica de negocio)
  return Math.floor(puntosTotales / 1000);
}

private calcularPuntosRecord(): number {
  // Aquí podrías implementar lógica para obtener el máximo histórico
  // Por ahora, simplemente devolvemos los puntos actuales
  return this.calcularPuntosTotales();
}

private contarHabitosCompletadosHoy(): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  
  return this.displayedStatistics.filter(stat => {
    const fechaHabito = new Date(stat.fecha);
    fechaHabito.setHours(0, 0, 0, 0);
    return fechaHabito.getTime() === hoy.getTime();
  }).length;
}

private calcularMejorRacha(): number {
  if (!this.allHabits || this.allHabits.length === 0) return 0;
  
  // Encontrar la mejor racha entre todos los hábitos
  return Math.max(...this.allHabits.map(habit => habit.rachaActual || 0));
}

private determinarRango(puntos: number): string {
  // Ejemplo de lógica para determinar el rango basado en puntos
  if (puntos >= 10000) return 'Dedicado';
  if (puntos >= 5000) return 'Experto';
  if (puntos >= 2000) return 'Avanzado';
  if (puntos >= 500) return 'Intermedio';
  return 'Principiante';
}
}