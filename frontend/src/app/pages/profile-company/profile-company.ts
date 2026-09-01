import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { Auth } from '../../services/auth';

@Component({
  selector: 'app-profile-company',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule
  ],
  templateUrl: './profile-company.html',
  styleUrl: './profile-company.css'
})
export class ProfileCompany implements OnInit {

  currentUser: any = null;

  loading = false;
  saving = false;

  successMessage = '';
  errorMessage = '';

  profile: any = {
    full_name: '',
    email: '',
    phone: '',
    company_name: '',
    company_email: '',
    company_phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postal_code: '',
    website: '',
    gst_number: '',
    pan_number: '',
    company_description: ''
  };

  constructor(
    private auth: Auth
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  // ==========================================
  // LOAD PROFILE
  // ==========================================

  loadProfile(): void {

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.currentUser = this.auth.getCurrentUser();

    if (this.currentUser) {

      this.profile = {
        full_name: this.currentUser.full_name || '',
        email: this.currentUser.email || '',
        phone: this.currentUser.phone || '',

        company_name:
          this.currentUser.company_name || '',

        company_email:
          this.currentUser.company_email || '',

        company_phone:
          this.currentUser.company_phone || '',

        address:
          this.currentUser.address || '',

        city:
          this.currentUser.city || '',

        state:
          this.currentUser.state || '',

        country:
          this.currentUser.country || '',

        postal_code:
          this.currentUser.postal_code || '',

        website:
          this.currentUser.website || '',

        gst_number:
          this.currentUser.gst_number || '',

        pan_number:
          this.currentUser.pan_number || '',

        company_description:
          this.currentUser.company_description || ''
      };

    }

    this.loading = false;
  }

  // ==========================================
  // SAVE PROFILE
  // ==========================================

  saveProfile(): void {

    this.successMessage = '';
    this.errorMessage = '';

    if (!this.profile.full_name.trim()) {
      this.errorMessage = 'Full name is required.';
      return;
    }

    if (!this.profile.email.trim()) {
      this.errorMessage = 'Email is required.';
      return;
    }

    this.saving = true;

    /*
     * The current Auth service in your project stores
     * the logged-in user locally.
     *
     * We update the local user information here so
     * the Vendor profile remains available after
     * navigating between pages.
     */

    const updatedUser = {
      ...this.currentUser,
      ...this.profile
    };

    try {

      localStorage.setItem(
        'currentUser',
        JSON.stringify(updatedUser)
      );

      this.currentUser = updatedUser;

      this.successMessage =
        'Profile and company information updated successfully.';

    } catch (error) {

      console.error(
        'Error saving profile:',
        error
      );

      this.errorMessage =
        'Unable to save profile information.';

    }

    this.saving = false;
  }

  // ==========================================
  // RESET CHANGES
  // ==========================================

  resetChanges(): void {

    this.loadProfile();

    this.successMessage = '';
    this.errorMessage = '';

  }

}