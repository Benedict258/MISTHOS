import React from 'react';
import { Zap, Github, ExternalLink } from 'lucide-react';
import { APP_NAME, APP_TAGLINE } from '@/lib/constants';

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">{APP_NAME}</span>
            </div>
            <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
              {APP_TAGLINE}
            </p>
            <p className="text-xs text-muted-foreground mt-4">
              Built on Solana. Open source. MIT License.
            </p>
          </div>

          {/* Product */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Product</h4>
            <ul className="space-y-2">
              {['Dashboard', 'Create Invoice', 'Payments', 'Analytics'].map((item) => (
                <li key={item}>
                  <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-3">Resources</h4>
            <ul className="space-y-2">
              <li>
                <a href="https://solana.com" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  Solana <ExternalLink className="h-3 w-3" />
                </a>
              </li>
              <li>
                <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
                  GitHub <Github className="h-3 w-3" />
                </a>
              </li>
              <li>
                <span className="text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer">
                  Documentation
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col sm:flex-row justify-between items-center gap-3">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 {APP_NAME}. All rights reserved.
          </p>
          <p className="text-xs text-muted-foreground">
            Deployed on Solana Devnet
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
