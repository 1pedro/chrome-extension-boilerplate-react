import { CALIBRE_API_URL, MAIL_API_URL } from '../config';
// @ts-ignore
// eslint-disable-next-line import/extensions
import { ExtPay } from '../ExtPay';

let STAGE = '';

(async () => {
  STAGE = (await sendMessage('getStage', {})) as string;
})();

export function makeId(length: number) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;

  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }

  return result;
}

export async function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function getElementAttribute(query: string, attribute: string) {
  const el = document.querySelector(query) as HTMLElement;

  if (attribute === 'innerText') {
    return el && el.innerText ? el.innerText : null;
  }

  if (attribute === 'innerHTML') {
    return el && el.innerHTML ? el.innerHTML : null;
  }

  return el && el.getAttribute(attribute) ? el.getAttribute(attribute) : null;
}

export async function fetchCorsImage(imgUrl: string) {
  return fetch(`https://cors.pedrojefferson-dev.workers.dev?src=${imgUrl}`, {
    mode: 'cors',
  }).then(async (response) => {
    if (response.ok) {
      return response.blob();
    }

    throw new Error('Network response was not ok.');
  });
}

export async function fetchImage(imgUrl: string) {
  return fetch(imgUrl, {
    mode: 'cors',
  }).then(async (response) => {
    if (response.ok) {
      return response.blob();
    }

    throw new Error('Network response was not ok.');
  });
}

export async function sendMessage(type: string, data: any) {
  return new Promise((resolve, reject) => {
    try {
      chrome.runtime.sendMessage({ type, data }, async (response) => {
        resolve(response);
      });
    } catch (error) {
      console.error(error.message);
      reject();
    }
  });
}

export function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.readAsDataURL(blob);

    // eslint-disable-next-line func-names
    reader.onloadend = function () {
      if (reader.result) {
        resolve(reader.result as string);
      } else {
        reject();
      }
    };
  });
}

export async function getUserStatus() {
  const ext = ExtPay('wattpad-to-kindle-e-reader');
  const user = await ext.getUser();

  return [user.paid, user.subscriptionStatus];
}

export async function manageSubscription() {
  const ext = ExtPay('wattpad-to-kindle-e-reader');

  await ext.openPaymentPage();
}

async function uploadFile(
  url: string,
  file: Blob | ArrayBuffer,
  contentType: string,
  conversion: boolean
) {
  console.log('body', file);

  return fetch(url, {
    mode: 'cors', // Your POST endpoint
    method: 'POST',
    headers: {
      'Content-Type': contentType,
    },
    body: JSON.stringify({ file }), // This is your file object
  })
    .then(
      (response) => response.json() // if the response is a JSON object
    )
    .then(
      (success) => console.log(success) // Handle the success response object
    )
    .catch(
      (error) => console.log(error) // Handle the error response object
    );
}

export async function calibreConvertFile(
  file: Blob,
  title: string,
  from: string = 'epub',
  to: string
): Promise<Blob | null | ArrayBuffer> {
  const formData = new FormData();

  formData.append('file', file, `${title}.${from}`);
  formData.append('to', to);

  return new Promise((resolve, reject) => {
    return fetch(`${CALIBRE_API_URL}/calibre/ebook-convert`, {
      mode: 'cors',
      method: 'POST',
      body: formData,
      redirect: 'follow',
    })
      .then(
        async (response) => {
          console.log(response);
          const blob = await response.blob();

          console.log('body', response.body);
          console.log('inside', blob);
          resolve(blob);
        } // if the response is a JSON object
      )
      .catch((error) => {
        console.log(error.message);
        reject(error);
      });
  });
}

export async function handleConvert(
  to: string,
  file: Blob,
  titleElement: HTMLElement
): Promise<string | null> {
  if (file) {
    console.log('file', file);
    const blob = await calibreConvertFile(
      file,
      `${titleElement.innerText}.epub`,
      'epub',
      to
    );

    console.log(blob);

    const url = blob && getUrlFromFile(blob);

    url && ghostClick(url, titleElement.innerText, to);

    return url;
  }

  return null;
}

export function getUrlFromFile(blob: Blob | ArrayBuffer) {
  return URL.createObjectURL(blob);

  // document.body.appendChild(link);
  // link.href = url;
  // //  link.textContent = "Download EPUB";
  // link.download = `${title}.epub`;
  // link.click();
}

export function ghostClick(url: string, title: string, extension: string) {
  const link = document.createElement('a');

  document.body.appendChild(link);
  link.href = url;
  link.download = `${title}.${extension}`;
  link.click();
}

export function getPlatform() {
  return (() => {
    // @ts-ignore
    return typeof browser === 'undefined' ? window.chrome : browser;
  })();
}

export function sendToKindle(
  bookContent: string,
  bookName: string,
  email: string,
  subject = 'convert',
  to = 'mobi',
  textContent = '.'
) {
  if (!STAGE) {
    throw new Error('No stage was provided');
  }

  return fetch(`${MAIL_API_URL}/${STAGE}/kindle`, {
    mode: 'cors',
    method: 'POST',
    body: JSON.stringify({
      bookContent,
      bookName,
      email,
      subject,
      to,
      textContent,
    }),
  });
}
