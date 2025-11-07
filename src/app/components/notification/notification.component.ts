import { Component, OnInit, OnDestroy } from '@angular/core';
import { WebsocketService } from '../../services/websocket.service';
import { AuthService } from '../../services/auth.service';
import { take } from 'rxjs/operators';

@Component({
  selector: 'app-notification',
  templateUrl: './notification.component.html',
  styleUrls: ['./notification.component.scss']
})
export class NotificationComponent implements OnInit, OnDestroy {
  notifications: string[] = [];

  constructor(private websocketService: WebsocketService, private authService: AuthService) {}

  ngOnInit() {
    this.authService.getUserId().pipe(take(1)).subscribe(userId => {
      if (userId) {
        this.websocketService.connect(userId);
        this.websocketService.onNotification().subscribe((data: any) => {
          this.notifications.push(data.message);
          if (this.notifications.length > 5) this.notifications.shift();
          console.log('Nouvelle notification:', data.message);
        });
      } else {
        console.warn('Aucun userId trouvé, vérifiez la connexion');
      }
    });
  }

  ngOnDestroy() {
    this.websocketService.disconnect();
  }
}