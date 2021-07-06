import { scrapeFlow } from './wattpad';

// @ts-ignore
// eslint-disable-next-line import/extensions
// import { ExtPay } from '../../ExtPay.js';
import { sendMessage } from '../../modules/helpers';

function run() {
  const interval = setInterval(async () => {
    const actions = document.querySelector('.story-actions') as HTMLElement;

    if (actions && !document.querySelector('#send-to-kindle')) {
      const btn = document.createElement('button') as HTMLElement;

      actions.style.flexWrap = 'wrap';
      actions.style.marginTop = '-10px';
      btn.id = 'send-to-kindle';
      btn.style.flex = '1 0 100%';
      btn.style.flex = 'wrap';
      btn.style.maxWidth = '305px';
      btn.style.marginTop = '10px';

      btn.innerText = 'Send to My Kindle 📲';
      btn.classList.add('btn-primary');

      btn.onclick = async () => {
        const isPro = await sendMessage('getUserStatus', {});

        await scrapeFlow(!!isPro);
      };

      actions.appendChild(btn);
      clearInterval(interval);
    }
  }, 100);
}
// function addObserver() {
//   var observer = new MutationObserver((mutations) => {
//     mutations.forEach((mutation) => {
//       if (document.querySelector('.story-actions')) {
//         run();
//
//         observer.disconnect();
//       }
//     });
//   });
//
//   observer.observe(document.body, {
//     childList: true,
//     subtree: true, // needed if the node you're targeting is not the direct parent
//   });
// }

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log(message);

  if (message.type === 'run') {
    run();
  }
});
