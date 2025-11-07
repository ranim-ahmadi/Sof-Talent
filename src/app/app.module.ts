// src/app/app.module.ts
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { AppRoutingModule } from './app-routing.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { AppComponent } from './app.component';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { AuthService } from './services/auth.service';
import { AuthInterceptor } from './interceptors/auth.interceptor';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DashboardAdminComponent } from './components/dashboard-admin/dashboard-admin.component';
import { FormCvComponent } from './components/form-cv/form-cv.component';
import { UpdateFormCvComponent } from './components/update-form-cv/update-form-cv.component';
import { ChooseCvActionsComponent } from './components/choose-cv-actions/choose-cv-actions.component';
import { KpiDashboardComponent } from './kpi-dashboard/kpi-dashboard.component';
import { CvFilterComponent } from './cv-filter/cv-filter.component';
import { ManagerSpaceComponent } from './components/manager-space/manager-space.component';
import { UploadJobDescriptionComponent } from './components/upload-job-description/upload-job-description.component';
import { NgChartsModule } from 'ng2-charts';

import { SearchProfileComponent } from './components/search-profile/search-profile.component';
import { FichePosteFormComponent } from './components/fiche-poste-form/fiche-poste-form.component';
import { JobHistoryComponent } from './components/job-history/job-history.component';
import { NotificationComponent } from './components/notification/notification.component';


@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    RegisterComponent,
    HomeComponent,
    DashboardAdminComponent,
    FormCvComponent,
    UpdateFormCvComponent,
    ChooseCvActionsComponent,
    KpiDashboardComponent,
    CvFilterComponent,
    ManagerSpaceComponent,
    UploadJobDescriptionComponent,
    SearchProfileComponent,
    FichePosteFormComponent,
    JobHistoryComponent,
    NotificationComponent

  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    BrowserAnimationsModule,
    ReactiveFormsModule,
    NgChartsModule
  ],
  providers: [
    AuthService,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor() {
    console.log('AppModule chargé');
  }
}