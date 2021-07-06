import jsPDF from 'jspdf';
import { v4 } from 'uuid';

if (window.location.href.includes('mangayabu')) {
  const imgs: HTMLImageElement[] = [
    ...document.querySelectorAll('.image-navigator img'),
  ] as HTMLImageElement[];

  if (!imgs.length) {
    throw new Error('Could not find any image.');
  }

  // eslint-disable-next-line new-cap
  const doc = new jsPDF({
    orientation: imgs[0].width > imgs[0].height ? 'l' : 'p',
  });

  for (const [index, img] of imgs.entries()) {
    const ext = img.src.split('.').slice(-1)[0];

    if (index !== 0) {
      if (img.width > img.height) {
        doc.addPage([img.width, img.height], 'landscape');
      } else {
        doc.addPage([img.width, img.height], 'portrait');
      }
    }

    doc.addImage(
      img,
      parseExtension(ext),
      0,
      0,
      img.width,
      img.height,
      img.title,
      'NONE'
    );
  }

  doc.save(`${v4()}.pdf`);
}

function parseExtension(ext: string) {
  if (['jpg', 'jpeg'].includes(ext.toLowerCase())) {
    return 'JPEG';
  }

  return ext.toUpperCase();
}
