import { Outlet } from "react-router-dom";

import { PublicFooter } from "../public/components/PublicFooter";
import { PublicNavbar } from "../public/components/PublicNavbar";
import {
  PublicBottomNavbar,
} from "../public/components/PublicBottomNavbar";


export const PublicLayout = () => (
  <div className="public-site">
    <PublicNavbar />
    <main className="public-main">
      <Outlet />
    </main>

     <PublicBottomNavbar />
    <PublicFooter />
  </div>
);
