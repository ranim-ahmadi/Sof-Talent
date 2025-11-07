import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors, FormArray } from '@angular/forms';
import { FichePosteService, FichePoste } from 'src/app/services/fiche-poste.service';
import { HttpErrorResponse } from '@angular/common/http';

@Component({
  selector: 'app-fiche-poste-form',
  templateUrl: './fiche-poste-form.component.html',
  styleUrls: ['./fiche-poste-form.component.scss']
})
export class FichePosteFormComponent {
  fichePosteForm: FormGroup;
  errorMessage: string | null = null;
  successMessage: string | null = null;
  isLoading: boolean = false;

  constructor(private fb: FormBuilder, private cvService: FichePosteService) {
    this.fichePosteForm = this.fb.group({
      title: ['', [Validators.required, Validators.maxLength(255)]],
      job_objectives: ['', Validators.required],
      main_tasks: ['', Validators.required],
      profile: this.fb.group({
        total_experience_years: [0, [Validators.required, Validators.min(0)]],
        specific_experience_years: [0, Validators.min(0)],
        experience_role: [''],
        education: ['', Validators.required]
      }, { validators: this.experienceYearsValidator }),
      technical_skills: ['', Validators.required],
      personal_qualities: [''],
      keywords: this.fb.array([])
    });
  }

  // Getter pour accéder au FormArray des mots-clés
  get keywordsFormArray(): FormArray {
    return this.fichePosteForm.get('keywords') as FormArray;
  }

  // Ajouter un mot-clé
  addKeyword(): void {
    this.keywordsFormArray.push(this.fb.control('', Validators.required));
  }

  // Supprimer un mot-clé
  removeKeyword(index: number): void {
    this.keywordsFormArray.removeAt(index);
  }

  // Validateur personnalisé pour s'assurer que specific_experience_years <= total_experience_years
  experienceYearsValidator(control: AbstractControl): ValidationErrors | null {
    const totalYears = control.get('total_experience_years')?.value;
    const specificYears = control.get('specific_experience_years')?.value;
    if (specificYears > totalYears) {
      return { experienceMismatch: true };
    }
    return null;
  }

  onSubmit(): void {
    console.log('Formulaire soumis:', this.fichePosteForm.value);
    if (this.fichePosteForm.invalid) {
      this.errorMessage = 'Veuillez remplir tous les champs requis.';
      return;
    }

    // Vérifier la validation personnalisée pour les années d'expérience
    const profileGroup = this.fichePosteForm.get('profile') as FormGroup;
    if (profileGroup.hasError('experienceMismatch')) {
      this.errorMessage = 'Le nombre d’années d’expérience spécifique ne peut pas dépasser le nombre total d’années d’expérience.';
      return;
    }

    this.errorMessage = null;
    this.successMessage = null;
    this.isLoading = true;

    const formData = this.fichePosteForm.value;

    // Nettoyer et formater main_tasks
    let mainTasks = formData.main_tasks;
    mainTasks = mainTasks.replace(/➢|[\uF0B7-\uF0BF]|^[\s-]+|[\s-]+$/g, '').trim();
    mainTasks = mainTasks.replace(/\n+/g, '\n');
    const tasksLines = mainTasks.split('\n').filter((line: string) => line.trim()).join('\n');

    // Nettoyer technical_skills
    let technicalSkills = formData.technical_skills;
    technicalSkills = technicalSkills.replace(/➢|[\uF0B7-\uF0BF]|^[\s-]+|[\s-]+$/g, '').trim();
    technicalSkills = technicalSkills.replace(/\n+/g, '\n');
    const skillsList = technicalSkills.split('\n').filter((skill: string) => skill.trim());

    // Nettoyer personal_qualities
    let personalQualities = formData.personal_qualities || '';
    personalQualities = personalQualities.replace(/➢|[\uF0B7-\uF0BF]|^[\s-]+|[\s-]+$/g, '').trim();
    personalQualities = personalQualities.replace(/\n+/g, '\n');
    const qualitiesList = personalQualities.split('\n').filter((quality: string) => quality.trim());

    const formattedData: FichePoste = {
      title: formData.title,
      job_objectives: formData.job_objectives,
      main_tasks: tasksLines,
      profile: {
        education: formData.profile.education,
        total_experience_years: formData.profile.total_experience_years,
        specific_experience_years: formData.profile.specific_experience_years,
        experience_role: formData.profile.experience_role
      },
      technical_skills: skillsList,
      personal_qualities: qualitiesList,
      keywords: formData.keywords
    };

    this.cvService.createFichePoste(formattedData).subscribe({
      next: (response) => {
        this.successMessage = 'Fiche de poste créée avec succès ! Téléchargement du PDF en cours...';
        this.isLoading = false;

        const blob = new Blob([response.body as BlobPart], { type: 'application/pdf' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Fiche_de_poste_${formData.title.replace(/\s+/g, '_')}.pdf`;
        a.click();
        window.URL.revokeObjectURL(url);
      },
      error: (error: HttpErrorResponse) => {
        this.errorMessage = error.message || 'Erreur lors de la création de la fiche de poste.';
        this.isLoading = false;
        console.error('Erreur:', error);
      }
    });
  }

  adjustTextareaHeight(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight}px`;
  }
}