import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    if (pathname.startsWith("/admin")) {
      return;
    }

    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  return null;
};
