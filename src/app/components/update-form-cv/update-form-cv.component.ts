import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { CvService, CV, Experience } from '../../services/cv.service';
import { Router, ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-update-form-cv',
  templateUrl: './update-form-cv.component.html',
  styleUrls: ['./update-form-cv.component.scss']
})
export class UpdateFormCvComponent implements OnInit {
  cvForm: FormGroup;
  isEditMode = true;
  cvId?: number;
  isLoading = false;
  cvGenerated = false;

  constructor(
    private fb: FormBuilder,
    private cvService: CvService,
    private router: Router,
    private route: ActivatedRoute
  ) {
    this.cvForm = this.fb.group({
      username: [''],
      title: [''],
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
          technologies: [''],  // Champ technologies déjà présent
          date_debut: [''],
          date_fin: ['']
        })
      ])
    });
  }

  ngOnInit(): void {
    this.cvId = this.route.snapshot.params['id'];
    if (this.cvId) {
      this.loadCVData(this.cvId);
    } else {
      this.router.navigate(['/']);
    }
  }

  get experiences() {
    return this.cvForm.get('experiences') as FormArray;
  }

  addExperience(): void {
    this.experiences.push(this.fb.group({
      employeur: [''],
      position: [''],
      missions: [''],
      technologies: [''],  // Champ technologies déjà présent
      date_debut: [''],
      date_fin: ['']
    }));
  }

  setExperiences(experiences: Experience[]): void {
    const expFGs = experiences.map(exp => {
      // Gérer différents formats de missions
      let missionsValue = '';
      if (Array.isArray(exp.missions)) {
        missionsValue = exp.missions.join('\n');
      } else if (typeof exp.missions === 'string') {
        missionsValue = exp.missions;
      }
      // Gérer différents formats de technologies
      let technologiesValue = '';
      if (Array.isArray(exp.technologies)) {
        technologiesValue = exp.technologies.join('\n');
      } else if (typeof exp.technologies === 'string') {
        technologiesValue = exp.technologies;
      }
      return this.fb.group({
        employeur: [exp.employeur || ''],
        position: [exp.position || ''],
        missions: [missionsValue],
        technologies: [technologiesValue],  // Ajout de technologies
        date_debut: [exp.date_debut || ''],
        date_fin: [exp.date_fin || '']
      });
    });
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
        console.log('CV chargé :', JSON.stringify(cv, null, 2));
        this.populateForm(cv);
        this.isLoading = false;
        this.cvGenerated = true;
      },
      error: (err) => {
        console.error('Erreur lors du chargement du CV :', err);
        this.isLoading = false;
      }
    });
  }

  populateForm(cv: CV): void {
    this.cvForm.patchValue({
      username: cv.username || '',
      email: cv.email || '',
      poste_actuel: cv.poste_actuel || '',
      title: cv.title || '',
      annees_experience: cv.annees_experience || null,
      overview: cv.overview || '',
      skills: cv.skills ? cv.skills.join(', ') : '',
      languages: cv.languages ? cv.languages.join(', ') : '',
      certifications: cv.certifications ? cv.certifications.join(', ') : ''
    });
    this.setExperiences(cv.experiences || []);
  }

  onSubmit(): void {
    if (this.isLoading || !this.cvForm.valid || !this.cvId) return;
    this.isLoading = true;

    const formValue = this.cvForm.value;
    const cv: CV = {
      ...formValue,
      skills: formValue.skills ? formValue.skills.split(',').map((s: string) => s.trim()) : [],
      languages: formValue.languages ? formValue.languages.split(',').map((l: string) => l.trim()) : [],
      certifications: formValue.certifications ? formValue.certifications.split(',').map((c: string) => c.trim()) : [],
      experiences: formValue.experiences.map((exp: any) => ({
        ...exp,
        missions: exp.missions ? exp.missions.split(/,|\n/).map((m: string) => m.trim()) : [],
        technologies: exp.technologies ? exp.technologies.split(/,|\n/).map((t: string) => t.trim()) : []  // Ajout de technologies
      }))
    };

    console.log('Données envoyées pour mise à jour :', JSON.stringify(cv, null, 2));

    this.cvService.updateCV(this.cvId, cv).subscribe({
      next: (blob: Blob) => {
        console.log('CV mis à jour avec succès');
        alert('CV mis à jour avec succès !');
        this.cvGenerated = true;
        this.isLoading = false;
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CV_${this.cvForm.get('username')?.value || 'unknown'}_updated.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.router.navigate(['/choose-cv-action']);
      },
      error: (err) => {
        console.error('Erreur lors de la mise à jour :', err);
        this.isLoading = false;
        alert('Erreur lors de la mise à jour. Veuillez réessayer.');
      }
    });
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
        a.download = `CV_${this.cvForm.get('username')?.value || 'document'}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        this.isLoading = false;
      },
      error: (err) => {
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
      error: (err) => {
        console.error('Erreur lors de la prévisualisation du CV :', err);
        this.isLoading = false;
        alert('Erreur lors de la prévisualisation. Veuillez réessayer.');
      }
    });
  }
}