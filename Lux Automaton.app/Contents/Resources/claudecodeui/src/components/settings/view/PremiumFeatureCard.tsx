import { ExternalLink, Lock } from 'lucide-react';
import type { ReactNode } from 'react';

type PremiumFeatureCardProps = {
  icon: ReactNode;
  title: string;
  description: string;
  ctaText?: string;
};

export default function PremiumFeatureCard({
  icon,
  title,
  description,
  ctaText = 'Available with Lux CLI',
}: PremiumFeatureCardProps) {
  return (
    <div className="rounded-xl border border-solid border-border/60 bg-muted/20 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-muted/60 text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-medium text-foreground">{title}</h4>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
