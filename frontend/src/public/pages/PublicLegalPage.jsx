const privacySections = [
  ["Information We Collect", "We collect information you choose to provide when you contact LANDZO or send a property enquiry, such as your name, email address, phone number and message."],
  ["How We Use Information", "We use the information you provide to respond to enquiries, support your use of the platform and improve how LANDZO presents property discovery."],
  ["Property Enquiries", "When you submit an enquiry about a property, your details and message may be used to follow up on that enquiry."],
  ["Saved Properties and Browser Storage", "LANDZO may store saved-property preferences in your browser so your selections remain available on that device."],
  ["Analytics and Usage Information", "We may review aggregated usage information to understand how visitors use LANDZO and improve the platform."],
  ["External Services and Links", "LANDZO may link to third-party services or websites. Their privacy practices are governed by their own policies."],
  ["Data Security", "We take reasonable steps to protect information handled through LANDZO. No online service can guarantee absolute security."],
  ["Your Choices", "You can choose not to provide information requested in an enquiry, although this may limit our ability to respond."],
  ["Changes to This Policy", "We may update this policy as LANDZO develops. The latest version will be published on this page."],
  ["Contacting LANDZO", "For privacy-related questions, please contact LANDZO through our contact page."],
];

const termsSections = [
  ["About LANDZO", "LANDZO is a property discovery platform that helps visitors browse listings, understand locations, save properties and make enquiries."],
  ["Using the Platform", "You may use LANDZO for lawful personal or business property discovery. Please do not interfere with the platform or attempt to access it in unauthorised ways."],
  ["Property Information", "Property information is provided for general discovery purposes. Visitors should make their own enquiries and checks before relying on listing information."],
  ["Availability and Accuracy", "Listings, prices, availability and other details may change. LANDZO does not guarantee that all information is current, complete or available at all times."],
  ["Saved Properties", "Saved properties are a convenience feature. They do not reserve a property or create any agreement relating to it."],
  ["Enquiries and Communications", "When you submit an enquiry, you are responsible for the information you provide. Submitting an enquiry does not create a transaction or commitment."],
  ["Maps and Location Information", "Map and location information is intended to help exploration. It may be approximate and should be independently checked where location is important to you."],
  ["Acceptable Use", "Do not use LANDZO to submit misleading information, infringe rights, send harmful material or disrupt the platform."],
  ["Intellectual Property", "LANDZO branding, platform design and original content are protected by applicable intellectual property laws. Do not reuse them without permission."],
  ["Third-Party Services and Links", "LANDZO may include links or map services supplied by third parties. We are not responsible for third-party content or availability."],
  ["Platform Availability", "We may change, suspend or discontinue parts of LANDZO as the platform develops."],
  ["Changes to These Terms", "We may update these terms from time to time. Continued use after publication of an update means you accept the revised terms."],
  ["Contact", "For questions about these terms, please contact LANDZO through our contact page."],
];

const contentByType = { privacy: privacySections, terms: termsSections };

export const PublicLegalPage = ({ type }) => {
  const isPrivacy = type === "privacy";
  const title = isPrivacy ? "Privacy Policy" : "Terms & Conditions";
  const introduction = isPrivacy
    ? "How LANDZO handles information when you browse properties, save listings and contact us."
    : "Terms governing access to and use of the LANDZO property discovery platform.";

  return (
    <article className="landzo-static-page landzo-legal-page">
      <header className="landzo-static-hero landzo-legal-hero">
        <div className="landzo-static-shell landzo-static-reading">
          <p className="landzo-static-eyebrow">LEGAL</p>
          <h1>{title}</h1>
          <p>{introduction}</p>
          <p className="landzo-legal-updated">Last updated: September 2026</p>
        </div>
      </header>
      <div className="landzo-static-section">
        <div className="landzo-static-shell landzo-static-reading landzo-legal-content">
          {contentByType[type].map(([heading, copy]) => (
            <section key={heading}>
              <h2>{heading}</h2>
              <p>{copy}</p>
            </section>
          ))}
        </div>
      </div>
    </article>
  );
};