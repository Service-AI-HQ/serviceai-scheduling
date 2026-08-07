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
        {/* Never apply a color filter (e.g. dark:invert) to the brand mark. It is colored
            artwork, so invert() hue-rotates it rather than recoloring it — it turned the gold
            "Ai" (#F5A623) blue (#0A59DC).

            The approved wordmark is a dark-background lockup: its "Service" lettering is white
            and vanishes on a light surface. Rather than recolor the artwork, it is given a dark
            chip so it always sits on the background it was designed for.

            The chip background is dropped in dark mode. Painting #101014 onto a dark surface
            that is not exactly #101014 leaves a faintly visible rectangle behind the mark. The
            padding is kept in both modes so the logo occupies the same box either way. */}
        {icon ? (
          <img className="mx-auto w-12" alt="ServiceAI" title="ServiceAI" src={`${src}?type=icon`} />
        ) : (
          <span className="inline-flex items-center rounded-lg bg-[#101014] px-2.5 py-1.5 dark:bg-transparent">
            <img
              className={classNames(small ? "h-6" : "h-8", "w-auto")}
              alt="ServiceAI"
              title="ServiceAI"
              src={src}
            />
          </span>
        )}
      </strong>
    </h3>
  );
}
