import { logger } from '@gilbarbara/helpers';
// @ts-ignore
import Jepub from 'jepub';
import { v4 } from 'uuid';

import { FREE_CONVERT_DELAY, FREE_MAX_EXPORTS, HIDE_LOGS } from '../../config';
// @ts-ignore
// eslint-disable-next-line import/extensions
import { ExtPay } from '../../ExtPay.js';
import {
  fetchCorsImage,
  fetchImage,
  getElementAttribute,
  getUrlFromFile,
  handleConvert,
  makeId,
  sleep,
} from '../../modules/helpers';
import { get, set } from '../../modules/localStorage';
import { BlobImage, BuildEpub, Chapter } from '../../types';

let file: Blob | null = null;
let err: string | null = null;
const month = `${new Date().getMonth()}/${new Date().getFullYear()}`;
const ext = ExtPay('wattpad-to-kindle-e-reader');
const PRE_STYLE = `-webkit-text-size-adjust: 100%;
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
    -webkit-box-direction: normal;
    box-sizing: border-box;
    overflow: auto;
    margin: 12px 0 21px;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: "Source Sans Pro","Helvetica Neue",Helvetica,Arial,sans-serif;
    color: #121212;
    font-style: normal;
    font-weight: 400;
    font-size: 16px;
    line-height: 22px;`;

let abort = false;

async function getPart(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    return fetch(url)
      .then((response) => resolve(response.text()))
      .catch((error) => reject(error));
  });
}

export async function scrapeFlow(isPro: boolean) {
  abort = false;
  const { exportsMade = {}, kindleEmail = '' } =
    (await get(['exportsMade', 'kindleEmail'])) || {};

  logger(
    'wattpad.ts',
    'scrapeFlow:localStorageData',
    { exportsMade, kindleEmail },
    {
      skip: HIDE_LOGS,
      typeColor: '#f00',
    }
  );

  await toggleGenerating(isPro);
  const title =
    getElementAttribute('.story-info__title', 'innerText') || 'No Title';

  const author =
    getElementAttribute('.author-info__username', 'innerText') || 'No Author';

  const description =
    getElementAttribute('.description', 'innerHTML') || 'No Description';

  logger(
    'wattpad.ts',
    'scrapeFlow:gettingBookInfo',
    { title, author, description },
    {
      skip: HIDE_LOGS,
      typeColor: '#f00',
    }
  );

  const tagElements = [
    ...document.querySelectorAll('.tag-items li'),
  ] as HTMLElement[];
  const tags =
    tagElements?.map((tag) => `#${tag.innerText}` || '').filter(Boolean) || [];

  let cover: BlobImage | boolean = false;

  if (document.querySelector('.story-cover img')) {
    try {
      [cover] = await getImages(
        [document.querySelector('.story-cover img') as HTMLImageElement],
        isPro,
        true
      );
    } catch (error) {
      err = `Could not append cover ${error.message}`;

      // eslint-disable-next-line no-console
      console.error(`Could not append cover${error.message}`);
      showError(err);
    }
  }

  const chapters: Chapter[] = [];
  let blobImages: BlobImage[] = [];

  const parts = [
    ...document.querySelectorAll('.story-parts ul li'),
  ] as HTMLElement[];

  if (!parts) {
    err = 'Could not find a chapter for this story';
    // eslint-disable-next-line no-console
    console.error('No parts was found');

    showError(err);

    return;
  }

  parts.map((part) => updatePartStatus(part, 'PENDING'));

  const items = parts.map((part, index) => {
    const link = part.children[0] as HTMLLinkElement;

    return { index, url: link.href };
  });

  for (const item of items) {
    if (abort) {
      // eslint-disable-next-line no-continue
      continue;
    }

    try {
      const part = parts[item.index] as HTMLElement;

      updatePartStatus(part, 'SCRAPPING');
      // eslint-disable-next-line no-await-in-loop
      const rawPartHTML = await getPart(item.url);
      const parser = new DOMParser();
      const doc = parser.parseFromString(rawPartHTML, 'text/html');
      const panel = doc.querySelectorAll('.panel.panel-reading')[1];

      logger(
        'wattpad.ts',
        'scrapeFlow:gettingParts',
        { part, parser, doc, panel },
        {
          skip: HIDE_LOGS,
          typeColor: '#f00',
        }
      );

      if (!panel && !abort) {
        err = `Could not get content from chapter ${part.innerText}. Try again.`;
        // eslint-disable-next-line no-continue
        throw new Error(err);
      }

      if ([...panel.querySelectorAll('figcaption')].length && !abort) {
        [...panel.querySelectorAll('figcaption')].map((figure) =>
          figure.remove()
        );
      }

      if ([...panel.querySelectorAll('img')].length && !abort) {
        const images = [...panel.querySelectorAll('img')] as HTMLImageElement[];

        // eslint-disable-next-line no-param-reassign
        console.log('isPro', isPro);

        try {
          // eslint-disable-next-line no-await-in-loop
          const parsedImages = await getImages(images, isPro, false);

          blobImages = [...blobImages, ...parsedImages];
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error('Could not add image');
        }
      }

      chapters.push({
        content: panel.innerHTML,
        title: part?.innerText,
      });

      updatePartStatus(part, 'FINISHED');
      // eslint-disable-next-line no-await-in-loop
      !isPro && (await sleep(FREE_CONVERT_DELAY));
    } catch (error) {
      showError(error.message);
    }
  }

  if (abort) {
    return;
  }

  file = await buildEpub({
    title,
    author,
    language: 'pt',
    chs: chapters,
    images: blobImages,
    description,
    tags,
    cover,
  });

  await toggleGenerating(isPro);

  file &&
    !abort &&
    (await downloadBookPanel(
      getUrlFromFile(file),
      isPro,
      exportsMade,
      kindleEmail
    ));
}

