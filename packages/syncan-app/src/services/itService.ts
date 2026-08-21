import { apiFetch } from "./api";

// =====================
// Types
// =====================
export type AssetType =
  | "LAPTOP"
  | "PC"
  | "SERVER"
  | "NETWORK"
  | "PRINTER"
  | "OTHER";

export type AssetStatus = "IN_USE" | "IN_STOCK" | "REPAIR" | "RETIRED";

export type Asset = {
  id: string;
  assetTag: string;
  name: string;
  type: AssetType;
  brand?: string;
  model?: string;
  serialNumber?: string;
  status: AssetStatus;
  assignedTo?: string;
  location?: string;
  purchaseDate?: string; // ISO date (YYYY-MM-DD)
  warrantyEnd?: string; // ISO date (YYYY-MM-DD)
  notes?: string;
  cpuSpec?: string;
  ramSpec?: string;
  hddSpec?: string;
  vgaCard?: string;
  ckUsbLan?: 0 | 1;
  ckMouse?: 0 | 1;
  ckTas?: 0 | 1;
  ckKeyboard?: 0 | 1;
  ckUsbHub?: 0 | 1;
  isActive?: number; // 1|0 (optional, for soft delete UI)
  disabledAt?: string | null;
  disabledBy?: string | null;
  disabledReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
  monitorType?: string;
  storageType?: string;
};

export type InventoryCategory =
  | "STORAGE"
  | "MEMORY"
  | "NETWORK"
  | "PERIPHERAL"
  | "OTHER";

