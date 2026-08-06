"use client";

import {
  sdkActionManager,
  useEmbedNonStylesConfig,
  useEmbedStyles,
  useIsEmbed,
} from "@calcom/embed-core/embed-iframe";
import { COMPANY_NAME } from "@calcom/lib/constants";
import { useRouterQuery } from "@calcom/lib/hooks/useRouterQuery";
import useTheme from "@calcom/lib/hooks/useTheme";
import { UserAvatar } from "@calcom/ui/components/avatar";
import { Icon } from "@calcom/ui/components/icon";
import { OrgBanner } from "@calcom/ui/components/organization-banner";
import { UnpublishedEntity } from "@calcom/ui/components/unpublished-entity";
import { EventTypeDescriptionLazy as EventTypeDescription } from "@calcom/web/modules/event-types/components";
import EmptyPage from "@calcom/web/modules/event-types/components/EmptyPage";
import type { getServerSideProps } from "@server/lib/[user]/getServerSideProps";
import classNames from "classnames";
import type { InferGetServerSidePropsType } from "next";
import Link from "next/link";
import { Toaster } from "sonner";

export type PageProps = InferGetServerSidePropsType<typeof getServerSideProps>;
export function UserPage(props: PageProps) {
  const { users, profile, eventTypes, entity } = props;

  const [user] = users; //To be used when we only have a single user, not dynamic group
  useTheme(profile.theme);

  const isBioEmpty = !user.bio || !user.bio.replace("<p><br></p>", "").length;

  const isEmbed = useIsEmbed(props.isEmbed);
  const eventTypeListItemEmbedStyles = useEmbedStyles("eventTypeListItem");
  const shouldAlignCentrallyInEmbed = useEmbedNonStylesConfig("align") !== "left";
  const shouldAlignCentrally = !isEmbed || shouldAlignCentrallyInEmbed;
  const {
    // So it doesn't display in the Link (and make tests fail)
    user: _user,
    orgSlug: _orgSlug,
    redirect: _redirect,
    ...query
  } = useRouterQuery();

  if (entity.considerUnpublished) {
    return (
      <div className="flex h-full min-h-[calc(100dvh)] items-center justify-center">
        <UnpublishedEntity {...entity} />
      </div>
    );
  }

  const isEventListEmpty = eventTypes.length === 0;
  const isOrg = !!user?.profile?.organization;

  return (
    <>
      <div className={classNames(shouldAlignCentrally ? "mx-auto" : "", isEmbed ? "max-w-3xl" : "")}>
        <main
          className={classNames(
            shouldAlignCentrally ? "mx-auto" : "",
            isEmbed ? "border-booker border-booker-width  bg-default rounded-md" : "",
            "max-w-2xl px-4 py-10"
          )}>
          {/* Hero — mirrors the tap.serviceaihq.com card: warm near-black
              gradient, faint diagonal brand texture, brand-ringed avatar. */}
          <div
            className="border-subtle mb-6 overflow-hidden rounded-2xl border"
            style={{
              background:
                "linear-gradient(160deg, color-mix(in srgb, var(--cal-brand) 16%, #0a0a0a) 0%, color-mix(in srgb, var(--cal-brand) 8%, #0a0a0a) 55%, color-mix(in srgb, var(--cal-brand) 5%, #0a0a0a) 100%)",
            }}>
            {isOrg && user.profile.organization?.bannerUrl && (
              <OrgBanner
                alt={user.profile.organization.name ?? "Organization banner"}
                imageSrc={user.profile.organization.bannerUrl}
                className="p-1 border border-subtle rounded-xl w-full object-cover"
              />
            )}
            <div
              className="p-6 sm:p-8"
              style={{
                background:
                  "repeating-linear-gradient(115deg, transparent 0px, transparent 22px, color-mix(in srgb, var(--cal-brand) 4.5%, transparent) 22px, color-mix(in srgb, var(--cal-brand) 4.5%, transparent) 24px)",
              }}>
              <p
                className="text-[10px] font-semibold uppercase"
                style={{ color: "color-mix(in srgb, var(--cal-brand) 18%, rgba(255,255,255,0.55))", letterSpacing: "0.28em" }}>
                {COMPANY_NAME}
              </p>
              {/* Tagline is ServiceAI's own marketing; on a client instance
                  COMPANY_NAME is the client, so "delivered by <client>" would be
                  nonsense copy on their booking page. Their bio carries the
                  practice's own words instead. */}
              {COMPANY_NAME === "ServiceAI" && (
                <p
                  className="mb-6 mt-1 text-sm font-medium"
                  style={{ color: "color-mix(in srgb, var(--cal-brand) 12%, #ece7e2)" }}>
                  Premium scheduling,{" "}
                  <span style={{ color: "var(--cal-brand)" }}>delivered by {COMPANY_NAME}.</span>
                </p>
              )}
              {COMPANY_NAME !== "ServiceAI" && <div className="mb-6" />}
              <UserAvatar
                size="lg"
                user={{
                  avatarUrl: user.avatarUrl,
                  profile: user.profile,
                  name: profile.name,
                  username: profile.username,
                }}
                className={classNames(
                  "rounded-full shadow-[0_0_28px_color-mix(in_srgb,var(--cal-brand)_35%,transparent)] ring-2 ring-[color:var(--cal-brand)] ring-offset-2 ring-offset-transparent",
                  isOrg && user.profile.organization?.bannerUrl ? "-mt-14" : ""
                )}
              />
              <h1
                className={classNames(
                  "font-cal mb-1 text-3xl",
                  isOrg && user.profile.organization?.bannerUrl ? "" : "mt-5"
                )}
                style={{ color: "color-mix(in srgb, var(--cal-brand) 6%, #f4f2f0)" }}
                data-testid="name-title">
                {profile.name}
                {!isOrg && user.verified && (
                  <Icon
                    name="badge-check"
                    className="mx-1 -mt-1 inline h-6 w-6 fill-blue-500 text-white dark:text-black"
                  />
                )}
                {isOrg && (
                  <Icon
                    name="badge-check"
                    className="mx-1 -mt-1 inline h-6 w-6 fill-yellow-500 text-white dark:text-black"
                  />
                )}
              </h1>
              {!isBioEmpty && (
                <>
                  {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Content is sanitized via safeBio */}
                  <div
                    className="wrap-break-word mt-2 text-sm leading-relaxed [&_a]:underline"
                    style={{ color: "color-mix(in srgb, var(--cal-brand) 10%, #d8d4d0)" }}
                    dangerouslySetInnerHTML={{ __html: props.safeBio }}
                  />
                </>
              )}
            </div>
          </div>

          {/* Event types as standalone premium cards instead of a joined list. */}
          <div className="flex flex-col gap-3" data-testid="event-types">
            {eventTypes.map((type) => (
              <Link
                key={type.id}
                style={{ display: "flex", ...eventTypeListItemEmbedStyles }}
                prefetch={false}
                href={{
                  pathname: `/${user.profile.username}/${type.slug}`,
                  query,
                }}
                passHref
                onClick={async () => {
                  sdkActionManager?.fire("eventTypeSelected", {
                    eventType: type,
                  });
                }}
                className="bg-default border-subtle group relative rounded-xl border transition-all duration-150 hover:-translate-y-0.5 hover:border-[color:var(--cal-brand)] hover:shadow-[0_6px_24px_color-mix(in_srgb,var(--cal-brand)_18%,transparent)]"
                data-testid="event-type-link">
                <Icon
                  name="arrow-right"
                  className="absolute right-5 top-1/2 h-4 w-4 -translate-y-1/2 text-[color:var(--cal-brand)] opacity-40 transition-all group-hover:translate-x-0.5 group-hover:opacity-100"
                />
                {/* Don't prefetch till the time we drop the amount of javascript in [user][type] page which is impacting score for [user] page */}
                <div className="block w-full p-5 pr-12">
                  <div className="flex flex-wrap items-center">
                    <h2 className="text-emphasis pr-2 text-sm font-semibold">{type.title}</h2>
                  </div>
                  <EventTypeDescription eventType={type} isPublic={true} shortenDescription />
                </div>
              </Link>
            ))}
          </div>

          {isEventListEmpty && <EmptyPage name={profile.name || "User"} />}

          {/* Attribution is ServiceAI on every instance, including client-branded
              ones — COMPANY_NAME is the client's name there, not the builder's. */}
          {!isEmbed && (
            <p className="text-subtle mt-10 text-center text-xs">
              Powered by{" "}
              <a
                href="https://serviceaihq.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-[color:var(--cal-brand)] no-underline">
                ServiceAI
              </a>
            </p>
          )}
        </main>
        <Toaster position="bottom-right" />
      </div>
    </>
  );
}

export default UserPage;