async function buildEpub(input: BuildEpub) {
  const { author, chs, cover, description, images, language, tags, title } =
    input;
  const jepub = new Jepub();

  if (!chs) {
    err = 'No Chapter was provided.';
    throw new Error('No Chapter was provided.');
  }

  jepub.init({
    i18n: language, // Internationalization
    title,
    author,
    publisher:
      'Wattpad © (https://wattpad.com) and Wattpad to Kindle E-reader (https://xstudio.digital/wattpad)',
    description, // optional
    tags, // optional
  });

  if (typeof cover !== 'boolean') {
    jepub.cover(cover.blob);
  }

  logger('wattpad.ts', 'buildEpub:images', images, {
    skip: HIDE_LOGS,
    typeColor: '#f00',
  });
  images &&
    images.forEach((img) => {
      jepub.image(img.blob, img.id, img.alt);
    });

  jepub.date(new Date());
  jepub.uuid(v4());

  for (const ch of chs) {
    jepub.add(ch.title, ch.content);
  }

  return jepub.generate('blob', (metadata: any) => {
    console.log(`progression: ${metadata.percent.toFixed(2)} %`);

    if (metadata.currentFile) {
      console.log(`current file = ${metadata.currentFile}`);
    }
  });
}

function updatePartStatus(el: HTMLElement, STATUS: string) {
  if (abort) {
    return;
  }

  el.classList.remove(...el.classList);

  if (STATUS === 'PENDING') {
    el.classList.add('pending');
  }

  if (STATUS === 'SCRAPPING') {
    const story = document.querySelector('#actualStory') as HTMLElement;

    story.innerText = el.innerText;
    el.classList.add('scrapping');
  }

  if (STATUS === 'FINISHED') {
    el.classList.add('finished');
  }
}

async function getImages(
  imgs: HTMLImageElement[],
  isImageAllowed: boolean,
  isCover: boolean
): Promise<BlobImage[]> {
  const responseImages = [];

  for (const img of imgs) {
    let blob;
    const id = makeId(7);

    if (!isCover && !isImageAllowed) {
      // eslint-disable-next-line no-await-in-loop
      blob = await fetchImage(chrome.runtime.getURL('UPGRADE.png'));
    } else {
      const imgUrl = btoa(img.src);

      // eslint-disable-next-line no-await-in-loop
      blob = await fetchCorsImage(imgUrl);
    }

    responseImages.push({ id, blob, alt: img.alt });

    if (!isCover) {
      img.src = `{{ ${id}-src }}`;
    }
  }

  return responseImages;
}

