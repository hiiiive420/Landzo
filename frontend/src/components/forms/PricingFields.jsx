import { currencies, leasePeriods, priceModes, rentPeriods } from "../../utils/propertyOptions";
import { Field } from "./Field";

const optionList = (options) =>
  options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));

const defaultSection = (transactionType) => ({
  mode: "fixed",
  period: transactionType === "lease" ? "monthly" : "month",
  amount: "",
});

const sectionPeriods = {
  rent: rentPeriods,
  lease: leasePeriods,
};

const labelByType = {
  sale: "Sale pricing",
  rent: "Rent pricing",
  lease: "Lease pricing",
};

export const PricingFields = ({ transactionTypes, value, onChange }) => {
  const enabled = Boolean(value);
  const pricing = value || { currency: "LKR", priceVisible: false };

  const updatePricing = (patch) => onChange({ ...pricing, ...patch });
  const updateSection = (transactionType, patch) => {
    const nextSection = { ...(pricing[transactionType] || defaultSection(transactionType)), ...patch };
    updatePricing({ [transactionType]: nextSection });
  };

  return (
    <div className="stack">
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => onChange(event.target.checked ? pricing : null)}
        />
        Pricing enabled
      </label>

      {enabled ? (
        <>
          <div className="form-grid">
            <Field label="Currency">
              <select value={pricing.currency} onChange={(event) => updatePricing({ currency: event.target.value })}>
                {optionList(currencies)}
              </select>
            </Field>
            <label className="checkbox-row align-end">
              <input
                type="checkbox"
                checked={Boolean(pricing.priceVisible)}
                onChange={(event) => updatePricing({ priceVisible: event.target.checked })}
              />
              Show price
            </label>
          </div>

          {transactionTypes.map((transactionType) => {
            const section = pricing[transactionType] || defaultSection(transactionType);
            const hasPeriod = transactionType !== "sale";

            return (
              <section key={transactionType} className="subsection">
                <h3>{labelByType[transactionType]}</h3>
                <div className="form-grid">
                  <Field label="Mode">
                    <select
                      value={section.mode}
                      onChange={(event) => updateSection(transactionType, { mode: event.target.value })}
                    >
                      {optionList(priceModes)}
                    </select>
                  </Field>
                  {hasPeriod ? (
                    <Field label="Period">
                      <select
                        value={section.period || defaultSection(transactionType).period}
                        onChange={(event) => updateSection(transactionType, { period: event.target.value })}
                      >
                        {optionList(sectionPeriods[transactionType])}
                      </select>
                    </Field>
                  ) : null}
                  <Field label="Amount">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={section.amount || ""}
                      onChange={(event) => updateSection(transactionType, { amount: event.target.value })}
                    />
                  </Field>
                </div>
              </section>
            );
          })}
        </>
      ) : null}
    </div>
  );
};

