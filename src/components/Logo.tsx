type LogoProps = {
  className?: string;
  variant?: 'full' | 'mark';
  height?: number;
  isNight?: boolean;
};

export function Logo({ className = '', variant = 'full', height = 40, isNight = false }: LogoProps) {
  if (variant === 'mark') {
    return <img className={`brand-logo-mark ${className}`} src="/brand/onepiece-logo-mark.svg" alt="ONEPIECE" style={{ height: 28, width: 'auto' }} />;
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <img className="brand-logo-mark" src="/brand/onepiece-logo-mark.svg" alt="" aria-hidden="true" style={{ height: 28, width: 'auto' }} />
      {isNight ? (
        <span role="img" aria-label="ONEPIECE" className="block" style={{ height: Math.min(height, 20), width: 74, backgroundColor: 'var(--night-ink)', maskImage: 'url(/brand/onepiece-wordmark.svg)', maskRepeat: 'no-repeat', maskPosition: 'left center', maskSize: 'contain', WebkitMaskImage: 'url(/brand/onepiece-wordmark.svg)', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'left center', WebkitMaskSize: 'contain' }} />
      ) : (
        <img src="/brand/onepiece-wordmark.svg" alt="ONEPIECE" style={{ height: Math.min(height, 20), width: 'auto' }} />
      )}
    </span>
  );
}
