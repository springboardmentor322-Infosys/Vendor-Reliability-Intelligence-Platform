import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { ApiService } from '../api.service';

@Component({
  standalone: true,
  imports: [],
  selector: 'app-communications',
  styleUrl: './communications.css',
  templateUrl: './communications.html',
})
export class Communications implements OnInit {

  communications: any[] = [];

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit() {
    this.api.getCommunications().subscribe((data: any) => {

      console.log('COMMUNICATIONS DATA:', data);
      console.log('FIRST COMMUNICATION:', data.communications[0]);

      this.communications = data.communications || [];

      this.cdr.detectChanges();
    });
  }

}