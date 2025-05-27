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
            new Date(b.userChallengeData.fechaCompletado || 0).getTime() - new Date(a.userChallengeData.fechaCompletado || 0).getTime()
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

} // LLAVE DE CIERRE DE LA CLASE UserStatisticsComponent
