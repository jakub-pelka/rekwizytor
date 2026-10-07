Pasek filtrów listy: wyszukiwanie, listy rozwijane i pigułki statusu.

- **Select** wygląda jak pole tekstowe (`surface`, ramka `border-strong`, `radius-md`) ze strzałką lucide 16 px. Pierwsza opcja opisuje stan „bez filtra” („Wszystkie spektakle”).
- **Pigułki** (`rk-chip`, `radius-full`) to szybkie filtry statusu z licznikiem maszynopisem. Włączona: `kurtyna-tint` + `kurtyna-text`, `aria-pressed="true"`. Można włączyć kilka naraz.
- „Wyczyść filtry” jako ghost `sm`, widoczny tylko gdy jakiś filtr działa.
- Pasek to kontener `surface`; przyciski w nim są płaskie (`sm`, `ghost`).
