# Drop reveal gate on the Prescriptions screen

The Prescriptions screen (`/prescriptions`) previously required an explicit "Show all prescriptions" action before displaying any prescription data, mirroring the Privacy by Default gate on the Scheduled Dose List. We removed this gate: the Prescriptions screen now loads and displays the full list on mount.

The reasoning: navigating to `/prescriptions` is itself an intentional reveal act. The Privacy by Default principle guards against bystander exposure during normal app use — the primary risk surface is the home screen, which a Patient might leave open. The Prescriptions screen is a dedicated authenticated route that a Patient reaches deliberately; requiring a second reveal action there adds friction without meaningful privacy benefit.

The Scheduled Dose List on the home screen retains its reveal gate.
