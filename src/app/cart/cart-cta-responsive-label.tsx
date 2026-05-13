/**
 * Full CTA copy on `lg+`; compact copy below `lg` (narrow phones, single-column cart).
 */
interface CartCtaResponsiveLabelProps {
  narrowLabel: string;
  fullLabel: string;
}

export function CartCtaResponsiveLabel({
  narrowLabel,
  fullLabel,
}: CartCtaResponsiveLabelProps) {
  return (
    <>
      <span className="lg:hidden">{narrowLabel}</span>
      <span className="hidden lg:inline">{fullLabel}</span>
    </>
  );
}
