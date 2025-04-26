
import { RouteObject } from 'react-router-dom';
import Index from './pages/Index';
import Upload from './pages/Upload';
import Transactions from './pages/Transactions';
import Exceptions from './pages/Exceptions';
import Reconciliation from './pages/Reconciliation';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import Users from './pages/Users';
import NotFound from './pages/NotFound';

// Create basic route structure with pages
export const routes: RouteObject[] = [
  {
    path: '/',
    element: <Index />,
  },
  {
    path: '/upload',
    element: <Upload />,
  },
  {
    path: '/transactions',
    element: <Transactions />,
  },
  {
    path: '/exceptions',
    element: <Exceptions />,
  },
  {
    path: '/reconciliation',
    element: <Reconciliation />,
  },
  {
    path: '/analytics',
    element: <Analytics />,
  },
  {
    path: '/reports',
    element: <Reports />,
  },
  {
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/users',
    element: <Users />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
];
