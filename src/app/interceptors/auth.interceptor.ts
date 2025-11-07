import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpInterceptor, HttpEvent } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.authService.getToken();
    console.log('URL interceptée:', req.url);
    console.log('Token récupéré dans l’intercepteur:', token);

    if (req.url.includes('/register/') || req.url.includes('/login/')) {
      console.log('Requête publique, pas d’Authorization ajouté');
      return next.handle(req);
    }

    if (token) {
      const clonedRequest = req.clone({
        setHeaders: {
          Authorization: `Token ${token}`
        }
      });
      console.log('En-tête Authorization ajouté:', clonedRequest.headers.get('Authorization'));
      return next.handle(clonedRequest);
    }

    console.log('Aucun token trouvé, requête envoyée sans Authorization');
    return next.handle(req);
  }
}