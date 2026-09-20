import { Link } from "react-router-dom";

import { useAuth } from "../../auth/useAuth";
import { PermissionGate } from "../../auth/PermissionGate";
import { permissions } from "../../utils/propertyOptions";

export const DashboardPage = () => {
  const { user } = useAuth();

  return (
    <div className="stack">
      <section className="page-heading">
        <p className="eyebrow">LANDZO Admin</p>
        <h1>Welcome {user?.fullName || "there"}</h1>
      </section>
      <PermissionGate permission={permissions.propertyView}>
        <Link className="button primary fit" to="/admin/properties">Manage Properties</Link>
      </PermissionGate>
    </div>
  );
};


