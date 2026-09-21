import {Check, ChevronDown, Search} from "lucide-react";
import {useEffect, useId, useRef, useState} from "react";

type Props = {
    label: string;
    value: string;
    allLabel: string;
    options: { value: string; count: number }[];
    onChange: (value: string) => void
};

export function FilterSelect({label, value, allLabel, options, onChange}: Props) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const input = useRef<HTMLInputElement>(null);
    const id = useId();
    useEffect(() => {
        if (!open) return;
        input.current?.focus();
        const outside = (event: PointerEvent) => {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        };
        document.addEventListener("pointerdown", outside);
        return () => document.removeEventListener("pointerdown", outside);
    }, [open]);
    const choose = (next: string) => {
        onChange(next);
        setOpen(false);
        trigger.current?.focus();
    };
    const visible = options.filter((option) => option.value.toLocaleLowerCase("uk").includes(query.trim().toLocaleLowerCase("uk")));
    return <div className="filter-group filter-select" ref={root} onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }} onKeyDown={(event) => {
        if (event.key === "Escape") {
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus();
        }
    }}>
        <span className="filter-label" id={`${id}-label`}>{label}</span>
        <button className={`filter-select-trigger ${value !== allLabel ? "has-value" : ""}`} ref={trigger}
                aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open}
                aria-controls={open ? `${id}-options` : undefined} onClick={() => {
            setQuery("");
            setOpen(!open);
        }}>
            <span id={`${id}-value`}>{value}</span><ChevronDown size={18} className={open ? "is-open" : ""}/>
        </button>
        {open &&
            <div className="filter-select-popover" id={`${id}-options`} role="group" aria-labelledby={`${id}-label`}>
                <div className="filter-select-search"><Search size={17}/><input ref={input} value={query}
                                                                                onChange={(event) => setQuery(event.target.value)}
                                                                                placeholder="Пошук…"
                                                                                aria-label={`Пошук: ${label}`}/></div>
                <div className="filter-select-options">
                    <button className="filter-select-option" aria-pressed={value === allLabel}
                            onClick={() => choose(allLabel)}><span>{allLabel}</span>{value === allLabel &&
                        <Check size={17}/>}</button>
                    {visible.map((option) => <button key={option.value} className="filter-select-option"
                                                     aria-pressed={value === option.value}
                                                     onClick={() => choose(option.value)}>
                        <span>{option.value}</span><small>{option.count.toLocaleString("uk-UA")}</small>{value === option.value &&
                        <Check size={17}/>}</button>)}
                    {!visible.length && <p className="filter-select-empty">Нічого не знайдено</p>}
                </div>
            </div>}
    </div>;
}
