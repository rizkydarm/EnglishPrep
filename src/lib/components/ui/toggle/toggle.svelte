<script lang="ts" module>
	import { tv, type VariantProps } from "tailwind-variants";

	/**
	 * Single source of truth for the app's tactile "toggle chip" look.
	 *
	 * Used by the `Toggle`/`ToggleGroup` components here, and — via `TACTILE_ON` —
	 * by non-Toggle consumers that need the same selected surface (e.g. the sidebar
	 * navigation active item, which is a link, not a toggle).
	 */
	export const TACTILE_ON =
		"border-border-strong bg-primary-strong text-primary-foreground shadow-[0_2px_0_0_var(--border-strong)] hover:border-border-strong hover:bg-primary-strong";
	export const TACTILE_OFF =
		"border-border-strong/15 bg-card text-muted-foreground hover:border-border-strong/40 hover:bg-muted hover:text-foreground";

	export const toggleVariants = tv({
		base: [
			"interactive inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border-2 text-sm font-bold outline-none",
			"transition-all focus-visible:ring-2 focus-visible:ring-ring",
			"disabled:pointer-events-none disabled:opacity-50",
			"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
			TACTILE_OFF,
			// Selected state. bits-ui sets both `data-state="on"` and `aria-pressed`;
			// declared after the hover styles so it wins on equal specificity.
			"data-[state=on]:border-border-strong data-[state=on]:bg-primary-strong data-[state=on]:text-primary-foreground data-[state=on]:shadow-[0_2px_0_0_var(--border-strong)]",
			"aria-pressed:border-border-strong aria-pressed:bg-primary-strong aria-pressed:text-primary-foreground aria-pressed:shadow-[0_2px_0_0_var(--border-strong)]",
		],
		variants: {
			variant: {
				default: "",
				nav: "w-full justify-start px-3 text-left",
			},
			size: {
				sm: "min-h-9 px-3",
				default: "min-h-11 px-4",
				lg: "min-h-12 px-5",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	});

	export type ToggleVariant = VariantProps<typeof toggleVariants>["variant"];
	export type ToggleSize = VariantProps<typeof toggleVariants>["size"];
	export type ToggleVariants = VariantProps<typeof toggleVariants>;
</script>

<script lang="ts">
	import { Toggle as TogglePrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		ref = $bindable(null),
		pressed = $bindable(false),
		class: className,
		size = "default",
		variant = "default",
		...restProps
	}: TogglePrimitive.RootProps & {
		variant?: ToggleVariant;
		size?: ToggleSize;
	} = $props();
</script>

<TogglePrimitive.Root
	bind:ref
	bind:pressed
	data-slot="toggle"
	class={cn(toggleVariants({ variant, size }), className)}
	{...restProps}
/>
