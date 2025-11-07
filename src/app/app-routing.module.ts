import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { RegisterComponent } from './components/register/register.component';
import { HomeComponent } from './components/home/home.component';
import { DashboardAdminComponent } from './components/dashboard-admin/dashboard-admin.component';
import { FormCvComponent } from './components/form-cv/form-cv.component';
import { UpdateFormCvComponent } from './components/update-form-cv/update-form-cv.component' ;
import { ChooseCvActionsComponent } from './components/choose-cv-actions/choose-cv-actions.component';
import { KpiDashboardComponent } from './kpi-dashboard/kpi-dashboard.component';
import { CvFilterComponent } from './cv-filter/cv-filter.component';
import { ManagerSpaceComponent } from './components/manager-space/manager-space.component';
import { UploadJobDescriptionComponent } from './components/upload-job-description/upload-job-description.component';
import { JobHistoryComponent } from './components/job-history/job-history.component'; // Ajout
import { FichePosteFormComponent } from './components/fiche-poste-form/fiche-poste-form.component';
const routes: Routes = [
  
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'home', component: HomeComponent },
  { path: 'admin-dashboard', component: DashboardAdminComponent },
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  { path: 'cv-form', component: FormCvComponent },       // Route pour créer un CV
  { path: 'cv-form/:id', component: UpdateFormCvComponent },
  { path: 'choose-cv-action', component: ChooseCvActionsComponent },
  { path: 'kpi-dashboard', component: KpiDashboardComponent },
  { path: 'filter', component: CvFilterComponent },
  { path: 'manager-space', component: ManagerSpaceComponent }, // Ajouter la route
  { path: 'upload-job-description', component: UploadJobDescriptionComponent }, 
  { path: 'fiche-poste-form', component: FichePosteFormComponent},
  { path: 'job-history', component: JobHistoryComponent },
];
console.log('Routes chargées :', routes); // Debugging

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }