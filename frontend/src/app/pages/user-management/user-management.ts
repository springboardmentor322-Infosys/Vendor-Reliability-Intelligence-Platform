import {
  Component,
  OnInit,
  signal
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormsModule
} from '@angular/forms';

import {
  UserManagement as UserManagementService
} from '../../services/user-management';

import {
  Auth
} from '../../services/auth';


@Component({
  selector: 'app-user-management',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl:
    './user-management.html',

  styleUrl:
    './user-management.css'
})
export class UserManagement implements OnInit {


  // ==========================================
  // USERS
  // ==========================================

  users =
    signal<any[]>([]);


  // ==========================================
  // LOADING
  // ==========================================

  loading =
    signal(false);


  saving =
    signal(false);


  // ==========================================
  // FORM
  // ==========================================

  showForm =
    signal(false);


  editingUserId:
    number | null = null;


  fullName =
    '';


  email =
    '';


  password =
    '';


  role =
    'Vendor';


  // ==========================================
  // ROLES
  // ==========================================

  roles = [

    'Administrator',

    'Procurement Manager',

    'Supply Chain Manager',

    'Vendor',

    'Finance Officer',

    'Auditor'

  ];


  // ==========================================
  // CURRENT USER
  // ==========================================

  currentUser:
    any = null;


  // ==========================================
  // CONSTRUCTOR
  // ==========================================

  constructor(

    private userService:
      UserManagementService,

    private auth:
      Auth

  ) {}


  // ==========================================
  // INITIALIZE
  // ==========================================

  ngOnInit(): void {

    this.currentUser =
      this.auth.getCurrentUser();

    this.loadUsers();

  }


  // ==========================================
  // LOAD USERS
  // ==========================================

  loadUsers(): void {

    this.loading.set(true);


    this.userService
      .getUsers()
      .subscribe({

        next: (response: any[]) => {

          this.users.set(
            response
          );

          this.loading.set(false);

        },

        error: (error: any) => {

          console.error(
            'Failed to load users:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to load users.'
          );

          this.users.set([]);

          this.loading.set(false);

        }

      });

  }


  // ==========================================
  // OPEN CREATE FORM
  // ==========================================

  openCreateForm(): void {

    this.resetForm();

    this.showForm.set(true);

  }


  // ==========================================
  // OPEN EDIT FORM
  // ==========================================

  openEditForm(
    user: any
  ): void {

    this.editingUserId =
      user.id;

    this.fullName =
      user.full_name;

    this.email =
      user.email;

    this.password =
      '';

    this.role =
      user.role;

    this.showForm.set(true);

  }


  // ==========================================
  // CLOSE FORM
  // ==========================================

  closeForm(): void {

    this.showForm.set(false);

    this.resetForm();

  }


  // ==========================================
  // RESET FORM
  // ==========================================

  resetForm(): void {

    this.editingUserId =
      null;

    this.fullName =
      '';

    this.email =
      '';

    this.password =
      '';

    this.role =
      'Vendor';

  }


  // ==========================================
  // SAVE USER
  // ==========================================

  saveUser(): void {

    // ========================================
    // VALIDATION
    // ========================================

    if (
      !this.fullName.trim()
    ) {

      alert(
        'Please enter full name.'
      );

      return;

    }


    if (
      !this.email.trim()
    ) {

      alert(
        'Please enter email.'
      );

      return;

    }


    if (
      !this.editingUserId &&
      !this.password
    ) {

      alert(
        'Please enter password.'
      );

      return;

    }


    if (
      this.password &&
      this.password.length < 8
    ) {

      alert(
        'Password must contain at least 8 characters.'
      );

      return;

    }


    // ========================================
    // CREATE
    // ========================================

    if (
      this.editingUserId === null
    ) {

      const data = {

        full_name:
          this.fullName.trim(),

        email:
          this.email.trim(),

        password:
          this.password,

        role:
          this.role

      };


      this.saving.set(true);


      this.userService
        .createUser(data)
        .subscribe({

          next: () => {

            alert(
              'User created successfully.'
            );

            this.saving.set(false);

            this.closeForm();

            this.loadUsers();

          },

          error: (error: any) => {

            console.error(
              'Create user error:',
              error
            );

            this.saving.set(false);

            alert(
              error?.error?.detail ||
              'Failed to create user.'
            );

          }

        });


      return;

    }


    // ========================================
    // UPDATE
    // ========================================

    const data: any = {

      full_name:
        this.fullName.trim(),

      email:
        this.email.trim(),

      role:
        this.role

    };


    if (
      this.password.trim()
    ) {

      data.password =
        this.password;

    }


    this.saving.set(true);


    this.userService
      .updateUser(
        this.editingUserId,
        data
      )
      .subscribe({

        next: () => {

          alert(
            'User updated successfully.'
          );

          this.saving.set(false);

          this.closeForm();

          this.loadUsers();

        },

        error: (error: any) => {

          console.error(
            'Update user error:',
            error
          );

          this.saving.set(false);

          alert(
            error?.error?.detail ||
            'Failed to update user.'
          );

        }

      });

  }


  // ==========================================
  // DELETE USER
  // ==========================================

  deleteUser(
    user: any
  ): void {

    if (
      this.currentUser?.id ===
      user.id
    ) {

      alert(
        'You cannot delete your own account.'
      );

      return;

    }


    const confirmed =
      confirm(
        `Are you sure you want to delete ${user.full_name}?`
      );


    if (!confirmed) {

      return;

    }


    this.userService
      .deleteUser(
        user.id
      )
      .subscribe({

        next: () => {

          alert(
            'User deleted successfully.'
          );

          this.loadUsers();

        },

        error: (error: any) => {

          console.error(
            'Delete user error:',
            error
          );

          alert(
            error?.error?.detail ||
            'Failed to delete user.'
          );

        }

      });

  }


  // ==========================================
  // GET ROLE CLASS
  // ==========================================

  getRoleClass(
    role: string
  ): string {

    switch (role) {

      case 'Administrator':
        return 'role-admin';

      case 'Procurement Manager':
        return 'role-procurement';

      case 'Supply Chain Manager':
        return 'role-supply';

      case 'Vendor':
        return 'role-vendor';

      case 'Finance Officer':
        return 'role-finance';

      case 'Auditor':
        return 'role-auditor';

      default:
        return '';

    }

  }

}