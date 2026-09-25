import { useEffect, useState } from "react";

export function useKeepAwake() {
  const [keepAwake, setKeepAwake] = useState(true);

  useEffect(() => {
    void globalThis.lazify.keepAwake().then(setKeepAwake);
  }, []);

  function updateKeepAwake(enabled: boolean) {
    setKeepAwake(enabled);
    void globalThis.lazify.setKeepAwake(enabled).then(setKeepAwake);
  }

  return { keepAwake, updateKeepAwake };
}
