import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    CommonModule
  ],
  templateUrl: './landing.html',
  styleUrl: './landing.css'
})
export class Landing {

  constructor(
    private router: Router
  ) {}


  // ==========================================
  // COMPANY ACCESS
  // ==========================================

  companyAccess(): void {

    this.router.navigate([
      '/login'
    ]);

  }


  // ==========================================
  // NAVIGATION
  // ==========================================

  scrollTo(
    sectionId: string
  ): void {

    const element =
      document.getElementById(
        sectionId
      );

    if (element) {

      element.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });

    }

  }


  // ==========================================
  // PLATFORM
  // ==========================================

  openPlatform(): void {

    this.router.navigate([
      '/login'
    ]);

  }


  // ==========================================
  // MODULES
  // ==========================================

  openModules(): void {

    this.scrollTo(
      'modules'
    );

  }

}