import Image from 'next/image';
import Link from 'next/link';

type Variant = 'wordmark' | 'mark' | 'ring';
type Size = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface LogoProps {
  variant?: Variant;
  size?: Size;
  href?: string | null;
  className?: string;
  priority?: boolean;
}

// Natural pixel dimensions for Next/Image (intrinsic, CSS controls visual size)
const INTRINSIC: Record<Variant, { w: number; h: number }> = {
  wordmark: { w: 480, h: 200 },
  mark:     { w: 400, h: 400 },
  ring:     { w: 983, h: 983 },
};

// CSS height values per size — width is auto to preserve aspect ratio
const HEIGHT: Record<Variant, Record<Size, string>> = {
  wordmark: { xs: 'h-5', sm: 'h-6', md: 'h-7', lg: 'h-9', xl: 'h-12' },
  mark:     { xs: 'h-5', sm: 'h-6', md: 'h-8', lg: 'h-10', xl: 'h-14' },
  ring:     { xs: 'h-8', sm: 'h-10', md: 'h-14', lg: 'h-20', xl: 'h-28' },
};

const SRC: Record<Variant, string> = {
  wordmark: '/logo-wordmark.png',
  mark:     '/logo-mark.png',
  ring:     '/logo-ring.webp',
};

export default function Logo({
  variant = 'wordmark',
  size = 'md',
  href = '/',
  className = '',
  priority = false,
}: LogoProps) {
  const { w, h } = INTRINSIC[variant];
  const heightCls = HEIGHT[variant][size];

  const img = (
    <Image
      src={SRC[variant]}
      alt="X-Hunt"
      width={w}
      height={h}
      priority={priority}
      className={`w-auto object-contain ${heightCls} ${className}`}
    />
  );

  if (href !== null) {
    return (
      <Link href={href} className="flex-shrink-0 inline-flex items-center">
        {img}
      </Link>
    );
  }
  return img;
}
