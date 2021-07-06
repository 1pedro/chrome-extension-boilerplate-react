import { getPlatform } from './helpers';

const platform = getPlatform();

export async function clear() {
  return chrome.storage.local.clear(() => {
    const error = chrome.runtime.lastError;

    if (error) {
      // eslint-disable-next-line no-console
      console.error(error);
    }
  });
}

export async function get(arrayOfObjects: string[]): Promise<any> {
  return new Promise((resolve) => {
    chrome.storage.local.get(arrayOfObjects, (storageData: any) => {
      resolve(storageData);
    });
  });
}

export async function set(object: any) {
  return chrome.storage.local.set(object);
}
