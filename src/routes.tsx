
import { RouteObject } from 'react-router-dom';
import Index from './pages/Index';
import NotFound from './pages/NotFound';

// Create basic route structure for future expansion
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/upload',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '/transactions',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '/exceptions',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '/reconciliation',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '/analytics',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '/reports',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '/settings',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '/users',
    element: <Index />, // Using Index as placeholder, would be replaced with actual page
  },
  {
    path: '*',
    element: <NotFound />,
  },
];
