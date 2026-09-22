import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

type TranslationTree = { [key: string]: string | TranslationTree };

@Injectable({ providedIn: 'root' })
export class TranslateService {
  private http = inject(HttpClient);
  private tree = signal<TranslationTree>({});
  readonly ready = signal(false);

  async load(): Promise<void> {
    const data = await firstValueFrom(
      this.http.get<TranslationTree>('assets/i18n/en.json')
    );
    this.tree.set(data);
    this.ready.set(true);
  }

  /** Resolves "list.heading" style keys, with optional {{param}} interpolation. */
  instant(key: string, params?: Record<string, string | number>): string {
    const parts = key.split('.');
    let node: string | TranslationTree | undefined = this.tree();
    for (const part of parts) {
      if (typeof node !== 'object' || node === null) {
        node = undefined;
        break;
      }
      node = node[part];
    }
    if (typeof node !== 'string') {
      return key; // visible fallback so missing keys are obvious in dev/QA
    }
    if (!params) return node;
    return node.replace(/{{\s*(\w+)\s*}}/g, (_, name) =>
      params[name] !== undefined ? String(params[name]) : `{{${name}}}`
    );
  }
}
