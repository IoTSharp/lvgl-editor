import { afterEach, expect, it, vi } from 'vitest';
import { webcrypto } from 'node:crypto';
import { convertAssets } from '../assets/convert';
import { imageToVesc } from '../assets/rasterize';
import { createComponent, createImageResource, createPage } from '../../__tests__/helpers';

vi.mock('../assets/rasterize', () => ({ imageToVesc: vi.fn(), fontToVesc: vi.fn() }));
afterEach(() => vi.unstubAllGlobals());
it('reconverts a same-length image changed outside the former fingerprint samples', async () => {
  vi.stubGlobal('crypto', webcrypto);
  const resource = createImageResource({ id: 'cache-regression', data: 'A'.repeat(8192), cArrayName: 'cache_img' });
  const pages = [createPage({ components: [createComponent('img', { props: { src: resource.id } })] })];
  vi.mocked(imageToVesc).mockResolvedValueOnce({ bin: new Uint8Array([1]), palette: [null, 0], bpp: 1, width: 1, height: 1 }).mockResolvedValueOnce({ bin: new Uint8Array([2]), palette: [null, 1], bpp: 1, width: 1, height: 1 });
  const first = await convertAssets(pages, [resource], []);
  const second = await convertAssets(pages, [{ ...resource, data: `AB${resource.data.slice(2)}` }], []);
  expect(first.files['assets/cache_img.bin'][0]).toBe(1);
  expect(second.files['assets/cache_img.bin'][0]).toBe(2);
  expect(imageToVesc).toHaveBeenCalledTimes(2);
});
