import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../admin.service';
// Asegúrate que tu interfaz User (probablemente en auth.service.ts) tenga todos los campos que usas.
import { User } from '../../auth.service'; // Asegúrate que esta interfaz User esté actualizada
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.css']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isLoading = false;
  errorMessage: string | null = null;
  currentAdminId: number | string | undefined;
  defaultAvatar = 'assets/img/default-avatar.png'; // Ruta a tu avatar por defecto

  // Propiedades que faltaban:
  selectedUserForDetails: User | null = null;
  isLoadingUserDetails = false;

  constructor(
    private adminService: AdminService,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    const currentUser = this.authService.currentUserValue;
    if (currentUser) {
      this.currentAdminId = currentUser.id;
    }
    this.loadUsers();
  }

  loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = null;
    this.adminService.getAllUsers().subscribe({
      next: (data) => {
        // El mapeo que tenías aquí es redundante si AdminService ya devuelve User[]
        // this.users = data.map(user => ({
        //   ...user,
        // }));
        this.users = data; // Asumiendo que AdminService.getAllUsers() ya mapea a User[]
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.message || 'Error al cargar los usuarios.';
        console.error(err);
        this.isLoading = false;
      }
    });
  }

  // Método para abrir el modal (necesitarás implementarlo si aún no lo has hecho)
  // Este es un placeholder basado en la lógica que te di antes
  openUserDetailsModal(userFromCard: User): void {
    if (!userFromCard.id) {
      console.error('No se puede abrir detalles para usuario sin ID');
      // Considera mostrar un mensaje al usuario aquí también
      return; // Añadido return para evitar continuar si no hay ID
    }
    console.log('Abriendo detalles para el usuario:', userFromCard.nombre, userFromCard.id); // Log para depuración
    this.selectedUserForDetails = null; // Limpia el usuario anterior
    this.isLoadingUserDetails = true;

    this.adminService.getUserDetails(userFromCard.id).subscribe({
      next: (detailedUser) => {
        this.selectedUserForDetails = detailedUser;
        this.isLoadingUserDetails = false;
      },
      error: (err) => {
        console.error(`Error al obtener detalles para ${userFromCard.nombre}: ${err.message || 'Error desconocido'}`);
        this.errorMessage = `No se pudieron cargar los detalles para ${userFromCard.nombre}.`; // Actualiza el mensaje de error
        this.isLoadingUserDetails = false;
        // Considera cerrar el modal o mostrar el error dentro del modal
      }
    });
  }

  // Método para cerrar el modal
  closeUserDetailsModal(): void {
    this.selectedUserForDetails = null;
    this.isLoadingUserDetails = false;
  }


  onToggleAdminStatus(user: User): void {
    if (user.id === this.currentAdminId) {
      alert('No puedes cambiar tu propio estado de administrador.');
      return;
    }
    if (!user.id) { // Comprobación de nulidad para user.id
      console.error('ID de usuario indefinido, no se puede cambiar el estado de admin.');
      this.errorMessage = 'Error: ID de usuario no válido.';
      return;
    }

    this.adminService.toggleAdminStatus(user.id).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = updatedUser;
        }
        // Podrías añadir un snackbar de éxito aquí
      },
      error: (err) => {
        this.errorMessage = `Error al cambiar estado de admin para ${user.nombre}.`;
        console.error(err);
      }
    });
  }

  onDeleteUser(user: User): void {
    if (user.id === this.currentAdminId) {
      alert('No puedes eliminar tu propia cuenta de administrador desde aquí.');
      return;
    }
    if (!user.id) { // Comprobación de nulidad para user.id
      console.error('ID de usuario indefinido, no se puede eliminar.');
      this.errorMessage = 'Error: ID de usuario no válido.';
      return;
    }

    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.nombre}? Esta acción no se puede deshacer.`)) {
      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== user.id);
          alert(`Usuario ${user.nombre} eliminado correctamente.`);
          if (this.selectedUserForDetails && this.selectedUserForDetails.id === user.id) {
            this.closeUserDetailsModal(); // Cierra el modal si el usuario eliminado estaba siendo visualizado
          }
        },
        error: (err) => {
          this.errorMessage = `Error al eliminar al usuario ${user.nombre}.`;
          console.error(err);
        }
      });
    }
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }
}