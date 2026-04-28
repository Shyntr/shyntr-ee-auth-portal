import { getResponsiveLogoStyle } from '@/lib/logo-style';

describe('getResponsiveLogoStyle', () => {
  it('keeps the configured desktop width while constraining the logo on mobile', () => {
    expect(getResponsiveLogoStyle(120)).toEqual({
      width: 'min(120px, 60vw)',
    });
  });
});
