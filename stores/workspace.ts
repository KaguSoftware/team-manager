import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Only the *selection* of the current workspace lives here (an id is not a
// secret). All workspace data itself is fetched per-request under RLS.
type WorkspaceState = {
  workspaceId: string | null;
  setWorkspaceId: (id: string | null) => void;
};

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      workspaceId: null,
      setWorkspaceId: (id) => set({ workspaceId: id }),
    }),
    { name: "kagu-workspace", storage: createJSONStorage(() => AsyncStorage) },
  ),
);
