import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { Test, TestingModule } from '@nestjs/testing';
import { PDFDocument } from 'pdf-lib';
import { PdfBuilderService } from '../src/booklet/pdf/pdf-builder.service';
import { ArtworkPageService } from '../src/booklet/pdf/artwork-page.service';
import { CoverPageService } from '../src/booklet/pdf/cover-page.service';
import type { ArtworkRecord } from '../src/booklet/booklet.types';

describe('Booklet Generation E2E', () => {
  let pdfBuilderService: PdfBuilderService;
  const assetsPath = '/home/bostjan/source/projects/art-subscription-platform/assets/booklet-showcase/01';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfBuilderService, ArtworkPageService, CoverPageService],
    }).compile();

    pdfBuilderService = module.get<PdfBuilderService>(PdfBuilderService);
  });

  it('should generate a valid PDF booklet from showcase images', async () => {
    const files = await readdir(assetsPath);
    const imageFiles = files.filter(
      (f) =>
        f.endsWith('.jpg') ||
        f.endsWith('.jpeg') ||
        f.endsWith('.png') ||
        f.endsWith('.JPG') ||
        f.endsWith('.JPEG') ||
        f.endsWith('.PNG'),
    );

    expect(imageFiles.length).toBeGreaterThan(0);

    const artworks: ArtworkRecord[] = [];
    const imageBuffers = new Map<string, Buffer>();

    for (let i = 0; i < imageFiles.length; i++) {
      const file = imageFiles[i];
      const filePath = join(assetsPath, file);
      const buffer = await readFile(filePath);

      const artworkId = `artwork-${i}`;
      const mimeType = file.toLowerCase().endsWith('.png')
        ? 'image/png'
        : 'image/jpeg';

      artworks.push({
        id: artworkId,
        title: `Artwork ${i + 1}`,
        storageKey: `test/${file}`,
        mimeType,
        width: 2000,
        height: 2800,
        orientation: 'PORTRAIT',
      });

      imageBuffers.set(artworkId, buffer);
    }

    const issueLabel = 'Test Issue #1';
    const creatorNames = ['Test Creator A', 'Test Creator B'];

    const result = await pdfBuilderService.build(
      artworks,
      imageBuffers,
      issueLabel,
      creatorNames,
    );

    expect(result).toBeDefined();
    expect(result.bytes).toBeInstanceOf(Uint8Array);
    expect(result.bytes.length).toBeGreaterThan(0);
    expect(result.pageCount).toBeGreaterThan(0);

    const pdfDoc = await PDFDocument.load(result.bytes);
    expect(pdfDoc.getPageCount()).toBe(result.pageCount);
    expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(artworks.length + 2);

    const pages = pdfDoc.getPages();
    expect(pages.length).toBe(result.pageCount);

    for (const page of pages) {
      const { width, height } = page.getSize();
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
    }

    console.log(`✓ Generated PDF with ${result.pageCount} pages from ${artworks.length} artworks`);
  });

  it('should handle landscape and portrait orientations', async () => {
    const files = await readdir(assetsPath);
    const imageFiles = files.filter(
      (f) => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'),
    );

    const artworks: ArtworkRecord[] = [];
    const imageBuffers = new Map<string, Buffer>();

    const portraitFile = imageFiles[0];
    const landscapeFile = imageFiles[1] || imageFiles[0];

    const portraitBuffer = await readFile(join(assetsPath, portraitFile));
    const landscapeBuffer = await readFile(join(assetsPath, landscapeFile));

    artworks.push(
      {
        id: 'portrait-1',
        title: 'Portrait Artwork',
        storageKey: 'test/portrait.jpg',
        mimeType: 'image/jpeg',
        width: 2000,
        height: 2800,
        orientation: 'PORTRAIT',
      },
      {
        id: 'landscape-1',
        title: 'Landscape Artwork',
        storageKey: 'test/landscape.jpg',
        mimeType: 'image/jpeg',
        width: 2800,
        height: 2000,
        orientation: 'LANDSCAPE',
      },
    );

    imageBuffers.set('portrait-1', portraitBuffer);
    imageBuffers.set('landscape-1', landscapeBuffer);

    const result = await pdfBuilderService.build(
      artworks,
      imageBuffers,
      'Mixed Orientation Test',
      ['Test Creator'],
    );

    expect(result.pageCount).toBeGreaterThanOrEqual(4);

    const pdfDoc = await PDFDocument.load(result.bytes);
    expect(pdfDoc.getPageCount()).toBe(result.pageCount);

    console.log(`✓ Generated mixed orientation PDF with ${result.pageCount} pages`);
  });

  it('should add blank page if total pages are odd', async () => {
    const files = await readdir(assetsPath);
    const imageFile = files.find(
      (f) => f.endsWith('.jpg') || f.endsWith('.jpeg') || f.endsWith('.png'),
    );

    if (!imageFile) {
      throw new Error('No image files found in assets directory');
    }

    const buffer = await readFile(join(assetsPath, imageFile));

    const artworks: ArtworkRecord[] = [
      {
        id: 'single-artwork',
        title: 'Single Artwork',
        storageKey: 'test/single.jpg',
        mimeType: 'image/jpeg',
        width: 2000,
        height: 2800,
        orientation: 'PORTRAIT',
      },
    ];

    const imageBuffers = new Map<string, Buffer>();
    imageBuffers.set('single-artwork', buffer);

    const result = await pdfBuilderService.build(
      artworks,
      imageBuffers,
      'Odd Page Test',
      ['Test Creator'],
    );

    expect(result.pageCount % 2).toBe(0);

    console.log(`✓ Generated PDF with even page count: ${result.pageCount} pages`);
  });
});
