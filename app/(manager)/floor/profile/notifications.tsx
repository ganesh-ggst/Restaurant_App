import OperationsNotificationsScreen from "../../operations/profile/notifications";
import { managerProfileApi } from "../../../../services/api/manager-profile";

export default function FloorNotificationsScreen() {
  return (
    <OperationsNotificationsScreen
      deleteAllNotifications={() =>
        managerProfileApi.deleteAllFloorManagerNotifications()
      }
    />
  );
}
