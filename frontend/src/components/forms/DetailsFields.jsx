import {
  buildingSizeUnits,
  commercialTypes,
  furnishedStatuses,
  landSizeUnits,
  landTypes,
  landUtilities,
} from "../../utils/propertyOptions";
import { Field } from "./Field";

const optionList = (options) =>
  options.map((option) => (
    <option key={option.value} value={option.value}>
      {option.label}
    </option>
  ));

const updateBranch = (details, type, patch, onChange) => {
  onChange({ ...details, [type]: { ...(details[type] || {}), ...patch } });
};

export const DetailsFields = ({ type, value, onChange }) => {
  const current = value[type] || {};
  const update = (patch) => updateBranch(value, type, patch, onChange);

  if (type === "land") {
    const utilities = current.utilities || [];
    const toggleUtility = (utility) =>
      update({
        utilities: utilities.includes(utility)
          ? utilities.filter((item) => item !== utility)
          : [...utilities, utility],
      });

    return (
      <div className="form-grid">
        <Field label="Land size"><input type="number" value={current.landSize || ""} onChange={(e) => update({ landSize: e.target.value })} /></Field>
        <Field label="Land size unit"><select value={current.landSizeUnit || ""} onChange={(e) => update({ landSizeUnit: e.target.value })}><option value="">Select unit</option>{optionList(landSizeUnits)}</select></Field>
        <Field label="Land type"><select value={current.landType || ""} onChange={(e) => update({ landType: e.target.value })}><option value="">Select type</option>{optionList(landTypes)}</select></Field>
        <Field label="Road width"><input type="number" value={current.roadWidth || ""} onChange={(e) => update({ roadWidth: e.target.value })} /></Field>
        <label className="checkbox-row"><input type="checkbox" checked={Boolean(current.roadAccess)} onChange={(e) => update({ roadAccess: e.target.checked })} /> Road access</label>
        <div className="checkbox-group">
          {landUtilities.map((utility) => (
            <label key={utility.value} className="checkbox-row"><input type="checkbox" checked={utilities.includes(utility.value)} onChange={() => toggleUtility(utility.value)} /> {utility.label}</label>
          ))}
        </div>
      </div>
    );
  }

  if (type === "house") {
    return (
      <div className="form-grid">
        <Field label="Bedrooms"><input type="number" value={current.bedrooms || ""} onChange={(e) => update({ bedrooms: e.target.value })} /></Field>
        <Field label="Bathrooms"><input type="number" value={current.bathrooms || ""} onChange={(e) => update({ bathrooms: e.target.value })} /></Field>
        <Field label="Floors"><input type="number" value={current.floors || ""} onChange={(e) => update({ floors: e.target.value })} /></Field>
        <Field label="Land size"><input type="number" value={current.landSize || ""} onChange={(e) => update({ landSize: e.target.value })} /></Field>
        <Field label="Land size unit"><select value={current.landSizeUnit || ""} onChange={(e) => update({ landSizeUnit: e.target.value })}><option value="">Select unit</option>{optionList(landSizeUnits)}</select></Field>
        <Field label="House size"><input type="number" value={current.houseSize || ""} onChange={(e) => update({ houseSize: e.target.value })} /></Field>
        <Field label="House size unit"><select value={current.houseSizeUnit || ""} onChange={(e) => update({ houseSizeUnit: e.target.value })}><option value="">Select unit</option>{optionList(buildingSizeUnits)}</select></Field>
        <Field label="Parking spaces"><input type="number" value={current.parkingSpaces || ""} onChange={(e) => update({ parkingSpaces: e.target.value })} /></Field>
        <Field label="Furnished status"><select value={current.furnishedStatus || ""} onChange={(e) => update({ furnishedStatus: e.target.value })}><option value="">Select status</option>{optionList(furnishedStatuses)}</select></Field>
      </div>
    );
  }

  if (type === "apartment") {
    return (
      <div className="form-grid">
        <Field label="Bedrooms"><input type="number" value={current.bedrooms || ""} onChange={(e) => update({ bedrooms: e.target.value })} /></Field>
        <Field label="Bathrooms"><input type="number" value={current.bathrooms || ""} onChange={(e) => update({ bathrooms: e.target.value })} /></Field>
        <Field label="Floor number"><input type="number" value={current.floorNumber || ""} onChange={(e) => update({ floorNumber: e.target.value })} /></Field>
        <Field label="Total floors"><input type="number" value={current.totalFloors || ""} onChange={(e) => update({ totalFloors: e.target.value })} /></Field>
        <Field label="Unit size"><input type="number" value={current.unitSize || ""} onChange={(e) => update({ unitSize: e.target.value })} /></Field>
        <Field label="Unit size unit"><select value={current.unitSizeUnit || ""} onChange={(e) => update({ unitSizeUnit: e.target.value })}><option value="">Select unit</option>{optionList(buildingSizeUnits)}</select></Field>
        <Field label="Parking spaces"><input type="number" value={current.parkingSpaces || ""} onChange={(e) => update({ parkingSpaces: e.target.value })} /></Field>
        <Field label="Furnished status"><select value={current.furnishedStatus || ""} onChange={(e) => update({ furnishedStatus: e.target.value })}><option value="">Select status</option>{optionList(furnishedStatuses)}</select></Field>
      </div>
    );
  }

  return (
    <div className="form-grid">
      <Field label="Commercial type"><select value={current.commercialType || ""} onChange={(e) => update({ commercialType: e.target.value })}><option value="">Select type</option>{optionList(commercialTypes)}</select></Field>
      <Field label="Floor area"><input type="number" value={current.floorArea || ""} onChange={(e) => update({ floorArea: e.target.value })} /></Field>
      <Field label="Floor area unit"><select value={current.floorAreaUnit || ""} onChange={(e) => update({ floorAreaUnit: e.target.value })}><option value="">Select unit</option>{optionList(buildingSizeUnits)}</select></Field>
      <Field label="Floor number"><input type="number" value={current.floorNumber || ""} onChange={(e) => update({ floorNumber: e.target.value })} /></Field>
      <Field label="Parking spaces"><input type="number" value={current.parkingSpaces || ""} onChange={(e) => update({ parkingSpaces: e.target.value })} /></Field>
    </div>
  );
};

