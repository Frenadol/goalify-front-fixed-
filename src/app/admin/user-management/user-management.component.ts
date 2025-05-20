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
      this.errorMessage = 'No se puede mostrar detalles: ID de usuario no encontrado.'; // Mensaje para el usuario
      return;
    }
    console.log('Abriendo detalles para el usuario:', userFromCard.name, userFromCard.id); // Log para depuración
    this.selectedUserForDetails = null; // Limpia el usuario anterior para evitar mostrar datos viejos brevemente
    this.isLoadingUserDetails = true;

    this.adminService.getUserDetails(userFromCard.id).subscribe({
      next: (detailedUser) => {
        console.log('Detalles del usuario recibidos:', detailedUser); // Log para depuración
        this.selectedUserForDetails = detailedUser;
        this.isLoadingUserDetails = false;
      },
      error: (err) => {
        console.error('Error al cargar detalles del usuario:', err);
        this.errorMessage = `Error al cargar detalles para ${userFromCard.name}: ${err.message || 'Error desconocido.'}`;
        // Opcional: mostrar el usuario con los datos que ya tienes de la lista como fallback
        // this.selectedUserForDetails = userFromCard;
        this.isLoadingUserDetails = false;
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
    if (!user.id) return;

    this.adminService.toggleAdminStatus(user.id).subscribe({
      next: (updatedUser) => {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
          this.users[index] = { ...this.users[index], ...updatedUser };
        }
        // Si el usuario del modal es el que se actualizó, actualiza también selectedUserForDetails
        if (this.selectedUserForDetails && this.selectedUserForDetails.id === updatedUser.id) {
          this.selectedUserForDetails = { ...this.selectedUserForDetails, ...updatedUser };
        }
      },
      error: (err) => {
        this.errorMessage = `Error al cambiar estado de admin para ${user.name}.`;
        console.error(err);
        alert(this.errorMessage);
      }
    });
  }

  onDeleteUser(user: User): void {
    if (user.id === this.currentAdminId) {
      alert('No puedes eliminar tu propia cuenta de administrador desde aquí.');
      return;
    }
    if (!user.id) return;

    if (confirm(`¿Estás seguro de que quieres eliminar al usuario ${user.name}? Esta acción no se puede deshacer.`)) {
      this.adminService.deleteUser(user.id).subscribe({
        next: () => {
          this.users = this.users.filter(u => u.id !== user.id);
          alert(`Usuario ${user.name} eliminado correctamente.`);
          // Si el usuario eliminado estaba en el modal, ciérralo
          if (this.selectedUserForDetails && this.selectedUserForDetails.id === user.id) {
            this.closeUserDetailsModal();
          }
        },
        error: (err) => {
          this.errorMessage = `Error al eliminar al usuario ${user.name}.`;
          console.error(err);
          alert(this.errorMessage);
        }
      });
    }
  }

  onImageError(event: Event): void {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }
}