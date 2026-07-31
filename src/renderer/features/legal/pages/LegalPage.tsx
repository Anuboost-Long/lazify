import { appRoute } from "@renderer/app/app-routes";
import { translation } from "@renderer/i18n/translation";
import { BackButton } from "@renderer/shared/ui/BackButton";
import { useTranslation } from "react-i18next";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { getLegalDocument } from "../content";
import { LegalDocumentView } from "../components/LegalDocumentView";

export function LegalPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { doc } = useParams<{ doc: string }>();
  const legalDocument = getLegalDocument(doc);

  // Unknown slug: nothing to show, so fall back to where the links live.
  if (!legalDocument) {
    return <Navigate to={appRoute.settings} replace />;
  }

  return (
    <div className="flex flex-col gap-4">
      <BackButton
        label={t(translation.GlobalTerm.Back)}
        onClick={() => navigate(appRoute.settings)}
      />

      <LegalDocumentView doc={legalDocument} />
    </div>
  );
}
