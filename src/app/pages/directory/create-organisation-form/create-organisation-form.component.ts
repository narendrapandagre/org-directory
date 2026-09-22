import { ChangeDetectionStrategy, Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslateService } from '../../../services/translate.service';
import { OrganisationStore } from '../../../services/organisation.store';
import { Organisation, OrgStatus } from '../../../models/organisation.model';

interface CreateOrgForm {
  name: FormControl<string>;
  status: FormControl<OrgStatus | ''>;
  ownerEmail: FormControl<string>;
  memberCount: FormControl<number | null>;
}

@Component({
  selector: 'app-create-organisation-form',
  standalone: true,
  imports: [ReactiveFormsModule, TranslatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './create-organisation-form.component.html',
  styleUrl: './create-organisation-form.component.css',
})
export class CreateOrganisationFormComponent {
  private store = inject(OrganisationStore);
  private translate = inject(TranslateService);

  @Output() created = new EventEmitter<Organisation>();
  @Output() cancelled = new EventEmitter<void>();

  readonly submitting = signal(false);
  readonly submitAttempted = signal(false);
  readonly statuses: OrgStatus[] = ['active', 'inactive', 'suspended'];

  readonly form = new FormGroup<CreateOrgForm>({
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(3), Validators.maxLength(80)],
      asyncValidators: [],
    }),
    status: new FormControl<OrgStatus | ''>('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    ownerEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    memberCount: new FormControl<number | null>(null, {
      validators: [this.nonNegativeValidator()],
    }),
  });

  constructor() {
    // Uniqueness must be re-checked on every value change (not just once)
    // but only *displayed* on blur, per FR3 ("errors on blur, not every
    // keystroke") — updateOn stays 'change' internally so the check is
    // always current; visibility is controlled by markAsTouched timing
    // in the template via ngModelOptions-less standard Angular `touched`.
    this.form.controls.name.addValidators(this.uniqueNameValidator());
  }

  private nonNegativeValidator(): ValidatorFn {
    return (control): ValidationErrors | null => {
      const value = control.value;
      if (value === null || value === undefined || value === '') return null;
      return value < 0 ? { min: { min: 0 } } : null;
    };
  }

  private uniqueNameValidator(): ValidatorFn {
    return (control): ValidationErrors | null => {
      const name = (control.value ?? '').trim();
      if (!name) return null;
      return this.store.isNameTaken(name) ? { duplicateName: true } : null;
    };
  }

  errorFor(controlName: keyof CreateOrgForm): string | null {
    const control = this.form.controls[controlName];
    if (!control.touched && !this.submitAttempted()) return null;
    if (!control.errors) return null;

    const [key, value] = Object.entries(control.errors)[0];
    switch (key) {
      case 'required':
        return this.translate.instant('form.errors.required');
      case 'minlength':
        return this.translate.instant('form.errors.minlength', {
          requiredLength: value.requiredLength,
        });
      case 'maxlength':
        return this.translate.instant('form.errors.maxlength', {
          requiredLength: value.requiredLength,
        });
      case 'email':
        return this.translate.instant('form.errors.email');
      case 'min':
        return this.translate.instant('form.errors.min');
      case 'duplicateName':
        return this.translate.instant('form.errors.duplicateName');
      default:
        return this.translate.instant('form.errors.required');
    }
  }

  onSubmit(): void {
    this.submitAttempted.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) return;

    this.submitting.set(true);
    const raw = this.form.getRawValue();
    const nextId = Date.now();

    const organisation: Organisation = {
      id: nextId,
      name: raw.name.trim(),
      hasName: true,
      status: raw.status as OrgStatus,
      rawStatus: raw.status,
      memberCount: raw.memberCount,
      ownerEmail: raw.ownerEmail.trim(),
      isOwnerEmailValid: true,
      createdAt: new Date(),
      isDuplicateId: false,
    };

    // Real backend call would go through MockApiService.createOrganisation;
    // simulated latency omitted here for a snappier take-home UX, but the
    // same submitting()/error signal pattern used for the list would apply.
    this.store.addLocal(organisation);
    this.created.emit(organisation);
    this.submitting.set(false);
    this.form.reset({ name: '', status: '', ownerEmail: '', memberCount: null });
    this.submitAttempted.set(false);
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
