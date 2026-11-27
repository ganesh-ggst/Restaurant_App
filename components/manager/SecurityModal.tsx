import PhoneChangeScreen from "../profile/PhoneChangeScreen";

import { useCurrentManager } from "../../hooks/useCurrentManager";

export default function SecurityModal() {
  const { normalizedPhone, refreshCurrentManager } = useCurrentManager();

  return (
    <PhoneChangeScreen
      currentPhone={normalizedPhone}
      onPhoneChanged={() => void refreshCurrentManager()}
    />
  );
}
