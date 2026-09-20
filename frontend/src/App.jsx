import { Route, Routes } from "react-router-dom";

import { ProtectedRoute } from "./auth/ProtectedRoute";
import { RequirePermission } from "./auth/RequirePermission";
import { AdminLayout } from "./layouts/AdminLayout";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardPage } from "./pages/admin/DashboardPage";
import { AnalyticsPage } from "./pages/admin/analytics/AnalyticsPage";
import { EnquiryCreatePage } from "./pages/admin/enquiries/EnquiryCreatePage";
import { EnquiryDetailPage } from "./pages/admin/enquiries/EnquiryDetailPage";
import { EnquiryListPage } from "./pages/admin/enquiries/EnquiryListPage";
import { LoginPage } from "./pages/admin/LoginPage";
import { HomePage } from "./public/pages/HomePage";
import { PublicNotFoundPage } from "./public/pages/PublicNotFoundPage";
import { PublicAboutPage } from "./public/pages/PublicAboutPage";
import { PublicPrivacyPage } from "./public/pages/PublicPrivacyPage";
import { PublicTermsPage } from "./public/pages/PublicTermsPage";
import { CustomerCreatePage } from "./pages/admin/customers/CustomerCreatePage";
import { CustomerDetailPage } from "./pages/admin/customers/CustomerDetailPage";
import { CustomerListPage } from "./pages/admin/customers/CustomerListPage";
import { LocationCreatePage } from "./pages/admin/locations/LocationCreatePage";
import { LocationEditPage } from "./pages/admin/locations/LocationEditPage";
import { LocationListPage } from "./pages/admin/locations/LocationListPage";
import { MyAccountPage } from "./pages/admin/account/MyAccountPage";
import { MediaLibraryPage } from "./pages/admin/media-library/MediaLibraryPage";
import { NotificationsPage } from "./pages/admin/notifications/NotificationsPage";
import { PrivateDocumentsPage } from "./pages/admin/private-documents/PrivateDocumentsPage";
import { ExploreMapPropertiesPage } from "./pages/admin/properties/ExploreMapPropertiesPage";
import { FeaturedPropertiesPage } from "./pages/admin/properties/FeaturedPropertiesPage";
import { PropertyCreatePage } from "./pages/admin/properties/PropertyCreatePage";
import { PropertyEditPage } from "./pages/admin/properties/PropertyEditPage";
import { PropertyListPage } from "./pages/admin/properties/PropertyListPage";
import { PublicContactPage } from "./public/pages/PublicContactPage";
import { PublicBlogDetailPage } from "./public/pages/PublicBlogDetailPage";
import { PublicBlogsPage } from "./public/pages/PublicBlogsPage";
import { PublicExploreMapPage } from "./public/pages/PublicExploreMapPage";
import { PublicPropertiesPage } from "./public/pages/PublicPropertiesPage";
import { PublicPropertyDetailPage } from "./public/pages/PublicPropertyDetailPage";
import { PublicSavedPropertiesPage } from "./public/pages/PublicSavedPropertiesPage";
import { HomepagePage } from "./pages/admin/homepage/HomepagePage";
import { PropertyTrashPage } from "./pages/admin/properties/PropertyTrashPage";
import { BlogCreatePage } from "./pages/admin/blogs/BlogCreatePage";
import { BlogEditPage } from "./pages/admin/blogs/BlogEditPage";
import { BlogsPage } from "./pages/admin/blogs/BlogsPage";
import { RequireAnyPermission } from "./auth/RequireAnyPermission";
import { RolePermissionsPage } from "./pages/admin/roles/RolePermissionsPage";
import { SettingsPage } from "./pages/admin/settings/SettingsPage";
import { SiteVisitCreatePage } from "./pages/admin/site-visits/SiteVisitCreatePage";
import { SiteVisitDetailPage } from "./pages/admin/site-visits/SiteVisitDetailPage";
import { SiteVisitListPage } from "./pages/admin/site-visits/SiteVisitListPage";
import { UserCreatePage } from "./pages/admin/users/UserCreatePage";
import { UserEditPage } from "./pages/admin/users/UserEditPage";
import { UserListPage } from "./pages/admin/users/UserListPage";
import { permissions } from "./utils/propertyOptions";
import { AuditLogsPage } from "./pages/admin/audit-logs/AuditLogsPage";


