<script lang="ts">
	import { Switch as SwitchPrimitive } from "bits-ui";
	import { cn } from "$lib/utils.js";

	let {
		checked = $bindable(false),
		disabled = false,
		class: className,
		...restProps
	}: SwitchPrimitive.RootProps & { class?: string } = $props();
</script>

<SwitchPrimitive.Root
	bind:checked
	{disabled}
	data-slot="switch"
	class={cn(
		"interactive focus-visible:ring-ring group relative inline-flex h-7 w-12 shrink-0 items-center rounded-full border-2 border-border-strong transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 data-[state=checked]:bg-primary-strong data-[state=unchecked]:bg-muted",
		className
	)}
	{...restProps}
>
	<SwitchPrimitive.Thumb
		class="absolute left-0.5 top-1/2 size-5 -translate-y-1/2 rounded-full border-2 border-border-strong bg-card transition-transform group-data-[state=checked]:translate-x-5 group-data-[state=unchecked]:translate-x-0"
	/>
</SwitchPrimitive.Root>
