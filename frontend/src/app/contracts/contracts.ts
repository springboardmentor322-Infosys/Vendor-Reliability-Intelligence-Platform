import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-contracts',
  styleUrl: './contracts.css',
  templateUrl: './contracts.html',
})
export class Contracts implements OnInit {

  contracts: any[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getContracts().subscribe((data: any) => {

      console.log('CONTRACTS DATA:', data);
      console.log('FIRST CONTRACT:', data.contracts[0]);

      this.contracts = data.contracts || [];

      this.cdr.detectChanges();
    });
  }

}