import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslateService } from '../../services/translate.service';

@Pipe({
  name: 't',
  standalone: true,
  pure: false, // re-evaluates once translations finish loading async
})
export class TranslatePipe implements PipeTransform {
  private translate = inject(TranslateService);

  transform(key: string, params?: Record<string, string | number>): string {
    return this.translate.instant(key, params);
  }
}
