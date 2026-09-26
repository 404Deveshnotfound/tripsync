'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect whether the user is browsing on a mobile device or desktop/laptop
 * Used to choose between direct upi://pay intent app launch or desktop dynamic QR code.
 */
export function useDeviceDetect() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const userAgent = typeof window.navigator === 'undefined' ? '' : navigator.userAgent;
    const mobileRegex = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
    
    const isMobileUA = mobileRegex.test(userAgent);
    const isTouchScreen = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    const isNarrowScreen = window.innerWidth <= 768;

    setIsMobile(Boolean(isMobileUA || (isTouchScreen && isNarrowScreen)));
  }, []);

  return {
    isMobile,
    isDesktop: !isMobile
  };
}
