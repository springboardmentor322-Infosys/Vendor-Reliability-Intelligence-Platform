import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class ToastService {

  private messageSubject =
    new BehaviorSubject<string>('');

  private typeSubject =
    new BehaviorSubject<string>('success');


  message$ =
    this.messageSubject.asObservable();

  type$ =
    this.typeSubject.asObservable();


  show(
    message: string,
    type: string = 'success'
  ): void {

    this.messageSubject.next(
      message
    );

    this.typeSubject.next(
      type
    );


    setTimeout(() => {

      this.messageSubject.next('');

    }, 3000);

  }

}