async function toggleGenerating(isPro: boolean) {
  if (!document.querySelector('.base-modal')) {
    const wrapper = document.createElement('div');

    wrapper.classList.add('base-modal');
    wrapper.style.width = '500px';
    wrapper.style.height = '300px';
    wrapper.innerHTML = `<h1> Scrapping... </h1> <br/> <span id="actualStory"> </span>
    <br />
    <button class="btn-primary" id="abort" style=" background-color: #ff2f65; margin: 20px;"> Abort </button>
      <br />
      <span style="display:none;color:#ff1d1d;margin:auto; margin-top:0px;margin-bottom:0px; font-weight:600;" id="conversion-error"></span>
     ${
       isPro
         ? ''
         : '<span style="color:white;margin-top:10px;"> ⌚ Too slow? Click <a href="#" id="handlePro"> here </a> to upgrade your plan! </span>'
     }
    `;

    document.body.appendChild(wrapper);
  } else {
    const div = document.querySelector('.base-modal');

    div && div.remove();
  }

  const abortButton = document.getElementById('abort');
  const handlePro = document.getElementById('handlePro');

  abortButton && abortButton.addEventListener('click', handleAbort);
  handlePro && handlePro.addEventListener('click', beProFlow);
}

async function handleAbort(event: Event) {
  const divPanel = document.querySelector('.base-modal');

  if (divPanel) {
    divPanel.remove();
  }

  event.preventDefault();
  abort = true;
}

async function downloadBookPanel(
  epubLink: string,
  isPro: boolean,
  exportsMade: any,
  kindleEmail: string
) {
  const exportsMadeBase = Object();

  exportsMadeBase[month] =
    month in exportsMade && exportsMade[month] ? exportsMade[month] + 1 : 1;
  logger('wattpad.ts', 'downloadBookPanel:exportsMadeBase', exportsMadeBase, {
    skip: HIDE_LOGS,
    typeColor: '#f00',
  });

  !isPro && (await set({ exportsMade: { ...exportsMadeBase } }));
  const wrapper = document.createElement('div').cloneNode(true) as HTMLElement;
  const cover = document.querySelector('.story-cover img') as HTMLImageElement;
  const title = document.querySelector('.story-info__title') as HTMLElement;
  const months = Object.keys(exportsMade).length;
  const hasExports = months ? FREE_MAX_EXPORTS - exportsMade[month] > 0 : true;
  const exportsLeft = months
    ? Number(FREE_MAX_EXPORTS - exportsMade[month])
    : FREE_MAX_EXPORTS - 1;

  logger(
    'wattpad.ts',
    'downloadBookPanel:exports',
    { hasExports, exportsLeft, FREE_MAX_EXPORTS, exportsMade },
    { skip: HIDE_LOGS, typeColor: '#f00' }
  );

  wrapper.innerHTML = `
  <button id="close"> Close </button>
  <div class="head" style="display: flex; flex-direction: column;">  
  <img src="${cover.src} alt="Ebook Cover" width="150px" style="margin:auto"/>
  <h1 style="font-size: 25px; margin-top:10px; margin-bottom:10px;"> ${
    title.innerText || ''
  } </h1>
  </div>
  
  <div class="body-send">
    <input id="kindle-email" placeholder="email-kindle@kindle.com" value="${
      kindleEmail || ''
    }"> </input>
    <button class="btn-secondary" id="send"> Send to My Kindle 📲</button>
    ${
      err
        ? `<span style="color:#ff1d1d;margin:auto; margin-top:0px;margin-bottom:0px; font-weight:600;" id="conversion-error"> One or more errors occurred. Try again. <br />  If persists contact us at contact@xstudio.digital </span>`
        : ''
    }
  </div>
      
  <h3 style="font-size:18px;margin-top:30px;"> Or Download as: </h3>
  <div class="body-download">
    <div> <h2 style="margin-top:10px; color:#c1c1c1"><a href="#" id="mobi-download">  Mobi <span style="font-size:17px; color: #e64809 !important;">(Pro) </span> </a></h2></div>
    <div> <h2 style="margin-top:10px; color:#c1c1c1"><a href="${epubLink}" download="${
    title.innerText || 'book'
  }.epub" id="epub-download"> ePUB  </a> </h2></div>
    <div> <h2 style="margin-top:10px; color:#c1c1c1"><a href="#" id="pdf-download">  PDF </a></h2></div>
   </div>
   
   ${
     !isPro
       ? `
   <span style="color:white;"> <img src="${chrome.runtime.getURL(
     'warning.png'
   )}" alt="warning"  style="width: 20px; margin-top: -5px; margin-right: 5px;"/> ${
           exportsLeft <= 0 ? 0 : exportsLeft
         } sends left. <br /> Click <a href="#" id="handlePro"> here </a> to upgrade your plan! </span>`
       : ''
   }
  `;
  wrapper.style.color = '#c1c1c1';
  wrapper.style.padding = '30px';
  wrapper.style.width = '500px';
  wrapper.style.display = 'flex';
  wrapper.style.flexDirection = 'column';
  wrapper.classList.add('base-modal');
  document.body.appendChild(wrapper);

  const mobiAction = document.querySelector('#mobi-download');
  const pdfAction = document.querySelector('#pdf-download');
  const closeAction = document.getElementById('close');
  const sendAction = document.getElementById('send');

  const handlePro = document.getElementById('handlePro');

  handlePro && handlePro.addEventListener('click', beProFlow);

  if (mobiAction) {
    mobiAction.addEventListener('click', async (event) => {
      event.preventDefault();
      const titleElement = document.querySelector(
        '.story-info__title'
      ) as HTMLElement;

      const target = event.target as HTMLAnchorElement;

      if (!isPro) {
        beProFlow();

        return;
      }

      if (target && target.href.slice(-1) === '#' && file) {
        const url = await handleConvert('mobi', file, titleElement);

        if (url) {
          target.href = url;
          target.download = `${titleElement.innerText}.mobi`;
        }
      } else {
        console.log('doing nothing');
      }
    });
  }

  if (pdfAction) {
    pdfAction.addEventListener('click', async (event) => {
      event.preventDefault();

      const titleElement = document.querySelector(
        '.story-info__title'
      ) as HTMLElement;
      const target = event.target as HTMLAnchorElement;

      if (target && target.href.slice(-1) === '#' && file) {
        const url = await handleConvert('pdf', file, titleElement);

        if (url) {
          target.href = url;
          target.download = `${titleElement.innerText}.pdf`;
        }
      } else {
        console.log('doing nothing');
      }
    });
  }

  if (closeAction) {
    closeAction.addEventListener('click', (event) => {
      event.preventDefault();

      const panel = document.querySelector('.base-modal');

      if (panel) {
        panel.remove();
      }
    });
  }

  if (sendAction) {
    sendAction.addEventListener('click', async (event: Event) => {
      event.preventDefault();

      const kindleEmailInput = document.getElementById(
        'kindle-email'
      ) as HTMLInputElement;

      logger(
        'wattpad.ts',
        'downloadBookPanel:sendAction',
        {
          kindleEmailInput,
          value: kindleEmailInput.value,
        },
        {
          skip: HIDE_LOGS,
          typeColor: '#f00',
        }
      );

      if (kindleEmailInput && kindleEmailInput.value) {
        console.log('send');
        await set({ kindleEmail: kindleEmailInput.value });
      }

      if (!isPro && !hasExports) {
        beProFlow();
      }
    });
  }
}

