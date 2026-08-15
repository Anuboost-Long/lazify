import type { ComponentType } from "react";

import type { BrowserErrorKind } from "../../lib/browser-error";
import { BlockedErrorPage } from "./BlockedErrorPage";
import { InsecureCertificateErrorPage } from "./InsecureCertificateErrorPage";
import { NoInternetErrorPage } from "./NoInternetErrorPage";
import { PageCrashedErrorPage } from "./PageCrashedErrorPage";
import { SiteNotFoundErrorPage } from "./SiteNotFoundErrorPage";
import { SiteUnreachableErrorPage } from "./SiteUnreachableErrorPage";
import { UnknownErrorPage } from "./UnknownErrorPage";
import type { BrowserErrorPageProps } from "./types";

const PAGE_BY_KIND: Record<BrowserErrorKind, ComponentType<BrowserErrorPageProps>> = {
  "no-internet": NoInternetErrorPage,
  "site-not-found": SiteNotFoundErrorPage,
  "site-unreachable": SiteUnreachableErrorPage,
  "insecure-certificate": InsecureCertificateErrorPage,
  blocked: BlockedErrorPage,
  "page-crashed": PageCrashedErrorPage,
  unknown: UnknownErrorPage
};

export function BrowserErrorPage(props: Readonly<BrowserErrorPageProps>) {
  const Page = PAGE_BY_KIND[props.error.kind] ?? UnknownErrorPage;

  return <Page {...props} />;
}
