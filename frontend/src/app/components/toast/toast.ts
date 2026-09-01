import {
  ChangeDetectorRef,
  Component,
  OnInit
} from '@angular/core';

import { ToastService } from '../../services/toast';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [],
  templateUrl: './toast.html',
  styleUrl: './toast.css'
})
export class Toast implements OnInit {

  message = '';
  type = 'success';

  constructor(
    private toastService: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {

    this.toastService.message$.subscribe(
      (message) => {

        console.log(
          'TOAST COMPONENT RECEIVED:',
          message
        );

        this.message = message;

        // Force Angular to update the screen
        this.cdr.detectChanges();

      }
    );

    this.toastService.type$.subscribe(
      (type) => {

        this.type = type;

        this.cdr.detectChanges();

      }
    );

  }

}