import { InMemoryCredentialStore } from '@earendil-works/pi-ai';
import { ModelRuntime } from '@earendil-works/pi-coding-agent';
import { AsyncEntry } from '@napi-rs/keyring';
import type { Provider } from '../shared/contracts.js';
import { DomainError } from './errors.js';

export interface SecretStore {
  get(id: string): Promise<string | null>;
  set(id: string, key: string): Promise<void>;
  remove(id: string): Promise<void>;
}
export class KeychainSecrets implements SecretStore {
  private entry(id: string) {
    return new AsyncEntry('cn.skstudio.agentic-research', id);
  }
  get(id: string) {
    return this.entry(id).getPassword();
  }
  set(id: string, key: string) {
    return this.entry(id).setPassword(key);
  }
  async remove(id: string) {
    await this.entry(id).deleteCredential();
  }
}
export async function createModelRuntime(provider: Provider, secrets: SecretStore) {
  const key = await secrets.get(provider.id);
  if (provider.hasKey && !key) throw new DomainError('keyMissing');
  const runtime = await ModelRuntime.create({
    credentials: new InMemoryCredentialStore(),
    modelsPath: null,
    refreshOnCreate: false,
  });
  runtime.registerProvider(provider.id, {
    baseUrl: provider.baseUrl,
    api: provider.api,
    authHeader: Boolean(key),
    models: [
      {
        id: provider.model,
        name: provider.model,
        api: provider.api,
        reasoning: false,
        input: ['text'],
        cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
        contextWindow: provider.contextWindow,
        maxTokens: provider.maxTokens,
      },
    ],
  });
  await runtime.setRuntimeApiKey(provider.id, key || 'local-no-key');
  const model = runtime.getModel(provider.id, provider.model);
  if (!model) throw new DomainError('invalidModel');
  return { runtime, model };
}
