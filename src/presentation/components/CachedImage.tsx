import { ImgHTMLAttributes, memo } from 'react';

export const CachedImage = memo(
  ({ fetchPriority, ...props }: ImgHTMLAttributes<HTMLImageElement>) => {
    if (!props.src) {
      return null;
    }

    const imageProps = {
      ...props,
      fetchpriority: fetchPriority ?? 'auto',
    } as ImgHTMLAttributes<HTMLImageElement> & { fetchpriority: string };

    return (
      <img decoding={props.decoding ?? 'async'} loading={props.loading ?? 'lazy'} {...imageProps} />
    );
  },
);

CachedImage.displayName = 'CachedImage';
