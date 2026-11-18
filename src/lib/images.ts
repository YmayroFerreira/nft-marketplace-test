/** Each artwork exists in two widths: name.webp (960px) and name-480.webp (480px) */
export function smallImage(url: string) {
  return url.replace(/\.webp$/, '-480.webp')
}

/** Displayed size of the main artwork on the NFT page */
export const NFT_DETAIL_IMAGE_SIZES = '(min-width: 768px) 500px, 100vw'

/** Props that let the browser pick the lightest file for the displayed size */
export function responsiveImage(url: string, sizes: string) {
  return { src: url, srcSet: `${smallImage(url)} 480w, ${url} 960w`, sizes }
}

/** Starts the download before the image is rendered; an <img> with the same props reuses it */
export function preloadImage({ src, srcSet, sizes }: ReturnType<typeof responsiveImage>) {
  const image = new Image()
  image.fetchPriority = 'high'
  image.sizes = sizes
  image.srcset = srcSet
  image.src = src
}
