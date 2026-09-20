import { Link } from "react-router-dom";

const isExternalUrl = (href) => /^https?:\/\//i.test(href);
const isInternalPath = (href) => href.startsWith("/") && !href.startsWith("//");

export const PublicCmsLink = ({ children, className = "", cta }) => {
  const label = cta?.label?.trim?.() || "";
  const href = cta?.link?.trim?.() || "";

  if (!label || !href) {
    return null;
  }

  if (isInternalPath(href)) {
    return (
      <Link
        className={className}
        to={href}
      >
        {children || label}
      </Link>
    );
  }

  if (isExternalUrl(href)) {
    return (
      <a
        className={className}
        href={href}
        rel="noreferrer"
        target="_blank"
      >
        {children || label}
      </a>
    );
  }

  return null;
};