export type InventoryItem = {
  id: string;
  sku: string;
  name: string;
  category: InventoryCategory;
  unit?: string;
  location?: string;
  capacity?: string;
  stock: number;
  minStock: number;
  notes?: string;
  isActive?: number; // 1|0 (optional, for soft delete UI)
  disabledAt?: string | null;
  disabledBy?: string | null;
  disabledReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type InventoryMoveType = "IN" | "OUT" | "ADJUST";

export type InventoryMoveRequest = {
  type: InventoryMoveType;
  qty: number;
  ref?: string;
  targetAssetId?: string;
  // IN extras
  purchaseDate?: string;
  purchaseLocation?: string;
  // OUT extras (category OTHER)
  destination?: string;
};

export type InventoryMovement = {
  id: string;
  inventoryItemId: string;
  type: InventoryMoveType;
  qty: number;
  ref?: string;
  createdBy?: string;
  targetAssetId?: string;
  targetAssetTag?: string;
  targetAssetName?: string;
  // IN/OUT extras
  purchaseDate?: string | null;
  purchaseLocation?: string | null;
  destination?: string | null;
  createdAt: string;
};

export type ActivityLog = {
  id: string;
  actorUsername?: string;
  action: string;
  entityType: "INVENTORY" | "ASSET";
  entityId?: number;
  meta?: any;
  createdAt: string;
};

export type DashboardSummary = {
  kpis: {
    totalAssets: number;
    totalInventoryQty: number;
    lowStockItems: number;
    assetsInRepair: number;
  };
  assetsByStatus: { name: string; value: number }[];
  inventoryByLocation: { name: string; value: number }[];
  recentAssets: Asset[];
  lowStockList: InventoryItem[];
};

export type TonerStatus = 'PENDING' | 'ON_PROGRESS' | 'FINISH';

export type Toner = {
  id: string;
  tonerSerial: string;
  name: string;
  model?: string;
  vendor?: string;
  origin?: string;
  location?: string;
  status: TonerStatus;
  notes?: string;
  createdBy?: string;
  updatedBy?: string;
  isActive?: number;
  disabledAt?: string | null;
  disabledBy?: string | null;
  disabledReason?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type TonerMoveRequest = {
  status?: TonerStatus;
  location?: string;
  notes?: string;
};

// Fungsi-fungsi service untuk Toner
export async function listToner(params?: {
  search?: string;
  status?: TonerStatus | "";
  origin?: string;
  location?: string;
  active?: "1" | "0" | "all";
}): Promise<Toner[]> {
  const res = await apiFetch(
    `/api/toner${qs({
      search: params?.search,
      status: params?.status as string,
      origin: params?.origin,
      location: params?.location,
      active: params?.active,
    })}`
  );
  return json<Toner[]>(res);
}

export async function createToner(payload: Partial<Toner>): Promise<{ id: string; tonerSerial: string }> {
  const res = await apiFetch("/api/toner", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json<{ id: string; tonerSerial: string }>(res);
}

export async function getNextTonerSerial(): Promise<{ nextSerial: string }> {
  const res = await apiFetch("/api/toner/next-serial");
  return json<{ nextSerial: string }>(res);
}

export async function updateToner(id: string, payload: Partial<Toner>): Promise<Toner> {
  const res = await apiFetch(`/api/toner/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return json<Toner>(res);
}

export async function moveToner(id: string, move: TonerMoveRequest): Promise<Toner> {
  const res = await apiFetch(`/api/toner/${id}/move`, {
    method: "POST",
    body: JSON.stringify(move),
  });
  return json<Toner>(res);
}

export async function disableToner(id: string, body: { reason: string }): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/api/toner/${id}/disable`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json(res);
}

export async function restoreToner(id: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/api/toner/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return json(res);
}

// =====================
// Helpers
// =====================
async function json<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed: ${res.status}`);
  }
  return (await res.json()) as T;
}

function qs(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== "") sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// =====================
// Dashboard
// =====================
export async function fetchDashboardSummary(): Promise<DashboardSummary> {
  const res = await apiFetch("/api/dashboard/summary");
  return json<DashboardSummary>(res);
}

// =====================
// Assets
// =====================
export async function listAssets(params?: {
  search?: string;
  status?: AssetStatus | "";
  type?: AssetType | "";
  location?: string;
  active?: "1" | "0" | "all"; // soft delete filter (optional)
}): Promise<Asset[]> {
  const res = await apiFetch(
    `/api/assets${qs({
      search: params?.search,
      status: params?.status as string,
      type: params?.type as string,
      location: params?.location,
      active: params?.active,
    })}`
  );
  return json<Asset[]>(res);
}

export async function createAsset(payload: Partial<Asset>): Promise<Asset> {
  const res = await apiFetch("/api/assets", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json<Asset>(res);
}

export async function updateAsset(id: string, payload: Partial<Asset>): Promise<Asset> {
  const res = await apiFetch(`/api/assets/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return json<Asset>(res);
}

// Soft delete
export async function disableAsset(id: string, body: { reason: string }): Promise<{ ok: boolean } | { success: boolean }> {
  const res = await apiFetch(`/api/assets/${id}/disable`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json(res);
}

export async function restoreAsset(id: string): Promise<{ ok: boolean } | { success: boolean }> {
  const res = await apiFetch(`/api/assets/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return json(res);
}

// Legacy hard delete (keep only if server still exposes DELETE)
export async function deleteAsset(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/assets/${id}`, { method: "DELETE" });
  return json<{ success: boolean }>(res);
}

export async function generateAssetTag(location: string): Promise<{ assetTag: string }> {
  const res = await apiFetch(`/api/assets/generate-tag?location=${encodeURIComponent(location)}`);
  return json<{ assetTag: string }>(res);
}

// Pindahkan asset ke Trash (status -> RETIRED)
export async function retireAsset(
  id: string,
  body: { reason: string; physicalCondition: string }
): Promise<{ ok: boolean; retirementId: string }> {
  const res = await apiFetch(`/api/assets/${id}/retire`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json(res);
}

// =====================
// Trash
// =====================
export type DisposalStatus = "IN_STORAGE" | "DISPOSED" | "SOLD" | "DONATED";

export type TrashEntry = {
  retirementId: string;
  assetId: string;
  assetTag: string;
  name: string;
  type: AssetType;
  brand?: string;
  model?: string;
  location?: string;
  reason?: string;
  physicalCondition?: string;
  disposalStatus: DisposalStatus;
  disposalDate?: string | null;
  disposalNotes?: string | null;
  retiredAt: string;
  retiredBy?: string | null;
};

export async function listTrash(params?: {
  search?: string;
  disposalStatus?: DisposalStatus | "";
}): Promise<TrashEntry[]> {
  const res = await apiFetch(
    `/api/trash${qs({
      search: params?.search,
      disposalStatus: params?.disposalStatus as string,
    })}`
  );
  return json<TrashEntry[]>(res);
}

export async function updateTrashEntry(
  retirementId: string,
  payload: Partial<{
    physicalCondition: string;
    disposalStatus: DisposalStatus;
    disposalDate: string;
    disposalNotes: string;
  }>
): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/api/trash/${retirementId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return json(res);
}

export async function restoreFromTrash(
  retirementId: string,
  body: { status: "IN_USE" | "IN_STOCK" | "REPAIR" }
): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/api/trash/${retirementId}/restore`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json(res);
}

export async function generateSKU(name: string, category?: string): Promise<{ sku: string }> {
  const params = new URLSearchParams({
    name: encodeURIComponent(name)
  });
  
  if (category) {
    params.append('category', encodeURIComponent(category));
  }
  
  const res = await apiFetch(`/api/inventory/generate-sku?${params.toString()}`);
  return json<{ sku: string }>(res);
}

// =====================
// Inventory
// =====================
export async function listInventory(params?: {
  search?: string;
  category?: InventoryCategory | "";
  location?: string;
  active?: "1" | "0" | "all"; // soft delete filter (optional)
}): Promise<InventoryItem[]> {
  const res = await apiFetch(
    `/api/inventory${qs({
      search: params?.search,
      category: params?.category as string,
      location: params?.location,
      active: params?.active,
    })}`
  );
  return json<InventoryItem[]>(res);
}

export async function createInventoryItem(payload: Partial<InventoryItem>): Promise<InventoryItem> {
  const res = await apiFetch("/api/inventory", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json<InventoryItem>(res);
}

export async function updateInventoryItem(id: string, payload: Partial<InventoryItem>): Promise<InventoryItem> {
  const res = await apiFetch(`/api/inventory/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return json<InventoryItem>(res);
}

// Soft delete
export async function disableInventoryItem(id: string, body: { reason: string }): Promise<{ ok: boolean } | { success: boolean }> {
  const res = await apiFetch(`/api/inventory/${id}/disable`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json(res);
}

export async function restoreInventoryItem(id: string): Promise<{ ok: boolean } | { success: boolean }> {
  const res = await apiFetch(`/api/inventory/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return json(res);
}

// Legacy hard delete (prefer disableInventoryItem)
export async function deleteInventoryItem(id: string): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/inventory/${id}`, { method: "DELETE" });
  return json<{ success: boolean }>(res);
}

export async function moveInventory(id: string, move: InventoryMoveRequest): Promise<InventoryItem> {
  const res = await apiFetch(`/api/inventory/${id}/move`, {
    method: "POST",
    body: JSON.stringify(move),
  });
  return json<InventoryItem>(res);
}

export async function fetchInventoryMovements(itemId: string): Promise<{ movements: InventoryMovement[] }> {
  const res = await apiFetch(`/api/inventory/${itemId}/movements`);
  return json(res);
}

export async function fetchInventoryActivity(itemId: string): Promise<{ logs: ActivityLog[] }> {
  const res = await apiFetch(`/api/activity?entityType=INVENTORY&entityId=${itemId}`);
  return json(res);
}

export async function fetchAssetActivity(assetId: string): Promise<{ logs: ActivityLog[] }> {
  const res = await apiFetch(`/api/activity?entityType=ASSET&entityId=${assetId}`);
  return json(res);
}

// Autocomplete options for stock movement (supplier/destination)
export async function fetchInventoryMoveOptions(params?: { limit?: number }): Promise<{ purchaseLocations: string[]; destinations: string[]; limit: number }> {
  const res = await apiFetch(`/api/inventory/move-options${qs({ limit: params?.limit ? String(params.limit) : undefined })}`);
  return json(res);
}

// =====================
// User Types & Services
// =====================
export type UserRole = "admin" | "user";

export type User = {
  id: string;
  username: string;
  role: UserRole;
  createdAt?: string;
  isActive?: number;
  disabledAt?: string | null;
  disabledBy?: string | null;
  disabledReason?: string | null;
};

export type UserCreateRequest = {
  username: string;
  password: string;
  role: UserRole;
};

export type UserUpdateRequest = {
  username?: string;
  password?: string;
  role?: UserRole;
};

// Fungsi-fungsi service untuk User
export async function listUsers(params?: {
  search?: string;
  role?: UserRole | "";
  active?: "1" | "0" | "all";
}): Promise<User[]> {
  const res = await apiFetch(
    `/api/users${qs({
      search: params?.search,
      role: params?.role as string,
      active: params?.active,
    })}`
  );
  return json<User[]>(res);
}

export async function createUser(payload: UserCreateRequest): Promise<{ id: string }> {
  const res = await apiFetch("/api/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return json<{ id: string }>(res);
}

export async function updateUser(id: string, payload: UserUpdateRequest): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return json<{ success: boolean }>(res);
}

export async function disableUser(id: string, body: { reason: string }): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/api/users/${id}/disable`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json(res);
}

export async function restoreUser(id: string): Promise<{ ok: boolean }> {
  const res = await apiFetch(`/api/users/${id}/restore`, {
    method: "POST",
    body: JSON.stringify({}),
  });
  return json(res);
}

export async function changePassword(id: string, body: { newPassword: string }): Promise<{ success: boolean }> {
  const res = await apiFetch(`/api/users/${id}/change-password`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return json<{ success: boolean }>(res);
}

export async function getCurrentUser(): Promise<User> {
  const res = await apiFetch("/api/users/me");
  return json<User>(res);
}

// =====================
// Dashboard Toner Types
// =====================
export type DashboardTonerSummary = {
  byStatus: { name: string; value: number }[];
  notFinishCount: number;
  recentNotFinish: Toner[];
  total: number;
};

// =====================
// Dashboard Toner Functions
// =====================
export async function fetchDashboardTonerSummary(): Promise<DashboardTonerSummary> {
  const res = await apiFetch("/api/dashboard/toner-summary");
  return json<DashboardTonerSummary>(res);
}

export async function fetchRecentActivityTrends(): Promise<{
  trends: { date: string; assets: number; inventory: number; toner: number }[];
}> {
  const res = await apiFetch("/api/dashboard/activity-trends");
  return json<{ trends: any[] }>(res);
}