"use client";

import { useId, useRef, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslations } from "next-intl";

/** Editable address suggestions: preserves free text and normal form values. */
export function Autocomplete({ id, name, value, onValueChange, options, placeholder }: {
  id: string; name: string; value: string; onValueChange: (value: string) => void;
  options: string[]; placeholder?: string;
}) {
  const t = useTranslations("Common");
  const listId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const matches = options.filter(option => option.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()));
  function choose(option: string) {onValueChange(option);setOpen(false);setActive(-1);input.current?.focus();}
  return <Popover.Root open={open} onOpenChange={setOpen} modal={false}>
    <Popover.Anchor asChild><Input ref={input} id={id} name={name} value={value} placeholder={placeholder} autoComplete="off"
      role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls={open ? listId : undefined}
      aria-activedescendant={open && active >= 0 ? `${listId}-${active}` : undefined}
      onFocus={() => {setOpen(true);setActive(-1);}}
      onClick={() => setOpen(true)}
      onChange={event => {onValueChange(event.target.value);setActive(-1);setOpen(true);}}
      onKeyDown={event => {
        if (event.key === "Escape") {event.preventDefault();event.stopPropagation();setOpen(false);return;}
        if (event.key === "Tab") {setOpen(false);return;}
        if (["ArrowDown","ArrowUp"].includes(event.key)) {
          event.preventDefault();setOpen(true);
          setActive(index => !matches.length ? -1 : index < 0 ? event.key === "ArrowDown" ? 0 : matches.length-1 : event.key === "ArrowDown" ? (index+1)%matches.length : (index-1+matches.length)%matches.length);
        } else if (event.key === "Enter" && open && active >= 0 && matches[active]) {event.preventDefault();choose(matches[active]);}
      }} /></Popover.Anchor>
    <Popover.Portal><Popover.Content sideOffset={6} collisionPadding={12} align="start"
      className="z-[100] w-[var(--radix-popover-trigger-width)] max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border bg-card p-1 text-card-foreground shadow-xl"
      onOpenAutoFocus={event => event.preventDefault()} onCloseAutoFocus={event => event.preventDefault()}
      onInteractOutside={event => {if (event.target === input.current) event.preventDefault();}}>
      <ul id={listId} role="listbox" aria-label={placeholder} className="relative max-h-[min(18rem,var(--radix-popover-content-available-height))] overflow-y-auto overscroll-contain">
        {matches.map((option,index) => <li key={option} id={`${listId}-${index}`} role="option" aria-selected={value === option}
          className={`flex min-h-10 cursor-pointer items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm hover:bg-secondary ${active===index ? "bg-secondary" : ""}`}
          onPointerDown={event => event.preventDefault()} onClick={() => choose(option)}
          ref={element => {
            if (active!==index || !element?.parentElement) return;
            const list = element.parentElement;
            if (element.offsetTop < list.scrollTop) list.scrollTop = element.offsetTop;
            else if (element.offsetTop + element.offsetHeight > list.scrollTop + list.clientHeight)
              list.scrollTop = element.offsetTop + element.offsetHeight - list.clientHeight;
          }}>
          <span className="min-w-0 flex-1 [overflow-wrap:anywhere]">{option}</span>{value===option && <Check className="size-4 shrink-0 text-primary" aria-hidden="true" />}
        </li>)}
        {!matches.length && <li className="p-3 text-sm text-muted-foreground">{t("noSuggestions")}</li>}
      </ul>
    </Popover.Content></Popover.Portal>
  </Popover.Root>;
}
