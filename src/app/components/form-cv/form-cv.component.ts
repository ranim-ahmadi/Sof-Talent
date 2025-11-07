import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { CvService, CV, Experience } from '../../services/cv.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-form-cv',
  templateUrl: './form-cv.component.html',
  styleUrls: ['./form-cv.component.scss']
})
export class FormCvComponent implements OnInit {
  cvForm: FormGroup;
  isEditMode = false;
  cvId?: number;
  isLoading = false;
  cvGenerated = false;
  successMessage: string | null = null; // Nouvelle propriété pour le message de succès

  constructor(
    private fb: FormBuilder,
    private cvService: CvService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.cvForm = this.fb.group({
      title: [''],
      username: [''],
      email: [''],
      poste_actuel: [''],
      annees_experience: [null],
      overview: [''],
      skills: [''],
      languages: [''],
      certifications: [''],
      experiences: this.fb.array([
        this.fb.group({
          employeur: [''],
          position: [''],
          missions: [''],
          technologies: [''],
          date_debut: [''],
          date_fin: ['']
        })
      ])
    });
  }

  ngOnInit(): void {
    this.cvId = this.route.snapshot.params['id'];
    if (this.cvId) {
      this.isEditMode = true;
      this.loadCVData(this.cvId);
    }
  }

  get experiences(): FormArray {
    return this.cvForm.get('experiences') as FormArray;
  }

  addExperience(): void {
    this.experiences.push(this.fb.group({
      employeur: [''],
      position: [''],
      missions: [''],
      technologies: [''],
      date_debut: [''],
      date_fin: ['']
    }));
  }

  setExperiences(experiences: Experience[]): void {
    const expFGs = experiences.map((exp: Experience) => this.fb.group({
      employeur: exp.employeur || '',
      position: exp.position || '',
      missions: exp.missions ? (Array.isArray(exp.missions) ? exp.missions.join('\n') : exp.missions) : '',
      technologies: exp.technologies ? (Array.isArray(exp.technologies) ? exp.technologies.join('\n') : exp.technologies) : '',
      date_debut: exp.date_debut || '',
      date_fin: exp.date_fin || ''
    }));
    const expFormArray = this.fb.array(expFGs);
    this.cvForm.setControl('experiences', expFormArray);
  }

  removeExperience(index: number): void {
    this.experiences.removeAt(index);
  }

  adjustTextareaHeight(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }

  loadCVData(cvId: number): void {
    this.isLoading = true;
    this.cvService.getCV(cvId).subscribe({
      next: (cv: CV) => {
        this.populateForm(cv);
        this.isLoading = false;
        this.cvGenerated = true;
      },
      error: (err: any) => {
        console.error('Erreur lors du chargement du CV :', err);
        this.isLoading = false;
      }
    });
  }

  populateForm(cv: CV): void {
    this.cvForm.patchValue({
      title: cv.title || '',
      username: cv.username || '',
      email: cv.email || '',
      poste_actuel: cv.poste_actuel || '',
      annees_experience: cv.annees_experience || null,
      overview: cv.overview || '',
      skills: cv.skills ? cv.skills.join('\n') : '',
      languages: cv.languages ? cv.languages.join(', ') : '',
      certifications: cv.certifications ? cv.certifications.join('\n') : ''
    });
    const experiences = cv.experiences || [];
    this.setExperiences(experiences);
  }

  onSubmit(): void {
    if (this.isLoading) return;
    this.isLoading = true;

    const formValue = this.cvForm.value;
    const cv: CV = {
      ...formValue,
      skills: formValue.skills ? formValue.skills.split('\n').map((s: string) => s.trim()).filter((s: string) => s) : [],
      languages: formValue.languages ? formValue.languages.split(',').map((l: string) => l.trim()).filter((l: string) => l) : [],
      certifications: formValue.certifications ? formValue.certifications.split('\n').map((c: string) => c.trim()).filter((c: string) => c) : [],
      experiences: formValue.experiences.map((exp: { employeur: string; position: string; missions: string; technologies: string; date_debut: string; date_fin: string | null }) => ({
        ...exp,
        missions: exp.missions ? exp.missions.split('\n').map((m: string) => m.trim()).filter((m: string) => m) : [],
        technologies: exp.technologies ? exp.technologies.split('\n').map((t: string) => t.trim()).filter((t: string) => t) : [],
        date_debut: exp.date_debut || '',
        date_fin: exp.date_fin || null
      }))
    };

    delete cv.utilisateur;
    console.log('Données envoyées au backend :', JSON.stringify(cv, null, 2));

    if (this.isEditMode && this.cvId) {
      this.cvService.updateCV(this.cvId, cv).subscribe({
        next: (blob: Blob) => {
          this.successMessage = "Le CV a été mis à jour avec succès. Sof'Talent peut faire des erreurs dans la version anglaise, à valider avant usage.";
          this.cvGenerated = true;
          this.isLoading = false;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.cvForm.get('username')?.value || 'unknown'}_CV_updated.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
        },
        error: (err: any) => {
          console.error('Erreur lors de la mise à jour :', err);
          this.isLoading = false;
        }
      });
    } else {
      this.cvService.createCV(cv).subscribe({
        next: (blob: Blob) => {
          this.successMessage = "Le CV a été créé avec succès. Sof'Talent peut faire des erreurs dans la version anglaise, à valider avant usage.";
          this.isEditMode = true;
          this.cvGenerated = true;
          this.isLoading = false;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${this.cvForm.get('username')?.value || 'unknown'}_CV.pdf`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);
          this.router.navigate(['/cv', this.cvService.getLastCreatedCvId() || '']);
        },
        error: (err: any) => {
          console.error('Erreur lors de la création :', err);
          this.isLoading = false;
        }
      });
    }
  }

  downloadCV(): void {
    if (!this.cvId) {
      alert('Veuillez d\'abord enregistrer votre CV.');
      return;
    }
    this.isLoading = true;
    this.cvService.downloadCV(this.cvId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        a.download = `${this.cvForm.get('username')?.value || 'document'}_CV.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors du téléchargement du CV :', err);
        this.isLoading = false;
        alert('Erreur lors du téléchargement. Veuillez réessayer.');
      }
    });
  }

  previewCV(): void {
    if (!this.cvId) {
      alert('Veuillez d\'abord enregistrer votre CV.');
      return;
    }
    this.isLoading = true;
    this.cvService.previewCV(this.cvId).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        window.open(url, '_blank');
        window.URL.revokeObjectURL(url);
        this.isLoading = false;
      },
      error: (err: any) => {
        console.error('Erreur lors de la prévisualisation du CV :', err);
        this.isLoading = false;
        alert('Erreur lors de la prévisualisation. Veuillez réessayer.');
      }
    });
  }
}