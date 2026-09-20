export const EmptyState = ({ title, children }) => (
  <div className="empty-state">
    <h2>{title}</h2>
    {children ? <p>{children}</p> : null}
  </div>
);

