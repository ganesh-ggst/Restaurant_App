import { Redirect, useLocalSearchParams } from "expo-router";

export default function RootRedirect() {
  const { branchId } = useLocalSearchParams<{ branchId?: string }>();

  return (
    <Redirect
      href={{
        pathname: "/splash",
        params: branchId ? { branchId } : {},
      }}
    />
  );
}
