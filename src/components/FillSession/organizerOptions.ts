import {
  ONE_COMPARTMENT,
  TWO_COMPARTMENTS,
  THREE_COMPARTMENTS,
  FOUR_COMPARTMENTS,
  type Compartment,
} from "../../../shared/fill-session";

export interface OrganizerOption {
  value: string;
  labelKey: string;
  compartments: Compartment[];
}

export const ORGANIZER_OPTIONS: OrganizerOption[] = [
  {
    value: "1",
    labelKey: "fillSession.organizerOption.simple7day",
    compartments: ONE_COMPARTMENT,
  },
  {
    value: "2",
    labelKey: "fillSession.organizerOption.amPm",
    compartments: TWO_COMPARTMENTS,
  },
  {
    value: "3",
    labelKey: "fillSession.organizerOption.mornNoonNight",
    compartments: THREE_COMPARTMENTS,
  },
  {
    value: "4",
    labelKey: "fillSession.organizerOption.mornNoonEveNight",
    compartments: FOUR_COMPARTMENTS,
  },
];
