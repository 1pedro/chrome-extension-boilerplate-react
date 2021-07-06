// @ts-ignore
// eslint-disable-next-line import/extensions
import { ExtPay } from '../../ExtPay.js';

async function getUserStatus() {
  const ext = ExtPay('wattpad-to-kindle-e-reader');

  // // await sleep(200);
  // //
  // // return true;
  // console.log(ext);
  // console.log('getUser');
  const user = await ext.getUser();

  return user.paid;
}

try {
  chrome.runtime.onMessage.addListener(
    (request: { data?: any; type: string }, sender: any, sendResponse: any) => {
      if (request.type === 'getUserStatus') {
        getUserStatus().then((status) => sendResponse(status));
      }

      return true; // Will respond asynchronously.
    }
  );

  if (chrome?.tabs?.onUpdated) {
    chrome.tabs.onUpdated.addListener(
      async (tabId: number, changeInfo: any, tab: any) => {
        if (tab.url && tab.url.includes('wattpad.com')) {
          chrome.tabs.sendMessage(tabId, { type: 'run' });
          // console.log('sending message');
          // sendMessage('run', {});
        }
      }
    );
  }
} catch (error) {
  // eslint-disable-next-line no-console
  console.error(error.message);
}
