import { ReactNode } from 'react';
import Navigation from './Navigation';
import { Outlet } from 'react-router-dom';

interface LayoutProps {
  children?: ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <>
      <Navigation />
      <main className="pt-16">
        {children || <Outlet />}
      </main>
    </>
  );
};

export default Layout;
