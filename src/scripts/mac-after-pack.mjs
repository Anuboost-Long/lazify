import adhocSign from "./mac-adhoc-sign.mjs";
import injectTahoeIcon from "./mac-tahoe-icon.mjs";

export default async function afterPack(context) {
  await injectTahoeIcon(context);
  await adhocSign(context);
}