export const App = () => (
  <Routes>
  <Route element={<PublicLayout />}>
  <Route index element={<HomePage />} />

  <Route
    path="properties"
    element={<PublicPropertiesPage />}
  />

  <Route
    path="explore"
    element={<PublicExploreMapPage />}
  />

  <Route
    path="properties/:propertyCode"
    element={<PublicPropertyDetailPage />}
  />

  <Route
    path="saved"
    element={<PublicSavedPropertiesPage />}
  />

  <Route
    path="blogs"
    element={<PublicBlogsPage />}
  />

  <Route
    path="blogs/:slug"
    element={<PublicBlogDetailPage />}
  />

  <Route
    path="contact"
    element={<PublicContactPage />}
  />

  <Route path="about" element={<PublicAboutPage />} />

  <Route path="privacy" element={<PublicPrivacyPage />} />

  <Route path="terms" element={<PublicTermsPage />} />

  <Route path="*" element={<PublicNotFoundPage />} />
</Route>

    <Route
      path="/admin/login"
      element={<LoginPage />}
    />

    <Route element={<ProtectedRoute />}>
      <Route
        path="/admin"
        element={<AdminLayout />}
      >
        <Route index element={<DashboardPage />} />

        <Route path="account" element={<MyAccountPage />} />

        <Route
          path="properties"
          element={
            <RequirePermission
              permission={permissions.propertyView}
            >
              <PropertyListPage />
            </RequirePermission>
          }
        />

        <Route
          path="properties/trash"
          element={
            <RequirePermission
              permission={permissions.propertyView}
            >
              <PropertyTrashPage />
            </RequirePermission>
          }
        />
        <Route
  path="properties/featured"
  element={
    <RequirePermission
      permission={permissions.propertyPublish}
    >
      <FeaturedPropertiesPage />
    </RequirePermission>
  }
/>

<Route
  path="properties/explore-map"
  element={
    <RequirePermission
      permission={permissions.propertyPublish}
    >
      <ExploreMapPropertiesPage />
    </RequirePermission>
  }
/>

        <Route
          path="properties/new"
          element={
            <RequirePermission
              permission={permissions.propertyCreate}
            >
              <PropertyCreatePage />
            </RequirePermission>
          }
        />

        <Route
          path="properties/:propertyId/edit"
          element={
            <RequirePermission
              permission={permissions.propertyEdit}
            >
              <PropertyEditPage />
            </RequirePermission>
          }
        />

<Route
  path="blogs"
  element={
    <RequireAnyPermission
      permissions={[
        permissions.blogCreate,
        permissions.blogEdit,
        permissions.blogPublish,
        permissions.blogDelete,
      ]}
    >
      <BlogsPage />
    </RequireAnyPermission>
  }
/>

<Route
  path="blogs/new"
  element={
    <RequirePermission
      permission={permissions.blogCreate}
    >
      <BlogCreatePage />
    </RequirePermission>
  }
/>

<Route
  path="blogs/:blogId/edit"
  element={
    <RequirePermission
      permission={permissions.blogEdit}
    >
      <BlogEditPage />
    </RequirePermission>
  }
/>
<Route
  path="media-library"
  element={
    <RequirePermission
      permission={permissions.mediaView}
    >
      <MediaLibraryPage />
    </RequirePermission>
  }
/><Route
  path="homepage"
  element={
    <RequirePermission
      permission={permissions.homepageView}
    >
      <HomepagePage />
    </RequirePermission>
  }
/>
        <Route
          path="enquiries"
          element={
            <RequirePermission
              permission={permissions.enquiryView}
            >
              <EnquiryListPage />
            </RequirePermission>
          }
        />

        <Route
          path="enquiries/new"
          element={
            <RequirePermission
              permission={permissions.enquiryUpdate}
            >
              <EnquiryCreatePage />
            </RequirePermission>
          }
        />

        <Route
          path="enquiries/:enquiryId"
          element={
            <RequirePermission
              permission={permissions.enquiryView}
            >
              <EnquiryDetailPage />
            </RequirePermission>
          }
        />

        <Route
          path="customers"
          element={
            <RequirePermission
              permission={permissions.customerView}
            >
              <CustomerListPage />
            </RequirePermission>
          }
        />

        <Route
          path="customers/new"
          element={
            <RequirePermission
              permission={permissions.customerManage}
            >
              <CustomerCreatePage />
            </RequirePermission>
          }
        />

        <Route
          path="customers/:customerId"
          element={
            <RequirePermission
              permission={permissions.customerView}
            >
              <CustomerDetailPage />
            </RequirePermission>
          }
        />

        <Route
          path="site-visits"
          element={
            <RequirePermission
              permission={permissions.siteVisitView}
            >
              <SiteVisitListPage />
            </RequirePermission>
          }
        />

        <Route
          path="site-visits/new"
          element={
            <RequirePermission
              permission={permissions.siteVisitManage}
            >
              <SiteVisitCreatePage />
            </RequirePermission>
          }
        />

        <Route
          path="site-visits/:siteVisitId"
          element={
            <RequirePermission
              permission={permissions.siteVisitView}
            >
              <SiteVisitDetailPage />
            </RequirePermission>
          }
        />
        <Route
          path="locations"
          element={
            <RequirePermission
              permission={permissions.locationView}
            >
              <LocationListPage />
            </RequirePermission>
          }
        />

        <Route
          path="locations/new"
          element={
            <RequirePermission
              permission={permissions.locationManage}
            >
              <LocationCreatePage />
            </RequirePermission>
          }
        />

        <Route
          path="locations/:locationId/edit"
          element={
            <RequirePermission
              permission={permissions.locationManage}
            >
              <LocationEditPage />
            </RequirePermission>
          }
        />

        <Route
          path="users"
          element={
            <RequirePermission
              permission={permissions.userManage}
            >
              <UserListPage />
            </RequirePermission>
          }
        />

        <Route
          path="users/new"
          element={
            <RequirePermission
              permission={permissions.userManage}
            >
              <UserCreatePage />
            </RequirePermission>
          }
        />

        <Route
          path="users/:userId/edit"
          element={
            <RequirePermission
              permission={permissions.userManage}
            >
              <UserEditPage />
            </RequirePermission>
          }
        />
<Route
  path="private-documents"
  element={
    <RequirePermission
      permission={permissions.privateDocumentView}
    >
      <PrivateDocumentsPage />
    </RequirePermission>
  }
/>
<Route
  path="analytics"
  element={
    <RequirePermission
      permission={permissions.analyticsView}
    >
      <AnalyticsPage />
    </RequirePermission>
  }
/>
<Route
  path="audit-logs"
  element={
    <RequirePermission
      permission={permissions.auditView}
    >
      <AuditLogsPage />
    </RequirePermission>
  }
/>
        <Route
          path="notifications"
          element={<NotificationsPage />}
        />

        <Route
  path="settings"
  element={
    <RequirePermission
      permission={permissions.settingsManage}
    >
      <SettingsPage />
    </RequirePermission>
  }
/>
<Route
          path="roles"
          element={
            <RequirePermission
              permission={permissions.roleManage}
            >
              <RolePermissionsPage />
            </RequirePermission>
          }
        />
      </Route>
    </Route>

  </Routes>
);





