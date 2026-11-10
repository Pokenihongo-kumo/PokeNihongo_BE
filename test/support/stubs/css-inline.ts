// Test-only stand-in for @css-inline/css-inline, a native addon the mailer's
// template adapters load at import time. Windows Smart App Control blocks that
// unsigned binary on the dev machine, which stopped AppModule (and every e2e
// spec) from loading. Tests never send mail, so inlining CSS is a no-op here.
export const inline = (html: string): string => html