async function beProFlow(event?: Event) {
  event && event.preventDefault();
  const wrapper = document.createElement('div');

  wrapper.innerHTML = `
  <div class="head" style="display: flex; flex-direction: column;">  
  <h1 style="font-size: 25px; margin-top:10px; margin-bottom:10px;"> Pro Features </h1>
  
  <ul> 
    <li> Unlimited sends ✅</li>
    <li> No Ads ✅</li>
    <li> Image Support ✅</li>
    <li> Faster ebook generation ✅</li>
    <li> Save Mobi on PC ✅</li>
  </ul>
  <span> Only 5$ /per month </span>
  <button class="btn-primary" id="confirm-pro">🌟 Be pro 🌟</button>
  <button class="btn-primary" id="close-pro">Not now ❌</button>
  </div>
  `;

  wrapper.id = 'bepro';
  wrapper.style.width = '500px';
  wrapper.style.height = '360px';
  wrapper.style.padding = '20px';
  wrapper.classList.add('base-modal');
  wrapper.style.zIndex = '9999';

  const customModal = document.createElement('div');

  customModal.classList.add('custom-modal');
  customModal.id = 'custom-modal-pro';
  customModal.appendChild(wrapper);

  document.body.appendChild(customModal);

  const closeAction = document.getElementById('close-pro');
  const proAction = document.getElementById('confirm-pro');

  if (closeAction) {
    closeAction.addEventListener('click', () => {
      const panel = document.getElementById('custom-modal-pro');

      if (panel) {
        panel.remove();
      }
    });
  }

  if (proAction) {
    proAction.addEventListener('click', () => {
      ext.openPaymentPage();
    });
  }
}

export function showError(message: string) {
  const errorMessage = document.getElementById('conversion-error');

  if (errorMessage) {
    errorMessage.innerText = message;
    errorMessage.style.display = 'block';
  }
}
