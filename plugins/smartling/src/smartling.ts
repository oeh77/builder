import pkg from '../package.json';
import appState from '@builder.io/app-context';
import { getTranslationModel } from './model-template';

export class SmartlingApi {
  getBaseUrl(path: string, search = {}) {
    const params = new URLSearchParams({
      ...search,
      pluginId: pkg.name,
      apiKey: appState.user.apiKey,
    });

    const baseUrl = new URL(`${appState.config.apiRoot()}/api/v1/smartling/${path}`);
    baseUrl.search = params.toString();
    return baseUrl.toString();
  }
  constructor(private privateKey: string) {}

  request(path: string, config?: RequestInit, search = {}) {
    return fetch(`${this.getBaseUrl(path, search)}`, {
      ...config,
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json',
      },
    }).then(res => res.json());
  }
  // todo separate types
  getProject(): Promise<{
    project: {
      targetLocales: Array<{ enabled: boolean; localeId: string }>;
      sourceLocaleId: string;
    };
  }> {
    return this.request('project');
  }

  getJob(id: string): Promise<{ job: any }> {
    return this.request('job', { method: 'GET' }, { id });
  }

  createLocalJob(name: string, content: any[]): Promise<any> {
    const translationModel = getTranslationModel();
    return appState.createContent(translationModel.name, {
      name,
      meta: {
        createdBy: pkg.name,
      },
      data: {
        entries: content.map(getContentReference),
      },
    });
  }
  async updateLocalJob(jobId: string, content: any[]) {
    const latestDraft = await appState.getLatestDraft(jobId);
    const draft = {
      ...latestDraft,
      data: {
        ...latestDraft.data,
        entries: [...(latestDraft.data.entries || []), ...content.map(c => getContentReference(c))],
      },
    };
    appState.updateLatestDraft(draft);
  }

  applyTranslation(id: string, model: string) {
    return this.request('apply-translation', {
      method: 'POST',
      body: JSON.stringify({
        id,
        model,
      }),
    });
  }
}

function getContentReference(content: any) {
  return {
    content: {
      '@type': '@builder.io/core:Reference',
      id: content.id,
      model: content.modelName,
    },
    preview:
      content.previewUrl || content.meta?.get?.('lastPreviewUrl') || content.meta?.lastPreviewUrl,
  };
}
