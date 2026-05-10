import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '@solana/wallet-adapter-react';
import { Menu, X, FileText, LayoutDashboard, Zap } from 'lucide-react';
import { APP_NAME } from '@/lib/constants';
import ThemeToggle from './ThemeToggle';

interface NavbarProps {
  variant?: 'landing' | 'app';
}

const Navbar: React.FC<NavbarProps> = ({ variant = 'landing' }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { connected } = useWallet();
  const location = useLocation();

  const isApp = variant === 'app';

  const navLinks = isApp
    ? [
        { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
        { label: 'New Invoice', href: '/invoice/new', icon: FileText },
      ]
    : [
        { label: 'Features', href: '#features' },
        { label: 'How It Works', href: '#how-it-works' },
        { label: 'Integrations', href: '#integrations' },
      ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to={isApp ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight text-foreground">
              {APP_NAME}
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'text-primary bg-primary/10'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    {'icon' in link && link.icon && <link.icon className="h-4 w-4" />}
                    {link.label}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            {!isApp && !connected && (
              <Link
                to="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-muted-foreground rounded-lg border border-border hover:bg-secondary transition-colors"
              >
                Launch App
              </Link>
            )}
            <ThemeToggle />
            <WalletMultiButton />
            
            {/* Mobile toggle */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-secondary"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4 pt-2 border-t border-border mt-2">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary"
              >
                {link.label}
              </Link>
            ))}
            {!isApp && (
              <Link
                to="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="block px-3 py-2.5 text-sm font-medium text-primary"
              >
                Launch App
              </Link>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
