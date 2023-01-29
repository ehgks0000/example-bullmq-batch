import path from "path";
import sharp from "sharp";
import fs from "fs";
import { promisify } from "util";

const fileExist = promisify(fs.access);

const IMAGE_DIR = path.join(__dirname, "public", "images");
const SIZE = 720;

const processImageToWebp = (size: number, path: string, name: string) =>
  sharp(path)
    .resize(size, size)
    .webp({ lossless: true })
    .toFile(`${IMAGE_DIR}/${name}-${size}.webp`);

export async function processUploadedImages({ name }: { name: string }) {
  // const imageFileData = Buffer.from(data, "base64");
  const file = path.parse(name);
  const filePath = `${IMAGE_DIR}/${file.base}`;

  try {
    await fileExist(filePath, fs.constants.F_OK);
  } catch (error) {
    throw new NotFoundFile(name);
  }

  try {
    // throw new ProcessImageError("테스트");
    await processImageToWebp(SIZE, filePath, file.name);
    return file.name;
  } catch (error) {
    throw new ProcessImageError(name);
  }

  // let counter = 0;
  // for (let i = 0; i < 10_000_000_000; i++) {
  //   counter++;
  // }
}

export class NotFoundFile extends Error {
  constructor(message: string) {
    super(message);
  }
}

export class ProcessImageError extends Error {
  constructor(message: string) {
    super(message);
  }
}
