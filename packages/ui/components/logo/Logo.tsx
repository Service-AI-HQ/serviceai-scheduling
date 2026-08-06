import classNames from "@calcom/ui/classNames";

export function Logo({
  small,
  icon,
  inline = true,
  className,
  src = "/api/logo",
}: {
  small?: boolean;
  icon?: boolean;
  inline?: boolean;
  className?: string;
  src?: string;
}) {
  return (
    <h3 className={classNames("logo", inline && "inline", className)}>
      <strong>
        {/* Never apply a color filter (e.g. dark:invert) here. The ServiceAI mark is a colored
            brand asset, so invert() hue-rotates it rather than recoloring it. A dark-mode variant
            must be a separate asset, not a CSS filter. */}
        {icon ? (
          <img className="mx-auto w-12" alt="ServiceAI" title="ServiceAI" src={`${src}?type=icon`} />
        ) : (
          <img
            className={classNames(small ? "h-6 w-auto" : "h-8 w-auto")}
            alt="ServiceAI"
            title="ServiceAI"
            src={src}
          />
        )}
      </strong>
    </h3>
  );
}
