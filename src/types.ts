export interface BlobImage {
  alt?: string;
  blob: Blob | ArrayBuffer;
  id: string;
}

export interface Chapter {
  content: string;
  title: string;
}

export interface BuildEpub {
  author: string;
  chs: Chapter[];
  cover: BlobImage | boolean;
  description: string;
  images: BlobImage[];
  language: string;
  tags: string[];
  title: string;
}
