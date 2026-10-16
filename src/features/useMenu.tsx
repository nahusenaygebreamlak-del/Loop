import { useCallback } from 'react';
import { useSheets } from '@/components/Sheet';
import { SideMenu } from './SideMenu';

/** Opens the side menu (NSideMenu2). */
export function useMenu() {
  const sheets = useSheets();
  return useCallback(() => sheets.open(() => <SideMenu />, 'drawer'), [sheets]);
}
