/**
 * Inject a transcoding transformation into a Cloudinary video delivery URL.
 * Raw uploads are delivered as-is (often 15+ Mbps), which makes iOS refuse or
 * stall autoplay; q_auto,vc_h264 re-encodes to a lean H.264 file every mobile
 * browser can start immediately. Non-Cloudinary or already-transformed URLs
 * pass through unchanged.
 */
export function optimizedVideoUrl(url: string): string {
  if (!url.includes('/video/upload/v')) return url;
  return url.replace('/video/upload/', '/video/upload/q_auto,vc_h264/');
}

/**
 * Same idea for images: f_auto lets Cloudinary serve modern formats (AVIF/WebP)
 * per browser and q_auto picks a sensible compression level. Raw uploads are
 * often multi-MB PNGs; this typically cuts them by 5-10×.
 */
export function optimizedImageUrl(url: string): string {
  if (!url.includes('/image/upload/v')) return url;
  return url.replace('/image/upload/', '/image/upload/f_auto,q_auto/');
}

/** First frame of a Cloudinary video as a jpg, for use as a poster. */
export function videoPosterUrl(url: string): string | undefined {
  if (!url.includes('/video/upload/v')) return undefined;
  return url
    .replace('/video/upload/', '/video/upload/so_0,q_auto/')
    .replace(/\.[a-zA-Z0-9]+$/, '.jpg');
}
