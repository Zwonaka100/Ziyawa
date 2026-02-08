import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
}

export function DashboardHeader({
  title,
  subtitle,
  backHref,
  backLabel = 'Back',
  actions,
}: DashboardHeaderProps) {
  return (
    <header className="bg-white border-b border-neutral-200">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div>
            {backHref && (
              <Link href={backHref}>
                <Button variant="ghost" size="sm" className="mb-2 -ml-2">
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  {backLabel}
                </Button>
              </Link>
            )}
            <h1 className="text-2xl font-bold text-neutral-900">{title}</h1>
            {subtitle && (
              <p className="text-neutral-500 mt-1">{subtitle}</p>
            )}
          </div>
          {actions && (
            <div className="flex items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
