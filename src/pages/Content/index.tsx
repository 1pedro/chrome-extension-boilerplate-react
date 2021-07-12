import { scrapeFlow } from './wattpad';

import { sendMessage } from '../../modules/helpers';

function run() {
  console.log('ryb');
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
        const [isPro, subscriptionStatus] = (await sendMessage(
          'getUserStatus',
          {}
        )) as [boolean, string];

        await scrapeFlow(isPro, subscriptionStatus);
      };

      actions.appendChild(btn);
      clearInterval(interval);
    }
  }, 100);
}

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'run') {
    run();
  }
});
