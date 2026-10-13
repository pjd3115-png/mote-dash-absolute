import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { useOwnerLayoutData } from '@/hooks/useOwnerLayoutData';
import { APP_CONFIG } from '@/config/app.config';
import { cn } from '@/lib/utils';
import ApperIcon from '@/components/ApperIcon';
import UserMenu from '@/components/UserMenu';
import { ErrorBoundary } from '@/components/ui/error-boundary';

export default function OwnerLayout() {
  const { user, logout, homeRoute, navItems, initials, displayName, counts } = useOwnerLayoutData();
  const items = navItems ?? [];

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex h-(--spacing-header) max-w-6xl items-center gap-4 px-4 md:px-8">
          <Link to={homeRoute} className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-sm bg-sidebar-primary text-sidebar-primary-foreground">
              <ApperIcon name={APP_CONFIG.icon} size={18} />
            </span>
            <span className="font-heading text-xl font-semibold tracking-tight">{APP_CONFIG.name}</span>
            <span className="hidden text-sm text-sidebar-foreground/70 md:inline">{APP_CONFIG.tagline}</span>
          </Link>
          <div className="ml-auto">
            <UserMenu user={user} initials={initials} displayName={displayName} logout={logout} />
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-2 overflow-x-auto px-4 pb-3 md:px-8" aria-label="Sections">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                cn(
                  'flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors duration-(--transition-fast)',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                    : 'text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )
              }
            >
              <ApperIcon name={item.icon ?? 'Circle'} size={16} />
              <span>{item.label}</span>
              {counts?.[item.to] != null && (
                <span className="text-xs tabular-nums opacity-70">{counts[item.to]}</span>
              )}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl px-4 py-6 md:px-8 md:py-8">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </main>
    </div>
  );
}
