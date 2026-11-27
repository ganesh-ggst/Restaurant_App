import PhoneChangeScreen from "../../../../components/profile/PhoneChangeScreen";
import { useProfile } from "../../../../components/profile/ProfileContext";

export default function SecurityScreen() {
  const { user, updateUser } = useProfile();

  return (
    <PhoneChangeScreen
      currentPhone={user?.phone || ""}
      onPhoneChanged={(phone) => {
        if (user) updateUser({ ...user, phone });
      }}
    />
  );
}
