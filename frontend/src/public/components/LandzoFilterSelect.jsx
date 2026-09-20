import { Children, useEffect, useId, useRef, useState } from "react";

export const LandzoFilterSelect = ({ children, className = "", disabled = false, label, menuAlign = "left", onChange, options: optionValues, value }) => {
  const containerRef = useRef(null);
  const menuId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const options = optionValues || Children.toArray(children).filter((child) => child?.type === "option").map((child) => ({ disabled: child.props.disabled, label: child.props.children, value: child.props.value }));
  const selectedOption = options.find((option) => option.value === value);
  useEffect(() => {
    if (!isOpen) return undefined;
    const close = (event) => { if (!containerRef.current?.contains(event.target)) setIsOpen(false); };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [isOpen]);
  const selectOption = (option) => { if (!option || option.disabled) return; onChange({ target: { value: option.value } }); setIsOpen(false); };
  const handleKeyDown = (event) => {
    if (disabled) return;
    if (event.key === "Escape") return setIsOpen(false);
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); return setIsOpen((current) => !current); }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); const enabled = options.filter((option) => !option.disabled); const index = enabled.findIndex((option) => option.value === value); selectOption(enabled[Math.max(0, Math.min(enabled.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))]); }
  };
  return <div ref={containerRef} className={`landzo-filter-select ${className} ${isOpen ? "is-open" : ""}`.trim()} data-menu-align={menuAlign}>
    {label ? <span className="landzo-filter-select-label">{label}</span> : null}
    <button aria-controls={menuId} aria-expanded={isOpen} aria-haspopup="listbox" className="landzo-filter-select-trigger" disabled={disabled} onClick={() => setIsOpen((current) => !current)} onKeyDown={handleKeyDown} role="combobox" type="button"><span>{selectedOption?.label || ""}</span><span aria-hidden="true" className="landzo-filter-select-chevron" /></button>
    {isOpen ? <div className="landzo-filter-select-menu" id={menuId} role="listbox">{options.map((option) => <button aria-selected={option.value === value} className={option.value === value ? "is-selected" : ""} disabled={option.disabled} key={option.value} onClick={() => selectOption(option)} role="option" type="button">{option.label}</button>)}</div> : null}
  </div>;
};