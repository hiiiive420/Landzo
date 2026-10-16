export const LISTING_AGREEMENT_PAGE_ONE_CLAUSE_COUNT = 7;

export const getListingAgreementClauses = (agreement) => [
  {
    heading: "Appointment and exclusivity",
    text: `The Seller appoints LANDZO on an exclusive basis to promote and facilitate enquiries for the Property for the agreed ${agreement.exclusivePeriodDays}-day term. This appointment does not transfer ownership or authority to bind the Seller to a sale.`,
  },
  {
    heading: "Seller authority",
    text: "The Seller confirms that they own the Property or are duly authorized to act for every owner, and will promptly disclose any co-owner, restriction, encumbrance, dispute or other matter that may affect a proposed transaction.",
  },
  {
    heading: "Property information",
    text: "The Seller is responsible for the accuracy and completeness of the property, title, boundary, access, planning and other information supplied. LANDZO may rely on that information when preparing a listing and is not responsible for independently verifying title or measurements.",
  },
  {
    heading: "LANDZO's role",
    text: "LANDZO may publish or circulate listing information, respond to enquiries and help coordinate communications and viewings. LANDZO is a property discovery and marketing platform and does not provide legal, conveyancing, surveying, valuation, tax or investment advice. Each party should obtain independent professional advice where needed.",
  },
  {
    heading: "Seller cooperation",
    text: "The Seller will provide accurate information and reasonably available documents, promptly notify LANDZO of material changes, cooperate with enquiries and viewings, and communicate any offer or direct approach concerning the Property during the term.",
  },
  {
    heading: "Asking price",
    text: `The minimum selling price authorized for marketing is ${agreement.currency} ${Number(agreement.minimumSellingPrice).toLocaleString("en-US")}. The Seller may change this amount only by written instruction. No offer is binding unless accepted by the Seller in writing.`,
  },
  {
    heading: "Commission",
    text: `The commission is ${agreement.commissionPercentage}% of the consideration payable for a completed transaction with a buyer introduced to the Property through LANDZO during the term. It becomes payable on completion of that transaction. The parties should record any different payment trigger or arrangement in a signed written variation.`,
  },
  {
    heading: "Access and viewings",
    text: "The Seller will agree viewing times in advance and provide safe, reasonable access. The Seller remains responsible for the Property and for securing valuables, occupants, animals and any required permissions during a viewing.",
  },
  {
    heading: "Offers, negotiations and deposits",
    text: "The Seller makes the decision whether to accept, reject or negotiate an offer. LANDZO does not accept an offer on the Seller's behalf and will not receive, hold or transfer a deposit or purchase money unless the parties separately agree in writing to a lawful arrangement.",
  },
  {
    heading: "Introduced buyers after expiry",
    text: `If, within ${agreement.protectionPeriodDays} days after this agreement expires, the Seller completes a transaction with a buyer first introduced to the Property through LANDZO during the term, the commission in this agreement remains payable. The Seller may request LANDZO's written record of the relevant introduction.`,
  },
  {
    heading: "Confidentiality and information",
    text: "Each party will use non-public information received under this agreement only for the property transaction and will take reasonable steps to protect it, subject to disclosures required by law or needed to progress a transaction with the party's consent.",
  },
  {
    heading: "Costs and taxes",
    text: "Each party is responsible for its own professional fees, taxes and transaction costs unless the parties expressly agree otherwise in writing. No tax or financial advice is provided under this agreement.",
  },
  {
    heading: "Term and changes",
    text: `This agreement starts on ${agreement.commencementDate} and runs for ${agreement.exclusivePeriodDays} days, ending on ${agreement.expiryDate}. Any extension, early termination or amendment must be recorded in writing and signed by both parties.`,
  },
  {
    heading: "Governing law",
    text: "This agreement is governed by the laws of Sri Lanka. The parties will first try in good faith to resolve a disagreement through discussion, without limiting any legal rights or remedies available to them.",
  },
  {
    heading: "Entire agreement and independent review",
    text: "This document records the parties' understanding about the listing appointment and replaces prior discussions on that subject. Each party confirms an opportunity to read it, ask questions and obtain independent legal advice before signing.",
  },
];
