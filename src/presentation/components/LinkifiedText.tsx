import { ReactNode } from 'react';

const URL_PATTERN = /\b((https?:\/\/|www\.)[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;

const buildHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

const buildParts = (text: string): ReactNode[] => {
  const parts: ReactNode[] = [];
  let lastIndex = 0;

  const regex = new RegExp(URL_PATTERN);

  text.replace(regex, (match, _value, _protocol, offset: number) => {
    if (offset > lastIndex) {
      parts.push(text.slice(lastIndex, offset));
    }

    parts.push(
      <a
        key={`${match}-${offset}`}
        href={buildHref(match)}
        target="_blank"
        rel="noreferrer noopener"
        className="text-link"
      >
        {match}
      </a>,
    );

    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
};

interface LinkifiedTextProps {
  text: string;
  className?: string;
  as?: 'span' | 'p' | 'div';
}

export const LinkifiedText = ({ text, className, as = 'span' }: LinkifiedTextProps) => {
  const Component = as;

  return <Component className={className}>{buildParts(text)}</Component>;
};
