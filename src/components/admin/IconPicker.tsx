import * as React from "react"
import * as LucideIcons from "lucide-react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

const getIconComponent = (iconName: string | null): React.ElementType => {
  if (!iconName) return LucideIcons.HelpCircle;
  const Icon = (LucideIcons as any)[iconName];
  return Icon && typeof Icon.render === 'function' ? Icon : LucideIcons.HelpCircle;
};

export function IconPicker({ value, onChange, disabled }: IconPickerProps) {
  const [open, setOpen] = React.useState(false)
  const iconNames = React.useMemo(() => Object.keys(LucideIcons), []);

  const CurrentIcon = getIconComponent(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between bg-white/5 border-white/20"
          disabled={disabled}
        >
          <div className="flex items-center gap-2">
            <CurrentIcon className="w-4 h-4" />
            {value || "Sélectionner une icône..."}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0">
        <Command>
          <CommandInput placeholder="Rechercher une icône..." />
          <CommandList>
            <CommandEmpty>Aucune icône trouvée.</CommandEmpty>
            <CommandGroup>
              {iconNames.map((iconName) => {
                const IconComponent = (LucideIcons as any)[iconName];
                return (
                  <CommandItem
                    key={iconName}
                    value={iconName}
                    onSelect={(currentValue) => {
                      onChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === iconName ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <IconComponent className="mr-2 h-4 w-4" />
                    {iconName}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}