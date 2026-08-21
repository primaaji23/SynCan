// import { getToken } from "../auth/auth";

// export async function apiFetch(
//   url: string,
//   options: RequestInit = {}
// ) {
//   const token = getToken();

//   return fetch(url, {
//     ...options,
//     headers: {
//       "Content-Type": "application/json",
//       ...(token ? { Authorization: `Bearer ${token}` } : {}),
//       ...options.headers,
//     },
//   });
// }

import { getToken, setToken, logout } from "../auth/auth";

let isRefreshing = false;
let queue: ((token: string) => void)[] = [];

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getToken();

  const response = await fetch(url, {
    ...options,
    credentials: "include", // 🔥 WAJIB untuk refresh token cookie
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // ✅ kalau token masih valid
  if (response.status !== 401) {
    return response;
  }

  // ❌ token expired → coba refresh
  if (isRefreshing) {
    return new Promise(resolve => {
      queue.push((newToken: string) => {
        resolve(
          apiFetch(url, {
            ...options,
            headers: {
              ...(options.headers || {}),
              Authorization: `Bearer ${newToken}`,
            },
          })
        );
      });
    });
  }

  isRefreshing = true;

  try {
    const refreshRes = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include"
    });

    if (!refreshRes.ok) {
      throw new Error("Refresh failed");
    }

    const data = await refreshRes.json();
    const newToken = data.token;

    setToken(newToken);

    // 🔄 lanjutkan semua request yang menunggu
    queue.forEach(cb => cb(newToken));
    queue = [];

    return apiFetch(url, {
      ...options,
      headers: {
        ...(options.headers || {}),
        Authorization: `Bearer ${newToken}`,
      },
    });
  } catch {
    // 🔥 refresh token mati → logout
    logout();
    window.location.href = "/login?expired=1";
    throw new Error("Session expired");
  } finally {
    isRefreshing = false;
  }
}
