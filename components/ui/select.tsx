"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type SelectProps = Omit<React.ComponentProps<"select">, "multiple" | "size"> & {
  onValueChange?: (value: string) => void;
  onOpenChange?: (open: boolean) => void;
  side?: "top" | "bottom";
  align?: "start" | "end";
  leadingIcon?: React.ReactNode;
};
type Option = { value: string; label: string; disabled: boolean; lang?: string };
function readOptions(children: React.ReactNode, disabled = false): Option[] {
  return React.Children.toArray(children).flatMap(child => {
    if (!React.isValidElement<React.ComponentProps<"option">>(child)) return [];
    if (child.type !== "option") return readOptions(child.props.children, disabled || !!child.props.disabled);
    const label = child.props.label ?? React.Children.toArray(child.props.children).join("");
    return [{value: String(child.props.value ?? label), label, disabled: disabled || !!child.props.disabled, lang:child.props.lang}];
  });
}

/** Themed popup with a real form control for submission, validation and resets. */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(function Select({
  children, className, value, defaultValue, onChange, onValueChange, onOpenChange,
  side = "bottom", align = "start", leadingIcon, id, disabled, required, ...props
}, forwardedRef) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const options = readOptions(children);
  const initial = String(defaultValue ?? options.find(option => !option.disabled)?.value ?? "");
  const [localValue, setLocalValue] = React.useState(initial);
  const candidate = String(value ?? localValue);
  const selected = options.some(option => option.value === candidate)
    ? candidate : options.find(option => !option.disabled)?.value ?? "";
  const selectedOption = options.find(option => option.value === selected);
  const [open, setOpen] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const native = React.useRef<HTMLSelectElement>(null);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const content = React.useRef<HTMLDivElement>(null);
  const tabTarget = React.useRef<HTMLElement | null>(null);
  React.useImperativeHandle(forwardedRef, () => native.current!);
  React.useEffect(() => {
    const form = native.current?.form;
    const reset = () => {setLocalValue(initial);setInvalid(false);};
    form?.addEventListener("reset", reset);
    return () => form?.removeEventListener("reset", reset);
  }, [initial]);
  const encode = (raw: string) => `option:${raw}`;
  return <>
    <select {...props} ref={native} id={`${controlId}-native`} tabIndex={-1} aria-hidden="true"
      className="sr-only" disabled={disabled} required={required} value={selected}
      onInvalid={event => {event.preventDefault();setInvalid(true);trigger.current?.focus();props.onInvalid?.(event);}}
      onChange={event => {setLocalValue(event.target.value);setInvalid(false);onChange?.(event);onValueChange?.(event.target.value);}}>
      {children}
    </select>
    <SelectPrimitive.Root value={encode(selected)} disabled={disabled} open={open}
      onOpenChange={next => {setOpen(next);onOpenChange?.(next);}}
      onValueChange={next => {
        if (!native.current) return;
        native.current.value = next.slice("option:".length);
        native.current.dispatchEvent(new Event("change", {bubbles:true}));
      }}>
      <SelectPrimitive.Trigger ref={trigger} id={controlId} aria-label={props["aria-label"]}
        aria-labelledby={props["aria-labelledby"]} aria-describedby={props["aria-describedby"]}
        aria-invalid={invalid || props["aria-invalid"] || undefined} aria-required={required || undefined}
        aria-busy={props["aria-busy"]}
        className={cn("inline-flex h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-background px-3 py-1 text-left text-sm text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-invalid:border-destructive disabled:cursor-not-allowed disabled:opacity-50 [&>span]:min-w-0", className)}>
        {leadingIcon}
        <span className="flex-1 truncate"><SelectPrimitive.Value lang={selectedOption?.lang}>{selectedOption?.label}</SelectPrimitive.Value></span>
        <SelectPrimitive.Icon><ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content ref={content} position="popper" side={side} align={align} sideOffset={6} collisionPadding={12}
          className="z-[100] max-h-[min(20rem,var(--radix-select-content-available-height))] w-[var(--radix-select-trigger-width)] min-w-32 max-w-[calc(100vw-1.5rem)] overflow-hidden rounded-xl border border-border bg-card text-card-foreground shadow-xl"
          onKeyDown={event => {
            if (event.key !== "Tab") return;
            event.preventDefault();
            const fields = Array.from(document.querySelectorAll<HTMLElement>('a[href],button,input,select,textarea,[tabindex]'))
              .filter(el => el.tabIndex >= 0 && !el.matches(":disabled") && !el.hidden &&
                !el.closest('[hidden],[inert]') && (!el.checkVisibility || el.checkVisibility({checkVisibilityCSS:true})) &&
                !el.hasAttribute("data-radix-focus-guard") && !content.current?.contains(el));
            const index = fields.indexOf(trigger.current!);
            tabTarget.current = fields[index + (event.shiftKey ? -1 : 1)] ?? trigger.current;
            setOpen(false);
          }}
          onCloseAutoFocus={event => {
            if (!tabTarget.current) return;
            event.preventDefault();tabTarget.current.focus();tabTarget.current=null;
          }}>
          <SelectPrimitive.ScrollUpButton className="flex h-6 items-center justify-center bg-card"><ChevronUp className="size-4" /></SelectPrimitive.ScrollUpButton>
          <SelectPrimitive.Viewport className="p-1">
            {options.map(option => <SelectPrimitive.Item key={option.value} value={encode(option.value)} disabled={option.disabled} lang={option.lang}
              textValue={option.label}
              className="relative flex min-h-10 cursor-default select-none items-center gap-2 rounded-lg py-2 pr-8 pl-3 text-sm outline-none data-[highlighted]:bg-secondary data-[highlighted]:text-foreground data-[state=checked]:font-medium data-[disabled]:pointer-events-none data-[disabled]:opacity-40">
              <span className="min-w-0 flex-1 whitespace-normal [overflow-wrap:anywhere]"><SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText></span>
              <SelectPrimitive.ItemIndicator className="absolute right-2"><Check className="size-4 text-primary" aria-hidden="true" /></SelectPrimitive.ItemIndicator>
            </SelectPrimitive.Item>)}
          </SelectPrimitive.Viewport>
          <SelectPrimitive.ScrollDownButton className="flex h-6 items-center justify-center bg-card"><ChevronDown className="size-4" /></SelectPrimitive.ScrollDownButton>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  </>;
});
export { Select };
