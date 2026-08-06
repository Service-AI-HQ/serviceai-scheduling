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
            brand asset, so invert() hue-rotates it rather than recoloring it — it turned the
            orange "Ai" (#F5A623) blue (#0A59DC). Light and dark backgrounds are handled by
            swapping between the two real brand colorways below, so neither is ever altered. */}
        {icon ? (
          <img className="mx-auto w-12" alt="ServiceAI" title="ServiceAI" src={`${src}?type=icon`} />
        ) : (
          <>
            <img
              className={classNames(small ? "h-6" : "h-8", "w-auto dark:hidden")}
              alt="ServiceAI"
              title="ServiceAI"
              src={`${src}?type=logo-dark`}
            />
            <img
              className={classNames(small ? "h-6" : "h-8", "hidden w-auto dark:block")}
              alt="ServiceAI"
              title="ServiceAI"
              src={src}
            />
          </>
        )}
      </strong>
    </h3>
  );
}
