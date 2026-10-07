// Tytuł spektaklu jako kotwica widoku (Boldonse, .rk-show-title), jedyne miejsce na Boldonse w aplikacji.
// Długie tytuły (opis marki, POMYSLY 11): najwyżej 2 linie, text-wrap: balance, bez dzielenia wyrazów;
// rozmiar schodzi stopniami: do ok. 14 znaków display-xl, do ok. 28 display-lg, dłuższe display-sm.
// Na telefonie te same progi o stopień niżej. Pełny tytuł zawsze w podpowiedzi.

// display-xl 48/64, display-lg 32/44, display-sm 20/28 (tokens.json, grupa Display)
const STEPS = [
    { fontSize: 48, lineHeight: 64 },
    { fontSize: 32, lineHeight: 44 },
    { fontSize: 20, lineHeight: 28 },
]

export function ShowTitle({ title, phone = false, id }: { title: string; phone?: boolean; id?: string }) {
    const lengthStep = title.length <= 14 ? 0 : title.length <= 28 ? 1 : 2
    const step = STEPS[Math.min(lengthStep + (phone ? 1 : 0), STEPS.length - 1)]

    return (
        <h1
            id={id}
            className="rk-show-title"
            title={title}
            style={{
                fontSize: step.fontSize,
                lineHeight: `${step.lineHeight}px`,
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
                textWrap: 'balance',
                hyphens: 'none',
                overflowWrap: 'normal',
            }}
        >
            {title}
        </h1>
    )
}
