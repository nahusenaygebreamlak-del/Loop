import { Platform, useWindowDimensions } from 'react-native';

/**
 * The computer layout (docs/11-desktop-design.md): web and at least 600 px wide.
 * Under 1200 px the sidebar hides behind ☰; under 900 px the detail panel covers the list.
 */
export function useDesk() {
  const { width, height } = useWindowDimensions();
  const desk = Platform.OS === 'web' && width >= 600;
  return { desk, sideInline: width >= 1200, panelInline: width >= 900, width, height };
}

export const isDeskNow = () => Platform.OS === 'web' && typeof window !== 'undefined' && window.innerWidth >= 600;
