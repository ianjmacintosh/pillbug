import {
  Combobox,
  ComboboxItem,
  ComboboxList,
  ComboboxPopover,
  ComboboxProvider,
  useComboboxStore,
} from "@ariakit/react";
import { toDisplayCase } from "./PrescriptionForm.helpers";
import {
  useDrugNameSuggestions,
  type DrugNameSuggestionsSettings,
} from "./useDrugNameSuggestions";

interface DrugNameComboboxProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  names: readonly string[];
  required?: boolean;
  /** Tunes when suggestions appear — see DrugNameSuggestionsSettings. */
  autocompleteSettings?: DrugNameSuggestionsSettings;
}

export function DrugNameCombobox({
  id,
  value,
  onChange,
  names,
  required,
  autocompleteSettings,
}: DrugNameComboboxProps) {
  const combobox = useComboboxStore({
    value,
    setValue: onChange,
  });

  const suggestions = useDrugNameSuggestions(
    value,
    names,
    autocompleteSettings,
  );

  return (
    <ComboboxProvider store={combobox}>
      <Combobox id={id} required={required} />
      {suggestions.length > 0 && (
        <ComboboxPopover
          sameWidth
          gutter={4}
          className="drug-name-combobox-popover"
        >
          <ComboboxList className="drug-name-combobox-list">
            {suggestions.map((name) => (
              <ComboboxItem
                key={name}
                value={toDisplayCase(name)}
                className="drug-name-combobox-item"
              />
            ))}
          </ComboboxList>
        </ComboboxPopover>
      )}
    </ComboboxProvider>
  );
}
