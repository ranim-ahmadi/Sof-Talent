import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebsocketService {
  private socket: WebSocket | null = null;
  private notificationSubject = new Subject<any>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 2000;

  connect(userId: number): void {
    if (!this.socket || this.socket.readyState === WebSocket.CLOSED) {
      this.setupWebSocket(userId);
    }
  }

  private setupWebSocket(userId: number): void {
    this.socket = new WebSocket(`ws://localhost:8001/ws/notifications/${userId}/`);

    this.socket.onopen = () => {
      console.log(`Connecté au WebSocket pour l'ID ${userId}`);
      this.reconnectAttempts = 0;
    };

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.notificationSubject.next(data);
    };

    this.socket.onerror = (error) => {
      console.error('Erreur WebSocket:', error);
    };

    this.socket.onclose = (event) => {
      console.log('Déconnecté du WebSocket, code:', event.code);
      this.socket = null;
      this.reconnect(userId);
    };
  }

  private reconnect(userId: number): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Tentative de reconnexion ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);
      setTimeout(() => this.setupWebSocket(userId), this.reconnectInterval);
    } else {
      console.error('Échec des tentatives de reconnexion.');
    }
  }

  onNotification(): Observable<any> {
    return this.notificationSubject.asObservable();
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close(1000, 'Déconnexion volontaire');
      this.socket = null;
    }
  }
}