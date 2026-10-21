import catalogJson from '@shared/catalog.json';
import type { CatalogApp } from '../core/agent/types';
import { api, ApiError, PREVIEW } from '../core/agent/api';
import { navigate } from '../core/router';
import { toast } from '../core/store/toast';
import { translate, type Lang } from '../core/i18n';

export const APPS = catalogJson.apps as CatalogApp[];
export const appById = (id: string) => APPS.find((a) => a.id === id);

export type SupportLevel = 'works' | 'drm-limited' | 'builtin';
export const supportOf = (app: CatalogApp): SupportLevel => (app.kind === 'builtin' ? 'builtin' : (app.support as SupportLevel));

/**
 * Opens an app. Built-ins are routes inside the shell; web apps are launched by the agent in a separate
 * Chromium window (kiosk) so DRM, logins and cookies work like a normal browser.
 */
export async function launchApp(app: CatalogApp, lang: Lang, platform: string | null) {
  const t = (k: string, v?: Record<string, string>) => translate(lang, k, v);
  if (app.kind === 'builtin') {
    navigate({ name: app.route as 'media' | 'files' });
    return;
  }
  if (PREVIEW) {
    toast({ title: t('preview.title'), body: t('preview.launch', { name: app.name }) }, 6000);
    return;
  }
  try {
    await api.post(`/api/apps/${app.id}/launch`);
    toast({
      title: t('apps.launched', { name: app.name }),
      body: platform === 'darwin' ? t('apps.returnHintMac') : t('apps.returnHintLinux'),
      tone: 'success',
    });
  } catch (e) {
    const err = e as ApiError;
    if (err.status === 0 && app.url) {
      // Agent down (e.g. UI opened directly in a browser): fall back to a plain tab so the button still does something real.
      window.open(app.url, '_blank', 'noopener');
      toast({ title: t('apps.openedHere') });
    } else if (err.body?.code === 'no-browser') {
      toast({ title: t('apps.noBrowser'), tone: 'error' }, 7000);
    } else {
      toast({ title: err.message, tone: 'error' });
    }
  }
}
