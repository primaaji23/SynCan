import { logout } from "../auth/auth";

export async function authFetch(
  input: RequestInfo,
  init?: RequestInit
) {
  const res = await fetch(input, init);

  if (res.status === 401) {
    logout();
    throw new Error("Session expired. Please login again.");
  }

  return res;
}
