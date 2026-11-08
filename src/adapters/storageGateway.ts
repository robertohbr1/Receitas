import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Contrato fino de persistência local chave-valor para desacoplar o banco offline.
 */
export interface KeyValueStorageGateway {
  readRawString(storageKey: string): Promise<string | null>;
  writeRawString(storageKey: string, serializedPayload: string): Promise<void>;
}

/**
 * Implementação de armazenamento offline baseada no AsyncStorage do React Native.
 */
export class AsyncStorageGateway implements KeyValueStorageGateway {
  /**
   * Lê uma string persistida localmente pela chave informada.
   *
   * @example
   * const raw = await gateway.readRawString('@caderno_receitas:v1');
   */
  public async readRawString(storageKey: string): Promise<string | null> {
    if (!storageKey.trim()) {
      throw new Error(
        `Chave de leitura inválida: "${storageKey}". Esperado: string não vazia.`,
      );
    }
    return AsyncStorage.getItem(storageKey);
  }

  /**
   * Grava uma string serializada localmente sob a chave informada.
   *
   * @example
   * await gateway.writeRawString('@caderno_receitas:v1', JSON.stringify(items));
   */
  public async writeRawString(
    storageKey: string,
    serializedPayload: string,
  ): Promise<void> {
    if (!storageKey.trim()) {
      throw new Error(
        `Chave de gravação inválida: "${storageKey}". Esperado: string não vazia.`,
      );
    }
    await AsyncStorage.setItem(storageKey, serializedPayload);
  }
}
