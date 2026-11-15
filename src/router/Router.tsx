import { createContext, useContext, type CSSProperties, type ReactNode } from 'react';
import {
  BrowserRouter,
  Link as RouterLink,
  useLocation,
  useNavigate,
} from 'react-router-dom';

type RouterContextValue = {
  path: string;
  navigate: (to: string) => void;
};

const RouterContext = createContext<RouterContextValue | undefined>(undefined);

function RouterBridge({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <RouterContext.Provider value={{ path: pathname, navigate: (to) => navigate(to) }}>
      {children}
    </RouterContext.Provider>
  );
}

export function RouterProvider({ children }: { children: ReactNode }) {
  return (
    <BrowserRouter>
      <RouterBridge>{children}</RouterBridge>
    </BrowserRouter>
  );
}

export function useRouter() {
  const ctx = useContext(RouterContext);
  if (!ctx) throw new Error('useRouter must be used within RouterProvider');
  return ctx;
}

export function Link({
  to,
  children,
  className,
  onClick,
  style,
  role,
}: {
  to: string;
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  style?: CSSProperties;
  role?: string;
}) {
  return (
    <RouterLink to={to} className={className} style={style} onClick={onClick} role={role}>
      {children}
    </RouterLink>
  );
}
