const slugSeparatorPattern = /[^a-z0-9]+/g;
const codeSeparatorPattern = /[\s_]+/g;

export const createPropertySlug = (value) =>
  value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(slugSeparatorPattern, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

export const normalizePropertyCode = (value) =>
  value.trim().replace(codeSeparatorPattern, "-").toUpperCase();

export const formatPropertyCode = ({ prefix, sequence }) => {
  const numericSequence = Number(sequence);
  const paddedSequence =
    numericSequence < 100000 ? String(numericSequence).padStart(5, "0") : String(numericSequence);

  return `${prefix}-${paddedSequence}`;
};
