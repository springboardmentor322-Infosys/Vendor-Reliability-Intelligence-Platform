import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Auth } from '../../services/auth';
import { ToastService } from '../../services/toast';


@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './settings.html',
  styleUrl: './settings.css'
})
export class Settings implements OnInit {

  // ================================
  // PROFILE
  // ================================

  name = '';

  email = '';


  // ================================
  // PASSWORD
  // ================================

  currentPassword = '';

  newPassword = '';

  confirmPassword = '';


  // ================================
  // NOTIFICATIONS
  // ================================

  notificationsEnabled = true;


  // ================================
  // LOADING
  // ================================

  profileLoading = false;

  passwordLoading = false;


  constructor(
    private auth: Auth,
    private toastService: ToastService
  ) {}


  // ================================
  // INITIALIZE
  // ================================

  ngOnInit(): void {

    this.loadProfile();

  }


  // ================================
  // LOAD PROFILE
  // ================================

  loadProfile(): void {

    this.profileLoading = true;


    this.auth
      .getProfile()
      .subscribe({

        next: (response: any) => {

          this.name =
            response.full_name || '';

          this.email =
            response.email || '';


          this.profileLoading = false;

        },


        error: (error) => {

          console.error(
            'Failed to load profile:',
            error
          );


          this.profileLoading = false;


          this.toastService.show(
            'Failed to load profile.',
            'error'
          );

        }

      });

  }


  // ================================
  // SAVE PROFILE
  // ================================

  saveProfile(): void {

    if (!this.name.trim()) {

      this.toastService.show(
        'Please enter your name.',
        'error'
      );

      return;

    }


    this.profileLoading = true;


    this.auth
      .updateProfile({
        full_name:
          this.name.trim()
      })
      .subscribe({

        next: (response: any) => {

          if (response.user) {

            this.name =
              response.user.full_name || this.name;

            this.email =
              response.user.email || this.email;

          }


          this.profileLoading = false;


          this.toastService.show(
            'Profile settings saved!',
            'success'
          );

        },


        error: (error) => {

          console.error(
            'Failed to update profile:',
            error
          );


          this.profileLoading = false;


          this.toastService.show(
            error?.error?.detail ||
            'Failed to update profile.',
            'error'
          );

        }

      });

  }


  // ================================
  // CHANGE PASSWORD
  // ================================

  changePassword(): void {

    if (
      !this.currentPassword ||
      !this.newPassword ||
      !this.confirmPassword
    ) {

      this.toastService.show(
        'Please fill all password fields.',
        'error'
      );

      return;

    }


    if (
      this.newPassword !==
      this.confirmPassword
    ) {

      this.toastService.show(
        'New passwords do not match.',
        'error'
      );

      return;

    }


    if (this.newPassword.length < 6) {

      this.toastService.show(
        'Password must contain at least 6 characters.',
        'error'
      );

      return;

    }


    if (
      this.currentPassword ===
      this.newPassword
    ) {

      this.toastService.show(
        'New password must be different from the current password.',
        'error'
      );

      return;

    }


    this.passwordLoading = true;


    this.auth
      .changePassword({

        current_password:
          this.currentPassword,

        new_password:
          this.newPassword

      })
      .subscribe({

        next: () => {

          this.passwordLoading = false;


          this.toastService.show(
            'Password changed successfully!',
            'success'
          );


          this.currentPassword = '';

          this.newPassword = '';

          this.confirmPassword = '';

        },


        error: (error) => {

          console.error(
            'Failed to change password:',
            error
          );


          this.passwordLoading = false;


          this.toastService.show(
            error?.error?.detail ||
            'Failed to change password.',
            'error'
          );

        }

      });

  }


  // ================================
  // NOTIFICATIONS
  // ================================

  toggleNotifications(): void {

    this.notificationsEnabled =
      !this.notificationsEnabled;


    this.toastService.show(
      this.notificationsEnabled
        ? 'Notifications enabled.'
        : 'Notifications disabled.',
      'success'
    );

  }


  // ================================
  // LOGOUT
  // ================================

  logout(): void {

    this.auth.logout();

  }

}