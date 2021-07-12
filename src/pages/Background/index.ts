import { getUserStatus, manageSubscription } from '../../modules/helpers';

export async function getStage(): Promise<string> {
  // eslint-disable-next-line no-async-promise-executor
  return new Promise(async (resolve, reject) => {
    const mgmt = await chrome.management.getSelf();

    if (mgmt.installType === 'development') {
      resolve('dev');
    } else {
      resolve('prod');
    }
  });
}

try {
  chrome.runtime.onMessage.addListener(
    (request: { data?: any; type: string }, sender: any, sendResponse: any) => {
      console.log(request);

      if (request.type === 'getUserStatus') {
        getUserStatus().then((status) => sendResponse(status));
      }

      if (request.type === 'getStage') {
        getStage().then((stage) => sendResponse(stage));
      }

      if (
        request.type === 'manageSubscription' ||
        request.type === 'handleRenew'
      ) {
        manageSubscription();
      }

      return true; // Will respond asynchronously.
    }
  );

  if (chrome?.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener(
      async (tabId: number, changeInfo: any, tab: any) => {
        if (tab.url && tab.url.includes('wattpad.com')) {
          chrome.tabs.sendMessage(tabId, { type: 'run' });
        }
      }
    );
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error.message);
}
